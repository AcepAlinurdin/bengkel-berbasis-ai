"use client";
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Bot, LogIn, Loader2, Ticket, User, Clock, Wrench, 
  Activity, Search, Phone, Bike, Users, CheckCircle, HelpCircle, 
  MapPin, Sparkles, Navigation
} from 'lucide-react';
import Link from 'next/link';
import { getTodayDate } from '@/lib/utils';
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

// --- KOMPONEN MODAL WELCOME (POPUP DEPAN) ---
const WelcomeTourModal = ({ isOpen, onStart, onSkip }: any) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative scale-100 animate-in zoom-in-95 duration-300 border border-white/20">
        
        {/* Dekorasi Background */}
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-blue-600 to-indigo-600"></div>
        <div className="absolute top-4 right-4 text-white/20"><Sparkles size={80} /></div>

        <div className="relative pt-12 px-8 pb-8 text-center">
          {/* Icon */}
          <div className="w-20 h-20 bg-white rounded-2xl shadow-xl flex items-center justify-center mx-auto mb-6 relative z-10 transform rotate-3 hover:rotate-0 transition-all duration-500">
             <Bot size={40} className="text-blue-600" />
          </div>

          <h2 className="text-2xl font-black text-slate-800 mb-3">Selamat Datang</h2>
          <p className="text-slate-500 text-sm leading-relaxed mb-8">
            Apakah kamu pertama kali <strong>memakai sistem antrian berbasis AI?</strong> <br/>
            Saya akan memandu Anda bagaimana cara membuat antrian di sistem antrian bengkel MOVIO ini.
            jika anda seorang staf bengkel silahkan klik tombol staf untuk masuk ke sistem.
          </p>

          <div className="space-y-3">
            <button 
              onClick={onStart}
              className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg hover:shadow-blue-200 flex items-center justify-center gap-2 group"
            >
              <Navigation size={16} className="group-hover:translate-x-1 transition-transform"/>
              Mulai Panduan Singkat
            </button>
            
            <button 
              onClick={onSkip}
              className="w-full py-3 bg-white text-slate-400 rounded-xl font-semibold text-xs hover:text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Lewati, saya sudah paham
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- KOMPONEN MODAL SUKSES ---
const TicketSuccessModal = ({ isOpen, onClose, data }: any) => {
  if (!isOpen || !data) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden relative transform transition-all scale-100 animate-in zoom-in-95">
        <div className="bg-emerald-500 p-6 pt-8 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10"><Ticket size={200} className="absolute -right-10 -top-10 text-white rotate-12"/></div>
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-3 shadow-lg"><CheckCircle className="w-8 h-8 text-emerald-600" /></div>
            <h2 className="text-2xl font-black text-white tracking-tight">BERHASIL!</h2>
            <p className="text-emerald-100 text-sm font-medium">Tiket antrian diterbitkan</p>
          </div>
        </div>
        <div className="p-6 space-y-6">
          <div className="text-center">
            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Nomor Antrian Anda</span>
            <div className="text-6xl font-black text-slate-800 tracking-tighter my-2">{data.no_antrian}</div>
            <div className="inline-block px-3 py-1 bg-slate-100 rounded-full text-[10px] font-bold text-slate-500">Mohon Menunggu Dipanggil</div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center"><Clock className="w-5 h-5 text-blue-500 mx-auto mb-1" /><span className="block text-[10px] text-slate-400 font-bold uppercase">Estimasi</span><span className="block text-sm font-bold text-slate-700">{data.estimasi} Menit</span></div>
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center"><User className="w-5 h-5 text-orange-500 mx-auto mb-1" /><span className="block text-[10px] text-slate-400 font-bold uppercase">Teknisi</span><span className="block text-sm font-bold text-slate-700 truncate px-1">{data.teknisi}</span></div>
          </div>
        </div>
        <div className="p-4 bg-slate-50 border-t border-slate-100"><button onClick={onClose} className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg active:scale-95">Selesai & Tutup</button></div>
      </div>
    </div>
  );
};

