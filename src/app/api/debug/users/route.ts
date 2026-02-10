import { NextResponse } from "next/server";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { isStaticExportBuild, getStaticExportResponse } from "@/lib/staticExport";

export const dynamic = "force-static";

export async function GET() {
  if (isStaticExportBuild) return getStaticExportResponse();
  try {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("role", "==", "superadmin"));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return NextResponse.json({
        success: false,
        message: "No superadmin found in database",
        usersCount: 0,
      });
    }

    const users = snapshot.docs.map((doc) => ({
      id: doc.id,
      username: doc.data().username,
      name: doc.data().name,
      role: doc.data().role,
      isActive: doc.data().isActive,
      hasPassword: !!doc.data().password,
    }));

    return NextResponse.json({
      success: true,
      message: "Superadmin found",
      users,
    });
  } catch (error) {
    console.error("Debug users error:", error);
    return NextResponse.json({
      success: false,
      error: String(error),
    });
  }
}
