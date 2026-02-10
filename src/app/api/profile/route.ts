import { NextRequest, NextResponse } from "next/server";
import { getUserByUsername, updateUser, verifyPassword, hashPassword } from "@/lib/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { uploadProfilePicture, deleteProfilePicture } from "@/lib/storage";
import { isStaticExportBuild, getStaticExportResponse } from "@/lib/staticExport";

const USERS_COLLECTION = "users";
export const dynamic = "force-static";

// Get current user profile
export async function GET(request: NextRequest) {
  if (isStaticExportBuild) return getStaticExportResponse();
  try {
    const userId = request.headers.get("x-user-id");

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userRef = doc(db, USERS_COLLECTION, userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    const userData = userSnap.data();
    
    return NextResponse.json({
      success: true,
      user: {
        id: userSnap.id,
        username: userData.username,
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        city: userData.city,
        state: userData.state,
        country: userData.country,
        role: userData.role,
        companyId: userData.companyId,
        createdAt: userData.createdAt,
        isActive: userData.isActive,
        profilePicture: userData.profilePicture || null,
      },
    });
  } catch (error) {
    console.error("Get profile error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Update user profile
export async function PUT(request: NextRequest) {
  if (isStaticExportBuild) return getStaticExportResponse();
  try {
    const userId = request.headers.get("x-user-id");

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, email, phone, city, state, country, profilePicture } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: "Name is required" },
        { status: 400 }
      );
    }

    // Handle profile picture upload if provided
    let profilePictureUrl: string | undefined;
    if (profilePicture && profilePicture.startsWith("data:image")) {
      const uploadResult = await uploadProfilePicture(userId, profilePicture);
      if (uploadResult.success && uploadResult.url) {
        profilePictureUrl = uploadResult.url;
      } else {
        return NextResponse.json(
          { success: false, error: uploadResult.error || "Failed to upload profile picture" },
          { status: 400 }
        );
      }
    }

    const updateData: Record<string, string | undefined> = {
      name,
      email,
      phone,
      city,
      state,
      country,
    };

    // Only add profilePicture to update if it was uploaded
    if (profilePictureUrl) {
      updateData.profilePicture = profilePictureUrl;
    }

    const result = await updateUser(userId, updateData);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      user: result.user,
      profilePicture: profilePictureUrl || result.user?.profilePicture 
    });
  } catch (error) {
    console.error("Update profile error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Change password
export async function PATCH(request: NextRequest) {
  if (isStaticExportBuild) return getStaticExportResponse();
  try {
    const userId = request.headers.get("x-user-id");

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { currentPassword, newPassword, confirmPassword } = body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { success: false, error: "All password fields are required" },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: "New password must be at least 6 characters" },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { success: false, error: "New passwords do not match" },
        { status: 400 }
      );
    }

    // Get user to verify current password
    const userRef = doc(db, USERS_COLLECTION, userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    const userData = userSnap.data();
    
    // Verify current password
    const isValid = await verifyPassword(currentPassword, userData.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: "Current password is incorrect" },
        { status: 400 }
      );
    }

    // Hash new password and update
    const newPasswordHash = await hashPassword(newPassword);
    await updateDoc(userRef, { passwordHash: newPasswordHash });

    return NextResponse.json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    console.error("Change password error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
