import React, { useState, useEffect } from 'react';
import { Key, Save, Check, Plus, Trash2, Server } from 'lucide-react';



export interface AIModelConfig {
  id: string;
  name: string;
  model: string;
  apiKey: string;
  endpoint: string;
  enabled: boolean;
}

const generateId = () => Math.random().toString(36).substr(2, 9);



const APIConfig: React.FC = () => {
  // 状态管理
  const [configs, setConfigs] = useState<AIModelConfig[]>([]);
  const [savedConfigs, setSavedConfigs] = useState<AIModelConfig[]>([]); // For reference
  const [activeConfigId, setActiveConfigId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // 初始化加载
  useEffect(() => {
    loadConfigs();
  }, []);



  const loadConfigs = async () => {
    try {
      let loaded: AIModelConfig[] = [];

      try {
        const res = await fetch('http://127.0.0.1:4321/api/config');
        if (res.ok) {
          loaded = await res.json();
        } else {
          console.warn('Failed to load configs from Python backend');
        }
      } catch (e) {
        console.error('Error fetching configs from backend:', e);
        const rawData = localStorage.getItem('apiConfigs');
        if (rawData) {
          loaded = JSON.parse(rawData);
        }
      }

      if (Array.isArray(loaded) && loaded.length > 0 && !(loaded[0] as any).id) {
        loaded = loaded.map((old: any) => ({
          id: generateId(),
          name: (old.service || 'Service').toUpperCase(),
          model: old.model || '',
          apiKey: old.apiKey || '',
          endpoint: old.endpoint || '',
          enabled: old.enabled || false
        }));

        try {
          fetch('http://127.0.0.1:4321/api/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(loaded)
          }).then(res => {
            if (res.ok) console.log('Migrated old configs to new format with IDs');
          });
        } catch (e) {
          console.warn('Failed to auto-save migrated configs', e);
        }
      }

      setConfigs(loaded);
      setSavedConfigs(JSON.parse(JSON.stringify(loaded)));
      if (loaded.length > 0) {
        setActiveConfigId(loaded[0].id);
      }
    } catch (e) {
      console.error("Failed to load configs", e);
      setConfigs([]);
    }
  };



  const handleAddConfig = () => {
    const newConfig: AIModelConfig = {
      id: generateId(),
      name: '新服务',
      model: '',
      apiKey: '',
      endpoint: '',
      enabled: true
    };
    const newConfigs = [...configs, newConfig];
    setConfigs(newConfigs);
    setActiveConfigId(newConfig.id);
  };

  const handleDeleteConfig = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('您确定要删除这条配置吗？')) {
      try {
        const res = await fetch(`http://127.0.0.1:4321/api/config/${id}`, {
          method: 'DELETE'
        });

        if (res.ok) {
          const newConfigs = configs.filter(c => c.id !== id);
          setConfigs(newConfigs);
          // Also update savedConfigs since backend is already updated
          setSavedConfigs(JSON.parse(JSON.stringify(newConfigs)));
          if (activeConfigId === id) {
            setActiveConfigId(newConfigs.length > 0 ? newConfigs[0].id : null);
          }
        } else {
          console.error("Failed to delete config from backend");
          alert("Failed to delete configuration");
        }
      } catch (err) {
        console.error("Error deleting config:", err);
        alert("Error deleting configuration");
      }
    }
  };

  const updateActiveConfig = (updates: Partial<AIModelConfig>) => {
    if (!activeConfigId) return;
    setConfigs(configs.map(c => {
      if (c.id === activeConfigId) {
        return { ...c, ...updates };
      }
      return c;
    }));
  };

  const saveAllConfigs = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('http://127.0.0.1:4321/api/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(configs)
      });

      if (!res.ok) {
        throw new Error('Failed to save to backend');
      }

      localStorage.setItem('apiConfigs', JSON.stringify(configs));

      setSavedConfigs(JSON.parse(JSON.stringify(configs)));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (e) {
      console.error("保存失败", e);
      alert("保存配置失败");
    } finally {
      setIsSaving(false);
    }
  };

  const activeConfig = configs.find(c => c.id === activeConfigId);

  return (
    <div className="space-y-6 relative">
      {/* Toast */}
      {saveSuccess && (
        <div className="fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2 z-50 animate-fade-in">
          <Check size={18} className="text-green-600" />
          <span>配置保存成功！</span>
        </div>
      )}

      {/* Main Layout */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col md:flex-row min-h-[500px]">

        {/* Sidebar List */}
        <div className="w-full md:w-64 bg-slate-50 border-b md:border-b-0 md:border-r border-slate-200 flex flex-col">
          <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-white">
            <h3 className="font-semibold text-slate-800">我的服务</h3>
            <button
              onClick={handleAddConfig}
              className="p-1.5 hover:bg-slate-100 rounded-md text-indigo-600 transition-colors"
              title="增加服务"
            >
              <Plus size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {configs.length === 0 && (
              <div className="text-center py-8 text-slate-400 text-sm">
                无可用服务<br />点击 + 添加。
              </div>
            )}
            {configs.map(config => (
              <div
                key={config.id}
                onClick={() => setActiveConfigId(config.id)}
                className={`group flex items-center justify-between px-3 py-2.5 rounded-lg text-sm cursor-pointer transition-colors ${activeConfigId === config.id
                  ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200'
                  : 'text-slate-600 hover:bg-slate-100'
                  }`}
              >
                <div className="flex items-center truncate">
                  <div className={`w-2 h-2 rounded-full mr-2 flex-shrink-0 ${config.enabled ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                  <span className="truncate font-medium">{config.name}</span>
                </div>
                <button
                  onClick={(e) => handleDeleteConfig(config.id, e)}
                  className={`p-1 text-slate-400 hover:text-red-500 rounded opacity-0 group-hover:opacity-100 transition-opacity ${activeConfigId === config.id ? 'opacity-100' : ''}`}
                  title="删除"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Edit Form */}
        <div className="flex-1 p-6 bg-white overflow-y-auto">
          {activeConfig ? (
            <div className="max-w-xl mx-auto space-y-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-semibold text-slate-800 flex items-center">
                  <Server size={22} className="mr-2 text-indigo-600" />
                  配置服务
                </h3>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-0.5 rounded text-xs border ${activeConfig.enabled ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                    {activeConfig.enabled ? '已启用' : '已禁用'}
                  </span>
                </div>
              </div>

              {/* Form Fields */}
              <div className="space-y-4">

                {/* Display Name */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">显示名称</label>
                  <input
                    type="text"
                    value={activeConfig.name}
                    onChange={(e) => updateActiveConfig({ name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="e.g. My Production GPT"
                  />
                </div>

                {/* Model Name */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">模型名称</label>
                  <input
                    type="text"
                    value={activeConfig.model}
                    onChange={(e) => updateActiveConfig({ model: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="e.g. gpt-4o, gemini-1.5-pro, llama3"
                  />
                </div>

                {/* API Key */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">API Key</label>
                  <div className="relative">
                    <Key size={16} className="absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="password"
                      value={activeConfig.apiKey}
                      onChange={(e) => updateActiveConfig({ apiKey: e.target.value })}
                      className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="sk-..."
                    />
                  </div>
                </div>

                {/* Endpoint */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">API端口（Base URL）</label>
                  <input
                    type="text"
                    value={activeConfig.endpoint}
                    onChange={(e) => updateActiveConfig({ endpoint: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm"
                    placeholder="http://localhost:11434/v1"
                  />
                </div>

                {/* Enabled Toggle */}
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100 mt-4">
                  <div>
                    <span className="font-medium text-slate-700">启用服务</span>
                    <p className="text-xs text-slate-500">启用此服务以在数据分析中使用。</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={activeConfig.enabled}
                      onChange={(e) => updateActiveConfig({ enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>



                {/* Actions */}
                <div className="pt-6 flex justify-end">
                  <button
                    onClick={saveAllConfigs}
                    disabled={isSaving}
                    className="flex items-center space-x-2 px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm font-medium cursor-pointer"
                  >
                    {isSaving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>保存中...</span>
                      </>
                    ) : (
                      <>
                        <Save size={18} />
                        <span>保存更改</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div>
            </div>
          )}
        </div>
      </div>

      {/* Guidelines */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 text-sm text-blue-800 mb-6">
        <h4 className="font-semibold mb-1">配置指南</h4>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>AI提供商:</strong> 选择 'Gemini' 用于 Google 服务，'Ollama' 用于本地模型，'OpenAI' 用于 ChatGPT 或任何 OpenAI 兼容的 API（如 DeepSeek、Moonshot 等）。</li>
          <li><strong>模型名称:</strong> 必须与 API 预期的精确模型 ID 匹配（例如 <code>gpt-4-turbo</code>，<code>gemini-1.5-pro</code>）。</li>
          <li><strong>数据安全:</strong> 你的 API 密钥存储在你的设备上，永远不会发送到我们的服务器。</li>
        </ul>
      </div>
    </div>
  );
};

export default APIConfig;
