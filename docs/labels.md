# Issue Labels Proposal

This document proposes a lightweight label system for `BCDH/tei-lex-0` that fits TEI Lex-0 guidelines work better than the default GitHub software-development labels.

The names below are intentionally short. The prefix carries the classification dimension; the rest should stay compact.

## Principles

- Use a small number of labels.
- Keep label dimensions separate with prefixes.
- Default to at most two labels per issue:
  - one `kind:*`
  - one `area:*`
- Use milestones, not labels, for release targeting such as `v0.9.6`.

## Recommended label dimensions

### `kind:*`

Use exactly one of these on most issues.

- `kind:schema`
  - Changes to allowed elements, attributes, values, or content models.
- `kind:guidelines`
  - Clarify, write, expand, revise or restructure guideline prose or examples.
- `kind:bug`
  - Spec/example mismatch, broken validation, or internal inconsistency.
- `kind:tooling`
  - Build, CI, deployment, website, editor integration, or repo workflow.
- `kind:release`
  - Release assets, website publication, archived versions, and historical releases.

### `area:*`

Use one of these when the issue has a clear topical area.

- `area:front-back`
  - Front matter, back matter, title pages, layout elements, facsimile-related structure.
- `area:cross-references`
  - `xr`, `ref`, related-entry structures, labels, and linking patterns.
- `area:grammar`
  - `gram`, `gramGrp`, valency, collocates, grammatical categories and values.
- `area:header`
  - `teiHeader`, bibliographic metadata, publication/source/revision description.
- `area:entry-structure`
  - Entry/sense/def/cit/quote content models and inline lexicographic structures, excluding form-specific modeling.
- `area:forms`
  - `form`, `orth`, `pron`, lemma and inflected/variant/derived form modeling.

## `status:*` labels

These are worth keeping:

- `status:duplicate`
  - This issue or pull request already exists.
- `status:invalid`
  - This doesn't seem right.
- `status:wontfix`
  - This will not be worked on.
- `status:help-wanted`
  - Extra attention is needed.
- `status:good-first-issue`
  - Good for newcomers.

These should not be used as the primary taxonomy for this repository:

- `bug`
- `enhancement`
- `documentation`
- `question`

## Colors

Use a unique color for every label. No two labels should share the same color.

### `kind:*`

- `kind:schema` `#0052CC`
- `kind:guidelines` `#5319E7`
- `kind:bug` `#D73A4A`
- `kind:tooling` `#0E8A16`
- `kind:release` `#FF9F1C`

### `area:*`

- `area:front-back` `#BFD4F2`
- `area:cross-references` `#006B75`
- `area:grammar` `#F9D0C4`
- `area:header` `#D4C5F9`
- `area:entry-structure` `#BFE5BF`
- `area:forms` `#F7C6C7`

### `status:*`

- `status:duplicate` `#C5C9D1`
- `status:invalid` `#E4E669`
- `status:wontfix` `#6A737D`
- `status:help-wanted` `#A371F7`
- `status:good-first-issue` `#1B9AAA`

## Migration Plan

### Rename existing labels

- `duplicate` -> `status:duplicate`
- `invalid` -> `status:invalid`
- `wontfix` -> `status:wontfix`
- `help wanted` -> `status:help-wanted`
- `good first issue` -> `status:good-first-issue`

These should keep their current GitHub meanings and descriptions.

### Create new labels

- `kind:schema`
- `kind:guidelines`
- `kind:bug`
- `kind:tooling`
- `kind:release`
- `area:front-back`
- `area:cross-references`
- `area:grammar`
- `area:header`
- `area:entry-structure`
- `area:forms`

### Delete or stop using

- `bug`
- `enhancement`
- `documentation`
- `question`

## Usage examples

- `#284` Make previous versions of schema available on the website and in the repository
  - `kind:release`

- `#277` Allow `<lbl>` inside `<def>` (and other phrase-level contexts)
  - `kind:schema`
  - `area:entry-structure`

- `#117` Mupltiple references within one `<xr>` element, or multliple `<xr>` elements?
  - `kind:guidelines`
  - `area:cross-references`

- `#105` `.rng` file incorrectly flags `authority` tag as not allowed within `publicationStmt`
  - `kind:bug`
  - `area:header`

- `#98` More elements for encoding front/back matter
  - `kind:schema`
  - `area:front-back`

## Working rule

Recommended default:

1. Assign one `kind:*` label.
2. Assign one `area:*` label if there is a clear topical area.

This should keep the issue tracker readable without mixing unrelated classification systems.
