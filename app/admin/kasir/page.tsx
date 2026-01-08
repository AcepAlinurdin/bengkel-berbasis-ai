"use client";

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { 
  ShoppingCart, Search, Plus, CreditCard, 
  User, Wrench, Loader2, Minus, Printer, LogOut, Bot, Sparkles,
  CheckCircle, AlertTriangle, Info, ChevronRight, Package as PackageIcon, Grid,
  HelpCircle, Navigation, Trash2
} from 'lucide-react';
import { useRoleGuard } from '@/lib/authGuard';
import PrintStruk from '@/components/PrintStruk';

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

// Tipe data
type CartItem = {
  id: string;
  name: string;
  price: number;
  qty: number;
  type: 'part' | 'service';
  original_stok?: number; 
};

type ShopConfig = {
  shop_name: string;
  address: string;
  phone: string;
  footer_msg: string;
};

// --- KOMPONEN ALERT CUSTOM ---
const CustomAlert = ({ isOpen, type, title, message, onClose }: any) => {
    if (!isOpen) return null;

    let icon = <Info className="text-blue-500" size={32} />;
    let colorClass = "bg-white border-l-4 border-blue-500";
    let btnClass = "bg-blue-600 hover:bg-blue-700";

    if (type === 'success') {
        icon = <CheckCircle className="text-emerald-500" size={32} />;
        colorClass = "bg-white border-l-4 border-emerald-500";
        btnClass = "bg-emerald-600 hover:bg-emerald-700";
    } else if (type === 'error') {
        icon = <AlertTriangle className="text-red-500" size={32} />;
        colorClass = "bg-white border-l-4 border-red-500";
        btnClass = "bg-red-500 hover:bg-red-600";
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm transition-opacity animate-in fade-in duration-200">
            <div className={`rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100 animate-in zoom-in-95 duration-200 ${colorClass}`}>
                <div className="p-6 flex flex-col items-center text-center">
                    <div className="mb-4 bg-slate-50 p-3 rounded-full">{icon}</div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">{title}</h3>
                    <p className="text-sm text-slate-600 mb-6 leading-relaxed">{message}</p>
                    <button onClick={onClose} className={`w-full py-3 text-white rounded-xl font-bold shadow-md transition transform active:scale-95 ${btnClass}`}>
                        OK, Mengerti
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- KOMPONEN MODAL WELCOME (KHUSUS KASIR) ---
const WelcomeTourModal = ({ isOpen, onStart, onSkip }: any) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative scale-100 animate-in zoom-in-95 duration-300 border border-white/20">
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-indigo-600 to-purple-600"></div>
        <div className="absolute top-4 right-4 text-white/20"><Sparkles size={80} /></div>
        <div className="relative pt-12 px-8 pb-8 text-center">
          <div className="w-20 h-20 bg-white rounded-2xl shadow-xl flex items-center justify-center mx-auto mb-6 relative z-10 transform rotate-3 hover:rotate-0 transition-all duration-500">
             <ShoppingCart size={40} className="text-indigo-600" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-3">Halo, Kasir! 👋</h2>
          <p className="text-slate-500 text-sm leading-relaxed mb-8">
            Selamat datang di modul <strong>Point of Sales (POS)</strong>. <br/>
            Saya akan memandu Anda cara memproses transaksi dengan cepat dan akurat.
          </p>
          <div className="space-y-3">
            <button 
              onClick={onStart}
              className="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg hover:shadow-indigo-200 flex items-center justify-center gap-2 group"
            >
              <Navigation size={16} className="group-hover:translate-x-1 transition-transform"/>
              Mulai Panduan
            </button>
            <button 
              onClick={onSkip}
              className="w-full py-3 bg-white text-slate-400 rounded-xl font-semibold text-xs hover:text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Lewati Tutorial
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function KasirPage() {
  const router = useRouter();
  const { role, loading: authLoading } = useRoleGuard(['owner', 'kasir', 'admin']);
  
  const [readyTickets, setReadyTickets] = useState<any[]>([]); 
  const [inventory, setInventory] = useState<any[]>([]);      
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [serviceFee, setServiceFee] = useState<string>(''); 
  const [loading, setLoading] = useState(false);
  const [aiThinking, setAiThinking] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  
  const [shopConfig, setShopConfig] = useState<ShopConfig | null>(null);

  const [alertConfig, setAlertConfig] = useState({
    isOpen: false, type: 'info', title: '', message: ''
  });

  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  // --- LOGIKA TOUR DIMULAI DI SINI ---
  const startDriverTour = () => {
    setShowWelcomeModal(false);

    const driverObj = driver({
      showProgress: true,
      allowClose: true,
      overlayColor: 'rgb(15 23 42 / 0.9)', 
      animate: true,
      popoverClass: 'driverjs-theme', 
      nextBtnText: 'Lanjut',
      prevBtnText: 'Kembali',
      doneBtnText: 'Siap Jualan!',
      
      onPopoverRender: (popover) => {
          const footer = popover.footer;
          if (footer && !footer.querySelector('.custom-skip-btn')) {
              const skipBtn = document.createElement('button');
              skipBtn.innerText = 'Lewati';
              skipBtn.className = 'custom-skip-btn';
              skipBtn.style.cssText = `background: transparent; border: none; color: #94a3b8; font-size: 11px; font-weight: 600; cursor: pointer; padding: 4px 8px; margin-right: auto; border-radius: 4px;`;
              skipBtn.onmouseover = () => { skipBtn.style.backgroundColor = '#f1f5f9'; skipBtn.style.color = '#64748b'; };
              skipBtn.onmouseout = () => { skipBtn.style.backgroundColor = 'transparent'; skipBtn.style.color = '#94a3b8'; };
              skipBtn.onclick = () => { 
                  driverObj.destroy(); 
                  localStorage.setItem('hasSeenCashierTour', 'true'); 
              };
              footer.style.display = 'flex'; footer.style.alignItems = 'center'; footer.style.justifyContent = 'flex-end'; footer.prepend(skipBtn);
          }
      },

      steps: [
        { 
          element: '#tour-queue-list', 
          popover: { title: '1. Pilih Antrian', description: 'Daftar kendaraan yang <strong>sudah selesai servis</strong> akan muncul di sini. Klik salah satu untuk mulai transaksi.', side: "right", align: 'start' } 
        },
        // STEP BARU: AI BUTTON
        { 
          element: '#tour-ai-button', 
          popover: { title: '2. Generate Otomatis (AI)', description: 'Gunakan tombol ini untuk memuat sparepart & biaya secara otomatis berdasarkan rekomendasi mekanik/AI.', side: "bottom", align: 'start' } 
        },
        { 
          element: '#tour-catalog', 
          popover: { title: '3. Tambah Barang Manual', description: 'Atau cari dan klik barang/sparepart di sini untuk menambahkannya ke keranjang secara manual.', side: "left", align: 'start' } 
        },
        { 
          element: '#tour-manual-service', 
          popover: { title: '4. Biaya Jasa', description: 'Jika ada biaya jasa tambahan, ketik nominalnya di sini.', side: "top", align: 'start' } 
        },
        { 
          element: '#tour-checkout-actions', 
          popover: { title: '5. Bayar & Cetak', description: 'Klik BAYAR SEKARANG untuk menyelesaikan transaksi dan mencetak struk.', side: "top", align: 'start' } 
        },
      ],
      onDestroyStarted: () => { 
          localStorage.setItem('hasSeenCashierTour', 'true'); 
          driverObj.destroy(); 
      },
    });

    driverObj.drive();
  };

  useEffect(() => {
    const hasSeenTour = localStorage.getItem('hasSeenCashierTour');
    if (!hasSeenTour) { setShowWelcomeModal(true); }
  }, []);

  const handleSkipTour = () => { localStorage.setItem('hasSeenCashierTour', 'true'); setShowWelcomeModal(false); };
  const handleRestartTour = () => { localStorage.removeItem('hasSeenCashierTour'); setShowWelcomeModal(true); };

  const showAlert = (type: string, title: string, message: string) => { setAlertConfig({ isOpen: true, type, title, message }); };
  const closeAlert = () => { setAlertConfig(prev => ({ ...prev, isOpen: false })); };

  const fetchData = async () => {
    const { data: tickets } = await supabase.from('Antrian').select('*').eq('status', 'done').order('created_at', { ascending: true });
    if (tickets) setReadyTickets(tickets);
    const { data: items } = await supabase.from('Inventory').select('*').gt('stok', 0).order('nama_barang', { ascending: true });
    if (items) setInventory(items);
    const { data: configData } = await supabase.from('Settings').select('*').eq('id', 1).single();
    if (configData) setShopConfig(configData);
  };

  useEffect(() => { fetchData(); }, []);

  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/login'); };
  const handleSelectTicket = (ticket: any) => { setSelectedTicket(ticket); setServiceFee(''); setCart([]); };

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => { window.print(); setTimeout(() => setIsPrinting(false), 500); }, 100);
  };

  const handleGenerateAiCart = async () => {
    if (!selectedTicket) return;
    setAiThinking(true);
    try {
        if (selectedTicket.rincian_biaya && Array.isArray(selectedTicket.rincian_biaya) && selectedTicket.rincian_biaya.length > 0) {
            setCart(selectedTicket.rincian_biaya);
            showAlert('success', 'Data Mekanik', 'Memuat rincian biaya dari mekanik.');
            setAiThinking(false);
            return;
        }
        const response = await fetch('/api/cashier-recommend', { 
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ issue: selectedTicket.issue, ai_analysis: selectedTicket.ai_analysis, inventory: inventory })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Gagal mendapatkan rekomendasi AI");

        const validatedCart = (data.items || []).map((aiItem: any) => {
            if (aiItem.type === 'part') {
                const realItem = inventory.find(i => i.id === aiItem.id);
                if (realItem) { return { ...aiItem, original_stok: realItem.stok, price: realItem.harga_jual }; } 
                else { return null; }
            }
            return aiItem;
        }).filter((item: any) => item !== null);

        setCart(validatedCart);
        if (validatedCart.length > 0) {
            const partCount = validatedCart.filter((i: any) => i.type === 'part').length;
            if (partCount > 0) { showAlert('success', 'Rekomendasi AI', `Ditemukan ${partCount} sparepart yang cocok.`); } 
            else { showAlert('info', 'Estimasi Jasa', 'Hanya ditemukan estimasi jasa.'); }
        } else { showAlert('error', 'AI Bingung', 'AI tidak menemukan solusi yang cocok dengan stok saat ini.'); }
    } catch (error: any) { console.error("AI Cart Error", error); showAlert('error', 'Gagal', 'Terjadi kesalahan pada sistem AI: ' + error.message); } 
    finally { setAiThinking(false); }
  };
  
  const addItemToCart = (item: any) => {
    const existing = cart.find(c => c.id === item.id);
    if (existing) {
      if (existing.type === 'part' && existing.original_stok && existing.qty >= existing.original_stok) {
        return showAlert('error', 'Stok Habis', 'Stok di gudang tidak mencukupi.');
      }
      setCart(cart.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c));
    } else {
      setCart([...cart, { id: item.id, name: item.nama_barang, price: item.harga_jual, qty: 1, type: 'part', original_stok: item.stok }]);
    }
  };

  const addServiceFee = () => {
      if (!serviceFee || parseInt(serviceFee) <= 0) return;
      setCart([...cart, { id: `svc-${Date.now()}`, name: 'Biaya Jasa Tambahan', price: parseInt(serviceFee), qty: 1, type: 'service' }]);
      setServiceFee('');
  };

  const removeFromCart = (id: string) => { setCart(cart.filter(c => c.id !== id)); };
  const grandTotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

  const handleCheckout = async () => {
      if (!selectedTicket) return showAlert('error', 'Pilih Pelanggan', 'Silakan pilih tiket antrian pelanggan terlebih dahulu.');
      if (cart.length === 0) return showAlert('error', 'Keranjang Kosong', 'Belum ada item barang atau jasa yang dimasukkan.');
      setLoading(true);
      try {
          const { error: transError } = await supabase.from('Transactions').insert([{ 
            ticket_id: selectedTicket.id, customer_name: selectedTicket.costumer_name, total_amount: grandTotal, payment_method: 'cash', items: cart 
          }]);
          if (transError) throw transError;
          for (const item of cart) {
              if (item.type === 'part') {
                  const { data: currentItem } = await supabase.from('Inventory').select('stok').eq('id', item.id).single();
                  if (currentItem) {
                    const newStock = currentItem.stok - item.qty;
                    await supabase.from('Inventory').update({ stok: newStock }).eq('id', item.id);
                    await supabase.from('StockLogs').insert([{ item_id: item.id, item_name: item.name, type: 'out', qty: item.qty, total_price: item.price * item.qty, description: `Terjual ke: ${selectedTicket.costumer_name}` }]);
                  }
              }
          }
          await supabase.from('Antrian').update({ status: 'paid' }).eq('id', selectedTicket.id);
          showAlert('success', 'Transaksi Berhasil!', 'Pembayaran telah disimpan dan stok berhasil diupdate.');
          setSelectedTicket(null); setCart([]); fetchData(); 
      } catch (err: any) { console.error(err); showAlert('error', 'Gagal Transaksi', 'Terjadi kesalahan sistem: ' + err.message); } finally { setLoading(false); }
  };

  const filteredInventory = inventory.filter(i => 
    i.nama_barang.toLowerCase().includes(searchTerm.toLowerCase()) || 
    i.kategori?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (authLoading) return ( <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-500 gap-3"><Loader2 className="animate-spin text-indigo-600" size={40}/> <p className="font-medium animate-pulse">Memuat Kasir...</p></div> );

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-800 font-sans overflow-hidden relative">
      <style>{driverJsStyles}</style>
      <WelcomeTourModal isOpen={showWelcomeModal} onStart={startDriverTour} onSkip={handleSkipTour} />
      <CustomAlert isOpen={alertConfig.isOpen} type={alertConfig.type} title={alertConfig.title} message={alertConfig.message} onClose={closeAlert} />

      {/* HEADER */}
      <div className="flex-none bg-white border-b border-slate-200 px-6 py-4 shadow-sm z-20 flex justify-between items-center">
         <div><h1 className="text-xl font-bold text-slate-800 flex items-center gap-2"><ShoppingCart className="text-indigo-600"/> Kasir & POS</h1><p className="text-xs text-slate-500 font-medium tracking-wide mt-0.5">MODE: {role?.toUpperCase()}</p></div>
         <div className="flex items-center gap-3">
             <button onClick={handleRestartTour} className="text-xs bg-white border border-slate-200 text-slate-500 px-3 py-2.5 rounded-full font-bold hover:bg-slate-50 hover:text-indigo-600 transition flex items-center gap-2" title="Panduan Kasir"><HelpCircle size={14}/></button>
             {role === 'kasir' && (<button onClick={handleLogout} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl flex items-center gap-2 text-sm hover:bg-slate-200 transition font-bold"><LogOut size={16}/> Logout</button>)}
         </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden min-h-0">
          
          {/* KOLOM 1: ANTRIAN */}
          <div className="lg:col-span-3 bg-white border-r border-slate-200 flex flex-col h-full overflow-hidden z-10" id="tour-queue-list">
              <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center shrink-0">
                  <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wide flex items-center gap-2"><User size={16} className="text-indigo-600"/> Antrian Selesai</h3>
                  <span className="bg-indigo-100 text-indigo-700 text-[10px] px-2 py-0.5 rounded-full font-bold">{readyTickets.length}</span>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
                  {readyTickets.length === 0 && (<div className="flex flex-col items-center justify-center h-40 text-slate-400 opacity-60"><CheckCircle size={40} className="mb-2"/><p className="text-xs">Tidak ada antrian.</p></div>)}
                  {readyTickets.map(ticket => (
                      <div key={ticket.id} onClick={() => handleSelectTicket(ticket)} className={`p-3 rounded-xl cursor-pointer transition-all duration-200 relative group ${selectedTicket?.id === ticket.id ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-200 shadow-sm' : 'hover:bg-slate-50 border border-transparent hover:border-slate-200'}`}>
                          <div className="flex justify-between items-center mb-1"><span className={`font-bold text-sm ${selectedTicket?.id === ticket.id ? 'text-indigo-900' : 'text-slate-800'}`}>{ticket.costumer_name}</span><span className={`text-[10px] px-2 py-0.5 rounded-md font-mono font-bold ${selectedTicket?.id === ticket.id ? 'bg-indigo-200 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>A-{ticket.no_antrian}</span></div>
                          <p className="text-[11px] text-slate-500 line-clamp-1">{ticket.issue}</p>
                          {selectedTicket?.id === ticket.id && <ChevronRight size={16} className="absolute right-2 top-1/2 -translate-y-1/2 text-indigo-400"/>}
                      </div>
                  ))}
              </div>
          </div>

          {/* KOLOM 2: KATALOG PRODUK */}
          <div className="lg:col-span-5 bg-slate-50/50 flex flex-col h-full overflow-hidden relative border-r border-slate-200" id="tour-catalog">
              <div className="p-4 bg-slate-50/90 backdrop-blur-md border-b border-slate-200/60 shrink-0 z-10">
                  <div className="relative shadow-sm">
                      <Search className="absolute left-3 top-3 text-slate-400" size={18} />
                      <input type="text" placeholder="Cari sparepart..." className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                  </div>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
                  <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 pb-20">
                      {filteredInventory.map(item => (
                          <div key={item.id} onClick={() => addItemToCart(item)} className="group bg-white p-3 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-100 hover:-translate-y-1 transition-all duration-200 cursor-pointer flex flex-col justify-between h-[110px]">
                              <div>
                                  <div className="flex justify-between items-start mb-1">
                                      <div className="p-1.5 bg-slate-50 rounded-lg text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-colors"><PackageIcon size={16}/></div>
                                      <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">Stok: {item.stok}</span>
                                  </div>
                                  <h4 className="font-bold text-slate-700 text-xs line-clamp-2 leading-tight group-hover:text-indigo-700 transition-colors">{item.nama_barang}</h4>
                              </div>
                              <div className="flex justify-between items-end mt-2">
                                  <span className="text-sm font-black text-slate-800">Rp {item.harga_jual.toLocaleString()}</span>
                                  <div className="bg-indigo-50 text-indigo-600 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"><Plus size={14}/></div>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
              <div className="p-3 bg-white border-t border-slate-200 shrink-0 absolute bottom-0 left-0 w-full z-20 shadow-md" id="tour-manual-service">
                  <div className="flex gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200 focus-within:ring-2 focus-within:ring-indigo-100 focus-within:border-indigo-300 transition-all">
                      <div className="flex items-center pl-2 text-slate-400"><Wrench size={16} /></div>
                      <input type="number" placeholder="Biaya Jasa Manual (Rp)..." className="w-full bg-transparent text-sm p-1.5 outline-none font-medium text-slate-700 placeholder:text-slate-400" value={serviceFee} onChange={e => setServiceFee(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addServiceFee()} />
                      <button onClick={addServiceFee} className="bg-white text-indigo-600 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 p-2 rounded-lg transition shadow-sm"><Plus size={16}/></button>
                  </div>
              </div>
          </div>

          {/* KOLOM 3: CHECKOUT */}
          <div className="lg:col-span-4 bg-white border-l border-slate-200 flex flex-col h-full overflow-hidden z-20 shadow-xl lg:shadow-none relative" id="tour-cart">
              
              <div className="p-6 bg-gradient-to-b from-white to-slate-50 border-b border-slate-200 shrink-0 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">{selectedTicket ? <User size={20}/> : <Grid size={20}/>}</div>
                      <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">PELANGGAN</p>
                          <h2 className="text-lg font-black text-slate-800 leading-none truncate max-w-[150px]">{selectedTicket ? selectedTicket.costumer_name : 'Pilih Antrian'}</h2>
                      </div>
                  </div>

                  {/* TOMBOL AI DI PINDAHKAN KE SINI AGAR SELALU TERLIHAT */}
                  {selectedTicket && (
                      <button 
                        id="tour-ai-button"
                        onClick={handleGenerateAiCart}
                        disabled={aiThinking}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-xl text-xs font-bold shadow-lg shadow-indigo-200 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                        title="Isi Keranjang Otomatis dengan AI"
                      >
                        {aiThinking ? <Loader2 className="animate-spin" size={14}/> : <Sparkles size={14} className="text-yellow-300"/>}
                        {aiThinking ? "..." : "AI AUTO"}
                      </button>
                  )}
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-white">
                  {cart.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                          <div className="bg-slate-50 p-4 rounded-full"><ShoppingCart className="text-slate-300" size={32}/></div>
                          <p className="text-sm text-slate-400 italic">Keranjang belanja kosong.</p>
                      </div>
                  ) : (
                      <div className="space-y-4">
                          {cart.map((item, idx) => (
                              <div key={idx} className="flex justify-between items-start group animate-in fade-in slide-in-from-bottom-2 duration-300">
                                  <div className="flex items-start gap-3">
                                      <div className={`mt-1 w-2 h-2 rounded-full ${item.type === 'service' ? 'bg-blue-400' : 'bg-indigo-400'}`}></div>
                                      <div>
                                          <div className="text-sm font-bold text-slate-700 leading-tight">
                                              {item.name}
                                              {item.id.startsWith('ai-') && <span className="ml-1 inline-block"><Bot size={10} className="text-indigo-500"/></span>}
                                          </div>
                                          <div className="text-xs text-slate-400 font-medium mt-0.5">{item.qty} x Rp {item.price.toLocaleString()}</div>
                                      </div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                      <span className="text-sm font-bold text-slate-800">Rp {(item.qty * item.price).toLocaleString()}</span>
                                      <button onClick={() => removeFromCart(item.id)} className="text-slate-300 hover:text-red-500 transition-colors"><Minus size={16}/></button>
                                  </div>
                              </div>
                          ))}
                      </div>
                  )}
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-200 shrink-0" id="tour-checkout-actions">
                  <div className="flex justify-between items-end mb-6">
                      <span className="text-sm font-medium text-slate-500">Total Tagihan</span>
                      <span className="text-3xl font-black text-slate-900 tracking-tight">Rp {grandTotal.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                      <button onClick={handlePrint} disabled={!selectedTicket} className="col-span-1 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-100 flex flex-col items-center justify-center py-3 gap-1 shadow-sm transition active:scale-95 disabled:opacity-50">
                          <Printer size={20}/><span className="text-[10px] uppercase tracking-wide">Cetak</span>
                      </button>
                      <button onClick={handleCheckout} disabled={loading || !selectedTicket} className="col-span-2 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-xl font-bold hover:shadow-lg hover:to-black flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
                          {loading ? <Loader2 className="animate-spin"/> : (<><CreditCard size={20}/><span>BAYAR SEKARANG</span></>)}
                      </button>
                  </div>
              </div>
          </div>
      </div>

      {isPrinting && typeof window !== 'undefined' && createPortal(
        <PrintStruk selectedTicket={selectedTicket} cart={cart} grandTotal={grandTotal} role={role ?? undefined} shopConfig={shopConfig} />,
        document.body
      )}
    </div>
  );
}