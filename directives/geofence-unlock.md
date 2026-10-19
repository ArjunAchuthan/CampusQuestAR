# Directive: Geofence Unlock

## Goal
Determine when a signed-in user has physically reached the current target location (one of 7 lat/long points) closely enough to unlock that location's AR clue. This is the gate that connects the Map tab, the Camera tab, and Firestore progress — nothing else in the game should be reachable ahead of physically arriving.

## Inputs
- `locations` Firestore collection — one doc per location: `{ id, coords: { lat, lng }, unlockRadius, order }`
- `progress/{sixDigitId}` doc per user — tracks `currentLocationIndex`, `unlockedAt` timestamps per location, `completedGameIds`; retain the Firebase Auth UID as a `uid` field for joins
- `navigator.geolocation.watchPosition()` for the user's live coordinates

## Tools
- A `haversineDistance(a, b)` utility in `src/lib/geo.ts` — standard great-circle distance formula, returns meters
- A `useGeofence(targetCoords, radius)` hook wrapping `watchPosition`, returning `{ distance, withinRange }`, cleaning up the watch on unmount

## Outputs
- `MapScreen`'s bottom sheet "Distance" field is driven by this hook's live `distance` value (currently a skeleton placeholder)
- `CameraScreen` only shows the AR clue/mini-game overlay when `withinRange` is true for the user's current target location; otherwise it stays in plain scanning mode
- On first entering range, write `unlockedAt: serverTimestamp()` to the user's progress doc for that location — this is also the timestamp the leaderboard's completion-time calculation will read from
- `src/screens/ClueScreen.tsx` presents the active checkpoint's chapter narrative and riddle from `src/lib/story.ts`. Never display the answer (location name) or a separate hint in the clue card; the riddle is the discovery mechanic. The dashboard may show only the checkpoint number.
- After the first-login recovered note is opened and `Begin the hunt` is selected, route directly to checkpoint one's clue. Completing the active location's AR task advances progress and reveals the next checkpoint's story and riddle.
- After a successful game completion is saved, route directly from Camera to Clue and show a brief accessible “New clue unlocked” confirmation for the newly active checkpoint. This reveals the riddle immediately; it does not mark that next checkpoint's geofence reached or activate its AR game until the player arrives.
- After checkpoint 7 is completed, the clue screen presents the Lost Legacy epilogue instead of another location answer.

## Edge cases
- **GPS accuracy is typically 5–15m outdoors**, sometimes worse near buildings — set `unlockRadius` per location generously (15–20m+) rather than trying to be precise; test the actual radius on-site before the event, not just in a simulator
- **Permission denied** for geolocation → block progress entirely with a clear explanation, since the whole game depends on it; there's no fallback mode
- **Stale/jumpy readings**: `watchPosition` can occasionally report a wildly inaccurate point (GPS drift); consider requiring 2–3 consecutive in-range readings before unlocking, rather than unlocking on the first one, to avoid a false trigger from a bad fix
- **Order enforcement**: confirm on the backend (Firestore security rules), not just in the UI, that a user can't unlock location 5 without having completed 1–4 — client-side geofence checks alone can be bypassed by anyone who edits local state
- **Battery/permission prompts**: `watchPosition` should be started only while on the Map or Camera tab, not for the whole session, to avoid draining phones over a multi-hour event

## Current testing notes
- For local development, `?testCoords=latitude,longitude` overrides all seven Firestore target coordinates without writing to the database. The temporary `phone-ar-test` hosting channel defaults to `10.758460,76.694664` for phone geolocation testing; keep that host allowlist exact so production participants cannot move checkpoint geofences with a URL parameter. The current production Firestore checkpoint documents also use this shared testing coordinate at the user's request.
- Camera selection is progress-first: `currentLocationIndex` selects the sole active checkpoint; never select a game by nearest location or by another nearby geofence. Keep the game unmounted until the signed-in player's progress snapshot is loaded, then require the active checkpoint's geofence to be reached. With all seven test coordinates co-located, a successful game should advance to the next game at the same physical point.
- If progress points outside the available location index range, return no current location instead of falling back to checkpoint one.
