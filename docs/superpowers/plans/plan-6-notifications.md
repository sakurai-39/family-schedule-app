# Plan 6: Notifications

Created: 2026-05-08

## Goal

Implement local notifications for scheduled events, due tasks, and undated todo summaries.

## Scope

- Events: notify at previous day 21:00 and same day 07:00.
- Due tasks: notify at previous day 21:00 and due day 07:00.
- Undated tasks: weekly summary every Sunday 20:00.
- No notification when the target undated task count is 0.
- Assignee targeting:
  - Specific user ID: notify only that user.
  - `both` / `whoever`: notify all household members' devices.
- Past notification dates are skipped.
- Notification IDs are stored locally in AsyncStorage and rescheduled when calendar items change.

## Files

- `src/constants/notifications.ts`
- `src/utils/notificationSchedule.ts`
- `src/services/notifications.ts`
- `src/hooks/useNotificationSync.ts`
- `src/__tests__/notifications.test.ts`
- `App.tsx`
- `src/screens/CalendarScreen.tsx`
- `app.config.js`
- `package.json`
- `package-lock.json`

## Libraries

- `expo-notifications@~0.32.17`
  - Used for local notification scheduling and cancellation.
  - Expo SDK 54 compatible version.
- `@react-native-async-storage/async-storage@2.2.0`
  - Used to persist scheduled notification IDs per device.
  - Expo SDK 54 compatible version.

## Security Notes

- This is local notification only. No push token or server-side notification delivery is introduced.
- Notification IDs are non-secret and stored on the device.
- Notification titles may be visible on the lock screen according to OS settings.
- No Firestore Security Rules change is required for Plan 6.
- No API keys or secrets are added.

## Test Strategy

- `notifications.test.ts` verifies:
  - previous day 21:00 and same day 07:00 reminder calculation;
  - past notification skipping;
  - due task behavior;
  - completed / undated item exclusion from item reminders;
  - assignee filtering;
  - weekly todo summary generation and Sunday 20:00 trigger;
  - cancellation of old notification IDs and storage of new IDs;
  - permission denied behavior.
- Existing unit tests, lint, and typecheck must remain green.
- `npm run test:rules` should be confirmed by Ryou's PowerShell or CI because Codex does not have the Firebase CLI available.

## Manual Verification

Because this adds native modules, Android development build must be rebuilt after merge before real-device testing.

Recommended smoke test:

1. Build/install a new Android development build.
2. Start Metro with `npx expo start --dev-client --clear`.
3. Open the app and allow notifications when prompted.
4. Create a scheduled event for tomorrow; confirm no crash and notification permission state is stable.
5. Create an undated todo; confirm the app banner shows `やることリストが1件あります`.
6. Complete the undated todo; confirm the banner disappears after sync.
