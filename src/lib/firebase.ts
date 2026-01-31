import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";
import { getDatabase, Database } from "firebase/database";

// Get database URL - can be from env or constructed from project ID
// Firebase Realtime Database URL formats:
// - US: https://PROJECT_ID-default-rtdb.firebaseio.com
// - Asia: https://PROJECT_ID-default-rtdb.asia-southeast1.firebasedatabase.app
// - Europe: https://PROJECT_ID-default-rtdb.europe-west1.firebasedatabase.app
const getDatabaseURL = (): string => {
  // First check if there's an explicit database URL
  if (process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL) {
    return process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;
  }
  // Default to US region format
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  return `https://${projectId}-default-rtdb.firebaseio.com`;
};

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  databaseURL: getDatabaseURL(),
};

// Log database URL for debugging (only in development)
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  console.log("Firebase Database URL:", firebaseConfig.databaseURL);
}

// Initialize Firebase only if it hasn't been initialized
let app: FirebaseApp;
let db: Firestore;
let storage: FirebaseStorage;
let realtimeDb: Database;

if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

db = getFirestore(app);
storage = getStorage(app);
realtimeDb = getDatabase(app);

export { app, db, storage, realtimeDb };
