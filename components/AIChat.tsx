import React, { useState, useRef, useEffect } from 'react';
import { Dataset, ChatMessage } from '../types';
import { generateDataInsights } from '../services/geminiService';
import { Send, Bot, User, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { AIService } from './APIConfig';

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
  const [selectedService, setSelectedService] = useState<AIService>(AIService.Gemini);
  const [enabledServices, setEnabledServices] = useState<AIService[]>([AIService.Gemini]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 获取已启用的AI服务
  useEffect(() => {
    const loadEnabledServices = async () => {
      try {
        let savedConfigs = null;
        // 检查是否在Electron环境中
        if (window.electronAPI) {
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
        
        if (configs) {
          // 只包含已配置（enabled为true）的服务
          const enabled = configs
            .filter((config: any) => config.enabled && (config.service === AIService.Ollama || config.apiKey))
            .map((config: any) => config.service);
          setEnabledServices(enabled);
          // 如果当前选择的服务未启用，切换到第一个启用的服务
          if (enabled.length > 0 && !enabled.includes(selectedService)) {
            setSelectedService(enabled[0]);
          } else if (enabled.length === 0) {
            // 如果没有启用的服务，清空选择
            setSelectedService('' as AIService);
          }
        } else {
          setEnabledServices([]);
          setSelectedService('' as AIService);
        }
      } catch (error) {
        console.error('Failed to load API configs:', error);
        setEnabledServices([]);
        setSelectedService('' as AIService);
      }
    };
    
    loadEnabledServices();
  }, [selectedService]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !selectedService) return;

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
        const stream = await generateDataInsights(dataset, userMsg.content, historyForApi, selectedService);
        
        let fullText = '';
        for await (const chunk of stream) {
            fullText += chunk;
            setMessages(prev => {
                const newArr = [...prev];
                newArr[newArr.length - 1] = { ...newArr[newArr.length - 1], content: fullText };
                return newArr;
            });
        }
    } catch (error) {
        console.error("AI Error:", error);
        setMessages(prev => {
            const newArr = [...prev];
            newArr[newArr.length - 1] = { ...newArr[newArr.length - 1], content: "Sorry, I encountered an error while analyzing the data. Please check your API key." };
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
        
        {/* AI服务选择 */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-700">选择服务：</label>
          {enabledServices.length > 0 ? (
            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value as AIService)}
              className="px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
            >
              {enabledServices.map(service => (
                <option key={service} value={service}>
                  {service === AIService.Gemini && 'Gemini'}
                  {service === AIService.OpenAI && 'ChatGPT'}
                  {service === AIService.Claude && 'Claude'}
                  {service === AIService.Wenxin && '文心一言'}
                  {service === AIService.Tongyi && 'Qwen'}
                  {service === AIService.Doubao && '豆包'}
                  {service === AIService.Ollama && 'Ollama'}
                </option>
              ))}
            </select>
          ) : (
            <span className="text-sm text-amber-600 font-medium">未配置</span>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-1 ${
                  msg.role === 'user' ? 'bg-indigo-100 text-indigo-600 ml-3' : 'bg-emerald-100 text-emerald-600 mr-3'
              }`}>
                {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>
              
              <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user' 
                  ? 'bg-indigo-600 text-white rounded-tr-none' 
                  : 'bg-slate-100 text-slate-800 rounded-tl-none'
              }`}>
                {msg.role === 'model' ? (
                     <ReactMarkdown 
                        components={{
                            table: ({node, ...props}) => <div className="overflow-x-auto my-2"><table className="min-w-full divide-y divide-slate-300 border border-slate-300" {...props} /></div>,
                            th: ({node, ...props}) => <th className="px-3 py-2 bg-slate-200 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider" {...props} />,
                            td: ({node, ...props}) => <td className="px-3 py-2 border-t border-slate-200 text-sm" {...props} />,
                            p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                            ul: ({node, ...props}) => <ul className="list-disc ml-4 mb-2" {...props} />,
                            ol: ({node, ...props}) => <ol className="list-decimal ml-4 mb-2" {...props} />
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
        {enabledServices.length > 0 ? (
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="请输入您的问题..."
              className="flex-1 px-4 py-3 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              disabled={isLoading || !selectedService}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim() || !selectedService}
              className="px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              {isLoading ? <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" /> : <Send size={20} />}
            </button>
          </form>
        ) : (
          <div className="flex items-center justify-center p-6 text-center">
            <div className="max-w-md">
              <p className="text-slate-500 mb-4">您还没有配置任何AI服务，请先在配置页面设置API密钥。</p>
              <p className="text-sm text-slate-400">配置完成后，您将可以使用AI数据分析师功能。</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIChat;