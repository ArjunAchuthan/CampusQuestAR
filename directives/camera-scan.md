# Directive: Camera / AR Scan

## Goal
Replace `CameraScreen`'s placeholder gradient background with a live, full-bleed camera feed, matching the existing `position: fixed; inset: 0` structure exactly. The scan reticle, instruction pill, and glass nav bar already overlay correctly on top of the placeholder — they should continue to do so once real video replaces it, with no layout changes.

## Inputs
- `src/components/screens/CameraScreen.tsx` — currently a styled gradient div at `zIndex: 10`
- `navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })` for the rear camera

## Tools
- A `useCamera()` hook that requests the stream on mount, attaches it to a `<video>` ref, and cleans up (`stream.getTracks().forEach(t => t.stop())`) on unmount so the camera indicator light turns off when leaving the tab
- `<video autoPlay playsInline muted>` — `playsInline` is required or iOS Safari forces fullscreen native playback, breaking the overlay

## Outputs
- `<video>` element with `object-fit: cover`, filling the same `position: fixed; inset: 0` container the gradient currently occupies, sitting behind the reticle/instruction pill/nav bar at the same z-index the gradient used
- A permission-denied state: if `getUserMedia` rejects, show a clear message with a way to retry (browsers won't re-prompt automatically after a denial — the user has to change the site permission manually, so say so)
- A loading state between mount and the stream becoming available, so the screen isn't a flash of black

## Edge cases
- **HTTPS required.** `getUserMedia` will silently fail (or throw `NotAllowedError`) over plain HTTP, including during local dev on a phone — use a tool like `mkcert` or `ngrok` for local testing on-device, or test on desktop over `localhost` (which is exempt from the HTTPS requirement)
- **World-tracked AR availability.** World-tracked WebXR is currently disabled for the camera game. Keep the live `getUserMedia` video active and render the Three.js beacon and puzzle as a transparent screen-space overlay on top of it. Do not open an immersive session or trigger browser fullscreen during this camera-overlay mode.
- **Permission denied** → `NotAllowedError`; show the retry state above
- **No camera available** (rare, but possible on some desktops) → `NotFoundError`; show a distinct message rather than the generic denied state
- **Tab switching**: stop the camera stream when navigating away from the Camera tab (battery/privacy), restart it when navigating back — don't keep it running in the background across all 5 tabs
- iOS Safari specifically requires the `playsInline` attribute and a user gesture may be required to start playback on some versions — test on an actual iPhone before assuming desktop Chrome behavior generalizes

## Current implementation notes
- Reaching the current geofence enables the Three.js beacon and puzzle in a fixed screen-space overlay above the live camera feed. The temporary `phone-ar-test` channel uses the same GPS gate as production so geolocation testing reflects actual checkpoint behavior. Tap the beacon to start the current mini-game. This temporary mode intentionally skips real-world surface detection and WebXR fullscreen while the camera AR flow is being stabilized.
- `/games` provides the same camera-style beacon and tasks without requiring camera or location permission, for desktop testing.
