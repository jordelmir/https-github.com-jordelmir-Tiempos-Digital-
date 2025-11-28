// infra/supabase/edge-functions/createUser/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

declare const Deno: any;

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req: any) => {
  try {
    const body = await req.json();
    const { name, email, role, balance_bigint, issuer_id } = body;

    // validate role and issuer
    if (!['SuperAdmin','Vendedor','Cliente'].includes(role)) throw new Error('invalid role');

    // create app_user row (auth linkage must be managed separately)
    const { data, error } = await supabase
      .from('app_users')
      .insert([{ name, email, role, balance_bigint: balance_bigint ?? 0, issuer_id }])
      .select()
      .single();

    if (error) throw error;

    // audit
    await supabase.rpc('audit.log_action', {
      actor: issuer_id,
      action: 'CREATE_USER',
      obj_type: 'app_users',
      obj_id: data.id,
      payload: JSON.stringify(data)
    });

    return new Response(JSON.stringify({ user: data }), { status: 201 });
  } catch (err:any) {
    return new Response(JSON.stringify({ message: err.message }), { status: 400 });
  }
});