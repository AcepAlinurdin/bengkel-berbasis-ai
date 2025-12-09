import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

// Halaman yang menjadi home default untuk setiap role
const ROLE_HOME_MAP: Record<string, string> = {
    'owner': '/admin/dashboard',
    'admin': '/admin',
    'kasir': '/admin/kasir',
};

export function useRoleGuard(allowedRoles: string[]) {
    const router = useRouter();
    const [role, setRole] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkRole = async () => {
            let userRole: string = 'guest';

            try {
                // 1. Cek Session
                const { data: { session } } = await supabase.auth.getSession();
                
                if (!session) {
                    router.replace('/login'); 
                    return;
                }

                // 2. Ambil Role dari Database
                // *PASTIKAN NAMA TABEL DI SINI SUDAH BENAR* (Asumsi huruf kecil: 'profiles')
                const { data: profile, error } = await supabase
                    .from('Profiles')
                    .select('role')
                    .eq('id', session.user.id)
                    .single();

                if (error && error.message.includes('Could not find')) {
                    // Penanganan jika tabel belum dibuat/gagal fetch (Error 404)
                    console.warn("Role Guard: Gagal fetch profile. Menggunakan role default.");
                    userRole = 'mekanik'; // Fallback aman
                } else if (error) {
                     // Penanganan error lain
                    console.error("Role Guard: Database error:", error.message);
                    router.replace('/login');
                    return;
                } else {
                    userRole = profile?.role || 'mekanik'; // Role yang sebenarnya
                }

                // 3. LOGIKA AKSES
                if (!allowedRoles.includes(userRole)) {
                    // User tidak memiliki izin, alihkan ke halaman home yang seharusnya
                    const redirectPath = ROLE_HOME_MAP[userRole] || '/login';
                    router.replace(redirectPath);
                    return; // Hentikan eksekusi
                }

                // 4. Izin Sesuai
                setRole(userRole);
                
            } catch (e) {
                console.error("Fatal Auth Error:", e);
                router.replace('/login');
            } finally {
                // Hentikan loading HANYA setelah semua pengecekan selesai
                setLoading(false);
            }
        };

        checkRole();
    }, [allowedRoles, router]); // Dependency array sudah benar

    return { role, loading };
}