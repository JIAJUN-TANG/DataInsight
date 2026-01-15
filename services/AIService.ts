import { AIModelConfig } from '../components/APIConfig';

// Generic interface for chat messages in request
export interface ChatMessageRequest {
  role: string;
  content: string;
}

/**
 * Generic function to send a request to an AI provider.
 * Supports streaming response suitable for chat interfaces.
 * 
 * @param config AI Model configuration (provider, apiKey, model, etc.)
 * @param systemInstruction System prompt content
 * @param messages List of messages for the conversation
 * @returns AsyncIterable<string> stream of text chunks
 */
export const sendAIRequest = async (
  config: AIModelConfig,
  systemInstruction: string,
  messages: ChatMessageRequest[]
): Promise<AsyncIterable<string>> => {

  return sendOpenAICompatibleRequest(config, systemInstruction, messages);
};

const sendOpenAICompatibleRequest = async (
  config: AIModelConfig,
  systemInstruction: string,
  messages: ChatMessageRequest[]
): Promise<AsyncIterable<string>> => {
  const endpoint = config.endpoint;
  const modelName = config.model;
  const apiKey = config.apiKey;

  // Prepare full message list including system prompt as first message
  const apiMessages = [
    { role: 'system', content: systemInstruction },
    ...messages
  ];

  const cleanEndpoint = endpoint.replace(/\/$/, '');
  let url = cleanEndpoint;
  if (!cleanEndpoint.endsWith('/chat/completions')) {
    url = `${cleanEndpoint}/chat/completions`;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {})
    },
    body: JSON.stringify({
      model: modelName,
      messages: apiMessages,
      stream: true,
    }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body');
  }

  async function* streamGenerator() {
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        if (trimmed.startsWith('data: ')) {
          const data = trimmed.slice(6);
          if (data === '[DONE]') return;

          try {
            const json = JSON.parse(data);
            if (json.choices && json.choices[0] && json.choices[0].delta && json.choices[0].delta.content) {
              yield json.choices[0].delta.content;
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
    }
  }

  return streamGenerator();
};