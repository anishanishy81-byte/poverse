// API route to send push notifications via Firebase Cloud Messaging
import { NextRequest, NextResponse } from "next/server";
import admin from "firebase-admin";
import { isStaticExportBuild, getStaticExportResponse } from "@/lib/staticExport";

export const dynamic = "force-static";

// Initialize Firebase Admin SDK if not already initialized
const getFirebaseAdmin = () => {
  if (admin.apps.length === 0) {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    
    if (!serviceAccount) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set");
    }
    
    try {
      const parsedServiceAccount = JSON.parse(serviceAccount);
      admin.initializeApp({
        credential: admin.credential.cert(parsedServiceAccount),
      });
    } catch (error) {
      console.error("Failed to parse service account:", error);
      throw new Error("Invalid FIREBASE_SERVICE_ACCOUNT_KEY format");
    }
  }
  
  return admin;
};

export async function POST(request: NextRequest) {
  if (isStaticExportBuild) return getStaticExportResponse();
  try {
    const body = await request.json();
    const { tokens, payload } = body;
    
    if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
      return NextResponse.json(
        { error: "No FCM tokens provided" },
        { status: 400 }
      );
    }
    
    if (!payload) {
      return NextResponse.json(
        { error: "No notification payload provided" },
        { status: 400 }
      );
    }
    
    const firebaseAdmin = getFirebaseAdmin();
    const messaging = firebaseAdmin.messaging();
    
    // Build the message
    const message = {
      notification: payload.notification,
      data: payload.data || {},
      webpush: payload.webpush,
      tokens: tokens,
    };
    
    // Send to multiple devices
    const response = await messaging.sendEachForMulticast(message);
    
    // Track results
    const successCount = response.successCount;
    const failureCount = response.failureCount;
    const results = response.responses.map((resp, index) => ({
      token: tokens[index].substring(0, 20) + "...",
      success: resp.success,
      error: resp.error?.message,
    }));
    
    return NextResponse.json({
      success: true,
      successCount,
      failureCount,
      results,
    });
  } catch (error) {
    console.error("Error sending push notification:", error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
