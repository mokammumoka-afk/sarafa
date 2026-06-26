// supabase/functions/admin-withdraw/index.ts
// Called by an admin from /admin to actually push money to a user's GPAY wallet,
// then marks the withdrawal transaction completed via the confirm_withdraw() RPC.
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: 'غير مصرح' }, 401);

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: profile } = await admin.from('profiles').select('is_admin').eq('id', user.id).single();
    if (!profile?.is_admin) return json({ error: 'صلاحيات غير كافية' }, 403);

    const { transaction_id, note } = await req.json();
    const { data: txn } = await admin
      .from('transactions')
      .select('id, user_id, amount_lyd, status, type')
      .eq('id', transaction_id)
      .single();

    if (!txn || txn.type !== 'withdraw' || txn.status !== 'pending') {
      return json({ error: 'معاملة غير صالحة' }, 400);
    }

    const { data: targetProfile } = await admin
      .from('profiles')
      .select('gpay_wallet_id, gpay_number')
      .eq('id', txn.user_id)
      .single();

    if (!targetProfile?.gpay_wallet_id) {
      return json({ error: 'لا يوجد رقم محفظة GPAY مسجل لهذا المستخدم' }, 400);
    }

    const gpay = gpayFromEnv();
    const result = await gpay.sendMoney(
      txn.amount_lyd,
      targetProfile.gpay_wallet_id,
      `WDR-${txn.id.slice(0, 8)}`,
      'سحب من محفظة الصرافة'
    );

    const { error: rpcError } = await admin.rpc('confirm_withdraw', {
      p_transaction_id: txn.id,
      p_admin_id: user.id,
      p_gpay_transaction_id: result.transaction_id ?? null,
      p_admin_note: note ?? null
    });

    if (rpcError) return json({ error: rpcError.message }, 500);

    return json({ success: true, gpay: result });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
