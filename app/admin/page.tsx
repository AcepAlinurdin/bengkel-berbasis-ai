"use client";
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { 
  Bot, UserCog, Trash2, Plus, RefreshCw, Activity, Loader2, ShoppingCart, 
  Package, FileText, Wallet, LogOut, LayoutDashboard 
} from 'lucide-react';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';
import PageHeader from '@/components/PageHeader';
import MechanicStatus from '@/components/MechanicStatus';
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
    const channel = supabase.channel('admin-realtime-global').on('postgres_changes', { event: '*', schema: 'public', table: 'Antrian' }, () => { fetchData(); assignTicketsToMechanics(); }).on('postgres_changes', { event: '*', schema: 'public', table: 'Mechanics' }, () => { fetchData(); assignTicketsToMechanics(); }).subscribe();
    const intervalId = setInterval(() => { assignTicketsToMechanics(); fetchData(); }, 3000); 
    return () => { supabase.removeChannel(channel); clearInterval(intervalId); };
  }, [fetchData, assignTicketsToMechanics, authLoading]);

  // --- HANDLERS ---
  const handleAddMechanic = async (e: React.FormEvent) => { e.preventDefault(); if (!newMechName) return; await supabase.from('Mechanics').insert([{ name: newMechName, is_active: true }]); setNewMechName(''); setLastUpdate(new Date()); };
  const handleDeleteMechanic = async (id: string) => { if(confirm("Hapus?")) { await supabase.from('Mechanics').delete().eq('id', id); setLastUpdate(new Date()); } };
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
  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/'); };

  if (authLoading) return <div className="min-h-screen bg-gray-50 flex justify-center items-center text-slate-500"><Loader2 className="animate-spin mr-2"/> Cek Akses...</div>;

  return (
    <div className="space-y-6"> 
      
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
      
      <div className="grid lg:grid-cols-4 gap-8">
          
          {/* KOLOM KIRI: MANAJEMEN MEKANIK */}
          <div className="lg:col-span-1 space-y-4">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm sticky top-6">
                  <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-100 pb-2"><UserCog size={20} className="text-blue-600"/> Kelola Mekanik</h3>
                  
                  <form onSubmit={handleAddMechanic} className="flex gap-2 mb-4">
                      <input 
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-blue-200 outline-none" 
                        placeholder="Nama Mekanik..." 
                        value={newMechName} 
                        onChange={e => setNewMechName(e.target.value)}
                      />
                      <button className="bg-blue-600 text-white p-2.5 rounded-lg hover:bg-blue-700 shadow-md transition"><Plus size={18}/></button>
                  </form>

                  <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                      {mechanics.map(m => (
                          <div key={m.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100 hover:border-blue-200 transition group">
                              <span className="text-sm font-semibold text-slate-700">{m.name}</span>
                              <button onClick={() => handleDeleteMechanic(m.id)} className="text-slate-400 hover:text-red-500 transition"><Trash2 size={16}/></button>
                          </div>
                      ))}
                      {mechanics.length === 0 && <p className="text-xs text-slate-400 text-center py-4 italic">Belum ada mekanik.</p>}
                  </div>
              </div>
          </div>

          {/* KOLOM KANAN: STATUS & ANTRIAN */}
          <div className="lg:col-span-3">
            <MechanicStatus mechanics={mechanics} tickets={queue} />
            
            {/* CONTAINER ANTRIAN SCROLLABLE */}
            {/* max-h-[500px] membatasi tinggi kira-kira 2 kartu + header, selebihnya di-scroll */}
            <div className="space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar pr-2 pb-2">
              {queue.length === 0 && (
                  <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300">
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