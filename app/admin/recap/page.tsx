"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, ArrowLeft, Calendar, BarChart3, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';
import PageHeader from '@/components/PageHeader';
import { useRoleGuard } from '@/lib/authGuard';

export default function RecapPage() {
  const { loading: authLoading } = useRoleGuard(['owner', 'admin']);
  const [rawData, setRawData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      // --- PERBAIKAN DI SINI ---
      // Kita ambil status 'done' (Selesai Mekanik) DAN 'paid' (Selesai Bayar)
      const { data, error } = await supabase
        .from('Antrian')
        .select('*')
        .in('status', ['done', 'paid']) // <--- INI KUNCINYA
        .order('created_at', { ascending: false });
      
      if (error) {
          console.error("Error fetching recap:", error);
      } else {
          setRawData(data || []);
      }
      setLoading(false);
    };

    if (!authLoading) fetchData();
  }, [authLoading]);

  // --- LOGIC PENGELOMPOKAN DATA ---
  const groupData = () => {
      const groups: Record<string, any[]> = {};

      rawData.forEach(item => {
          if (!item.created_at) return; // Skip jika data error

          const date = new Date(item.created_at);
          let key = '';

          if (mode === 'daily') {
              // YYYY-MM-DD
              key = date.toISOString().split('T')[0];
          } 
          else if (mode === 'weekly') {
              // Hitung Minggu
              const d = new Date(date.valueOf());
              const dayNum = d.getUTCDay() || 7;
              d.setUTCDate(d.getUTCDate() + 4 - dayNum);
              const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
              const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1)/7);
              key = `${d.getUTCFullYear()}-W${weekNo}`;
          } 
          else if (mode === 'monthly') {
              // YYYY-MM
              key = `${date.getFullYear()}-${date.getMonth()}`;
          }

          if (!groups[key]) groups[key] = [];
          groups[key].push(item);
      });

      return groups;
  };

  const getLabel = (key: string) => {
      try {
        if (mode === 'daily') return formatDate(key);
        if (mode === 'weekly') return key.replace('W', 'Minggu ke-');
        if (mode === 'monthly') {
            const [year, month] = key.split('-');
            const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
            return `${monthNames[parseInt(month)]} ${year}`;
        }
      } catch (e) {
        return key;
      }
      return key;
  };

  const groupedData = groupData();
  const sortedKeys = Object.keys(groupedData).sort().reverse(); 

  if (authLoading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-slate-500"><Loader2 className="animate-spin mr-2"/> Cek Akses...</div>;

  return (
    <div className="min-h-screen bg-gray-50 text-slate-800 p-6 font-mono">
      <PageHeader 
        title="Rekapitulasi Servis" 
        subtitle="Analisis jumlah kendaraan selesai berdasarkan periode"
        icon={BarChart3}
        
      />
      
      <div className="max-w-5xl mx-auto space-y-8">
          
          {/* CONTROL PANEL */}
          <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
              {/* TAB SWITCHER */}
              <div className="flex gap-2 p-1 w-full sm:w-auto overflow-x-auto">
                  {(['daily', 'weekly', 'monthly'] as const).map((m) => (
                      <button 
                        key={m}
                        onClick={() => setMode(m)} 
                        className={`px-6 py-2 text-sm rounded-lg transition font-bold capitalize flex-1 sm:flex-none ${mode === m ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                      >
                          {m === 'daily' ? 'Harian' : m === 'weekly' ? 'Mingguan' : 'Bulanan'}
                      </button>
                  ))}
              </div>
              
              {/* TOTAL SUMMARY */}
              <div className="px-6 py-3 bg-emerald-50 rounded-lg border border-emerald-100 flex items-center gap-3 m-2 sm:m-0 w-full sm:w-auto">
                  <div className="bg-emerald-100 p-2 rounded-full text-emerald-600"><CheckCircle2 size={20}/></div>
                  <div>
                      <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Total Selesai</p>
                      <p className="text-xl font-black text-emerald-700">{rawData.length} <span className="text-xs font-normal text-emerald-600">Unit</span></p>
                  </div>
              </div>
          </div>

          {/* LIST GROUP */}
          <div className="space-y-6">
              {loading ? (
                  <div className="py-20 flex justify-center text-slate-400"><Loader2 className="animate-spin mr-2"/> Memuat Data...</div>
              ) : sortedKeys.length === 0 ? (
                  <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
                      <p className="text-slate-400 italic">Belum ada data selesai.</p>
                  </div>
              ) : (
                  sortedKeys.map((key) => {
                      const items = groupedData[key];
                      const total = items.length;

                      return (
                          <div key={key} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                              {/* HEADER GROUP */}
                              <div className="bg-slate-50/80 p-4 flex justify-between items-center border-b border-slate-100 backdrop-blur-sm sticky top-0 z-10">
                                  <div className="flex items-center gap-3">
                                      <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-sm text-blue-500">
                                          <Calendar size={20}/>
                                      </div>
                                      <span className="font-bold text-slate-700 text-lg">{getLabel(key)}</span>
                                  </div>
                                  <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold border border-blue-100">
                                      {total} Motor
                                  </span>
                              </div>
                              
                              {/* DETAIL ITEMS */}
                              <div className="divide-y divide-slate-100">
                                  {items.map((item: any) => (
                                      <div key={item.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 hover:bg-slate-50 transition gap-4">
                                          <div className="flex-1">
                                              <div className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                                  {item.costumer_name}
                                                  {item.plate_number && <span className="bg-slate-100 text-slate-500 text-[10px] px-2 py-0.5 rounded border border-slate-200">{item.plate_number}</span>}
                                              </div>
                                              <p className="text-xs text-slate-500 mt-1 line-clamp-1">{item.issue}</p>
                                              <div className="flex gap-2 mt-2">
                                                  {/* STATUS BADGE */}
                                                  {item.status === 'paid' ? (
                                                      <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded border border-emerald-100 font-bold">LUNAS</span>
                                                  ) : (
                                                      <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100 font-bold">SELESAI (Belum Bayar)</span>
                                                  )}
                                                  
                                                  {item.mechanic_id && <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded border border-slate-200">🔧 Teknisi</span>}
                                              </div>
                                          </div>
                                          <div className="text-right shrink-0">
                                              <span className="text-xs font-mono text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-100 block">A-{item.no_antrian}</span>
                                              <span className="text-[10px] text-slate-400 mt-1 block">{new Date(item.created_at).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})}</span>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      );
                  })
              )}
          </div>
      </div>
    </div>
  );
}