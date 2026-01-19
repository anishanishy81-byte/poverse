# Building PO-VERSE Android App

## Quick Start (Development Mode)

The app is pre-configured to connect to `http://192.168.0.6:3000`. This allows hot-reloading during development.

### Step 1: Start the Dev Server
```bash
npm run dev
```

### Step 2: Download & Install APK
1. On your Android phone, open Chrome and go to your landing page
2. Click "Download App" button to download `poverse.apk`
3. Install the APK (enable "Install from Unknown Sources" if prompted)
4. Make sure your phone is on the same WiFi network as your computer

---

## Building a New APK

### Prerequisites

1. **Install Android Studio** from https://developer.android.com/studio
2. **Install JDK 17+** from https://adoptium.net/temurin/releases/
3. During Android Studio installation, include:
   - Android SDK
   - Android SDK Platform (API 34)
   - Android Virtual Device

### Method 1: Using Android Studio (Recommended)

1. **Sync Capacitor** (run from project root):
   ```bash
   npx cap sync android
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

5. **Copy APK to public folder**:
   ```powershell
   copy android\app\build\outputs\apk\debug\app-debug.apk public\poverse.apk
   ```

### Method 2: Using Command Line

1. **Sync and build**:
   ```bash
   npx cap sync android
   cd android
   .\gradlew assembleDebug
   ```

2. **Copy the APK**:
   ```bash
   copy app\build\outputs\apk\debug\app-debug.apk ..\public\poverse.apk
   ```

---

## Configuration

### Changing Server URL

Edit `capacitor.config.ts`:
```typescript
const SERVER_URL = 'http://YOUR_IP:3000';  // For development
// const SERVER_URL = 'https://poverse.com';  // For production
```

Then sync:
```bash
npx cap sync android
```

### For Production Deployment

1. Update `SERVER_URL` to your deployed domain
2. Build a **Release APK** (signed) in Android Studio:
   - Build → Generate Signed Bundle / APK
   - Choose APK
   - Create or use existing keystore
3. Upload to Google Play Store or host for direct download

---

## Troubleshooting

### App shows blank screen
- Ensure the dev server is running (`npm run dev`)
- Check your phone is on the same WiFi network
- Verify the IP address in `capacitor.config.ts` matches your computer's IP

### Location not working
- Grant location permission when prompted
- Check app permissions in Android Settings

### Can't install APK
- Enable "Install from Unknown Sources" in Android Settings
- On Android 8+: Settings → Apps → Chrome → Install unknown apps → Allow

You can also use Android Studio's built-in emulator or connect your phone via USB to test directly.

## Troubleshooting

### "App not installed" error
- Make sure you have enough storage space
- Uninstall any previous version of the app
- Enable "Install from Unknown Sources"

### Can't connect to server
- Ensure the Next.js server is running
- Ensure your phone is on the same WiFi network
- Check the IP address in capacitor.config.ts matches your computer's IP

### White screen
- Check that the server URL is correct
- Check your firewall allows connections on port 3000
