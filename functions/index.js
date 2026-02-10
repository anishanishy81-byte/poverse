/**
 * Firebase Cloud Functions for PO-VERSE
 * Handles push notifications and background tasks
 */
const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp();

const db = admin.database();
const messaging = admin.messaging();

// ==================== PUSH NOTIFICATIONS ====================

/**
 * Send push notification to specific tokens
 * Called via HTTP request from the app
 */
exports.sendPushNotification = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  try {
    const { tokens, payload } = req.body;

    if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
      res.status(400).json({ error: 'No tokens provided' });
      return;
    }

    // Build the message
    const message = {
      notification: {
        title: payload.notification?.title || 'PO-VERSE',
        body: payload.notification?.body || '',
      },
      data: {
        ...payload.data,
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
      },
      android: {
        priority: 'high',
        notification: {
          channelId: getChannelId(payload.data?.type),
          priority: 'high',
          defaultSound: true,
          defaultVibrateTimings: true,
          icon: 'ic_launcher',
          color: '#667eea',
        },
      },
      webpush: payload.webpush || {
        notification: {
          icon: '/icons/icon-192x192.png',
          badge: '/icons/badge-72x72.png',
        },
        fcm_options: {
          link: payload.data?.clickAction || '/',
        },
      },
    };

    // Send to each token
    const results = await Promise.allSettled(
      tokens.map(token =>
        messaging.send({ ...message, token })
          .then(() => ({ token, success: true }))
          .catch(err => ({ token, success: false, error: err.message }))
      )
    );

    const successes = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failures = results.filter(r => r.status === 'rejected' || !r.value?.success).length;

    res.status(200).json({
      success: true,
      sent: successes,
      failed: failures,
      results: results.map(r => r.value || r.reason),
    });
  } catch (error) {
    console.error('Error sending push notification:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get notification channel ID based on notification type
 */
function getChannelId(type) {
  if (!type) return 'poverse_default';
  
  if (type.includes('chat') || type.includes('message')) {
    return 'poverse_chat';
  }
  if (type.includes('target') || type.includes('lead') || type.includes('visit')) {
    return 'poverse_targets';
  }
  if (type.includes('attendance') || type.includes('checkin') || type.includes('checkout')) {
    return 'poverse_attendance';
  }
  
  return 'poverse_default';
}

/**
 * Trigger notification when a new notification is created in RTDB
 * This automatically sends push notifications when notifications are written
 */
exports.onNotificationCreated = functions.database
  .ref('/notifications/{companyId}/{userId}/{notificationId}')
  .onCreate(async (snapshot, context) => {
    const { companyId, userId, notificationId } = context.params;
    const notification = snapshot.val();

    console.log(`New notification created: ${notificationId} for user ${userId}`);

    try {
      // Get user's FCM tokens
      const tokensSnapshot = await db.ref(`/fcmTokens/${companyId}/${userId}`).once('value');
      
      if (!tokensSnapshot.exists()) {
        console.log('No FCM tokens found for user');
        return null;
      }

      const tokensData = tokensSnapshot.val();
      const tokens = Object.values(tokensData)
        .filter(t => t.active !== false)
        .map(t => t.token);

      if (tokens.length === 0) {
        console.log('No active FCM tokens found');
        return null;
      }

      // Build and send the message
      const message = {
        notification: {
          title: notification.title || 'PO-VERSE',
          body: notification.body || '',
        },
        data: {
          notificationId: notificationId,
          type: notification.type || 'default',
          clickAction: notification.clickAction || '/dashboard',
          priority: notification.priority || 'normal',
        },
        android: {
          priority: 'high',
          notification: {
            channelId: getChannelId(notification.type),
            priority: 'high',
            defaultSound: true,
            defaultVibrateTimings: true,
          },
        },
      };

      // Send to all tokens
      const results = await Promise.allSettled(
        tokens.map(token => messaging.send({ ...message, token }))
      );

      const successes = results.filter(r => r.status === 'fulfilled').length;
      console.log(`Push sent to ${successes}/${tokens.length} devices`);

      // Update notification with push status
      await snapshot.ref.update({
        pushSent: true,
        pushSentAt: new Date().toISOString(),
      });

      return { sent: successes, total: tokens.length };
    } catch (error) {
      console.error('Error sending push notification:', error);
      
      await snapshot.ref.update({
        pushSent: false,
        pushError: error.message,
      });
      
      return null;
    }
  });

/**
 * Trigger notification when a new chat message is sent
 */
exports.onNewChatMessage = functions.database
  .ref('/messages/{conversationId}/{messageId}')
  .onCreate(async (snapshot, context) => {
    const { conversationId, messageId } = context.params;
    const message = snapshot.val();

    if (!message || !message.senderId || !message.text) {
      return null;
    }

    console.log(`New message in conversation ${conversationId}`);

    try {
      // Get conversation to find recipient
      const convSnapshot = await db.ref(`/conversations/${conversationId}`).once('value');
      
      if (!convSnapshot.exists()) {
        return null;
      }

      const conversation = convSnapshot.val();
      const participants = conversation.participants || [];
      
      // Find recipient (the other participant)
      const recipientId = participants.find(p => p !== message.senderId);
      
      if (!recipientId) {
        return null;
      }

      // Get recipient's FCM tokens
      const companyId = conversation.companyId;
      const tokensSnapshot = await db.ref(`/fcmTokens/${companyId}/${recipientId}`).once('value');
      
      if (!tokensSnapshot.exists()) {
        return null;
      }

      const tokensData = tokensSnapshot.val();
      const tokens = Object.values(tokensData)
        .filter(t => t.active !== false)
        .map(t => t.token);

      if (tokens.length === 0) {
        return null;
      }

      // Get sender's name from conversation
      const senderName = conversation.participantNames?.[message.senderId] || 'Someone';

      // Build the push message
      const pushMessage = {
        notification: {
          title: senderName,
          body: message.text.length > 100 ? message.text.substring(0, 97) + '...' : message.text,
        },
        data: {
          type: 'new_message',
          conversationId: conversationId,
          messageId: messageId,
          senderId: message.senderId,
          clickAction: `/chat?conversation=${conversationId}`,
        },
        android: {
          priority: 'high',
          notification: {
            channelId: 'poverse_chat',
            priority: 'high',
            defaultSound: true,
            tag: `chat_${conversationId}`, // Group messages from same conversation
          },
        },
      };

      // Send to all tokens
      await Promise.allSettled(
        tokens.map(token => messaging.send({ ...pushMessage, token }))
      );

      return null;
    } catch (error) {
      console.error('Error sending chat notification:', error);
      return null;
    }
  });

// ==================== UTILITY FUNCTIONS ====================

/**
 * Health check endpoint
 */
exports.healthCheck = functions.https.onRequest((req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'PO-VERSE Firebase Functions'
  });
});

