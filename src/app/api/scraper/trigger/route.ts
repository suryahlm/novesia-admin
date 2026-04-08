import { NextResponse } from 'next/server';

const SCRAPER_NAMES: Record<string, string> = {
  'novelworld': 'Novelworld',
  'talesinthevalley': 'TalesInTheValley',
  '98novels': '98Novels',
  'tinytranslation': 'TinyTranslation'
};

const TRIGGER_URL = 'http://141.11.160.187:9898/trigger';
const TRIGGER_SECRET = 'novesia-trigger-2026';

export async function POST(request: Request) {
  try {
    const { source } = await request.json();

    if (!source || !SCRAPER_NAMES[source]) {
      return NextResponse.json({ error: 'Source scraper tidak ditemukan.' }, { status: 400 });
    }

    const name = SCRAPER_NAMES[source];

    // Panggil micro trigger server yang berjalan di VPS host
    const res = await fetch(TRIGGER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source, secret: TRIGGER_SECRET }),
      signal: AbortSignal.timeout(10000), // 10 detik timeout
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: data.error || 'Trigger server menolak request.' },
        { status: res.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: data.message || `Scraper ${name} berhasil diluncurkan. Tunggu notifikasi WhatsApp!`
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Terjadi kesalahan sistem.';
    console.error('Trigger Scraper Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
