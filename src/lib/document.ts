// Document Management Library
import {
  ref,
  push,
  set,
  get,
  update,
  remove,
  query,
  orderByChild,
  equalTo,
  onValue,
  off,
  DataSnapshot,
} from "firebase/database";
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  getMetadata,
} from "firebase/storage";
import { realtimeDb, storage } from "./firebase";
import {
  Document,
  DocumentFolder,
  DocumentUploadInput,
  DocumentShare,
  DocumentAccessLog,
  DocumentCategory,
  DocumentVisibility,
  DocumentStatus,
  getDocumentType,
} from "../types/document";
import { createNotification } from "./notifications";

// ==================== DOCUMENT CRUD ====================

// Upload and create a new document
export const uploadDocument = async (
  companyId: string,
  userId: string,
  userName: string,
  file: File,
  input: DocumentUploadInput
): Promise<Document> => {
  // Generate document ID
  const documentRef = push(ref(realtimeDb, `documents/${companyId}`));
  const documentId = documentRef.key!;
  
  // Create storage path
  const fileExtension = file.name.substring(file.name.lastIndexOf("."));
  const storagePath = `documents/${companyId}/${documentId}${fileExtension}`;
  const fileRef = storageRef(storage, storagePath);
  
  // Upload file to storage
  await uploadBytes(fileRef, file);
  const fileUrl = await getDownloadURL(fileRef);
  
  // Determine document type
  const documentType = getDocumentType(file.type, file.name);
  
  // Create document record
  const now = new Date().toISOString();
  const document: Document = {
    id: documentId,
    companyId,
    
    // Basic info
    name: input.name,
    category: input.category,
    type: documentType,
    
    // File info
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    fileUrl,
    filePath: storagePath,
    
    // Organization
    tags: input.tags || [],
    
    // Visibility
    visibility: input.visibility || "company",
    
    // Version
    version: 1,
    
    // Status
    status: "active",
    
    // Analytics
    viewCount: 0,
    downloadCount: 0,
    
    // Metadata
    uploadedBy: userId,
    uploadedByName: userName,
    createdAt: now,
    updatedAt: now,
  };
  
  // Add optional fields
  if (input.description) document.description = input.description;
  if (input.folderId) document.folderId = input.folderId;
  if (input.visibility === "specific_users" && input.allowedUserIds) {
    document.allowedUserIds = input.allowedUserIds;
  }
  
  // Save to database
  await set(documentRef, document);
  
  return document;
};

// Get document by ID
export const getDocument = async (
  companyId: string,
  documentId: string
): Promise<Document | null> => {
  const snapshot = await get(ref(realtimeDb, `documents/${companyId}/${documentId}`));
  if (snapshot.exists()) {
    return snapshot.val() as Document;
  }
  return null;
};

