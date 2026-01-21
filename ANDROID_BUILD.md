# Building PO-VERSE Android App

This app runs as a **standalone offline-capable** application. The web assets are bundled directly into the APK.

---

## Prerequisites

1. **Install Android Studio** from https://developer.android.com/studio
2. **Install JDK 17+** from https://adoptium.net/temurin/releases/
3. During Android Studio installation, include:
   - Android SDK
   - Android SDK Platform (API 34)
   - Android Virtual Device

---

## Building the APK

### Method 1: Using Android Studio (Recommended)

1. **Build the web app and sync Capacitor** (run from project root):
   ```bash
   npm run build:android
   ```

2. **Open the Android project in Android Studio**:
   ```bash
   npx cap open android
   ```
   Or manually: File → Open → Select `PO-VERSE/android` folder

3. **Wait for Gradle sync** to complete (first time may take 5-10 minutes)

4. **Build the APK**:
   - Go to `Build` menu → `Build Bundle(s) / APK(s)` → `Build APK(s)`
   - Wait for the build to complete
   - Click "locate" in the notification to find the APK

5. **APK Location**:
   ```
   android/app/build/outputs/apk/debug/app-debug.apk
   ```

### Method 2: Using Command Line

1. **Build and sync**:
   ```bash
   npm run build:android
   cd android
   .\gradlew assembleDebug
   ```

2. **Find the APK**:
   ```
   android/app/build/outputs/apk/debug/app-debug.apk
   ```

---

## Installing on Android Device

1. Transfer the APK to your phone (USB, email, cloud storage, etc.)
2. Open the APK file on your phone
3. Enable "Install from Unknown Sources" if prompted
4. Install and open the app

---

## Troubleshooting

### "App not installed" error
- Make sure you have enough storage space
- Uninstall any previous version of the app
- Enable "Install from Unknown Sources"

### Location not working
- Grant location permission when prompted
- Check app permissions in Android Settings

### Can't install APK
- Enable "Install from Unknown Sources" in Android Settings
- On Android 8+: Settings → Apps → Chrome → Install unknown apps → Allow

---

## Building a Release APK (For Distribution)

1. In Android Studio: Build → Generate Signed Bundle / APK
2. Choose APK
3. Create or use existing keystore
4. Build the release APK
