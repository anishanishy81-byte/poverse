import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "./firebase";

// Upload company logo
export async function uploadCompanyLogo(
  companyId: string,
  base64Data: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    // Extract the base64 content and mime type
    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    
    if (!matches || matches.length !== 3) {
      return { success: false, error: "Invalid image data" };
    }

    const mimeType = matches[1];
    const base64Content = matches[2];
    
    // Determine file extension from mime type
    let extension = "png";
    if (mimeType.includes("jpeg") || mimeType.includes("jpg")) {
      extension = "jpg";
    } else if (mimeType.includes("gif")) {
      extension = "gif";
    } else if (mimeType.includes("webp")) {
      extension = "webp";
    }

    // Convert base64 to blob
    const byteCharacters = atob(base64Content);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });

    // Create storage reference
    const fileName = `company-logos/${companyId}/logo.${extension}`;
    const storageRef = ref(storage, fileName);

    // Upload the file
    await uploadBytes(storageRef, blob, {
      contentType: mimeType,
    });

    // Get the download URL
    const downloadURL = await getDownloadURL(storageRef);

    return { success: true, url: downloadURL };
  } catch (error) {
    console.error("Error uploading logo:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: `Failed to upload logo: ${errorMessage}` };
  }
}

// Delete company logo
export async function deleteCompanyLogo(
  companyId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Try to delete common extensions
    const extensions = ["png", "jpg", "gif", "webp"];
    
    for (const ext of extensions) {
      try {
        const fileName = `company-logos/${companyId}/logo.${ext}`;
        const storageRef = ref(storage, fileName);
        await deleteObject(storageRef);
        return { success: true };
      } catch {
        // File doesn't exist with this extension, try next
        continue;
      }
    }

    return { success: true }; // No logo found to delete
  } catch (error) {
    console.error("Error deleting logo:", error);
    return { success: false, error: "Failed to delete logo" };
  }
}
