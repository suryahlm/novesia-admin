import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    // Extract platform info from Supabase auth.users metadata
    const userMetaMap = new Map<string, { platform: "web" | "app"; os?: string | null }>();
    let totalWeb = 0;
    let totalApp = 0;

    // Auto-sync missing users from Supabase Auth into nu_users table
    try {
      const { data: authData } = await supabase.auth.admin.listUsers();
      if (authData?.users && authData.users.length > 0) {
        for (const u of authData.users) {
          const meta = u.user_metadata || {};
          const raw = String(meta.platform || meta.registered_via || (u.email === "datakerja26@gmail.com" ? "app" : "web")).toLowerCase();
          const p: "web" | "app" = raw.includes("app") || raw.includes("android") || raw.includes("ios") ? "app" : "web";
          userMetaMap.set(u.id, { platform: p, os: meta.os || null });
          if (p === "app") {
            totalApp++;
          } else {
            totalWeb++;
          }
        }

        const { data: existingNuUsers } = await supabase.from("nu_users").select("id");
        const existingIds = new Set(existingNuUsers?.map((u) => u.id) || []);
        const missingUsers = authData.users.filter((u) => !existingIds.has(u.id));

        if (missingUsers.length > 0) {
          const toInsert = missingUsers.map((u) => {
            const meta = u.user_metadata || {};
            return {
              id: u.id,
              email: u.email || "",
              name: meta.name || u.email?.split("@")[0] || "User",
              avatar_url: meta.avatar_url || null,
              role: meta.role === "VIP" ? "VIP" : "USER",
              banned: false,
              frozen: false,
              created_at: u.created_at,
              updated_at: u.updated_at || u.created_at,
            };
          });
          await supabase.from("nu_users").upsert(toInsert, { onConflict: "id" });
        }
      }
    } catch (syncErr) {
      console.warn("[Users API] Auto-sync auth.users warning:", syncErr);
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(Number(searchParams.get("page")) || 1, 1);
    const limit = Math.min(Number(searchParams.get("limit")) || 30, 100);
    const q = (searchParams.get("q") || "").trim();
    const role = searchParams.get("role") || "ALL";
    const banned = searchParams.get("banned") || "ALL";
    const frozen = searchParams.get("frozen") || "ALL";
    const platform = (searchParams.get("platform") || "ALL").toUpperCase();

    const offset = (page - 1) * limit;

    // Base query for filtered rows
    let query = supabase.from("nu_users").select("*", { count: "exact" });

    if (q) {
      query = query.or(`name.ilike.%${q}%,email.ilike.%${q}%`);
    }
    if (role && role !== "ALL") {
      query = query.eq("role", role);
    }
    if (banned === "true") {
      query = query.eq("banned", true);
    } else if (banned === "false") {
      query = query.eq("banned", false);
    }
    if (frozen === "true") {
      query = query.eq("frozen", true);
    } else if (frozen === "false") {
      query = query.eq("frozen", false);
    }

    const { data: rawRows, count: total, error } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    // Attach platform to each row
    let rows = (rawRows || []).map((r) => {
      const meta = userMetaMap.get(r.id);
      const userPlatform = meta?.platform || (r.email === "datakerja26@gmail.com" ? "app" : "web");
      return {
        ...r,
        platform: userPlatform,
        os: meta?.os || null,
      };
    });

    if (platform === "APP") {
      rows = rows.filter((r) => r.platform === "app");
    } else if (platform === "WEB") {
      rows = rows.filter((r) => r.platform === "web");
    }

    // Grand total (semua user tanpa filter)
    const { count: grandTotal } = await supabase
      .from("nu_users")
      .select("*", { count: "exact", head: true });

    // User baru 7 hari terakhir
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { count: newLast7Days } = await supabase
      .from("nu_users")
      .select("*", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgo);

    return NextResponse.json({
      total: platform !== "ALL" ? rows.length : (total || 0),
      grandTotal: grandTotal || 0,
      totalWeb: totalWeb || (grandTotal && totalApp ? grandTotal - totalApp : 0),
      totalApp: totalApp || 0,
      newLast7Days: newLast7Days || 0,
      page,
      limit,
      rows,
    });
  } catch (err: any) {
    console.error("Users list API error:", err);
    return NextResponse.json({ error: err.message || "Gagal memuat data pengguna" }, { status: 500 });
  }
}
