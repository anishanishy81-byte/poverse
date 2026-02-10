import { NextRequest, NextResponse } from "next/server";
import {
  addInteraction,
  getInteractions,
  deleteInteraction,
} from "@/lib/customer";
import { InteractionFormData } from "@/types/customer";
import { isStaticExportBuild, getStaticExportResponse } from "@/lib/staticExport";

export const dynamic = "force-static";

// GET - Fetch interactions for a customer
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

    const result = await getInteractions(customerId);
    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/customers/interactions error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Add interaction
export async function POST(request: NextRequest) {
  if (isStaticExportBuild) return getStaticExportResponse();
  try {
    const body = await request.json();
    const { customerId, data, agentId, agentName } = body;

    if (!customerId || !data || !agentId || !agentName) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const interactionData: InteractionFormData = {
      type: data.type,
      description: data.description,
      outcome: data.outcome,
      nextFollowUp: data.nextFollowUp,
    };

    const result = await addInteraction(customerId, interactionData, agentId, agentName);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, interaction: result.interaction });
  } catch (error) {
    console.error("POST /api/customers/interactions error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Delete interaction
export async function DELETE(request: NextRequest) {
  if (isStaticExportBuild) return getStaticExportResponse();
  try {
    const searchParams = request.nextUrl.searchParams;
    const interactionId = searchParams.get("interactionId");
    const customerId = searchParams.get("customerId");

    if (!interactionId || !customerId) {
      return NextResponse.json(
        { success: false, error: "Interaction ID and Customer ID required" },
        { status: 400 }
      );
    }

    const result = await deleteInteraction(interactionId, customerId);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/customers/interactions error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
