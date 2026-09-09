import { apiGet } from "@/lib/apiClient";
import { NextRequest, NextResponse } from "next/server";

// GET: Fetch chapters for a novel (by novel ID or slug)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ novelId: string }> }
) {
  const { novelId } = await params;
  const includeContent = req.nextUrl.searchParams.get("includeContent") === "true";
  try {
    const query: Record<string, string> = { all: "true" };
    if (includeContent) {
      query.includeContent = "true";
    }
    const data = await apiGet<any>(`/api/chapters/${novelId}`, query);
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
