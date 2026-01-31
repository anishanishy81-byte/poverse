import { NextResponse } from "next/server";

export async function GET() {
  // Check if Firebase config is available (without exposing sensitive data)
  const config = {
    apiKeySet: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomainSet: !!process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectIdSet: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "NOT SET",
    storageBucketSet: !!process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderIdSet: !!process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appIdSet: !!process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementIdSet: !!process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
    googleMapsKeySet: !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
  };

  return NextResponse.json({
    success: true,
    config,
    message: "Environment variable check",
  });
}
