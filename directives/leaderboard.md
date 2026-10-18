# Directive: Leaderboard

## Goal
Replace `LeaderboardScreen`'s skeleton rows with a live, ranked list of participants ordered by total completion time (fastest first), plus the existing "Your Position" highlighted row driven by real data. Ranking updates live as other participants finish, without a manual refresh.

## Inputs
- `src/components/screens/LeaderboardScreen.tsx` — already has the row layout (`rank / avatar+name / time`, `colGrid = '36px 1fr 58px'`) and a separate highlighted "Your Position" section; both currently render skeleton placeholders
- Each user's `progress` doc: needs a `startedAt` (first login or first geofence unlock — decide which and apply consistently) and `finishedAt` (set when location 7's task completes) timestamp
- `ProfileScreen`'s **Time** and **Rank** cards must read from the same source as this screen; do not display an estimated rank or an Attempts field

## Tools
- Firestore query: `progress` collection where `finishedAt != null`, ordered by `(finishedAt - startedAt)` ascending — since Firestore can't compute a derived field in the query itself, either store a precomputed `totalTimeMs` field (written once at finish, recommended) or compute and sort client-side after fetching finished participants
- `onSnapshot` listener on that query for live updates, rather than polling
- A small time-formatting util (`formatDuration(ms)` → `"12:34"` style) matching the existing `Skel` row width (`48px` in the time column, keep formatted output short)

## Outputs
- Ranked rows for all participants with `finishedAt` set; participants still mid-hunt don't appear in the main ranked list (there's no partial-progress ranking in the current design)
- "Your Position" section shows the current user's own rank/time — reuse the existing accent-tinted highlight styling exactly, no new visual treatment
- `ProfileScreen`'s **Time** and **Rank** cards read from this same computed data. Participants without a completed run display `—` until their finished run is ranked.

## Edge cases
- **Ties**: decide a tiebreaker up front (e.g. `finishedAt` timestamp as secondary sort) so rank isn't ambiguous or flickering between two equal times
- **DNF participants** (never finish): they simply don't appear in the ranked list — confirm this is acceptable, or decide whether to show an "in progress" section separately (not currently part of the design)
- **Live updates causing jarring reflow**: if the list re-ranks while someone's actively looking at it, animate row position changes (or at minimum debounce rapid re-renders) rather than having rows jump instantly
- **Clock trust**: compute `totalTimeMs` from server timestamps (`serverTimestamp()` at start and finish), never from the client's local clock, so no one can manipulate their own device time to fake a faster result

## Current implementation notes
- `LeaderboardScreen` subscribes to `progress` and `users` snapshots, joins finished runs to participant names, ranks by `finishedAt - startedAt`, and highlights the signed-in player's row. `startedAt` is set on first geofence arrival; `finishedAt` is set when the seventh game is completed.
- The displayed duration is computed from Firestore timestamps on the client. Since current Firestore rules still permit public progress writes, this is suitable for an app prototype but not a trusted competition leaderboard until writes are server-validated.
