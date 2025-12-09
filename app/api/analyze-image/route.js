import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

// Pastikan API Key dibaca
const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey || "");

export async function POST(req) {
  try {
    // Cek API Key dulu
    if (!apiKey) {
      console.error("API Key Missing");
      return NextResponse.json({ error: "Server API Key is missing" }, { status: 500 });
    }

    const body = await req.json();
    const { imageBase64, mimeType } = body;

    if (!imageBase64) {
      return NextResponse.json({ error: "No image data" }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `Kamu adalah asisten admin bengkel. Tugasmu adalah membaca gambar nota/faktur belanja dan mengekstrak data belanjaan sparepart.

    Instruksi:
    1. Cari nama toko/distributor di kop nota sebagai 'supplier'.
    2. Identifikasi setiap baris barang. Ambil nama barang, jumlah (qty), dan harga satuan.
    3. Jika harga yang tertera adalah harga total, bagi dengan qty untuk dapat harga satuan.
    4. Tentukan kategori otomatis: 'Oli', 'Ban', 'Busi', 'Aki', atau default 'Sparepart'.
    5. Perkirakan harga jual (margin 30% dari harga beli), bulatkan ke ribuan terdekat.
    
    Output WAJIB Format JSON murni (Array of Objects) tanpa markdown code block:
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

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: imageBase64,
          mimeType: mimeType
        }
      }
    ]);

    const response = await result.response;
    let text = response.text();
    
    // Bersihkan format markdown
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const data = JSON.parse(text);
    return NextResponse.json(data);

  } catch (error) {
    console.error("AI Error Detailed:", error); // Cek terminal VS Code untuk error lengkap
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}