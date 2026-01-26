# Issue Migration Plan (Hybrid)

This document defines a **hybrid migration strategy** for moving issues from:

- Source: `DARIAH-ERIC/lexicalresources`
- Target: `BCDH/tei-lex-0`

The plan uses:

1. **GitHub-native issue transfer** for **open issues** (highest fidelity, preserves authorship and redirects)
2. **Scripted reconstruction** for **closed issues** (CI-driven recreation with attribution, no pings, and clean Markdown rendering)

The result is a single canonical tracker in `BCDH/tei-lex-0`, with minimal disruption for contributors and maximum preservation of history.

## Goals and Non-goals

### Goals

- Make `BCDH/tei-lex-0` the **canonical issue tracker** going forward.
- Preserve open-issue history with **native GitHub transfer**:
  - original author, timestamps, comments
  - issue-to-issue links
  - **automatic redirects** from old URLs
- Recreate closed issues in the new repo:
  - preserve content and discussion (body + comments)
  - preserve original author and timestamps **as attribution**
  - reconstruct labels (and optionally milestones/assignees)
  - ensure **no notification spam**
  - ensure **code blocks render prettily** (fenced code blocks + language tags)
- Turn `DARIAH-ERIC/lexicalresources` into an **archive** (read-only for practical purposes).

### Non-goals

- Perfect preservation of closed-issue authorship in GitHub metadata (not possible via recreation).
- Perfect preservation of cross-issue references for closed issues (some references will remain textual unless post-processed).
- Bulk-native transfer of issues (GitHub provides no official bulk transfer operation).

## Constraints and Principles

### Constraints

- GitHub-native issue transfer works only when both repositories share the same owner/org.
- Closed issues cannot be relied on for native transfer in bulk workflows (assume reconstruction).
- Reconstructed issues/comments will be authored by the migration account; original authorship must be recorded as text.

### Principles

- **No surprise to end users**: clear messaging and predictable redirects.
- **Minimize pings**: migrated text must not trigger notifications.
- **Preserve Markdown verbatim** wherever possible to avoid breaking formatting and code blocks.
- **Auditability**: produce a mapping between old and new issues for traceability.

## Overview of the Hybrid Strategy

### Open issues (native transfer)

- Temporarily move the target repo (`BCDH/tei-lex-0`) under the `DARIAH-ERIC` org.
- Use GitHub’s **Transfer issue** action to move each open issue from `lexicalresources` to `tei-lex-0`.
- Move the repository back to `BCDH`.

**Why:** native transfer preserves _everything_ (authors, timestamps, comments) and creates **redirects** from old issue URLs.

### Closed issues (scripted reconstruction)

- Export all closed issues (including bodies, comments, labels, timestamps).
- Recreate them as new issues in `BCDH/tei-lex-0` with:
  - a migration header (source link, author, timestamps)
  - the original Markdown content (sanitized to avoid pings)
  - reconstructed comments (sanitized, attribution preserved)
- Close them immediately (optionally lock after creation).
- Produce a mapping table `old_issue_url → new_issue_url`.

**Why:** closed issues are best treated as archival history. Reconstruction provides discoverability and consolidated context in the new tracker.

## Phase A — Preparation and Communications

### A1. Choose a migration window

- Select a short “cutover” window when issue activity is likely low.
- During the window, ask maintainers to avoid:
  - creating new issues
  - commenting on existing issues
  - renaming labels/milestones

### A2. User-facing announcements

In `DARIAH-ERIC/lexicalresources`:

- Create a **pinned issue** announcing the move.
- Update README and repository description (“About”) to point to `BCDH/tei-lex-0`.

In `BCDH/tei-lex-0`:

- Add a short notice (README or pinned issue) that this is the canonical tracker.
- Optionally describe what migrated issues look like (attribution headers, etc.).

### A3. Decide what to freeze/lock after cutover

- Preferred: disable Issues in the legacy repo after migration.
- Alternative: keep Issues enabled but add:
  - an issue template that instructs users to file in the new repo
  - a bot/automation message (if you use one) that responds to new issues with a redirect

## Phase B — Native Transfer of Open Issues

This phase is required to make native transfer possible across the two orgs.

### B1. Preconditions

- Confirm you have:
  - admin rights on `BCDH/tei-lex-0`
  - permission in `DARIAH-ERIC` to host the repo temporarily
- Verify that moving the repo will not break critical services:
  - GitHub Actions (workflows should still run)
  - deployment hooks / webhooks
  - repository secrets and org-scoped secrets (may require checking after move)

### B2. Temporarily transfer repository ownership

- Transfer `BCDH/tei-lex-0` to `DARIAH-ERIC`.
- Confirm the repo becomes `DARIAH-ERIC/tei-lex-0`.
- Confirm GitHub redirects from the old BCDH URL to the temporary DARIAH-ERIC URL.

### B3. Transfer each open issue natively

For each open issue in `DARIAH-ERIC/lexicalresources`:

- Use **Transfer issue** (right-hand sidebar) to transfer to `DARIAH-ERIC/tei-lex-0`.

Record:

- count of open issues transferred
- any issues that fail to transfer (and why)

Expected result:

- open issues appear in `tei-lex-0` with full fidelity
- old issue URLs redirect to the new location

### B4. Transfer repository ownership back

