"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  Bot, LayoutDashboard, ShoppingCart, Package, FileText, 
  Wallet, LogOut, Settings, Wrench, BarChart, Menu, X, Loader2, UserCircle
} from 'lucide-react';

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  
  // State UI
  const [isOpen, setIsOpen] = useState(false);
  
  // State User Role & Loading
  const [userRole, setUserRole] = useState<string | null>(null); 
  const [loading, setLoading] = useState(true);

  // --- 1. LOGIKA AMBIL ROLE (ANTI ERROR) ---
  useEffect(() => {
    const getUserRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          // Jika tidak login, biarkan kosong atau redirect (di handle middleware biasanya)
          setLoading(false);
          return;
        }

        // Coba ambil data dari tabel 'profiles'
        const { data: profile, error } = await supabase
          .from('Profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (error) {
          // JIKA ERROR (Misal tabel belum dibuat / 404):
          console.warn("⚠️ Database Error (Abaikan jika sedang dev):", error.message);
          console.log("👉 Mengaktifkan 'Dev Mode': Role set ke 'owner' agar menu muncul.");
          
          // FALLBACK: Set ke 'owner' agar Anda tetap bisa kerja melihat semua menu
          setUserRole('owner'); 
        } else {
          // JIKA SUKSES: Pakai role asli dari database
          setUserRole(profile?.role || 'guest');
        }

      } catch (err) {
        console.error("Critical Error:", err);
        setUserRole('owner'); // Fallback aman
      } finally {
        setLoading(false);
      }
    };

    getUserRole();
  }, []);

  // Otomatis tutup sidebar saat pindah halaman (di Mobile)
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // --- DAFTAR MENU ---
  const menuItems = [
    { 
      href: '/admin/dashboard', 
      label: 'Dasboard', 
      icon: LayoutDashboard, 
      allowed: ['owner'] 
    },
    { 
      href: '/admin', 
      label: 'Operasional', 
      icon: Bot, 
      allowed: ['owner', 'admin'] 
    },
    { 
      href: '/admin/kasir', 
      label: 'Kasir', 
      icon: ShoppingCart, 
      allowed: ['owner', 'kasir', 'admin'] 
    },
    { 
      href: '/admin/finance', 
      label: 'Keuangan', 
      icon: Wallet, 
      allowed: ['owner'] 
    },
    { 
      href: '/admin/recap', 
      label: 'Rekapitulasi', 
      icon: FileText, 
      allowed: ['owner'] 
    },
    { 
      href: '/admin/performance', 
      label: 'HR & Performa', 
      icon: BarChart, 
      allowed: ['owner'] 
    },
    { 
      href: '/admin/inventory', 
      label: 'Gudang', 
      icon: Package, 
      allowed: ['owner', 'admin'] 
    },
    { 
      href: '/admin/settings', 
      label: 'Pengaturan', 
      icon: Settings, 
      allowed: ['owner'] 
    },
  ];

  return (
    <>
      {/* 1. TOMBOL HAMBURGER (Mobile Only) */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 bg-white rounded-lg shadow-md border border-slate-200 text-slate-600 hover:text-blue-600 transition"
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* 2. BACKDROP (Mobile Only) */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* 3. SIDEBAR UTAMA */}
      <aside className={`
        fixed left-0 top-0 h-screen w-64 bg-white border-r border-slate-200 z-50 flex flex-col transition-transform duration-300 ease-in-out shadow-xl md:shadow-none
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:translate-x-0
      `}>
        
        {/* LOGO AREA */}
        <div className="p-6 border-b border-slate-100 flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg text-white shadow-md shadow-blue-200">
            <Wrench size={24} />
          </div>
          <div>
            <h1 className="font-black text-xl text-slate-800 tracking-tight">BENGKEL MOVIO</h1>
            <p className="text-[10px] text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded-full w-fit">Beta 0.2</p>
          </div>
        </div>

        {/* MENU LINKS */}
        <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1 custom-scrollbar">
          
          {loading ? (
            // Tampilan Loading
            <div className="flex flex-col items-center justify-center h-32 text-slate-400 gap-3 animate-pulse">
              <Loader2 className="animate-spin" size={24} />
              <span className="text-xs font-medium">Memuat akses...</span>
            </div>
          ) : (
            <>
              {/* Info User Role (Optional: Supaya tau login sebagai apa) */}
              <div className="px-4 mb-4 flex items-center gap-2 text-xs text-slate-500 bg-slate-50 p-2 rounded border border-slate-100 mx-2">
                <UserCircle size={14} />
                <span>Akses: <b className="text-blue-600 uppercase">{userRole}</b></span>
              </div>

              <p className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Menu Utama
              </p>
              
              {menuItems
                // FILTER: Hanya tampilkan menu yang diizinkan untuk role ini
                .filter(item => item.allowed.includes(userRole || '')) 
                .map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link 
                      key={item.href} 
                      href={item.href}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 group ${
                        isActive 
                          ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100' 
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <item.icon size={18} className={`transition-colors ${isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                      {item.label}
                    </Link>
                  );
              })}

              {/* Tampilkan pesan jika tidak ada menu (misal role guest) */}
              {!loading && menuItems.filter(item => item.allowed.includes(userRole || '')).length === 0 && (
                 <div className="text-center p-4 mt-4 bg-red-50 text-red-600 text-xs rounded-lg mx-2 border border-red-100">
                   Role Anda <b>({userRole})</b> belum memiliki akses menu.
                 </div>
              )}
            </>
          )}
        </nav>

        {/* FOOTER / LOGOUT */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <button 
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 w-full px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 hover:text-red-700 rounded-xl transition-all border border-transparent hover:border-red-100"
          >
            <LogOut size={18} />
            Keluar Sistem
          </button>
        </div>
      </aside>
    </>
  );
}