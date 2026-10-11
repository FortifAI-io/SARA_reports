# SARA Reports

HTML reports shown on the FortifAI **Reports** page. Add a report here and it is published automatically when the change is merged to `main`. No code change, rebuild or database edit is needed.

## Add a report

**1. Create a branch** from `main`.

**2. Add the HTML file** to the repo root, next to `manifest.yaml`.
- Use a plain file name: letters, digits, `-` and `_`, ending in `.html` (no spaces, no folders).
- The report must be **one self-contained file**. Only top-level `*.html` files are deployed, so images, CSS and scripts must be inlined or embedded in it.

**3. Add an entry** at the end of the list in `manifest.yaml`:

```yaml
  - file: Vendor_Payment_Risk_v1.html
    title: Vendor Payment Risk
    component_key: Vendor_Payment_Risk_v1
    level: finance
```

**4. Open a pull request.** The **validate manifest** check must pass. Fix anything it reports (see the table below), then get the PR reviewed and merged.

**5. Wait for the deploy.** Merging starts the `deploy-reports` workflow (Actions tab). The report appears in its section within a few minutes. The list is cached for up to 5 minutes, so hard-refresh the Reports page if you don't see it yet.

You can run the same validation locally before pushing:

```bash
pip install pyyaml
python sync_reports.py --check --html-dir .
```

## Manifest fields

| Field | Required | Notes |
|---|---|---|
| `file` | yes | The HTML file name, as in the repo root |
| `title` | yes | Name shown in the report list |
| `component_key` | yes | Unique ID of the report. Letters, digits, `-`, `_` only |
| `level` | yes | Section the report appears in (table below). A list such as `[finance, audit]` shows it in several |
| `subtitle` | no | Short description under the title. Blank if omitted |
| `report_code` | no | Defaults to `component_key` |
| `active` | no | `true` by default. Set `false` to hide the report |
| `priority` | no | Position in the section. New reports go last by default |

## Sections (`level`)

| `level` | Shown as |
|---|---|
| `procurement` | Procurement |
| `audit` | Audit |
| `compliance` | Compliance |
| `finance` | Finance |
| `sales` | Sales & Revenue |

Other level keys exist in the database (`bu`, `cfo`, `board`, `cross`, `vendor`, `sox`, `ra-generator`). Ask before using them. Reports in `cross` are currently not displayed.

## Changing or removing a report

- **Update the HTML:** replace the file, keeping the same name. No manifest change is needed.
- **Change a title, subtitle or section:** edit its manifest entry.
- **Hide a report:** set `active: false` on its entry. **Deleting the entry does not hide it**, and deleting the HTML file does not remove it from the server.
- **Never change the `component_key` of a live report.** It is the report's identity. A new key creates a second report and leaves the old one visible.
- Don't edit these fields directly in the database. The next deploy overwrites `title`, the file, `active` and the section with the manifest values.

## If the check fails

| Message | Fix |
|---|---|
| `missing required field(s)` | Add the named field to the entry |
| `file not found` | The file isn't in the repo root, or the name differs (case matters) |
| `component_key ... invalid` | Use only letters, digits, `-` and `_`, with no spaces |
| `duplicate component_key` | Each report needs its own key. Check for a copy-paste |
| `unknown field(s)` | A typo in a field name (for example `titel`) |

An unknown `level` is not caught by this check, because it needs the database. It makes the **deploy** job stop at its plan step with a message listing the valid values, before anything is applied. Fix the manifest and merge again.

## Good to know

- **Don't put credentials or sensitive data in an HTML file.** Treat everything in it as readable by anyone who has the file's URL.
- The repo is private and `main` deploys to the server, so changes are reviewed before merging.
- For setup, troubleshooting and how the pipeline works, see `report-deployment-runbook.md`.
