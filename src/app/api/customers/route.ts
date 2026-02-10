import { NextRequest, NextResponse } from "next/server";
import {
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
  getCustomerStats,
  getAllTags,
  addTagToCustomer,
  removeTagFromCustomer,
} from "@/lib/customer";
import { CustomerFormData, CustomerFilters } from "@/types/customer";
import { isStaticExportBuild, getStaticExportResponse } from "@/lib/staticExport";

export const dynamic = "force-static";

// GET - Fetch customers or a single customer
export async function GET(request: NextRequest) {
  if (isStaticExportBuild) return getStaticExportResponse();
  try {
    const searchParams = request.nextUrl.searchParams;
    const customerId = searchParams.get("customerId");
    const companyId = searchParams.get("companyId");
    const action = searchParams.get("action");

    // Get single customer
    if (customerId) {
      const result = await getCustomerById(customerId);
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 404 });
      }
      return NextResponse.json({ success: true, customer: result.customer });
    }

    // Get stats
    if (action === "stats" && companyId) {
      const result = await getCustomerStats(companyId);
      return NextResponse.json(result);
    }

    // Get all tags
    if (action === "tags" && companyId) {
      const result = await getAllTags(companyId);
      return NextResponse.json(result);
    }

    // Get customers list
    if (!companyId) {
      return NextResponse.json({ success: false, error: "Company ID required" }, { status: 400 });
    }

    const filters: CustomerFilters = {
      status: searchParams.get("status") || undefined,
      priority: searchParams.get("priority") || undefined,
      category: searchParams.get("category") || undefined,
      searchQuery: searchParams.get("search") || undefined,
      agentId: searchParams.get("agentId") || undefined,
    };

    const tagsParam = searchParams.get("tags");
    if (tagsParam) {
      filters.tags = tagsParam.split(",");
    }

    const result = await getCustomers(companyId, filters);
    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/customers error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

// POST - Create customer
export async function POST(request: NextRequest) {
  if (isStaticExportBuild) return getStaticExportResponse();
  try {
    const body = await request.json();
    const { companyId, data, createdBy } = body;

    if (!companyId || !data || !createdBy) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const formData: CustomerFormData = {
      name: data.name,
      businessName: data.businessName,
      type: data.type || "individual",
      category: data.category,
      contact: data.contact || {},
      tags: data.tags || [],
      status: data.status || "prospect",
      priority: data.priority || "medium",
      location: data.location,
    };

    const result = await createCustomer(companyId, formData, createdBy);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, customer: result.customer });
  } catch (error) {
    console.error("POST /api/customers error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

// PUT - Update customer
export async function PUT(request: NextRequest) {
  if (isStaticExportBuild) return getStaticExportResponse();
  try {
    const body = await request.json();
    const { customerId, data, action, tag } = body;

    if (!customerId) {
      return NextResponse.json({ success: false, error: "Customer ID required" }, { status: 400 });
    }

    // Handle tag operations
    if (action === "addTag" && tag) {
      const result = await addTagToCustomer(customerId, tag);
      return NextResponse.json(result);
    }

    if (action === "removeTag" && tag) {
      const result = await removeTagFromCustomer(customerId, tag);
      return NextResponse.json(result);
    }

    // Regular update
    if (!data) {
      return NextResponse.json({ success: false, error: "Update data required" }, { status: 400 });
    }

    const result = await updateCustomer(customerId, data);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PUT /api/customers error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

// DELETE - Delete customer
export async function DELETE(request: NextRequest) {
  if (isStaticExportBuild) return getStaticExportResponse();
  try {
    const searchParams = request.nextUrl.searchParams;
    const customerId = searchParams.get("customerId");

    if (!customerId) {
      return NextResponse.json({ success: false, error: "Customer ID required" }, { status: 400 });
    }

    const result = await deleteCustomer(customerId);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/customers error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
