const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'http://supabasekong-no4cks4gcosokswwk8ogw44s.141.11.160.187.sslip.io';
const supabaseKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc3MzY0NDI4MCwiZXhwIjo0OTI5MzE3ODgwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.Q5Uqb6mokg6Wgr6WdtCdyOuGc-PT3lNg-KjeT6YnaIA';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: drafts } = await supabase.from('nu_novels').select('id, title, status').eq('status', 'draft');
  console.log('Draft Novels found in DB:', drafts?.length || 0);
  if (drafts && drafts.length > 0) {
    console.log('First 3 drafts:', drafts.slice(0, 3));
  }
}

check();