// --- TICKET CARD ---
const TicketCard = ({ item, mechName }: any) => {
  const statusConfig: any = {
    processing: { color: 'text-blue-600', bg: 'bg-blue-50', border: 'bg-blue-500', label: 'SEDANG DIKERJAKAN', icon: <Wrench size={12} className="animate-pulse"/> },
    waiting_part: { color: 'text-purple-600', bg: 'bg-purple-50', border: 'bg-purple-500', label: 'TUNGGU SPAREPART', icon: <Clock size={12}/> },
    pending: { color: 'text-amber-600', bg: 'bg-amber-50', border: 'bg-amber-500', label: 'PENDING / ISTIRAHAT', icon: <Activity size={12}/> },
    waiting: { color: 'text-slate-500', bg: 'bg-slate-100', border: 'bg-slate-300', label: 'MENUNGGU GILIRAN', icon: <User size={12}/> }
  };
  const currentStatus = statusConfig[item.status] || statusConfig.waiting;
  return (
    <div className="group relative bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-all duration-300">
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${currentStatus.border}`}></div>
      <div className="p-4 pl-6">
        <div className="flex justify-between items-start mb-3">
           <div className="flex flex-col"><span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nomor Antrian</span><span className="text-2xl font-black text-slate-800 tracking-tighter">A-{String(item.no_antrian).padStart(3, '0')}</span></div>
           <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wide border border-transparent ${currentStatus.bg} ${currentStatus.color}`}>{currentStatus.icon} {currentStatus.label}</div>
        </div>
        <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"><User size={14}/></div>
            <h3 className="font-bold text-slate-700 text-sm flex-1 truncate">{item.costumer_name}</h3>
            {item.plate_number && <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">{item.plate_number}</span>}
        </div>
        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 mb-3 relative">
            <p className="text-xs text-slate-600 italic leading-relaxed line-clamp-2">"{item.issue}"</p>
            {item.ai_analysis && (<div className="mt-2 pt-2 border-t border-slate-200 flex items-center gap-1"><Bot size={12} className="text-emerald-500"/><span className="text-[10px] font-medium text-emerald-700 truncate max-w-[200px]">{item.ai_analysis}</span></div>)}
        </div>
        <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
            <div className="flex items-center gap-3"><span className="flex items-center gap-1"><Clock size={12}/> ± {item.estimated_mins} mnt</span></div>
            {mechName && ['processing', 'waiting_part', 'pending'].includes(item.status) && (<span className="flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100"><Wrench size={10}/> {mechName}</span>)}
        </div>
      </div>
    </div>
  );
};

