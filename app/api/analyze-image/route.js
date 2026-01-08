import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey || "");

// --- 1. ALGORITMA LEVENSHTEIN ---
const levenshtein = (a, b) => {
    if (!a || !b) return 999;
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
                    matrix[i - 1][j - 1] + 1,
                    Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
                );
            }
        }
    }
    return matrix[b.length][a.length];
};

// --- 2. HELPER: PEMBERSIH JSON (UPDATE LEBIH KUAT) ---
const cleanJsonString = (text) => {
    if (!text) return "{}";
    
    // Hapus markdown ```json ... ```
    let clean = text.replace(/```json/g, "").replace(/```/g, "");
    
    // Cari object JSON pertama menggunakan Regex (Mencari kurung kurawal terluar)
    // Regex ini mencocokkan { ... } termasuk multiline
    const jsonMatch = clean.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
        return jsonMatch[0];
    }
    
    // Fallback jika regex gagal
    const firstOpen = clean.indexOf('{');
    const lastClose = clean.lastIndexOf('}');
    if (firstOpen !== -1 && lastClose !== -1) {
        return clean.substring(firstOpen, lastClose + 1);
    }
    
    return "{}"; // Return object kosong jika gagal total
};

// --- 3. HELPER: PEMBERSIH NAMA BARANG ---
const cleanItemName = (name) => {
    if (!name) return "";
    let cleaned = name.replace(/,/g, ' '); 
    cleaned = cleaned.replace(/[^a-zA-Z0-9\s\-\/\.]/g, ''); 
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    return cleaned.replace(/\w\S*/g, (txt) => {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
};

export async function POST(req) {
  try {
    if (!apiKey) return NextResponse.json({ error: "Server API Key is missing" }, { status: 500 });

    const body = await req.json();
    const { imageBase64, mimeType } = body;

    if (!imageBase64) return NextResponse.json({ error: "No image data" }, { status: 400 });

    // Gunakan Model Stabil 1.5 Flash
    const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash-lite",
        generationConfig: { 
            responseMimeType: "application/json",
            temperature: 0.1,
            maxOutputTokens: 2000 
        }
    });

    const prompt = `
    Kamu adalah sistem OCR cerdas khusus bengkel motor.
    Tugas: Ekstrak daftar BARANG/SPAREPART dari gambar nota ini.
    
    ATURAN FILTERING:
    1. HANYA ambil barang fisik.
    2. JANGAN ambil Jasa/Service.
    3. Output JSON murni.

    Output JSON Format:
    {
      "items": [
        {
          "nama_barang": "Nama Barang",
          "kategori": "Sparepart",
          "qty": 1,
          "harga_beli": 10000,
          "harga_jual": 13000,
          "supplier": "Nama Toko"
        }
      ]
    }
    `;

    const result = await model.generateContent([
        prompt,
        { inlineData: { data: imageBase64, mimeType: mimeType } }
    ]);

    const response = result.response;
    const rawText = response.text();
    
    // --- DEBUGGING: LIHAT HASIL AI DI TERMINAL VS CODE ---
    console.log("--- RAW AI OUTPUT START ---");
    console.log(rawText);
    console.log("--- RAW AI OUTPUT END ---");

    const cleanedText = cleanJsonString(rawText);
    
    let data;
    try {
        data = JSON.parse(cleanedText);
    } catch (parseError) {
        console.error("JSON Parse Error. Cleaned text was:", cleanedText);
        // Jika gagal parsing, return error spesifik biar tau kenapa
        throw new Error("Gagal membaca struktur data nota (Invalid JSON). Coba foto ulang nota dengan lebih jelas.");
    }

    // --- FILTERISASI DATA ---
    if (data.items && Array.isArray(data.items)) {
        const forbiddenWords = [
            'jasa', 'ongkos', 'biaya', 'service', 'servis', 
            'pasang', 'install', 'repair', 'cek', 'tune', 'bongkar', 'labor', 'ganti'
        ];
        
        data.items = data.items.filter((item) => {
            if (!item.nama_barang) return false;
            
            const itemNameStr = String(item.nama_barang).toLowerCase();
            const nameWords = itemNameStr.split(' ');
            
            const isService = nameWords.some((wordInName) => {
                return forbiddenWords.some(badWord => {
                    if (wordInName === badWord) return true;
                    if (wordInName.length > 3 && badWord.length > 3) {
                        if (levenshtein(wordInName, badWord) <= 1) return true;
                    }
                    return false;
                });
            });
            
            return !isService; 
        });

        // Normalisasi Data
        data.items = data.items.map((item) => {
            const defaultSupplier = data.items[0]?.supplier || "";
            const rawName = typeof item.nama_barang === 'string' ? item.nama_barang : '';
            const rawSupplier = typeof item.supplier === 'string' ? item.supplier : '';

            return {
                ...item,
                nama_barang: cleanItemName(rawName),
                supplier: cleanItemName(rawSupplier || (typeof defaultSupplier === 'string' ? defaultSupplier : '')),
                qty: parseInt(String(item.qty)) || 1,
                harga_beli: parseInt(String(item.harga_beli)) || 0,
                harga_jual: parseInt(String(item.harga_jual)) || 0,
                kategori: item.kategori || "Sparepart" 
            };
        });
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error("AI Scan Error:", error);
    if (error.message?.includes('429')) {
        return NextResponse.json({ error: "Server AI Sibuk (Limit). Coba 10 detik lagi." }, { status: 429 });
    }
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}