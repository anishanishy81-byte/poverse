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
├── userActiveVisits/
│   └── {userId}/
│       └── {visitId}/
│           ├── visitId: "string"
│           ├── targetId: "string"
│           └── status: "string"
│
├── stories/
│   └── {storyId}/
│       ├── userId: "string"
│       ├── userName: "string"
│       ├── userProfilePicture: "string" (optional)
│       ├── companyId: "string"
│       ├── type: "text" | "image" | "location"
│       ├── content: "string"
│       ├── mediaUrl: "string" (optional)
│       ├── bgColor: "string" (optional)
│       ├── location: { latitude, longitude, address, placeName }
│       ├── createdAt: "ISO timestamp"
│       ├── expiresAt: "ISO timestamp"
│       ├── likes: ["userId1", "userId2"]
│       ├── likeCount: number
│       ├── commentCount: number
│       └── isPinned: boolean
│
├── storyViews/
│   └── {storyId}/
│       └── {viewId}/
│           ├── viewerId: "string"
│           ├── viewerName: "string"
│           ├── viewerProfilePicture: "string" (optional)
│           ├── viewedAt: "ISO timestamp"
│           └── reaction: "string" (optional)
│
└── storyComments/
    └── {storyId}/
        └── {commentId}/
            ├── id: "string"
            ├── storyId: "string"
            ├── userId: "string"
            ├── userName: "string"
            ├── userProfilePicture: "string" (optional)
            ├── text: "string"
            ├── createdAt: "ISO timestamp"
            ├── likes: ["userId1", "userId2"]
            ├── mentions: ["userId1", "userId2"]
            └── replies: [{ id, userId, userName, text, createdAt, likes }]
```

## Step 3: Security Rules (Production)

Replace the default rules with these for production. **IMPORTANT**: Copy the entire JSON below and paste it in Firebase Console → Realtime Database → Rules tab:

```json
{
  "rules": {
    "conversations": {
      ".indexOn": ["updatedAt"],
      "$conversationId": {
        ".read": "auth != null && (data.child('participants').child(auth.uid).exists() || root.child('users').child(auth.uid).child('role').val() === 'superadmin')",
        ".write": "auth != null && (data.child('participants').child(auth.uid).exists() || !data.exists())"
      }
    },
    
    "messages": {
      "$conversationId": {
        ".indexOn": ["timestamp"],
        ".read": "auth != null && root.child('conversations').child($conversationId).child('participants').child(auth.uid).exists()",
        ".write": "auth != null && root.child('conversations').child($conversationId).child('participants').child(auth.uid).exists()"
      }
    },
    
    "presence": {
      "$userId": {
        ".read": "auth != null",
        ".write": "auth != null && auth.uid === $userId"
      }
    },
    
    "typing": {
      "$conversationId": {
        ".read": "auth != null && root.child('conversations').child($conversationId).child('participants').child(auth.uid).exists()",
        ".write": "auth != null && root.child('conversations').child($conversationId).child('participants').child(auth.uid).exists()"
      }
    },
    
    "locations": {
      "$userId": {
        ".read": "auth != null",
        ".write": "auth != null && auth.uid === $userId"
      }
    },
    
    "locationHistory": {
      "$userId": {
        ".indexOn": ["timestamp"],
        ".read": "auth != null",
        ".write": "auth != null && auth.uid === $userId"
      }
    },
    
    "attendance": {
      ".indexOn": ["userId", "date"],
      "$recordId": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    },
    
    "targets": {
      ".indexOn": ["companyId"],
      "$targetId": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    },
    
    "targetVisits": {
      ".indexOn": ["userId", "companyId", "status", "assignedAt"],
      "$visitId": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    },
    
    "userActiveVisits": {
      "$userId": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    },
    
    "dailyReports": {
      ".indexOn": ["userId", "date", "status"],
      "$reportId": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    },
    
    "notifications": {
      "$userId": {
        ".indexOn": ["timestamp", "read"],
        ".read": "auth != null && auth.uid === $userId",
        ".write": "auth != null"
      }
    },
    
    "incentives": {
      "$userId": {
        ".indexOn": ["date", "type"],
        ".read": "auth != null && auth.uid === $userId",
        ".write": "auth != null"
      }
    },
    
    "scheduledTasks": {
      "$userId": {
        ".indexOn": ["scheduledDate", "status"],
        ".read": "auth != null && auth.uid === $userId",
        ".write": "auth != null"
      }
    },
    
    "activityLog": {
      "$userId": {
        "$date": {
          ".indexOn": ["timestamp"],
          ".read": "auth != null",
          ".write": "auth != null && auth.uid === $userId"
        }
      }
    },
    
    "agentGoals": {
      "$userId": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    }
  }
}
```

**Note**: For development without Firebase Authentication, use these permissive rules (includes indexes):

```json
{
  "rules": {
    ".read": true,
    ".write": true,
    
    "locationHistory": {
      "$userId": {
        ".indexOn": ["timestamp"]
      }
    },
    "messages": {
      "$conversationId": {
        ".indexOn": ["timestamp"]
      }
    },
    "conversations": {
      ".indexOn": ["updatedAt"]
    },
    "attendance": {
      ".indexOn": ["userId", "date"]
    },
    "targets": {
      ".indexOn": ["companyId"]
    },
    "targetVisits": {
      ".indexOn": ["userId", "companyId", "status", "assignedAt"]
    },
    "dailyReports": {
      ".indexOn": ["userId", "date", "status"]
    },
    "notifications": {
      "$userId": {
        ".indexOn": ["timestamp", "read"]
      }
    },
    "incentives": {
      "$userId": {
        ".indexOn": ["date"]
      }
    },
    "scheduledTasks": {
      "$userId": {
        ".indexOn": ["scheduledDate", "status"]
      }
    },
    "activityLog": {
      "$userId": {
        "$date": {
          ".indexOn": ["timestamp"]
        }
      }
    }
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

## Step 5: Apply the Rules

1. Go to **Firebase Console** → Your Project → **Realtime Database** → **Rules** tab
2. Copy the appropriate rules JSON above (development or production)
3. Paste it in the rules editor
4. Click **Publish**

The indexes (`.indexOn`) are included in the rules and will be created automatically when you publish.
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
