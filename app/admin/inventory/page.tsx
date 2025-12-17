"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Loader2, Package, Save, UploadCloud, Trash2, Sparkles, 
  X, ScanLine, Plus, Edit2, Truck, AlertTriangle, CheckCircle, Info 
} from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { useRoleGuard } from '@/lib/authGuard';

// --- HELPER FUNCTIONS ---
const parseNumber = (val: any) => {
    if (!val) return 0;
    const cleanStr = String(val).replace(/[^0-9]/g, ''); 
    return parseInt(cleanStr || '0');
};

const normalizeName = (name: string) => {
    return name ? name.toLowerCase().replace(/[^a-z0-9]/g, '') : '';
};

// --- CUSTOM ALERT COMPONENT (TAILWIND) ---
// Komponen kecil untuk menggantikan alert() bawaan browser
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm transition-opacity">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100">
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

export default function InventoryPage() {
  const { loading: authLoading } = useRoleGuard(['owner', 'admin']); 
  
  // --- STATE DATA ---
  const [items, setItems] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]); 
  
  // --- STATE FORM ---
  const [scannedItems, setScannedItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  
  // --- STATE EDIT MODE ---
  const [isEditing, setIsEditing] = useState(false);
  const [editItemId, setEditItemId] = useState<string | null>(null);

  // --- STATE MODAL & ALERT ---
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  
  // State untuk Custom Alert
  const [alertConfig, setAlertConfig] = useState({
      isOpen: false,
      type: 'info', // success, error, warning, info
      title: '',
      message: '',
      isConfirmMode: false,
      onConfirm: () => {},
      onCancel: () => {},
      confirmText: 'OK',
      cancelText: 'Batal'
  });

  // --- HELPER: SHOW ALERT ---
  const showAlert = (type: string, title: string, message: string) => {
      setAlertConfig({
          isOpen: true,
          type,
          title,
          message,
          isConfirmMode: false,
          onConfirm: () => setAlertConfig(prev => ({ ...prev, isOpen: false })),
          onCancel: () => setAlertConfig(prev => ({ ...prev, isOpen: false })),
          confirmText: 'OK',
          cancelText: ''
      });
  };

  // --- HELPER: SHOW CONFIRMATION ---
  const showConfirm = (type: string, title: string, message: string, onYes: () => void, onNo: () => void, yesText = "Ya", noText = "Batal") => {
      setAlertConfig({
          isOpen: true,
          type,
          title,
          message,
          isConfirmMode: true,
          onConfirm: () => {
              onYes();
              setAlertConfig(prev => ({ ...prev, isOpen: false }));
          },
          onCancel: () => {
              onNo();
              setAlertConfig(prev => ({ ...prev, isOpen: false }));
          },
          confirmText: yesText,
          cancelText: noText
      });
  };

  // --- FETCH DATA ---
  const fetchData = async () => {
    const { data: dInventory } = await supabase.from('Inventory').select('*').order('created_at', { ascending: false });
    if (dInventory) setItems(dInventory);

    const { data: dSuppliers } = await supabase.from('Suppliers').select('*').order('name', { ascending: true });
    if (dSuppliers) setSuppliers(dSuppliers);
    return dSuppliers || []; // Return data agar bisa dipakai langsung
  };

  useEffect(() => { fetchData(); }, []);

  // --- 1. SCAN GAMBAR (AI) ---
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

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({})); 
            throw new Error(errorData.error || `Server Error: ${response.status}`);
        }

        const aiData = await response.json();
        
        // 1. Sanitasi data dasar
        const cleanItems = (aiData.items || []).map((i: any) => ({
            ...i,
            harga_beli: parseNumber(i.harga_beli),
            harga_jual: parseNumber(i.harga_jual),
            qty: parseNumber(i.qty || i.stok),
            supplier: i.supplier || "" 
        }));

        if (cleanItems.length === 0) {
            showAlert('error', 'Gagal Scan', 'Tidak ada item valid terdeteksi oleh AI.');
            setAnalyzing(false);
            e.target.value = '';
            return;
        }

        // 2. LOGIKA SUPPLIER OTOMATIS
        // Ambil nama supplier yang terdeteksi di item pertama (asumsi 1 nota = 1 supplier)
        const detectedSupplierName = cleanItems[0].supplier;
        
        let finalItemsToSet = [...cleanItems];

        if (detectedSupplierName) {
            // Ambil data supplier terbaru dari state (atau fetch ulang biar aman)
            const currentSuppliers = suppliers;
            
            // Cek apakah supplier sudah ada di DB?
            const existingSupplier = currentSuppliers.find(s => 
                normalizeName(s.name) === normalizeName(detectedSupplierName)
            );

            if (existingSupplier) {
                // KASUS A: Supplier Sudah Ada -> Langsung Pilih
                finalItemsToSet = cleanItems.map((i: any) => ({ ...i, supplier: existingSupplier.name }));
                setScannedItems(prev => [...finalItemsToSet, ...prev]);
                showAlert('success', 'Scan Berhasil', `AI menemukan ${cleanItems.length} item dari "${existingSupplier.name}".`);
            } else {
                // KASUS B: Supplier Baru -> Tawarkan Tambah
                setScannedItems(prev => [...cleanItems, ...prev]); // Tampilkan dulu datanya
                setAnalyzing(false); // Stop loading biar popup muncul enak
                
                showConfirm(
                    'warning',
                    'Supplier Baru Terdeteksi!',
                    `AI membaca supplier: "${detectedSupplierName}".\nData ini belum ada di database Anda.\n\nApakah Anda ingin menambahkannya sekarang?`,
                    async () => {
                        // JIKA YES (ACC): Simpan ke DB -> Update Form
                        const { error } = await supabase.from('Suppliers').insert([{ name: detectedSupplierName }]);
                        if (!error) {
                            const newSuppliers = await fetchData(); // Refresh dropdown
                            // Update draft items agar suppliernya terpilih otomatis
                            setScannedItems(prev => prev.map(item => 
                                item.supplier === detectedSupplierName ? { ...item, supplier: detectedSupplierName } : item
                            ));
                            showAlert('success', 'Supplier Ditambahkan', `"${detectedSupplierName}" telah disimpan & dipilih otomatis.`);
                        } else {
                            showAlert('error', 'Gagal', 'Gagal menyimpan supplier baru.');
                        }
                    },
                    () => {
                        // JIKA NO (TOLAK): Kosongkan field supplier agar user isi manual
                        setScannedItems(prev => prev.map(item => ({ ...item, supplier: "" })));
                        showAlert('info', 'Supplier Ditolak', 'Silakan pilih supplier secara manual dari dropdown.');
                    },
                    "Ya, Tambahkan", // Tombol ACC
                    "Tidak, Abaikan" // Tombol TOLAK
                );
                e.target.value = ''; 
                return; // Keluar function, biar ga double alert
            }
        } else {
            // Jika AI tidak nemu nama supplier
            setScannedItems(prev => [...cleanItems, ...prev]); 
            showAlert('success', 'Scan Berhasil', `AI menemukan ${cleanItems.length} item! (Supplier tidak terbaca)`);
        }

      } catch (err: any) {
        console.error("AI Error:", err);
        showAlert('error', 'Error AI', err.message);
      } finally {
        setAnalyzing(false);
        e.target.value = ''; 
      }
    };
  };

  // --- 2. MANAJEMEN FORM DRAFT ---
  const handleDraftChange = (index: number, field: string, value: any) => {
    const updated = [...scannedItems];
    if (['qty', 'harga_beli', 'harga_jual', 'stok'].includes(field)) {
        updated[index] = { ...updated[index], [field]: parseNumber(value) };
    } else {
        updated[index] = { ...updated[index], [field]: value };
    }
    setScannedItems(updated);
  };

  const removeDraftItem = (index: number) => {
    setScannedItems(scannedItems.filter((_, i) => i !== index));
    if (scannedItems.length === 1 && isEditing) cancelEdit();
  };

  const addManualDraft = () => {
      setScannedItems(prev => [{
          nama_barang: "", kategori: "Sparepart", qty: 1, harga_beli: 0, harga_jual: 0, supplier: ""
      }, ...prev]);
  };

  // --- 3. MANAJEMEN SUPPLIER MANUAL ---
  const handleAddSupplier = async () => {
      if (!newSupplierName) return;
      await supabase.from('Suppliers').insert([{ name: newSupplierName }]);
      setNewSupplierName('');
      fetchData(); 
  };

  const handleDeleteSupplier = async (id: string, name: string) => {
      showConfirm('warning', 'Hapus Supplier?', `Yakin ingin menghapus "${name}"?`, async () => {
          await supabase.from('Suppliers').delete().eq('id', id);
          fetchData();
      }, () => {});
  };

  // --- 4. LOGIKA SIMPAN CERDAS ---
  const handleSaveAll = async () => {
    if (scannedItems.length === 0) return;
    setLoading(true);
    
    try {
      const currentDB = items; 

      if (isEditing && editItemId) {
          // --- KASUS EDIT ---
          setStatusMsg('Menganalisis perubahan...');
          const inputItem = scannedItems[0];
          const inputQty = inputItem.qty || 0; 

          const targetMergeItem = currentDB.find(d => 
              normalizeName(d.nama_barang) === normalizeName(inputItem.nama_barang) && 
              d.id !== editItemId 
          );

          if (targetMergeItem) {
              setLoading(false); // Stop loading dulu biar popup muncul
              showConfirm(
                  'warning',
                  'Duplikat Terdeteksi',
                  `Barang "${targetMergeItem.nama_barang}" sudah ada.\nGabungkan stok barang ini ke sana?`,
                  async () => {
                      setLoading(true);
                      setStatusMsg('Menggabungkan...');
                      // Logika Merge
                      const newTotalStock = targetMergeItem.stok + inputQty;
                      let finalSupplier = targetMergeItem.supplier || "";
                      const inputSupplier = inputItem.supplier || "Umum";
                      if (inputSupplier !== "Umum" && !finalSupplier.toLowerCase().includes(inputSupplier.toLowerCase())) {
                          finalSupplier = finalSupplier ? `${finalSupplier}, ${inputSupplier}` : inputSupplier;
                      }

                      await supabase.from('Inventory').update({
                          stok: newTotalStock,
                          harga_beli: inputItem.harga_beli, 
                          harga_jual: inputItem.harga_jual,
                          supplier: finalSupplier
                      }).eq('id', targetMergeItem.id);

                      await supabase.from('StockLogs').update({
                          item_id: targetMergeItem.id, 
                          item_name: targetMergeItem.nama_barang
                      }).eq('item_id', editItemId);

                      await supabase.from('Inventory').delete().eq('id', editItemId);
                      
                      setLoading(false);
                      showAlert('success', 'Sukses', `Stok digabungkan! Total sekarang: ${newTotalStock}`);
                      cancelEdit();
                      fetchData();
                  },
                  () => {
                      setLoading(false); // Batal simpan
                  }
              );
              return; // Keluar function

          } else {
              // UPDATE BIASA
              setStatusMsg('Mengupdate data...');
              await supabase.from('Inventory').update({
                  nama_barang: inputItem.nama_barang,
                  kategori: inputItem.kategori,
                  stok: inputQty, 
                  harga_beli: inputItem.harga_beli,
                  harga_jual: inputItem.harga_jual,
                  supplier: inputItem.supplier
              }).eq('id', editItemId);

              await supabase.from('StockLogs').update({ item_name: inputItem.nama_barang }).eq('item_id', editItemId);
              
              showAlert('success', 'Berhasil', 'Data barang berhasil diperbarui!');
          }
          cancelEdit(); 

      } else {
          // --- KASUS INSERT BARU / SCAN ---
          setStatusMsg('Memproses penyimpanan...');
          let savedCount = 0;
          let mergedCount = 0;

          for (const item of scannedItems) {
            if (!item.nama_barang) continue;
            
            const inputQty = item.qty || 0;
            const inputSupplier = item.supplier || "Umum";
            
            const existingItem = currentDB.find((d: any) => 
                normalizeName(d.nama_barang) === normalizeName(item.nama_barang)
            );

            let finalItemId;

            if (existingItem) {
                // MERGE
                const newStock = existingItem.stok + inputQty;
                let finalSupplier = existingItem.supplier || "";
                if (inputSupplier !== "Umum" && !finalSupplier.toLowerCase().includes(inputSupplier.toLowerCase())) {
                    finalSupplier = finalSupplier ? `${finalSupplier}, ${inputSupplier}` : inputSupplier;
                }
                await supabase.from('Inventory').update({
                    stok: newStock,
                    harga_beli: item.harga_beli, 
                    harga_jual: item.harga_jual, 
                    supplier: finalSupplier 
                }).eq('id', existingItem.id);
                finalItemId = existingItem.id;
                mergedCount++;
            } else {
                // INSERT
                const itemData = {
                    nama_barang: item.nama_barang, 
                    kategori: item.kategori, 
                    stok: inputQty,
                    harga_beli: item.harga_beli, 
                    harga_jual: item.harga_jual, 
                    supplier: inputSupplier
                };
                const { data: newItem, error } = await supabase.from('Inventory').insert([ itemData ]).select().single();
                if (error) throw error;
                if (newItem) {
                    finalItemId = newItem.id;
                    savedCount++;
                }
            }

            if (finalItemId) {
                await supabase.from('StockLogs').insert([{
                    item_id: finalItemId, 
                    item_name: item.nama_barang, 
                    type: 'in', 
                    qty: inputQty, 
                    total_price: inputQty * item.harga_beli, 
                    description: existingItem ? `Restock: ${inputSupplier}` : `Barang Baru: ${inputSupplier}`
                }]);
            }
          }
          showAlert('success', 'Selesai!', `${savedCount} item baru ditambahkan, ${mergedCount} item digabungkan.`);
          setScannedItems([]);
      }
      
      fetchData(); 
    } catch (err) { 
        console.error(err); 
        showAlert('error', 'Gagal', 'Terjadi kesalahan saat menyimpan data.');
    } finally { 
        setLoading(false); 
        setStatusMsg('');
    }
  };

  // --- CRUD UTILS ---
  const handleEditClick = (item: any) => {
      setScannedItems([{
          nama_barang: item.nama_barang,
          kategori: item.kategori,
          qty: item.stok, 
          harga_beli: item.harga_beli,
          harga_jual: item.harga_jual,
          supplier: item.supplier
      }]);
      setIsEditing(true);
      setEditItemId(item.id);
  };

  const cancelEdit = () => {
      setIsEditing(false);
      setEditItemId(null);
      setScannedItems([]);
  };

  const handleDelete = async (id: string) => {
    showConfirm('error', 'Hapus Barang?', 'Barang akan dihapus permanen beserta riwayatnya. Lanjutkan?', async () => {
        await supabase.from('StockLogs').delete().eq('item_id', id); 
        await supabase.from('Inventory').delete().eq('id', id);
        fetchData();
    }, () => {});
  };

  if (authLoading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-slate-500"><Loader2 className="animate-spin mr-2"/> Cek Akses...</div>;

  return (
    <div className="h-screen bg-gray-50 text-slate-800 p-4 font-mono flex flex-col overflow-hidden relative">
      
      {/* COMPONENT ALERT / MODAL CUSTOM */}
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

      {/* HEADER */}
      <div className="shrink-0 mb-4 flex justify-between items-end">
        <PageHeader 
            title="Manajemen Gudang" 
            subtitle="Input via Foto Nota atau Manual" 
            icon={Package} 
        />
        <button onClick={() => setShowSupplierModal(true)} className="bg-white border border-slate-200 text-slate-600 px-3 py-2 rounded-lg text-xs font-bold hover:bg-slate-50 flex items-center gap-2 shadow-sm transition">
            <Truck size={14}/> Kelola Supplier
        </button>
      </div>
      
      {/* CONTENT */}
      <div className="flex-1 grid lg:grid-cols-12 gap-6 overflow-hidden pb-2">
        
        {/* KOLOM KIRI: FORM (4/12) */}
        <div className="lg:col-span-4 flex flex-col gap-4 h-full overflow-hidden">
          
          {/* TOMBOL SCAN & MANUAL */}
          {!isEditing && (
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden shrink-0">
                 {analyzing && <div className="absolute inset-0 bg-white/90 z-10 flex flex-col items-center justify-center text-emerald-600 animate-pulse"><Loader2 className="animate-spin mb-2" size={32}/><p className="text-xs font-bold">AI sedang membaca nota...</p></div>}
                 
                 <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                    <ScanLine size={18} className="text-emerald-600"/> Input Barang Baru
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
          )}

          {/* FORM DRAFT */}
          <div className={`flex-1 bg-white rounded-xl border flex flex-col relative overflow-hidden shadow-sm transition-all ${isEditing ? 'border-amber-300 ring-2 ring-amber-100' : 'border-slate-200'}`}>
             <div className={`p-3 border-b flex justify-between items-center shrink-0 ${isEditing ? 'bg-amber-50 border-amber-100' : 'bg-slate-50 border-slate-100'}`}>
                <h3 className={`text-xs font-bold ${isEditing ? 'text-amber-700' : 'text-slate-700'}`}>
                    {isEditing ? '✏️ EDIT DATA BARANG' : `Draft Input (${scannedItems.length})`}
                </h3>
                {isEditing ? (
                    <button onClick={cancelEdit} className="text-[10px] bg-white border border-amber-200 text-amber-600 px-2 py-1 rounded hover:bg-amber-100">Batal Edit</button>
                ) : (
                    scannedItems.length > 0 && <button onClick={() => setScannedItems([])} className="text-[10px] text-red-500 hover:underline">Reset</button>
                )}
             </div>
             
             {scannedItems.length > 0 ? (
                 <>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3">
                        {scannedItems.map((item, idx) => (
                            <div key={idx} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm relative group hover:border-emerald-200 transition">
                                {!isEditing && <button onClick={() => removeDraftItem(idx)} className="absolute -top-2 -right-2 bg-white text-slate-400 hover:text-red-500 border border-slate-200 rounded-full p-1 shadow-md z-10"><X size={12}/></button>}

                                <div className="space-y-2">
                                    <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-800 font-bold outline-none" value={item.nama_barang} onChange={e => handleDraftChange(idx, 'nama_barang', e.target.value)} placeholder="Nama Barang..."/>
                                    
                                    <div className="grid grid-cols-2 gap-2">
                                        <input type="text" placeholder="Kategori" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[10px]" value={item.kategori} onChange={e => handleDraftChange(idx, 'kategori', e.target.value)} />
                                        
                                        {/* DROPDOWN SUPPLIER OTOMATIS TERPILIH */}
                                        <select 
                                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[10px] text-slate-600 outline-none cursor-pointer" 
                                            value={item.supplier} 
                                            onChange={e => handleDraftChange(idx, 'supplier', e.target.value)}
                                        >
                                            <option value="">- Pilih Supplier -</option>
                                            {suppliers.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                                            <option value="Umum">Umum / Lainnya</option>
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2 rounded border border-slate-100">
                                        <div><label className="text-[8px] text-blue-500 uppercase font-bold">Qty / Stok</label><input type="text" className="w-full bg-white border border-slate-200 rounded px-1 py-1 text-[10px] text-center font-bold" value={item.qty} onChange={e => handleDraftChange(idx, 'qty', e.target.value)} placeholder="0" /></div>
                                        <div><label className="text-[8px] text-slate-400 uppercase font-bold">Beli (Rp)</label><input type="text" className="w-full bg-white border border-slate-200 rounded px-1 py-1 text-[10px]" value={item.harga_beli?.toLocaleString('id-ID')} onChange={e => handleDraftChange(idx, 'harga_beli', e.target.value)} placeholder="0" /></div>
                                        <div><label className="text-[8px] text-emerald-500 uppercase font-bold">Jual (Rp)</label><input type="text" className="w-full bg-white border border-slate-200 rounded px-1 py-1 text-[10px] font-bold" value={item.harga_jual?.toLocaleString('id-ID')} onChange={e => handleDraftChange(idx, 'harga_jual', e.target.value)} placeholder="0" /></div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="p-3 border-t border-slate-100 bg-slate-50 shrink-0">
                        <button onClick={handleSaveAll} disabled={loading} className={`w-full text-white font-bold py-2.5 rounded-lg flex justify-center items-center gap-2 shadow-sm text-xs ${isEditing ? 'bg-amber-500 hover:bg-amber-600' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
                            {loading ? <><Loader2 className="animate-spin size={14}" /> {statusMsg || 'Proses...'}</> : <><Save size={14}/> {isEditing ? 'SIMPAN PERUBAHAN' : 'SIMPAN KE GUDANG'}</>}
                        </button>
                    </div>
                 </>
             ) : (
                 <div className="h-full flex flex-col items-center justify-center text-slate-400 p-6">
                    <Sparkles className="mb-2 text-slate-300" size={32}/>
                    <p className="text-sm font-medium text-slate-500">Form Kosong</p>
                    <p className="text-xs mt-1">Scan Nota atau klik Manual.</p>
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
                                        {item.supplier && (
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
                                    <div className="flex items-center justify-center gap-1">
                                        <button onClick={() => handleEditClick(item)} className="text-slate-400 hover:text-amber-500 p-2 rounded hover:bg-amber-50 transition" title="Edit Barang"><Edit2 size={16}/></button>
                                        <button onClick={() => handleDelete(item.id)} className="text-slate-400 hover:text-red-500 p-2 rounded hover:bg-red-50 transition" title="Hapus Barang"><Trash2 size={16}/></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
             </div>
          </div>
        </div>
      </div>

      {/* MODAL SUPPLIER MANAGER (MANUAL) */}
      {showSupplierModal && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200">
                  <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <h3 className="font-bold text-slate-800">Kelola Data Supplier</h3>
                      <button onClick={() => setShowSupplierModal(false)}><X size={20} className="text-slate-400 hover:text-slate-600"/></button>
                  </div>
                  <div className="p-4">
                      <div className="flex gap-2 mb-4">
                          <input 
                            className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                            placeholder="Nama Supplier Baru..."
                            value={newSupplierName}
                            onChange={e => setNewSupplierName(e.target.value)}
                          />
                          <button onClick={handleAddSupplier} className="bg-blue-600 text-white px-4 rounded-lg hover:bg-blue-700 transition"><Plus size={18}/></button>
                      </div>
                      <div className="max-h-[300px] overflow-y-auto custom-scrollbar border rounded-lg border-slate-100">
                          {suppliers.length === 0 && <p className="text-center py-4 text-xs text-slate-400">Belum ada supplier.</p>}
                          {suppliers.map(s => (
                              <div key={s.id} className="flex justify-between items-center p-3 border-b border-slate-50 hover:bg-slate-50 last:border-0">
                                  <span className="text-sm font-bold text-slate-700">{s.name}</span>
                                  <button onClick={() => handleDeleteSupplier(s.id, s.name)} className="text-slate-300 hover:text-red-500"><Trash2 size={14}/></button>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
}