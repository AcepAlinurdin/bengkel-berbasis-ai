"use client";
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import {
  Bot, Plus, RefreshCw, Activity, Loader2,
  UserX, UserCheck, Users, Settings, Wrench,
  CheckCircle, HelpCircle, Navigation, ShieldCheck,
  AlertTriangle, Info, Sparkles // Import icon tambahan untuk Alert
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import PageHeader from '@/components/PageHeader';
import TicketCard from '@/components/TicketCard';
import { useRoleGuard } from '@/lib/authGuard';
import Modal from '@/components/Modal';

// --- IMPORT DRIVER.JS ---
import { driver } from "driver.js"; 
import "driver.js/dist/driver.css"; 

// --- STYLE DRIVER.JS ---
const driverJsStyles = `
  .driver-popover.driverjs-theme { background-color: #ffffff; color: #1e293b; border-radius: 16px; box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1); border: 1px solid #e2e8f0; padding: 16px; font-family: inherit; max-width: 320px; }
  .driver-popover.driverjs-theme .driver-popover-title { font-size: 16px; font-weight: 800; color: #0f172a; margin-bottom: 8px; }
  .driver-popover.driverjs-theme .driver-popover-description { font-size: 13px; color: #64748b; line-height: 1.5; margin-bottom: 16px; }
  .driver-popover.driverjs-theme .driver-popover-footer { display: flex; align-items: center; margin-top: 10px; }
  .driver-popover.driverjs-theme .driver-popover-next-btn { background-color: #2563eb !important; color: white !important; border: none !important; border-radius: 8px !important; padding: 6px 14px !important; font-size: 12px !important; font-weight: 600 !important; }
  .driver-popover.driverjs-theme .driver-popover-prev-btn { background-color: #f1f5f9 !important; color: #64748b !important; border: 1px solid #e2e8f0 !important; border-radius: 8px !important; padding: 6px 12px !important; font-size: 12px !important; font-weight: 600 !important; margin-right: 8px !important; }
  .driver-popover.driverjs-theme .driver-popover-close-btn { color: #94a3b8; }
  .driver-popover.driverjs-theme .driver-popover-close-btn:hover { color: #ef4444; }
`;

// Definisi opsi tingkat kesulitan
const COMPLEXITY_OPTIONS = [
    { value: 'Ringan', label: 'Ringan', color: 'bg-green-100 text-green-800 border-green-200' },
    { value: 'Sedang', label: 'Sedang', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    { value: 'Berat', label: 'Berat', color: 'bg-red-100 text-red-800 border-red-200' },
];

// --- CUSTOM ALERT COMPONENT (Reused from Inventory) ---
const CustomAlert = ({ isOpen, type, title, message, onConfirm, onCancel, confirmText = "OK", cancelText = "Batal", isConfirmMode = false }: any) => {
    if (!isOpen) return null;

    let icon = <Info className="text-blue-500" size={32} />;
    let colorClass = "border-blue-100 bg-blue-50";

    if (type === 'success') {
        icon = <CheckCircle className="text-emerald-500" size={32} />;
        colorClass = "border-emerald-100 bg-emerald-50";
    } else if (type === 'error') {
        icon = <AlertTriangle className="text-red-500" size={32} />;
        colorClass = "border-red-100 bg-red-50";
    } else if (type === 'warning') {
        icon = <Sparkles className="text-amber-500" size={32} />;
        colorClass = "border-amber-100 bg-amber-50";
    }

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm transition-opacity">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100 animate-in zoom-in-95">
                <div className={`p-6 flex flex-col items-center text-center ${colorClass} border-b`}>
                    <div className="bg-white p-3 rounded-full shadow-sm mb-3">{icon}</div>
                    <h3 className="text-lg font-bold text-slate-800">{title}</h3>
                </div>
                <div className="p-6">
                    <p className="text-sm text-slate-600 text-center mb-6 leading-relaxed">{message}</p>
                    <div className="flex gap-3">
                        {isConfirmMode && (
                            <button onClick={onCancel} className="flex-1 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition text-sm">
                                {cancelText}
                            </button>
                        )}
                        <button onClick={onConfirm} className={`flex-1 px-4 py-2.5 text-white rounded-xl font-bold shadow-md transition text-sm flex justify-center items-center ${type === 'error' ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-600 hover:bg-blue-700'}`}>
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- WELCOME TOUR MODAL ---
const WelcomeTourModal = ({ isOpen, onStart, onSkip }: any) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative scale-100 animate-in zoom-in-95 duration-300 border border-white/20">
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-blue-600 to-indigo-600"></div>
        <div className="absolute top-4 right-4 text-white/20"><ShieldCheck size={80} /></div>
        <div className="relative pt-12 px-8 pb-8 text-center">
          <div className="w-20 h-20 bg-white rounded-2xl shadow-xl flex items-center justify-center mx-auto mb-6 relative z-10 transform rotate-3 hover:rotate-0 transition-all duration-500">
             <Bot size={40} className="text-blue-600" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-3">Admin Dashboard 🛠️</h2>
          <p className="text-slate-500 text-sm leading-relaxed mb-8">
            Pusat kendali operasional bengkel. <br/>
            Pantau antrian, kelola mekanik, dan selesaikan pekerjaan dari sini.
          </p>
          <div className="space-y-3">
            <button onClick={onStart} className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg hover:shadow-blue-200 flex items-center justify-center gap-2 group">
              <Navigation size={16} className="group-hover:translate-x-1 transition-transform"/> Mulai Panduan
            </button>
            <button onClick={onSkip} className="w-full py-3 bg-white text-slate-400 rounded-xl font-semibold text-xs hover:text-slate-600 hover:bg-slate-50 transition-colors">
              Lewati Tutorial
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function AdminPage() {
    const router = useRouter();
    const { loading: authLoading } = useRoleGuard(['owner', 'admin']);
    const [queue, setQueue] = useState<any[]>([]);
    const [mechanics, setMechanics] = useState<any[]>([]);
    const [newMechName, setNewMechName] = useState('');
    const [lastUpdate, setLastUpdate] = useState(new Date());

    // --- STATE MODAL & ALERT ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
    const [selectedComplexity, setSelectedComplexity] = useState<string>('Ringan'); 
    
    // State Custom Alert
    const [alertConfig, setAlertConfig] = useState({
        isOpen: false, type: 'info', title: '', message: '', isConfirmMode: false,
        onConfirm: () => {}, onCancel: () => {}, confirmText: 'OK', cancelText: 'Batal'
    });

    const showAlert = (type: string, title: string, message: string) => {
        setAlertConfig({ isOpen: true, type, title, message, isConfirmMode: false, onConfirm: () => setAlertConfig(prev => ({...prev, isOpen: false})), onCancel: () => setAlertConfig(prev => ({...prev, isOpen: false})), confirmText: 'OK', cancelText: '' });
    };

    const showConfirm = (type: string, title: string, message: string, onYes: () => void) => {
        setAlertConfig({
            isOpen: true, type, title, message, isConfirmMode: true,
            onConfirm: () => { onYes(); setAlertConfig(prev => ({...prev, isOpen: false})); },
            onCancel: () => setAlertConfig(prev => ({...prev, isOpen: false})),
            confirmText: 'Ya', cancelText: 'Tidak'
        });
    };

    // --- STATE TOUR ---
    const [showWelcomeModal, setShowWelcomeModal] = useState(false);

    // --- TOUR LOGIC (UPDATED STEPS) ---
    const startDriverTour = () => {
        setShowWelcomeModal(false);

        const driverObj = driver({
          showProgress: true, allowClose: true, overlayColor: 'rgb(15 23 42 / 0.9)', animate: true, popoverClass: 'driverjs-theme', nextBtnText: 'Lanjut', prevBtnText: 'Kembali', doneBtnText: 'Selesai',
          
          steps: [
            { element: '#tour-mechanic-list', popover: { title: '1. Daftar Mekanik', description: 'Lihat siapa saja mekanik yang aktif dan sedang bekerja. Indikator warna menunjukkan status mereka (Hijau = Ready, Oranye = Sibuk).', side: "right", align: 'start' } },
            { element: '#tour-add-mechanic', popover: { title: '2. Tambah Mekanik', description: 'Ketik nama dan klik (+) untuk mendaftarkan mekanik baru ke dalam sistem.', side: "bottom", align: 'start' } },
            { element: '#tour-inactive-mechanics', popover: { title: '3. Mekanik Non-Aktif', description: 'Mekanik yang sedang cuti/off akan muncul di sini. Klik ikon Refresh untuk mengaktifkan kembali.', side: "right", align: 'start' } },
            { element: '#tour-queue-list', popover: { title: '4. Antrian Berjalan', description: 'Semua kendaraan yang sedang dikerjakan muncul di sini.', side: "left", align: 'start' } },
            
            // --- UPDATE: PENJELASAN AKSI TIKET YANG LEBIH DETAIL ---
            { 
                element: '.ticket-card-action-btn', // Menargetkan area tombol aksi pada tiket
                popover: { 
                  title: '5. Aksi Tiket & Kendala', 
                  description: `
                    Gunakan tombol di sini sesuai kondisi lapangan:
                    <br/><br/>
                    ✅ <strong>Selesai (Done):</strong> Klik jika servis tuntas & motor siap diambil.
                    <br/>
                    ⏸️ <strong>Pause/Wait:</strong> Klik jika ada kendala (misal: <em>Sparepart kosong di toko</em>).
                    <br/>
                    ❌ <strong>Batal:</strong> Klik jika antrian dibatalkan (misal: <em>Orangnya tidak ada / pulang</em>).
                  `, 
                  side: "left", align: 'start' 
                } 
            },
          ],
          onDestroyStarted: () => { localStorage.setItem('hasSeenAdminTour', 'true'); driverObj.destroy(); },
        });
    
        driverObj.drive();
    };

    useEffect(() => {
        const hasSeenTour = localStorage.getItem('hasSeenAdminTour');
        if (!hasSeenTour) { setShowWelcomeModal(true); }
    }, []);
    
    const handleSkipTour = () => { localStorage.setItem('hasSeenAdminTour', 'true'); setShowWelcomeModal(false); };
    const handleRestartTour = () => { localStorage.removeItem('hasSeenAdminTour'); setShowWelcomeModal(true); };

    // --- LOGIC AUTO ASSIGN ---
    const assignTicketsToMechanics = useCallback(async () => {
        try {
            const { data: activeMechanics } = await supabase.from('Mechanics').select('*').eq('is_active', true);
            if (!activeMechanics || activeMechanics.length === 0) return;
            const { data: ongoingTickets } = await supabase.from('Antrian').select('mechanic_id').eq('status', 'processing');
            const busyMechanicIds = ongoingTickets?.map(t => t.mechanic_id) || [];
            const freeMechanics = activeMechanics.filter(m => !busyMechanicIds.includes(m.id));
            if (freeMechanics.length > 0) {
                const { data: allWaitingTickets } = await supabase.from('Antrian').select('*').eq('status', 'waiting').order('created_at', { ascending: true });
                if (allWaitingTickets && allWaitingTickets.length > 0) {
                    const updates = []; const assignedTicketIds = new Set();
                    for (const mech of freeMechanics) {
                        let targetTicket = allWaitingTickets.find(t => t.mechanic_id === mech.id && !assignedTicketIds.has(t.id));
                        if (!targetTicket) targetTicket = allWaitingTickets.find(t => !assignedTicketIds.has(t.id) && (t.mechanic_id === null || t.mechanic_id !== mech.id));
                        if (targetTicket) {
                            assignedTicketIds.add(targetTicket.id);
                            updates.push(supabase.from('Antrian').update({ status: 'processing', mechanic_id: mech.id }).eq('id', targetTicket.id));
                        }
                    }
                    if (updates.length > 0) { await Promise.all(updates); setLastUpdate(new Date()); }
                }
            }
        } catch (err) { console.error(err); }
    }, []);

    // --- FETCH DATA ---
    const fetchData = useCallback(async () => {
        const { data: qData } = await supabase.from('Antrian').select('*').not('status', 'in', '("done","cancelled","paid")').order('created_at', { ascending: true });
        if (qData) setQueue(qData);
        const { data: mData } = await supabase.from('Mechanics').select('*').order('created_at', { ascending: true });
        if (mData) setMechanics(mData);
    }, []);

    useEffect(() => {
        if (authLoading) return;
        fetchData(); assignTicketsToMechanics();
        const channel = supabase.channel('admin-realtime-global')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'Antrian' }, () => { fetchData(); assignTicketsToMechanics(); })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'Mechanics' }, () => { fetchData(); assignTicketsToMechanics(); })
            .subscribe();
        const intervalId = setInterval(() => { assignTicketsToMechanics(); fetchData(); }, 3000);
        return () => { supabase.removeChannel(channel); clearInterval(intervalId); };
    }, [fetchData, assignTicketsToMechanics, authLoading]);

    // --- HANDLERS MEKANIK ---
    const handleAddMechanic = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMechName) return;
        await supabase.from('Mechanics').insert([{ name: newMechName, is_active: true }]);
        setNewMechName('');
        setLastUpdate(new Date());
    };

    const handleToggleMechanicStatus = async (id: string, currentStatus: boolean) => {
        await supabase.from('Mechanics').update({ is_active: !currentStatus }).eq('id', id);
        setLastUpdate(new Date());
    };

    const getMechanicJob = (mechId: string) => {
        return queue.find(ticket => ticket.mechanic_id === mechId && ticket.status === 'processing');
    };

    // --- HANDLERS ANTRIAN (UPDATED WITH CUSTOM ALERT) ---
    const handleAction = async (id: string, action: string) => {
        if (action === 'done') {
            setSelectedTicketId(id);
            setSelectedComplexity('Ringan'); 
            setIsModalOpen(true);
            return; 
        }

        try {
            if (action === 'resume') {
                const { data: thisTicket } = await supabase.from('Antrian').select('mechanic_id').eq('id', id).single();
                if (thisTicket?.mechanic_id) {
                    const { count } = await supabase.from('Antrian').select('*', { count: 'exact', head: true }).eq('mechanic_id', thisTicket.mechanic_id).eq('status', 'processing');
                    // GANTI ALERT BIASA DENGAN CUSTOM ALERT
                    if (count && count > 0) { 
                        showAlert("warning", "Mekanik Sibuk", "Mekanik ini sedang mengerjakan unit lain. Harap tunggu atau alihkan.");
                        await supabase.from('Antrian').update({ status: 'waiting' }).eq('id', id); 
                    }
                    else { await supabase.from('Antrian').update({ status: 'processing' }).eq('id', id); }
                } else { await supabase.from('Antrian').update({ status: 'waiting' }).eq('id', id); }
            } else {
                await supabase.from('Antrian').update({ status: action }).eq('id', id);
            }
            setLastUpdate(new Date());
        } catch (err) {
            console.error("Terjadi kesalahan pada handleAction:", err);
            showAlert("error", "Error", "Terjadi kesalahan saat memproses tindakan.");
        }
    };

    const handleConfirmDone = async () => {
        if (!selectedTicketId) return;
        try {
            const { data: ticketData, error: ticketError } = await supabase.from('Antrian').select('mechanic_id, id, no_antrian').eq('id', selectedTicketId).single();
            if (ticketError || !ticketData) throw new Error("Tiket tidak ditemukan.");

            let points = 1;
            if (selectedComplexity === 'Sedang') points = 2;
            if (selectedComplexity === 'Berat') points = 3;

            if (ticketData.mechanic_id) {
                const { error: logError } = await supabase.from('MechanicLogs').insert([{ mechanic_id: ticketData.mechanic_id, ticket_id: ticketData.id, complexity: selectedComplexity, points: points, created_at: new Date().toISOString() }]);
                if (logError) console.warn("Gagal simpan log:", logError.message);
            }

            const { error: updateError } = await supabase.from('Antrian').update({ status: 'done', complexity_level: selectedComplexity, completed_at: new Date().toISOString() }).eq('id', selectedTicketId);
            if (updateError) throw updateError;

            setLastUpdate(new Date());
            setIsModalOpen(false); 
            setSelectedTicketId(null);
            fetchData(); 
        } catch (err: any) {
            console.error("Error:", err);
            showAlert("error", "Gagal", err.message);
        }
    };

    // --- REPLACED NATIVE CONFIRM WITH CUSTOM ALERT ---
    const handleCancel = async (id: string) => { 
        showConfirm('warning', 'Batalkan Antrian?', 'Apakah pelanggan tidak ada di tempat atau meminta pembatalan? Data akan ditandai "Cancelled".', async () => {
            await supabase.from('Antrian').update({ status: 'cancelled' }).eq('id', id); 
            setLastUpdate(new Date()); 
        });
    };

    const handleDeleteQueue = async (id: string) => { 
        showConfirm('error', 'Hapus Data?', 'Data antrian akan dihapus permanen dari database. Lanjutkan?', async () => {
            await supabase.from('Antrian').delete().eq('id', id); 
        });
    };

    const activeMechanics = mechanics.filter(m => m.is_active);
    const inactiveMechanics = mechanics.filter(m => !m.is_active);

    if (authLoading) return <div className="min-h-screen bg-gray-50 flex justify-center items-center text-slate-500"><Loader2 className="animate-spin mr-2"/> Cek Akses...</div>;

    return (
        <div className="space-y-6 pb-10 relative"> 
            <style>{driverJsStyles}</style>

            {/* MODAL WELCOME */}
            <WelcomeTourModal isOpen={showWelcomeModal} onStart={startDriverTour} onSkip={handleSkipTour} />

            {/* CUSTOM ALERT & CONFIRM DIALOG */}
            <CustomAlert 
                isOpen={alertConfig.isOpen}
                type={alertConfig.type}
                title={alertConfig.title}
                message={alertConfig.message}
                onConfirm={alertConfig.onConfirm}
                onCancel={alertConfig.onCancel}
                confirmText={alertConfig.confirmText}
                cancelText={alertConfig.cancelText}
                isConfirmMode={alertConfig.isConfirmMode}
            />

            {/* MODAL SELESAI PEKERJAAN */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Konfirmasi Penyelesaian">
                <div className="space-y-4">
                    <p className="text-sm text-gray-600">Silakan tentukan tingkat kesulitan untuk pekerjaan ini sebelum menyelesaikannya.</p>
                    <div className="grid grid-cols-3 gap-3">
                        {COMPLEXITY_OPTIONS.map((option) => (
                            <button key={option.value} onClick={() => setSelectedComplexity(option.value)} className={`py-2 px-3 rounded-lg border-2 text-sm font-semibold transition-all ${selectedComplexity === option.value ? `${option.color} shadow-sm scale-[1.02]` : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'}`}>
                                {option.label}
                            </button>
                        ))}
                    </div>
                    <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                        <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">Batal</button>
                        <button onClick={handleConfirmDone} className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"><CheckCircle size={16} /> Konfirmasi Selesai</button>
                    </div>
                </div>
            </Modal>

            {/* HEADER */}
            <div className="shrink-0 mb-4 flex justify-between items-end">
                <PageHeader 
                    title="Admin Dashboard" 
                    subtitle={`Operasional Harian - ${formatDate(new Date().toISOString())}`}
                    icon={Bot}
                    actions={
                        <div className="flex flex-wrap gap-2 justify-end">
                            <button onClick={handleRestartTour} className="bg-white border border-slate-200 text-slate-500 px-3 py-2 rounded-lg text-xs font-bold hover:bg-slate-50 hover:text-blue-600 flex items-center gap-2 shadow-sm transition" title="Panduan Admin">
                                <HelpCircle size={14}/>
                            </button>
                            <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-emerald-50 rounded-lg border border-emerald-200">
                                <Activity size={16} className="text-emerald-600 animate-pulse" />
                                <span className="text-xs text-emerald-700 font-bold">System Live</span>
                            </div>
                        </div>
                    }
                />
            </div>

            <div className="grid lg:grid-cols-4 gap-6">
                {/* KOLOM KIRI: MANAJEMEN MEKANIK */}
                <div className="lg:col-span-1 space-y-4" id="tour-mechanic-list">
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden sticky top-6 ">
                        <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2"><Users size={16} className="text-blue-600" /> Data Mekanik</h3>
                            <span className="text-[10px] font-mono bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Total: {mechanics.length}</span>
                        </div>
                        <div className="p-3 border-b border-slate-100" id="tour-add-mechanic">
                            <form onSubmit={handleAddMechanic} className="flex gap-2">
                                <input className="flex-1 bg-slate-50 border border-slate-200 rounded-md px-3 py-1.5 text-xs text-slate-800 focus:ring-1 focus:ring-blue-300 outline-none" placeholder="+ Mekanik Baru..." value={newMechName} onChange={e => setNewMechName(e.target.value)} />
                                <button className="bg-blue-600 text-white p-1.5 rounded-md hover:bg-blue-700 transition"><Plus size={14} /></button>
                            </form>
                        </div>
                        <div className="max-h-[260px] overflow-y-auto custom-scrollbar">
                            {activeMechanics.length === 0 && <p className="text-xs text-slate-400 text-center py-4 italic">Belum ada mekanik aktif.</p>}
                            {activeMechanics.map(m => {
                                const currentJob = getMechanicJob(m.id);
                                const isBusy = !!currentJob;
                                return (
                                    <div key={m.id} className="group flex items-center justify-between py-3 px-4 hover:bg-slate-50 border-b border-slate-50 last:border-0 transition-colors">
                                        <div className="flex items-center gap-3 overflow-hidden w-full">
                                            <div className={`shrink-0 w-2.5 h-2.5 rounded-full ${isBusy ? 'bg-orange-500 animate-pulse' : 'bg-emerald-500'}`} title={isBusy ? "Sibuk" : "Ready"}></div>
                                            <div className="flex flex-col w-full pr-2">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm font-semibold text-slate-700 truncate">{m.name}</span>
                                                    <button onClick={() => !isBusy && handleToggleMechanicStatus(m.id, true)} disabled={isBusy} className={`transition ${isBusy ? 'opacity-0 w-0 h-0 overflow-hidden' : 'text-slate-300 hover:text-slate-500 opacity-0 group-hover:opacity-100'}`}><UserX size={14} /></button>
                                                </div>
                                                {isBusy ? (<div className="flex items-center gap-1 text-[10px] text-orange-600 font-medium mt-0.5 bg-orange-50 w-fit px-1.5 py-0.5 rounded"><Wrench size={10} /><span>A-{currentJob.no_antrian}</span></div>) : (<span className="text-[10px] text-emerald-600 font-medium mt-0.5">Ready</span>)}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        {inactiveMechanics.length > 0 && (
                            <div className="bg-slate-50 border-t border-slate-200" id="tour-inactive-mechanics">
                                <div className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2"><Settings size={10} /> Non-Aktif ({inactiveMechanics.length})</div>
                                <div className="max-h-[150px] overflow-y-auto custom-scrollbar px-2 pb-2">
                                    {inactiveMechanics.map(m => (
                                        <div key={m.id} className="flex justify-between items-center px-2 py-1.5 rounded hover:bg-slate-100">
                                            <span className="text-xs text-slate-400 line-through decoration-slate-300">{m.name}</span>
                                            <button onClick={() => handleToggleMechanicStatus(m.id, false)} className="text-slate-400 hover:text-emerald-600 p-1 hover:bg-emerald-50 rounded" title="Aktifkan Kembali"><RefreshCw size={12} /></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* KOLOM KANAN: STATUS & ANTRIAN */}
                <div className="lg:col-span-3">
                    <div className="space-y-4 max-h-[700px] overflow-y-auto custom-scrollbar pr-2 pb-2" id="tour-queue-list">
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2 sticky top-0 bg-gray-50/95 backdrop-blur-sm py-2 z-10">Antrian Berjalan</h3>
                        {queue.length === 0 && (
                            <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
                                <Bot size={48} className="text-slate-300 mx-auto mb-2" />
                                <p className="text-slate-500 font-medium">Tidak ada antrian aktif saat ini.</p>
                                <span className="text-xs text-slate-400">Silakan input di halaman depan.</span>
                            </div>
                        )}
                        {queue.map((item) => {
                            const mechName = mechanics.find(m => m.id === item.mechanic_id)?.name;
                            return <TicketCard key={item.id} item={item} isAdmin={true} onAction={handleAction} onCancel={handleCancel} onDelete={handleDeleteQueue} assignedMechanicName={mechName} />;
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}