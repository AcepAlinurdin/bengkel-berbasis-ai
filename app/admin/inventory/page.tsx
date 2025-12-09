"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, Package, Save, ArrowLeft, UploadCloud, Trash2, Sparkles, X, ScanLine, Plus } from 'lucide-react';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import { useRoleGuard } from '@/lib/authGuard';

export default function InventoryPage() {
  const { loading: authLoading } = useRoleGuard(['owner', 'admin']); 
  const [items, setItems] = useState<any[]>([]);
  const [scannedItems, setScannedItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  // --- Fetch Data Gudang ---
  const fetchInventory = async () => {
    const { data } = await supabase.from('Inventory').select('*').order('created_at', { ascending: false });
    if (data) setItems(data);
    return data || [];
  };

  useEffect(() => { fetchInventory(); }, []);

  // --- LOGIKA SCAN GAMBAR ---
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAnalyzing(true);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = async () => {
      const base64String = (reader.result as string).split(',')[1];
      const mimeType = file.type;

      try {
        const response = await fetch('/api/analyze-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64String, mimeType }),
        });

        if (!response.ok) throw new Error('Gagal scan gambar');
        const aiData = await response.json();
        const newItems = aiData.items || [];
        
        if (newItems.length > 0) {
            setScannedItems(prev => [...newItems, ...prev]); 
            alert(`✨ AI menemukan ${newItems.length} item!`);
        } else {
            alert("Tidak ada item valid terdeteksi.");
        }

      } catch (err: any) {
        console.error("AI Error:", err);
        alert("Gagal scan gambar.");
      } finally {
        setAnalyzing(false);
        e.target.value = ''; 
      }
    };
  };

  const handleDraftChange = (index: number, field: string, value: any) => {
    const updated = [...scannedItems];
    updated[index] = { ...updated[index], [field]: value };
    setScannedItems(updated);
  };

  const removeDraftItem = (index: number) => {
    setScannedItems(scannedItems.filter((_, i) => i !== index));
  };

  const addManualDraft = () => {
      setScannedItems(prev => [{
          nama_barang: "", kategori: "Sparepart", qty: 1, harga_beli: 0, harga_jual: 0, supplier: ""
      }, ...prev]);
  };

  // --- LOGIKA PENYIMPANAN PINTAR (AI MATCHING) ---
  const handleSaveAll = async () => {
    if (scannedItems.length === 0) return;
    setLoading(true);
    setStatusMsg('Mengambil data gudang...');
    
    try {
      // 1. Ambil data gudang terbaru untuk dibandingkan
      const currentDB = await fetchInventory();
      
      setStatusMsg('AI sedang mencocokkan barang...');
      
      // 2. Minta AI Mencocokkan Nama (Fuzzy Match)
      let matches: any[] = [];
      try {
          const matchResponse = await fetch('/api/inventory-match', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ scannedItems, dbItems: currentDB }),
          });
          matches = await matchResponse.json();
      } catch (e) {
          console.warn("AI Match failed, using fallback exact match.");
      }

      setStatusMsg('Menyimpan ke database...');
      let savedCount = 0;
      let mergedCount = 0;

      for (let i = 0; i < scannedItems.length; i++) {
        const item = scannedItems[i];
        if (!item.nama_barang) continue;
        
        const inputQty = parseInt(item.qty || item.stok || 0);
        const hargaBeli = parseInt(item.harga_beli || 0);
        const hargaJual = parseInt(item.harga_jual || 0);
        const inputSupplier = item.supplier || "Umum";
        const totalModal = inputQty * hargaBeli;

        // Cek hasil match dari AI (jika ada), atau fallback ke nama persis
        const aiMatchId = matches[i]?.matchId;
        const existingItem = aiMatchId 
            ? currentDB.find((d: any) => d.id === aiMatchId) // Match by AI ID
            : currentDB.find((d: any) => d.nama_barang.toLowerCase() === item.nama_barang.toLowerCase()); // Fallback exact name

        let finalItemId;

        if (existingItem) {
            // --- SKENARIO GABUNG STOK (MERGE) ---
            const newStock = existingItem.stok + inputQty;
            
            // Gabung nama supplier jika beda
            let finalSupplier = existingItem.supplier || "Umum";
            if (inputSupplier !== "Umum" && !finalSupplier.toLowerCase().includes(inputSupplier.toLowerCase())) {
                finalSupplier = `${finalSupplier}, ${inputSupplier}`;
            }

            await supabase.from('Inventory').update({
                stok: newStock,
                harga_beli: hargaBeli, // Update harga terbaru
                harga_jual: hargaJual, 
                supplier: finalSupplier
            }).eq('id', existingItem.id);

            finalItemId = existingItem.id;
            mergedCount++;

        } else {
            // --- SKENARIO BARANG BARU (INSERT) ---
            const { data: newItem, error } = await supabase.from('Inventory').insert([{
                nama_barang: item.nama_barang, 
                kategori: item.kategori, 
                stok: inputQty,
                harga_beli: hargaBeli, 
                harga_jual: hargaJual, 
                supplier: inputSupplier
            }]).select().single();

            if (error) throw error;
            finalItemId = newItem.id;
            savedCount++;
        }

        // Catat Log Keuangan
        if (finalItemId) {
            await supabase.from('StockLogs').insert([{
                item_id: finalItemId, 
                item_name: existingItem ? existingItem.nama_barang : item.nama_barang, 
                type: 'in', 
                qty: inputQty, 
                total_price: totalModal, 
                description: existingItem ? `Restock (Stok Digabung): ${inputSupplier}` : `Barang Baru: ${inputSupplier}`
            }]);
        }
      }

      alert(`✅ Selesai!\n- ${savedCount} Barang Baru Ditambahkan\n- ${mergedCount} Barang Lama Digabungkan Stoknya`);
      setScannedItems([]); 
      fetchInventory();    
    } catch (err) { 
        console.error(err); 
        alert("Terjadi kesalahan saat menyimpan."); 
    } finally { 
        setLoading(false); 
        setStatusMsg('');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("PERINGATAN: Menghapus barang akan menghapus riwayat laporan keuangannya juga.\n\nLanjutkan?")) {
        // Hapus logs dulu (jika tidak cascade)
        await supabase.from('StockLogs').delete().eq('item_id', id);
        // Hapus barang
        await supabase.from('Inventory').delete().eq('id', id);
        fetchInventory();
    }
  };

  if (authLoading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-slate-500"><Loader2 className="animate-spin mr-2"/> Cek Akses...</div>;

  return (
    <div className="h-screen bg-gray-50 text-slate-800 p-4 font-mono flex flex-col overflow-hidden">
      
      {/* HEADER FIXED */}
      <div className="shrink-0 mb-4">
        <PageHeader 
            title="Manajemen Gudang" 
            subtitle="Input via Foto Nota atau Manual" 
            icon={Package} 
            
        />
      </div>
      
      {/* MAIN CONTENT */}
      <div className="flex-1 grid lg:grid-cols-12 gap-6 overflow-hidden pb-2">
        
        {/* KOLOM KIRI: INPUT FORM (4/12) */}
        <div className="lg:col-span-4 flex flex-col gap-4 h-full overflow-hidden">
          
          {/* 1. AREA UPLOAD */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden shrink-0">
             {analyzing && <div className="absolute inset-0 bg-white/90 z-10 flex flex-col items-center justify-center text-emerald-600 animate-pulse"><Loader2 className="animate-spin mb-2" size={32}/><p className="text-xs font-bold">AI sedang membaca nota...</p></div>}
             
             <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                <ScanLine size={18} className="text-emerald-600"/> Input Barang
             </h3>

             <div className="grid grid-cols-2 gap-3 mb-2">
                 <label className="col-span-1 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-700 rounded-lg p-3 flex flex-col items-center justify-center cursor-pointer transition group">
                    <UploadCloud className="mb-1 group-hover:scale-110 transition"/>
                    <span className="text-[10px] font-bold">Scan Nota</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={analyzing} />
                 </label>
                 
                 <button onClick={addManualDraft} className="col-span-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg p-3 flex flex-col items-center justify-center transition group shadow-sm">
                    <Plus className="mb-1 group-hover:scale-110 transition"/>
                    <span className="text-[10px] font-bold">Manual</span>
                 </button>
             </div>
          </div>

          {/* 2. FORM DRAFT */}
          <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col relative">
             {scannedItems.length > 0 ? (
                 <>
                    <div className="p-3 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                        <h3 className="text-xs font-bold text-slate-700">Draft Input ({scannedItems.length})</h3>
                        <button onClick={() => setScannedItems([])} className="text-[10px] text-red-500 hover:underline">Reset</button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3">
                        {scannedItems.map((item, idx) => (
                            <div key={idx} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm relative group hover:border-emerald-200 transition">
                                <button onClick={() => removeDraftItem(idx)} className="absolute -top-2 -right-2 bg-white text-slate-400 hover:text-red-500 border border-slate-200 rounded-full p-1 shadow-md z-10"><X size={12}/></button>

                                <div className="space-y-2">
                                    <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-800 font-bold outline-none" value={item.nama_barang} onChange={e => handleDraftChange(idx, 'nama_barang', e.target.value)} placeholder="Nama Barang..."/>
                                    <div className="grid grid-cols-2 gap-2">
                                        <input type="text" placeholder="Kategori" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[10px]" value={item.kategori} onChange={e => handleDraftChange(idx, 'kategori', e.target.value)} />
                                        <input type="text" placeholder="Supplier" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[10px]" value={item.supplier} onChange={e => handleDraftChange(idx, 'supplier', e.target.value)} />
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2 rounded border border-slate-100">
                                        <div><label className="text-[8px] text-blue-500 uppercase font-bold">Qty</label><input type="number" className="w-full bg-white border border-slate-200 rounded px-1 py-1 text-[10px] text-center font-bold" value={item.qty} onChange={e => handleDraftChange(idx, 'qty', e.target.value)} /></div>
                                        <div><label className="text-[8px] text-slate-400 uppercase font-bold">Beli</label><input type="number" className="w-full bg-white border border-slate-200 rounded px-1 py-1 text-[10px]" value={item.harga_beli} onChange={e => handleDraftChange(idx, 'harga_beli', e.target.value)} /></div>
                                        <div><label className="text-[8px] text-emerald-500 uppercase font-bold">Jual</label><input type="number" className="w-full bg-white border border-slate-200 rounded px-1 py-1 text-[10px] font-bold" value={item.harga_jual} onChange={e => handleDraftChange(idx, 'harga_jual', e.target.value)} /></div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="p-3 border-t border-slate-100 bg-slate-50 shrink-0">
                        <button onClick={handleSaveAll} disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-lg flex justify-center items-center gap-2 shadow-sm text-xs">
                            {loading ? <><Loader2 className="animate-spin size={14}" /> {statusMsg || 'Proses AI...'}</> : <><Save size={14}/> SIMPAN / GABUNG STOK</>}
                        </button>
                    </div>
                 </>
             ) : (
                 <div className="h-full flex flex-col items-center justify-center text-slate-400 p-6">
                    <Sparkles className="mb-2 text-slate-300" size={32}/>
                    <p className="text-sm font-medium text-slate-500">Form Kosong</p>
                    <p className="text-xs mt-1">Scan Nota untuk mengisi.</p>
                 </div>
             )}
          </div>
        </div>

        {/* KOLOM KANAN: TABEL GUDANG (8/12) */}
        <div className="lg:col-span-8 h-full overflow-hidden">
          <div className="bg-white rounded-xl border border-slate-200 h-full flex flex-col shadow-sm relative">
             <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                    <div className="bg-white p-2 rounded-lg text-slate-600 border border-slate-200 shadow-sm"><Package size={20}/></div>
                    <div>
                        <h3 className="font-bold text-lg text-slate-800">Stok Gudang</h3>
                        <p className="text-xs text-slate-500">Total {items.length} jenis barang</p>
                    </div>
                </div>
             </div>
             
             <div className="flex-1 overflow-y-auto custom-scrollbar">
                <table className="w-full text-sm text-left text-slate-600">
                    <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0 z-10 shadow-sm">
                        <tr>
                            <th className="px-6 py-3 font-semibold border-b border-slate-200">Nama Barang</th>
                            <th className="px-6 py-3 text-center font-semibold border-b border-slate-200">Stok</th>
                            <th className="px-6 py-3 text-right font-semibold border-b border-slate-200">Beli</th>
                            <th className="px-6 py-3 text-right font-semibold border-b border-slate-200">Jual</th>
                            <th className="px-6 py-3 text-center font-semibold border-b border-slate-200">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {items.length === 0 && (
                            <tr><td colSpan={5} className="px-6 py-20 text-center text-slate-400 italic">Gudang kosong.</td></tr>
                        )}
                        {items.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50 transition group">
                                <td className="px-6 py-3">
                                    <div className="font-bold text-slate-800 text-sm mb-0.5">{item.nama_barang}</div>
                                    <div className="flex gap-2">
                                        <span className="text-[10px] uppercase tracking-wide bg-slate-100 px-2 py-0.5 rounded text-slate-500 font-medium">{item.kategori || 'Part'}</span>
                                        {item.supplier && item.supplier !== "Umum" && (
                                            <span className="text-[10px] flex items-center gap-1 text-slate-400 max-w-[150px] truncate" title={item.supplier}>
                                                🏭 {item.supplier}
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-3 text-center">
                                    <span className={`px-2.5 py-1 rounded text-xs font-bold border ${item.stok < 5 ? 'bg-red-50 text-red-600 border-red-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                                        {item.stok}
                                    </span>
                                </td>
                                <td className="px-6 py-3 text-right text-xs text-slate-400">
                                    Rp {parseInt(item.harga_beli).toLocaleString('id-ID')}
                                </td>
                                <td className="px-6 py-3 text-right font-mono text-slate-700 font-bold">
                                    Rp {parseInt(item.harga_jual).toLocaleString('id-ID')}
                                </td>
                                <td className="px-6 py-3 text-center">
                                    <button onClick={() => handleDelete(item.id)} className="text-slate-400 hover:text-red-500 p-2 rounded hover:bg-red-50 transition"><Trash2 size={16}/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}