export default function UserPage() {
  const [queue, setQueue] = useState<any[]>([]);
  const [mechanics, setMechanics] = useState<any[]>([]);
  const [plate, setPlate] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [issue, setIssue] = useState('');
  const [isExistingCustomer, setIsExistingCustomer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingPlate, setCheckingPlate] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  
  // State untuk Modal
  const [showModal, setShowModal] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [successData, setSuccessData] = useState<any>(null);

  // --- LOGIKA TOUR DIMULAI DI SINI ---
  const startDriverTour = () => {
    // Sembunyikan Modal Welcome
    setShowWelcomeModal(false);

    const driverObj = driver({
      showProgress: true,
      allowClose: true,
      overlayColor: 'rgb(15 23 42 / 0.9)', 
      animate: true,
      popoverClass: 'driverjs-theme', 
      nextBtnText: 'Lanjut',
      prevBtnText: 'Kembali',
      doneBtnText: 'Selesai',
      
      onPopoverRender: (popover) => {
          const footer = popover.footer;
          if (footer && !footer.querySelector('.custom-skip-btn')) {
              const skipBtn = document.createElement('button');
              skipBtn.innerText = 'Lewati Tutorial';
              skipBtn.className = 'custom-skip-btn';
              skipBtn.style.cssText = `background: transparent; border: none; color: #94a3b8; font-size: 11px; font-weight: 600; cursor: pointer; padding: 4px 8px; margin-right: auto; border-radius: 4px;`;
              skipBtn.onmouseover = () => { skipBtn.style.backgroundColor = '#f1f5f9'; skipBtn.style.color = '#64748b'; };
              skipBtn.onmouseout = () => { skipBtn.style.backgroundColor = 'transparent'; skipBtn.style.color = '#94a3b8'; };
              skipBtn.onclick = () => { 
                  driverObj.destroy(); 
                  localStorage.setItem('hasSeenTour', 'true'); 
              };
              footer.style.display = 'flex'; footer.style.alignItems = 'center'; footer.style.justifyContent = 'flex-end'; footer.prepend(skipBtn);
          }
      },

      steps: [
        // STEP 1 "Selamat Datang" DIHAPUS karena diganti Modal
        { 
          element: '#tour-mechanic-status', 
          popover: { 
            title: '1. Cek Ketersediaan Mekanik', 
            description: 'Lihat status mekanik di sini sebelum mendaftar. Hijau = Ready / Siap. Oranye = Sedang Sibuk.', 
            side: "bottom", align: 'start' 
          } 
        },
        { 
          element: '#tour-plate-input', 
          popover: { 
            title: '2. Masukkan Plat Nomor', 
            description: 'Ketik plat nomor lalu klik tombol Cari. Data akan terisi otomatis jika Anda pelanggan lama. Jika baru, silakan lanjut mengisi data diri secara manual.', 
            side: "bottom", align: 'start' 
          } 
        },
        { 
          element: '#tour-personal-info', 
          popover: { title: '3. Data Diri', description: 'Jika Anda pelanggan baru, silakan isi Nama dan No. HP di sini.', side: "top", align: 'start' } 
        },
        { 
          element: '#tour-issue-input', 
          popover: { title: '4. Isi Keluhan', description: 'Jelaskan masalah kendaraan. AI kami akan menganalisa estimasi pengerjaan.', side: "top", align: 'start' } 
        },
        { 
          element: '#tour-submit-btn', 
          popover: { title: '5. Ambil Antrian', description: 'Klik tombol ini untuk mendapatkan tiket antrian digital.', side: "top", align: 'start' } 
        },
        { 
          element: '#tour-queue-list', 
          popover: { title: '6. Pantau Antrian', description: 'Tiket Anda akan muncul di sini. Pantau status pengerjaan secara real-time.', side: "left", align: 'start' } 
        },
      ],
      onDestroyStarted: () => { 
          localStorage.setItem('hasSeenTour', 'true'); 
          driverObj.destroy(); 
      },
    });

    driverObj.drive();
  };

  // --- CEK LOCALSTORAGE SAAT MOUNT ---
  useEffect(() => {
    const hasSeenTour = localStorage.getItem('hasSeenTour');
    if (!hasSeenTour) {
        setShowWelcomeModal(true); // Tampilkan Modal Selamat Datang
    }
  }, []);

  const handleSkipTour = () => {
      localStorage.setItem('hasSeenTour', 'true');
      setShowWelcomeModal(false);
  };

  const handleRestartTour = () => {
      localStorage.removeItem('hasSeenTour');
      // Reset state agar modal muncul, atau langsung start tour
      setShowWelcomeModal(true);
  };

  // --- AUTO ASSIGN LOGIC ---
  const assignTicketsToMechanics = useCallback(async () => {
    try {
        const { data: activeMechs } = await supabase.from('Mechanics').select('*').eq('is_active', true);
        if (!activeMechs || activeMechs.length === 0) return;
        const { data: ongoingTickets } = await supabase.from('Antrian').select('mechanic_id').eq('status', 'processing');
        const busyIds = ongoingTickets?.map(t => t.mechanic_id) || [];
        const freeMechanics = activeMechs.filter(m => !busyIds.includes(m.id));

        if (freeMechanics.length > 0) {
            const { data: waitingTickets } = await supabase.from('Antrian').select('*').eq('status', 'waiting').order('created_at', { ascending: true });
            if (waitingTickets && waitingTickets.length > 0) {
                const updates = []; const assignedTicketIds = new Set();
                for (const mech of freeMechanics) {
                    let targetTicket = waitingTickets.find(t => t.mechanic_id === mech.id && !assignedTicketIds.has(t.id));
                    if (!targetTicket) targetTicket = waitingTickets.find(t => !assignedTicketIds.has(t.id) && (t.mechanic_id === null || t.mechanic_id !== mech.id));
                    if (targetTicket) {
                        assignedTicketIds.add(targetTicket.id);
                        updates.push(supabase.from('Antrian').update({ status: 'processing', mechanic_id: mech.id }).eq('id', targetTicket.id));
                    }
                }
                if (updates.length > 0) await Promise.all(updates);
            }
        }
    } catch (err) { console.error("Auto assign error:", err); }
  }, []);

  // --- FETCH & REALTIME ---
  const fetchData = useCallback(async () => {
      const { data: qData } = await supabase.from('Antrian').select('*').not('status', 'in', '("done","cancelled","paid")').order('created_at', { ascending: true });
      if (qData) setQueue(qData);
      const { data: mData } = await supabase.from('Mechanics').select('*').eq('is_active', true);
      if (mData) setMechanics(mData);
  }, []);

  const checkPlate = async () => {
      if(plate.length < 3) return;
      setCheckingPlate(true);
      const cleanPlate = plate.toUpperCase().replace(/\s/g, '');
      const { data } = await supabase.from('Customers').select('*').eq('plate_number', cleanPlate).single();
      if(data) { setName(data.name); setPhone(data.phone || ''); setIsExistingCustomer(true); } else { setIsExistingCustomer(false); }
      setCheckingPlate(false);
  };

  useEffect(() => {
    fetchData();
    assignTicketsToMechanics(); 
    const channel = supabase.channel('user-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Antrian' }, () => { fetchData(); assignTicketsToMechanics(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Mechanics' }, () => { fetchData(); assignTicketsToMechanics(); })
      .subscribe();
    const intervalId = setInterval(() => { fetchData(); assignTicketsToMechanics(); }, 3000);
    return () => { supabase.removeChannel(channel); clearInterval(intervalId); };
  }, [fetchData, assignTicketsToMechanics]);

  const handleJoinQueue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plate || !name || !issue) return alert("Mohon lengkapi Plat Nomor, Nama, dan Keluhan.");
    setLoading(true); setStatusMessage('🤖 AI Menganalisa...');

    try {
        const cleanPlate = plate.toUpperCase().replace(/\s/g, '');
        if (isExistingCustomer) { await supabase.from('Customers').update({ last_visit: new Date() }).eq('plate_number', cleanPlate); } 
        else { await supabase.from('Customers').insert([{ plate_number: cleanPlate, name: name, phone: phone }]); }

        const aiReq = await fetch('/api/analyze-issue', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ issue }) });
        const aiResult = await aiReq.json();

        if (!aiResult.valid) { alert(`❌ Ditolak: ${aiResult.reason}`); setLoading(false); return; }

        setStatusMessage('Mencetak Tiket...');
        const today = getTodayDate();
        const { count } = await supabase.from('Antrian').select('*', { count: 'exact', head: true }).gte('created_at', today);
        const nextNumber = (count || 0) + 1;
        const formattedNumber = `A-${String(nextNumber).padStart(3, '0')}`;
        
        const { data: newTicket, error } = await supabase.from('Antrian').insert([{ 
            plate_number: cleanPlate, costumer_name: name, issue: issue, ai_analysis: aiResult.analysis,
            estimated_mins: aiResult.estimated_mins, status: 'waiting', no_antrian: nextNumber, rincian_biaya: aiResult.rincian_biaya || [] 
        }]).select().single();

        if (error || !newTicket) throw new Error("Gagal membuat tiket");

        setStatusMessage('Mencari Mekanik...');
        await assignTicketsToMechanics();
        await new Promise(resolve => setTimeout(resolve, 1500));

        const { data: refreshedTicket } = await supabase.from('Antrian').select('*').eq('id', newTicket.id).single();
        
        let namaTeknisi = "Menunggu Giliran";
        if (refreshedTicket && refreshedTicket.mechanic_id) {
             const { data: mech } = await supabase.from('Mechanics').select('name').eq('id', refreshedTicket.mechanic_id).single();
             if (mech) namaTeknisi = mech.name;
        }

        setSuccessData({ no_antrian: formattedNumber, estimasi: aiResult.estimated_mins, teknisi: namaTeknisi });
        setShowModal(true); setPlate(''); setName(''); setPhone(''); setIssue(''); setIsExistingCustomer(false); 
        fetchData(); 

    } catch (err) { console.error(err); alert("Terjadi kesalahan sistem."); } finally { setLoading(false); setStatusMessage(''); }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-4 sm:p-6 font-sans relative">
      <style>{driverJsStyles}</style>
      
      {/* MODAL WELCOME (Muncul pertama kali) */}
      <WelcomeTourModal 
        isOpen={showWelcomeModal} 
        onStart={startDriverTour} 
        onSkip={handleSkipTour} 
      />

      <TicketSuccessModal isOpen={showModal} onClose={() => setShowModal(false)} data={successData} />

      <div className="flex flex-col sm:flex-row justify-between items-center mb-8 bg-white p-4 rounded-2xl shadow-sm border border-slate-200" id="tour-welcome">
         <div className="flex items-center gap-4 mb-4 sm:mb-0">
            <div className="bg-blue-600 p-2.5 rounded-xl text-white shadow-lg shadow-blue-200"><Bike size={24} /></div>
            <div><h1 className="text-xl font-black text-slate-800 tracking-tight">BENGKEL MOVIO</h1><p className="text-xs text-slate-500 font-medium">Sistem Antrian Cerdas Berbasis AI</p></div>
         </div>
         <div className="flex items-center gap-3">
             <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-full border border-emerald-100"><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div><span className="text-xs font-bold text-emerald-600">Sistem Live</span></div>
             <button onClick={handleRestartTour} className="text-xs bg-white border border-slate-200 text-slate-500 px-3 py-2.5 rounded-full font-bold hover:bg-slate-50 hover:text-blue-600 transition flex items-center gap-2" title="Panduan"><HelpCircle size={14}/></button>
             <Link href="/login" className="text-xs bg-slate-900 text-white px-5 py-2.5 rounded-full font-bold hover:bg-slate-800 hover:shadow-lg transition flex items-center gap-2"><LogIn size={14}/> Staff Area</Link>
         </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-6 max-w-7xl mx-auto">
        <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5" id="tour-mechanic-status">
                <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-slate-700 flex items-center gap-2 text-sm uppercase tracking-wide"><Users size={16} className="text-blue-500"/> Mekanik</h3><span className="bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded-full font-bold">{mechanics.length} Aktif</span></div>
                <div className="grid grid-cols-2 gap-3 max-h-[140px] overflow-y-auto custom-scrollbar pr-1">
                    {mechanics.length === 0 && <p className="col-span-2 text-center text-xs text-slate-400 py-4 italic">Belum ada mekanik aktif.</p>}
                    {mechanics.map(mech => {
                        const currentJob = queue.find(t => t.mechanic_id === mech.id && ['processing', 'waiting_part', 'pending'].includes(t.status));
                        return (
                            <div key={mech.id} className={`p-2 rounded-xl border flex flex-col justify-center items-center text-center transition-all ${currentJob ? 'bg-orange-50 border-orange-100' : 'bg-emerald-50 border-emerald-100'}`}>
                                <span className="text-xs font-bold text-slate-700 truncate w-full">{mech.name}</span>
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full mt-1 ${currentJob ? 'bg-orange-200 text-orange-700' : 'bg-emerald-200 text-emerald-700'}`}>{currentJob ? `Sibuk (A-${currentJob.no_antrian})` : 'Ready'}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10"><Ticket size={100} className="text-blue-600 transform rotate-12"/></div>
                <div className="relative z-10">
                    <h2 className="text-lg font-black text-slate-800 mb-1">Ambil Tiket</h2>
                    <p className="text-xs text-slate-500 mb-6">Isi formulir untuk bergabung dalam antrian.</p>
                    <form onSubmit={handleJoinQueue} className="space-y-4">
                        <div className="group" id="tour-plate-input">
                            <label className="text-[10px] text-slate-500 uppercase font-bold mb-1 block group-focus-within:text-blue-600">Plat Nomor</label>
                            <div className="flex gap-2 relative">
                                <input value={plate} onChange={e=>setPlate(e.target.value.toUpperCase())} onBlur={checkPlate} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 pl-4 text-slate-800 font-bold tracking-widest uppercase focus:ring-2 focus:ring-blue-200 focus:border-blue-300 outline-none transition text-sm" placeholder="B 1234 XYZ" />
                                <button type="button" onClick={checkPlate} className="bg-white px-3 rounded-xl border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-200 transition shadow-sm">{checkingPlate ? <Loader2 className="animate-spin" size={18}/> : <Search size={18}/>}</button>
                            </div>
                            {isExistingCustomer && <div className="mt-1 flex items-center gap-1 text-[10px] text-emerald-600 font-bold animate-in slide-in-from-top-1 fade-in"><CheckCircle size={10}/> Data Pelanggan Ditemukan</div>}
                        </div>
                        <div className="grid grid-cols-2 gap-3" id="tour-personal-info">
                            <div className="group"><label className="text-[10px] text-slate-500 uppercase font-bold mb-1 block group-focus-within:text-blue-600">Nama</label><div className="relative"><User className="absolute left-3 top-3 text-slate-400" size={14}/><input value={name} onChange={e=>setName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-200 outline-none transition font-medium" placeholder="Nama Anda" /></div></div>
                            <div className="group"><label className="text-[10px] text-slate-500 uppercase font-bold mb-1 block group-focus-within:text-blue-600">No. HP</label><div className="relative"><Phone className="absolute left-3 top-3 text-slate-400" size={14}/><input value={phone} onChange={e=>setPhone(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-200 outline-none transition font-medium" placeholder="08..." /></div></div>
                        </div>
                        <div className="group" id="tour-issue-input"><label className="text-[10px] text-slate-500 uppercase font-bold mb-1 block group-focus-within:text-blue-600">Keluhan / Service</label><textarea value={issue} onChange={e=>setIssue(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-200 outline-none transition h-24 resize-none font-medium leading-relaxed" placeholder="Contoh: Ganti Oli, Rem bunyi..." /></div>
                        <div id="tour-submit-btn"><button disabled={loading} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 p-3.5 rounded-xl font-bold text-white text-sm flex justify-center items-center gap-2 transition-all shadow-lg hover:shadow-indigo-200 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed">{loading ? <><Loader2 className="animate-spin" size={16}/> {statusMessage}</> : "AMBIL NOMOR ANTRIAN"}</button></div>
                    </form>
                </div>
            </div>
        </div>

        <div className="lg:col-span-8" id="tour-queue-list">
            <div className="flex justify-between items-end mb-4 px-1">
                <div><h3 className="text-lg font-black text-slate-800 tracking-tight">Antrian Saat Ini</h3><p className="text-xs text-slate-500">Real-time update dari workshop.</p></div>
                <div className="text-[10px] font-bold bg-white border border-slate-200 text-slate-500 px-3 py-1 rounded-full shadow-sm">{queue.length} Kendaraan</div>
            </div>
            <div className="h-[calc(100vh-200px)] overflow-y-auto custom-scrollbar pr-2 pb-10 space-y-3">
                {queue.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 bg-white rounded-2xl border border-dashed border-slate-300"><div className="bg-slate-50 p-4 rounded-full mb-3"><Bike size={32} className="text-slate-300"/></div><p className="text-slate-600 font-bold text-sm">Belum ada antrian aktif.</p><p className="text-xs text-slate-400">Jadilah yang pertama hari ini!</p></div>
                ) : (
                    queue.map(item => { const mechName = mechanics.find(m => m.id === item.mechanic_id)?.name; return <TicketCard key={item.id} item={item} mechName={mechName} />; })
                )}
            </div>
        </div>
      </div>
    </div>
  );
}