// Update document
export const updateDocument = async (
  companyId: string,
  documentId: string,
  updates: Partial<Document>
): Promise<void> => {
  const updateData = {
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  
  await update(ref(realtimeDb, `documents/${companyId}/${documentId}`), updateData);
};

// Delete document
export const deleteDocument = async (
  companyId: string,
  documentId: string
): Promise<void> => {
  // Get document to find storage path
  const document = await getDocument(companyId, documentId);
  if (!document) throw new Error("Document not found");
  
  // Delete from storage
  try {
    const fileRef = storageRef(storage, document.filePath);
    await deleteObject(fileRef);
  } catch (error) {
    console.error("Error deleting file from storage:", error);
  }
  
  // Delete from database
  await remove(ref(realtimeDb, `documents/${companyId}/${documentId}`));
};

// Archive document
export const archiveDocument = async (
  companyId: string,
  documentId: string
): Promise<void> => {
  await updateDocument(companyId, documentId, { status: "archived" });
};

// Restore document
export const restoreDocument = async (
  companyId: string,
  documentId: string
): Promise<void> => {
  await updateDocument(companyId, documentId, { status: "active" });
};

// ==================== DOCUMENT VERSION ====================

// Upload new version
export const uploadNewVersion = async (
  companyId: string,
  documentId: string,
  userId: string,
  userName: string,
  file: File
): Promise<Document> => {
  const existingDoc = await getDocument(companyId, documentId);
  if (!existingDoc) throw new Error("Document not found");
  
  // Create storage path for new version
  const fileExtension = file.name.substring(file.name.lastIndexOf("."));
  const storagePath = `documents/${companyId}/${documentId}_v${existingDoc.version + 1}${fileExtension}`;
  const fileRef = storageRef(storage, storagePath);
  
  // Upload new file
  await uploadBytes(fileRef, file);
  const fileUrl = await getDownloadURL(fileRef);
  
  // Update document
  const now = new Date().toISOString();
  const updates: Partial<Document> = {
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    fileUrl,
    filePath: storagePath,
    type: getDocumentType(file.type, file.name),
    version: existingDoc.version + 1,
    previousVersionId: documentId,
    uploadedBy: userId,
    uploadedByName: userName,
    updatedAt: now,
  };
  
  await update(ref(realtimeDb, `documents/${companyId}/${documentId}`), updates);
  
  return { ...existingDoc, ...updates } as Document;
};

// ==================== DOCUMENT ACCESS ====================

// Record document view
export const recordDocumentView = async (
  companyId: string,
  documentId: string,
  userId: string,
  userName: string
): Promise<void> => {
  const document = await getDocument(companyId, documentId);
  if (!document) return;
  
  // Update view count
  await update(ref(realtimeDb, `documents/${companyId}/${documentId}`), {
    viewCount: (document.viewCount || 0) + 1,
    lastViewedAt: new Date().toISOString(),
  });
  
  // Log access
  await logDocumentAccess(companyId, documentId, userId, userName, "view");
};

// Record document download
export const recordDocumentDownload = async (
  companyId: string,
  documentId: string,
  userId: string,
  userName: string
): Promise<void> => {
  const document = await getDocument(companyId, documentId);
  if (!document) return;
  
  // Update download count
  await update(ref(realtimeDb, `documents/${companyId}/${documentId}`), {
    downloadCount: (document.downloadCount || 0) + 1,
    lastDownloadedAt: new Date().toISOString(),
  });
  
  // Log access
  await logDocumentAccess(companyId, documentId, userId, userName, "download");
};

// Log document access
const logDocumentAccess = async (
  companyId: string,
  documentId: string,
  userId: string,
  userName: string,
  action: "view" | "download" | "share"
): Promise<void> => {
  const logRef = push(ref(realtimeDb, `documentLogs/${companyId}/${documentId}`));
  const log: DocumentAccessLog = {
    id: logRef.key!,
    documentId,
    userId,
    userName,
    action,
    timestamp: new Date().toISOString(),
  };
  await set(logRef, log);
};

// Check if user can access document
export const canAccessDocument = (
  document: Document,
  userId: string,
  userRole: string
): boolean => {
  // Admins can always access
  if (userRole === "admin" || userRole === "superadmin") return true;
  
  // Check visibility
  switch (document.visibility) {
    case "public":
      return true;
    case "company":
      return true; // Already filtered by company
    case "admin_only":
      return false;
    case "specific_users":
      return document.allowedUserIds?.includes(userId) || document.uploadedBy === userId;
    default:
      return false;
  }
};

// ==================== DOCUMENT SHARING ====================

// Share document in chat
export const shareDocumentInChat = async (
  companyId: string,
  documentId: string,
  chatId: string,
  userId: string,
  userName: string,
  message?: string
): Promise<DocumentShare> => {
  const document = await getDocument(companyId, documentId);
  if (!document) throw new Error("Document not found");
  
  // Create share record
  const shareRef = push(ref(realtimeDb, `documentShares/${companyId}`));
  const share: DocumentShare = {
    id: shareRef.key!,
    documentId,
    documentName: document.name,
    sharedBy: userId,
    sharedByName: userName,
    sharedWith: chatId,
    shareType: "chat",
    createdAt: new Date().toISOString(),
  };
  
  if (message) share.message = message;
  
  await set(shareRef, share);
  
  // Log access
  await logDocumentAccess(companyId, documentId, userId, userName, "share");
  
  return share;
};

// Share document with user
export const shareDocumentWithUser = async (
  companyId: string,
  documentId: string,
  targetUserId: string,
  userId: string,
  userName: string,
  message?: string
): Promise<DocumentShare> => {
  const document = await getDocument(companyId, documentId);
  if (!document) throw new Error("Document not found");
  
  // Create share record
  const shareRef = push(ref(realtimeDb, `documentShares/${companyId}`));
  const share: DocumentShare = {
    id: shareRef.key!,
    documentId,
    documentName: document.name,
    sharedBy: userId,
    sharedByName: userName,
    sharedWith: targetUserId,
    shareType: "user",
    createdAt: new Date().toISOString(),
  };
  
  if (message) share.message = message;
  
  await set(shareRef, share);
  
  // Create notification for target user
  await createNotification(companyId, {
    userId: targetUserId,
    type: "document_shared",
    title: "Document Shared",
    body: `${userName} shared "${document.name}" with you`,
    relatedType: "document",
    relatedId: documentId,
    relatedName: document.name,
    senderId: userId,
    senderName: userName,
  });
  
  return share;
};

// Get document shares for chat
export const getDocumentSharesForChat = async (
  companyId: string,
  chatId: string
): Promise<DocumentShare[]> => {
  const sharesRef = query(
    ref(realtimeDb, `documentShares/${companyId}`),
    orderByChild("sharedWith"),
    equalTo(chatId)
  );
  
  const snapshot = await get(sharesRef);
  if (!snapshot.exists()) return [];
  
  const shares: DocumentShare[] = [];
  snapshot.forEach((child) => {
    shares.push(child.val() as DocumentShare);
  });
  
  return shares.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
};

// ==================== FOLDER OPERATIONS ====================

// Create folder
export const createFolder = async (
  companyId: string,
  userId: string,
  name: string,
  description?: string,
  parentId?: string
): Promise<DocumentFolder> => {
  const folderRef = push(ref(realtimeDb, `documentFolders/${companyId}`));
  const now = new Date().toISOString();
  
  const folder: DocumentFolder = {
    id: folderRef.key!,
    companyId,
    name,
    documentCount: 0,
    createdBy: userId,
    createdAt: now,
    updatedAt: now,
  };
  
  if (description) folder.description = description;
  if (parentId) folder.parentId = parentId;
  
  await set(folderRef, folder);
  
  return folder;
};

// Get folders
export const getFolders = async (companyId: string): Promise<DocumentFolder[]> => {
  const snapshot = await get(ref(realtimeDb, `documentFolders/${companyId}`));
  if (!snapshot.exists()) return [];
  
  const folders: DocumentFolder[] = [];
  snapshot.forEach((child) => {
    folders.push(child.val() as DocumentFolder);
  });
  
  return folders.sort((a, b) => a.name.localeCompare(b.name));
};

// Update folder
export const updateFolder = async (
  companyId: string,
  folderId: string,
  updates: Partial<DocumentFolder>
): Promise<void> => {
  await update(ref(realtimeDb, `documentFolders/${companyId}/${folderId}`), {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
};

// Delete folder
export const deleteFolder = async (
  companyId: string,
  folderId: string
): Promise<void> => {
  await remove(ref(realtimeDb, `documentFolders/${companyId}/${folderId}`));
};

// ==================== SUBSCRIPTIONS ====================

// Subscribe to company documents
export const subscribeToCompanyDocuments = (
  companyId: string,
  callback: (documents: Document[]) => void
): (() => void) => {
  const documentsRef = ref(realtimeDb, `documents/${companyId}`);
  
  const handler = (snapshot: DataSnapshot) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }
    
    const documents: Document[] = [];
    snapshot.forEach((child) => {
      const doc = child.val() as Document;
      if (doc.status === "active") {
        documents.push(doc);
      }
    });
    
    // Sort by created date (newest first)
    documents.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    callback(documents);
  };
  
  onValue(documentsRef, handler);
  
  return () => off(documentsRef, "value", handler);
};

// Subscribe to documents by category
export const subscribeToDocumentsByCategory = (
  companyId: string,
  category: DocumentCategory,
  callback: (documents: Document[]) => void
): (() => void) => {
  const documentsRef = query(
    ref(realtimeDb, `documents/${companyId}`),
    orderByChild("category"),
    equalTo(category)
  );
  
  const handler = (snapshot: DataSnapshot) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }
    
    const documents: Document[] = [];
    snapshot.forEach((child) => {
      const doc = child.val() as Document;
      if (doc.status === "active") {
        documents.push(doc);
      }
    });
    
    documents.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    callback(documents);
  };
  
  onValue(documentsRef, handler);
  
  return () => off(documentsRef, "value", handler);
};

