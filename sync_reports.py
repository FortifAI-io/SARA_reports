#!/usr/bin/env python3
"""Sync manifest.yaml into transform_db.report_master / report_level_mapping.

Manifest fields
  required : file, title, component_key, level (level_key string, or list of them)
  optional : report_code (default: component_key)   subtitle (default '')
             active      (default true)             priority (default: last in level)

Modes: --check (no DB) | --dry-run (read-only plan, SELECT only) | --rehearse (writes, then rolls back)
       | no flag (applies changes in one transaction).

On INSERT, a blank/omitted report_code becomes the component_key and a blank/omitted
subtitle is stored as ''.
On UPDATE, omitted optional fields leave the existing DB value untouched;
report_code is never changed after creation.
"""
import argparse, os, pathlib, re, sys
import yaml

IFRAME_PREFIX = "/fortifai_reports/"

REQUIRED = ("file", "title", "component_key", "level")
OPTIONAL = ("report_code", "subtitle", "active", "priority")
KEY_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$")


# ───────────────────────── static validation ───────────────────────
def validate(entries, html_dir):
    errors, warnings = [], []
    keys, keys_ci, files = {}, {}, {}

    for n, e in enumerate(entries, 1):
        if not isinstance(e, dict):
            errors.append(f"entry #{n}: must be a mapping"); continue
        label = str(e.get("file") or f"entry #{n}")

        unknown = sorted(set(e) - set(REQUIRED) - set(OPTIONAL))
        if unknown:
            errors.append(f"{label}: unknown field(s) {unknown} (typo?). Allowed: {sorted(REQUIRED + OPTIONAL)}")

        missing = [k for k in REQUIRED if e.get(k) is None or e.get(k) == "" or e.get(k) == []]
        if missing:
            errors.append(f"{label}: missing required field(s): {', '.join(missing)}")

        # types
        for k in ("file", "title", "component_key", "report_code", "subtitle"):
            if k in e and e[k] is not None and not isinstance(e[k], str):
                errors.append(f"{label}: {k} must be a string, got {type(e[k]).__name__} ({e[k]!r}); quote it in YAML")
        if "active" in e and not isinstance(e["active"], bool):
            errors.append(f"{label}: active must be true or false (unquoted), got {e['active']!r}")
        if "priority" in e and (isinstance(e["priority"], bool) or not isinstance(e["priority"], int)):
            errors.append(f"{label}: priority must be an integer, got {e['priority']!r}")
        lv = e.get("level")
        if lv is not None and not (isinstance(lv, str) or (isinstance(lv, list) and all(isinstance(x, str) for x in lv))):
            errors.append(f"{label}: level must be a string or a list of strings")

        # file
        f = e.get("file")
        if isinstance(f, str) and f:
            if "/" in f or "\\" in f or ".." in f or not f.lower().endswith(".html"):
                errors.append(f"{label}: file must be a bare *.html file name (no folders)")
            elif not (pathlib.Path(html_dir) / f).is_file():
                errors.append(f"{label}: file not found in {html_dir}")
            if f in files:
                warnings.append(f"{label}: same file is also used by component_key {files[f]}")
            files[f] = e.get("component_key")

        # component_key
        k = e.get("component_key")
        if isinstance(k, str) and k:
            if k != k.strip():
                errors.append(f"{label}: component_key has leading/trailing whitespace: {k!r}")
            elif not KEY_RE.match(k):
                errors.append(f"{label}: component_key {k!r} invalid. Use letters, digits, '-' or '_' only, "
                              f"start with a letter or digit, max 100 chars")
            if k in keys:
                errors.append(f"{label}: duplicate component_key {k!r} (also on {keys[k]})")
            elif k.lower() in keys_ci:
                errors.append(f"{label}: component_key {k!r} differs only by case from {keys_ci[k.lower()]!r}")
            keys[k] = label
            keys_ci[k.lower()] = k
    return errors, warnings


