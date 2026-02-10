# PO-Verse Native Android App

A fully native Android application for PO-Verse Field Force Management, built with Kotlin + Jetpack Compose.

## Architecture

- **Language**: Kotlin
- **UI**: Jetpack Compose (Material 3)
- **Architecture**: MVVM (Model-View-ViewModel)
- **DI**: Hilt (Dagger)
- **Navigation**: Navigation Compose
- **Backend**: Firebase (Firestore, Realtime Database, Storage, FCM, Analytics)
- **Location**: Google Play Services (FusedLocationProvider)
- **Camera**: CameraX
- **Offline**: Room + DataStore
- **Background**: WorkManager + Foreground Service

## Project Structure

```
android-native/
├── build.gradle.kts              # Root build file
├── settings.gradle.kts           # Module settings
├── gradle.properties             # Build properties
├── gradle/wrapper/               # Gradle wrapper
└── app/
    ├── build.gradle.kts          # App dependencies
    ├── google-services.json      # Firebase config
    ├── proguard-rules.pro        # R8 rules
    └── src/main/
        ├── AndroidManifest.xml
        ├── res/                  # Resources (themes, colors, strings, icons)
        └── java/com/poverse/app/
            ├── POVerseApplication.kt
            ├── data/
            │   ├── model/        # Data classes (User, Attendance, Chat, etc.)
            │   └── repository/   # Firebase repositories
            ├── di/               # Hilt modules
            ├── service/          # FCM & Location services
            └── ui/
                ├── MainActivity.kt
                ├── navigation/   # Screen definitions
                ├── theme/        # Material 3 theme
                ├── viewmodel/    # ViewModels
                └── screens/      # Composable screens
                    ├── LoginScreen.kt
                    ├── DashboardScreen.kt
                    ├── AttendanceScreen.kt
                    ├── TargetsScreen.kt
                    ├── TargetDetailScreen.kt
                    ├── ChatListScreen.kt
                    ├── ChatDetailScreen.kt
                    ├── ExpenseScreen.kt
                    ├── LeaveScreen.kt
                    ├── ProfileScreen.kt
                    ├── NotificationScreen.kt
                    ├── MoreScreen.kt
                    └── admin/    # Admin screens
```

## Setup Instructions

### Prerequisites

1. **Android Studio** Hedgehog (2023.1.1) or newer
2. **JDK 17** (bundled with Android Studio)
3. **Android SDK** API 34 (Android 14)
4. **Google Play Services** installed on device/emulator

### Step 1: Open Project

1. Open Android Studio
2. Select `File > Open`
3. Navigate to `android-native/` directory and open it
4. Wait for Gradle sync to complete (may take 5-10 minutes on first run)

### Step 2: Configure Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Enable **Maps SDK for Android**
3. Create an API key (or use the existing Firebase project key)
4. Replace `YOUR_MAPS_API_KEY` in `AndroidManifest.xml`:
   ```xml
   <meta-data
       android:name="com.google.android.geo.API_KEY"
       android:value="YOUR_ACTUAL_API_KEY" />
   ```

### Step 3: Install Gradle Wrapper

Run in the `android-native/` directory:
```bash
# On Windows
gradlew.bat wrapper --gradle-version=8.4

# On Mac/Linux
./gradlew wrapper --gradle-version=8.4
```

Or manually create `gradle/wrapper/gradle-wrapper.jar` — Android Studio will do this automatically when you sync.

### Step 4: Build the Project

```bash
# Debug build
./gradlew assembleDebug

# Release build (needs signing config)
./gradlew assembleRelease
```

The APK will be at: `app/build/outputs/apk/debug/app-debug.apk`

### Step 5: Run on Device

1. Connect an Android device via USB (with Developer Options & USB Debugging enabled)
2. Or launch an emulator (API 26+ with Google Play Services)
3. Click the green **Run** button in Android Studio
4. Select your device/emulator

## Features

### Agent (Field Staff)
- **Login** with username/password (custom auth with bcrypt)
- **Dashboard** with attendance status, goals, tasks, target summary
- **Attendance** check-in/out with selfie capture and GPS location
- **Targets** view assigned targets, start/complete/skip visits with lead status tracking
- **Chat** real-time messaging with read receipts, typing indicators, reactions
- **Expenses** submit expenses with category, amount, receipt upload
- **Leave** apply for leave with balance tracking
- **Profile** view/edit personal information
- **Notifications** push + in-app notifications via FCM
- **Background Location Tracking** via foreground service

### Admin
- **Admin Dashboard** overview with key metrics
- **Manage Targets** CRUD operations on locations/clients
- **Attendance Reports** daily attendance overview
- **Expense Approvals** review and approve/reject expenses
- **Leave Approvals** review and approve/reject leave requests
- **Live Map** real-time agent location tracking (placeholder - add Google Maps)
- **CRM** customer relationship management (placeholder)

## Firebase Configuration

This app connects to the existing PO-Verse Firebase project:
- **Project ID**: `po-verse`
- **RTDB URL**: `https://po-verse-default-rtdb.asia-southeast1.firebasedatabase.app`
- **Firestore**: Auto-detected from `google-services.json`
- **Storage**: `po-verse.firebasestorage.app`
- **FCM**: Configured via `google-services.json`

The `google-services.json` is already included in `app/`.

## Authentication

This app uses a **custom authentication system** (NOT Firebase Auth SDK):
1. Users are stored in Firebase RTDB under `users/`
2. Passwords are hashed with bcrypt
3. Sessions are managed via custom tokens stored in RTDB + local DataStore
4. Session validation occurs on each app launch

## Key Dependencies

| Library | Version | Purpose |
|---------|---------|---------|
| Kotlin | 1.9.21 | Language |
| Compose BOM | 2024.01.00 | UI Framework |
| Hilt | 2.50 | Dependency Injection |
| Firebase BOM | 32.7.1 | Backend |
| Navigation Compose | 2.7.6 | Navigation |
| CameraX | 1.3.1 | Camera |
| Room | 2.6.1 | Local Database |
| WorkManager | 2.9.0 | Background Work |
| Coil | 2.5.0 | Image Loading |
| DataStore | 1.0.0 | Preferences |

## Generating a Signed APK

1. Generate a keystore:
   ```bash
   keytool -genkey -v -keystore poverse-release.keystore -alias poverse -keyalg RSA -keysize 2048 -validity 10000
   ```

2. Add to `app/build.gradle.kts`:
   ```kotlin
   android {
       signingConfigs {
           create("release") {
               storeFile = file("../poverse-release.keystore")
               storePassword = "your-password"
               keyAlias = "poverse"
               keyPassword = "your-key-password"
           }
       }
       buildTypes {
           release {
               signingConfig = signingConfigs.getByName("release")
           }
       }
   }
   ```

3. Build: `./gradlew assembleRelease`

## TODO / Future Enhancements

- [ ] Google Maps integration for Live Map screen
- [ ] CameraX selfie capture integration
- [ ] Offline mode with Room caching
- [ ] WebRTC voice/video calls
- [ ] Deep linking for notification taps
- [ ] Widget for quick attendance check-in
- [ ] Biometric authentication
- [ ] Dark theme toggle
- [ ] Multi-language support
