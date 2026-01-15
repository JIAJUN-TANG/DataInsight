import React, { useState } from 'react';
import { Dataset, AppView } from './types';
import FileUpload from './components/FileUpload';
import DataGrid from './components/DataGrid';
import Charts from './components/Charts';
import AIChat from './components/AIChat';
import TextAnalysis from './components/TextAnalysis';
import APIConfig from './components/APIConfig';
import { LayoutDashboard, Table as TableIcon, BarChart2, MessageSquareText, FileSpreadsheet, BookOpen, Key } from 'lucide-react';

function App() {
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [currentView, setCurrentView] = useState<AppView>(AppView.Upload);

  const handleDataLoaded = (data: Dataset) => {
    setDataset(data);
    setCurrentView(AppView.Data);
  };

  const NavButton = ({ view, icon: Icon, label }: { view: AppView; icon: React.ElementType; label: string }) => {
    const isDisabled = !dataset && view !== AppView.Upload && view !== AppView.APIConfig;
    return (
      <button
        onClick={() => setCurrentView(view)}
        disabled={isDisabled}
        className={`
          flex items-center space-x-3 px-4 py-3 rounded-lg w-full transition-all duration-200
          ${currentView === view
            ? 'bg-indigo-600 text-white shadow-md'
            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }
          ${isDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <Icon size={20} />
        <span className="font-medium">{label}</span>
      </button>
    );
  };

  return (
    <div className="flex h-screen bg-slate-100">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex-shrink-0 hidden md:flex flex-col">
        <div className="p-6 flex items-center space-x-3 border-b border-slate-800">
          <div className="bg-indigo-500 p-2 rounded-lg">
            <LayoutDashboard size={24} className="text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">DataInsight</h1>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 px-4 mt-4">
            分析工具
          </div>
          <NavButton view={AppView.Upload} icon={FileSpreadsheet} label="上传文件" />
          <NavButton view={AppView.Data} icon={TableIcon} label="数据预览" />
          <NavButton view={AppView.Visualize} icon={BarChart2} label="数据可视化" />
          <NavButton view={AppView.TextAnalysis} icon={BookOpen} label="文本分析" />
          <NavButton view={AppView.AI} icon={MessageSquareText} label="AI数据分析" />

          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 px-4 mt-8">
            系统设置
          </div>
          <NavButton view={AppView.APIConfig} icon={Key} label="API配置" />
        </nav>

        {dataset && (
          <div className="p-4 bg-slate-800/50 m-4 rounded-xl border border-slate-700">
            <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">当前数据集</h4>
            <p className="text-sm font-medium text-white truncate" title={dataset.name}>{dataset.name}</p>
            <p className="text-xs text-slate-400 mt-1">{dataset.rowCount.toLocaleString()} 行 • {dataset.columns.length} 列</p>
          </div>
        )}

        {/* 检查更新按钮 */}
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={() => {
              // @ts-ignore - electronAPI is exposed from preload.js
              window.electronAPI?.checkForUpdates?.();
            }}
            className="flex items-center space-x-2 px-4 py-2 w-full bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            <span className="text-sm">检查更新</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Mobile Header */}
        <header className="md:hidden h-16 bg-slate-900 text-white flex items-center px-4 justify-between">
          <div className="flex items-center space-x-2">
            <div className="bg-indigo-500 p-1.5 rounded">
              <LayoutDashboard size={20} />
            </div>
            <span className="font-bold">DataInsight</span>
          </div>
          {/* Simple mobile nav toggle can be added here, omitted for brevity */}
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-6 md:p-8">
          <div className="max-w-full mx-auto h-full flex flex-col">

            {/* View Title */}
            {currentView !== AppView.Upload && (
              <div className="mb-6 flex justify-between items-end">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">
                    {currentView === AppView.Data && "数据预览"}
                    {currentView === AppView.Visualize && "数据可视化"}
                    {currentView === AppView.TextAnalysis && "文本分析"}
                    {currentView === AppView.AI && "AI数据分析"}
                    {currentView === AppView.APIConfig && "API密钥配置"}
                  </h2>
                  <p className="text-slate-500 mt-1">
                    {currentView === AppView.Data && "预览原始数据和列统计信息。"}
                    {currentView === AppView.Visualize && "自动从数据集生成可视化图表。"}
                    {currentView === AppView.TextAnalysis && "对文本数据进行主题挖掘和情感分析。"}
                    {currentView === AppView.AI && "使用AI分析数据集并发现隐藏模式。"}
                    {currentView === AppView.APIConfig && "配置不同AI服务的API密钥。"}
                  </p>
                </div>
              </div>
            )}

            {/* View Content */}
            <div className="flex-1 min-h-0">
              {currentView === AppView.Upload && (
                <FileUpload onDataLoaded={handleDataLoaded} />
              )}

              {currentView === AppView.Data && dataset && (
                <div className="h-full">
                  <DataGrid dataset={dataset} onDatasetChange={setDataset} />
                </div>
              )}

              {currentView === AppView.Visualize && dataset && (
                <div className="h-full overflow-auto">
                  <Charts dataset={dataset} />
                </div>
              )}

              {currentView === AppView.TextAnalysis && dataset && (
                <div className="h-full">
                  <TextAnalysis dataset={dataset} />
                </div>
              )}

              {currentView === AppView.AI && dataset && (
                <div className="h-full max-h-[calc(100vh-12rem)]">
                  <AIChat dataset={dataset} />
                </div>
              )}

              {currentView === AppView.APIConfig && (
                <div className="h-full">
                  <APIConfig />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Mobile Tab Bar (Optional alternative for mobile nav, keep simple sidebar logic for now) */}
        <div className="md:hidden bg-white border-t border-slate-200 flex justify-around p-2">
          <button onClick={() => setCurrentView(AppView.Upload)} className={`p-2 rounded ${currentView === AppView.Upload ? 'text-indigo-600' : 'text-slate-400'}`}><FileSpreadsheet /></button>
          <button disabled={!dataset} onClick={() => setCurrentView(AppView.Data)} className={`p-2 rounded ${currentView === AppView.Data ? 'text-indigo-600' : 'text-slate-400'}`}><TableIcon /></button>
          <button disabled={!dataset} onClick={() => setCurrentView(AppView.Visualize)} className={`p-2 rounded ${currentView === AppView.Visualize ? 'text-indigo-600' : 'text-slate-400'}`}><BarChart2 /></button>
          <button disabled={!dataset} onClick={() => setCurrentView(AppView.TextAnalysis)} className={`p-2 rounded ${currentView === AppView.TextAnalysis ? 'text-indigo-600' : 'text-slate-400'}`}><BookOpen /></button>
          <button disabled={!dataset} onClick={() => setCurrentView(AppView.AI)} className={`p-2 rounded ${currentView === AppView.AI ? 'text-indigo-600' : 'text-slate-400'}`}><MessageSquareText /></button>
          <button onClick={() => setCurrentView(AppView.APIConfig)} className={`p-2 rounded ${currentView === AppView.APIConfig ? 'text-indigo-600' : 'text-slate-400'}`}><Key /></button>
        </div>

      </main>
    </div>
  );
}

export default App;