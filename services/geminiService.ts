import { GoogleGenAI } from "@google/genai";
import { Dataset, ChatMessage } from '../types';
import { AIService } from '../components/APIConfig';

// 加载API配置
const loadAPIConfigs = async () => {
  let savedConfigs = null;
  // 检查是否在Electron环境中
  if (typeof window !== 'undefined' && window.electronAPI) {
    // @ts-ignore - electronAPI is exposed in preload.js
    savedConfigs = await window.electronAPI.readEnvFile();
  }
  
  let configs = null;
  if (savedConfigs) {
    configs = JSON.parse(savedConfigs);
  } else {
    // 在开发模式下，使用localStorage
    const oldConfigs = localStorage.getItem('apiConfigs');
    if (oldConfigs) {
      configs = JSON.parse(oldConfigs);
    }
  }
  
  return configs;
};

export const generateDataInsights = async (
  dataset: Dataset, 
  userQuery: string,
  history: ChatMessage[],
  service: AIService = AIService.Gemini
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

    // 根据服务类型选择不同的处理逻辑
    switch (service) {
      case AIService.Gemini:
        return generateGeminiInsights(systemInstruction, userQuery, history);
      case AIService.Ollama:
        return generateOllamaInsights(systemInstruction, userQuery, history);
      // 其他服务类型的处理逻辑可以在这里添加
      default:
        throw new Error(`Unsupported AI service: ${service}`);
    }
};

// Gemini服务处理逻辑
const generateGeminiInsights = async (
  systemInstruction: string,
  userQuery: string,
  history: ChatMessage[]
): Promise<AsyncIterable<string>> => {
  // 加载API配置
  const configs = await loadAPIConfigs();
  const geminiConfig = configs?.find((c: any) => c.service === AIService.Gemini);
  const apiKey = geminiConfig?.apiKey || process.env.API_KEY || '';
  
  if (!apiKey) {
    throw new Error("Gemini API key is missing.");
  }
  
  const ai = new GoogleGenAI({ apiKey });
  
  const historyContent = history.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.content }],
  }));

  // 初始化聊天
  const chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: { systemInstruction },
      history: historyContent
  });

  const responseStream = await chat.sendMessageStream({ message: userQuery });
  
  // 返回生成器以产生文本块
  async function* streamGenerator() {
      for await (const chunk of responseStream) {
          if (chunk.text) {
              yield chunk.text;
          }
      }
  }

  return streamGenerator();
};

// Ollama服务处理逻辑
const generateOllamaInsights = async (
  systemInstruction: string,
  userQuery: string,
  history: ChatMessage[]
): Promise<AsyncIterable<string>> => {
  // 加载API配置
  const configs = await loadAPIConfigs();
  const ollamaConfig = configs?.find((c: any) => c.service === AIService.Ollama);
  const endpoint = ollamaConfig?.endpoint || 'http://localhost:11434/v1';
  
  // 构建请求体
  const messages = [
    { role: 'system', content: systemInstruction },
    ...history.map(msg => ({ role: msg.role, content: msg.content })),
    { role: 'user', content: userQuery }
  ];
  
  // 发送请求到Ollama API
  const response = await fetch(`${endpoint}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama3', // 默认使用llama3模型
      messages: messages,
      stream: true,
      format: 'markdown'
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.statusText}`);
  }
  
  // 读取响应流
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body');
  }
  
  // 返回生成器以产生文本块
  async function* streamGenerator() {
    const decoder = new TextDecoder();
    let buffer = '';
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      
      // 解析SSE格式的响应
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            return;
          }
          
          try {
            const json = JSON.parse(data);
            if (json.choices && json.choices[0] && json.choices[0].delta && json.choices[0].delta.content) {
              yield json.choices[0].delta.content;
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
      }
    }
  }
  
  return streamGenerator();
};