import { Users2, Clock } from 'lucide-react';
import PageHeader from '../../components/shared/PageHeader';

export default function P2P() {
  return (
    <div>
      <PageHeader title="سوق P2P" subtitle="تداول مباشر بين المستخدمين" />

      <div className="flex flex-col items-center text-center py-16 px-4">
        <span className="w-16 h-16 rounded-2xl bg-accent-400/10 text-accent-400 flex items-center justify-center mb-4">
          <Users2 size={28} />
        </span>
        <h2 className="font-heading font-bold text-lg mb-2">قريباً</h2>
        <p className="text-sm text-zinc-500 max-w-xs">
          سيتيح لك سوق P2P بيع وشراء USDT مباشرة مع مستخدمين آخرين بسعر تتفاوضون عليه، مع ضمان
          المعاملة من خلال Sarafa Libya.
        </p>
        <div className="flex items-center gap-2 text-xs text-zinc-600 mt-5">
          <Clock size={14} /> سيتم تفعيله من لوحة التحكم عند الجاهزية
        </div>
      </div>
    </div>
  );
}
