"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Trophy, Zap, Loader2, Star, User, BarChart, History, Calendar, Filter
} from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { useRoleGuard } from '@/lib/authGuard';

export default function PerformancePage() {
  const { loading: authLoading } = useRoleGuard(['owner']); 
  const [mechanics, setMechanics] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [aiResult, setAiResult] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  // --- STATE FILTER WAKTU ---
  // Default ke bulan saat ini (index 0-11, jadi kita ambil getMonth())
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().getMonth().toString());
  const [filterType, setFilterType] = useState<'monthly' | 'yearly'>('monthly');

  // Helper: Mendapatkan Rentang Tanggal (Start & End)
  const getDateRange = () => {
    const now = new Date();
    const year = now.getFullYear();
    let startDate, endDate;

    if (filterType === 'yearly') {
        // 1 Tahun Penuh (1 Jan - 31 Des tahun ini)
        startDate = new Date(year, 0, 1); // 1 Jan 00:00
        endDate = new Date(year, 11, 31, 23, 59, 59); // 31 Des 23:59
    } else {
        // Per Bulan
        const monthIndex = parseInt(selectedMonth);
        startDate = new Date(year, monthIndex, 1); // Tanggal 1 bulan itu
        // Ambil hari terakhir bulan itu (tanggal 0 bulan depannya = tanggal terakhir bulan ini)
        endDate = new Date(year, monthIndex + 1, 0, 23, 59, 59);
    }

    // Konversi ke ISO String untuk Supabase (Menggunakan toISOString akan mengonversi ke UTC)
    // Supaya aman dan sesuai jam lokal Indonesia (WIB), kita sesuaikan offset manual atau biarkan UTC jika DB sudah UTC.
    // Di sini kita pakai ISO standar:
    return {
        start: startDate.toISOString(),
        end: endDate.toISOString()
    };
  };

  // 1. Fetch Data (Dipanggil setiap filter berubah)
  useEffect(() => {
    const fetchData = async () => {
      if (authLoading) return;
      setLoading(true);
      
      const { start, end } = getDateRange();
      console.log(`Fetching logs from ${start} to ${end}`);

      // Ambil data mekanik aktif
      const { data: mData } = await supabase.from('Mechanics').select('*').eq('is_active', true);
      
      // Ambil riwayat kerja DENGAN FILTER TANGGAL
      const { data: lData } = await supabase
        .from('MechanicLogs')
        .select('mechanic_id, complexity, points, created_at')
        .gte('created_at', start) // Greater than or Equal (Mulai tanggal 1)
        .lte('created_at', end)   // Less than or Equal (Sampai akhir periode)
        .order('created_at', { ascending: false });

      if (mData) setMechanics(mData);
      if (lData) setLogs(lData);
      
      // Reset hasil AI jika filter berubah (karena datanya beda)
      setAiResult([]); 
      setLoading(false);
    };

    fetchData();
  }, [authLoading, selectedMonth, filterType]); // Re-run jika bulan/tipe filter berubah

  // 2. Logic Kirim ke AI
  const handleAnalyze = async () => {
    setAnalyzing(true);
    const reportData = mechanics.map(mech => {
        const myLogs = logs.filter(l => l.mechanic_id === mech.id);
        const totalPoints = myLogs.reduce((sum, item) => sum + (item.points || 0), 0);
        return {
            name: mech.name,
            total_jobs: myLogs.length,
            total_points: totalPoints,
            complexity_history: myLogs.map(l => l.complexity).filter(Boolean) 
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
        console.error(e);
        alert("Gagal menganalisis performa.");
    } finally {
        setAnalyzing(false);
    }
  };

  // List Bulan untuk Dropdown
  const months = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni", 
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];

  if (authLoading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-slate-500"><Loader2 className="animate-spin mr-2"/> Cek Akses...</div>;

  return (
    <div className="min-h-screen bg-gray-50 text-slate-800 p-6 font-mono">
      <div className="shrink-0 mb-4 flex justify-between items-end">
  <PageHeader 
    title="Analisis Performa HR" 
    subtitle="Evaluasi Kinerja Mekanik Berbasis Poin & Periode Waktu" 
    icon={Trophy}
  />
</div>

      <div className="max-w-6xl mx-auto space-y-6">
          
          {/* --- FILTER BAR (BARU) --- */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-2 text-slate-600">
                  <Filter size={20} />
                  <span className="font-bold text-sm">Periode Laporan:</span>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                  {/* Pilihan Bulanan / Tahunan */}
                  <div className="flex bg-slate-100 p-1 rounded-lg">
                      <button 
                        onClick={() => setFilterType('monthly')}
                        className={`px-4 py-2 text-xs font-bold rounded-md transition ${filterType === 'monthly' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        Per Bulan
                      </button>
                      <button 
                        onClick={() => setFilterType('yearly')}
                        className={`px-4 py-2 text-xs font-bold rounded-md transition ${filterType === 'yearly' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        1 Tahun ({new Date().getFullYear()})
                      </button>
                  </div>

                  {/* Dropdown Bulan (Hanya muncul jika filterType = monthly) */}
                  {filterType === 'monthly' && (
                      <div className="relative">
                          <select 
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="appearance-none bg-white border border-slate-200 text-slate-700 py-2 pl-4 pr-10 rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                          >
                              {months.map((m, idx) => (
                                  <option key={idx} value={idx}>{m}</option>
                              ))}
                          </select>
                          <Calendar size={16} className="absolute right-3 top-2.5 text-slate-400 pointer-events-none"/>
                      </div>
                  )}
              </div>
          </div>

          {/* BAGIAN DATA LOGS (INFO JUMLAH DATA) */}
          <div className="text-center">
             {loading ? (
                 <p className="text-xs text-slate-400 animate-pulse">Mengambil data log...</p>
             ) : (
                 <p className="text-xs text-slate-400">
                    Menampilkan data dari <strong>{filterType === 'yearly' ? `Tahun ${new Date().getFullYear()}` : `Bulan ${months[parseInt(selectedMonth)]}`}</strong>. 
                    Ditemukan <strong>{logs.length}</strong> riwayat pekerjaan.
                 </p>
             )}
          </div>

          {/* BAGIAN ANALYSIS CONTROLLER */}
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BarChart size={32}/>
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">Evaluasi Kinerja</h2>
              <p className="text-slate-500 text-sm mb-6 max-w-lg mx-auto">
                  AI akan menganalisis data pada periode yang dipilih untuk memberikan penilaian objektif.
              </p>
              
              {!analyzing && aiResult.length === 0 && (
                  <button 
                    onClick={handleAnalyze}
                    disabled={logs.length === 0}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:shadow-blue-500/20 transition flex items-center gap-2 mx-auto active:scale-95"
                  >
                      <Zap size={20}/> ANALISIS PERIODE INI
                  </button>
              )}

              {analyzing && (
                  <div className="flex justify-center items-center gap-3 text-blue-600 animate-pulse bg-blue-50 py-3 px-6 rounded-xl w-fit mx-auto">
                      <Loader2 className="animate-spin"/> Menganalisis periode {filterType === 'monthly' ? months[parseInt(selectedMonth)] : 'Tahunan'}...
                  </div>
              )}
          </div>

          {/* BAGIAN TENGAH: HASIL AI */}
          {aiResult.length > 0 && (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-500">
                  {aiResult.sort((a,b) => b.score - a.score).map((res, idx) => (
                      <div key={idx} className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-md transition relative group">
                          <div className={`absolute top-0 right-0 px-4 py-1 rounded-bl-xl text-xs font-black border-l border-b ${idx === 0 ? 'bg-yellow-100 text-yellow-700 border-yellow-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                              RANK #{idx + 1}
                          </div>
                          <div className="p-6">
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
                              <div className="mb-6">
                                  <div className="flex justify-between items-end mb-2">
                                      <span className="text-xs font-bold text-slate-400 uppercase">Skor</span>
                                      <span className={`text-3xl font-black ${res.score > 80 ? 'text-emerald-500' : res.score > 60 ? 'text-blue-500' : 'text-orange-500'}`}>{res.score}</span>
                                  </div>
                                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                                      <div 
                                        className={`h-3 rounded-full transition-all duration-1000 ${res.score > 80 ? 'bg-emerald-500' : res.score > 60 ? 'bg-blue-500' : 'bg-orange-500'}`} 
                                        style={{ width: `${res.score}%` }}
                                      ></div>
                                  </div>
                              </div>
                              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-4 min-h-[80px]">
                                  <p className="text-sm text-slate-600 italic leading-relaxed">"{res.summary}"</p>
                              </div>
                              <div className="flex gap-2 items-start text-xs text-slate-500 bg-white p-2 rounded border border-slate-100">
                                  <Star size={14} className="text-amber-400 mt-0.5 shrink-0 fill-amber-400"/>
                                  <p>{res.suggestion}</p>
                              </div>
                          </div>
                      </div>
                  ))}
              </div>
          )}

          {/* BAGIAN BAWAH: DATA MENTAH (STATS) */}
          <div className="mt-8">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                <History size={16}/> Data Bulan ({filterType === 'monthly' ? months[parseInt(selectedMonth)] : '1 Tahun'})
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {mechanics.map(m => {
                    const myLogs = logs.filter(l => l.mechanic_id === m.id);
                    const totalPoints = myLogs.reduce((sum, item) => sum + (item.points || 0), 0);
                    
                    return (
                        <div key={m.id} className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col items-center text-center hover:border-blue-300 transition">
                            <span className="font-bold text-slate-700 mb-1">{m.name}</span>
                            <div className="flex gap-2 mt-1">
                                <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-500 border border-slate-200 font-mono">
                                    {myLogs.length} Jobs
                                </span>
                                <span className="text-xs bg-emerald-50 px-2 py-1 rounded text-emerald-600 border border-emerald-100 font-bold">
                                    {totalPoints} Poin
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
          </div>

      </div>
    </div>
  );
}