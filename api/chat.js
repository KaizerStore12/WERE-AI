// api/chat.js - Vercel Serverless Function
import OpenAI from "openai";

// Inisialisasi OpenAI client dengan konfigurasi DeepSeek
const openai = new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey: process.env.DEEPSEEK_API_KEY, // Diambil dari environment variables Vercel
});

export default async function handler(req, res) {
    // Hanya menerima method POST
    if (req.method !== 'POST') {
        return res.status(405).json({ 
            error: 'Method not allowed. Use POST instead.' 
        });
    }

    try {
        // Ambil messages dari request body
        const { messages } = req.body;

        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ 
                error: 'Invalid request. "messages" array is required.' 
            });
        }

        // Tambahkan system prompt jika tidak ada
        const hasSystemPrompt = messages.some(msg => msg.role === 'system');
        const finalMessages = hasSystemPrompt ? messages : [
            {
                role: 'system',
                content: 'Kamu adalah asisten AI yang ramah, membantu, dan berpengetahuan luas. Kamu bernama DeepSeek. Jawablah dengan bahasa Indonesia yang baik dan natural.'
            },
            ...messages
        ];

        // Panggil DeepSeek API
        const completion = await openai.chat.completions.create({
            messages: finalMessages,
            model: "deepseek-chat",
            temperature: 0.7,
            max_tokens: 2000,
        });

        // Kirim response
        const aiResponse = completion.choices[0].message.content;
        
        return res.status(200).json({ 
            success: true, 
            message: aiResponse,
            usage: completion.usage // Optional: info token usage
        });

    } catch (error) {
        console.error('DeepSeek API Error:', error);
        
        // Error handling yang lebih baik
        let errorMessage = 'Terjadi kesalahan pada server.';
        let statusCode = 500;

        if (error.status === 401) {
            errorMessage = 'API Key tidak valid. Periksa environment variables.';
            statusCode = 401;
        } else if (error.status === 429) {
            errorMessage = 'Terlalu banyak request. Coba lagi nanti.';
            statusCode = 429;
        } else if (error.message) {
            errorMessage = error.message;
        }

        return res.status(statusCode).json({ 
            success: false, 
            error: errorMessage 
        });
    }
}
