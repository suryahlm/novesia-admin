import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Default config values
const DEFAULT_CONFIG = {
  // Absen Harian — koin per hari (7 hari)
  daily_checkin_rewards: [10, 20, 30, 40, 50, 60, 70],
  // Referral bonus
  referral_bonus: 50,
  // Watch ad reward
  watch_ad_reward: 40,
  // Interstitial ad interval (setiap N chapter)
  ad_interval_chapters: 5,
};

// GET — Fetch all config
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('nu_app_config')
      .select('key, value')
      .order('key');

    if (error) throw error;

    // Merge defaults with stored values
    const config = { ...DEFAULT_CONFIG };
    if (data) {
      for (const row of data) {
        try {
          (config as any)[row.key] = JSON.parse(row.value);
        } catch {
          (config as any)[row.key] = row.value;
        }
      }
    }

    return NextResponse.json(config);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT — Update config
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();

    // Upsert each key-value pair
    const upserts = Object.entries(body).map(([key, value]) => ({
      key,
      value: JSON.stringify(value),
      updated_at: new Date().toISOString(),
    }));

    for (const item of upserts) {
      const { error } = await supabase
        .from('nu_app_config')
        .upsert(item, { onConflict: 'key' });

      if (error) throw error;
    }

    return NextResponse.json({ success: true, updated: upserts.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
