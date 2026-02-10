import { NextRequest, NextResponse } from "next/server";
import { authenticateUser } from "@/lib/auth";
import { getCompanyById } from "@/lib/company";
import { isStaticExportBuild, getStaticExportResponse } from "@/lib/staticExport";

export const dynamic = "force-static";

export async function POST(request: NextRequest) {
  if (isStaticExportBuild) return getStaticExportResponse();
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: "Username and password are required" },
        { status: 400 }
      );
    }

    const result = await authenticateUser(username, password);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 401 }
      );
    }

    // Fetch company info if user belongs to a company
    let company = null;
    if (result.user?.companyId) {
      company = await getCompanyById(result.user.companyId);
    }

    return NextResponse.json({
      success: true,
      user: result.user,
      company,
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
