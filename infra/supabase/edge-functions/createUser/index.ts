
// infra/supabase/edge-functions/createUser/index.ts
// NOTE: Imports commented out to prevent frontend bundler errors. Uncomment for Deno deployment.
// import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
// import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export {};

declare const Deno: any;

// Polyfill Deno for browser safety (prevents crash on load)
const SafeDeno = typeof Deno !== 'undefined' ? Deno : { env: { get: () => '' } };

// Mock for frontend safety
const serve = (handler: any) => {}; 
const createClient = (url: string, key: string) => ({ from: () => ({ insert: () => ({ select: () => ({ single: () => ({}) }) }) }), rpc: () => {} });

const SUPABASE_URL = SafeDeno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = SafeDeno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req: any) => {
  try {
    const body = await req.json();
    const { name, email, role, balance_bigint, issuer_id } = body;

    // validate role and issuer
    if (!['SuperAdmin','Vendedor','Cliente'].includes(role)) throw new Error('invalid role');

    // create app_user row (auth linkage must be managed separately)
    const { data, error } = await (supabase as any)
      .from('app_users')
      .insert([{ name, email, role, balance_bigint: balance_bigint ?? 0, issuer_id }])
      .select()
      .single();

    if (error) throw error;

    // audit
    await (supabase as any).rpc('audit.log_action', {
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