# ───────────────────────── read-only plan ──────────────────────────
def plan(conn, entries, levels):
    """Compare manifest with the DB using SELECTs only. Returns (lines, errors)."""
    lvl_name = {v: k for k, v in levels.items()}
    cur_max, lines, errors = {}, [], []
    counts = {"INSERT": 0, "UPDATE": 0, "UNCHANGED": 0}
    for e in entries:
        key, title = e["component_key"], e["title"].strip()
        active = e.get("active", True)
        src = IFRAME_PREFIX + e["file"]
        changes = []
        row = conn.execute("""SELECT id, report_code, title, subtitle, iframe_src, is_active
                              FROM transform_db.report_master WHERE component_key=%s""", (key,)).fetchone()
        rid = row[0] if row else None
        if row:
            _, db_code, db_title, db_sub, db_src, db_act = row
            given = (e.get("report_code") or "").strip()
            if given and given != db_code:
                errors.append(f"{key}: report_code is fixed after creation (DB has {db_code!r}, manifest has {given!r})")
            if db_title != title:                changes.append(f"title {db_title!r} -> {title!r}")
            if e.get("subtitle") is not None and (db_sub or "") != e["subtitle"]:
                changes.append(f"subtitle {db_sub!r} -> {e['subtitle']!r}")
            if db_src != src:                    changes.append(f"iframe_src {db_src!r} -> {src!r}")
            if db_act != active:                 changes.append(f"is_active {db_act} -> {active}")
        for l in e["_levels"]:
            lid = levels[l]
            m = conn.execute("""SELECT priority, is_active FROM transform_db.report_level_mapping
                                WHERE report_id=%s AND level_id=%s""", (rid, lid)).fetchone() if rid else None
            if m:
                if m[1] != active:
                    changes.append(f"mapping[{l}] is_active {m[1]} -> {active}")
                if e.get("priority") is not None and m[0] != e["priority"]:
                    changes.append(f"mapping[{l}] priority {m[0]} -> {e['priority']}")
            else:
                if lid not in cur_max:
                    cur_max[lid] = conn.execute("""SELECT COALESCE(MAX(priority),0)
                        FROM transform_db.report_level_mapping WHERE level_id=%s""", (lid,)).fetchone()[0]
                pr = e["priority"] if e.get("priority") is not None else cur_max[lid] + 10
                cur_max[lid] = max(cur_max[lid], pr)
                changes.append(f"mapping[{l}] new (priority {pr})")
        if rid:
            for (lid,) in conn.execute("""SELECT level_id FROM transform_db.report_level_mapping
                                          WHERE report_id=%s AND is_active AND level_id <> ALL(%s)""",
                                       (rid, [levels[l] for l in e["_levels"]])).fetchall():
                changes.append(f"mapping[{lvl_name.get(lid, lid)}] deactivate")
        status = "INSERT" if not row else ("UPDATE" if changes else "UNCHANGED")
        counts[status] += 1
        lines.append(f"{status:9} {key} -> {e['_levels']}" + (f": {'; '.join(changes)}" if status == "UPDATE" else
                     (f" ({'; '.join(changes)})" if status == "INSERT" else "")))
    lines.append(f"plan: {counts['INSERT']} insert, {counts['UPDATE']} update, {counts['UNCHANGED']} unchanged "
                 f"(read-only, nothing written)")
    return lines, errors


