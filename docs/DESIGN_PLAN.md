# Design plan

Subject: a public archive and marketplace-of-contacts for six endangered Karnataka crafts. Audience: buyers and
learners who have never met a Kinhal lacquer painter, plus the artisans themselves (often on a mid-range Android
phone, often reading Kannada first). Primary job: help someone find a craft, hear the person who makes it, and
reach that person.

## Tokens

| Name       | Hex                                 | Role                                                                |
| ---------- | ----------------------------------- | ------------------------------------------------------------------- |
| paper      | `#F3EAD8`                           | page ground (unbleached cotton)                                     |
| paper-dark | `#E4D6BA`                           | recessed panels, filter drawer                                      |
| ink        | `#1E1B18`                           | text, rules, hard shadows                                           |
| indigo     | `#25407A`                           | primary actions, links, focus ring, the one "dyed" section per page |
| madder     | `#B8402E` (`#9C3424` on dark paper) | stamps, rejection, emphasis marks                                   |
| turmeric   | `#E0A526`                           | fills and thread only, never text on paper                          |
| leaf       | `#4F6B3A` (`#3F5730` on dark paper) | success, "approved"                                                 |

Type: Fraunces (display, SOFT 100 / WONK 1 for headlines, SOFT 30 for subheads), Mukta (body 17.5 px, UI),
Caveat (marginal notes only, never for anything you must read to use the app). Scale on a 1.333 ratio from
17.5 px: 13 / 17.5 / 23 / 31 / 41 / 55 / 73 px; hero headline clamps to 96 px.

## Layout concept

A poster wall, not a feed. Every page is built from three kinds of paper laid on the wall:

```
 ┌──────── masthead strip (letterpress rule, nav as stamped tabs) ────────┐
 │ BIG HEADLINE, left aligned, printed in            ┌─ torn indigo sheet ─┐│
 │ word by word                                      │ wheel  loom  wheel  ││
 │   ~ marginal note in Caveat, rotated -3°          │  (parallax layers)  ││
 │ [stamp button]  [ghost link]                      └─────────────────────┘│
 ├───────── deckled edge ─────────────────────────────────────────────────┤
 │ specimen strip: six crafts as pencil outlines, staggered heights,      │
 │ each fills with colour when it reaches the reading line                │
 ├────────────┬───────────────────────────────────────────────────────────┤
 │ sticky     │ Record it   (SDG 11 stamp)                                │
 │ stamp col. │ Keep it     (SDG 8 stamp)                                 │
 │            │ Pass it on  (SDG 4 stamp)                                 │
 └────────────┴───────────────────────────────────────────────────────────┘
```

Alignment: left aligned everywhere; centring is reserved for the 404 loom and the printed certificate. Lists
use ticket cards whose rotation is derived from the record id (so the wall is stable between visits), on a
grid whose rows deliberately misalign by a few pixels. Dashboards drop the play: flat paper-dark panels, plain
tables, no rotation. Charm lives on public pages; work happens on quiet ones.

## Principles

1. One loud moment per page. Home: the printed headline + fading strip. Gallery: the type-case filter drawer.
   Story: the cassette. Everything else is set like a well-kept ledger.
2. Ink is physical: shadows are hard offsets of `ink`, never blurred. Pressing a button pushes it into its
   shadow.
3. Numbers we cannot vouch for say so on their face: every sample figure carries a SAMPLE stamp.
4. Three scripts are first-class: line heights per script, no fixed-height text boxes.

## Review against the brief (second pass)

- First draft put the six crafts in an even 3×2 grid of equal cards. That is the "three identical feature
  cards" default. Changed to a staggered specimen strip with varying heights and offsets.
- First draft used a centred hero with a large stat and small label. Changed to a left-aligned printed
  headline with the illustration sheet overlapping the edge of the text column, and the statistics moved into
  the fading strip where they belong to a specific craft.
- Small labels: the brief asks for letter-spaced small caps on ticket captions, so they stay there only, and
  are not used as eyebrows above section headings.
- The palette (cream + madder) sits close to a common generated look; the brief fixes it, so the difference
  has to come from texture (grain, halftone, deckled edges, off-register ink) and from indigo carrying the
  primary role instead of the red.
