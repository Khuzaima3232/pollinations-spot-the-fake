# Spot the fake — build notes (quest #15725)

## Verified facts (measured, not assumed)

| Thing | Result |
|---|---|
| Real photos | `en.wikipedia.org/api/rest_v1/page/summary/<article>` → `originalimage.source` on `upload.wikimedia.org`. 5/5 fetched, full metadata (dimensions). |
| `commons.wikimedia.org` API | **Blocked from this machine** — `curl: (35) Connection was reset` in 0.14s. Only this host; en.wikipedia (301) and upload.wikimedia (301) are fine. So the design must not depend on the Commons API. |
| AI fakes | `POST /v1/images/generations` with `response_format: b64_json` works, 200. |
| Cost per image | gpt-image-1-mini: 1106 tokens, ~154-227 KB file. |
| Timing | flux.1-schnell 16s, z-image-turbo 10s, klein-4b 12s, gpt-image-1-mini 30s. |

## Difficulty calibration (the finding that matters)

First attempt (`gpt-image-1-mini`, photorealistic prompt) was **too obviously AI** — a vision check found a malformed extra limb, glassy eyes, painted snow, no paw prints. A puzzle where the fake is instantly spottable is not fun.

Second pass across four models, judged on the same prompt:

- **`black-forest-labs/flux.1-schnell` — "medium-difficulty fake. A casual glance might be fooled, but once you look for AI artifacts, it becomes obvious."** ← the pick
- Its tells: symmetrical glassy eyes with identical catchlights, paws as black blobs with no toes, legs without joints, tail that looks detached, snow with no footprints or cast shadow, uniform bokeh.

That difficulty is right for the game, and the tells are **teachable**, which is what makes the "reveal" feature worth having.

## Design decisions

1. **Fakes are pre-generated and committed**, because the quest requires that "anyone can play without signing in". So no BYOP gate on the main loop — the player guesses for free, and the images are static assets in the repo.
2. **Real images carry their source and licence.** They are Wikipedia lead images, so attribution is possible and the licence is free. Stored in the round data, shown on reveal.
3. **The reveal teaches.** Each round carries the specific tells to look for, not just "this one was AI" — that is the difference from the Britannica and Fake-or-Real quizzes found in research.
4. **Streak scoring**, saved to `localStorage`.
5. **Self-contained single HTML file** with no build step, like GATEKEEPER — that app got approved through this exact pipeline.

## Why this quest

Zero rivals on the board when picked, published reward **7 P** (the only new quest with a stated amount), and the app pipeline is one I have already taken from submission to human `APP-APPROVED` with GATEKEEPER.

## Not doing

- No vision-model call at runtime for "harder rounds" — that would need a signed-in player, which contradicts the no-sign-in requirement.
- No Commons API dependency (blocked here, and unnecessary).
