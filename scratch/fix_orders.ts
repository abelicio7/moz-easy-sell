import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

const emails = ['salomao.chamusse@gmail.com', 'ilidioxaviar@gmail.com'];

for (const email of emails) {
  console.log(`Processing ${email}...`);
  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, status')
    .eq('customer_email', email)
    .neq('status', 'paid')
    .order('created_at', { ascending: false });

  if (error) {
    console.error(`Error fetching orders for ${email}:`, error);
    continue;
  }

  if (!orders || orders.length === 0) {
    console.log(`No unpaid orders found for ${email}`);
    continue;
  }

  for (const order of orders) {
    console.log(`Updating order ${order.id} for ${email}...`);
    const { error: updErr } = await supabase
      .from('orders')
      .update({ status: 'paid' })
      .eq('id', order.id);

    if (updErr) {
      console.error(`Error updating order ${order.id}:`, updErr);
      continue;
    }

    console.log(`Triggering delivery for order ${order.id}...`);
    try {
      const { data, error: invErr } = await supabase.functions.invoke('process-order-delivery', {
        body: { id: order.id }
      });
      if (invErr) console.error(`Error invoking delivery for ${order.id}:`, invErr);
      else console.log(`Delivery triggered for ${order.id}:`, data);
    } catch (e) {
      console.error(`Failed to invoke delivery for ${order.id}:`, e);
    }
  }
}
