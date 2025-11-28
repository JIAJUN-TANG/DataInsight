import React, { useState, useEffect } from 'react';
import { Key, Save, Check } from 'lucide-react';

// AI服务类型
export enum AIService {
  Gemini = 'gemini',
  OpenAI = 'openai',
  Claude = 'claude'
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
      enabled: false
    },
    {
      service: AIService.Claude,
      apiKey: '',
      endpoint: 'https://api.anthropic.com/v1',
      enabled: false
    }
  ]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // 从localStorage加载配置
  useEffect(() => {
    const savedConfigs = localStorage.getItem('apiConfigs');
    if (savedConfigs) {
      try {
        setConfigs(JSON.parse(savedConfigs));
      } catch (error) {
        console.error('Failed to parse API configs:', error);
      }
    }
  }, []);

  // 保存配置到localStorage
  const saveConfigs = () => {
    setIsSaving(true);
    localStorage.setItem('apiConfigs', JSON.stringify(configs));
    
    // 显示保存成功提示
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
    }, 2000);
    
    setIsSaving(false);
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
        return 'Google Gemini';
      case AIService.OpenAI:
        return 'OpenAI';
      case AIService.Claude:
        return 'Anthropic Claude';
      default:
        return service;
    }
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex justify-between items-center">
        
        {/* 保存按钮 */}
        <button
          onClick={saveConfigs}
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
          {saveSuccess && (
            <Check size={16} className="text-green-400" />
          )}
        </button>
      </div>
      
      {/* API配置列表 */}
      <div className="space-y-4">
        {configs.map((config, index) => (
          <div key={config.service} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-700">
                  {getServiceName(config.service)}
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  {config.endpoint}
                </p>
              </div>
              <div className="flex items-center">
                <span className="text-sm text-slate-500 mr-2">启用</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.enabled}
                    onChange={(e) => updateConfig(index, { enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>
            </div>
            
            <div className="space-y-4">
              {/* API密钥输入 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  API密钥
                </label>
                <input
                  type="password"
                  value={config.apiKey}
                  onChange={(e) => updateConfig(index, { apiKey: e.target.value })}
                  placeholder={`输入 ${getServiceName(config.service)} API密钥`}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
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
                  onChange={(e) => updateConfig(index, { endpoint: e.target.value })}
                  placeholder="API服务端点URL"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* 提示信息 */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h4 className="font-medium text-blue-800 mb-1">提示</h4>
        <ul className="text-sm text-blue-700 space-y-1 list-disc pl-5">
          <li>API密钥将保存在浏览器本地存储中，不会上传到服务器</li>
          <li>至少需要启用一个AI服务才能使用AI分析功能</li>
          <li>请确保输入正确的API密钥和端点URL</li>
          <li>如果API密钥无效，相关功能将无法正常工作</li>
        </ul>
      </div>
    </div>
  );
};

export default APIConfig;
