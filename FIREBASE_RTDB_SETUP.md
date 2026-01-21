# Firebase Realtime Database Setup Guide

This guide explains how to set up Firebase Realtime Database for PO-VERSE real-time features (Chat & GPS Tracking).

## Overview

PO-VERSE uses Firebase Realtime Database for:
- **Real-time Chat**: Messages, conversations, typing indicators
- **User Presence**: Online/offline status with automatic offline detection
- **GPS Location Tracking**: Real-time location updates and history

## Step 1: Enable Realtime Database in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Build** → **Realtime Database**
4. Click **Create Database**
5. Choose your database location (use the closest region)
6. Start in **test mode** for development (we'll add security rules later)

## Step 2: Database Structure

The database will automatically create this structure:

```
├── conversations/
│   └── {conversationId}/
│       ├── participants: [userId1, userId2]
│       ├── participantNames: { userId: name }
│       ├── participantRoles: { userId: role }
│       ├── lastMessage: "string"
│       ├── lastMessageTime: "ISO timestamp"
│       └── ...
│
├── messages/
│   └── {conversationId}/
│       └── {messageId}/
│           ├── senderId: "string"
│           ├── senderName: "string"
│           ├── content: "string"
│           ├── timestamp: "ISO timestamp"
│           └── read: boolean
│
├── presence/
│   └── {userId}/
│       ├── isOnline: boolean
│       └── lastActive: "ISO timestamp"
│
├── typing/
│   └── {conversationId}/
│       └── {userId}: boolean
│
├── locations/
│   └── {userId}/
│       ├── latitude: number
│       ├── longitude: number
│       ├── accuracy: number
│       ├── timestamp: "ISO timestamp"
│       ├── address: "string" (optional)
│       ├── userName: "string"
│       └── companyId: "string"
│
├── locationHistory/
│   └── {userId}/
│       └── {historyId}/
│           ├── latitude: number
│           ├── longitude: number
│           ├── accuracy: number
│           ├── timestamp: "ISO timestamp"
│           └── address: "string" (optional)
│
├── targets/
│   └── {targetId}/
│       ├── name: "string"
│       ├── companyId: "string"
│       ├── location: { latitude, longitude, address, placeId, placeName }
│       ├── contactPerson: "string"
│       ├── contactPhone: "string"
│       ├── leadStatus: "new" | "contacted" | "interested" | etc.
│       ├── flags: ["priority", "urgent", etc.]
│       └── ...
│
├── targetVisits/
│   └── {visitId}/
│       ├── targetId: "string"
│       ├── userId: "string"
│       ├── status: "pending" | "in_transit" | "reached" | "in_progress" | "completed"
│       ├── reachedAt: "ISO timestamp"
│       ├── timerStartedAt: "ISO timestamp"
│       ├── conversationNotes: "string"
│       ├── outcome: "string"
│       └── ...
│
└── userActiveVisits/
    └── {userId}/
        └── {visitId}/
            ├── visitId: "string"
            ├── targetId: "string"
            └── status: "string"
```

## Step 3: Security Rules (Production)

Replace the default rules with these for production:

```json
{
  "rules": {
    // Conversations - users can only access their own conversations
    "conversations": {
      "$conversationId": {
        ".read": "auth != null && (data.child('participants').child(auth.uid).exists() || root.child('users').child(auth.uid).child('role').val() === 'superadmin')",
        ".write": "auth != null && (data.child('participants').child(auth.uid).exists() || !data.exists())"
      }
    },
    
    // Messages - users can read/write messages in their conversations
    "messages": {
      "$conversationId": {
        ".read": "auth != null && root.child('conversations').child($conversationId).child('participants').child(auth.uid).exists()",
        ".write": "auth != null && root.child('conversations').child($conversationId).child('participants').child(auth.uid).exists()"
      }
    },
    
    // Presence - users can only update their own presence, anyone can read
    "presence": {
      "$userId": {
        ".read": "auth != null",
        ".write": "auth != null && auth.uid === $userId"
      }
    },
    
    // Typing - same as messages
    "typing": {
      "$conversationId": {
        ".read": "auth != null && root.child('conversations').child($conversationId).child('participants').child(auth.uid).exists()",
        ".write": "auth != null && root.child('conversations').child($conversationId).child('participants').child(auth.uid).exists()"
      }
    },
    
    // Locations - users update their own, admins can read company locations
    "locations": {
      "$userId": {
        ".read": "auth != null",
        ".write": "auth != null && auth.uid === $userId"
      }
    },
    
    // Location History - users update their own, admins can read
    "locationHistory": {
      "$userId": {
        ".read": "auth != null",
        ".write": "auth != null && auth.uid === $userId"
      }
    }
  }
}
```

**Note**: For development without Firebase Authentication, use these permissive rules:

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

## Step 4: Environment Variables

The database URL is automatically constructed from your Firebase project ID:

```
https://{PROJECT_ID}-default-rtdb.firebaseio.com
```

Make sure your `.env.local` has:

```env
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
```

## Step 5: Indexing (Performance)

Add these indexes in Firebase Console → Realtime Database → Rules tab → Indexes:

```json
{
  "rules": {
    // ... your rules ...
  },
  "indexes": {
    "messages": {
      "$conversationId": {
        ".indexOn": ["timestamp"]
      }
    },
    "locationHistory": {
      "$userId": {
        ".indexOn": ["timestamp"]
      }
    },
    "conversations": {
      ".indexOn": ["updatedAt"]
    }
  }
}
```

## Features Powered by Realtime Database

### Chat System
- Real-time message delivery (instant)
- Read receipts
- Typing indicators
- Conversation list with unread counts

### Presence System
- Automatic online/offline detection using Firebase's `.info/connected`
- `onDisconnect` handlers for reliable offline status
- Last active timestamps

### GPS Tracking
- Real-time location updates (configurable interval, default 30 seconds)
- Location history with timestamps
- Admin can view all agent locations
- Daily statistics (total updates, distance traveled)

## Testing

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Log in as two different users in different browsers

3. Test chat:
   - Send messages between users
   - Check real-time delivery
   - Check read receipts

4. Test presence:
   - Close one browser tab
   - Check if user shows as offline

5. Test GPS tracking:
   - Allow location permissions
   - Check Firebase Console → Realtime Database → Data
   - Verify location updates are being stored

## Troubleshooting

### "Permission denied" errors
- Check your security rules
- For development, use the permissive rules shown above

### Messages not appearing in real-time
- Check browser console for errors
- Verify Firebase configuration in `.env.local`
- Check network tab for WebSocket connections

### Location not syncing
- Verify GPS permissions are granted
- Check if `useTrackedLocation` hook has valid `userId`
- Check browser console for sync errors

### Database URL errors
- Ensure your project ID is correct in `.env.local`
- For non-US regions, you might need to specify the region:
  ```
  https://{PROJECT_ID}-default-rtdb.{REGION}.firebasedatabase.app
  ```
