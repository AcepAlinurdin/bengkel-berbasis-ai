import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey || "");

// --- ALGORITMA LEVENSHTEIN (MENDETEKSI TYPO) ---
// Menghitung jumlah huruf yang beda antara dua kata
const levenshtein = (a, b) => {
    const matrix = [];
    let i, j;
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    for (i = 0; i <= b.length; i++) matrix[i] = [i];
    for (j = 0; j <= a.length; j++) matrix[0][j] = j;

    for (i = 1; i <= b.length; i++) {
        for (j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // Substitusi
                    Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1) // Insert/Delete
                );
            }
        }
    }
    return matrix[b.length][a.length];
};

// --- HELPER 1: PEMBERSIH TEKS ---
const cleanItemName = (name) => {
    if (!name) return "";
    let cleaned = name.replace(/,/g, ' '); 
    cleaned = cleaned.replace(/[^a-zA-Z0-9\s\-\/\.]/g, ''); 
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    return cleaned.replace(/\w\S*/g, (txt) => {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
};

// --- HELPER 2: AUTO RETRY ---
async function generateWithRetry(model, parts, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const result = await model.generateContent(parts);
            return result;
        } catch (error) {
            if (error.message.includes('503') || error.message.includes('Overloaded') || error.message.includes('500')) {
                console.warn(`⚠️ Model overloaded (Percobaan ${i + 1}/${maxRetries})...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
            } else {
                throw error;
            }
        }
    }
    throw new Error("Server Google sibuk (503). Silakan coba lagi nanti.");
}

export async function POST(req) {
  try {
    if (!apiKey) return NextResponse.json({ error: "Server API Key is missing" }, { status: 500 });

    const body = await req.json();
    const { imageBase64, mimeType } = body;

    if (!imageBase64) return NextResponse.json({ error: "No image data" }, { status: 400 });

    const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash-lite",
        generationConfig: { temperature: 0.0, topP: 1, maxOutputTokens: 2000 }
    });

    const prompt = `Kamu adalah asisten admin gudang bengkel. Tugasmu adalah membaca gambar nota/faktur belanja dan mengekstrak data BELANJA BARANG FISIK (Sparepart) saja.

    Instruksi:
    1. Cari nama toko/distributor di kop nota sebagai 'supplier'.
    2. Identifikasi setiap baris barang. Ambil nama barang, jumlah (qty), dan harga satuan.
    3. Jika harga yang tertera adalah harga total, bagi dengan qty untuk dapat harga satuan.
    4. Tentukan kategori otomatis default 'Sparepart'.
    5. Perkirakan harga jual (margin keuntungan Rp 5.000 - Rp 10.000), bulatkan ke ribuan terdekat.
    6. HAPUS kode internal toko yang membingungkan dari nama barang.
    
    Output WAJIB Format JSON murni (Array of Objects):
    {
      "items": [
        {
          "nama_barang": "Nama Item",
          "kategori": "Sparepart",
          "qty": 2,
          "harga_beli": 50000,
          "harga_jual": 65000,
          "supplier": "Nama Toko"
        }
      ]
    }`;

    const result = await generateWithRetry(model, [
      prompt,
      { inlineData: { data: imageBase64, mimeType: mimeType } }
    ]);

    const response = await result.response;
    let text = response.text();
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    let data = JSON.parse(text);

    // ============================================================
    // 🛡️ FILTER "SATPAM" CERDAS (FUZZY LOGIC)
    // ============================================================
    if (data.items && Array.isArray(data.items)) {
        
        // Daftar kata terlarang (Jasa)
        const forbiddenWords = [
            'jasa', 'ongkos', 'biaya', 'service', 'servis', 
            'pasang', 'install', 'repair', 'cek', 'tune', 'bongkar', 'labor','ganti'
        ];
        
        data.items = data.items.filter(item => {
            const nameWords = item.nama_barang.toLowerCase().split(' ');
            
            // Cek setiap kata di nama barang
            const isService = nameWords.some(wordInName => {
                // Bandingkan dengan setiap kata terlarang
                return forbiddenWords.some(badWord => {
                    // 1. Cek Sama Persis
                    if (wordInName === badWord) return true;
                    
                    // 2. Cek Typo (Levenshtein Distance)
                    // Jika panjang kata > 3 huruf, toleransi typo 1 huruf
                    // Contoh: "Jaso" (jarak 1 dari Jasa) -> TRUE
                    if (badWord.length > 3 && levenshtein(wordInName, badWord) <= 1) return true;
                    
                    return false;
                });
            });
            
            if (isService) console.log(`🗑️ Menghapus Item Jasa (Typo Detected): ${item.nama_barang}`);
            
            return !isService; // Kembalikan true jika BUKAN service
        });

        // Normalisasi
        data.items = data.items.map(item => {
            return {
                ...item,
                nama_barang: cleanItemName(item.nama_barang),
                supplier: cleanItemName(item.supplier),
                qty: parseInt(item.qty) || 0,
                harga_beli: parseInt(item.harga_beli) || 0,
                harga_jual: parseInt(item.harga_jual) || 0
            };
        });
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error("AI Error Detailed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}