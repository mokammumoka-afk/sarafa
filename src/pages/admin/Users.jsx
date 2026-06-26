import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatLYD, formatUSDT, formatDate } from '../../lib/utils';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, [filter]);

  async function load() {
    setLoading(true);
    let query = supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(200);
    if (filter === 'active') query = query.eq('is_active', true);
    if (filter === 'disabled') query = query.eq('is_active', false);
    const { data } = await query;
    setUsers(data || []);
    setLoading(false);
  }

  const filtered = users.filter((u) =>
    !search || u.full_name?.includes(search) || u.phone?.includes(search) || u.email?.includes(search)
  );

  async function toggleActive(u) {
    await supabase.from('profiles').update({ is_active: !u.is_active }).eq('id', u.id);
    load();
  }

  return (
    <div className="space-y-4">
      <h1 className="font-heading font-bold text-2xl">إدارة المستخدمين</h1>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-surface-900 border border-white/10 rounded-xl px-3 flex-1">
          <Search size={16} className="text-zinc-500" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث بالاسم أو الهاتف..."
            className="bg-transparent py-2.5 outline-none flex-1 text-sm" />
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}
          className="bg-surface-900 border border-white/10 rounded-xl px-3 py-2.5 text-sm outline-none">
          <option value="all">الكل</option>
          <option value="active">نشط</option>
          <option value="disabled">معطل</option>
        </select>
      </div>

      <div className="bg-surface-900 border border-white/5 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-zinc-400 text-xs">
            <tr>
              <th className="px-4 py-3 text-right">الاسم</th>
              <th className="px-4 py-3 text-right">الهاتف</th>
              <th className="px-4 py-3 text-right">رصيد LYD</th>
              <th className="px-4 py-3 text-right">رصيد USDT</th>
              <th className="px-4 py-3 text-right">الحالة</th>
              <th className="px-4 py-3 text-right">التسجيل</th>
              <th className="px-4 py-3 text-right">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="px-4 py-6 text-center text-zinc-500">جارِ التحميل...</td></tr>}
            {!loading && filtered.map((u) => (
              <tr key={u.id} className="border-t border-white/5">
                <td className="px-4 py-3"><Link to={`/admin/users/${u.id}`} className="hover:text-accent-400">{u.full_name || '—'}</Link></td>
                <td className="px-4 py-3 ltr text-right">{u.phone}</td>
                <td className="px-4 py-3">{formatLYD(u.balance_lyd)}</td>
                <td className="px-4 py-3">{formatUSDT(u.balance_usdt)}</td>
                <td className="px-4 py-3">
                  <span className={u.is_active ? 'text-success' : 'text-danger'}>{u.is_active ? 'نشط' : 'معطل'}</span>
                </td>
                <td className="px-4 py-3 text-zinc-500">{formatDate(u.created_at)}</td>
                <td className="px-4 py-3">
                  <button onClick={() => toggleActive(u)} className="text-xs px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10">
                    {u.is_active ? 'تعطيل' : 'تفعيل'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
