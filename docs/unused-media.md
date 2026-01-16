# Unused media audit

This repo keeps media under `assets/`. During the build, `assets/images/` is copied into the published site as `images/` (see `scripts/copy-images.mjs`), so references in sources typically look like `images/...` (not `assets/images/...`).

## How to audit

Run:

```sh
npm run assets:unused
```

This prints a list of media files under `assets/` that do not appear to be referenced anywhere in repo text files.

To remove the files after reviewing the list:

```sh
npm run assets:unused -- --delete
```

Notes/limits:

- This is a conservative string-match audit; it may miss dynamic references assembled at runtime or inside generated files.
- The scan excludes `node_modules/`, `build/`, and `.git/`.
