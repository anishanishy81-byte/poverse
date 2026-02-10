# PO-VERSE Mobile App - Setup & Download Guide

## Overview

PO-VERSE now includes a mobile app for Android devices that mirrors all the functionality of the web application. The mobile app is built using Capacitor and can be downloaded directly from the website.

---

## 📱 Mobile App Features

### Core Functionality
- ✅ Real-time agent location tracking
- ✅ GPS-based attendance check-in/check-out with selfie verification
- ✅ Target/lead management and visit tracking
- ✅ Offline-first functionality with automatic sync
- ✅ Leave management and approval workflows
- ✅ Expense tracking with receipt attachment
- ✅ Document management and sharing
- ✅ Push notifications via Firebase Cloud Messaging
- ✅ Team chat and messaging
- ✅ Daily activity reports and analytics
- ✅ Route optimization and navigation

### Technical Stack
- **Framework**: Capacitor 8.x (Android 7.0+)
- **Web Runtime**: Next.js 15 with React 19
- **Native Plugins**: Geolocation, Camera, Keyboard
- **Database**: Firebase (Realtime, Firestore, Storage)
- **Notifications**: Firebase Cloud Messaging (FCM)

---

## 🔽 Download Options

### Option 1: From Landing Page (Home)
1. Visit **http://localhost:3000**
2. Click the **"Download App"** button in the top navigation bar
3. The APK file will start downloading automatically

### Option 2: From Login Page
1. Visit **http://localhost:3000/login**
2. Click the **"Download Mobile App"** button below the sign-in form
3. The APK file will start downloading automatically

### Option 3: Direct Download
```
http://localhost:3000/downloads/po-verse.apk
```

---

## 📲 Installation Instructions

### Prerequisites
- Android device running Android 7.0 or higher
- Minimum 100MB free storage space
- Internet connection for initial setup and sync

### Installation Steps

1. **Download the APK**
   - Use one of the download methods above
   - The file will be saved as `po-verse.apk`

2. **Enable Installation from Unknown Sources** (if not already enabled)
   - Go to **Settings** → **Security** or **Privacy**
   - Find "Unknown Sources" or "Install Unknown Apps"
   - Toggle to **Enable**

3. **Install the App**
   - Open your file manager
   - Navigate to Downloads folder
   - Tap on `po-verse.apk`
   - Tap **Install**
   - Wait for installation to complete

4. **Grant Permissions**
   - Camera (for selfie verification)
   - Location/GPS (for tracking)
   - Storage (for document management)
   - Microphone (optional, for voice notes)

5. **Launch the App**
   - Tap **Open** after installation
   - Or find "PO-VERSE" in your app drawer
   - Sign in with your credentials

---

## 🔐 Authentication

Same credentials as the web app:
- **Username**: Your assigned username
- **Password**: Your password

First-time setup will sync your company data and offline cache.

---

## 📍 Location Tracking

The app requires GPS access for:
- Real-time agent location tracking
- Attendance check-in/check-out verification
- Route optimization
- Target/visit location confirmation

**How to Enable GPS:**
1. Go to **Settings** → **Location**
2. Toggle **Location Services** ON
3. Set to **High Accuracy** mode (if available)

---

## 📷 Selfie Verification

For attendance check-in, the app uses the device camera:
1. Tap **Check In** on the dashboard
2. Allow camera access
3. Take a selfie (must be clear)
4. Confirm location
5. Submit check-in

---

## 🔌 Offline Mode

The app automatically works offline:
- All actions are queued locally
- Sync happens automatically when online
- No data is lost

**To manually sync:**
1. Ensure you have internet connection
2. The app will auto-sync in the background
3. Check the status indicator in the header

---

## 🔔 Push Notifications

Enable notifications for:
- Target assignments
- Leave approval/rejection
- Attendance reminders
- Admin announcements
- Performance alerts

**To enable notifications:**
1. Go to **App Settings** → **Notifications**
2. Toggle notification types as needed
3. Check your phone's notification settings

