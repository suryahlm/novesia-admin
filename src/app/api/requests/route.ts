import { NextRequest, NextResponse } from "next/server";
import { apiGet, apiPatch, apiDelete } from "@/lib/apiClient";

// GET: Ambil daftar request terjemahan & statistik
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "ALL";
    const search = searchParams.get("search") || "";
    const page = searchParams.get("page") || "1";
    const limit = searchParams.get("limit") || "50";

    const data = await apiGet<{
      items: any[];
      pagination: any;
      counts: any;
    }>("/api/translation-requests", {
      status,
      search,
      page,
      limit,
    });

    if (data?.items) {
      // Auto-detect item yang sudah 100% selesai dan sync ke backend jika belum COMPLETED
      for (const item of data.items) {
        const isFullyDone = item.total_chapters > 0 && item.translated_chapters >= item.total_chapters;
        if (isFullyDone && item.status !== "COMPLETED" && item.status !== "REJECTED") {
          item.status = "COMPLETED";
          // Trigger sync ke backend async tanpa memblokir response
          apiPatch(`/api/translation-requests/${item.id}`, { status: "COMPLETED" }).catch(() => {});
        }
      }

      // Hitung ulang count secara akurat dari data yang ada
      let pending = 0;
      let in_progress = 0;
      let completed = 0;
      let rejected = 0;

      for (const item of data.items) {
        if (item.status === "COMPLETED" || (item.total_chapters > 0 && item.translated_chapters >= item.total_chapters)) {
          completed++;
        } else if (item.status === "REJECTED") {
          rejected++;
        } else if (item.status === "IN_PROGRESS" || item.translated_chapters > 0) {
          in_progress++;
        } else {
          pending++;
        }
      }

      data.counts = {
        pending,
        in_progress,
        completed,
        rejected,
        total: data.items.length,
      };

      // Jika ada filter status spesifik, saring item sesuai effective status
      if (status && status !== "ALL") {
        data.items = data.items.filter((item) => {
          if (status === "COMPLETED") {
            return item.status === "COMPLETED" || (item.total_chapters > 0 && item.translated_chapters >= item.total_chapters);
          }
          if (status === "PENDING") {
            return item.status === "PENDING" && item.translated_chapters === 0;
          }
          if (status === "IN_PROGRESS") {
            return (item.status === "IN_PROGRESS" || item.translated_chapters > 0) && !(item.total_chapters > 0 && item.translated_chapters >= item.total_chapters);
          }
          return item.status === status;
        });
      }
    }

    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan server";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH: Update status request terjemahan
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ error: "ID dan status wajib diisi" }, { status: 400 });
    }

    const data = await apiPatch<any>(`/api/translation-requests/${id}`, { status });
    return NextResponse.json({ success: true, item: data?.item || data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal mengupdate status request";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE: Hapus request terjemahan
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID wajib disertakan" }, { status: 400 });
    }

    const res = await apiDelete<any>(`/api/translation-requests/${id}`);
    return NextResponse.json({ success: true, message: res?.message || "Berhasil dihapus" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal menghapus request";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
