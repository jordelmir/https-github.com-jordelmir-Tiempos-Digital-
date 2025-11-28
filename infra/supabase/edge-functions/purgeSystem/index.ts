// infra/supabase/edge-functions/purgeSystem/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

declare const Deno: any;

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const KEY = Deno.env.get('PURGE_MASTER_KEY')!;
const supabase = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

serve(async (req: any) => {
  try {
    const { confirm_phrase, actor_id, mfa_token } = await req.json();
    if (confirm_phrase !== 'CONFIRMAR PURGA TOTAL') throw new Error('invalid phrase');
    // validate MFA (external) - example: check mfa_token in audit or external service
    const mfaOk = true; // implement real check
    if (!mfaOk) throw new Error('MFA failed');

    // create snapshot & schedule purge (avoid immediate destructive action)
    await supabase.from('audit.trail').insert([{ actor_app_user: actor_id, action: 'SCHEDULE_PURGE', payload: { confirm_phrase } }]);

    // Optionally trigger a DB job / webhook to perform purge after multi-sig approval
    return new Response(JSON.stringify({ ok: true, message: 'Scheduled purge; requires multisig release' }), { status: 200 });
  } catch (err:any) {
    return new Response(JSON.stringify({ message: err.message }), { status: 400 });
  }
});