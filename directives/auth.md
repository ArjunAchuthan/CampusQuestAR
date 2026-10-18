# Directive: Authentication

## Goal
Wire `LoginScreen` to real email/password auth. There is no self-registration flow, anywhere, ever — accounts are created by event leads via the Firebase console or an admin script, not by participants. Once logged in, the user stays signed in across sessions until they explicitly sign out (the `ProfileScreen` already has a sign-out button wired to a stub `onLogout`).

## Inputs
- `src/components/screens/LoginScreen.tsx` — has `email`/`password` inputs and a `Sign In` button already styled; currently calls a stub `onLogin`
- Firebase project with **Email/Password** sign-in method enabled in the Auth console
- `.env` — `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, etc.

## Tools
- `firebase` SDK (`signInWithEmailAndPassword`, `signOut`, `onAuthStateChanged`)
- A `src/lib/firebase.ts` module exporting the initialized `auth` instance
- A small `useAuth()` hook (or a Zustand slice) exposing `{ user, loading, signIn, signOut }`

## Outputs
- Replace `onLogin={() => setLoggedIn(true)}` in `App.tsx` with a real call to `signIn(email, password)`
- `App.tsx`'s `loggedIn` check becomes driven by `onAuthStateChanged`, not local component state, so a refresh doesn't log the user out
- Wire `ProfileScreen`'s `onLogout` to the real `signOut()`
- Show the existing inline error state (or add one) on failed login — don't invent a new visual style, match `glass-input`'s existing focus/error treatment
- On a participant's first authenticated app session, show a short simulated bug-fix console; it recovers a clickable `archive_final_FINAL_v2.txt` folder/file. Only opening that recovered item reveals the Lost Legacy note. Store `prologueSeenAt` on the participant profile found by its `uid` field (the profile document ID is six digits) so this introduction is one-time per account; use local storage only as a fallback cache when Firestore is unavailable.
- The recovered note uses a typewriter reveal and omits the closing narration about grabbing friends/starting the hunt. `Begin the hunt`, the close control, and double-tap all take the participant directly to checkpoint one's clue. The skip action reveals the remaining text without leaving the note.

## Edge cases
- Wrong credentials → show a clear inline error, do not reveal whether the email exists (standard practice)
- Network failure during sign-in → distinguish from wrong-credentials in the error copy
- No account exists for this email at all → same generic "check your email and password" message as wrong password, since accounts are admin-issued and there's no recovery flow to point them to yet
- Firebase auth persistence: default is `local` (survives browser restarts) — confirm this is the desired behavior for a multi-hour campus event where people may lock their phones