# ───────────────────────── main ────────────────────────────────────
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--manifest", default="manifest.yaml")
    ap.add_argument("--html-dir", default="apps/frontend/public/fortifai_reports")
    ap.add_argument("--check", action="store_true", help="static validation only, no DB")
    g = ap.add_mutually_exclusive_group()
    g.add_argument("--dry-run", action="store_true",
                   help="read-only: compare manifest with the DB and print what a real run would change (SELECT only)")
    g.add_argument("--rehearse", action="store_true",
                   help="execute all writes in a transaction, then roll back (needs write privileges)")
    a = ap.parse_args()

    manifest, html_dir = pathlib.Path(a.manifest).resolve(), pathlib.Path(a.html_dir).resolve()
    print(f"manifest: {manifest}\nhtml dir: {html_dir}")      # relative paths resolve against the current directory
    if not manifest.is_file(): sys.exit(f"ERROR: manifest not found: {manifest}")
    if not html_dir.is_dir():  sys.exit(f"ERROR: html dir not found: {html_dir}")
    doc = yaml.safe_load(manifest.read_text(encoding="utf-8")) or {}
    entries = doc.get("reports")
    if not isinstance(entries, list) or not entries:
        sys.exit("manifest must contain a non-empty 'reports:' list")

    errors, warnings = validate(entries, html_dir)
    for w in warnings: print("WARN:", w)
    if errors: sys.exit("\n".join("ERROR: " + x for x in errors))
    for e in entries:
        e["_levels"] = e["level"] if isinstance(e["level"], list) else [e["level"]]
    if a.check:
        print(f"OK: {len(entries)} entries valid"); return

    dsn = os.environ.get("DATABASE_URL")
    if not dsn:
        sys.exit("ERROR: DATABASE_URL is not set. Export it first, e.g.\n"
                 "  export DATABASE_URL='postgresql://reports_sync:<password>@<host>:5432/<db>?sslmode=require'")
    import psycopg
    with psycopg.connect(dsn) as conn:
        if a.dry_run:
            conn.read_only = True            # the server itself will reject any write
        levels = {k: i for i, k in conn.execute("SELECT id, level_key FROM transform_db.report_level_master")}
        for e in entries:
            bad = [l for l in e["_levels"] if l not in levels]
            if bad: errors.append(f"{e['file']}: unknown level {bad}. Valid: {sorted(levels)}")
        if errors: sys.exit("\n".join("ERROR: " + x for x in errors))

        if a.dry_run:
            lines, perr = plan(conn, entries, levels)
            print("\n".join(lines))
            if perr: sys.exit("\n".join("ERROR: " + x for x in perr))
            return

        for e in entries:
            key, title = e["component_key"], e["title"].strip()
            active = e.get("active", True)
            src = IFRAME_PREFIX + e["file"]
            row = conn.execute("SELECT id, report_code FROM transform_db.report_master WHERE component_key=%s",
                               (key,)).fetchone()
            if row:
                rid, db_code = row
                given = (e.get("report_code") or "").strip()
                if given and given != db_code:
                    sys.exit(f"ERROR: {key}: report_code is fixed after creation (DB has {db_code!r}, "
                             f"manifest has {given!r})")
                conn.execute("""UPDATE transform_db.report_master
                                SET title=%s, subtitle=COALESCE(%s, subtitle), iframe_src=%s, is_active=%s
                                WHERE id=%s""", (title, e.get("subtitle"), src, active, rid))
            else:
                rid = conn.execute("""INSERT INTO transform_db.report_master
                    (report_code, title, subtitle, component_key, iframe_src, is_active)
                    VALUES (%s,%s,%s,%s,%s,%s) RETURNING id""",
                    ((e.get("report_code") or "").strip() or key, title, e.get("subtitle") or "", key, src, active)).fetchone()[0]

            for l in e["_levels"]:
                lid = levels[l]
                m = conn.execute("""SELECT 1 FROM transform_db.report_level_mapping
                                    WHERE report_id=%s AND level_id=%s""", (rid, lid)).fetchone()
                if m:
                    conn.execute("""UPDATE transform_db.report_level_mapping
                                    SET is_active=%s, priority=COALESCE(%s::int, priority)
                                    WHERE report_id=%s AND level_id=%s""", (active, e.get("priority"), rid, lid))
                else:
                    conn.execute("""INSERT INTO transform_db.report_level_mapping
                        (report_id, level_id, priority, is_active)
                        VALUES (%s,%s, COALESCE(%s::int,(SELECT COALESCE(MAX(priority),0)+10
                                FROM transform_db.report_level_mapping WHERE level_id=%s)), %s)""",
                        (rid, lid, e.get("priority"), lid, active))
            # manifest is authoritative: deactivate mappings in levels no longer listed
            conn.execute("""UPDATE transform_db.report_level_mapping SET is_active=FALSE
                            WHERE report_id=%s AND level_id <> ALL(%s)""",
                         (rid, [levels[l] for l in e["_levels"]]))
            print(("UPDATE " if row else "INSERT ") + f"{key} -> {e['_levels']}")
        if a.rehearse:
            conn.rollback(); print("rehearse: rolled back")


if __name__ == "__main__":
    main()
