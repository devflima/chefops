/* eslint-disable */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabase.from('orders').insert({
    tenant_id: 'a872cc8b-5975-4704-8b63-1250de4859f5', // Replace with a valid tenant_id from your DB if needed, or it might just fail with foreign key
    customer_name: 'Test',
    customer_phone: '11999999999',
    payment_method: 'delivery',
    payment_status: 'pending',
    subtotal: 10,
    delivery_fee: 0,
    total: 10,
    items: [],
  }).select();
  console.log('Error:', error);
}
run();
