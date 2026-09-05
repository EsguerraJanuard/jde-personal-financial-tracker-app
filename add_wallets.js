require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const { error } = await supabase.from('wallets').insert([
    { name: 'GCash', group_type: 'Frequent' },
    { name: 'GoTyme', group_type: 'Frequent' }
  ]);
  if (error) console.error(error);
  else console.log('Successfully added GCash and GoTyme!');
}

run();
