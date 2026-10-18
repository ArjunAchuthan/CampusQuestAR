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
- The "focus mode" concept from `camera-scan.md`: once an AR element is tapped, it stays at a stable screen-space position while the puzzle is played
- A checkpoint index that selects one of the seven game types in `src/components/games/CheckpointGame.tsx`
- Touch/pointer input for raycasting onto 3D task objects, including drag-and-drop for matching tasks

## Tools
- `CheckpointGame.tsx` owns checkpoint puzzle state, instructions, and the `onComplete` callback; `ARScene3D.tsx` renders the beacon and all game pieces as Three.js/WebGL meshes
- `ARScene3D` keeps one renderer/canvas mounted and swaps puzzle scene geometry when state changes. Use pointer raycasts for object actions; keep drag interactions working on both touch and mouse input
- The `/games` showcase runs each checkpoint without GPS and uses a no-op completion callback so puzzle paths can be tested without changing quest progress

## Outputs
- On task completion, call `onComplete` to update quest progress and unlock the location clue
- Game assignments and answers are currently mapped in client code for the seven-checkpoint prototype. Moving assignment and validation into Firestore or a trusted backend is a future production hardening step, not a capability the current preview provides

## Edge cases
- **Partial progress isn't saved mid-game** unless you explicitly want retry-from-scratch behavior — decide this once and apply it consistently across game types (recommended: no partial credit, keeps it simple and fair for a timed leaderboard)
- **Preventing skip/cheat**: the "solution" data (correct wire pairings, etc.) should not be inspectable in client-side state before the puzzle is solved — keep it in Firestore, not in a hardcoded client constant, and validate completion server-side if you want to be strict (Cloud Function or security-rule-gated write) rather than trusting a client-reported "I finished" flag
- **Different screen sizes**: since this plays inside the camera view, touch targets need to stay large and well-spaced across small and large phones — test on the smallest target device, not just your dev phone
- **Task difficulty consistency**: keep task duration roughly comparable across the 7 locations, since total completion time is the leaderboard metric — a much harder task at one location skews rankings independent of how "fast" someone actually is

## Current implementation notes
- `src/components/games/CheckpointGame.tsx` maps the seven ordered checkpoints to an AR beacon and seven distinct tasks: reroute four elbow coolant pipes, reconnect four colored leads, orient three beam mirrors, tag moving drones in sequence, load four reactor cores into shuffled docks, repeat a six-pulse memory pattern across four nodes, and drag and release a glowing orb through a sequence of moving hoops.
- The beacon and puzzle pieces are colorful Three.js meshes rendered over the camera feed, with no enclosing game card. The discovery beacon is hidden after position lock so it does not obscure the active task; decorative octagonal pedestals beneath the mirror prisms, pulse nodes, and launch rig are omitted so the playable 3D elements appear to float. Raycasts on the 3D objects drive puzzle actions. Wire leads and reactor cores support pointer drag-and-drop as well as select-then-target taps. Puzzle state updates replace the scene meshes while retaining the WebGL renderer and canvas; this avoids tearing down the camera overlay after each interaction.
- The beacon appears at a stable screen-space coordinate after geofence arrival and stops floating when tapped. This is camera compositing with a fixed screen anchor, not true world tracking or SLAM.
- The Camera screen only mounts the active checkpoint experience while the current geofence is reached. Success writes the location ID to `completedGameIds`, advances `currentLocationIndex`, and stamps `finishedAt` on checkpoint seven. `startedAt` is stamped on first geofence arrival.
- The current game answers are bundled in the client for a playable prototype. This does not meet the server-side solution/validation requirement above; before a competitive event, move per-location game configs and validation to a trusted backend and tighten Firestore progress rules. The current Firestore rules allow public progress writes, so client completion must not be treated as cheat-resistant.
- `/games` is a standalone, GPS-free preview route that lists and runs each mini-game locally without writing quest progress. Use it to inspect and playtest the games away from campus.
- The coolant reroute task uses four color-coded 3D elbow joints arranged as a 2x2 zigzag; rotating valve handles, flowing coolant pulses, and outlet glow make the route state visible. The joints require 7 total quarter-turn taps to reach their route orientations. Wires has four shuffled matching routes, 3D loose cable coils and plug ends, plus animated current pulses after each connection. Mirror routing uses three rotating triangular prisms with 45-degree steps (5 taps total) and an animated beam that visibly spills when a mirror is misaligned. Drone interception uses four distinct saucer ships in separated flight lanes; tag cyan, gold, then coral, while the red decoy repeatedly swoops toward the active target and resets the sequence if touched. Cargo sorting moves four differently shaped, glowing reactor cores from a raised conveyor into shuffled color docks; the selected core follows pointer/touch drag and its tractor arc marks the destination. Docked cores keep their original colors, with a small green lock marker for success. The sentinel memory challenge gives players five seconds to read its instructions before previewing a six-pulse sequence across four floating 3D nodes; players repeat it, and a mistake replays the sequence. Orb toss asks players to drag upward toward the required moving hoop lane and release with controlled power; wrong lanes and weak or overpowered pulls reset its three-throw sequence. Cargo requires four core transfers.
- Orb toss uses three animated, colored 3D hoops, an interactive faceted orb, and a moving projectile after each release without a trajectory guide line. Successful tosses pass through the selected hoop; short, overpowered, and wrong-ring throws visibly fall short, sail over, or veer wide. Keep the required hoop order in sync with the gesture validation in `CheckpointGame.tsx`; the orb must be dragged and released on the Three.js canvas, not through a DOM overlay.
- The game mesh anchors when the player taps the beacon, but placement is a fixed camera/screen-space overlay. It does not use WebXR hit testing, SLAM, or persistent world coordinates, so the object will not remain registered to the same physical spot if the camera moves. True location-based anchoring needs a WebXR/native AR tracking implementation and device support.
- The live `/games` showcase route is the GPS-free interaction test surface. Verify beacon lock, each puzzle's correct completion path, wrong-target behavior where applicable, and canvas stability after repeated touches. Keep the memory sequence identical in `CheckpointGame.tsx` and `ARScene3D.tsx`.
- When the active target changes, `useGeofence` clears the previous location's in-range state before accepting a new fix. This prevents the prior checkpoint's GPS match from briefly activating the next puzzle.
