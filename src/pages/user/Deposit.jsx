import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'react-qr-code';
import { useDropzone } from 'react-dropzone';
import { Image as ImageIcon, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../hooks/useSettings';
import PageHeader from '../../components/shared/PageHeader';

export default function Deposit() {
  const { session, user } = useAuth();
  const { depositLimits, companyInfo } = useSettings();
  const navigate = useNavigate();
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(null); // { transaction, gpay }
  const [mode, setMode] = useState('choose'); // choose | manual-form | manual-pending | gpay-pending

  // Manual deposit fields
  const [reference, setReference] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const onDrop = useCallback((accepted) => {
    const f = accepted[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }, []);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'image/*': [] }, maxFiles: 1 });

  function validateAmount() {
    const n = Number(amount);
    if (!n || n <= 0) { toast.error('أدخل مبلغاً صحيحاً'); return false; }
    if (n < depositLimits.min || n > depositLimits.max) {
      toast.error(`المبلغ يجب أن يكون بين ${depositLimits.min} و ${depositLimits.max} د.ل`);
      return false;
    }
    return true;
  }

  // Try the automatic GPAY flow first; if it's not configured (503) or the
  // call fails entirely (e.g. CORS/network before edge functions are deployed),
  // fall back to the manual deposit form instead of dead-ending on an error.
  async function tryGpay() {
    if (!validateAmount()) return;
    setBusy(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-deposit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ amount_lyd: Number(amount) })
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === 'GPAY_NOT_CONFIGURED') {
          toast.info('الدفع التلقائي غير مفعّل حالياً — استخدم الشحن اليدوي بالأسفل');
          setMode('manual-form');
          return;
        }
        throw new Error(data.error || 'تعذّر إنشاء طلب الدفع');
      }
      setPending(data);
      setMode('gpay-pending');
    } catch (err) {
      toast.error(err.message || 'تعذّر الاتصال بخدمة الدفع، جرّب الشحن اليدوي');
      setMode('manual-form');
    } finally {
      setBusy(false);
    }
  }

  async function submitManual(e) {
    e.preventDefault();
    if (!validateAmount()) return;
    if (!file) return toast.error('يرجى رفع صورة إيصال التحويل');
    setBusy(true);
    try {
      const path = `deposits/${user.id}/${Date.now()}.${file.name.split('.').pop()}`;
      const { error: uploadErr } = await supabase.storage.from('receipts').upload(path, file);
      if (uploadErr) throw uploadErr;
      const { data: { publicUrl } } = supabase.storage.from('receipts').getPublicUrl(path);

      const { data, error } = await supabase.rpc('request_manual_deposit', {
        p_user_id: user.id, p_amount_lyd: Number(amount), p_reference: reference || null, p_receipt_image: publicUrl
      });
      if (error) throw error;
      toast.success('تم استلام طلب الشحن، سيتم تأكيده من قبل فريقنا خلال دقائق');
      navigate(`/transaction/${data}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  // Poll our own DB every 5s for the realtime confirmation (the cron edge function does the GPAY check)
  useEffect(() => {
    if (mode !== 'gpay-pending' || !pending) return;
    const interval = setInterval(async () => {
      const { data } = await supabase.from('transactions').select('status').eq('id', pending.transaction.id).single();
      if (data?.status === 'completed') {
        toast.success('تم تأكيد الشحن بنجاح!');
        navigate(`/transaction/${pending.transaction.id}`);
      }
      if (data?.status === 'cancelled') {
        toast.error('انتهت صلاحية طلب الدفع');
        setMode('choose');
        setPending(null);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [mode, pending]);

  function copyGpayNumber() {
    navigator.clipboard.writeText(companyInfo.gpay_number || '');
    toast.success('تم نسخ رقم GPAY');
  }

  if (mode === 'gpay-pending' && pending) {
    return (
      <div>
        <PageHeader title="إتمام الدفع" to="/wallet" />
        <div className="space-y-5 text-center">
          <div className="bg-white rounded-2xl p-6 inline-block">
            <QRCode value={pending.gpay.qr_code || pending.transaction.gpay_reference} size={180} />
          </div>
          <p className="text-zinc-400 text-sm">رقم الطلب المرجعي: <span className="ltr font-mono">{pending.transaction.gpay_reference}</span></p>
          <div className="bg-surface-800 rounded-xl p-4 text-sm text-zinc-300">
            افتح تطبيق GPAY وادفع <b className="text-accent-400">{amount} د.ل</b> لإكمال الشحن. سيتم تحديث رصيدك تلقائياً عند التأكيد.
          </div>
          <div className="flex items-center justify-center gap-2 text-xs text-zinc-500">
            <span className="w-2 h-2 rounded-full bg-warning animate-pulse" /> جارِ فحص حالة الدفع كل 30 ثانية...
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'manual-form') {
    return (
      <div>
        <PageHeader title="شحن يدوي عبر GPAY" to="/deposit" />
        <div className="space-y-4">
          <div className="bg-surface-800 rounded-xl p-4 border border-white/5">
            <p className="text-xs text-zinc-500 mb-1">حوّل المبلغ إلى رقم GPAY الخاص بالشركة</p>
            <div className="flex items-center justify-between gap-2">
              <code className="text-accent-400 ltr">{companyInfo.gpay_number || 'سيتم تزويدك بالرقم من الدعم'}</code>
              {companyInfo.gpay_number && (
                <button onClick={copyGpayNumber} className="text-zinc-400 hover:text-accent-400 shrink-0"><Copy size={16} /></button>
              )}
            </div>
          </div>

          <form onSubmit={submitManual} className="space-y-4">
            <div className="bg-surface-800 rounded-xl px-4 py-3 text-sm flex items-center justify-between">
              <span className="text-zinc-400">المبلغ</span>
              <span className="font-bold ltr">{amount} د.ل</span>
            </div>
            <label className="block">
              <span className="text-sm text-zinc-400 mb-1.5 block">الرقم المرجعي للتحويل (اختياري)</span>
              <input value={reference} onChange={(e) => setReference(e.target.value)}
                className="w-full bg-surface-800 rounded-xl border border-white/10 px-4 py-3.5 outline-none ltr text-left" />
            </label>

            <div {...getRootProps()} className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${isDragActive ? 'border-accent-400' : 'border-white/10'}`}>
              <input {...getInputProps()} />
              {preview ? (
                <img src={preview} alt="إيصال" className="max-h-40 mx-auto rounded-lg" />
              ) : (
                <div className="text-zinc-500">
                  <ImageIcon className="mx-auto mb-2" size={28} />
                  <p className="text-sm">اسحب صورة إيصال التحويل هنا أو اضغط للاختيار</p>
                </div>
              )}
            </div>

            <button disabled={busy} className="w-full bg-accent-400 text-primary-900 font-bold py-3.5 rounded-xl disabled:opacity-50">
              {busy ? 'جارِ الإرسال...' : 'تأكيد إرسال طلب الشحن'}
            </button>
            <p className="text-xs text-zinc-500 text-center">سيراجع فريقنا طلبك ويضيف الرصيد بعد التأكد من التحويل</p>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="شحن المحفظة" to="/wallet" />
      <div className="space-y-4">
        <label className="block">
          <span className="text-sm text-zinc-400 mb-1.5 block">المبلغ (دينار ليبي)</span>
          <input type="number" min={depositLimits.min} max={depositLimits.max} value={amount} onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full bg-surface-800 rounded-xl border border-white/10 px-4 py-4 text-2xl font-heading outline-none ltr text-left" />
          <span className="text-xs text-zinc-500 mt-1 block">الحد الأدنى {depositLimits.min} د.ل — الحد الأقصى {depositLimits.max} د.ل</span>
        </label>
        <button disabled={busy || !amount} onClick={tryGpay} className="w-full bg-accent-400 text-primary-900 font-bold py-3.5 rounded-xl hover:bg-accent-500 disabled:opacity-50 transition-colors">
          {busy ? 'جارِ التحقق...' : 'شحن عبر GPAY'}
        </button>
        <button disabled={!amount} onClick={() => validateAmount() && setMode('manual-form')} className="w-full bg-surface-800 border border-white/10 text-zinc-300 font-medium py-3.5 rounded-xl disabled:opacity-50">
          شحن يدوي (تحويل + إيصال)
        </button>
      </div>
    </div>
  );
}
