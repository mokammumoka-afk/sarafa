// supabase/functions/check-pending-deposits/index.ts
// Schedule this with Supabase Cron (pg_cron -> http call) every 30 seconds–1 min.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { gpayFromEnv } from '../_shared/gpay.service.ts';

Deno.serve(async () => {
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const gpay = gpayFromEnv();

    const { data: pendingDeposits } = await supabase
      .from('transactions')
      .select('id, user_id, amount_lyd, gpay_request_id, created_at')
      .eq('type', 'deposit')
      .eq('status', 'pending')
      .not('gpay_request_id', 'is', null);

    if (!pendingDeposits?.length) {
      return json({ message: 'لا توجد طلبات شحن معلقة' });
    }

    const results = [];
    for (const deposit of pendingDeposits) {
      try {
        const status = await gpay.checkPaymentStatus(deposit.gpay_request_id);

        if (status.is_paid) {
          const { error } = await supabase.rpc('confirm_deposit', {
            p_transaction_id: deposit.id,
            p_user_id: deposit.user_id,
            p_amount_lyd: deposit.amount_lyd,
            p_gpay_transaction_id: status.transaction_id,
            p_admin_id: null
          });
          results.push({ id: deposit.id, status: error ? 'error' : 'confirmed', error: error?.message });
        } else {
          const ageMinutes = (Date.now() - new Date(deposit.created_at).getTime()) / 60000;
          if (ageMinutes > 30) {
            await supabase.from('transactions').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', deposit.id);
            results.push({ id: deposit.id, status: 'expired' });
          } else {
            results.push({ id: deposit.id, status: 'still_pending' });
          }
        }
      } catch (e) {
        results.push({ id: deposit.id, status: 'error', error: e.message });
      }
    }

    return json({ processed: results.length, results });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
