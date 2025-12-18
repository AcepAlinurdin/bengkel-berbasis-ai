"use client";
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Bot, LogIn, Loader2, Ticket, User, Clock, Wrench, 
  Activity, Search, Phone, Bike, Users, Calendar, CheckCircle
} from 'lucide-react';
import Link from 'next/link';
import { getTodayDate } from '@/lib/utils';

// --- COMPONENT: TICKET CARD (MODERN STYLE) ---
const TicketCard = ({ item, mechName }: any) => {
  
  const statusConfig: any = {
    processing: {
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'bg-blue-500', // Strip color
      label: 'SEDANG DIKERJAKAN',
      icon: <Wrench size={12} className="animate-pulse"/>
    },
    waiting_part: {
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      border: 'bg-purple-500',
      label: 'TUNGGU SPAREPART',
      icon: <Clock size={12}/>
    },
    pending: {
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      border: 'bg-amber-500',
      label: 'PENDING / ISTIRAHAT',
      icon: <Activity size={12}/>
    },
    waiting: {
      color: 'text-slate-500',
      bg: 'bg-slate-100',
      border: 'bg-slate-300',
      label: 'MENUNGGU GILIRAN',
      icon: <User size={12}/>
    }
  };

  const currentStatus = statusConfig[item.status] || statusConfig.waiting;

  return (
    <div className="group relative bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-all duration-300">
      {/* Status Strip Bar (Left Accent) */}
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${currentStatus.border}`}></div>

      <div className="p-4 pl-6">
        <div className="flex justify-between items-start mb-3">
           {/* Nomor Antrian */}
           <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nomor Antrian</span>
              <span className="text-2xl font-black text-slate-800 tracking-tighter">
                A-{String(item.no_antrian).padStart(3, '0')}
              </span>
           </div>

           {/* Status Badge */}
           <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wide border border-transparent ${currentStatus.bg} ${currentStatus.color}`}>
              {currentStatus.icon}
              {currentStatus.label}
           </div>
        </div>

        {/* Customer Info */}
        <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                <User size={14}/>
            </div>
            <h3 className="font-bold text-slate-700 text-sm flex-1 truncate">{item.costumer_name}</h3>
            {item.plate_number && (
                <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                    {item.plate_number}
                </span>
            )}
        </div>

        {/* Issue Box */}
        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 mb-3 relative">
            <p className="text-xs text-slate-600 italic leading-relaxed line-clamp-2">"{item.issue}"</p>
            {/* AI Chip */}
            {item.ai_analysis && (
                <div className="mt-2 pt-2 border-t border-slate-200 flex items-center gap-1">
                    <Bot size={12} className="text-emerald-500"/>
                    <span className="text-[10px] font-medium text-emerald-700 truncate max-w-[200px]">{item.ai_analysis}</span>
                </div>
            )}
        </div>

        {/* Footer Info */}
        <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
            <div className="flex items-center gap-3">
                <span className="flex items-center gap-1"><Clock size={12}/> ± {item.estimated_mins} mnt</span>
            </div>
            
            {mechName && ['processing', 'waiting_part', 'pending'].includes(item.status) && (
                <span className="flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                    <Wrench size={10}/> {mechName}
                </span>
            )}
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

  // --- 1. FETCH DATA ---
  const fetchData = useCallback(async () => {
      const { data: qData } = await supabase
        .from('Antrian')
        .select('*')
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
      const { data } = await supabase.from('Customers').select('*').eq('plate_number', cleanPlate).maybeSingle();
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
    <div className="min-h-screen bg-slate-50 text-slate-800 p-4 sm:p-6 font-sans">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-8 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
         <div className="flex items-center gap-4 mb-4 sm:mb-0">
            <div className="bg-blue-600 p-2.5 rounded-xl text-white shadow-lg shadow-blue-200">
                <Bike size={24} />
            </div>
            <div>
                <h1 className="text-xl font-black text-slate-800 tracking-tight">BENGKEL TEKNOLOGI</h1>
                <p className="text-xs text-slate-500 font-medium">Sistem Antrian Cerdas Berbasis AI</p>
            </div>
         </div>
         
         <div className="flex items-center gap-3">
             <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-full border border-emerald-100">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-xs font-bold text-emerald-600">Sistem Live</span>
             </div>
             <Link href="/login" className="text-xs bg-slate-900 text-white px-5 py-2.5 rounded-full font-bold hover:bg-slate-800 hover:shadow-lg transition flex items-center gap-2">
                <LogIn size={14}/> Staff Area
             </Link>
         </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-6 max-w-7xl mx-auto">
        
        {/* KOLOM KIRI: STATUS & FORM */}
        <div className="lg:col-span-4 space-y-6">
            
            {/* 1. STATUS MEKANIK (GRID CARD) */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-slate-700 flex items-center gap-2 text-sm uppercase tracking-wide">
                       <Users size={16} className="text-blue-500"/> Mekanik
                    </h3>
                    <span className="bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded-full font-bold">{mechanics.length} Aktif</span>
                </div>
                
                <div className="grid grid-cols-2 gap-3 max-h-[140px] overflow-y-auto custom-scrollbar pr-1">
                    {mechanics.length === 0 && <p className="col-span-2 text-center text-xs text-slate-400 py-4 italic">Belum ada mekanik aktif.</p>}
                    
                    {mechanics.map(mech => {
                        const currentJob = queue.find(t => 
                            t.mechanic_id === mech.id && 
                            ['processing', 'waiting_part', 'pending'].includes(t.status)
                        );
                        
                        return (
                            <div key={mech.id} className={`p-2 rounded-xl border flex flex-col justify-center items-center text-center transition-all ${currentJob ? 'bg-orange-50 border-orange-100' : 'bg-emerald-50 border-emerald-100'}`}>
                                <span className="text-xs font-bold text-slate-700 truncate w-full">{mech.name}</span>
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full mt-1 ${currentJob ? 'bg-orange-200 text-orange-700' : 'bg-emerald-200 text-emerald-700'}`}>
                                    {currentJob ? `Sibuk (A-${currentJob.no_antrian})` : 'Ready'}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* 2. FORM AMBIL ANTRIAN */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Ticket size={100} className="text-blue-600 transform rotate-12"/>
                </div>

                <div className="relative z-10">
                    <h2 className="text-lg font-black text-slate-800 mb-1">Ambil Tiket</h2>
                    <p className="text-xs text-slate-500 mb-6">Isi formulir untuk bergabung dalam antrian.</p>
                    
                    <form onSubmit={handleJoinQueue} className="space-y-4">
                        {/* Plat Nomor */}
                        <div className="group">
                            <label className="text-[10px] text-slate-500 uppercase font-bold mb-1 block group-focus-within:text-blue-600">Plat Nomor</label>
                            <div className="flex gap-2 relative">
                                <input 
                                    value={plate} 
                                    onChange={e=>setPlate(e.target.value.toUpperCase())}
                                    onBlur={checkPlate}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 pl-4 text-slate-800 font-bold tracking-widest uppercase focus:ring-2 focus:ring-blue-200 focus:border-blue-300 outline-none transition text-sm" 
                                    placeholder="B 1234 XYZ" 
                                />
                                <button type="button" onClick={checkPlate} className="bg-white px-3 rounded-xl border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-200 transition shadow-sm">
                                    {checkingPlate ? <Loader2 className="animate-spin" size={18}/> : <Search size={18}/>}
                                </button>
                            </div>
                            {isExistingCustomer && (
                                <div className="mt-1 flex items-center gap-1 text-[10px] text-emerald-600 font-bold animate-in slide-in-from-top-1 fade-in">
                                    <CheckCircle size={10}/> Data Pelanggan Ditemukan
                                </div>
                            )}
                        </div>

                        {/* Nama & HP */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="group">
                                <label className="text-[10px] text-slate-500 uppercase font-bold mb-1 block group-focus-within:text-blue-600">Nama</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-3 text-slate-400" size={14}/>
                                    <input value={name} onChange={e=>setName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-200 outline-none transition font-medium" placeholder="Nama Anda" />
                                </div>
                            </div>
                            <div className="group">
                                <label className="text-[10px] text-slate-500 uppercase font-bold mb-1 block group-focus-within:text-blue-600">No. HP</label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-3 text-slate-400" size={14}/>
                                    <input value={phone} onChange={e=>setPhone(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-200 outline-none transition font-medium" placeholder="08..." />
                                </div>
                            </div>
                        </div>

                        {/* Keluhan */}
                        <div className="group">
                            <label className="text-[10px] text-slate-500 uppercase font-bold mb-1 block group-focus-within:text-blue-600">Keluhan / Service</label>
                            <textarea value={issue} onChange={e=>setIssue(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-200 outline-none transition h-24 resize-none font-medium leading-relaxed" placeholder="Contoh: Ganti Oli, Rem bunyi..." />
                        </div>
                        
                        <button disabled={loading} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 p-3.5 rounded-xl font-bold text-white text-sm flex justify-center items-center gap-2 transition-all shadow-lg hover:shadow-indigo-200 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed">
                            {loading ? <><Loader2 className="animate-spin" size={16}/> {statusMessage}</> : "AMBIL NOMOR ANTRIAN"}
                        </button>
                    </form>
                </div>
            </div>
        </div>

        {/* KOLOM KANAN: LIST ANTRIAN */}
        <div className="lg:col-span-8">
            <div className="flex justify-between items-end mb-4 px-1">
                <div>
                    <h3 className="text-lg font-black text-slate-800 tracking-tight">Antrian Saat Ini</h3>
                    <p className="text-xs text-slate-500">Real-time update dari workshop.</p>
                </div>
                <div className="text-[10px] font-bold bg-white border border-slate-200 text-slate-500 px-3 py-1 rounded-full shadow-sm">
                    {queue.length} Kendaraan
                </div>
            </div>
            
            {/* SCROLL CONTAINER */}
            <div className="h-[calc(100vh-200px)] overflow-y-auto custom-scrollbar pr-2 pb-10 space-y-3">
                {queue.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 bg-white rounded-2xl border border-dashed border-slate-300">
                        <div className="bg-slate-50 p-4 rounded-full mb-3">
                            <Bike size={32} className="text-slate-300"/>
                        </div>
                        <p className="text-slate-600 font-bold text-sm">Belum ada antrian aktif.</p>
                        <p className="text-xs text-slate-400">Jadilah yang pertama hari ini!</p>
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
  );
}