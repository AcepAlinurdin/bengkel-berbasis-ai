"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  ArrowLeft, TrendingUp, Users, AlertTriangle, 
  DollarSign, Package, Activity, Calendar, ArrowRight 
} from 'lucide-react';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import { useRoleGuard } from '@/lib/authGuard';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';

export default function ExecutiveDashboard() {
  // 🔒 HANYA OWNER
  const { loading: authLoading } = useRoleGuard(['owner']);

  const [stats, setStats] = useState({
    todayIncome: 0,
    monthIncome: 0,
    todayUnits: 0,
    activeMechanics: 0
  });
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

      // 1. STATS
      const { data: transToday } = await supabase.from('Transactions').select('total_amount').gte('created_at', todayStr);
      const { data: transMonth } = await supabase.from('Transactions').select('total_amount').gte('created_at', firstDayOfMonth);
      const { count: unitCount } = await supabase.from('Antrian').select('*', { count: 'exact', head: true }).gte('created_at', todayStr);
      const { count: mechCount } = await supabase.from('Mechanics').select('*', { count: 'exact', head: true }).eq('is_active', true);

      // 2. LOW STOCK
      const { data: lowStock } = await supabase.from('Inventory').select('*').lt('stok', 5).order('stok', { ascending: true }).limit(5);

      // 3. CHART DATA
      const { data: last7Days } = await supabase
        .from('Antrian')
        .select('created_at')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      // 4. RECENT SALES
      const { data: recent } = await supabase.from('Transactions').select('*').order('created_at', { ascending: false }).limit(5);

      // --- OLAH DATA ---
      const sumToday = transToday?.reduce((acc, curr) => acc + curr.total_amount, 0) || 0;
      const sumMonth = transMonth?.reduce((acc, curr) => acc + curr.total_amount, 0) || 0;

      const chartMap: Record<string, number> = {};
      last7Days?.forEach(item => {
          const date = new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
          chartMap[date] = (chartMap[date] || 0) + 1;
      });
      const formattedChart = Object.keys(chartMap).map(key => ({ name: key, jumlah: chartMap[key] }));

      setStats({ todayIncome: sumToday, monthIncome: sumMonth, todayUnits: unitCount || 0, activeMechanics: mechCount || 0 });
      setLowStockItems(lowStock || []);
      setChartData(formattedChart);
      setRecentSales(recent || []);
      setLoading(false);
    };

    if (!authLoading) fetchData();
  }, [authLoading]);

  if (authLoading || loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-slate-500"><Activity className="animate-spin mr-2"/> Memuat Data Bisnis...</div>;

  return (
    <div className="min-h-screen bg-gray-50 text-slate-800 p-6 font-mono">
      {/* HEADER */}
      <PageHeader 
        title="Executive Dashboard" 
        subtitle="Ringkasan Performa Bisnis Bengkel"
        icon={Activity}
        
      />

      <div className="max-w-7xl mx-auto space-y-6">
          
          {/* 1. KARTU STATISTIK (LIGHT MODE) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Omzet Hari Ini */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition">
                  <div className="flex items-center gap-4">
                      <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                          <DollarSign size={24}/>
                      </div>
                      <div>
                          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Omzet Hari Ini</p>
                          <h3 className="text-xl font-black text-slate-800">Rp {stats.todayIncome.toLocaleString('id-ID')}</h3>
                      </div>
                  </div>
              </div>

              {/* Unit Masuk */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition">
                  <div className="flex items-center gap-4">
                      <div className="p-3 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
                          <Users size={24}/>
                      </div>
                      <div>
                          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Unit Masuk</p>
                          <h3 className="text-xl font-black text-slate-800">{stats.todayUnits} <span className="text-sm font-normal text-slate-400">Motor</span></h3>
                      </div>
                  </div>
              </div>

              {/* Stok Menipis */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition">
                  <div className="flex items-center gap-4">
                      <div className="p-3 bg-orange-50 text-orange-600 rounded-xl border border-orange-100">
                          <AlertTriangle size={24}/>
                      </div>
                      <div>
                          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Stok Menipis</p>
                          <h3 className="text-xl font-black text-slate-800">{lowStockItems.length} <span className="text-sm font-normal text-slate-400">Item</span></h3>
                      </div>
                  </div>
              </div>

              {/* Total Mekanik */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition">
                  <div className="flex items-center gap-4">
                      <div className="p-3 bg-purple-50 text-purple-600 rounded-xl border border-purple-100">
                          <Users size={24}/>
                      </div>
                      <div>
                          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Mekanik Aktif</p>
                          <h3 className="text-xl font-black text-slate-800">{stats.activeMechanics} <span className="text-sm font-normal text-slate-400">Orang</span></h3>
                      </div>
                  </div>
              </div>
          </div>

          {/* 2. GRAFIK & LIST */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* GRAFIK PENGUNJUNG (Background Putih) */}
              <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
                          <TrendingUp size={20} className="text-blue-600"/> Tren Pengunjung
                      </h3>
                      <span className="text-xs bg-slate-100 text-slate-500 px-3 py-1 rounded-full font-medium">7 Hari Terakhir</span>
                  </div>
                  
                  <div className="h-[320px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                              <XAxis 
                                dataKey="name" 
                                stroke="#64748b" 
                                fontSize={12} 
                                tickLine={false} 
                                axisLine={false}
                                dy={10} 
                              />
                              <Tooltip 
                                  cursor={{fill: '#f1f5f9'}}
                                  contentStyle={{ 
                                    backgroundColor: '#ffffff', 
                                    borderColor: '#e2e8f0', 
                                    color: '#1e293b', 
                                    borderRadius: '12px',
                                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' 
                                  }}
                              />
                              <Bar dataKey="jumlah" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={40}>
                                {chartData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#3b82f6' : '#60a5fa'} />
                                ))}
                              </Bar>
                          </BarChart>
                      </ResponsiveContainer>
                  </div>
              </div>

              {/* KOLOM KANAN: STOK ALERT & TRANSAKSI */}
              <div className="space-y-6">
                  
                  {/* Peringatan Stok */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                      <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-sm uppercase text-orange-600 border-b border-slate-100 pb-3">
                          <AlertTriangle size={16}/> Perlu Restock
                      </h3>
                      <div className="space-y-3">
                          {lowStockItems.length === 0 && <p className="text-xs text-slate-400 italic">Stok aman terkendali.</p>}
                          {lowStockItems.map(item => (
                              <div key={item.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                                  <span className="text-sm text-slate-700 font-medium">{item.nama_barang}</span>
                                  <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded border border-red-100">Sisa {item.stok}</span>
                              </div>
                          ))}
                      </div>
                      <Link href="/admin/inventory" className="flex items-center justify-center gap-1 text-xs text-blue-600 font-bold mt-4 hover:bg-blue-50 p-2 rounded transition">
                          Kelola Gudang <ArrowRight size={12}/>
                      </Link>
                  </div>

                  {/* Transaksi Terakhir */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                      <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-sm uppercase text-emerald-600 border-b border-slate-100 pb-3">
                          <DollarSign size={16}/> Transaksi Terakhir
                      </h3>
                      <div className="space-y-3">
                          {recentSales.map(t => (
                              <div key={t.id} className="flex justify-between items-center text-xs border-b border-slate-50 pb-2 last:border-0 hover:bg-slate-50 p-1 rounded transition">
                                  <div>
                                      <span className="text-slate-800 font-bold block">{t.customer_name}</span>
                                      <span className="text-slate-400">{new Date(t.created_at).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'})}</span>
                                  </div>
                                  <span className="text-emerald-600 font-mono font-bold bg-emerald-50 px-2 py-1 rounded">+ {t.total_amount.toLocaleString()}</span>
                              </div>
                          ))}
                          {recentSales.length === 0 && <p className="text-xs text-slate-400 italic">Belum ada transaksi.</p>}
                      </div>
                  </div>

              </div>
          </div>
      </div>
    </div>
  );
}