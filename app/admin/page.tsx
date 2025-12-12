"use client";
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { 
  Bot, Plus, RefreshCw, Activity, Loader2, 
  UserX, UserCheck, Users, Settings, Wrench
} from 'lucide-react'; 
import { formatDate } from '@/lib/utils';
import PageHeader from '@/components/PageHeader';
// import MechanicStatus from '@/components/MechanicStatus'; // <-- KITA HAPUS INI
import TicketCard from '@/components/TicketCard';
import { useRoleGuard } from '@/lib/authGuard';

export default function AdminPage() {
  const router = useRouter();
  const { loading: authLoading } = useRoleGuard(['owner','admin']);
  const [queue, setQueue] = useState<any[]>([]);
  const [mechanics, setMechanics] = useState<any[]>([]);
  const [newMechName, setNewMechName] = useState('');
  const [lastUpdate, setLastUpdate] = useState(new Date());

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

  // --- HELPER: CEK STATUS SIBUK & DAPATKAN NO ANTRIAN ---
  const getMechanicJob = (mechId: string) => {
    // Cari tiket yang sedang dikerjakan mekanik ini
    return queue.find(ticket => ticket.mechanic_id === mechId && ticket.status === 'processing');
  };

  // --- HANDLERS ANTRIAN ---
  const handleAction = async (id: string, action: string) => {
    if (action === 'resume') {
        const { data: thisTicket } = await supabase.from('Antrian').select('mechanic_id').eq('id', id).single();
        if (thisTicket?.mechanic_id) {
            const { count } = await supabase.from('Antrian').select('*', { count: 'exact', head: true }).eq('mechanic_id', thisTicket.mechanic_id).eq('status', 'processing'); 
            if (count && count > 0) { alert("⚠️ Mekanik sedang sibuk."); await supabase.from('Antrian').update({ status: 'waiting' }).eq('id', id); } 
            else { await supabase.from('Antrian').update({ status: 'processing' }).eq('id', id); }
        } else { await supabase.from('Antrian').update({ status: 'waiting' }).eq('id', id); }
    } else { await supabase.from('Antrian').update({ status: action }).eq('id', id); }
    setLastUpdate(new Date());
  };
  const handleCancel = async (id: string) => { if (confirm("Batal?")) { await supabase.from('Antrian').update({ status: 'cancelled' }).eq('id', id); setLastUpdate(new Date()); } };
  const handleDeleteQueue = async (id: string) => { if (confirm("Hapus?")) await supabase.from('Antrian').delete().eq('id', id); };

  // --- FILTER MEKANIK ---
  const activeMechanics = mechanics.filter(m => m.is_active);
  const inactiveMechanics = mechanics.filter(m => !m.is_active);

  if (authLoading) return <div className="min-h-screen bg-gray-50 flex justify-center items-center text-slate-500"><Loader2 className="animate-spin mr-2"/> Cek Akses...</div>;

  return (
    <div className="space-y-6 pb-10"> 
      
      {/* HEADER */}
      <PageHeader 
        title="Admin Dashboard" 
        subtitle={`Operasional Harian - ${formatDate(new Date().toISOString())}`}
        icon={Bot}
        actions={
          <div className="flex flex-wrap gap-2 justify-end">
            <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-emerald-50 rounded-lg border border-emerald-200">
                <Activity size={16} className="text-emerald-600 animate-pulse"/>
                <span className="text-xs text-emerald-700 font-bold">System Live</span>
            </div>
          </div>
        }
      />
      
      <div className="grid lg:grid-cols-4 gap-6">
          
          {/* KOLOM KIRI: MANAJEMEN MEKANIK (COMPACT LIST) */}
          <div className="lg:col-span-1 space-y-4 ">
              
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden sticky top-6 ">
                  {/* Header Kecil */}
                  <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex justify-between items-center">
                      <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <Users size={16} className="text-blue-600"/> Data Mekanik
                      </h3>
                      <span className="text-[10px] font-mono bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                        Total: {mechanics.length}
                      </span>
                  </div>

                  {/* Form Tambah Simple */}
                  <div className="p-3 border-b border-slate-100">
                    <form onSubmit={handleAddMechanic} className="flex gap-2">
                        <input 
                            className="flex-1 bg-slate-50 border border-slate-200 rounded-md px-3 py-1.5 text-xs text-slate-800 focus:ring-1 focus:ring-blue-300 outline-none" 
                            placeholder="+ Mekanik Baru..." 
                            value={newMechName} 
                            onChange={e => setNewMechName(e.target.value)}
                        />
                        <button className="bg-blue-600 text-white p-1.5 rounded-md hover:bg-blue-700 transition">
                            <Plus size={14}/>
                        </button>
                    </form>
                  </div>

                  {/* LIST MEKANIK AKTIF (List View) */}
                  {/* ... Header dan Form di atas tetap sama ... */}

                  {/* LIST MEKANIK AKTIF (List View) */}
                  {/* UPDATE DISINI: Ubah max-h menjadi sekitar [260px] untuk muat 5 item */}
                  <div className="max-h-[260px] overflow-y-auto custom-scrollbar">
                      {activeMechanics.length === 0 && <p className="text-xs text-slate-400 text-center py-4 italic">Belum ada mekanik aktif.</p>}
                      
                      {activeMechanics.map(m => {
                          const currentJob = getMechanicJob(m.id); 
                          const isBusy = !!currentJob;
                          
                          return (
                            <div key={m.id} className="group flex items-center justify-between py-3 px-4 hover:bg-slate-50 border-b border-slate-50 last:border-0 transition-colors">
                                {/* Info Kiri: Status & Nama & Job */}
                                <div className="flex items-center gap-3 overflow-hidden w-full">
                                    {/* Indikator Status Dot */}
                                    <div className={`shrink-0 w-2.5 h-2.5 rounded-full ${isBusy ? 'bg-orange-500 animate-pulse' : 'bg-emerald-500'}`} title={isBusy ? "Sibuk" : "Ready"}></div>
                                    
                                    <div className="flex flex-col w-full pr-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-semibold text-slate-700 truncate">{m.name}</span>
                                            
                                            {/* Tombol Non-Aktif */}
                                            <button 
                                                onClick={() => !isBusy && handleToggleMechanicStatus(m.id, true)} 
                                                disabled={isBusy}
                                                className={`transition ${isBusy ? 'opacity-0 w-0 h-0 overflow-hidden' : 'text-slate-300 hover:text-slate-500 opacity-0 group-hover:opacity-100'}`}
                                            >
                                                <UserX size={14}/>
                                            </button>
                                        </div>

                                        {/* Keterangan Sedang Mengerjakan Apa */}
                                        {isBusy ? (
                                            <div className="flex items-center gap-1 text-[10px] text-orange-600 font-medium mt-0.5 bg-orange-50 w-fit px-1.5 py-0.5 rounded">
                                                <Wrench size={10} />
                                                <span>A-{currentJob.no_antrian}</span>
                                            </div>
                                        ) : (
                                            <span className="text-[10px] text-emerald-600 font-medium mt-0.5">Ready</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                          );
                      })}
                  </div>

                  {/* LIST NON-AKTIF (FOOTER) */}
                  {inactiveMechanics.length > 0 && (
                      <div className="bg-slate-50 border-t border-slate-200">
                          <div className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                             <Settings size={10}/> Non-Aktif ({inactiveMechanics.length})
                          </div>
                          <div className="max-h-[150px] overflow-y-auto custom-scrollbar px-2 pb-2">
                             {inactiveMechanics.map(m => (
                                <div key={m.id} className="flex justify-between items-center px-2 py-1.5 rounded hover:bg-slate-100">
                                    <span className="text-xs text-slate-400 line-through decoration-slate-300">{m.name}</span>
                                    <button 
                                        onClick={() => handleToggleMechanicStatus(m.id, false)} 
                                        className="text-slate-400 hover:text-emerald-600 p-1 hover:bg-emerald-50 rounded"
                                        title="Aktifkan Kembali"
                                    >
                                        <RefreshCw size={12}/>
                                    </button>
                                </div>
                             ))}
                          </div>
                      </div>
                  )}
              </div>
          </div>

          {/* KOLOM KANAN: STATUS & ANTRIAN */}
          <div className="lg:col-span-3">
            {/* Bagian CARD STATUS MEKANIK BESAR SUDAH DIHAPUS DI SINI */}
            
            <div className="space-y-4 max-h-[700px] overflow-y-auto custom-scrollbar pr-2 pb-2">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2 sticky top-0 bg-gray-50/95 backdrop-blur-sm py-2 z-10">Antrian Berjalan</h3>
              
              {queue.length === 0 && (
                  <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
                      <Bot size={48} className="text-slate-300 mx-auto mb-2"/>
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