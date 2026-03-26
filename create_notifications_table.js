/**
 * Create nu_notifications table in Supabase
 */
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'http://supabasekong-no4cks4gcosokswwk8ogw44s.141.11.160.187.sslip.io';
const supabaseKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc3MzY0NDI4MCwiZXhwIjo0OTI5MzE3ODgwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.Q5Uqb6mokg6Wgr6WdtCdyOuGc-PT3lNg-KjeT6YnaIA';
const supabase = createClient(supabaseUrl, supabaseKey);

async function createTable() {
  const { error } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS nu_notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'info',
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      -- Deactivate old notifications when a new one is created
      COMMENT ON TABLE nu_notifications IS 'Admin notifications for Novesia app';
    `
  });

  if (error) {
    console.log('RPC not available, trying direct SQL...');
    // Try creating via REST API
    // First check if table exists
    const { data } = await supabase.from('nu_notifications').select('id').limit(1);
    if (data !== null) {
      console.log('Table already exists!');
      return;
    }
    
    // Table doesn't exist, try insert to auto-create (won't work)
    // We need to create it via SQL directly
    console.log('Need to create table via SQL. Using migration approach...');
    
    // Use raw fetch to Supabase SQL endpoint
    const sqlRes = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        sql: `CREATE TABLE IF NOT EXISTS nu_notifications (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          type TEXT NOT NULL DEFAULT 'info',
          is_active BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );`
      })
    });
    
    if (!sqlRes.ok) {
      const errBody = await sqlRes.text();
      console.log('SQL exec failed:', errBody);
      console.log('\n📝 Please run this SQL manually in Supabase SQL editor:');
      console.log(`
CREATE TABLE IF NOT EXISTS nu_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
      `);
    } else {
      console.log('✅ Table created!');
    }
  } else {
    console.log('✅ Table created via RPC!');
  }
}

createTable().catch(console.error);
