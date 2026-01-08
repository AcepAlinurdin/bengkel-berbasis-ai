"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Save, Loader2, Store } from 'lucide-react';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import { useRoleGuard } from '@/lib/authGuard';

export default function SettingsPage() {
  // 🔒 HANYA OWNER YANG BOLEH AKSES
  const { loading: authLoading } = useRoleGuard(['owner']);

  const [config, setConfig] = useState({
      shop_name: '', address: '', phone: '', footer_msg: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
      const fetchSettings = async () => {
          const { data } = await supabase.from('Settings').select('*').single();
          if (data) setConfig(data);
      };
      if (!authLoading) fetchSettings();
  }, [authLoading]);

  const handleSave = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      
      // Update data (asumsi ID 1)
      const { error } = await supabase.from('Settings').update(config).eq('id', 1);
      
      setLoading(false);
      if(!error) alert("✅ Pengaturan berhasil disimpan!");
      else alert("Gagal menyimpan pengaturan.");
  };

  if (authLoading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-slate-500"><Loader2 className="animate-spin mr-2"/> Cek Akses...</div>;

  return (
    <div className="min-h-screen bg-gray-50 text-slate-800 p-4 sm:p-6 font-mono">
      
      {/* HEADER COMPACT (Sesuai Request) */}
      <div className="shrink-0 mb-4 flex justify-between items-end">
        <PageHeader 
            title="Pengaturan Bengkel" 
            subtitle="Konfigurasi Identitas Aplikasi & Struk" 
            icon={Store}
        />
        {/* Opsional: Tombol Kembali atau Aksi Lain bisa ditaruh di sini */}
      </div>

      <div className="max-w-3xl mx-auto">
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm">
              <div className="mb-6 pb-4 border-b border-slate-100">
                  <h2 className="text-lg font-bold text-slate-800">Profil Usaha</h2>
                  <p className="text-sm text-slate-500">Informasi ini akan ditampilkan pada Header Aplikasi dan Struk Belanja.</p>
              </div>

              <form onSubmit={handleSave} className="space-y-6">
                  
                  {/* Nama Bengkel */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                      <label className="text-sm font-bold text-slate-600 md:col-span-1">Nama Bengkel</label>
                      <div className="md:col-span-3">
                          <input 
                            type="text" 
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-800 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition" 
                            placeholder="Contoh: Bengkel Maju Jaya"
                            value={config.shop_name} 
                            onChange={e => setConfig({...config, shop_name: e.target.value})} 
                          />
                      </div>
                  </div>

                  {/* Alamat */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                      <label className="text-sm font-bold text-slate-600 md:col-span-1 pt-2">Alamat Lengkap</label>
                      <div className="md:col-span-3">
                          <textarea 
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-800 h-24 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition resize-none" 
                            placeholder="Alamat lengkap bengkel..."
                            value={config.address} 
                            onChange={e => setConfig({...config, address: e.target.value})} 
                          />
                      </div>
                  </div>

                  {/* Telepon */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                      <label className="text-sm font-bold text-slate-600 md:col-span-1">Nomor Telepon</label>
                      <div className="md:col-span-3">
                          <input 
                            type="text" 
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-800 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition" 
                            placeholder="Contoh: 0812-3456-7890"
                            value={config.phone} 
                            onChange={e => setConfig({...config, phone: e.target.value})} 
                          />
                      </div>
                  </div>

                  {/* Footer Struk */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                      <label className="text-sm font-bold text-slate-600 md:col-span-1">Pesan Footer</label>
                      <div className="md:col-span-3">
                          <input 
                            type="text" 
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-800 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition" 
                            placeholder="Contoh: Terimakasih atas kunjungan Anda"
                            value={config.footer_msg} 
                            onChange={e => setConfig({...config, footer_msg: e.target.value})} 
                          />
                          <p className="text-[10px] text-slate-400 mt-1 ml-1">Pesan ini akan muncul di bagian paling bawah struk belanja.</p>
                      </div>
                  </div>

                  {/* Tombol Simpan */}
                  <div className="pt-4 flex justify-end border-t border-slate-100">
                      <button disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl flex items-center gap-2 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all">
                          {loading ? <Loader2 className="animate-spin" size={20}/> : <><Save size={20}/> SIMPAN PERUBAHAN</>}
                      </button>
                  </div>
              </form>
          </div>
      </div>
    </div>
  );
}