// Subscribe to folders
export const subscribeToFolders = (
  companyId: string,
  callback: (folders: DocumentFolder[]) => void
): (() => void) => {
  const foldersRef = ref(realtimeDb, `documentFolders/${companyId}`);
  
  const handler = (snapshot: DataSnapshot) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }
    
    const folders: DocumentFolder[] = [];
    snapshot.forEach((child) => {
      folders.push(child.val() as DocumentFolder);
    });
    
    folders.sort((a, b) => a.name.localeCompare(b.name));
    callback(folders);
  };
  
  onValue(foldersRef, handler);
  
  return () => off(foldersRef, "value", handler);
};

// ==================== STATISTICS ====================

// Get document statistics
export const getDocumentStats = async (
  companyId: string
): Promise<{
  totalDocuments: number;
  byCategory: Record<DocumentCategory, number>;
  totalSize: number;
  totalViews: number;
  totalDownloads: number;
}> => {
  const snapshot = await get(ref(realtimeDb, `documents/${companyId}`));
  
  const stats = {
    totalDocuments: 0,
    byCategory: {} as Record<DocumentCategory, number>,
    totalSize: 0,
    totalViews: 0,
    totalDownloads: 0,
  };
  
  if (!snapshot.exists()) return stats;
  
  snapshot.forEach((child) => {
    const doc = child.val() as Document;
    if (doc.status === "active") {
      stats.totalDocuments++;
      stats.totalSize += doc.fileSize || 0;
      stats.totalViews += doc.viewCount || 0;
      stats.totalDownloads += doc.downloadCount || 0;
      
      if (!stats.byCategory[doc.category]) {
        stats.byCategory[doc.category] = 0;
      }
      stats.byCategory[doc.category]++;
    }
  });
  
  return stats;
};

