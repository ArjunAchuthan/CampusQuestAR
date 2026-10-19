# Directive: Admin Registration Panel

## Goal
Allow event leads to create participant accounts without opening self-registration to players. This is a separate, hidden surface from the player-facing app — not a screen in the bottom nav, and not reachable without admin credentials.

## Critical constraint
**Do not use the client-side `createUserWithEmailAndPassword` for this.** It automatically signs the current browser in as the newly created user, which would log the admin out every time they register someone. User creation must happen through the **Firebase Admin SDK**, server-side, via a Cloud Function — this leaves the admin's own session untouched.

## Inputs
- A new, unlisted route (e.g. `/admin/register`) — not linked from `AppShell`, `BottomNav`, or anywhere in the player-facing screens
- Firebase Cloud Functions (Node runtime) with the Admin SDK
- An `admins` collection in Firestore (or custom claims) identifying which UIDs are allowed to access this route and call the function

## Tools
- A callable Cloud Function, e.g. `createParticipant(email, password, displayName)`:
  - First checks `context.auth` exists and the caller's UID is in `admins` (or has the `admin` custom claim) — reject with a permission error otherwise
  - Uses `admin.auth().createUser({ email, password, displayName })`
  - Immediately also creates the matching `progress/{sixDigitId}` doc (`currentLocationIndex: 0`, `completedGameIds: []`, `startedAt: null` — set on first real login/geofence unlock, not at account creation); keep the Firebase Auth UID in the document's `uid` field for joins
  - Returns success/failure to the caller; does not return the password
- A simple admin-only form component: name, email, temporary password (or auto-generate one) fields, a submit button, a list/table of already-registered participants for the admin's reference

## Outputs
- Admin can log in (same `LoginScreen` component is fine, reused — an admin is just a user whose UID is in `admins`) and be redirected to `/admin/register` instead of the normal dashboard if their UID has admin rights
- Each successful registration creates both the Auth account and the numeric progress doc in one step, so there's no gap where a user exists in Auth but not in Firestore
- Each participant profile is stored at `users/{sixDigitId}` and includes the Firebase Auth UID in its `uid` field. Store progress at `progress/{sixDigitId}` and retain the Auth UID in its `uid` field for internal joins. Show the six-digit document ID in registration success details and rosters. The registration desk migrates every legacy `users/{uid}` document (including non-participant profiles) to a unique numeric document ID as its roster loads; profile lookups also migrate individual legacy documents. The player's progress lookup moves legacy `progress/{uid}` data to `progress/{sixDigitId}` on first access and removes the old document after migration.
- Registering a candidate does **not** change the admin's own logged-in session at any point

## Edge cases
- **Access control, not obscurity**: the route being unlinked in the UI is not real protection — gate the route itself (redirect non-admins away) and gate backend operations by checking `admins/{uid}` or `admins/{email}` in Firestore rules
- **Session Isolation**: implemented via an isolated secondary Firebase App instance (`getSecondaryAuth()`), which registers candidate accounts client-side without mutating or terminating the active admin session
- **PIN-free operation**: the panel uses direct authenticated admin check without requiring a separate PIN prompt for streamlined testing and production usage
- **Duplicate email**: `createUserWithEmailAndPassword` throws `auth/email-already-in-use` — surfaced with a clear inline message
- **Temporary passwords**: auto-generated strong passwords can be copied with 1-click "Copy Credentials"
- **First admin account**: bootstrapped using `scripts/make-admin.mjs` (adds admin UID or email to `admins` collection in Firestore)
