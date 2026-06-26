import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import StatusBadge from '../../components/shared/StatusBadge';
import { formatDate, formatLYD, formatUSDT, TYPE_LABELS } from '../../lib/utils';

export default function TransactionDetail() {
  const { id } = useParams();
  const [txn, setTxn] = useState(null);

  useEffect(() => {
    supabase.from('transactions').select('*').eq('id', id).single().then(({ data }) => setTxn(data));
    const channel = supabase.channel(`txn-${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'transactions', filter: `id=eq.${id}` },
        (payload) => setTxn(payload.new))
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [id]);

  if (!txn) return <div className="h-40 skeleton rounded-xl" />;

  const Row = ({ label, value }) => value ? (
    <div className="flex justify-between py-2.5 border-b border-white/5 text-sm">
      <span className="text-zinc-500">{label}</span>
      <span className="font-medium text-left">{value}</span>
    </div>
  ) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading font-bold text-xl">{TYPE_LABELS[txn.type]}</h1>
        <StatusBadge status={txn.status} />
      </div>

      <div className="bg-surface-800 rounded-xl p-4 border border-white/5">
        <Row label="رقم المعاملة" value={<span className="font-mono text-xs ltr">{txn.id}</span>} />
        <Row label="التاريخ" value={formatDate(txn.created_at)} />
        {txn.amount_lyd > 0 && <Row label="المبلغ (دينار)" value={formatLYD(txn.amount_lyd)} />}
        {txn.amount_usdt > 0 && <Row label="الكمية (USDT)" value={formatUSDT(txn.amount_usdt)} />}
        {txn.rate_used && <Row label="السعر المستخدم" value={txn.rate_used} />}
        {txn.usdt_hash && <Row label="هاش التحويل" value={<span className="font-mono text-xs break-all ltr">{txn.usdt_hash}</span>} />}
        {txn.gpay_reference && <Row label="الرقم المرجعي" value={<span className="font-mono text-xs ltr">{txn.gpay_reference}</span>} />}
        {txn.admin_note && <Row label="ملاحظة المسؤول" value={txn.admin_note} />}
        {txn.completed_at && <Row label="وقت الإكمال" value={formatDate(txn.completed_at)} />}
      </div>

      {txn.receipt_image && (
        <div>
          <p className="text-sm text-zinc-400 mb-2">صورة الإيصال</p>
          <img src={txn.receipt_image} alt="إيصال" className="rounded-xl w-full" />
        </div>
      )}
    </div>
  );
}
