# OUTRUN VICE — Retro 80s Cover Maker

[![make.fun](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/soulbone78/gta6-cover-art-01-v3/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/soulbone78/gta6-cover-art-01-v3/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

Built for the [gta6-cover-art-01 bounty on make.fun](https://make.fun/bounty/gta6-cover-art-01).

A GTA 6-style cover art maker for `gta6-cover-art-01`: an offline browser web
app that turns your own photos and a caption into a retro 80s OUTRUN poster,
exported as a PNG to share.

## What it does

- **Procedural OUTRUN art** — a striped chrome sun setting over a neon
  perspective grid, a Vice City skyline, palm silhouettes and two back-to-back
  figures, all drawn as flat vector art on canvas. No faces, no portraits:
  bold shapes, gradients and silhouettes only.
- **Multi-panel covers** — three layouts: Poster (the full OUTRUN scene with
  three photo panels along the bottom), Grid 2×2 (four photo panels with the
  scene showing in the gaps), and Duo (the scene on the left, two stacked
  photo panels on the right).
- **Your photos** — load a photo from your machine into any panel, or use the
  three built-in procedural sample scenes (sunset grid, palm skyline, chrome
  cruiser). Crop and position each panel with zoom and pan sliders.
- **Colour grades** — Sunset Chrome (pink/orange), Ultraviolet (purple/magenta)
  and Teal Drive (teal/gold), each recolouring the sky, sun, grid and title.
- **Caption** — a chrome-gradient title plus a letter-spaced tagline, both
  editable.
- **Export** — one click exports the cover as a PNG in 1080×1080, 1080×1350,
  or 1920×1080.

Everything runs offline: no network request, photos never leave your machine,
and the app ships no photo assets — even the samples are drawn in code.

## Try it

```sh
node serve.ts
# open http://localhost:8080
```

## Hand-in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `app/` and `screenshots/` to the output directory and writes
`dossier.json` there with the vendored make.fun library.
