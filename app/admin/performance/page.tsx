"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  ArrowLeft, Trophy, Zap, Loader2, Star, User, BarChart 
} from 'lucide-react';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import { useRoleGuard } from '@/lib/authGuard';

export default function PerformancePage() {
  const { loading: authLoading } = useRoleGuard(['owner']); // Hanya Owner
  const [mechanics, setMechanics] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [aiResult, setAiResult] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  // 1. Fetch Data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      // Ambil data mekanik yang aktif
      const { data: mData } = await supabase.from('Mechanics').select('*').eq('is_active', true);
      
      // Ambil tiket yang sudah selesai, termasuk tingkat kesulitannya
      // PENTING: Pastikan kolom 'complexity_level' sudah ada di tabel 'Antrian'
      const { data: tData } = await supabase
        .from('Antrian')
        .select('mechanic_id, complexity_level') 
        .eq('status', 'done');

      if (mData) setMechanics(mData);
      if (tData) setTickets(tData);
      setLoading(false);
    };
    if (!authLoading) fetchData();
  }, [authLoading]);

  // 2. Logic Kirim ke AI
  const handleAnalyze = async () => {
    setAnalyzing(true);
    
    // Siapkan data untuk AI
    // Sekarang kita menyertakan 'complexity_level' (Tingkat Kesulitan) dalam data yang dikirim ke AI
    const reportData = mechanics.map(mech => {
        const myJobs = tickets.filter(t => t.mechanic_id === mech.id);
        return {
            name: mech.name,
            // Kirim daftar tingkat kesulitan pekerjaan yang telah diselesaikan
            // Contoh: ['Ringan', 'Berat', 'Sedang', 'Ringan']
            complexity_levels: myJobs.map(t => t.complexity_level).filter(Boolean) // Filter untuk memastikan tidak ada nilai null/undefined
        };
    });

    try {
        const response = await fetch('/api/analyze-performance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: reportData })
        });
        const result = await response.json();
        setAiResult(result);
    } catch (e) {
        alert("Gagal menganalisis performa.");
    } finally {
        setAnalyzing(false);
    }
  };

  if (authLoading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-slate-500"><Loader2 className="animate-spin mr-2"/> Cek Akses...</div>;

  return (
    <div className="min-h-screen bg-gray-50 text-slate-800 p-6 font-mono">
      <PageHeader 
        title="Analisis Performa HR" 
        subtitle="Evaluasi Kinerja Mekanik Berbasis AI (Mempertimbangkan Tingkat Kesulitan Pekerjaan)"
        icon={Trophy}
        
      />

      <div className="max-w-6xl mx-auto space-y-8">
          
          {/* BAGIAN ATAS: CONTROLLER */}
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BarChart size={32}/>
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">Evaluasi Produktivitas & Kualitas</h2>
              <p className="text-slate-500 text-sm mb-6 max-w-lg mx-auto">
                  AI akan menganalisis riwayat pekerjaan, termasuk jumlah dan **tingkat kesulitan (Ringan/Sedang/Berat)**, untuk memberikan skor kinerja yang objektif.
              </p>
              
              {!analyzing && aiResult.length === 0 && (
                  <button 
                    onClick={handleAnalyze}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:shadow-blue-500/20 transition flex items-center gap-2 mx-auto active:scale-95"
                  >
                      <Zap size={20}/> MULAI ANALISIS AI
                  </button>
              )}

              {analyzing && (
                  <div className="flex justify-center items-center gap-3 text-blue-600 animate-pulse bg-blue-50 py-3 px-6 rounded-xl w-fit mx-auto">
                      <Loader2 className="animate-spin"/> Sedang menilai kinerja mekanik...
                  </div>
              )}
          </div>

          {/* BAGIAN BAWAH: HASIL AI */}
          {aiResult.length > 0 && (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Urutkan ranking berdasarkan skor tertinggi */}
                  {aiResult.sort((a,b) => b.score - a.score).map((res, idx) => (
                      <div key={idx} className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-md transition relative group">
                          {/* Rank Badge */}
                          <div className={`absolute top-0 right-0 px-4 py-1 rounded-bl-xl text-xs font-black border-l border-b ${idx === 0 ? 'bg-yellow-100 text-yellow-700 border-yellow-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                              RANK #{idx + 1}
                          </div>

                          <div className="p-6">
                              {/* Header Card */}
                              <div className="flex items-center gap-4 mb-6">
                                  <div className="p-3 bg-slate-50 rounded-full border border-slate-100">
                                      <User size={24} className="text-slate-400"/>
                                  </div>
                                  <div>
                                      <h3 className="text-lg font-bold text-slate-800">{res.name}</h3>
                                      <span className="inline-block bg-blue-50 text-blue-600 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-100 mt-1 uppercase">
                                          {res.title}
                                      </span>
                                  </div>
                              </div>

                              {/* Skor Meter */}
                              <div className="mb-6">
                                  <div className="flex justify-between items-end mb-2">
                                      <span className="text-xs font-bold text-slate-400 uppercase">Skor Kinerja</span>
                                      <span className={`text-3xl font-black ${res.score > 80 ? 'text-emerald-500' : res.score > 60 ? 'text-blue-500' : 'text-orange-500'}`}>{res.score}</span>
                                  </div>
                                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                                      <div 
                                        className={`h-3 rounded-full transition-all duration-1000 ${res.score > 80 ? 'bg-emerald-500' : res.score > 60 ? 'bg-blue-500' : 'bg-orange-500'}`} 
                                        style={{ width: `${res.score}%` }}
                                      ></div>
                                  </div>
                              </div>

                              {/* Summary Box */}
                              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-4 min-h-[80px]">
                                  <p className="text-sm text-slate-600 italic leading-relaxed">"{res.summary}"</p>
                              </div>

                              {/* Suggestion */}
                              <div className="flex gap-2 items-start text-xs text-slate-500 bg-white p-2 rounded border border-slate-100">
                                  <Star size={14} className="text-amber-400 mt-0.5 shrink-0 fill-amber-400"/>
                                  <p>{res.suggestion}</p>
                              </div>
                          </div>
                      </div>
                  ))}
              </div>
          )}

          {/* DATA MENTAH (Jika belum dianalisis) */}
          {aiResult.length === 0 && !analyzing && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 opacity-50 hover:opacity-100 transition">
                  {mechanics.map(m => {
                      const count = tickets.filter(t => t.mechanic_id === m.id).length;
                      return (
                          <div key={m.id} className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-center">
                              <span className="font-bold text-slate-700">{m.name}</span>
                              <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-500 border border-slate-200 font-mono">{count} Jobs Selesai</span>
                          </div>
                      );
                  })}
              </div>
          )}

      </div>
    </div>
  );
}