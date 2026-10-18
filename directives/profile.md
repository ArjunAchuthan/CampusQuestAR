# Directive: Profile & Avatar Customization

## Goal
Display the participant's profile with their registered display name, email, quest progress, and a clean, visual avatar picker with 5 circular character portraits without text descriptions.

## Avatar Options
5 high-resolution cropped character portraits stored in `/avatars/`:
1. `/avatars/avatar-1.png`
2. `/avatars/avatar-2.png`
3. `/avatars/avatar-3.png`
4. `/avatars/avatar-4.png`
5. `/avatars/avatar-5.png`

## Architecture & State
- **Realtime Sync**: `useUserProfile` resolves the user's numeric `users/{sixDigitId}` document through its Firebase Auth `uid` field, then subscribes to that document.
- **Optimistic & Offline Persistence**: Selected avatar ID is saved immediately to `localStorage` (`campus_quest_avatar_${uid}`) and synced to the resolved numeric user document's `avatarId` field and Firebase Auth `updateProfile({ photoURL })`.
- **Display Locations**:
  - **Profile Screen**: Large circular avatar with gold rim and an attached pen icon button. Clicking opens `AvatarModal` showing the 5 circular portraits with instant equip selection.
  - **Dashboard Screen**: Displayed directly in the top header alongside the personalized greeting and player registered name.
- **Run stats**: The Profile screen shows the signed-in participant's completed-run duration and live leaderboard rank from the shared leaderboard data. Do not estimate a rank from checkpoint progress; participants without a completed run show `—`.
- **Sign out**: Keep the sign-out action in the shared top-right app header so it remains available on every signed-in screen, including the admin registration screen.

## Outputs
- Registered name given during registration is displayed cleanly.
- Visual-only 5 avatar picker with checkmark on the equipped selection.
- Live 7-step progress stepper reflecting completed quest checkpoints.
- Calculated stats row: **Time** (finishedAt minus startedAt) and **Rank** (position in the same live ranking as the Leaderboard screen). Do not show an Attempts stat.
- The seven-step progress display marks each checkpoint from `completedGameIds`, including checkpoint seven after the final game is saved.
