import { NextResponse } from 'next/server';
import { Client } from 'ssh2';

const SCRAPER_CONFIG: Record<string, { cmd: string, name: string }> = {
  'novelworld': {
    cmd: 'cd /root/novesia-scraper && /usr/bin/node novelworld_cron.js',
    name: 'Novelworld'
  },
  'talesinthevalley': {
    cmd: 'cd /root/novesia-scraper && /usr/bin/node titv_cron.js',
    name: 'TalesInTheValley'
  },
  '98novels': {
    cmd: 'cd /root/novesia-scraper && /usr/bin/node 98novels_cron.js',
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

    return new Promise((resolve, reject) => {
      const conn = new Client();
      
      // Kita bungkus target eksekusinya dengan nohup agar berjalan di background Server 
      // bahkan ketika koneksi SSH kita langsung ditutup sepersekian detik kemudian.
      const runCmd = `nohup bash -c "${script.cmd} > /var/log/scraper_trigger_${source}.log 2>&1" &`;

      conn.on('ready', () => {
        conn.exec(runCmd, (err, stream) => {
          if (err) {
            conn.end();
            return resolve(NextResponse.json({ error: err.message }, { status: 500 }));
          }
          
          // Sukses dieksekusi di background VPS
          // Langsung tutup koneksi dan respons OK ke front-end 
          conn.end();
          
          resolve(NextResponse.json({ 
            success: true, 
            message: `Scraper ${script.name} berhasil diluncurkan ke Server Utama. Mohon tunggu notifikasi WhatsApp masuk!` 
          }));
        });
      }).on('error', (err) => {
        resolve(NextResponse.json({ error: 'Gagal menembus VPS Master: ' + err.message }, { status: 500 }));
      }).connect({
        host: '141.11.160.187',
        port: 22,
        username: 'root',
        password: 'Surya123!' // Hardcoded for this internal tool only, ideally in .env
      });
    });

  } catch (error: any) {
    console.error('Trigger Scraper Error:', error);
    return NextResponse.json({ error: error.message || 'Terjadi kesalahan sistem.' }, { status: 500 });
  }
}
