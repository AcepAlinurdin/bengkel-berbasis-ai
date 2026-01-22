"use client";
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Bot, Loader2, Ticket, User, Clock, Wrench, 
  Bike, Users, CheckCircle, 
  Sparkles, Calendar, CreditCard, Mic, Square, 
  List, CalendarDays, Timer, Search 
} from 'lucide-react';
// PERBAIKAN: Menambahkan import Link yang sebelumnya hilang
import Link from 'next/link'; 
import { driver } from "driver.js"; 
import "driver.js/dist/driver.css"; 
import Script from 'next/script'; 

// --- HELPER DATE ---
const getLocalTodayDate = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const formatIndonesianDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(date);
};

// --- STYLE DRIVER.JS ---
const driverJsStyles = `
  .driver-popover.driverjs-theme { background-color: #ffffff; color: #1e293b; border-radius: 16px; box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1); border: 1px solid #e2e8f0; padding: 16px; font-family: inherit; max-width: 320px; }
  .driver-popover.driverjs-theme .driver-popover-title { font-size: 16px; font-weight: 800; color: #0f172a; margin-bottom: 8px; }
  .driver-popover.driverjs-theme .driver-popover-description { font-size: 13px; color: #64748b; line-height: 1.5; margin-bottom: 16px; }
  .driver-popover.driverjs-theme .driver-popover-footer { display: flex; align-items: center; margin-top: 10px; }
  .driver-popover.driverjs-theme .driver-popover-next-btn { background-color: #2563eb !important; color: white !important; border: none !important; border-radius: 8px !important; padding: 6px 14px !important; font-size: 12px !important; font-weight: 600 !important; }
`;

// --- SIMULASI AI ---
const analyzeAudioSimulation = async () => new Promise(resolve => setTimeout(() => resolve({ analysis: "Suara mesin kasar terdeteksi pada area cylinder head (Klep Longgar).", estimasi: 50 }), 2000));
const analyzeTextSimulation = async (text: string) => ({ analysis: `Analisa keluhan: "${text}". Indikasi servis ringan/berkala.`, estimasi: 30 });

// --- MODAL PAYMENT (MIDTRANS SNAP) ---
const PaymentModal = ({ isOpen, onClose, onSuccess, amount, bookingDetails }: any) => {
    const [loadingPay, setLoadingPay] = useState(false);

    const handlePay = async () => {
        setLoadingPay(true);
        try {
            // 1. Request Token ke API Backend kita
            const response = await fetch('/api/payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: amount,
                    customerDetails: {
                        name: bookingDetails.name,
                        phone: bookingDetails.phone || '08123456789'
                    }
                })
            });

            const data = await response.json();
            if (!data.token) throw new Error("Gagal mendapatkan token pembayaran");

            // 2. Buka Snap Popup Midtrans
            // Menggunakan (window as any) untuk bypass pengecekan TypeScript pada properti snap
            (window as any).snap.pay(data.token, {
                onSuccess: function(result: any){
                    console.log('Payment Success:', result);
                    onSuccess(result.order_id); 
                },
                onPending: function(result: any){
                    alert("Menunggu pembayaran...");
                },
                onError: function(result: any){
                    alert("Pembayaran gagal!");
                },
                onClose: function(){
                    setLoadingPay(false);
                }
            });

        } catch (err) {
            console.error(err);
            alert("Gagal memproses pembayaran. Cek koneksi server.");
            setLoadingPay(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 relative">
                <div className="bg-indigo-600 p-6 text-white text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full bg-white/10 rotate-12 scale-150"></div>
                    <CreditCard className="mx-auto mb-3 text-indigo-200 relative z-10" size={40}/>
                    <h3 className="text-xl font-bold relative z-10">Konfirmasi Booking</h3>
                    <p className="text-indigo-100 text-xs relative z-10">Bayar DP via Midtrans</p>
                </div>
                <div className="p-6 space-y-6">
                    <div className="text-center">
                        <div className="text-xs text-slate-500 font-bold uppercase mb-1">Total DP</div>
                        <div className="text-4xl font-black text-slate-800 tracking-tighter">Rp {amount.toLocaleString('id-ID')}</div>
                    </div>
                    
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs text-slate-500 space-y-2">
                        <div className="flex justify-between"><span>Nama:</span> <span className="font-bold text-slate-700">{bookingDetails.name}</span></div>
                        <div className="flex justify-between"><span>Plat:</span> <span className="font-bold text-slate-700">{bookingDetails.plate}</span></div>
                    </div>

                    <button 
                        onClick={handlePay} 
                        disabled={loadingPay}
                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-200 flex justify-center items-center gap-2"
                    >
                        {loadingPay ? <Loader2 className="animate-spin" /> : "Bayar Sekarang"}
                    </button>
                    
                    <button onClick={onClose} className="w-full py-2 text-slate-400 text-xs font-bold hover:text-slate-600">Batalkan</button>
                </div>
            </div>
        </div>
    );
};

