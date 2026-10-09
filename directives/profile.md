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
- **Realtime Sync**: `useUserProfile` hook subscribes to Firestore `users/{uid}`.
- **Optimistic & Offline Persistence**: Selected avatar ID is saved immediately to `localStorage` (`campus_quest_avatar_${uid}`) and synced to Firestore `users/{uid}.avatarId` and Firebase Auth `updateProfile({ photoURL })`.
- **Display Locations**:
  - **Profile Screen**: Large circular avatar with gold rim and an attached pen icon button. Clicking opens `AvatarModal` showing the 5 circular portraits with instant equip selection.
  - **Dashboard Screen**: Displayed directly in the top header alongside the personalized greeting and player registered name.

## Outputs
- Registered name given during registration is displayed cleanly.
- Visual-only 5 avatar picker with checkmark on the equipped selection.
- Live 7-step progress stepper reflecting completed quest checkpoints.
- Exact stats row from design reference: **Best Time**, **Attempts**, and **Rank**.
