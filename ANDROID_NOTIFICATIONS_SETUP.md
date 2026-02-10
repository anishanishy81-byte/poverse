# PO-VERSE Android Push Notifications & Background Location Setup Guide

This guide explains how to complete the setup for push notifications and background location tracking on Android.

## Prerequisites

1. Firebase project set up with FCM enabled
2. Google Cloud Console project
3. Android Studio installed

---

## Step 1: Download google-services.json

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (po-verse)
3. Go to **Project Settings** (gear icon)
4. Under **Your apps**, find or add an Android app with package name: `com.poverse.app`
5. Download the `google-services.json` file
6. Place it in: `android/app/google-services.json`

---

## Step 2: Deploy Firebase Functions

The push notification system uses Firebase Cloud Functions to send FCM messages.

```bash
# Navigate to functions directory
cd functions

# Install dependencies
npm install

# Deploy functions
firebase deploy --only functions
```

**Important Functions deployed:**
- `sendPushNotification` - HTTP endpoint for sending push notifications
- `onNotificationCreated` - Automatically sends push when notifications are created
- `onNewChatMessage` - Sends push notifications for new chat messages

---

## Step 3: Build the Android App

```bash
# From the project root, build the Next.js app for Android
npm run build:android

# Open Android Studio
npm run open:android
```

---

## Step 4: Configure Permissions on First Launch

When users first open the app, they'll be prompted for:

1. **Location Permission** - Required for GPS tracking
2. **Background Location Permission** - Required for tracking when app is closed
3. **Notification Permission** - Required for push notifications

### Background Location Permission (Android 11+)

On Android 11 and above, users must:
1. First grant "While using the app" location permission
2. Then go to Settings to enable "Allow all the time" for background tracking

The app will guide users through this process.

---

## Step 5: Test Push Notifications

### Test from Firebase Console:
1. Go to Firebase Console → Cloud Messaging
2. Click "Send your first message"
3. Enter a test message
4. Target your app (com.poverse.app)
5. Send the notification

### Test from the app:
1. Login as an admin
2. Create a target assignment for a user
3. The user should receive a push notification

---

## Notification Channels

The app creates these notification channels on Android:

| Channel ID | Name | Priority | Purpose |
|------------|------|----------|---------|
| `poverse_default` | General Notifications | HIGH | General alerts |
| `poverse_chat` | Chat Messages | HIGH | New messages |
| `poverse_targets` | Target Updates | HIGH | Target assignments |
| `poverse_attendance` | Attendance | HIGH | Check-in/out reminders |
| `poverse_alerts` | Urgent Alerts | MAX | Critical notifications |
| `poverse_location` | Location Tracking | DEFAULT | Background tracking status |

Users can customize notification settings per channel in Android Settings.

---

## Background Location Tracking

The background location tracking uses a foreground service with a persistent notification. This shows users that location tracking is active and keeps the app running even when closed.

### How it works:
1. When user logs in, background tracking starts automatically
2. Location updates are sent every 30 seconds
3. A notification shows "PO-VERSE Location Active" in the status bar
4. Even if the app is closed, tracking continues via the foreground service
5. After device reboot, the app restarts to resume tracking

### Battery Optimization:
- Add PO-VERSE to battery optimization exceptions for best reliability
- On Android 12+, the app uses the new exact alarm permissions for reliable updates

---

## Troubleshooting

### Push notifications not working:
1. Verify `google-services.json` is in `android/app/`
2. Check Firebase Console for the app registration
3. Ensure notification permissions are granted
4. Check that FCM tokens are being saved in Firebase RTDB under `/fcmTokens/{companyId}/{userId}/`
5. Deploy Firebase Functions and check function logs

### Background location stops:
1. Disable battery optimization for PO-VERSE
2. Check that "Allow all the time" location is enabled
3. Some manufacturers (Xiaomi, Huawei, etc.) have additional settings - enable "Auto Start" for the app

### App not restarting after reboot:
1. Check that RECEIVE_BOOT_COMPLETED permission is granted
2. Some devices require manual "Auto Start" permission in settings

---

## Files Modified

| File | Purpose |
|------|---------|
| `android/app/src/main/AndroidManifest.xml` | Permissions, services, receivers |
| `android/app/src/main/java/.../services/POVerseMessagingService.java` | FCM message handling |
| `android/app/src/main/java/.../receivers/BootReceiver.java` | Auto-start after reboot |
| `android/app/build.gradle` | Firebase dependencies |
| `android/app/src/main/res/values/colors.xml` | Notification colors |
| `src/hooks/useNativePushNotifications.ts` | Native push notification hook |
| `src/components/NotificationProvider.tsx` | Notification initialization |
| `src/components/BackgroundTrackingProvider.tsx` | Background location tracking |
| `functions/index.js` | Firebase Functions for FCM |
| `capacitor.config.ts` | Plugin configuration |

---

## Environment Variables

Make sure these are set in your `.env.local`:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your_project.firebaseio.com

# For web push notifications
NEXT_PUBLIC_FIREBASE_VAPID_KEY=your_vapid_key

# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_maps_api_key
```

---

## Support

For issues or questions, contact the development team.
