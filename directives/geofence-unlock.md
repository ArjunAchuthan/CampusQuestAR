# Directive: Geofence Unlock

## Goal
Determine when a signed-in user has physically reached the current target location (one of 7 lat/long points) closely enough to unlock that location's AR clue. This is the gate that connects the Map tab, the Camera tab, and Firestore progress — nothing else in the game should be reachable ahead of physically arriving.

## Inputs
- `locations` Firestore collection — one doc per location: `{ id, coords: { lat, lng }, unlockRadius, order }`
- `progress` doc per user — tracks `currentLocationIndex`, `unlockedAt` timestamps per location, `completedGameIds`
- `navigator.geolocation.watchPosition()` for the user's live coordinates

## Tools
- A `haversineDistance(a, b)` utility in `src/lib/geo.ts` — standard great-circle distance formula, returns meters
- A `useGeofence(targetCoords, radius)` hook wrapping `watchPosition`, returning `{ distance, withinRange }`, cleaning up the watch on unmount

## Outputs
- `MapScreen`'s bottom sheet "Distance" field is driven by this hook's live `distance` value (currently a skeleton placeholder)
- `CameraScreen` only shows the AR clue/mini-game overlay when `withinRange` is true for the user's current target location; otherwise it stays in plain scanning mode
- On first entering range, write `unlockedAt: serverTimestamp()` to the user's progress doc for that location — this is also the timestamp the leaderboard's completion-time calculation will read from

## Edge cases
- **GPS accuracy is typically 5–15m outdoors**, sometimes worse near buildings — set `unlockRadius` per location generously (15–20m+) rather than trying to be precise; test the actual radius on-site before the event, not just in a simulator
- **Permission denied** for geolocation → block progress entirely with a clear explanation, since the whole game depends on it; there's no fallback mode
- **Stale/jumpy readings**: `watchPosition` can occasionally report a wildly inaccurate point (GPS drift); consider requiring 2–3 consecutive in-range readings before unlocking, rather than unlocking on the first one, to avoid a false trigger from a bad fix
- **Order enforcement**: confirm on the backend (Firestore security rules), not just in the UI, that a user can't unlock location 5 without having completed 1–4 — client-side geofence checks alone can be bypassed by anyone who edits local state
- **Battery/permission prompts**: `watchPosition` should be started only while on the Map or Camera tab, not for the whole session, to avoid draining phones over a multi-hour event
