import { NextRequest, NextResponse } from "next/server";
import { createUser, getAllUsers, updateUser, deleteUser } from "@/lib/auth";
import { getCompanyById } from "@/lib/company";
import { UserRole, CreateUserData } from "@/types/auth";
import { isStaticExportBuild, getStaticExportResponse } from "@/lib/staticExport";

export const dynamic = "force-static";

// Get all users
export async function GET(request: NextRequest) {
  if (isStaticExportBuild) return getStaticExportResponse();
  try {
    // Get the user role from the request headers (set by middleware or client)
    const userRole = request.headers.get("x-user-role") as UserRole;
    const userId = request.headers.get("x-user-id");

    if (!userRole || !userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Only superadmin and admin can view users
    if (userRole !== "superadmin" && userRole !== "admin") {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId");

    // Get users filtered by companyId if provided
    const users = await getAllUsers(companyId || undefined);

    // Filter users based on role permissions
    let filteredUsers = users;
    if (userRole === "admin") {
      // Admin can see all users in their company (both admins and agents)
      filteredUsers = users.filter((u) => u.role !== "superadmin");
    } else if (userRole === "superadmin") {
      // Superadmin can see all users
      filteredUsers = users;
    }

    return NextResponse.json({ success: true, users: filteredUsers });
  } catch (error) {
    console.error("Get users error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Create new user
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

    // Only superadmin and admin can create users
    if (userRole !== "superadmin" && userRole !== "admin") {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { username, password, name, role, email, phone, companyId } = body as CreateUserData;

    if (!username || !password || !name || !role) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate role permissions
    if (userRole === "admin" && role === "superadmin") {
      return NextResponse.json(
        { success: false, error: "Admins cannot create superadmins" },
        { status: 403 }
      );
    }

    // Admins can only create agents/users, not other admins
    if (userRole === "admin" && role === "admin") {
      return NextResponse.json(
        { success: false, error: "Admins can only create agents (users), not other admins" },
        { status: 403 }
      );
    }

    if (userRole === "superadmin" && role === "superadmin") {
      return NextResponse.json(
        { success: false, error: "Cannot create another superadmin" },
        { status: 403 }
      );
    }

    // Check user limit for the company
    if (companyId) {
      const company = await getCompanyById(companyId);
      if (company) {
        const currentUserCount = company.adminCount + company.agentCount;
        if (currentUserCount >= company.userLimit) {
          return NextResponse.json(
            { success: false, error: `User limit reached (${company.userLimit}). Cannot create more users for this company.` },
            { status: 400 }
          );
        }
      }
    }

    const result = await createUser(
      { username, password, name, role, email, phone, companyId },
      userId
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, user: result.user });
  } catch (error) {
    console.error("Create user error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Update user
export async function PUT(request: NextRequest) {
  if (isStaticExportBuild) return getStaticExportResponse();
  try {
    const userRole = request.headers.get("x-user-role") as UserRole;
    const currentUserId = request.headers.get("x-user-id");

    if (!userRole || !currentUserId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { userId, ...updates } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "User ID is required" },
        { status: 400 }
      );
    }

    // Only superadmin can update anyone, admin can only update users
    if (userRole !== "superadmin" && userRole !== "admin") {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    const result = await updateUser(userId, updates);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update user error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Delete user
export async function DELETE(request: NextRequest) {
  if (isStaticExportBuild) return getStaticExportResponse();
  try {
    const userRole = request.headers.get("x-user-role") as UserRole;
    const currentUserId = request.headers.get("x-user-id");

    if (!userRole || !currentUserId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "User ID is required" },
        { status: 400 }
      );
    }

    // Only superadmin can delete users
    if (userRole !== "superadmin") {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    // Cannot delete yourself
    if (userId === currentUserId) {
      return NextResponse.json(
        { success: false, error: "Cannot delete yourself" },
        { status: 400 }
      );
    }

    const result = await deleteUser(userId);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete user error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
