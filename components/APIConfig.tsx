import React, { useState, useEffect } from 'react';
import { Key, Save, Check } from 'lucide-react';

// AI服务类型
export enum AIService {
  Gemini = 'gemini',
  OpenAI = 'openai',
  Claude = 'claude',
  Wenxin = 'wenxin',
  Tongyi = 'tongyi',
  Doubao = 'doubao',
  Ollama = 'ollama'
}

// API配置接口
interface APIConfig {
  service: AIService;
  apiKey: string;
  endpoint?: string;
  enabled: boolean;
}

const APIConfig: React.FC = () => {
  // 状态管理
  const [configs, setConfigs] = useState<APIConfig[]>([
    {
      service: AIService.Gemini,
      apiKey: '',
      endpoint: 'https://generativelanguage.googleapis.com/v1',
      enabled: true
    },
    {
      service: AIService.OpenAI,
      apiKey: '',
      endpoint: 'https://api.openai.com/v1',
      enabled: true
    },
    {
      service: AIService.Claude,
      apiKey: '',
      endpoint: 'https://api.anthropic.com/v1',
      enabled: true
    },
    {
      service: AIService.Wenxin,
      apiKey: '',
      endpoint: 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop',
      enabled: true
    },
    {
      service: AIService.Tongyi,
      apiKey: '',
      endpoint: 'https://dashscope.aliyuncs.com/api/v1',
      enabled: true
    },
    {
      service: AIService.Doubao,
      apiKey: '',
      endpoint: 'https://ark.cn-beijing.volces.com/api/v3',
      enabled: true
    },
    // 本地模型
    {
      service: AIService.Ollama,
      apiKey: '',
      endpoint: 'http://localhost:11434/v1',
      enabled: true
    }
  ]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  // 当前选择的大模型
  const [selectedOnlineService, setSelectedOnlineService] = useState<AIService>(AIService.Gemini);
  const [selectedLocalService, setSelectedLocalService] = useState<AIService>(AIService.Ollama);
  // Ollama运行状态
  const [ollamaRunning, setOllamaRunning] = useState<boolean | null>(null);
  
  // 获取已配置和未配置的大模型
  const getConfiguredModels = () => {
    return configs.filter(config => config.enabled);
  };
  
  const getUnconfiguredModels = () => {
    return configs.filter(config => !config.enabled);
  };

  // 检测Ollama是否在运行
  const checkOllamaStatus = async () => {
    try {
      const ollamaConfig = configs.find(c => c.service === AIService.Ollama);
      if (ollamaConfig) {
        // 使用AbortController实现超时
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        
        const response = await fetch(`${ollamaConfig.endpoint}/models`, {
          method: 'GET',
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        setOllamaRunning(response.ok);
        // 如果Ollama在运行，自动启用它
        if (response.ok && !ollamaConfig.enabled) {
          updateConfig(configs.findIndex(c => c.service === AIService.Ollama), { enabled: true });
        }
      }
    } catch (error) {
      setOllamaRunning(false);
    }
  };

  // 从配置源加载配置
  useEffect(() => {
    const loadConfigs = async () => {
      try {
        let configsToSet = [...configs];
        
        // 检查是否在Electron环境中
        if (window.electronAPI) {
          // @ts-ignore - electronAPI is exposed in preload.js
          const savedConfigs = await window.electronAPI.readEnvFile();
          if (savedConfigs) {
            configsToSet = JSON.parse(savedConfigs);
          } else {
            // 文件不存在，创建默认配置文件
            await window.electronAPI.writeEnvFile(JSON.stringify(configsToSet));
          }
        } else {
          // 在开发模式下，使用localStorage
          const oldConfigs = localStorage.getItem('apiConfigs');
          if (oldConfigs) {
            configsToSet = JSON.parse(oldConfigs);
          } else {
            // localStorage中没有配置，保存默认配置
            localStorage.setItem('apiConfigs', JSON.stringify(configsToSet));
          }
        }
        
        // 直接使用配置文件中的enabled状态，不自动计算
        setConfigs(configsToSet);
      } catch (error) {
        console.error('Failed to load API configs:', error);
        // 尝试从localStorage加载旧配置
        const oldConfigs = localStorage.getItem('apiConfigs');
        if (oldConfigs) {
          try {
            const configsToSet = JSON.parse(oldConfigs);
            // 直接使用配置文件中的enabled状态，不自动计算
            setConfigs(configsToSet);
          } catch (parseError) {
            console.error('Failed to parse old API configs:', parseError);
          }
        }
      }
    };
    
    loadConfigs();
  }, []);

  // 检测Ollama状态
  useEffect(() => {
    checkOllamaStatus();
    // 定期检测Ollama状态
    const interval = setInterval(checkOllamaStatus, 5000);
    return () => clearInterval(interval);
  }, [configs]);

  // 保存配置到配置源
  const saveConfigs = async (serviceType: 'online' | 'local') => {
    setIsSaving(true);
    try {
      // 根据serviceType确定要验证的服务
      const currentConfig = serviceType === 'local' 
        ? configs.find(c => c.service === selectedLocalService)
        : configs.find(c => c.service === selectedOnlineService);
      
      if (currentConfig) {
        // 检查配置是否完整
        if (currentConfig.service !== AIService.Ollama && !currentConfig.apiKey) {
          alert(`请为 ${getServiceName(currentConfig.service)} 输入API密钥`);
          setIsSaving(false);
          return;
        }
        
        if (!currentConfig.endpoint) {
          alert(`请为 ${getServiceName(currentConfig.service)} 输入端点URL`);
          setIsSaving(false);
          return;
        }
      }
      
      // 直接保存当前配置状态，不自动计算enabled
      // 检查是否在Electron环境中
      if (window.electronAPI) {
        // @ts-ignore - electronAPI is exposed in preload.js
        await window.electronAPI.writeEnvFile(JSON.stringify(configs));
      } else {
        // 在开发模式下，使用localStorage
        localStorage.setItem('apiConfigs', JSON.stringify(configs));
      }
      
      // 显示保存成功提示
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to save API configs:', error);
      // 尝试保存到localStorage作为备份
      localStorage.setItem('apiConfigs', JSON.stringify(configs));
      alert('保存失败，请检查网络或权限设置');
    } finally {
      setIsSaving(false);
    }
  };

  // 更新单个配置
  const updateConfig = (index: number, updates: Partial<APIConfig>) => {
    const newConfigs = [...configs];
    newConfigs[index] = { ...newConfigs[index], ...updates };
    setConfigs(newConfigs);
  };

  // 获取服务名称
  const getServiceName = (service: AIService) => {
    switch (service) {
      case AIService.Gemini:
        return 'Gemini';
      case AIService.OpenAI:
        return 'ChatGPT';
      case AIService.Claude:
        return 'Claude';
      case AIService.Wenxin:
        return '文心一言';
      case AIService.Tongyi:
        return 'Qwen';
      case AIService.Doubao:
        return '豆包';
      case AIService.Ollama:
        return 'Ollama';
      default:
        return service;
    }
  };

  return (
    <div className="space-y-6 relative">
      {/* 保存成功提示窗 */}
      {saveSuccess && (
        <div className="fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2 z-50 animate-fade-in">
          <Check size={18} className="text-green-600" />
          <span>配置已成功保存！</span>
        </div>
      )}
      
      {/* 配置状态卡片 */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">配置状态</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-md font-medium text-green-600 mb-2">已启用的大模型</h4>
            {getConfiguredModels().length > 0 ? (
              <ul className="space-y-2">
                {getConfiguredModels().map(config => (
                  <li key={config.service} className="flex items-center text-sm text-slate-700">
                    <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                    {getServiceName(config.service)}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">暂无已启用的大模型</p>
            )}
          </div>
          <div>
            <h4 className="text-md font-medium text-amber-600 mb-2">未配置的大模型</h4>
            {getUnconfiguredModels().length > 0 ? (
              <ul className="space-y-2">
                {getUnconfiguredModels().map(config => (
                  <li key={config.service} className="flex items-center text-sm text-slate-700">
                    <div className="w-2 h-2 rounded-full bg-amber-500 mr-2"></div>
                    {getServiceName(config.service)}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">所有大模型已配置完成</p>
            )}
          </div>
        </div>
      </div>
      
      {/* 两栏布局 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 在线API配置 */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800 flex items-center mb-4">
            <Key size={18} className="mr-2 text-indigo-600" />
            在线API服务
          </h3>
          <p className="text-sm text-slate-500 mb-6">配置云端AI服务提供商</p>
          
          {/* 选择大模型 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              选择大模型
            </label>
            <select
              value={selectedOnlineService}
              onChange={(e) => setSelectedOnlineService(e.target.value as AIService)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            >
              <option value={AIService.Gemini}>{getServiceName(AIService.Gemini)}</option>
              <option value={AIService.OpenAI}>{getServiceName(AIService.OpenAI)}</option>
              <option value={AIService.Claude}>{getServiceName(AIService.Claude)}</option>
              <option value={AIService.Wenxin}>{getServiceName(AIService.Wenxin)}</option>
              <option value={AIService.Tongyi}>{getServiceName(AIService.Tongyi)}</option>
              <option value={AIService.Doubao}>{getServiceName(AIService.Doubao)}</option>
            </select>
          </div>
          
          {/* 配置表单 */}
          {(() => {
            const config = configs.find(c => c.service === selectedOnlineService);
            if (!config) return null;
            
            return (
              <div className="space-y-4">
                {/* 启用开关 */}
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-700">
                    启用服务
                  </label>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.enabled}
                      onChange={(e) => updateConfig(configs.findIndex(c => c.service === selectedOnlineService), { enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
                
                {/* API密钥输入 */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    API密钥
                  </label>
                  <input
                    type="password"
                    value={config.apiKey}
                    onChange={(e) => updateConfig(configs.findIndex(c => c.service === selectedOnlineService), { apiKey: e.target.value })}
                    placeholder={`输入 ${getServiceName(selectedOnlineService)} API密钥`}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  />
                </div>
                
                {/* 端点URL输入 */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    端点URL
                  </label>
                  <input
                    type="text"
                    value={config.endpoint}
                    onChange={(e) => updateConfig(configs.findIndex(c => c.service === selectedOnlineService), { endpoint: e.target.value })}
                    placeholder="API服务端点URL"
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  />
                </div>
                
                {/* 保存按钮 */}
                <div className="pt-2">
                  <button
                    onClick={() => saveConfigs('online')}
                    disabled={isSaving}
                    className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>保存中...</span>
                      </>
                    ) : (
                      <>
                        <Save size={16} />
                        <span>保存配置</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
        
        {/* 本地API配置 */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800 flex items-center mb-4">
            <Key size={18} className="mr-2 text-green-600" />
            本地API服务
          </h3>
          <p className="text-sm text-slate-500 mb-6">配置本地部署的AI服务</p>
          
          {/* 选择本地模型 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              选择本地模型
            </label>
            <select
              value={selectedLocalService}
              onChange={(e) => setSelectedLocalService(e.target.value as AIService)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            >
              <option value={AIService.Ollama}>{getServiceName(AIService.Ollama)}</option>
            </select>
          </div>
          
          {/* 配置表单 */}
          {(() => {
            const config = configs.find(c => c.service === selectedLocalService);
            if (!config) return null;
            
            return (
              <div className="space-y-4">
                {/* Ollama状态提示 */}
                {selectedLocalService === AIService.Ollama && (
                  <div className={`p-3 rounded-lg text-sm ${ollamaRunning ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-amber-50 border border-amber-200 text-amber-700'}`}>
                    {ollamaRunning ? (
                      <div className="flex items-center">
                        <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                        <span>已检测到Ollama服务正在运行</span>
                      </div>
                    ) : ollamaRunning === false ? (
                      <div className="flex items-center">
                        <div className="w-2 h-2 rounded-full bg-amber-500 mr-2"></div>
                        <span>未检测到Ollama服务，请先<a href="https://ollama.com/download" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline ml-1">安装Ollama</a></span>
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-500 mr-2"></div>
                        <span>正在检测Ollama服务...</span>
                      </div>
                    )}
                  </div>
                )}
                
                {/* 启用开关 */}
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-700">
                    启用服务
                  </label>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.enabled}
                      onChange={(e) => updateConfig(configs.findIndex(c => c.service === selectedLocalService), { enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
                
                {/* 端点URL输入 */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    端点URL
                  </label>
                  <input
                    type="text"
                    value={config.endpoint}
                    onChange={(e) => updateConfig(configs.findIndex(c => c.service === selectedLocalService), { endpoint: e.target.value })}
                    placeholder="Ollama服务端点URL，默认：http://localhost:11434/v1"
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  />
                </div>
                
                {/* 保存按钮 */}
                <div className="pt-2">
                  <button
                    onClick={() => saveConfigs('local')}
                    disabled={isSaving}
                    className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>保存中...</span>
                      </>
                    ) : (
                      <>
                        <Save size={16} />
                        <span>保存配置</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
      
      {/* 提示信息 */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h4 className="font-medium text-blue-800 mb-1">使用提示</h4>
        <ul className="text-sm text-blue-700 space-y-1 list-disc pl-5">
          <li>API密钥将保存在浏览器本地存储中，不会上传到服务器</li>
          <li>至少需要启用一个AI服务才能使用AI分析功能</li>
          <li>请确保输入正确的API密钥和端点URL</li>
          <li>Ollama本地模型需要您先在本地安装并启动Ollama服务</li>
          <li>如果API密钥无效，相关功能将无法正常工作</li>
        </ul>
      </div>
      

    </div>
  );
};

export default APIConfig;
