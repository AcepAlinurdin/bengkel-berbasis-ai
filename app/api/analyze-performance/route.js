import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req) {
  try {
    const { data } = await req.json(); // Data format: [{name: "Budi", jobs: ["Ganti Oli", "Turun Mesin"]}]

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

    const prompt = `
      Saya adalah pemilik bengkel. Berikut adalah laporan pekerjaan mekanik saya hari ini:
      ${JSON.stringify(data)}

      Tugasmu:
      1. Analisis bobot pekerjaan berdasarkan deskripsi pekerjaan (jobs). Pekerjaan berat (turun mesin, kelistrikan) bernilai lebih tinggi dari pekerjaan ringan (ganti oli, tambah angin).
      2. Berikan skor kinerja (0-100).
      3. Berikan julukan unik (Title) berdasarkan gaya kerjanya (Contoh: "Si Kilat", "Spesialis Mesin", "Santai Tapi Pasti").
      4. Berikan saran singkat untuk peningkatan.

      Output WAJIB JSON Array murni tanpa markdown:
      [
        {
          "name": "Nama Mekanik",
          "score": 85,
          "title": "Si Raja Berat",
          "summary": "Mengerjakan sedikit motor tapi kerusakannya berat semua.",
          "suggestion": "Pertahankan kualitas."
        }
      ]
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
    
    return NextResponse.json(JSON.parse(text));

  } catch (error) {
    console.error("AI Error:", error);
    return NextResponse.json({ error: "Gagal analisis" }, { status: 500 });
  }
}