// Get recent documents
export const getRecentDocuments = async (
  companyId: string,
  limit: number = 10
): Promise<Document[]> => {
  const snapshot = await get(ref(realtimeDb, `documents/${companyId}`));
  if (!snapshot.exists()) return [];
  
  const documents: Document[] = [];
  snapshot.forEach((child) => {
    const doc = child.val() as Document;
    if (doc.status === "active") {
      documents.push(doc);
    }
  });
  
  return documents
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
};

// Get popular documents
export const getPopularDocuments = async (
  companyId: string,
  limit: number = 10
): Promise<Document[]> => {
  const snapshot = await get(ref(realtimeDb, `documents/${companyId}`));
  if (!snapshot.exists()) return [];
  
  const documents: Document[] = [];
  snapshot.forEach((child) => {
    const doc = child.val() as Document;
    if (doc.status === "active") {
      documents.push(doc);
    }
  });
  
  return documents
    .sort((a, b) => (b.viewCount + b.downloadCount) - (a.viewCount + a.downloadCount))
    .slice(0, limit);
};

// Search documents
export const searchDocuments = async (
  companyId: string,
  searchTerm: string
): Promise<Document[]> => {
  const snapshot = await get(ref(realtimeDb, `documents/${companyId}`));
  if (!snapshot.exists()) return [];
  
  const term = searchTerm.toLowerCase();
  const documents: Document[] = [];
  
  snapshot.forEach((child) => {
    const doc = child.val() as Document;
    if (doc.status !== "active") return;
    
    // Search in name, description, and tags
    const matchesName = doc.name.toLowerCase().includes(term);
    const matchesDesc = doc.description?.toLowerCase().includes(term);
    const matchesTags = doc.tags.some((t) => t.toLowerCase().includes(term));
    const matchesCategory = doc.category.toLowerCase().includes(term);
    
    if (matchesName || matchesDesc || matchesTags || matchesCategory) {
      documents.push(doc);
    }
  });
  
  return documents.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
};
