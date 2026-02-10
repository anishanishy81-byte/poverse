import { NextRequest, NextResponse } from "next/server";
import { addNote, getNotes, updateNote, deleteNote } from "@/lib/customer";
import { isStaticExportBuild, getStaticExportResponse } from "@/lib/staticExport";

export const dynamic = "force-static";

// GET - Fetch notes for a customer
export async function GET(request: NextRequest) {
  if (isStaticExportBuild) return getStaticExportResponse();
  try {
    const searchParams = request.nextUrl.searchParams;
    const customerId = searchParams.get("customerId");

    if (!customerId) {
      return NextResponse.json(
        { success: false, error: "Customer ID required" },
        { status: 400 }
      );
    }

    const result = await getNotes(customerId);
    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/customers/notes error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Add note
export async function POST(request: NextRequest) {
  if (isStaticExportBuild) return getStaticExportResponse();
  try {
    const body = await request.json();
    const { customerId, content, agentId, agentName } = body;

    if (!customerId || !content || !agentId || !agentName) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const result = await addNote(customerId, content, agentId, agentName);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, note: result.note });
  } catch (error) {
    console.error("POST /api/customers/notes error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT - Update note
export async function PUT(request: NextRequest) {
  if (isStaticExportBuild) return getStaticExportResponse();
  try {
    const body = await request.json();
    const { noteId, content } = body;

    if (!noteId || !content) {
      return NextResponse.json(
        { success: false, error: "Note ID and content required" },
        { status: 400 }
      );
    }

    const result = await updateNote(noteId, content);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PUT /api/customers/notes error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Delete note
export async function DELETE(request: NextRequest) {
  if (isStaticExportBuild) return getStaticExportResponse();
  try {
    const searchParams = request.nextUrl.searchParams;
    const noteId = searchParams.get("noteId");

    if (!noteId) {
      return NextResponse.json(
        { success: false, error: "Note ID required" },
        { status: 400 }
      );
    }

    const result = await deleteNote(noteId);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/customers/notes error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
