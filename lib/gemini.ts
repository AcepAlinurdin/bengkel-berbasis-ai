import { GoogleGenerativeAI } from "@google/generative-ai";

export const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);

export const gemini = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
});
