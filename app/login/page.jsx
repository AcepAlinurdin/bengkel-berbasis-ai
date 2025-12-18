"use client";
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowLeft, LogIn, Wrench } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Hapus ": React.FormEvent" di sini
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Proses Login ke Auth Supabase
      const { data: { user }, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) throw error;
      if (!user) throw new Error("User tidak ditemukan");

      // 2. CEK ROLE (JABATAN) DI DATABASE
      const { data: profile } = await supabase
        .from('Profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      const role = profile?.role || 'mekanik'; 

      // 3. ARAHKAN SESUAI JABATAN
      // Owner DAN Admin masuk ke /admin
      if (role === 'owner' || role === 'admin') {
          router.push('/admin'); 
      } 
      // Kasir masuk ke kasir
      else if (role === 'kasir') {
          router.push('/admin/kasir'); 
      } 
      // Mekanik/User biasa ke halaman antrian
      else {
          router.push('/'); 
      }

    } catch (err) {
        // Hapus ": any" di sini
        alert("Login Gagal: " + (err.message || "Terjadi kesalahan"));
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center font-mono p-4">
      {/* Container Utama (Card) */}
      <div className="bg-white p-8 rounded-2xl border border-slate-200 w-full max-w-md shadow-xl">
        
        {/* Tombol Kembali */}
        <Link href="/" className="text-slate-500 mb-8 flex items-center gap-2 hover:text-blue-600 transition group text-sm font-medium">
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform"/> Kembali ke Antrian
        </Link>
        
        {/* Logo & Header */}
        <div className="text-center mb-8">
            <div className="bg-blue-50 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-blue-600 border border-blue-100 shadow-sm">
                <Wrench size={40} />
            </div>
            <h1 className="text-2xl text-slate-800 font-black tracking-tight">Staff Login</h1>
            <p className="text-slate-500 text-sm mt-2">Masuk untuk mengelola sistem bengkel</p>
        </div>

        {/* Form Login */}
        <form onSubmit={handleLogin} method="POST" action="#" className="space-y-5">
            <div>
                <label className="text-xs font-bold text-slate-600 uppercase mb-2 block tracking-wider">Email Address</label>
                <input 
                    type="email" 
                    value={email} 
                    onChange={e=>setEmail(e.target.value)} 
                    className="w-full bg-white border border-slate-300 p-3.5 rounded-xl text-slate-800 focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none transition placeholder:text-slate-400" 
                    placeholder="nama@bengkel.com"
                />
            </div>
            <div>
                <label className="text-xs font-bold text-slate-600 uppercase mb-2 block tracking-wider">Password</label>
                <input 
                    type="password" 
                    value={password} 
                    onChange={e=>setPassword(e.target.value)} 
                    className="w-full bg-white border border-slate-300 p-3.5 rounded-xl text-slate-800 focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none transition placeholder:text-slate-400" 
                    placeholder="••••••••"
                />
            </div>
            
            <button 
                disabled={loading} 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold p-4 rounded-xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 flex justify-center items-center gap-2 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {loading ? <Loader2 className="animate-spin"/> : "Masuk ke Sistem"}
            </button>
        </form>

        {/* Footer Kecil */}
        <div className="mt-8 text-center">
            <p className="text-xs text-slate-400">© 2025 Bengkel AI System</p>
        </div>
      </div>
    </div>
  );
}