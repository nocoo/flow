# Flow logo usage

The identity is celadon mechanical keycap with a chinese character. It follows the reviewed Hexly material study `2026-09-07-01`, finishing `01`.

## Asset roles

- `logo.png`: exact 2048 × 2048 transparent foreground, free of the backdrop and cast shadow.
- `assets/brand/icon.png`: square presentation for large cards and platforms that apply their own mask.
- `assets/brand/icon-rounded.png`: large README and gallery presentation.
- `assets/brand/background.png`: independent pinyin key rhythm field.

Small header/sidebar marks and favicons use the transparent foreground without an extra tile or circular CSS mask. Touch/PWA icons use the opaque square presentation. Source hashes and provenance live in `assets/brand/source.json`. Regenerate application sizes with `uv run --with pillow python assets/brand/generate.py`; roles are recorded in `usage.json` and checksums in `derivatives.json`.

## Consumers

- apps/web/index.html
- apps/web/index.html: browser identity; editor components have no existing brand mark

## Study

[Individual comparison](https://hexly.ai/logos/flow) · [Complete generation archive](https://github.com/nocoo/hexly.ai/tree/main/artwork/logo-family/flow/2026-09-07-01) · [Shared usage SOP](https://github.com/nocoo/hexly.ai/blob/main/docs/07-logo-usage-sop.md)
