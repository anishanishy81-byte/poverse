# Firebase Setup Guide for PO-VERSE

## Step 1: Update Firestore Security Rules

Go to your Firebase Console:
1. Open https://console.firebase.google.com
2. Select your "po-verse" project
3. Go to **Firestore Database** → **Rules** tab
4. Replace the existing rules with:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // Allow all access for development
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

5. Click **Publish**

> ⚠️ **Note**: These rules allow all access for development. For production, implement proper security.

---

## Step 2: Update Firebase Storage Security Rules

1. Go to **Storage** in the left sidebar
2. Click the **Rules** tab
3. Replace the existing rules with:

```javascript
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
    // Allow all access for development
    match /{allPaths=**} {
      allow read, write: if true;
    }
  }
}
```

4. Click **Publish**

> ⚠️ **Note**: These rules allow all access for development. For production, implement proper security.

---

## Step 3: Enable Firebase Storage (if not already enabled)

1. Go to **Storage** in the left sidebar
2. If you see "Get started", click it
3. Choose your preferred location (e.g., "asia-south1" for India)
4. Click **Done**

---

## Step 4: Verify Firebase Configuration

Make sure your `.env.local` file has the correct Firebase configuration:

```
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=po-verse.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=po-verse
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=po-verse.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

---

## Troubleshooting

### "Failed to create company" error
1. Check browser console for detailed error messages
2. Verify Firestore rules are published
3. Make sure the Firebase project is properly initialized

### "Missing or insufficient permissions" error
- Make sure you've updated BOTH Firestore AND Storage rules
- Click "Publish" after updating the rules

### Logo upload issues
- Logos are now uploaded to Firebase Storage
- The URL is stored in Firestore
- Make sure Storage is enabled and rules are published
