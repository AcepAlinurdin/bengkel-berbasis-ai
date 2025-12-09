"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AdminSidebar from "@/components/AdminSidebar"; 
import { Loader2 } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      // Hanya cek apakah user terautentikasi (ADA SESI)
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
          // Jika sesi tidak ada, redirect.
          router.push("/login");
          return;
      }
      
      // *** KITA HAPUS SEMUA LOGIKA PENGECEKAN ROLE DATABASE DISINI ***
      // *** Layout HANYA BERTUGAS memastikan user sudah login. ***
      
      setIsLoading(false);
    };

    checkUser();
    
    // Opsional: Langganan perubahan sesi (dapat membantu refresh token)
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT') {
            router.push('/login');
        }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };

  }, [router]);

  if (isLoading) {
    // Tampilan Loading
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <Loader2 className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <AdminSidebar />
      <main className="flex-1 md:ml-64 p-4 md:p-8 transition-all duration-300">
        {children}
      </main>
    </div>
  );
}