// infra/supabase/edge-functions/ledgerTransaction/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

declare const Deno: any;

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req: any) => {
  try {
    const { user_id, amount_bigint, type, reference_id, actor_id } = await req.json();

    // transaction via RPC function to ensure atomic update
    const { error } = await supabase.rpc('ledger.perform_transaction', {
      p_user_id: user_id,
      p_amount: amount_bigint,
      p_type: type,
      p_reference_id: reference_id,
      p_actor: actor_id
    });

    if (error) throw error;

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err:any) {
    return new Response(JSON.stringify({ message: err.message }), { status: 400 });
  }
});