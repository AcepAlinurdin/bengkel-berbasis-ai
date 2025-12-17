"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, Calendar, BarChart3, CheckCircle2, User, FileText, Wallet } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import PageHeader from '@/components/PageHeader';
import { useRoleGuard } from '@/lib/authGuard';

// --- KOMPONEN KARTU SERVIS (Tidak Berubah) ---
const ServiceCard = ({ item }: { item: any }) => {
  const isPaid = item.status === 'paid';

  return (
    <div className="bg-white p-4 rounded-xl border border-gray-100 hover:border-blue-100 hover:shadow-md transition-all duration-200 group">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex gap-3 items-start">
          <div className={`p-2 rounded-full ${isPaid ? 'bg-green-50 text-green-500' : 'bg-blue-50 text-blue-500'} group-hover:scale-110 transition-transform`}>
            {isPaid ? <Wallet size={20} /> : <CheckCircle2 size={20} />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-gray-800 text-base">{item.costumer_name}</h4>
              {item.plate_number && (
                <span className="bg-gray-100 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full">
                  {item.plate_number}
                </span>
              )}
            </div>
            <p className="text-gray-500 text-sm mt-1 flex items-center gap-1">
              <FileText size={14} /> {item.issue}
            </p>
            <div className="flex gap-2 mt-2">
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${isPaid ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                {isPaid ? 'LUNAS' : 'SELESAI (Belum Bayar)'}
              </span>
              {item.mechanic_id && (
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 flex items-center gap-1">
                  <User size={12} /> Teknisi
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="font-mono font-bold text-lg text-blue-600">
            A-{item.no_antrian}
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {new Date(item.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>
    </div>
  );
};

// --- HALAMAN UTAMA ---
export default function RecapPage() {
  const { loading: authLoading } = useRoleGuard(['owner', 'admin']);
  const [rawData, setRawData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('Antrian')
        .select('*')
        .in('status', ['done', 'paid'])
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

  // --- LOGIC PENGELOMPOKAN DATA (DIPERBAIKI UNTUK MINGGUAN) ---
  const groupData = () => {
    const groups: Record<string, any[]> = {};
    rawData.forEach(item => {
      if (!item.created_at) return;
      const date = new Date(item.created_at);
      let key = '';

      if (mode === 'daily') {
        // Key: YYYY-MM-DD
        key = date.toISOString().split('T')[0];
      } 
      else if (mode === 'weekly') {
        // PERBAIKAN: Kelompokkan berdasarkan tanggal hari Senin di minggu tersebut
        const d = new Date(date);
        const day = d.getDay(); // 0 (Minggu) - 6 (Sabtu)
        // Hitung selisih hari untuk mendapatkan hari Senin terdekat sebelumnya
        // Jika hari ini Minggu (0), mundur 6 hari. Jika Senin (1), mundur 0 hari, dst.
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); 
        const monday = new Date(d.setDate(diff));
        // Key: YYYY-MM-DD (Tanggal hari Senin)
        key = monday.toISOString().split('T')[0];
      } 
      else if (mode === 'monthly') {
        // Key: YYYY-MM
        key = `${date.getFullYear()}-${date.getMonth()}`;
      }

      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });
    return groups;
  };

  // --- LOGIC LABEL (DIPERBAIKI UNTUK MINGGUAN) ---
  const getLabel = (key: string) => {
    try {
      if (mode === 'daily') return formatDate(key); // Menggunakan fungsi formatDate yang sudah ada
      
      if (mode === 'weekly') {
        // Key adalah tanggal hari Senin (YYYY-MM-DD). Kita buat rentang Senin - Minggu.
        const monday = new Date(key);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6); // Tambah 6 hari untuk dapat hari Minggu

        const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
        const startStr = monday.toLocaleDateString('id-ID', options);
        const endStr = sunday.toLocaleDateString('id-ID', options);
        
        // Output contoh: "Minggu: 23 Okt - 29 Okt"
        return `Minggu: ${startStr} - ${endStr}`;
      }

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

  if (authLoading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-500"><Loader2 className="animate-spin mr-2" /> Cek Akses...</div>;

  return (
    // PERBAIKAN LAYOUT SCROLLING:
    // 1. h-screen: Set tinggi halaman fix setinggi layar
    // 2. flex flex-col: Atur layout secara vertikal
    // 3. overflow-hidden: Sembunyikan scrollbar utama browser
    <div className="h-screen bg-gray-50 text-gray-800 font-sans flex flex-col overflow-hidden">
      
      {/* BAGIAN ATAS YANG DIAM (HEADER & KONTROL) */}
      <div className="p-6 pb-0 shrink-0 z-20 relative">
        <PageHeader
          title="Rekapitulasi Servis"
          subtitle="Pantau riwayat dan analisis jumlah kendaraan yang telah selesai diservis."
          icon={BarChart3}
        />

        <div className="max-w-5xl mx-auto mt-6">
          {/* CONTROL PANEL & SUMMARY */}
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
            {/* TAB SWITCHER */}
            <div className="flex gap-1 p-1 bg-gray-100/50 rounded-xl w-full sm:w-auto overflow-x-auto">
              {(['daily', 'weekly', 'monthly'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`px-5 py-2.5 text-sm rounded-lg transition-all font-semibold capitalize flex-1 sm:flex-none ${mode === m ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:bg-white/60 hover:text-gray-700'}`}
                >
                  {m === 'daily' ? 'Harian' : m === 'weekly' ? 'Mingguan' : 'Bulanan'}
                </button>
              ))}
            </div>

            {/* TOTAL SUMMARY CARD */}
            <div className="px-5 py-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl text-white flex items-center gap-4 shadow-lg shadow-blue-200 w-full sm:w-auto">
              <div className="bg-white/20 p-2 rounded-full backdrop-blur-sm">
                <CheckCircle2 size={24} className="text-white" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider opacity-90">Total Selesai</p>
                <p className="text-2xl font-bold leading-none">{rawData.length} <span className="text-sm font-normal opacity-80">Unit</span></p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BAGIAN BAWAH YANG BISA DI-SCROLL */}
      {/* flex-1: Mengambil sisa ruang vertikal */}
      {/* overflow-y-auto: Menambahkan scrollbar hanya di area ini jika kontennya panjang */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 pt-4">
        <div className="max-w-5xl mx-auto space-y-8">
          {/* DATA LIST */}
          <div className="space-y-8">
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center text-gray-400">
                <Loader2 className="animate-spin mb-2 h-8 w-8 text-blue-500" />
                <p>Sedang memuat data rekapitulasi...</p>
              </div>
            ) : sortedKeys.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
                <BarChart3 size={48} className="text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">Belum ada data servis yang selesai untuk periode ini.</p>
                <p className="text-sm text-gray-400">Data akan muncul setelah teknisi menyelesaikan pekerjaan.</p>
              </div>
            ) : (
              sortedKeys.map((key) => {
                const items = groupedData[key];
                const total = items.length;

                return (
                  <section key={key} className="space-y-4">
                    {/* HEADER GROUP (Sticky di dalam container scroll) */}
                    <div className="flex items-center justify-between sticky top-0 bg-gray-50/95 backdrop-blur-sm py-3 z-10">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-lg shadow-sm border border-gray-100 text-blue-500">
                          <Calendar size={20} />
                        </div>
                        {/* Label yang sudah diperbaiki */}
                        <h3 className="font-bold text-gray-800 text-xl capitalize">{getLabel(key)}</h3>
                      </div>
                      <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-bold">
                        {total} Motor
                      </span>
                    </div>

                    {/* LIST ITEMS */}
                    <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
                      {items.map((item: any) => (
                        <ServiceCard key={item.id} item={item} />
                      ))}
                    </div>
                  </section>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}