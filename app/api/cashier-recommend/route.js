import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey || "");

export async function POST(req) {
  try {
    const { issue, ai_analysis, inventory } = await req.json();

    // Optimasi: Kirim data inventory yang penting saja (ID, Nama, Harga, Stok)
    // agar hemat token dan cepat.
    const simplifiedInventory = inventory.map(i => ({
      id: i.id,
      name: i.nama_barang,
      price: i.harga_jual,
      stock: i.stok
    }));

    const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash",
        generationConfig: { responseMimeType: "application/json" } 
    });

    const prompt = `
      Bertindaklah sebagai Kepala Mekanik Bengkel yang cerdas.
      
      KONTEKS:
      - Keluhan Pelanggan: "${issue}"
      - Diagnosa Awal: "${ai_analysis}"
      - Stok Gudang Tersedia: ${JSON.stringify(simplifiedInventory)}

      TUGAS:
      Buatlah daftar belanja (Sparepart & Jasa) untuk memperbaiki masalah tersebut.
      
      ATURAN:
      1. Pilih sparepart HANYA dari "Stok Gudang Tersedia". Jika barang tidak ada, cari yang paling mirip fungsinya. Jangan halusinasi barang yang tidak ada di stok.
      2. Tambahkan item "Jasa Service" dengan estimasi harga yang wajar (Rp 15.000 - Rp 100.000 tergantung tingkat kesulitan).
      3. Pastikan format output JSON valid.

      OUTPUT JSON ARRAY:
      [
        {
          "id": "id_dari_inventory_atau_custom_id_untuk_jasa",
          "name": "Nama Barang / Jasa",
          "price": 50000,
          "qty": 1,
          "type": "part" (jika dari gudang) atau "service" (jika jasa),
          "original_stok": 10 (jika part) atau 999 (jika jasa)
        }
      ]
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return NextResponse.json(JSON.parse(text));

  } catch (error) {
    console.error("AI Recommendation Error:", error);
    return NextResponse.json([]); // Kembalikan array kosong jika error
  }
}