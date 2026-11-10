# Design critique: before and after

Method: production build against the real API, real web fonts (checked with `document.fonts.check`),
headless Chrome, full-page screenshots of Home, Gallery, StoryDetail, the artisan profile and the
artisan dashboard at 360 px and 1280 px (`scripts/screens.mjs`). Each screenshot was read against
`docs/DESIGN_PLAN.md`, the art direction in the brief and its avoid-list.

## What already worked

- Left-aligned printed headline with the off-register madder plate; the paper grain and hard ink
  shadows read as print, not as a generic card UI.
- The specimen strip of six crafts is staggered rather than a row of identical cards, and every
  practitioner number carries a SAMPLE stamp.
- The deckled edge under the strip, the three different papers for the story panels, and the
  cassette player all hold the poster-wall idea.
- Avoid-list check: no gradients in the hero, no glassmorphism or blurred shadows, no emoji icons,
  no three identical feature cards, real (not system) fonts, no stock photos or lorem ipsum, none of
  the banned words.

## What was wrong, and what changed

| #   | Before (found in the screenshots)                                                                                                                                     | After                                                                                                                                                                                    |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Signed in at 1280 px, "Story archive" and "My workbench" wrapped onto two lines and "Sign out" fell under the name. At 360 px the Menu button wrapped below the logo. | Nav labels never wrap; the full nav appears from 1200 px, the name hides between 1200 and 1399 px; smaller wordmark under 420 px, so logo and Menu share one line.                       |
| 2   | The demo ribbon took three lines (about 100 px) at the top of every phone screen, and appeared after an async check, pushing the whole page down.                     | A small fixed ticket in the bottom-left corner; on phones only "DEMO" and the reset button. It no longer moves the page at all.                                                          |
| 3   | The three story panels had a forced `min-height: 62vh`, leaving their lower halves empty.                                                                             | Panels size to their content; the sticky rail still works.                                                                                                                               |
| 4   | The hero's indigo "dyed" sheet, meant to be the one bold moment, was almost entirely covered by the paper panels.                                                     | Re-layered: a smaller paper back, the indigo sheet visible down the middle and right, the toy in a round paper sticker.                                                                  |
| 5   | Gallery on a phone: each ticket was taller than half the screen (art at 72% width), so you saw about one piece at a time.                                             | Under 620 px the art sits beside the text (92 px), about three pieces per screen; on wide screens art is 62% wide.                                                                       |
| 6   | Pottery pieces looked identical side by side; the seeded art varied too little and read as machine-made.                                                              | Pottery now has four seeded shapes (matka, lidded, curd bowl, lamp stand), three slip colours and four stamped band motifs; Kinhal birds vary in colour.                                 |
| 7   | Meta lines like "Village pottery · Kannada" and "Heard 46 times · 25 Sept 2026" used the middle-dot pattern that makes generated pages look alike.                    | Language is a hand-lettered tag beside the craft caption; duration is a small boxed label; plays and date are separate items.                                                            |
| 8   | The perforation line on tickets sat at a fixed 68% height and, in the new phone layout, cut through the artisan's name.                                               | Tickets have a real stub (price, years, facts); its height is measured and the notches and dashed line sit exactly above it.                                                             |
| 9   | The search box in the filter drawer clipped its Search button; file inputs showed the browser's grey "Choose File" button.                                            | The search input shrinks to fit; file buttons are styled as ghost stamps.                                                                                                                |
| 10  | Seven page/width combinations scrolled sideways by 1–72 px (rotated stamps at the edge; a visually-hidden chart table that ignored `width: 1px`).                     | `overflow-x: clip` on `<main>` (keeps sticky working) and the hidden tables wrapped in a hidden div: **0 of 75** page/width combinations scroll sideways (25 pages × 360, 768, 1440 px). |

## Performance pass (also driven by measurement)

The first Lighthouse run on Home scored performance 58–68 with a cumulative layout shift of about
1.0. Causes found in the code: the footer started in view while the page chunk loaded, the demo
ribbon pushed everything down when it appeared, the first route rendered at `opacity: 0` until
framer-motion's lazy features arrived, the headline words were transparent until the loom intro
finished, and Home was a separate chunk. All five were fixed (see the commit
`perf(home): …`). Below-the-fold sections now use `content-visibility: auto`, and the hero's SVG
motion pauses while the intro covers it.

## Reduced motion

With `prefers-reduced-motion: reduce` (screenshotted with Chrome's emulation): no loom intro, the
headline is already printed with its plate in register, illustrations stand still, crafts appear in
full colour with captions shown, no ink wipe between pages, no tilt on tickets. The page keeps its
texture, colour and layout, so it is calm rather than bare.

## Still open

- A seeded pot shape does not know the piece's name, so "Festival lamp stand" can be drawn as a curd
  bowl. Fix: let a piece choose its shape family from keywords in its title.
- Kannada and Hindi fall back to Noto Sans Kannada / Mukta for the hand-lettered notes, because
  Caveat has no Indic glyphs. Readable, but the "handwritten" feeling is lost in those languages.
