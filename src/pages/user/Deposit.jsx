import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { Image as ImageIcon, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../hooks/useSettings';
import PageHeader from '../../components/shared/PageHeader';

// Deposits go exclusively through the `request_manual_deposit` RPC — no
// Edge Function call here. The GPAY automated path (create-deposit /
// check-pending-deposits) still exists in supabase/functions for when GPAY
// credentials are actually configured and deployed, but this screen never
// blindly calls an Edge Function that may not be published, since that
// produced confusing network errors. An admin confirms the deposit from
// /admin/transactions once the transfer is verified — same review flow as
// a manual sell.
export default function Deposit() {
  const { user } = useAuth();
  const { depositLimits, companyInfo } = useSettings();
  const navigate = useNavigate();
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
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

  function copyGpayNumber() {
    navigator.clipboard.writeText(companyInfo.gpay_number || '');
    toast.success('تم نسخ رقم GPAY');
  }

  async function submit(e) {
    e.preventDefault();
    const n = Number(amount);
    if (!n || n <= 0) return toast.error('أدخل مبلغاً صحيحاً');
    if (n < depositLimits.min || n > depositLimits.max) {
      return toast.error(`المبلغ يجب أن يكون بين ${depositLimits.min} و ${depositLimits.max} د.ل`);
    }
    if (!file) return toast.error('يرجى رفع صورة إيصال التحويل');

    setBusy(true);
    try {
      const path = `deposits/${user.id}/${Date.now()}.${file.name.split('.').pop()}`;
      const { error: uploadErr } = await supabase.storage.from('receipts').upload(path, file);
      if (uploadErr) throw uploadErr;
      const { data: { publicUrl } } = supabase.storage.from('receipts').getPublicUrl(path);

      const { data, error } = await supabase.rpc('request_manual_deposit', {
        p_user_id: user.id, p_amount_lyd: n, p_reference: reference || null, p_receipt_image: publicUrl
      });
      if (error) throw error;

      toast.success('تم تقديم طلبك وسيتم مراجعته');
      navigate(`/transaction/${data}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader title="شحن المحفظة" to="/wallet" />
      <div className="space-y-4">
        <div className="bg-surface-800 rounded-xl p-4 border border-white/5">
          <p className="text-xs text-zinc-500 mb-1">١. حوّل المبلغ إلى رقم GPAY الخاص بالشركة</p>
          <div className="flex items-center justify-between gap-2">
            <code className="text-accent-400 ltr">{companyInfo.gpay_number || 'سيتم تزويدك بالرقم من الدعم'}</code>
            {companyInfo.gpay_number && (
              <button onClick={copyGpayNumber} className="text-zinc-400 hover:text-accent-400 shrink-0"><Copy size={16} /></button>
            )}
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="text-sm text-zinc-400 mb-1.5 block">٢. المبلغ الذي قمت بتحويله (دينار ليبي)</span>
            <input type="number" min={depositLimits.min} max={depositLimits.max} value={amount} onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-surface-800 rounded-xl border border-white/10 px-4 py-4 text-2xl font-heading outline-none ltr text-left" />
            <span className="text-xs text-zinc-500 mt-1 block">الحد الأدنى {depositLimits.min} د.ل — الحد الأقصى {depositLimits.max} د.ل</span>
          </label>

          <label className="block">
            <span className="text-sm text-zinc-400 mb-1.5 block">الرقم المرجعي للتحويل (اختياري)</span>
            <input value={reference} onChange={(e) => setReference(e.target.value)}
              className="w-full bg-surface-800 rounded-xl border border-white/10 px-4 py-3.5 outline-none ltr text-left" />
          </label>

          <label className="block">
            <span className="text-sm text-zinc-400 mb-1.5 block">٣. صورة إيصال التحويل</span>
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
          </label>

          <button disabled={busy} className="w-full bg-accent-400 text-primary-900 font-bold py-3.5 rounded-xl disabled:opacity-50">
            {busy ? 'جارِ الإرسال...' : 'تقديم طلب الشحن'}
          </button>
          <p className="text-xs text-zinc-500 text-center">سيتم تقديم طلبك ومراجعته من قبل فريقنا خلال دقائق</p>
        </form>
      </div>
    </div>
  );
}
