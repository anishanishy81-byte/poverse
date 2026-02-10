import { NextRequest, NextResponse } from "next/server";
import {
  createCompany,
  getAllCompanies,
  getCompanyById,
  updateCompany,
  deleteCompany,
} from "@/lib/company";
import { UserRole, CreateCompanyData } from "@/types/auth";
import { isStaticExportBuild, getStaticExportResponse } from "@/lib/staticExport";

export const dynamic = "force-static";

// Get all companies (superadmin) or single company (admin)
export async function GET(request: NextRequest) {
  if (isStaticExportBuild) return getStaticExportResponse();
  try {
    const userRole = request.headers.get("x-user-role") as UserRole;
    const userId = request.headers.get("x-user-id");

    if (!userRole || !userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId");

    // If requesting a specific company (admin can access their own)
    if (companyId) {
      const company = await getCompanyById(companyId);
      if (!company) {
        return NextResponse.json(
          { success: false, error: "Company not found" },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, company });
    }

    // Only superadmin can view all companies
    if (userRole !== "superadmin") {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    const companies = await getAllCompanies();
    return NextResponse.json({ success: true, companies });
  } catch (error) {
    console.error("Get companies error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Create new company (superadmin only)
export async function POST(request: NextRequest) {
  if (isStaticExportBuild) return getStaticExportResponse();
  try {
    const userRole = request.headers.get("x-user-role") as UserRole;
    const userId = request.headers.get("x-user-id");

    if (!userRole || !userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Only superadmin can create companies
    if (userRole !== "superadmin") {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, logo, address, city, state, country, phone, email, website, description, userLimit } =
      body as CreateCompanyData;

    if (!name) {
      return NextResponse.json(
        { success: false, error: "Company name is required" },
        { status: 400 }
      );
    }

    const result = await createCompany(
      { name, logo, address, city, state, country, phone, email, website, description, userLimit },
      userId
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, company: result.company });
  } catch (error) {
    console.error("Create company error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { success: false, error: `Failed to create company: ${errorMessage}` },
      { status: 500 }
    );
  }
}

// Update company (superadmin only)
export async function PUT(request: NextRequest) {
  if (isStaticExportBuild) return getStaticExportResponse();
  try {
    const userRole = request.headers.get("x-user-role") as UserRole;
    const userId = request.headers.get("x-user-id");

    if (!userRole || !userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Only superadmin can update companies
    if (userRole !== "superadmin") {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { companyId, ...updates } = body;

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "Company ID is required" },
        { status: 400 }
      );
    }

    const result = await updateCompany(companyId, updates);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update company error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Delete company (superadmin only)
export async function DELETE(request: NextRequest) {
  if (isStaticExportBuild) return getStaticExportResponse();
  try {
    const userRole = request.headers.get("x-user-role") as UserRole;
    const userId = request.headers.get("x-user-id");

    if (!userRole || !userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Only superadmin can delete companies
    if (userRole !== "superadmin") {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId");

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "Company ID is required" },
        { status: 400 }
      );
    }

    const result = await deleteCompany(companyId);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete company error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
