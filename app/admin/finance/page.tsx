"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import { 
  ArrowLeft, TrendingUp, TrendingDown, DollarSign, Wallet, 
  Wrench, Package, Loader2, Calendar 
} from 'lucide-react';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import { formatDate } from '@/lib/utils';
import { useRoleGuard } from '@/lib/authGuard';

export default function FinancePage() {
  // 1. CEK KEAMANAN (Hanya Owner)
  const { loading: authLoading } = useRoleGuard(['owner']);

  // 2. STATE
  const [transactions, setTransactions] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [filter, setFilter] = useState<'daily' | 'monthly'>('monthly');

  // 3. FETCH DATA
  useEffect(() => {
    const fetchData = async () => {
      setLoadingData(true);
      
      // Ambil Pemasukan
      const { data: trans } = await supabase.from('Transactions').select('*').order('created_at', { ascending: true });
      
      // Ambil Pengeluaran
      const { data: stockIn } = await supabase.from('StockLogs').select('*').eq('type', 'in').order('created_at', { ascending: true });

      if (trans) setTransactions(trans);
      if (stockIn) setExpenses(stockIn);
      setLoadingData(false);
    };

    fetchData();
  }, []);

  // 4. LOGIC HITUNG
  const calculateTotals = () => {
      let totalIncome = 0;
      let totalExpense = 0;
      let incomeService = 0;
      let incomeParts = 0;
      
      const today = new Date();

      // Filter Data
      const filteredTrans = transactions.filter(t => {
          const d = new Date(t.created_at);
          if (filter === 'daily') return d.toDateString() === today.toDateString();
          return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
      });

      const filteredExpense = expenses.filter(e => {
          const d = new Date(e.created_at);
          if (filter === 'daily') return d.toDateString() === today.toDateString();
          return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
      });

      // Hitung Detail
      filteredTrans.forEach(t => {
          totalIncome += t.total_amount;
          if (t.items && Array.isArray(t.items)) {
              t.items.forEach((item: any) => {
                  const subtotal = item.price * item.qty;
                  if (item.type === 'service') incomeService += subtotal;
                  else incomeParts += subtotal;
              });
          }
      });

      totalExpense = filteredExpense.reduce((acc, curr) => acc + curr.total_price, 0);

      // Data Grafik
      const chartMap: Record<string, number> = {};
      filteredTrans.forEach(t => {
          const d = new Date(t.created_at);
          const key = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
          if (!chartMap[key]) chartMap[key] = 0;
          chartMap[key] += t.total_amount;
      });

      const chartData = Object.keys(chartMap).map(key => ({ date: key, omzet: chartMap[key] }));

      return { 
          totalIncome, totalExpense, incomeService, incomeParts, 
          net: totalIncome - totalExpense, 
          filteredTrans: filteredTrans.reverse(), 
          filteredExpense: filteredExpense.reverse(),
          chartData 
      };
  };

  const { totalIncome, totalExpense, incomeService, incomeParts, net, filteredTrans, filteredExpense, chartData } = calculateTotals();

  if (authLoading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-slate-500"><Loader2 className="animate-spin mr-2"/> Verifikasi Owner...</div>;

  return (
    <div className="min-h-screen bg-gray-50 text-slate-800 p-6 font-mono">
      <PageHeader 
        title="Laporan Keuangan" 
        subtitle="Analisis Profit & Arus Kas Bengkel"
        icon={Wallet}
        
      />

      <div className="max-w-7xl mx-auto space-y-8">
          
          {/* FILTER & HEADER */}
          <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex gap-2 p-1">
                  <button onClick={() => setFilter('daily')} className={`px-6 py-2 text-sm rounded-lg transition font-bold ${filter === 'daily' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
                      Harian
                  </button>
                  <button onClick={() => setFilter('monthly')} className={`px-6 py-2 text-sm rounded-lg transition font-bold ${filter === 'monthly' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
                      Bulanan
                  </button>
              </div>
              <div className="px-4 py-2 text-xs text-slate-500 flex items-center gap-2 font-medium bg-slate-50 rounded-lg border border-slate-100 m-2 sm:m-0">
                  <Calendar size={14}/> 
                  {filter === 'daily' ? new Date().toLocaleDateString('id-ID', {weekday: 'long', day:'numeric', month:'long'}) : new Date().toLocaleDateString('id-ID', {month:'long', year:'numeric'})}
              </div>
          </div>

          {/* KARTU UTAMA & CHART */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* 1. KARTU PROFIT BESAR */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group lg:col-span-1 flex flex-col justify-center">
                  <div className={`absolute left-0 top-0 h-full w-1.5 ${net >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                  <div className="relative z-10">
                      <div className="flex items-center gap-3 mb-3">
                          <div className="p-2.5 bg-slate-50 rounded-xl text-slate-600 border border-slate-100"><DollarSign size={24}/></div>
                          <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Laba Bersih</span>
                      </div>
                      <h3 className={`text-4xl font-black mb-1 ${net >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          Rp {net.toLocaleString('id-ID')}
                      </h3>
                      <p className="text-xs text-slate-400 font-medium">Total Pemasukan - Belanja Stok</p>
                  </div>
              </div>

              {/* 2. CHART GRAFIK */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2 flex flex-col">
                  <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                      <TrendingUp size={16} className="text-blue-500"/> Tren Pemasukan
                  </h3>
                  <div className="flex-1 h-[220px] w-full">
                      {chartData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={chartData}>
                                  <defs>
                                      <linearGradient id="colorOmzet" x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                      </linearGradient>
                                  </defs>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `${val/1000}k`} />
                                  <Tooltip 
                                      cursor={{stroke: '#cbd5e1', strokeWidth: 1}}
                                      contentStyle={{ backgroundColor: '#fff', borderColor: '#e2e8f0', color: '#1e293b', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                      itemStyle={{ color: '#2563eb', fontWeight: 'bold' }}
                                      formatter={(value: number) => [`Rp ${value.toLocaleString()}`, 'Omzet']}
                                  />
                                  <Area type="monotone" dataKey="omzet" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorOmzet)" />
                              </AreaChart>
                          </ResponsiveContainer>
                      ) : (
                          <div className="h-full flex items-center justify-center text-slate-400 text-xs italic">Belum ada data grafik</div>
                      )}
                  </div>
              </div>
          </div>

          {/* KARTU DETAIL KECIL */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-emerald-200 transition">
                  <div className="flex items-center gap-2 mb-2 text-emerald-600">
                      <TrendingUp size={16}/> <span className="text-[10px] font-bold uppercase text-slate-500">Total Masuk</span>
                  </div>
                  <p className="text-lg font-bold text-slate-800">Rp {totalIncome.toLocaleString('id-ID')}</p>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm bg-blue-50/50 hover:border-blue-200 transition">
                  <div className="flex items-center gap-2 mb-2 text-blue-600">
                      <Wrench size={16}/> <span className="text-[10px] font-bold uppercase text-slate-500">Jasa Service</span>
                  </div>
                  <p className="text-lg font-bold text-blue-700">Rp {incomeService.toLocaleString('id-ID')}</p>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm bg-amber-50/50 hover:border-amber-200 transition">
                  <div className="flex items-center gap-2 mb-2 text-amber-600">
                      <Package size={16}/> <span className="text-[10px] font-bold uppercase text-slate-500">Jual Part</span>
                  </div>
                  <p className="text-lg font-bold text-amber-700">Rp {incomeParts.toLocaleString('id-ID')}</p>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-red-200 transition">
                  <div className="flex items-center gap-2 mb-2 text-red-500">
                      <TrendingDown size={16}/> <span className="text-[10px] font-bold uppercase text-slate-500">Belanja Stok</span>
                  </div>
                  <p className="text-lg font-bold text-slate-800">Rp {totalExpense.toLocaleString('id-ID')}</p>
              </div>
          </div>

          {/* TABEL DATA DETAIL */}
          <div className="grid lg:grid-cols-2 gap-8">
              
              {/* TABEL PEMASUKAN */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[500px]">
                  <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                      <h3 className="font-bold text-emerald-600 text-sm flex items-center gap-2">
                          <ArrowLeft className="rotate-45" size={16}/> Pemasukan
                      </h3>
                      <span className="text-xs text-slate-500 bg-white px-2 py-1 rounded border border-slate-200">{filteredTrans.length} Transaksi</span>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                      {loadingData ? <div className="text-center py-10"><Loader2 className="animate-spin inline text-slate-400"/></div> : 
                       filteredTrans.length === 0 ? <p className="text-center text-slate-400 text-xs py-10 italic">Belum ada data.</p> :
                       filteredTrans.map(t => {
                          const hasService = t.items?.some((i: any) => i.type === 'service');
                          const hasPart = t.items?.some((i: any) => i.type === 'part');
                          return (
                            <div key={t.id} className="flex justify-between items-center p-3 bg-white rounded-lg border border-slate-100 hover:border-emerald-200 hover:shadow-sm transition">
                                <div>
                                    <div className="text-sm font-bold text-slate-700">{t.customer_name}</div>
                                    <div className="text-[10px] text-slate-400 flex gap-2 mt-1">
                                        {formatDate(t.created_at)}
                                        {hasService && <span className="text-blue-600 bg-blue-50 px-1.5 rounded font-medium border border-blue-100">Jasa</span>}
                                        {hasPart && <span className="text-amber-600 bg-amber-50 px-1.5 rounded font-medium border border-amber-100">Part</span>}
                                    </div>
                                </div>
                                <div className="text-emerald-600 font-bold text-sm font-mono bg-emerald-50 px-2 py-1 rounded">
                                    + {t.total_amount.toLocaleString()}
                                </div>
                            </div>
                          );
                      })}
                  </div>
              </div>

              {/* TABEL PENGELUARAN */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[500px]">
                  <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                      <h3 className="font-bold text-red-500 text-sm flex items-center gap-2">
                          <TrendingDown size={16}/> Belanja Stok
                      </h3>
                      <span className="text-xs text-slate-500 bg-white px-2 py-1 rounded border border-slate-200">{filteredExpense.length} Log</span>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                      {loadingData ? <div className="text-center py-10"><Loader2 className="animate-spin inline text-slate-400"/></div> : 
                       filteredExpense.length === 0 ? <p className="text-center text-slate-400 text-xs py-10 italic">Belum ada data belanja.</p> :
                       filteredExpense.map(e => (
                          <div key={e.id} className="flex justify-between items-center p-3 bg-white rounded-lg border border-slate-100 hover:border-red-200 hover:shadow-sm transition">
                              <div>
                                  <div className="text-sm font-bold text-slate-700">{e.item_name}</div>
                                  <div className="text-[10px] text-slate-400 line-clamp-1">{e.description}</div>
                                  <div className="text-[10px] text-slate-400 mt-0.5">{formatDate(e.created_at)}</div>
                              </div>
                              <div className="text-right">
                                  <div className="text-red-500 font-bold text-sm font-mono">
                                      - {e.total_price.toLocaleString()}
                                  </div>
                                  <div className="text-[10px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded inline-block mt-1">Qty: {e.qty}</div>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>

          </div>
      </div>
    </div>
  );
}