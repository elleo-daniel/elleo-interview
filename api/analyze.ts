import { GoogleGenAI } from "@google/genai";



export default async function handler(req: Request) {
    if (req.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    try {
        const { prompt } = await req.json();

        if (!prompt) {
            return new Response('Prompt is required', { status: 400 });
        }

        const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
        if (!apiKey) {
            return new Response('Server configuration error: API Key missing', { status: 500 });
        }

        const ai = new GoogleGenAI({ apiKey });
        const result = await ai.models.generateContentStream({
            model: 'gemini-2.0-flash',
            contents: prompt,
        });

        const stream = new ReadableStream({
            async start(controller) {
                try {
                    for await (const chunk of result) {
                        const chunkText = chunk.text;
                        if (chunkText) {
                            controller.enqueue(new TextEncoder().encode(chunkText));
                        }
                    }
                } catch (e: any) {
                    console.error('Stream error:', e);
                    controller.error(e);
                } finally {
                    controller.close();
                }
            },
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Transfer-Encoding': 'chunked',
            },
        });

    } catch (error: any) {
        console.error('API Error:', error);
        return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
