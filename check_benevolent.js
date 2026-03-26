const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'http://supabasekong-no4cks4gcosokswwk8ogw44s.141.11.160.187.sslip.io';
const supabaseKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc3MzY0NDI4MCwiZXhwIjo0OTI5MzE3ODgwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.Q5Uqb6mokg6Wgr6WdtCdyOuGc-PT3lNg-KjeT6YnaIA';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: novel } = await supabase.from('nu_novels').select('id, title, status').ilike('title', '%Benevolent Curse%').single();
  console.log('Novel:', novel);
  
  if (novel) {
    const { data: chapters } = await supabase.from('nu_chapter_content').select('chapter_number, word_count_original, translation_status').eq('novel_id', novel.id).limit(3);
    console.log('Chapters:', chapters);
  }
}

check();
