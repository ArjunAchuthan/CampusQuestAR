# Directive: Mini-Games

## Goal
Build the "Among Us"-style tasks (wire-connecting and similar short puzzles) that play inside the AR scene once a user has found the AR element at their current location. Completing the task is what unlocks that location's clue (see `geofence-unlock.md` for the arrival gate, and `camera-scan.md` for the AR discovery step this follows).

## Flow this fits into
```
Arrive in geofence → AR element appears in Camera tab → tap to focus/lock it
  → mini-game renders in that locked view → task completed
  → clue unlocks (AR element morphs into clue, or Clue tab becomes available)
```

## Inputs
- The "focus mode" concept from `camera-scan.md`: once an AR element is tapped, its position should lock to a stable spot on screen (stop tracking live device orientation) so the puzzle doesn't jitter while being played
- A per-location `game` config in the `locations` Firestore doc: `{ type: 'wire-connect' | ..., config: {...} }` — the solution/config lives server-side so it can't be read from client bundle inspection
- Touch/pointer events for drag interactions (no hand-tracking needed)

## Tools
- Each game type is its own component under `src/components/games/`, e.g. `WireConnectGame.tsx`, sharing a common interface: `{ config, onComplete }`
- For wire-connect specifically: render wire endpoints as absolutely-positioned draggable elements (plain DOM/CSS is sufficient — this doesn't need to be a Three.js/WebGL scene even though it visually sits "in" the AR view); on drag-release, check proximity to the correct target endpoint and snap/lock on match
- A generic `<GameContainer>` wrapper that handles the shared bits: instructions, a completion check, calling `onComplete` which writes to the progress doc

## Outputs
- On task completion: write `completedGameIds` (or similar) to the user's progress doc, record a timestamp, and trigger the clue-unlock transition (the locked AR focus view morphs into the clue element, or simply enables the Clue tab for that location)
- Each game type should be swappable per location via the Firestore config, not hardcoded per location in the component tree — so adding an 8th location later doesn't require new code, just a new config entry (assuming it reuses an existing game type)

## Edge cases
- **Partial progress isn't saved mid-game** unless you explicitly want retry-from-scratch behavior — decide this once and apply it consistently across game types (recommended: no partial credit, keeps it simple and fair for a timed leaderboard)
- **Preventing skip/cheat**: the "solution" data (correct wire pairings, etc.) should not be inspectable in client-side state before the puzzle is solved — keep it in Firestore, not in a hardcoded client constant, and validate completion server-side if you want to be strict (Cloud Function or security-rule-gated write) rather than trusting a client-reported "I finished" flag
- **Different screen sizes**: since this plays inside the camera view, touch targets need to stay large and well-spaced across small and large phones — test on the smallest target device, not just your dev phone
- **Task difficulty consistency**: keep task duration roughly comparable across the 7 locations, since total completion time is the leaderboard metric — a much harder task at one location skews rankings independent of how "fast" someone actually is

## Current implementation notes
- `src/components/games/CheckpointGame.tsx` maps the seven ordered checkpoints to an AR beacon and short repair tasks: rotate coolant pipes, reconnect colored leads, restore breaker states, repeat a reboot pulse, sort data packets, clear intake vents, and calibrate reactor bands.
- The beacon and task pieces are Three.js WebGL geometry over the camera feed: faceted beacon, tube-geometry pipes and wires, 3D breakers, pulse spheres, packet cubes, debris crystals, and reactor dials. The anchored task has no enclosing card panel; raycasts on 3D objects drive the puzzle interactions.
- The beacon appears at a stable screen-space coordinate after geofence arrival and stops floating when tapped. This is camera compositing with a fixed screen anchor, not true world tracking or SLAM.
- The Camera screen only mounts the active checkpoint experience while the current geofence is reached. Success writes the location ID to `completedGameIds`, advances `currentLocationIndex`, and stamps `finishedAt` on checkpoint seven. `startedAt` is stamped on first geofence arrival.
- The current game answers are bundled in the client for a playable prototype. This does not meet the server-side solution/validation requirement above; before a competitive event, move per-location game configs and validation to a trusted backend and tighten Firestore progress rules. The current Firestore rules allow public progress writes, so client completion must not be treated as cheat-resistant.
- `/games` is a standalone, GPS-free preview route that lists and runs each mini-game locally without writing quest progress. Use it to inspect and playtest the games away from campus.
- When the active target changes, `useGeofence` clears the previous location's in-range state before accepting a new fix. This prevents the prior checkpoint's GPS match from briefly activating the next puzzle.
