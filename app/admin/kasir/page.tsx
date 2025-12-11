"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { 
  ShoppingCart, Search, Plus, CreditCard, 
  User, Wrench, Loader2, MinusCircle, Printer, LogOut, Bot, Sparkles 
} from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { useRoleGuard } from '@/lib/authGuard';

// Tipe data
type CartItem = {
  id: string;
  name: string;
  price: number;
  qty: number;
  type: 'part' | 'service';
  original_stok?: number; 
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
  
  // State animasi loading saat tombol AI ditekan
  const [aiThinking, setAiThinking] = useState(false); 

  // --- FETCH DATA ---
  const fetchData = async () => {
    const { data: tickets } = await supabase
      .from('Antrian')
      .select('*') 
      .eq('status', 'done')
      .order('created_at', { ascending: true });
    if (tickets) setReadyTickets(tickets);

    const { data: items } = await supabase
      .from('Inventory')
      .select('*')
      .gt('stok', 0)
      .order('nama_barang', { ascending: true });
    if (items) setInventory(items);
  };

  useEffect(() => { fetchData(); }, []);

  // --- HANDLERS ---
  const handleLogout = async () => { 
    await supabase.auth.signOut(); 
    router.push('/login'); 
  };

  const handleSelectTicket = (ticket: any) => { 
    setSelectedTicket(ticket); 
    setServiceFee('');
    // KITA KOSONGKAN CART AGAR KASIR BISA MEMILIH: MANUAL ATAU TOMBOL AI
    setCart([]); 
  };

  // --- FITUR UTAMA: TOMBOL AI GENERATOR ---
  // --- FITUR UTAMA: TOMBOL AI GENERATOR (REAL DATABASE) ---
  const handleGenerateAiCart = async () => {
    if (!selectedTicket) return;
    setAiThinking(true);

    // Simulasi "Mikir"
    await new Promise(resolve => setTimeout(resolve, 800));

    try {
        let generatedItems: CartItem[] = [];

        // Helper function: Cari barang di inventory berdasarkan kata kunci
        // Fungsi ini akan mencari barang pertama yang namanya mengandung salah satu kata kunci
        const findInInventory = (keywords: string[]) => {
            return inventory.find(item => 
                keywords.some(k => item.nama_barang.toLowerCase().includes(k))
            );
        };

        // SKENARIO 1: Cek Data Database (Prioritas Utama - Jika Mekanik sudah input)
        if (selectedTicket.rincian_biaya && Array.isArray(selectedTicket.rincian_biaya) && selectedTicket.rincian_biaya.length > 0) {
            generatedItems = selectedTicket.rincian_biaya;
        } 
        // SKENARIO 2: Fallback Pintar (Cari Barang di Inventory Real-time)
        else {
            const issueText = selectedTicket.issue.toLowerCase();
            
            // --- 1. DETEKSI OLI ---
            if (issueText.includes('oli')) {
                // Cari barang di inventory yang namanya mengandung 'oli', 'mpx', 'shell', atau 'motul'
                const part = findInInventory(['oli', 'mpx', 'shell', 'motul', 'yamalube']);
                
                if (part) {
                    generatedItems.push({ 
                        id: part.id, 
                        name: part.nama_barang, // Nama Asli dari DB
                        price: part.harga_jual, // Harga Asli dari DB
                        qty: 1, 
                        type: 'part', 
                        original_stok: part.stok 
                    });
                }
                // Tambah Jasa (Tetap manual/hardcode karena jasa biasanya tidak ada di inventory barang)
                generatedItems.push({ id: 'ai-jasa-oli', name: 'Jasa Ganti Oli', price: 10000, qty: 1, type: 'service' });
            }

            // --- 2. DETEKSI REM ---
            if (issueText.includes('rem') || issueText.includes('kampas')) {
                const part = findInInventory(['kampas', 'dispad', 'brake']);
                
                if (part) {
                    generatedItems.push({ 
                        id: part.id, 
                        name: part.nama_barang, 
                        price: part.harga_jual, 
                        qty: 1, 
                        type: 'part', 
                        original_stok: part.stok 
                    });
                }
                generatedItems.push({ id: 'ai-jasa-rem', name: 'Jasa Pasang Kampas Rem', price: 20000, qty: 1, type: 'service' });
            }

            // --- 3. DETEKSI BUSI ---
            if (issueText.includes('busi') || issueText.includes('brebet')) {
                const part = findInInventory(['busi', 'ngk', 'denso']);
                if (part) {
                    generatedItems.push({ 
                        id: part.id, name: part.nama_barang, price: part.harga_jual, qty: 1, type: 'part', original_stok: part.stok 
                    });
                }
            }

            // --- 4. DETEKSI BAN ---
            if (issueText.includes('ban') || issueText.includes('bocor')) {
                const part = findInInventory(['ban', 'irc', 'fdr', 'maxxis']);
                if (part) {
                    generatedItems.push({ 
                        id: part.id, name: part.nama_barang, price: part.harga_jual, qty: 1, type: 'part', original_stok: part.stok 
                    });
                }
                generatedItems.push({ id: 'ai-jasa-ban', name: 'Jasa Pasang Ban', price: 15000, qty: 1, type: 'service' });
            }

            // --- 5. DETEKSI CVT ---
            if (issueText.includes('cvt') || issueText.includes('vanbelt') || issueText.includes('roller')) {
                 // Coba cari Vanbelt dulu
                 const part = findInInventory(['vbelt', 'vanbelt', 'roller']);
                 if (part) {
                    generatedItems.push({ 
                        id: part.id, name: part.nama_barang, price: part.harga_jual, qty: 1, type: 'part', original_stok: part.stok 
                    });
                 }
                 generatedItems.push({ id: 'ai-jasa-cvt', name: 'Jasa Servis & Bersihkan CVT', price: 45000, qty: 1, type: 'service' });
            }

            // --- JASA UMUM (DEFAULT) ---
            const hasService = generatedItems.some(i => i.type === 'service');
            if (!hasService && generatedItems.length === 0) {
                // Jika tidak menemukan barang APAPUN dan tidak ada jasa, kemungkinan deskripsi tidak jelas
                // Masukkan jasa cek umum saja
                generatedItems.push({ id: 'ai-jasa-umum', name: 'Jasa Service Ringan & Pengecekan', price: 35000, qty: 1, type: 'service' });
            }
        }

        setCart(generatedItems);
    } catch (error) {
        console.error("AI Error", error);
        alert("AI Gagal men-generate struk.");
    } finally {
        setAiThinking(false);
    }
  };
  
  const addItemToCart = (item: any) => {
    const existing = cart.find(c => c.id === item.id);
    if (existing) {
      if (existing.type === 'part' && existing.original_stok && existing.qty >= existing.original_stok) {
        return alert("Stok gudang tidak cukup!");
      }
      setCart(cart.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c));
    } else {
      setCart([...cart, { 
        id: item.id, name: item.nama_barang, price: item.harga_jual, qty: 1, type: 'part', original_stok: item.stok 
      }]);
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
      if (!selectedTicket) return alert("Pilih pelanggan!");
      if (cart.length === 0) return alert("Keranjang kosong!");
      
      setLoading(true);
      try {
          const { error: transError } = await supabase.from('Transactions').insert([{ 
            ticket_id: selectedTicket.id, 
            customer_name: selectedTicket.costumer_name, 
            total_amount: grandTotal, 
            payment_method: 'cash', 
            items: cart 
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
          alert("✅ Transaksi Berhasil!"); 
          setSelectedTicket(null); setCart([]); fetchData(); 
      } catch (err: any) { 
          console.error(err); alert("Gagal transaksi: " + err.message); 
      } finally { setLoading(false); }
  };

  const filteredInventory = inventory.filter(i => 
    i.nama_barang.toLowerCase().includes(searchTerm.toLowerCase()) || 
    i.kategori?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (authLoading) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center text-slate-500 gap-3">
      <Loader2 className="animate-spin text-blue-600" size={40}/> 
      <p className="font-medium animate-pulse">Memeriksa hak akses...</p>
    </div>
  );

  return (
    <div className="lg:h-screen min-h-screen bg-gray-50 text-slate-800 p-4 font-mono flex flex-col lg:overflow-hidden overflow-y-auto">
      
      {/* HEADER */}
      <div className="shrink-0 mb-4">
        <PageHeader title="Kasir & POS" subtitle={`Mode: ${role?.toUpperCase()}`} icon={ShoppingCart}
            actions={
            <div className="flex gap-2">
                {role === 'kasir' && (<button onClick={handleLogout} className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg flex items-center gap-2 text-sm hover:bg-red-100 transition shadow-sm"><LogOut size={16}/> Logout</button>)}
            </div>
            }
        />
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:overflow-hidden pb-10 lg:pb-2">
          
          {/* KOLOM 1: ANTRIAN (3/12) */}
          <div className="lg:col-span-3 h-[300px] lg:h-full bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50 shrink-0">
                  <h3 className="font-bold text-slate-700 flex items-center gap-2 text-sm uppercase"><User size={16} className="text-emerald-600"/> Antrian Selesai</h3>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3 min-h-0">
                  {readyTickets.length === 0 && <p className="text-xs text-slate-400 italic text-center py-10">Tidak ada antrian.</p>}
                  {readyTickets.map(ticket => (
                      <div key={ticket.id} onClick={() => handleSelectTicket(ticket)}
                        className={`p-3 rounded-lg border cursor-pointer transition group relative overflow-hidden ${selectedTicket?.id === ticket.id ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-300' : 'bg-white border-slate-200 hover:border-blue-200'}`}
                      >
                          <div className="flex justify-between items-start mb-1">
                              <span className="font-bold text-slate-800 text-sm truncate w-24">{ticket.costumer_name}</span>
                              <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-500 font-mono">A-{ticket.no_antrian}</span>
                          </div>
                          <p className="text-[10px] text-slate-500 line-clamp-2">{ticket.issue}</p>
                      </div>
                  ))}
              </div>
          </div>

          {/* KOLOM 2: BARANG (5/12) */}
          <div className="lg:col-span-5 h-[500px] lg:h-full flex flex-col gap-4 overflow-hidden">
              <div className="bg-white p-3 rounded-xl border border-slate-200 shrink-0 shadow-sm">
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Wrench className="absolute left-3 top-2.5 text-blue-400" size={14} />
                            <input type="number" placeholder="Input Biaya Jasa Tambahan (Rp)..." className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 outline-none" value={serviceFee} onChange={e => setServiceFee(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addServiceFee()} />
                        </div>
                        <button onClick={addServiceFee} className="bg-blue-600 hover:bg-blue-700 text-white px-3 rounded-lg"><Plus size={18}/></button>
                    </div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 flex-1 flex flex-col overflow-hidden shadow-sm min-h-0">
                    <div className="p-3 border-b border-slate-100 bg-slate-50 shrink-0">
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
                            <input type="text" placeholder="Cari Sparepart Manual..." className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-amber-200 outline-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2 min-h-0">
                        {filteredInventory.map(item => (
                            <div key={item.id} className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-100 hover:border-amber-300 transition group hover:shadow-sm">
                                <div className="flex-1 overflow-hidden">
                                    <div className="text-sm font-bold text-slate-700 truncate">{item.nama_barang}</div>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-[10px] bg-slate-100 px-1.5 rounded text-slate-500">Stok: {item.stok}</span>
                                        <span className="text-xs text-amber-600 font-bold">Rp {item.harga_jual.toLocaleString()}</span>
                                    </div>
                                </div>
                                <button onClick={() => addItemToCart(item)} className="bg-slate-50 text-slate-400 hover:bg-amber-500 hover:text-white p-1.5 rounded-lg transition shrink-0 ml-2"><Plus size={16}/></button>
                            </div>
                        ))}
                    </div>
              </div>
          </div>

          {/* KOLOM 3: STRUK (4/12) */}
          <div className="lg:col-span-4 h-[600px] lg:h-full flex flex-col overflow-hidden">
              <div id="printable-area" className="bg-white rounded-xl shadow-lg border border-slate-200 h-full flex flex-col overflow-hidden relative">
                  
                  <div className="shrink-0 p-4 border-b border-dashed border-slate-200 bg-white z-10 relative">
                      <div className="no-print absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-slate-200 via-white to-slate-200 shadow-inner"></div>
                      <div className="text-center mb-3 pt-2">
                          <h2 className="text-xl font-black tracking-widest text-slate-800">BENGKEL AI</h2>
                          <p className="text-[10px] text-slate-500 font-mono">Jl. Teknologi No. 1</p>
                      </div>
                      <div className="text-xs font-mono text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">
                          <div className="flex justify-between">
                              <span>Pelanggan:</span>
                              <span className="font-bold truncate max-w-[100px]">{selectedTicket ? selectedTicket.costumer_name : '-'}</span>
                          </div>
                          <div className="flex justify-between">
                              <span>Nomor:</span>
                              <span className="font-bold">{selectedTicket ? `A-${selectedTicket.no_antrian}` : '-'}</span>
                          </div>
                      </div>
                  </div>

                  <div className="flex-1 overflow-y-auto custom-scrollbar p-4 min-h-0 bg-white relative">
                      <div className="space-y-2 font-mono text-sm">
                          
                          {/* --- TOMBOL AI (Hanya Muncul Jika Cart Kosong & Tiket Dipilih) --- */}
                          {cart.length === 0 && selectedTicket && (
                            <div className="flex flex-col items-center justify-center py-10 gap-3">
                                <p className="text-xs text-slate-400 italic mb-2">Struk kosong.</p>
                                
                                <button 
                                    onClick={handleGenerateAiCart}
                                    disabled={aiThinking}
                                    className="no-print group relative overflow-hidden bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-6 py-3 rounded-full font-bold shadow-lg hover:shadow-indigo-200 transition-all hover:scale-105 active:scale-95 disabled:opacity-70 disabled:scale-100"
                                >
                                    <div className="absolute inset-0 bg-white/20 group-hover:translate-x-full duration-1000 transition-transform -translate-x-full"></div>
                                    <div className="flex items-center gap-2">
                                        {aiThinking ? <Loader2 className="animate-spin" size={18}/> : <Sparkles size={18} className="text-yellow-300 animate-pulse"/>}
                                        {aiThinking ? "Menganalisa..." : "ISI OTOMATIS (AI)"}
                                    </div>
                                </button>
                                <p className="text-[10px] text-slate-400 max-w-[200px] text-center">
                                    Klik tombol ini untuk memuat sparepart & jasa berdasarkan diagnosa.
                                </p>
                            </div>
                          )}

                          {/* --- ITEM LIST --- */}
                          {cart.map((item, idx) => (
                              <div key={idx} className="flex justify-between items-start border-b border-slate-50 pb-2 last:border-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                  <div className="flex-1 pr-2">
                                      <div className="text-slate-700 font-bold flex items-center gap-1">
                                        {item.name}
                                        {item.type === 'service' && <span className="text-[8px] bg-blue-100 text-blue-600 px-1 rounded">JASA</span>}
                                        {item.id.startsWith('ai-') && <Bot size={10} className="text-purple-500"/>}
                                      </div>
                                      <div className="text-[10px] text-slate-400">{item.qty} x {item.price.toLocaleString()}</div>
                                  </div>
                                  <div className="flex flex-col items-end">
                                      <span className="font-bold text-slate-800">{(item.qty * item.price).toLocaleString()}</span>
                                      <button onClick={() => removeFromCart(item.id)} className="no-print text-red-300 hover:text-red-500 p-0.5 mt-1"><MinusCircle size={14}/></button>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>

                  <div className="shrink-0 bg-slate-50 p-4 border-t-2 border-dashed border-slate-300 mt-auto z-10">
                      <div className="flex justify-between items-center text-xl font-black mb-4 text-slate-800">
                          <span>TOTAL</span>
                          <span>Rp {grandTotal.toLocaleString('id-ID')}</span>
                      </div>
                      
                      <div className="no-print flex gap-2">
                          <button onClick={() => window.print()} disabled={!selectedTicket} className="flex-1 bg-white border border-slate-300 text-slate-600 py-3 rounded-lg font-bold hover:bg-slate-100 flex justify-center items-center gap-2 shadow-sm transition">
                              <Printer size={18}/> CETAK
                          </button>
                          <button onClick={handleCheckout} disabled={loading || !selectedTicket} className="flex-[2] bg-slate-900 text-white py-3 rounded-lg font-bold hover:bg-slate-800 flex justify-center items-center gap-2 shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed">
                              {loading ? <Loader2 className="animate-spin"/> : <><CreditCard size={18}/> BAYAR</>}
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
}