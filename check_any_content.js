const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'http://supabasekong-no4cks4gcosokswwk8ogw44s.141.11.160.187.sslip.io';
const supabaseKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc3MzY0NDI4MCwiZXhwIjo0OTI5MzE3ODgwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.Q5Uqb6mokg6Wgr6WdtCdyOuGc-PT3lNg-KjeT6YnaIA';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: chapters } = await supabase.from('nu_chapter_content')
    .select('id, novel_id, content_original')
    .not('content_original', 'is', null)
    .neq('content_original', '')
    .limit(5);
    
  console.log('Chapters with content found:', chapters?.length || 0);
  if (chapters && chapters.length > 0) {
    const { data: novel } = await supabase.from('nu_novels').select('title').eq('id', chapters[0].novel_id).single();
    console.log('Found content for novel:', novel?.title);
  } else {
      console.log('NO CHAPTERS HAVE CONTENT!');
  }
}

check();