// --- TICKET CARD ---
const TicketCard = ({ item, mechName }: any) => {
  const statusConfig: any = {
    processing: { color: 'text-blue-600', bg: 'bg-blue-50', border: 'bg-blue-500', label: 'SEDANG DIKERJAKAN', icon: <Wrench size={12} className="animate-pulse"/> },
    waiting_part: { color: 'text-purple-600', bg: 'bg-purple-50', border: 'bg-purple-500', label: 'TUNGGU SPAREPART', icon: <Clock size={12}/> },
    waiting: { color: 'text-slate-500', bg: 'bg-slate-100', border: 'bg-slate-300', label: 'MENUNGGU GILIRAN', icon: <User size={12}/> }
  };

  const isFutureBooking = item.is_booking && new Date(item.booking_date) > new Date(getLocalTodayDate());

  // TAMPILAN KHUSUS BOOKING MASA DEPAN
  if (isFutureBooking) {
      return (
        <div className="bg-white rounded-xl shadow-sm border border-indigo-200 overflow-hidden hover:shadow-md transition-all duration-300 relative mb-3">
             <div className="absolute top-0 right-0 bg-indigo-500 text-white text-[9px] font-bold px-2 py-1 rounded-bl-lg flex items-center gap-1">
                <Calendar size={10}/> {item.booking_time?.slice(0,5)}
             </div>
             <div className="p-3 flex gap-3 items-center">
                 <div className="bg-indigo-50 w-10 h-10 rounded-lg flex items-center justify-center text-indigo-600 font-bold text-xs">
                     {item.booking_time?.slice(0,2)}
                 </div>
                 <div className="flex-1">
                     <h3 className="font-bold text-slate-700 text-sm">{item.costumer_name}</h3>
                     <p className="text-xs text-slate-500 flex items-center gap-1"><Bike size={10}/> {item.plate_number}</p>
                 </div>
                 <div className="text-right">
                     <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded">B-{String(item.no_antrian).padStart(3, '0')}</span>
                 </div>
             </div>
        </div>
      )
  }

  // TAMPILAN ANTRIAN HARI INI
  const currentStatus = statusConfig[item.status] || statusConfig.waiting;
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 relative mb-3 group hover:border-blue-300 transition-all">
       <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${currentStatus.border}`}></div>
       
       <div className="flex justify-between items-center mb-3 pl-2">
           <div className="flex items-center gap-2">
               <span className="font-black text-slate-800 text-lg">
                   {item.is_booking ? 'B' : 'A'}-{String(item.no_antrian).padStart(3, '0')}
               </span>
               {item.is_booking && <span className="text-[9px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-bold uppercase">Booking</span>}
           </div>
           <span className={`text-[9px] font-bold px-2 py-1 rounded ${currentStatus.bg} ${currentStatus.color} flex items-center gap-1`}>
               {currentStatus.icon} {currentStatus.label}
           </span>
       </div>

       <div className="pl-2 mb-3">
            <h3 className="font-bold text-slate-700 text-sm flex items-center gap-2">
                {item.costumer_name} 
                <span className="text-[10px] font-normal text-slate-400 font-mono bg-slate-50 px-1 rounded border">{item.plate_number}</span>
            </h3>
            {mechName && <div className="text-[10px] text-blue-600 font-bold flex items-center gap-1 mt-1"><Wrench size={10}/> Mekanik: {mechName}</div>}
       </div>

       <div className="ml-2 bg-emerald-50 rounded-lg p-3 border border-emerald-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 opacity-10">
                <Sparkles size={40} className="text-emerald-600"/>
            </div>
            <div className="relative z-10">
                <div className="flex items-center gap-1 mb-1">
                    <Bot size={12} className="text-emerald-600"/>
                    <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wide">AI Diagnosis</span>
                </div>
                <p className="text-xs text-emerald-900 font-medium leading-relaxed mb-2 line-clamp-2">
                    "{item.ai_analysis || item.issue}"
                </p>
                <div className="flex items-center gap-1 text-[10px] text-emerald-700 font-bold bg-white/50 inline-block px-2 py-1 rounded">
                    <Timer size={10}/> Estimasi: {item.estimated_mins} Menit
                </div>
            </div>
       </div>
    </div>
  );
};

export default function UserPage() {
  const [queueToday, setQueueToday] = useState<any[]>([]); 
  const [queueFuture, setQueueFuture] = useState<any[]>([]); 
  const [mechanics, setMechanics] = useState<any[]>([]);
  
  const [listTab, setListTab] = useState<'today' | 'future'>('today'); 
  
  const [plate, setPlate] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [issue, setIssue] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [bookingsOnSelectedDate, setBookingsOnSelectedDate] = useState(0);

  const [isBookingMode, setIsBookingMode] = useState(false);
  const [step, setStep] = useState<'details' | 'payment' | 'diagnosis' | 'done'>('details');
  const [isPaid, setIsPaid] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null); 
  const [createdBookingNo, setCreatedBookingNo] = useState<string>('');
  
  const [isRecording, setIsRecording] = useState(false);
  const [audioAnalysis, setAudioAnalysis] = useState<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const [loading, setLoading] = useState(false);
  const [isExistingCustomer, setIsExistingCustomer] = useState(false);
  const [checkingPlate, setCheckingPlate] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  
  useEffect(() => {
    if (bookingDate) {
        const count = queueFuture.filter(q => q.booking_date === bookingDate).length;
        setBookingsOnSelectedDate(count);
    } else {
        setBookingsOnSelectedDate(0);
    }
  }, [bookingDate, queueFuture]);

  const fetchData = useCallback(async () => {
      const today = getLocalTodayDate();

      const { data } = await supabase.from('Antrian')
        .select('*')
        .not('status', 'in', '("cancelled")') 
        .order('booking_date', { ascending: true }) 
        .order('booking_time', { ascending: true });
        
      if (data) {
          const todayData = data.filter(item => {
              if (!item.is_booking) return true; 
              if (item.booking_date <= today) return true; 
              return false;
          });

          const futureData = data.filter(item => {
              if (item.is_booking && item.booking_date > today) return true; 
              return false;
          });

          setQueueToday(todayData);
          setQueueFuture(futureData);
      }
      
      const { data: mData } = await supabase.from('Mechanics').select('*').eq('is_active', true);
      if (mData) setMechanics(mData);
  }, []);

  const assignTicketsToMechanics = useCallback(async () => {
    try {
        const { data: activeMechs } = await supabase.from('Mechanics').select('*').eq('is_active', true);
        if (!activeMechs || activeMechs.length === 0) return;

        const { data: ongoingTickets } = await supabase.from('Antrian')
            .select('mechanic_id')
            .in('status', ['processing', 'waiting_part', 'pending']);
        
        const busyMechanicIds = ongoingTickets?.map(t => t.mechanic_id) || [];
        const freeMechanics = activeMechs.filter(m => !busyMechanicIds.includes(m.id));

        if (freeMechanics.length > 0) {
            const today = getLocalTodayDate();
            // PERBAIKAN: Hanya assign antrian hari ini (atau walk-in)
            const { data: waitingTickets } = await supabase.from('Antrian')
                .select('*')
                .eq('status', 'waiting')
                .is('mechanic_id', null) 
                .or(`booking_date.is.null,booking_date.lte.${today}`) 
                .order('created_at', { ascending: true });
                
            if (waitingTickets && waitingTickets.length > 0) {
                const updates = [];
                for (let i = 0; i < freeMechanics.length; i++) {
                    if (i >= waitingTickets.length) break;
                    const mech = freeMechanics[i];
                    const ticket = waitingTickets[i];
                    updates.push(supabase.from('Antrian').update({ status: 'processing', mechanic_id: mech.id }).eq('id', ticket.id));
                }
                if (updates.length > 0) await Promise.all(updates);
            }
        }
    } catch (err) { console.error("Auto assign error:", err); }
  }, []);

  useEffect(() => { 
    fetchData(); 
    assignTicketsToMechanics();
    const channel = supabase.channel('user-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'Antrian' }, () => { fetchData(); assignTicketsToMechanics(); })
        .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchData, assignTicketsToMechanics]);

  const checkPlate = async () => {
      if(plate.length < 3) return;
      setCheckingPlate(true);
      const cleanPlate = plate.toUpperCase().replace(/\s/g, '');
      
      // PERBAIKAN ERROR 406: GUNAKAN maybeSingle()
      const { data } = await supabase.from('Customers').select('*').eq('plate_number', cleanPlate).maybeSingle();
      
      if(data) { 
          setName(data.name); 
          setPhone(data.phone || ''); 
          setIsExistingCustomer(true); 
      } 
      setCheckingPlate(false);
  };

  const handleRequestDiagnosisBooking = () => {
      if (!plate || !name || !phone || !bookingDate || !bookingTime) {
          alert("Mohon lengkapi Data Diri, Tanggal, dan Jam.");
          return;
      }
      if (!isPaid) setShowPaymentModal(true);
      else setStep('diagnosis');
  };

  const handlePaymentSuccess = (orderId: string) => {
      setShowPaymentModal(false);
      setIsPaid(true);
      setQrCodeData(orderId);
      setStep('diagnosis'); 
  };

  const startRecording = async () => {
      try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          mediaRecorderRef.current = new MediaRecorder(stream);
          mediaRecorderRef.current.start();
          setIsRecording(true);
          setAudioAnalysis(null);
          setIssue(""); 
      } catch (err) { alert("Gagal mengakses mikrofon."); }
  };

  const stopRecording = async () => {
      if (mediaRecorderRef.current) {
          mediaRecorderRef.current.stop();
          setIsRecording(false);
          setLoading(true);
          try {
              const result: any = await analyzeAudioSimulation(); 
              setAudioAnalysis(result.analysis);
              setIssue(result.analysis); 
          } catch (e) { console.error(e); } finally { setLoading(false); }
      }
  };

  // --- SUBMIT HANDLE ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!plate || !name || !issue) return alert("Mohon lengkapi data keluhan/hasil diagnosa!");
    setLoading(true);
    try {
        let finalAnalysis = audioAnalysis;
        if (!isBookingMode && !audioAnalysis) {
             const txtRes = await analyzeTextSimulation(issue);
             finalAnalysis = txtRes.analysis;
        }

        const cleanPlate = plate.toUpperCase().replace(/\s/g, '');
        await supabase.from('Customers').upsert({ plate_number: cleanPlate, name: name, phone: phone }, { onConflict: 'plate_number' });

        const today = getLocalTodayDate();
        const now = new Date();
        const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
        
        const finalDate = isBookingMode ? bookingDate : today;
        const finalTime = isBookingMode ? bookingTime : currentTime;

        // Reset nomor antrian per tanggal
        const { count } = await supabase.from('Antrian')
            .select('*', { count: 'exact', head: true })
            .eq('booking_date', finalDate); 

        const nextNumber = (count || 0) + 1;
        
        const { error } = await supabase.from('Antrian').insert([{ 
             plate_number: cleanPlate, costumer_name: name, issue: issue, 
             ai_analysis: finalAnalysis || "Analisa Manual",
             estimated_mins: 45, status: 'waiting', no_antrian: nextNumber,
             is_booking: isBookingMode, booking_date: finalDate, booking_time: finalTime,
             is_paid: isBookingMode ? true : false, qr_code: isBookingMode ? qrCodeData : null
        }]);

        if (error) throw new Error(error.message);

        const codePrefix = isBookingMode ? "B-" : "A-";
        const formattedNo = `${codePrefix}${String(nextNumber).padStart(3, '0')}`;
        setCreatedBookingNo(formattedNo);

        if(isBookingMode) {
            setStep('done');
        } else {
            alert(`Berhasil! Nomor Antrian: ${formattedNo}`);
            setPlate(''); setName(''); setIssue('');
        }
        await fetchData();
        await assignTicketsToMechanics();

    } catch(err: any) { alert(`Gagal: ${err.message}`); } finally { setLoading(false); }
  };

  const groupedFutureQueue = queueFuture.reduce((groups: any, item: any) => {
    const date = item.booking_date;
    if (!groups[date]) { groups[date] = []; }
    groups[date].push(item);
    return groups;
  }, {});

  const sortedFutureDates = Object.keys(groupedFutureQueue).sort();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans relative pb-20">
      {/* SCRIPT MIDTRANS CLIENT */}
      <Script 
        src="https://app.sandbox.midtrans.com/snap/snap.js" 
        data-client-key="SB-Mid-client-xxxxxxxxxxxx" // GANTI DENGAN CLIENT KEY ANDA
        strategy="lazyOnload" 
      />

      <style>{driverJsStyles}</style>
      <PaymentModal isOpen={showPaymentModal} onClose={() => setShowPaymentModal(false)} onSuccess={handlePaymentSuccess} amount={50000} bookingDetails={{ plate, name, phone }} />

      <div className="bg-white p-4 shadow-sm border-b sticky top-0 z-40 flex justify-between items-center">
         <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg text-white"><Bike size={20} /></div>
            <div><h1 className="font-black text-slate-800 text-lg leading-none">MOVIO</h1><span className="text-[10px] text-slate-500 font-bold">Smart Workshop</span></div>
         </div>
         <Link href="/login" className="text-xs font-bold text-slate-500 hover:text-blue-600">Staff Login</Link>
      </div>

      <div className="max-w-4xl mx-auto p-4 lg:p-6 grid lg:grid-cols-12 gap-6">
        
        {/* KOLOM KIRI: FORM */}
        <div className="lg:col-span-7 space-y-4">
            <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-200 flex mb-4">
                 <button onClick={() => { setIsBookingMode(false); setStep('details'); }} className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${!isBookingMode ? 'bg-slate-900 text-white shadow' : 'text-slate-500'}`}>Antri Langsung</button>
                 <button onClick={() => { setIsBookingMode(true); setStep('details'); }} className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${isBookingMode ? 'bg-blue-600 text-white shadow' : 'text-slate-500'}`}>Booking Online</button>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden relative">
                {isBookingMode && step !== 'done' && (
                    <div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-center">
                        <div className={`flex items-center gap-2 text-xs font-bold ${step === 'details' ? 'text-blue-600' : 'text-slate-400'}`}><User size={14}/> Data</div>
                        <div className="h-px bg-slate-200 w-8"></div>
                        <div className={`flex items-center gap-2 text-xs font-bold ${step === 'diagnosis' ? 'text-blue-600' : 'text-slate-400'}`}><CreditCard size={14}/> Bayar & AI</div>
                        <div className="h-px bg-slate-200 w-8"></div>
                        <div className="text-xs font-bold text-slate-400"><Ticket size={14}/> Selesai</div>
                    </div>
                )}

                <div className="p-6">
                    {step === 'done' && isBookingMode ? (
                        <div className="text-center py-8 animate-in zoom-in-95">
                            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce"><CheckCircle size={40}/></div>
                            <h2 className="text-2xl font-black text-slate-800">Booking Berhasil!</h2>
                            <p className="text-slate-500 text-sm mb-6">Pembayaran Diterima.</p>
                            <div className="bg-indigo-50 border-2 border-indigo-100 rounded-xl p-4 mb-6">
                                <span className="text-xs uppercase font-bold text-slate-400">Kode Booking</span>
                                <div className="text-3xl font-black text-indigo-700 my-2 tracking-tighter">{createdBookingNo}</div>
                            </div>
                            <button onClick={() => {setStep('details'); setIsPaid(false); setQrCodeData(null); setIssue(''); setPlate(''); setName(''); setAudioAnalysis(null);}} className="block mx-auto text-blue-600 font-bold text-sm mt-6 hover:underline">Buat Booking Baru</button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit}>
                            <div className={`space-y-4 ${isBookingMode && step !== 'details' ? 'hidden' : 'block'}`}>
                                {isBookingMode && (
                                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                                        <div className="grid grid-cols-2 gap-3 mb-2">
                                            <div className="group"><label className="text-[10px] text-blue-500 uppercase font-bold mb-1 block">Tanggal</label><input type="date" min={getLocalTodayDate()} value={bookingDate} onChange={e=>setBookingDate(e.target.value)} className="w-full bg-white rounded-lg p-2 text-xs font-bold outline-none" /></div>
                                            <div className="group"><label className="text-[10px] text-blue-500 uppercase font-bold mb-1 block">Jam</label><input type="time" value={bookingTime} onChange={e=>setBookingTime(e.target.value)} className="w-full bg-white rounded-lg p-2 text-xs font-bold outline-none" /></div>
                                        </div>
                                        {bookingDate && (
                                            <div className="flex items-center gap-2 text-[10px] font-bold text-blue-600 bg-white/50 p-2 rounded-lg">
                                                <Users size={12}/>
                                                {bookingsOnSelectedDate > 0 
                                                    ? `${bookingsOnSelectedDate} orang lain sudah booking di tanggal ini.` 
                                                    : "Tanggal ini masih kosong. Jadilah yang pertama!"}
                                            </div>
                                        )}
                                    </div>
                                )}
                                <div className="group">
                                    <label className="text-[10px] text-slate-400 uppercase font-bold mb-1 block">Plat Nomor</label>
                                    <div className="flex gap-2">
                                        <input value={plate} onChange={e=>setPlate(e.target.value.toUpperCase())} onBlur={checkPlate} className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold uppercase tracking-widest outline-none focus:ring-2 focus:ring-blue-500" placeholder="B 1234 XYZ" />
                                        <button type="button" onClick={checkPlate} className="bg-slate-100 px-3 rounded-xl hover:bg-slate-200"><Search size={18} className="text-slate-500"/></button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="group"><label className="text-[10px] text-slate-400 uppercase font-bold mb-1 block">Nama</label><input value={name} onChange={e=>setName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none" placeholder="Nama" /></div>
                                    <div className="group"><label className="text-[10px] text-slate-400 uppercase font-bold mb-1 block">No HP</label><input value={phone} onChange={e=>setPhone(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none" placeholder="08xx" /></div>
                                </div>
                                {!isBookingMode && (
                                    <div className="group animate-in fade-in">
                                        <label className="text-[10px] text-slate-400 uppercase font-bold mb-1 block">Keluhan (Teks)</label>
                                        <textarea value={issue} onChange={e=>setIssue(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-200 outline-none h-24 resize-none" placeholder="Contoh: Ganti Oli, Rem bunyi..." />
                                        <p className="text-[10px] text-slate-400 mt-1 italic">*Analisa AI Teks Aktif</p>
                                    </div>
                                )}
                            </div>
                            {isBookingMode && step === 'details' && (
                                <button type="button" onClick={handleRequestDiagnosisBooking} className="w-full py-4 mt-6 bg-slate-900 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-slate-800 transition-all">Lanjut ke Diagnosa & Bayar <CreditCard size={16}/></button>
                            )}
                            {!isBookingMode && (
                                <button type="submit" disabled={loading} className="w-full py-4 mt-6 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:shadow-blue-200 transition-all flex justify-center items-center gap-2">{loading ? <Loader2 className="animate-spin"/> : "Ambil Nomor Antrian"}</button>
                            )}
                            {isBookingMode && step === 'diagnosis' && (
                                <div className="mt-2 animate-in slide-in-from-bottom-4 fade-in">
                                    <div className="bg-slate-900 rounded-2xl p-4 mb-3 text-white relative overflow-hidden">
                                        {loading && <div className="absolute inset-0 bg-slate-900/90 z-10 flex items-center justify-center text-xs font-bold gap-2"><Loader2 className="animate-spin"/> Menganalisa Suara...</div>}
                                        <div className="flex justify-between items-center relative z-0">
                                            <div><h5 className="font-bold text-sm">Cek Suara Mesin</h5><p className="text-[10px] text-slate-400">AI Gemini mendeteksi suara kerusakan</p></div>
                                            {!isRecording ? (
                                                <button type="button" onClick={startRecording} className="bg-red-500 hover:bg-red-600 text-white w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95"><Mic size={20}/></button>
                                            ) : (
                                                <button type="button" onClick={stopRecording} className="bg-white text-red-600 w-10 h-10 rounded-full flex items-center justify-center animate-pulse"><Square size={16} fill="currentColor"/></button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="group mb-4">
                                        <label className="text-[10px] text-slate-400 uppercase font-bold mb-1 block">Hasil Diagnosa / Keluhan Manual</label>
                                        <textarea value={issue} onChange={e=>setIssue(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-200 outline-none h-24 resize-none" placeholder="Hasil suara muncul disini..." />
                                    </div>
                                    <button type="submit" disabled={loading} className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl shadow-lg transition-all flex justify-center items-center gap-2">{loading ? <Loader2 className="animate-spin"/> : "Konfirmasi Booking Sekarang"}</button>
                                </div>
                            )}
                        </form>
                    )}
                </div>
            </div>
        </div>

        {/* KOLOM KANAN: LIST ANTRIAN */}
        <div className="lg:col-span-5">
            <div className="flex items-center justify-between mb-4">
                 <h3 className="font-black text-slate-800">List Antrian</h3>
            </div>
            
            <div className="flex p-1 bg-slate-200 rounded-xl mb-4">
                <button onClick={() => setListTab('today')} className={`flex-1 py-2 text-[10px] font-bold uppercase rounded-lg transition-all flex items-center justify-center gap-2 ${listTab === 'today' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                    <List size={14}/> Hari Ini ({queueToday.length})
                </button>
                <button onClick={() => setListTab('future')} className={`flex-1 py-2 text-[10px] font-bold uppercase rounded-lg transition-all flex items-center justify-center gap-2 ${listTab === 'future' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                    <CalendarDays size={14}/> Booking ({queueFuture.length})
                </button>
            </div>

            <div className="space-y-3 h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {listTab === 'today' ? (
                    <>
                        {queueToday.length === 0 && <div className="text-center text-slate-400 text-xs py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">Belum ada antrian aktif hari ini.</div>}
                        {queueToday.map((item: any) => <TicketCard key={item.id} item={item} mechName={mechanics.find((m: any) => m.id === item.mechanic_id)?.name} />)}
                    </>
                ) : (
                    <>
                        {sortedFutureDates.length === 0 && <div className="text-center text-slate-400 text-xs py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">Belum ada jadwal booking.</div>}
                        {sortedFutureDates.map(date => (
                            <div key={date} className="animate-in fade-in slide-in-from-right-4">
                                <div className="sticky top-0 bg-slate-50/90 backdrop-blur-sm p-2 mb-2 z-10 border-b border-slate-200">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                        <Calendar size={12}/> {formatIndonesianDate(date)}
                                    </h4>
                                </div>
                                {groupedFutureQueue[date].map((item: any) => (
                                    <TicketCard key={item.id} item={item} mechName={mechanics.find((m: any) => m.id === item.mechanic_id)?.name} />
                                ))}
                            </div>
                        ))}
                    </>
                )}
            </div>
        </div>

      </div>
    </div>
  );
}