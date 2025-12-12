"use client";
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Bot, LogIn, Loader2, Ticket, User, Clock, Wrench, 
  Activity, Search, Phone, Bike, Users
} from 'lucide-react';
import Link from 'next/link';
import { getTodayDate } from '@/lib/utils';

// --- COMPONENT: TICKET CARD ---
const TicketCard = ({ item, mechName }: any) => {
  const statusStyles: any = {
    processing: 'border-l-4 border-blue-500 bg-white shadow-md',
    waiting_part: 'border-l-4 border-purple-500 bg-purple-50 shadow-sm',
    pending: 'border-l-4 border-orange-400 bg-orange-50',
    waiting: 'border-l-4 border-slate-300 bg-white shadow-sm'
  };

  const badgeStyles: any = {
    processing: 'bg-blue-100 text-blue-700',
    waiting_part: 'bg-purple-100 text-purple-700',
    pending: 'bg-orange-100 text-orange-700',
    waiting: 'bg-slate-100 text-slate-600'
  };

  const statusLabel: any = {
      processing: 'SEDANG DIKERJAKAN', 
      waiting_part: 'TUNGGU SPAREPART', 
      pending: 'PENDING / ISTIRAHAT', 
      waiting: 'MENUNGGU GILIRAN'
  };

  return (
    <div className={`p-5 rounded-xl transition-all duration-300 border border-slate-100 ${statusStyles[item.status]}`}>
      <div className="flex justify-between items-start gap-4">
        <div className="w-full">
           <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-2">
              <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                  {item.costumer_name}
                  {item.plate_number && <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded border border-slate-200 font-mono">{item.plate_number}</span>}
              </h3>
              <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wide w-fit ${badgeStyles[item.status]}`}>
                  {statusLabel[item.status] || item.status}
              </span>
           </div>
           
           {mechName && ['processing', 'waiting_part', 'pending'].includes(item.status) && (
               <div className="text-xs text-blue-600 mb-3 flex items-center gap-1 bg-blue-50 px-2 py-1 rounded w-fit border border-blue-100 font-medium">
                   <Wrench size={12}/> Dikerjakan oleh: {mechName}
               </div>
           )}

           <p className="text-slate-600 text-sm mb-3 bg-slate-50 p-2 rounded border border-slate-100 italic">"{item.issue}"</p>
           
           <div className="flex flex-wrap items-center gap-3 text-xs">
              <span className="text-emerald-600 font-medium flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded border border-emerald-100"><Bot size={12}/> {item.ai_analysis || "-"}</span>
              <span className="text-slate-500 flex items-center gap-1"><Clock size={12}/> ± {item.estimated_mins} Menit</span>
           </div>
        </div>
        
        <div className="text-center bg-slate-50 p-3 rounded-lg border border-slate-200 min-w-[70px]">
           <span className="block text-[10px] text-slate-400 font-bold uppercase">Nomor</span>
           <span className="block text-3xl font-black text-slate-700">A-{item.no_antrian}</span>
        </div>
      </div>
    </div>
  );
};

export default function UserPage() {
  const [queue, setQueue] = useState<any[]>([]);
  const [mechanics, setMechanics] = useState<any[]>([]);
  
  // FORM STATE
  const [plate, setPlate] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [issue, setIssue] = useState('');
  
  const [isExistingCustomer, setIsExistingCustomer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingPlate, setCheckingPlate] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // --- 1. FETCH DATA (FIXED: Show All Active Tickets Regardless of Date) ---
  const fetchData = useCallback(async () => {
      const { data: qData } = await supabase
        .from('Antrian')
        .select('*')
        // HANYA FILTER STATUS YANG BELUM SELESAI
        // (Status: 'done', 'cancelled', 'paid' dianggap selesai dan hilang dari layar user)
        .not('status', 'in', '("done","cancelled","paid")')
        .order('created_at', { ascending: true });
        
      if (qData) setQueue(qData);

      const { data: mData } = await supabase.from('Mechanics').select('*').eq('is_active', true);
      if (mData) setMechanics(mData);
  }, []);

  // --- 2. CEK PLAT NOMOR ---
  const checkPlate = async () => {
      if(plate.length < 3) return;
      setCheckingPlate(true);
      const cleanPlate = plate.toUpperCase().replace(/\s/g, '');
      const { data } = await supabase.from('Customers').select('*').eq('plate_number', cleanPlate).single();
      if(data) {
          setName(data.name);
          setPhone(data.phone || '');
          setIsExistingCustomer(true);
      } else {
          setIsExistingCustomer(false);
      }
      setCheckingPlate(false);
  };

  useEffect(() => {
    fetchData();
    const channel = supabase.channel('user-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Antrian' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Mechanics' }, () => fetchData())
      .subscribe();
    const intervalId = setInterval(() => fetchData(), 3000);
    return () => { supabase.removeChannel(channel); clearInterval(intervalId); };
  }, [fetchData]);

  // --- 3. SUBMIT ---
  const handleJoinQueue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plate || !name || !issue) return alert("Mohon lengkapi Plat Nomor, Nama, dan Keluhan.");
    
    setLoading(true);
    setStatusMessage('🤖 AI Menganalisa...');

    try {
        const cleanPlate = plate.toUpperCase().replace(/\s/g, '');

        if (isExistingCustomer) {
            await supabase.from('Customers').update({ last_visit: new Date() }).eq('plate_number', cleanPlate);
        } else {
            await supabase.from('Customers').insert([{ plate_number: cleanPlate, name: name, phone: phone }]);
        }

        const aiReq = await fetch('/api/analyze-issue', {
            method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ issue })
        });
        const aiResult = await aiReq.json();

        if (!aiResult.valid) {
            alert(`❌ Ditolak: ${aiResult.reason}`);
            setLoading(false); return;
        }

        setStatusMessage('Mencetak Tiket...');
        
        // UNTUK NOMOR ANTRIAN: Kita tetap hitung berdasarkan HARI INI agar urutannya logis (A-1, A-2)
        const today = getTodayDate();
        const { count } = await supabase.from('Antrian').select('*', { count: 'exact', head: true }).gte('created_at', today);
        const nextNumber = (count || 0) + 1;
        
        await supabase.from('Antrian').insert([{ 
            plate_number: cleanPlate, 
            costumer_name: name, 
            issue: issue, 
            ai_analysis: aiResult.analysis,
            estimated_mins: aiResult.estimated_mins,
            status: 'waiting', 
            no_antrian: nextNumber,
            rincian_biaya: aiResult.rincian_biaya || [] 
        }]);

        setPlate(''); setName(''); setPhone(''); setIssue(''); setIsExistingCustomer(false);
        alert(`✅ Berhasil! Nomor Antrian: A-${nextNumber}`);
        fetchData(); 
    } catch (err) {
        console.error(err);
        alert("Terjadi kesalahan sistem.");
    } finally {
        setLoading(false); setStatusMessage('');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-slate-800 p-4 sm:p-6 font-mono">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-8 border-b border-slate-200 pb-6 gap-4">
         <div className="text-center sm:text-left">
            <h1 className="text-2xl font-black flex gap-2 text-blue-600 items-center justify-center sm:justify-start"> BENGKEL TEKNOLOGI</h1>
            <p className="text-slate-500 text-sm mt-1">Sistem Antrian Cerdas & Terintegrasi</p>
         </div>
         
         <div className="flex items-center gap-3">
             <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-full border border-emerald-200">
                <Activity size={14} className="text-emerald-500 animate-pulse"/>
                <span className="text-xs font-bold text-emerald-600">Live System</span>
             </div>
             <Link href="/login" className="text-sm bg-white px-4 py-2 rounded-lg hover:bg-slate-50 border border-slate-200 text-slate-600 font-bold shadow-sm transition flex items-center gap-2">
                <LogIn size={16}/> Staff Login
             </Link>
         </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8 max-w-7xl mx-auto">
        
        {/* KOLOM KIRI: FORM & STATUS MEKANIK (STICKY) */}
        <div className="lg:col-span-4 space-y-6">
            
            {/* 1. STATUS MEKANIK (COMPACT LIST VIEW) */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden">
                <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="font-bold text-slate-700 flex items-center gap-2 text-sm uppercase">
                       <Users size={16} className="text-blue-500"/> Mekanik Bertugas
                    </h3>
                    <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded-full font-bold">{mechanics.length} Orang</span>
                </div>
                
                <div className="max-h-[120px] overflow-y-auto custom-scrollbar">
                    {mechanics.length === 0 && <p className="text-center text-xs text-slate-400 py-4 italic">Tidak ada mekanik aktif.</p>}
                    
                    {mechanics.map(mech => {
                        const currentJob = queue.find(t => 
                            t.mechanic_id === mech.id && 
                            ['processing', 'waiting_part', 'pending'].includes(t.status)
                        );
                        
                        return (
                            <div key={mech.id} className="flex items-center justify-between px-5 py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition">
                                <div className="flex items-center gap-3">
                                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${currentJob ? 'bg-orange-500 animate-pulse' : 'bg-emerald-500'}`} title={currentJob ? "Sibuk" : "Ready"}></div>
                                    <span className="text-sm font-bold text-slate-700">{mech.name}</span>
                                </div>

                                {currentJob ? (
                                    <div className="flex items-center gap-1.5 bg-orange-50 px-2 py-1 rounded text-[10px] text-orange-700 border border-orange-100 font-medium">
                                        <Wrench size={10}/>
                                        <span>A-{currentJob.no_antrian}</span>
                                    </div>
                                ) : (
                                    <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-100 font-medium">Ready</span>
                                )}
                            </div>
                        );
                    })}
                </div>
                {mechanics.length > 2 && (
                    <div className="text-[9px] text-center bg-slate-50 text-slate-400 py-0.5">Scroll untuk melihat lainnya</div>
                )}
            </div>

            {/* 2. FORM AMBIL ANTRIAN */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-lg">
                <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
                    <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><Ticket size={20}/></div>
                    <h2 className="text-lg font-bold text-slate-800">Ambil Antrian</h2>
                </div>
                
                <form onSubmit={handleJoinQueue} className="space-y-4">
                    <div>
                        <label className="text-[10px] text-slate-500 uppercase font-bold mb-1 block">Plat Nomor Kendaraan</label>
                        <div className="flex gap-2">
                            <input 
                                value={plate} 
                                onChange={e=>setPlate(e.target.value.toUpperCase())}
                                onBlur={checkPlate}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 font-bold tracking-widest uppercase focus:ring-2 focus:ring-blue-200 outline-none transition" 
                                placeholder="B 1234 XYZ" 
                            />
                            <button type="button" onClick={checkPlate} className="bg-slate-100 px-3 rounded-xl border border-slate-200 hover:bg-slate-200 text-slate-500 transition">
                                {checkingPlate ? <Loader2 className="animate-spin" size={20}/> : <Search size={20}/>}
                            </button>
                        </div>
                        {isExistingCustomer && <p className="text-[10px] text-emerald-600 mt-1 font-bold">👋 Pelanggan Terdaftar ditemukan!</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[10px] text-slate-500 uppercase font-bold mb-1 block">Nama Pemilik</label>
                            <div className="relative">
                                <User className="absolute left-3 top-3 text-slate-400" size={16}/>
                                <input value={name} onChange={e=>setName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-200 outline-none transition" placeholder="Nama..." />
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] text-slate-500 uppercase font-bold mb-1 block">No. HP (Opsional)</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-3 text-slate-400" size={16}/>
                                <input value={phone} onChange={e=>setPhone(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-200 outline-none transition" placeholder="08..." />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] text-slate-500 uppercase font-bold mb-1 block">Keluhan / Service</label>
                        <textarea value={issue} onChange={e=>setIssue(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-200 outline-none transition h-24 resize-none" placeholder="Contoh: Ganti Oli dan Rem bunyi..." />
                    </div>
                    
                    <button disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 p-4 rounded-xl font-bold text-white flex justify-center items-center gap-2 transition-all shadow-lg hover:shadow-xl hover:-translate-y-1">
                        {loading ? <><Loader2 className="animate-spin"/> {statusMessage}</> : "AMBIL NOMOR ANTRIAN"}
                    </button>
                </form>
            </div>
        </div>

        {/* KOLOM KANAN: LIST ANTRIAN (SCROLLABLE) */}
        <div className="lg:col-span-8 space-y-6">
            <div>
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 ml-1">Antrian Berjalan</h3>
                
                {/* SCROLL CONTAINER (FIXED HEIGHT) */}
                <div className="h-[800px] overflow-y-auto custom-scrollbar pr-2 space-y-4">
                    {queue.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
                            <Bike size={48} className="text-slate-300 mx-auto mb-2"/>
                            <p className="text-slate-500 font-medium">Belum ada antrian aktif.</p>
                            <p className="text-xs text-slate-400">Silakan ambil nomor antrian.</p>
                        </div>
                    ) : (
                        queue.map(item => {
                            const mechName = mechanics.find(m => m.id === item.mechanic_id)?.name;
                            return <TicketCard key={item.id} item={item} mechName={mechName} />;
                        })
                    )}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}