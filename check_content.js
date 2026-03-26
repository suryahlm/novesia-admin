const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'http://supabasekong-no4cks4gcosokswwk8ogw44s.141.11.160.187.sslip.io';
const supabaseKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc3MzY0NDI4MCwiZXhwIjo0OTI5MzE3ODgwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.Q5Uqb6mokg6Wgr6WdtCdyOuGc-PT3lNg-KjeT6YnaIA';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: novel } = await supabase.from('nu_novels').select('id').ilike('title', '%Domineering Sponsor%').single();
  if (novel) {
    const { data: chapter } = await supabase.from('nu_chapter_content').select('content_original, content_translated').eq('novel_id', novel.id).eq('chapter_number', 1).single();
    console.log('Chapter 1 content:', {
      has_original: !!chapter?.content_original,
      len_original: chapter?.content_original?.length,
      has_translated: !!chapter?.content_translated,
      len_translated: chapter?.content_translated?.length
    });
  }
}

check();
