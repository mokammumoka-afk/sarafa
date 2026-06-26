import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { Copy, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useExchangeRate } from '../../hooks/useExchangeRate';

const COMPANY_USDT_WALLET = import.meta.env.VITE_COMPANY_USDT_WALLET || '—';

export default function SellUsdt() {
  const { user, profile } = useAuth();
  const { rate } = useExchangeRate();
  const navigate = useNavigate();
  const [amount, setAmount] = useState('');
  const [txHash, setTxHash] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);

  const onDrop = useCallback((accepted) => {
    const f = accepted[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }, []);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'image/*': [] }, maxFiles: 1 });

  const lydReceived = rate && amount ? (Number(amount) * rate.buy_rate).toFixed(2) : '0.00';

  function copyAddress() {
    navigator.clipboard.writeText(COMPANY_USDT_WALLET);
    toast.success('تم نسخ العنوان');
  }

  async function submit(e) {
    e.preventDefault();
    if (!file) return toast.error('يرجى رفع صورة الإيصال');
    setBusy(true);
    try {
      const path = `receipts/${user.id}/${Date.now()}.${file.name.split('.').pop()}`;
      const { error: uploadErr } = await supabase.storage.from('receipts').upload(path, file);
      if (uploadErr) throw uploadErr;
      const { data: { publicUrl } } = supabase.storage.from('receipts').getPublicUrl(path);

      const { data, error } = await supabase.rpc('request_sell_usdt', {
        p_user_id: user.id, p_amount_usdt: Number(amount), p_buy_rate: rate.buy_rate,
        p_usdt_hash: txHash, p_receipt_image: publicUrl
      });
      if (error) throw error;
      toast.success('تم تقديم طلب البيع، سيتم مراجعته خلال دقائق');
      navigate(`/transaction/${data}`);
    } catch (err) {
      toast.error(err.message.includes('BAL02') ? 'رصيد USDT غير كافٍ' : err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <h1 className="font-heading font-bold text-xl">بيع USDT</h1>
      <div className="bg-surface-800 rounded-xl px-4 py-3 text-sm text-zinc-400 border border-white/5">
        سعر الشراء الحالي: <b className="text-danger">{rate?.buy_rate ?? '—'}</b> د.ل لكل USDT
      </div>

      <div className="bg-surface-800 rounded-xl p-4 border border-white/5">
        <p className="text-xs text-zinc-500 mb-1">عنوان محفظة الشركة (USDT-TRC20)</p>
        <div className="flex items-center justify-between gap-2">
          <code className="text-xs text-accent-400 break-all ltr">{COMPANY_USDT_WALLET}</code>
          <button type="button" onClick={copyAddress} className="text-zinc-400 hover:text-accent-400 shrink-0"><Copy size={16} /></button>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <label className="block">
          <span className="text-sm text-zinc-400 mb-1.5 block">كمية USDT المرسلة</span>
          <input type="number" step="0.000001" min="0" max={profile?.balance_usdt} required value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-surface-800 rounded-xl border border-white/10 px-4 py-3.5 outline-none ltr text-left" />
        </label>

        <div className="bg-accent-400/10 border border-accent-400/20 rounded-xl p-3 text-center text-sm">
          ستحصل على <b className="text-accent-400">{lydReceived} د.ل</b>
        </div>

        <label className="block">
          <span className="text-sm text-zinc-400 mb-1.5 block">هاش التحويل (TX Hash)</span>
          <input required value={txHash} onChange={(e) => setTxHash(e.target.value)}
            className="w-full bg-surface-800 rounded-xl border border-white/10 px-4 py-3.5 outline-none ltr text-left text-sm" />
        </label>

        <div {...getRootProps()} className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${isDragActive ? 'border-accent-400' : 'border-white/10'}`}>
          <input {...getInputProps()} />
          {preview ? (
            <img src={preview} alt="إيصال" className="max-h-40 mx-auto rounded-lg" />
          ) : (
            <div className="text-zinc-500">
              <ImageIcon className="mx-auto mb-2" size={28} />
              <p className="text-sm">اسحب صورة الإيصال هنا أو اضغط للاختيار</p>
            </div>
          )}
        </div>

        <button disabled={busy || !amount || !rate} className="w-full bg-accent-400 text-primary-900 font-bold py-3.5 rounded-xl disabled:opacity-50">
          {busy ? 'جارِ الإرسال...' : 'تقديم طلب البيع'}
        </button>
        <p className="text-xs text-zinc-500 text-center">سيتم مراجعة طلبك وتأكيده خلال دقائق</p>
      </form>
    </div>
  );
}
