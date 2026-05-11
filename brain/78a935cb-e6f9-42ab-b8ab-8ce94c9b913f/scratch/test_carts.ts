import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

const { count, error } = await supabase
  .from('carts')
  .select('*', { count: 'exact', head: true })

if (error) {
  console.error("Carts table error:", error.message)
} else {
  console.log("Carts table exists. Count:", count)
}
