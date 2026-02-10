import { NextRequest, NextResponse } from "next/server";
import { createUser, superadminExists } from "@/lib/auth";
import { isStaticExportBuild, getStaticExportResponse } from "@/lib/staticExport";

export const dynamic = "force-static";

// This endpoint should only be used once to seed the superadmin
// After that, it should be disabled or protected
export async function POST(request: NextRequest) {
  if (isStaticExportBuild) return getStaticExportResponse();
  try {
    // Check if superadmin already exists
    const exists = await superadminExists();
    
    if (exists) {
      return NextResponse.json(
        { success: false, error: "Superadmin already exists" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { username, password, name } = body;

    if (!username || !password || !name) {
      return NextResponse.json(
        { success: false, error: "Username, password, and name are required" },
        { status: 400 }
      );
    }

    const result = await createUser(
      {
        username,
        password,
        name,
        role: "superadmin",
      },
      "system"
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Superadmin created successfully",
    });
  } catch (error) {
    console.error("Seed superadmin error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
