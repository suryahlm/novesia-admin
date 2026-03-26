const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: novel } = await supabase.from('nu_novels').select('id, title, status').ilike('title', '%Domineering Sponsor%').single();
  console.log('Novel:', novel);
  
  if (novel) {
    const { data: chapters } = await supabase.from('nu_chapter_content').select('chapter_number, word_count_original, translation_status').eq('novel_id', novel.id).order('chapter_number', { ascending: true }).limit(10);
    console.log('Sample Chapters:', chapters);
  }
}

check();