- Transfer `DARIAH-ERIC/tei-lex-0` back to `BCDH`.
- Confirm the repo returns to `BCDH/tei-lex-0`.
- Confirm redirects:
  - `DARIAH-ERIC/lexicalresources/issues/<n>` redirects to `BCDH/tei-lex-0/issues/<m>`
  - temporary `DARIAH-ERIC/tei-lex-0` URLs redirect to BCDH

### B5. Post-transfer verification checklist (open issues)

- Spot-check at least 5 transferred issues:
  - authorship preserved
  - timestamps preserved
  - comments preserved
  - labels and assignees preserved
  - code blocks render correctly
  - redirects from old URLs work
- Confirm there are no “dangling” open issues left behind unintentionally.

## Phase C — Closed Issues: Export

Closed issues will be recreated by script. Before writing/using that script, define the export requirements.

### C1. Export scope

Export **closed issues only** from `DARIAH-ERIC/lexicalresources`, including:

- Issue metadata:
  - original issue number
  - title
  - state (closed)
  - original author (login)
  - created timestamp
  - closed timestamp (if available)
  - labels
  - assignees (optional)
  - milestone (optional)
- Content:
  - original issue body (Markdown)
  - all comments (Markdown), each with:
    - comment author (login)
    - comment timestamp
    - comment body (Markdown)

### C2. Export format

Store export as machine-readable JSON (one file or a directory), including:

- stable IDs and original URLs
- a deterministic ordering (by issue number, and comments by timestamp)

**Important:** treat Markdown as opaque text. Do not reformat during export.

## Phase D — Closed Issues: Reconstruction Rules

This section defines how the CI script must recreate closed issues so that end users get a clean experience.

### D1. New issue body template

Each reconstructed issue in `BCDH/tei-lex-0` must start with a header like:

- **Migrated from:** original issue URL
- **Original issue:** `DARIAH-ERIC/lexicalresources`
- **Original author:** `@<author>`
- **Originally opened:** `<timestamp> UTC`
- **Originally closed:** `<timestamp> UTC` (if available)

Followed by a separator line, then the original issue body.

**Do not wrap the original body in blockquotes.**

### D2. Reconstructed comments template

Each original comment becomes a new comment authored by the migration account, formatted as:

- **Original comment by:** `@<author>`
- **Original timestamp:** `<timestamp> UTC`

Followed by the original comment Markdown verbatim.

**Do not wrap the original comment in blockquotes.**
This is critical for clean rendering of fenced code blocks.

### D3. Silent mentions

During reconstruction, transform mentions to prevent notifications.

Required behavior:

- Any `@username` in issue bodies or comments must be rewritten so it does not notify.

Preferred rewrite:

- Insert a **zero-width space** after `@`:
  - `@username` → `@​username` (where the character between `@` and `u` is U+200B)

Alternative (more visible, also safe):

- Wrap in inline code:
  - `@username` → `@username`

Apply mention-silencing consistently to:

- issue body
- all comments
- migration header fields if they include usernames

### D4. Code block preservation requirements

To ensure GitHub renders code blocks prettily:

- Preserve fenced code blocks exactly:
  - keep triple backticks
  - keep language identifiers (e.g., ```xml)
  - preserve indentation and newlines
- Avoid any transformations that:
  - HTML-escape `<` and `>` in code blocks
  - “normalize” whitespace
  - wrap content in blockquotes

**Rule of thumb:** only transform mentions; everything else remains unchanged.

### D5. Labels, assignees, milestones

- Labels:
  - apply matching labels in the target repo
  - if a label doesn’t exist, create it or map it (policy decision)
- Assignees:
  - optional; only set if users exist and it adds value
- Milestones:
  - optional; usually omit unless milestones are actively used

### D6. Issue state and locking

- Reconstructed issues must be created as open, then immediately set to **closed**.
- Reconstructed issues should _not_ be locked (policy decision) because you want to allow future clarifications on old issues

### D7. Mapping file (traceability)

The reconstruction process must output a mapping table:

- original issue number + URL
- new issue number + URL
- status (created/failed)
- any warnings (e.g., missing labels, truncated content)

Store it as a committed artifact in `BCDH/tei-lex-0` (e.g., `docs/migration/issue-map.json` and a human-readable `issue-map.md`).

## Phase E — Final Cutover and Cleanup

### E1. Legacy repo

After both open transfer and closed reconstruction:

- Update README/description one final time.
- Disable Issues (preferred) **or** keep with strict redirect messaging.
- Consider locking the pinned migration notice so it stays clean.

### E2. Target repo

- Ensure links in documentation and website point to the new tracker.
- Pin a short “Issue tracker migration notes” item describing:
  - that open issues were transferred natively
  - that closed issues were reconstructed
  - how mentions were silenced
  - how to interpret migration headers

## Verification Checklist

### Open issues (native transfer)

- Old URLs redirect to the new issue location.
- Author and comment history appear original (not a bot).
- Code blocks display normally.

### Closed issues (reconstructed)

- Migration header is present and correct.
- Original content reads cleanly.
- Mentions do not ping users.
- Code blocks render with syntax highlighting when language tags exist.
- Issues are closed (and optionally locked).

### Search and discoverability

- Searching in the new repo returns both newly filed and migrated issues.
- Legacy repo clearly signals that new issues should be filed elsewhere.

## Operational Notes

- Keep the temporary ownership move as short as possible.
- Do not rename the repository during the migration window.
- Avoid label renames until all reconstruction is complete.
- Keep a single “source of truth” mapping file for audits and future maintenance.
