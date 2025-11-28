import { GoogleGenAI } from "@google/genai";
import { Dataset, ChatMessage } from '../types';

// Ensure API key is present
const apiKey = process.env.API_KEY || '';
if (!apiKey) {
  console.warn("API_KEY is missing from environment variables.");
}

const ai = new GoogleGenAI({ apiKey });

export const generateDataInsights = async (
  dataset: Dataset, 
  userQuery: string,
  history: ChatMessage[],
  service: string = 'gemini'
): Promise<AsyncIterable<string>> => {
    
    const columnsSummary = dataset.columns.map(c => {
        let statsStr = '';
        if (c.stats?.mean) statsStr += `, Mean: ${c.stats.mean.toFixed(2)}`;
        if (c.stats?.topValues) statsStr += `, Top Values: ${c.stats.topValues.map(t => `${t.value}(${t.count})`).join(', ')}`;
        return `- ${c.name} (${c.type})${statsStr}`;
    }).join('\n');

    const sampleRows = JSON.stringify(dataset.rows.slice(0, 5));

    const systemInstruction = `
You are an expert Data Scientist assistant inside a web application.
You are analyzing a dataset named "${dataset.name}" with ${dataset.rowCount} rows.

Here is the schema and summary statistics:
${columnsSummary}

Here are the first 5 rows of data:
${sampleRows}

Your goal is to answer the user's questions about this data, provide insights, suggest visualizations (text-based descriptions), and help them understand the trends.
Keep answers concise, professional, and formatted with Markdown. 
Use tables if comparing values.
Do not ask the user to execute code. You are providing the analysis directly.
    `;

    // Convert history to Gemini format (ignoring the current query which is passed separately if needed, but here we just append to chat)
    // Actually, creating a fresh chat with history is the standard way.
    
    // Simplification: We will just do a single generateContentStream with history context manually constructed 
    // or use the Chat API. The Chat API is better for history.
    
    const chat = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction,
        }
    });

    // Replay history (excluding the very last user message if it's passed as userQuery, but typically history contains previous turns)
    // For this implementation, we assume 'history' contains ONLY previous completed turns. 
    // The current 'userQuery' is the new message.
    
    // We need to map our ChatMessage[] to the API's Content format if we were to seed history, 
    // but the SDK's chat.sendMessage handles the stateful session if we keep the object alive.
    // Since this is a React stateless function, we can't keep the `chat` object alive easily across re-renders without a Ref.
    // However, recreating the chat and feeding history is a valid pattern for stateless services.

    const historyContent = history.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.content }],
    }));

    // Re-initialize chat with history
    const restoredChat = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: { systemInstruction },
        history: historyContent
    });

    const responseStream = await restoredChat.sendMessageStream({ message: userQuery });
    
    // We return a generator to yield text chunks
    async function* streamGenerator() {
        for await (const chunk of responseStream) {
            if (chunk.text) {
                yield chunk.text;
            }
        }
    }

    return streamGenerator();
};