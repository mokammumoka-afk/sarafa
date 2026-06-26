// supabase/functions/create-deposit/index.ts
// Called by the logged-in user from the app. Creates a pending transaction
// row and asks GPAY for a payment request + QR code.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { gpayFromEnv } from '../_shared/gpay.service.ts';

Deno.serve(async (req) => {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'غير مصرح' }, 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) return json({ error: 'غير مصرح' }, 401);

    const { amount_lyd } = await req.json();
    const amount = Number(amount_lyd);
    if (!amount || amount <= 0) return json({ error: 'مبلغ غير صالح' }, 400);

    // Read limits from settings table
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: settingsRow } = await admin.from('settings').select('value').eq('key', 'deposit_limits').maybeSingle();
    const limits = settingsRow?.value || { min: 50, max: 10000 };
    if (amount < limits.min || amount > limits.max) {
      return json({ error: `المبلغ يجب أن يكون بين ${limits.min} و ${limits.max} د.ل` }, 400);
    }

    const gpay = gpayFromEnv();
    const referenceNo = `DEP-${user.id.slice(0, 8)}-${Date.now()}`;
    const gpayResponse = await gpay.createPaymentRequest(amount, referenceNo, 'شحن محفظة');

    const { data: txn, error: insertErr } = await admin
      .from('transactions')
      .insert({
        user_id: user.id,
        type: 'deposit',
        amount_lyd: amount,
        status: 'pending',
        gpay_request_id: gpayResponse.request_id,
        gpay_reference: referenceNo,
        gpay_qr_code: gpayResponse.qr_code
      })
      .select()
      .single();

    if (insertErr) return json({ error: insertErr.message }, 500);

    return json({ transaction: txn, gpay: gpayResponse });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
