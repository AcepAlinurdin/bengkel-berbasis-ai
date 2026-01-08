import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey || "");

export async function POST(req) {
  try {
    const { scannedItems, dbItems } = await req.json();

    // Optimasi: Kirim hanya nama dan ID untuk menghemat token
    const dbNames = dbItems.map(i => ({ id: i.id, name: i.nama_barang }));
    const scannedNames = scannedItems.map(i => i.nama_barang);

    // GUNAKAN MODEL GEMINI 1.5 FLASH (Lebih cepat & patuh instruksi JSON)
    // Tambahkan generationConfig untuk memaksa response JSON
    const model = genAI.getGenerativeModel({ 
        model: "gemini-3-flash-preview",
        generationConfig: { responseMimeType: "application/json" } 
    });

    const prompt = `
      You are a strict inventory matching system.
      
      I have 2 lists:
      LIST A (New Scanned Items): ${JSON.stringify(scannedNames)}
      LIST B (Database Inventory): ${JSON.stringify(dbNames)}

      Task: Match items from LIST A to LIST B.
      
      Rules:
      1. Ignore minor differences (case, spaces, symbols). Example: "Oli MPX2" == "Oli MPX-2".
      2. If item matches, return the ID from LIST B.
      3. If item is NEW, return null.

      RETURN ONLY A JSON ARRAY. NO MARKDOWN. NO CONVERSATION.
      Example Output:
      [
        { "matchId": "123-abc", "reason": "Exact match" },
        { "matchId": null, "reason": "New item" }
      ]
    `;

    const result = await model.generateContent(prompt);
    let text = result.response.text();

    // --- PEMBERSIHAN EKSTRA (Anti Error "Tentu...") ---
    // 1. Hapus markdown code block (```json ... ```)
    text = text.replace(/```json/g, '').replace(/```/g, '');
    
    // 2. Ambil hanya bagian Array [...]
    // Ini membuang teks intro seperti "Tentu, ini hasilnya:"
    const firstBracket = text.indexOf('[');
    const lastBracket = text.lastIndexOf(']');
    
    if (firstBracket !== -1 && lastBracket !== -1) {
        text = text.substring(firstBracket, lastBracket + 1);
    } else {
        throw new Error("AI tidak mengembalikan Array JSON");
    }
    // --------------------------------------------------

    return NextResponse.json(JSON.parse(text));

  } catch (error) {
    console.error("AI Match Error:", error);
    // Jika AI error, kembalikan array kosong agar aplikasi tidak crash
    // Sistem akan menganggap semua barang adalah BARU (fallback)
    return NextResponse.json([]); 
  }
}