---

## 📊 Usage Tips

### Attendance
- Check in at the start of your day
- Check out at the end
- Location and selfie are verified
- Late/early departure is tracked automatically

### Targets
- View assigned targets on the map
- Start visit when you arrive
- Complete visit with outcomes and notes
- Take photos if needed

### Reports
- Daily report shows all activities
- Time breakdown: work, travel, break
- Submit daily summary to admin

### Chat
- Direct messaging with team members
- Share documents in chat
- See online/offline status of colleagues

---

## 🆘 Troubleshooting

### App Won't Install
**Problem**: Installation fails or "Parse error"
**Solution**:
- Ensure you have enough storage (100MB+ free)
- Delete and re-download the APK
- Restart your device
- Try an alternate download source

### Location Not Working
**Problem**: GPS not updating
**Solution**:
- Enable Location Services in Settings
- Set to "High Accuracy" mode
- Close and reopen the app
- Check if location permission is granted
- Ensure you're outdoors (GPS needs sky view)

### Can't Log In
**Problem**: Login failed
**Solution**:
- Check your internet connection
- Verify credentials with admin
- Clear app cache: Settings → Apps → PO-VERSE → Storage → Clear Cache
- Reinstall the app if issue persists

### Offline Sync Issues
**Problem**: Data not syncing
**Solution**:
- Ensure internet connection is stable
- Force sync: Pull down from top of screen
- Check battery optimization isn't blocking app
- Contact admin if data is lost

### Camera Not Working
**Problem**: Can't take selfie
**Solution**:
- Ensure camera permission is granted
- Check app permissions in Settings
- Restart device
- Try taking a photo in default camera app first
- Reinstall app if issue persists

---

## 🛡️ Security & Privacy

- All data is encrypted in transit (HTTPS/TLS)
- Location data is stored securely
- Role-based access control applies to mobile app
- Session timeout for security
- Automatic logout after inactivity

---

## ⚙️ System Requirements

| Requirement | Details |
|------------|---------|
| **OS** | Android 7.0 (API 24) or higher |
| **Memory** | Minimum 2GB RAM (4GB+ recommended) |
| **Storage** | 100MB free space |
| **Network** | WiFi or Mobile data |
| **GPS** | Built-in GPS (for most phones) |
| **Camera** | Rear camera (for basic use) |

---

## 📈 Performance

- App size: ~120MB
- Battery usage: ~5-10% per 8-hour day (with continuous GPS)
- Data usage: ~50-100MB per month
- Offline cache: ~10MB

**To optimize battery:**
1. Reduce GPS polling frequency
2. Disable high-precision mode
3. Turn off unnecessary notifications
4. Close background apps

---

## 🔄 Updates

New app versions are released regularly:
- Bug fixes
- New features
- Performance improvements
- Security patches

**To update:**
1. Download the new APK
2. Install over existing app (same package name)
3. No data loss - all local data is preserved

---

## 📞 Support & Feedback

**Having issues?**
- Contact your company admin first
- Email: support@po-verse.com
- Check the FAQ at: https://po-verse.com/help

**Feature requests:**
- Email: feedback@po-verse.com
- In-app feedback form (coming soon)

---

## 📄 Version Information

- **App Version**: 0.1.0
- **Build Date**: February 4, 2026
- **Minimum Next.js**: 15.x
- **Capacitor Version**: 8.x
- **React Version**: 19.x

---

## 🎯 Quick Start Checklist

- [ ] Download APK from website
- [ ] Enable Unknown Sources in Settings
- [ ] Install the app
- [ ] Grant all necessary permissions
- [ ] Sign in with your credentials
- [ ] Enable location services
- [ ] Test offline functionality
- [ ] Complete your first check-in
- [ ] Explore dashboard features
- [ ] Enable push notifications

---

## License

PO-VERSE Mobile App © 2026. All rights reserved.

---

**Last Updated**: February 4, 2026  
**Status**: Ready for Download & Testing

