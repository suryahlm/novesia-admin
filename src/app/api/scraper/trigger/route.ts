import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

const SCRAPER_CONFIG: Record<string, { cmd: string, args: string[], name: string }> = {
  'novelworld': {
    cmd: '/usr/bin/node',
    args: ['/root/novesia-scraper/novelworld_cron.js'],
    name: 'Novelworld'
  },
  'talesinthevalley': {
    cmd: '/usr/bin/node',
    args: ['/root/novesia-scraper/titv_cron.js'],
    name: 'TalesInTheValley'
  },
  '98novels': {
    cmd: '/usr/bin/node',
    args: ['/root/novesia-scraper/98novels_cron.js'],
    name: '98Novels'
  }
};

export async function POST(request: Request) {
  try {
    const { source } = await request.json();

    if (!source || !SCRAPER_CONFIG[source]) {
      return NextResponse.json({ error: 'Source scraper tidak ditemukan.' }, { status: 400 });
    }

    const script = SCRAPER_CONFIG[source];

    // Menggunakan spawn dengan opsi detached agar proses tetap berjalan di background
    // meskipun API request Next.js ini sudah mengembalikan response/selesai.
    const child = spawn(script.cmd, script.args, {
      detached: true,
      stdio: 'ignore' // Abaikan log output di terminal Next.js
    });

    // Lepaskan referensi supaya OS membiarkannya mandiri
    child.unref();

    return NextResponse.json({ 
      success: true, 
      message: `Scraper ${script.name} berhasil diluncurkan di background. Mohon tunggu notifikasi WhatsApp saat proses selesai.` 
    });

  } catch (error: any) {
    console.error('Trigger Scraper Error:', error);
    return NextResponse.json({ error: error.message || 'Terjadi kesalahan sistem.' }, { status: 500 });
  }
}
