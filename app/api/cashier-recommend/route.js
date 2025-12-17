import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey || "");

export async function POST(req) {
  try {
    const body = await req.json();
    const { issue, ai_analysis, inventory } = body;

    if (!issue || !inventory) {
       return NextResponse.json({ error: "Data incomplete" }, { status: 400 });
    }

    // Mapping data inventory (Tanpa tipe TypeScript)
    const simplifiedInventory = inventory.map((i) => ({
      id: i.id,
      name: i.nama_barang,
      price: i.harga_jual,
      stock: i.stok
    }));

    const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash",
        generationConfig: { 
            responseMimeType: "application/json",
            temperature: 0.1 
        } 
    });

    const prompt = `
      Bertindaklah sebagai Kepala Bengkel Ahli Sparepart.
      
      Tugasmu adalah menerjemahkan DIAGNOSA KERUSAKAN menjadi DAFTAR BARANG (Part Number) yang tersedia di gudang.

      === INPUT DATA ===
      1. Keluhan User: "${issue}"
      2. HASIL DIAGNOSA AI SEBELUMNYA (PENTING): "${ai_analysis || 'Tidak ada diagnosa'}"
      3. Stok Gudang Real-time: ${JSON.stringify(simplifiedInventory)}

      === INSTRUKSI LOGIKA ===
      1. BACA "HASIL DIAGNOSA AI SEBELUMNYA" dengan teliti. Ini adalah kunci kerusakannya.
      2. COCOKKAN diagnosa tersebut dengan "Stok Gudang". 
         - Contoh: Jika diagnosa bilang "V-Belt putus", CARI barang di stok yang namanya mengandung "V-Belt" atau "Vanbelt".
         - Contoh: Jika diagnosa bilang "Ganti Oli", CARI "Oli MPX" atau sejenisnya di stok.
      3. JANGAN HALUSINASI. Hanya pilih barang yang ID-nya ada di daftar stok.
      4. Jika stok barang tersebut 0, JANGAN dimasukkan.
      5. Tambahkan 1 item "Jasa Service" (ID: "service-fee-ai") dengan harga estimasi sesuai tingkat kesulitan diagnosa.

      === FORMAT OUTPUT (JSON) ===
      {
        "items": [
          {
            "id": "ID_DARI_STOK_GUDANG",
            "name": "NAMA_BARANG_DARI_STOK",
            "price": 10000,
            "qty": 1,
            "type": "part"
          },
          {
            "id": "service-fee-ai",
            "name": "Biaya Jasa (Estimasi)",
            "price": 35000,
            "qty": 1,
            "type": "service"
          }
        ]
      }
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    return NextResponse.json(JSON.parse(text));

  } catch (error) {
    console.error("AI Recommendation Error:", error);
    return NextResponse.json({ items: [], error: error.message }, { status: 500 });
  }
}