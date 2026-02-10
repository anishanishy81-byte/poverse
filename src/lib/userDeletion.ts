import { db, realtimeDb, storage } from "./firebase";
import { doc, getDoc, deleteDoc, collection, query, where, getDocs, writeBatch } from "firebase/firestore";
import { ref, remove, get } from "firebase/database";
import { ref as storageRef, listAll, deleteObject } from "firebase/storage";
import { updateCompanyUserCounts } from "./company";

/**
 * Completely deletes all user data from Firestore, RTDB, and Storage.
 * This is used by superadmin to fully remove a user and all their data.
 */
export async function fullDeleteUser(userId: string): Promise<{ success: boolean; error?: string; details?: string[] }> {
  const details: string[] = [];
  
  try {
    // 1. Get user data first to know companyId and role
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    
    let companyId: string | undefined;
    let userRole: string | undefined;
    
    if (userSnap.exists()) {
      const userData = userSnap.data();
      companyId = userData.companyId;
      userRole = userData.role;
    }

    // 2. Delete from Firestore
    try {
      await deleteDoc(userRef);
      details.push("✓ Deleted user document from Firestore");
    } catch (e) {
      details.push("✗ Failed to delete user from Firestore: " + (e as Error).message);
    }

    // Delete customer interactions linked to user
    try {
      const interactionsQuery = query(collection(db, "customerInteractions"), where("userId", "==", userId));
      const interactionsSnap = await getDocs(interactionsQuery);
      if (!interactionsSnap.empty) {
        // Firestore batch limit is 500 — chunk if needed
        const docs = interactionsSnap.docs;
        for (let i = 0; i < docs.length; i += 450) {
          const batch = writeBatch(db);
          docs.slice(i, i + 450).forEach(d => batch.delete(d.ref));
          await batch.commit();
        }
        details.push(`✓ Deleted ${interactionsSnap.size} customer interactions`);
      }
    } catch (e) {
      details.push("✗ Failed to delete customer interactions: " + (e as Error).message);
    }

    // Delete customer notes by user
    try {
      const notesQuery = query(collection(db, "customerNotes"), where("userId", "==", userId));
      const notesSnap = await getDocs(notesQuery);
      if (!notesSnap.empty) {
        const docs = notesSnap.docs;
        for (let i = 0; i < docs.length; i += 450) {
          const batch = writeBatch(db);
          docs.slice(i, i + 450).forEach(d => batch.delete(d.ref));
          await batch.commit();
        }
        details.push(`✓ Deleted ${notesSnap.size} customer notes`);
      }
    } catch (e) {
      details.push("✗ Failed to delete customer notes: " + (e as Error).message);
    }

    // 3. Delete from all RTDB paths
    const rtdbPaths = [
      `locations/${userId}`,
      `locationHistory/${userId}`,
      `presence/${userId}`,
      `sessions/${userId}`,
      `attendance/${userId}`,
      `leaveRequests/${userId}`,
      `leaveBalances/${userId}`,
      `expenses/${userId}`,
      `notifications/${userId}`,
      `fcmTokens/${userId}`,
      `notificationPreferences/${userId}`,
      `targetVisits/${userId}`,
      `userActiveVisits/${userId}`,
      `targetAssignments/${userId}`,
      `navigationTracking/${userId}`,
      `agentGoals/${userId}`,
      `incentives/${userId}`,
      `scheduledTasks/${userId}`,
      `activityLog/${userId}`,
      `agentActivity/${userId}`,
      `dailyReports/${userId}`,
      `optimizedRoutes/${userId}`,
      `typing/${userId}`,
      `documents/${userId}`,
      `documentLogs/${userId}`,
      `documentShares/${userId}`,
      `documentFolders/${userId}`,
      `stories/${userId}`,
      `storyViews/${userId}`,
      `storyComments/${userId}`,
      `calls/${userId}`,
      `callOffers/${userId}`,
      `callAnswers/${userId}`,
      `iceCandidates/${userId}`,
    ];

    for (const path of rtdbPaths) {
      try {
        const nodeRef = ref(realtimeDb, path);
        const snapshot = await get(nodeRef);
        if (snapshot.exists()) {
          await remove(nodeRef);
          details.push(`✓ Deleted RTDB: ${path}`);
        }
      } catch (e) {
        details.push(`✗ Failed to delete RTDB ${path}: ` + (e as Error).message);
      }
    }

    // Delete conversations where user is a participant
    try {
      const convsRef = ref(realtimeDb, "conversations");
      const convsSnap = await get(convsRef);
      if (convsSnap.exists()) {
        const convData = convsSnap.val();
        let deletedCount = 0;
        for (const convId of Object.keys(convData)) {
          const conv = convData[convId];
          // Check if user is a participant
          if (conv.participants && (conv.participants[userId] || convId.includes(userId))) {
            // Delete the conversation
            await remove(ref(realtimeDb, `conversations/${convId}`));
            // Delete messages for this conversation
            await remove(ref(realtimeDb, `messages/${convId}`));
            deletedCount++;
          }
        }
        if (deletedCount > 0) {
          details.push(`✓ Deleted ${deletedCount} conversations and their messages`);
        }
      }
    } catch (e) {
      details.push("✗ Failed to clean up conversations: " + (e as Error).message);
    }

    // 4. Delete from Firebase Storage
    const storagePaths = [
      `profile-pictures/${userId}`,
      `attendance/${userId}`,
      `receipts/${userId}`,
      `stories/${userId}`,
      `leave/${userId}`,
    ];

    for (const path of storagePaths) {
      try {
        const folderRef = storageRef(storage, path);
        const listResult = await listAll(folderRef);
        
        for (const itemRef of listResult.items) {
          await deleteObject(itemRef);
        }
        
        // Also delete items in subdirectories
        for (const prefixRef of listResult.prefixes) {
          const subList = await listAll(prefixRef);
          for (const itemRef of subList.items) {
            await deleteObject(itemRef);
          }
        }
        
        if (listResult.items.length > 0 || listResult.prefixes.length > 0) {
          details.push(`✓ Deleted Storage: ${path}`);
        }
      } catch (e) {
        // Storage folder may not exist - not an error
      }
    }

    // 5. Update company user counts
    if (companyId) {
      try {
        const adminDelta = userRole === "admin" ? -1 : 0;
        const agentDelta = userRole === "user" ? -1 : 0;
        await updateCompanyUserCounts(companyId, adminDelta, agentDelta);
        details.push("✓ Updated company user counts");
      } catch (e) {
        details.push("✗ Failed to update company counts: " + (e as Error).message);
      }
    }

    return { success: true, details };
  } catch (error) {
    console.error("Full delete user error:", error);
    return { 
      success: false, 
      error: "Failed to completely delete user: " + (error as Error).message,
      details 
    };
  }
}

/**
 * Get a summary of all data for a user (for preview before deletion)
 */
export async function getUserDataSummary(userId: string): Promise<Record<string, number>> {
  const summary: Record<string, number> = {};
  
  const rtdbPaths = [
    "locations", "locationHistory", "presence", "sessions", "attendance",
    "leaveRequests", "leaveBalances", "expenses", "notifications",
    "fcmTokens", "targetVisits", "userActiveVisits", "targetAssignments",
    "agentGoals", "incentives", "scheduledTasks", "activityLog",
    "agentActivity", "dailyReports", "stories", "documents",
  ];

  for (const path of rtdbPaths) {
    try {
      const nodeRef = ref(realtimeDb, `${path}/${userId}`);
      const snapshot = await get(nodeRef);
      if (snapshot.exists()) {
        const val = snapshot.val();
        summary[path] = typeof val === "object" && val !== null ? Object.keys(val).length : 1;
      }
    } catch {
      // ignore
    }
  }

  return summary;
}
