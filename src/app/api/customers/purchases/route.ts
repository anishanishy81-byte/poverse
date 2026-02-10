import { NextRequest, NextResponse } from "next/server";
import { addPurchase, getPurchases, deletePurchase } from "@/lib/customer";
import { PurchaseFormData } from "@/types/customer";
import { isStaticExportBuild, getStaticExportResponse } from "@/lib/staticExport";

export const dynamic = "force-static";

// GET - Fetch purchases for a customer
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

    const result = await getPurchases(customerId);
    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/customers/purchases error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Add purchase
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

    const purchaseData: PurchaseFormData = {
      productName: data.productName,
      quantity: data.quantity,
      unitPrice: data.unitPrice,
      purchaseDate: data.purchaseDate,
      notes: data.notes,
    };

    const result = await addPurchase(customerId, purchaseData, agentId, agentName);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, purchase: result.purchase });
  } catch (error) {
    console.error("POST /api/customers/purchases error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Delete purchase
export async function DELETE(request: NextRequest) {
  if (isStaticExportBuild) return getStaticExportResponse();
  try {
    const searchParams = request.nextUrl.searchParams;
    const purchaseId = searchParams.get("purchaseId");
    const customerId = searchParams.get("customerId");
    const amount = searchParams.get("amount");

    if (!purchaseId || !customerId || !amount) {
      return NextResponse.json(
        { success: false, error: "Purchase ID, Customer ID, and amount required" },
        { status: 400 }
      );
    }

    const result = await deletePurchase(purchaseId, customerId, parseFloat(amount));

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/customers/purchases error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
