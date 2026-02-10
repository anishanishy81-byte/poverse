import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { isStaticExportBuild, getStaticExportResponse } from "@/lib/staticExport";

export const dynamic = "force-static";

export async function POST(request: NextRequest) {
  if (isStaticExportBuild) return getStaticExportResponse();
  try {
    const data = await request.json();
    const { userId, isOnline } = data;

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    const presenceRef = doc(db, "presence", userId);
    await setDoc(presenceRef, {
      userId,
      isOnline: isOnline ?? false,
      lastActive: new Date().toISOString(),
    }, { merge: true });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Presence update error:", error);
    return NextResponse.json({ error: "Failed to update presence" }, { status: 500 });
  }
}
