const FAQS = [
  { q: 'كم يستغرق تأكيد الشحن؟', a: 'يتم تأكيد الشحن تلقائياً خلال دقائق بعد إتمام الدفع عبر GPAY.' },
  { q: 'كم يستغرق تنفيذ السحب؟', a: 'يتم تنفيذ طلبات السحب خلال 24 ساعة من تقديم الطلب.' },
  { q: 'هل توجد رسوم على المعاملات؟', a: 'تختلف الرسوم حسب نوع العملية، وتظهر بوضوح قبل تأكيد أي معاملة.' },
  { q: 'كيف أتواصل مع الدعم الفني؟', a: 'يمكنك فتح تذكرة دعم جديدة من قسم "الدعم" داخل التطبيق.' }
];

export default function FAQ() {
  return (
    <div className="max-w-md mx-auto px-4 py-8 text-zinc-300" dir="rtl">
      <h1 className="font-heading font-bold text-2xl mb-5 text-accent-400">الأسئلة الشائعة</h1>
      <div className="space-y-3">
        {FAQS.map((f, i) => (
          <details key={i} className="bg-surface-800 rounded-xl p-4 border border-white/5">
            <summary className="font-medium cursor-pointer">{f.q}</summary>
            <p className="text-sm text-zinc-400 mt-2">{f.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
