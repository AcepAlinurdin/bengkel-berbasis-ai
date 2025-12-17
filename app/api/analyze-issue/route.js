import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey || "");

export async function POST(req) {
  try {
    if (!apiKey) {
      return NextResponse.json({ error: "API Key missing" }, { status: 500 });
    }

    const { issue } = await req.json();

    if (!issue) {
      return NextResponse.json({ error: "Keluhan kosong" }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

    // Prompt yang ketat agar hanya menerima masalah motor
    const prompt = `Kamu adalah kepala mekanik bengkel motor. Analisis keluhan pelanggan ini: "${issue}".
    
    Tugasmu:
    1. Tentukan apakah ini masalah yang berkaitan dengan SEPEDA MOTOR (Service, Ganti Oli, Sparepart, Mesin, Ban, dll).
    2. Jika user mengeluhkan soal mobil, kesehatan, curhat, makanan, atau hal tidak relevan lain, tolak.
    3. Jika valid, berikan ringkasan teknis singkat (max 5 kata) dan estimasi waktu pengerjaan dalam menit.

    Output WAJIB JSON murni:
    {
      "valid": boolean, (true jika motor, false jika bukan),
      "analysis": "string", (Contoh: "Ganti Oli & Tune Up" atau "Keluhan tidak relevan"),
      "estimated_mins": number, (Contoh: 30),
      "reason": "string" (Alasan penolakan jika valid=false, misal: "Ini bengkel motor, bukan dokter")
    }`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();

    // Bersihkan markdown json jika ada
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();

    const data = JSON.parse(text);
    return NextResponse.json(data);

  } catch (error) {
    console.error("AI Analysis Error:", error);
    // Fallback jika AI error: Tetap terima tapi tandai manual check
    return NextResponse.json({ 
        valid: true, 
        analysis: "Perlu Cek Mekanik", 
        estimated_mins: 15 
    });
  }
}