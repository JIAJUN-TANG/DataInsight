import React, { useState, useRef, useEffect } from 'react';
import { Dataset, ChatMessage } from '../types';
import { sendAIRequest } from '../services/AIService';
import { Send, Bot, User, Sparkles, Settings } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { AIModelConfig } from './APIConfig';

interface AIChatProps {
  dataset: Dataset;
}

const AIChat: React.FC<AIChatProps> = ({ dataset }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'model',
      content: `您好！我已经读取了 **${dataset.name}** 数据集。我可以帮助您发现数据中的见解、检测模式或总结数据。您想知道什么？`,
      timestamp: Date.now()
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [configs, setConfigs] = useState<AIModelConfig[]>([]);
  const [selectedConfigId, setSelectedConfigId] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load configured services
  useEffect(() => {
    const loadConfigs = async () => {
      try {
        let savedConfigs: any = null;
        if (window.electronAPI) {
          // @ts-ignore
          savedConfigs = await window.electronAPI.readEnvFile();
        } else {
          savedConfigs = localStorage.getItem('apiConfigs');
        }

        if (savedConfigs) {
          // Regex to extract the value of API_CONFIGS
          // Captures content inside quotes or until end of line
          const match = savedConfigs.match(/API_CONFIGS\s*=\s*(?:'([^']*)'|"([^"]*)"|([^\n\r]*))/);

          let configString = '';
          if (match) {
            // match[1] is single quoted content
            // match[2] is double quoted content
            // match[3] is unquoted content
            configString = match[1] || match[2] || match[3] || '';
          } else if (savedConfigs.trim().startsWith('[')) {
            // Fallback: assume the whole string is the JSON array if not in KEY=VALUE format
            configString = savedConfigs;
          }

          if (configString) {
            configString = configString.trim(); // Ensure no leading/trailing whitespace
          }
          const parsed = JSON.parse(configString);
          // Filter enabled configs
          const enabled = Array.isArray(parsed) ? parsed.filter((c: any) => c.enabled) : [];

          // Migration/Compatibility check if simpler format
          // Assuming new format from APIConfig refactor
          setConfigs(enabled);

          if (enabled.length > 0) {
            // Default to first one or previously selected if possible
            setSelectedConfigId(enabled[0].id);
          }
        }
      } catch (error) {
        console.error('Failed to load API configs:', error);
        // 尝试从localStorage读取作为备选方案
        const oldConfigs = localStorage.getItem('apiConfigs');
        if (oldConfigs) {
          try {
            const parsed = JSON.parse(oldConfigs);
            const enabled = Array.isArray(parsed) ? parsed.filter((c: any) => c.enabled) : [];
            setConfigs(enabled);
            if (enabled.length > 0) {
              setSelectedConfigId(enabled[0].id);
            }
          } catch (localError) {
            console.error('Failed to load from localStorage as fallback:', localError);
          }
        }
      }
    };

    loadConfigs();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !selectedConfigId) return;

    const selectedConfig = configs.find(c => c.id === selectedConfigId);
    if (!selectedConfig) {
      alert("Selected service configuration not found.");
      return;
    }

    const userMsg: ChatMessage = { role: 'user', content: input, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    // Create a placeholder for the AI response
    const aiMsgPlaceholder: ChatMessage = { role: 'model', content: '', timestamp: Date.now() };
    setMessages(prev => [...prev, aiMsgPlaceholder]);

    try {
      // We pass the history excluding the placeholder
      const historyForApi = [...messages, userMsg];

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

      // Map 'model' role to 'assistant' for API compatibility
      // We pass the history excluding the placeholder


      const stream = await sendAIRequest(selectedConfig, systemInstruction, historyForApi.map(m => ({
        role: m.role === 'model' ? 'assistant' : m.role,
        content: m.content
      })));

      let fullText = '';
      for await (const chunk of stream) {
        fullText += chunk;
        setMessages(prev => {
          const newArr = [...prev];
          newArr[newArr.length - 1] = { ...newArr[newArr.length - 1], content: fullText };
          return newArr;
        });
      }
    } catch (error: any) {
      console.error("AI Error:", error);
      setMessages(prev => {
        const newArr = [...prev];
        newArr[newArr.length - 1] = { ...newArr[newArr.length - 1], content: `Error: ${error.message || 'Unknown error occurred.'}` };
        return newArr;
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div className="flex items-center text-indigo-700">
          <Sparkles size={20} className="mr-2" />
          <h3 className="font-semibold">AI 数据分析师</h3>
        </div>

        {/* Service Selector */}
        <div className="flex items-center gap-2">
          {configs.length > 0 ? (
            <div className="relative">
              <select
                value={selectedConfigId}
                onChange={(e) => setSelectedConfigId(e.target.value)}
                className="pl-3 pr-8 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm bg-white appearance-none cursor-pointer"
              >
                {configs.map(config => (
                  <option key={config.id} value={config.id}>
                    {config.name} ({config.model})
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                <Settings size={14} />
              </div>
            </div>
          ) : (
            <span className="text-sm text-amber-600 font-medium flex items-center">
              <div className="w-2 h-2 rounded-full bg-amber-500 mr-2"></div>
              无可用服务，请先配置服务。
            </span>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-1 ${msg.role === 'user' ? 'bg-indigo-100 text-indigo-600 ml-3' : 'bg-emerald-100 text-emerald-600 mr-3'
                }`}>
                {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>

              <div className={`p-4 rounded-2xl text-sm leading-relaxed ${msg.role === 'user'
                ? 'bg-indigo-600 text-white rounded-tr-none'
                : 'bg-slate-100 text-slate-800 rounded-tl-none'
                }`}>
                {msg.role === 'model' ? (
                  <ReactMarkdown
                    components={{
                      table: ({ node, ...props }) => <div className="overflow-x-auto my-2"><table className="min-w-full divide-y divide-slate-300 border border-slate-300" {...props} /></div>,
                      th: ({ node, ...props }) => <th className="px-3 py-2 bg-slate-200 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider" {...props} />,
                      td: ({ node, ...props }) => <td className="px-3 py-2 border-t border-slate-200 text-sm" {...props} />,
                      p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                      ul: ({ node, ...props }) => <ul className="list-disc ml-4 mb-2" {...props} />,
                      ol: ({ node, ...props }) => <ol className="list-decimal ml-4 mb-2" {...props} />
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                ) : (
                  msg.content
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-slate-200 bg-slate-50">
        {configs.length > 0 ? (
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="关于您的数据有什么问题吗？"
              className="flex-1 px-4 py-3 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              disabled={isLoading || !selectedConfigId}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim() || !selectedConfigId}
              className="px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              {isLoading ? <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" /> : <Send size={20} />}
            </button>
          </form>
        ) : (
          <div className="flex items-center justify-center p-6 text-center">
            <div className="max-w-md">
              <p className="text-slate-500 mb-4">无可用服务，请先配置服务。</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIChat;