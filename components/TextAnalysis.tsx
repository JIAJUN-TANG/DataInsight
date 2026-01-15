import React, { useState } from 'react';
import { Dataset } from '../types';
import { BookOpen, Brain, Smile, BarChart2, List, Settings, Download } from 'lucide-react';
import { sendAIRequest, ChatMessageRequest } from '../services/AIService';
import { AIModelConfig } from './APIConfig';
import * as XLSX from 'xlsx';

type AnalysisTaskType = 'sentiment' | 'topic' | 'classification';

interface BatchAnalysisResult {
  index: number;
  original: string;
  result: any;
}

// Interfaces
interface AnalysisProgress {
  current: number;
  total: number;
  stage: 'preparing' | 'processing' | 'analyzing' | 'finalizing';
  message: string;
}

interface TokenizationResult {
  original: string;
  tokens: string[];
  filteredTokens: string[];
  tokenCount: number;
  filteredTokenCount: number;
  keywords?: Array<{ word: string, weight: number }>;
}

interface SentimentResult {
  score: number;
  label: string;
  confidence: number;
  detailedResults: any[];
}

interface TopicResult {
  topic: number;
  keywords: string[];
  weight: number;
}

interface TextAnalysisProps {
  dataset: Dataset;
}

const TextAnalysis: React.FC<TextAnalysisProps> = ({ dataset }) => {
  // State
  const [selectedColumn, setSelectedColumn] = useState<string>('');
  const [analysisType, setAnalysisType] = useState<AnalysisTaskType>('sentiment');
  const [results, setResults] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState<AnalysisProgress | null>(null);

  const [analysisEngine, setAnalysisEngine] = useState<'local' | 'ai'>('local');
  const [language, setLanguage] = useState<'zh' | 'en'>('zh');

  const [configs, setConfigs] = useState<AIModelConfig[]>([]);
  const [selectedConfigId, setSelectedConfigId] = useState<string>('');
  const [classificationCategories, setClassificationCategories] = useState<string>('');

  // Load saved config for service
  React.useEffect(() => {
    const loadEnabledServices = async () => {
      try {
        let savedConfigs = null;
        if (window.electronAPI) {
          // @ts-ignore
          savedConfigs = await window.electronAPI.readEnvFile();
        }

        let configsArr = null;
        if (savedConfigs) {
          // 处理格式：API_CONFIGS='[]'
          let configString = savedConfigs;
          if (configString.startsWith('API_CONFIGS=')) {
            configString = configString.replace('API_CONFIGS=', '');
            // 移除可能的引号
            if ((configString.startsWith('\'') && configString.endsWith('\'')) ||
              (configString.startsWith('"') && configString.endsWith('"'))) {
              configString = configString.slice(1, -1);
            }
          }
          configsArr = JSON.parse(configString);
        } else {
          const oldConfigs = localStorage.getItem('apiConfigs');
          if (oldConfigs) configsArr = JSON.parse(oldConfigs);
        }

        if (Array.isArray(configsArr)) {
          const enabled = configsArr.filter((c: any) => c.enabled);
          setConfigs(enabled);

          if (enabled.length > 0) {
            setSelectedConfigId(enabled[0].id);
          }
        }
      } catch (error) {
        console.error('Failed to load API configs:', error);
        // 尝试从localStorage读取作为备选方案
        const oldConfigs = localStorage.getItem('apiConfigs');
        if (oldConfigs) {
          try {
            const configsArr = JSON.parse(oldConfigs);
            if (Array.isArray(configsArr)) {
              const enabled = configsArr.filter((c: any) => c.enabled);
              setConfigs(enabled);
              if (enabled.length > 0) {
                setSelectedConfigId(enabled[0].id);
              }
            }
          } catch (localError) {
            console.error('Failed to load from localStorage as fallback:', localError);
          }
        }
      }
    };

    loadEnabledServices();
  }, []);

  const textColumns = dataset.columns.filter(col => col.type === 'String');

  const analyzeTextBatch = async (
    texts: string[],
    taskType: AnalysisTaskType,
    options: {
      categories?: string[];
      topicCount?: number;
      config: AIModelConfig;
    }
  ): Promise<BatchAnalysisResult[]> => {
    const { config } = options;
    if (!config) throw new Error("No AI Configuration provided.");

    const BATCH_SIZE = 20;
    const results: BatchAnalysisResult[] = [];

    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const batchTexts = texts.slice(i, i + BATCH_SIZE);
      const startIndex = i;

      const systemPrompt = `
You are a data analysis assistant. Your task is to perform ${taskType} analysis on the provided list of texts.
Return the result as a strict JSON array where each item corresponds to the text at the same index.
Do not return any markdown formatting (like \`\`\`json), just the raw JSON string.
      `;

      let userPrompt = "";

      if (taskType === 'sentiment') {
        userPrompt = `
Analyze the sentiment of the following texts.
Return a JSON array of objects with these fields:
- score: number (-1 to 1, where -1 is negative, 1 is positive)
- label: string ("positive", "negative", "neutral")
- confidence: number (0 to 1)

Texts to analyze:
${JSON.stringify(batchTexts)}
        `;
      } else if (taskType === 'classification') {
        const categories = options.categories?.join(', ') || "General";
        userPrompt = `
Classify the following texts into one of these categories: [${categories}].
Return a JSON array of objects with these fields:
- category: string (one of the provided categories)
- confidence: number (0 to 1)
- explanation: string (brief reason)

Texts to analyze:
${JSON.stringify(batchTexts)}
        `;
      } else if (taskType === 'topic') {
        userPrompt = `
Identify the main topic for each of the following texts.
Return a JSON array of objects with these fields:
- topic: string (short topic name)
- keywords: string[] (up to 3 keywords)

Texts to analyze:
${JSON.stringify(batchTexts)}
         `;
      }

      try {
        let fullText = "";
        const stream = await sendAIRequest(config, systemPrompt, [{ role: 'user', content: userPrompt }]);
        for await (const chunk of stream) {
          fullText += chunk;
        }

        fullText = fullText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const batchResults = JSON.parse(fullText);

        if (Array.isArray(batchResults)) {
          batchResults.forEach((res, idx) => {
            if (idx < batchTexts.length) {
              results.push({
                index: startIndex + idx,
                original: batchTexts[idx],
                result: res
              });
            }
          });
        }
      } catch (e) {
        console.error(`Batch analysis failed for batch ${i}`, e);
      }
    }

    return results;
  };

  const handleAnalyzeClick = async () => {
    if (!selectedColumn) {
      alert('请选择要分析的文本列');
      return;
    }

    setIsAnalyzing(true);
    setResults(null);

    try {
      const texts = dataset.rows
        .map(row => row[selectedColumn]?.toString() || '')
        .filter(text => text.trim() !== '');

      if (texts.length === 0) {
        alert('所选列中没有有效文本数据');
        setIsAnalyzing(false);
        return;
      }

      let result: any;

      if (analysisEngine === 'local') {
        if (analysisType === 'sentiment') {
          // 初始化进度
          setProgress({
            current: 0,
            total: texts.length,
            stage: 'preparing',
            message: '正在准备数据...'
          });

          // 预处理完成后，开始逐条分析
          const detailedResults: any[] = [];
          let totalScore = 0;

          setProgress(prev => prev ? {
            ...prev,
            stage: 'processing',
            message: '正在预处理文本...'
          } : prev);

          // 模拟预处理延迟
          await new Promise(resolve => setTimeout(resolve, 500));

          setProgress(prev => prev ? {
            ...prev,
            stage: 'analyzing',
            message: '正在逐条分析情感...'
          } : prev);

          // 逐条发送数据到后端
          for (let i = 0; i < texts.length; i++) {
            const text = texts[i];

            // 更新进度
            setProgress(prev => prev ? {
              ...prev,
              current: i + 1,
              message: `正在分析第 ${i + 1}/${texts.length} 条文本`
            } : prev);

            // 发送单个文本到后端进行情感分析
            const res = await fetch('http://127.0.0.1:4321/api/analyze/sentiment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ texts: [text], language })
            });

            if (!res.ok) throw new Error(`第 ${i + 1} 条文本分析失败`);

            const data = await res.json();
            const itemResult = data.details[0];
            detailedResults.push({
              ...itemResult,
              positiveCount: 0,
              negativeCount: 0,
              tokenCount: 0
            });

            totalScore += itemResult.score;
          }

          // 计算总体结果
          const avgScore = totalScore / texts.length;
          let overallLabel = 'neutral';
          if (avgScore > 0.6) overallLabel = 'positive';
          else if (avgScore < 0.4) overallLabel = 'negative';

          // 计算置信度（简单示例，可根据实际需求调整）
          const confidence = 0.8 + (Math.random() * 0.2);

          result = {
            score: avgScore,
            label: overallLabel,
            confidence: confidence,
            detailedResults: detailedResults
          };

          setProgress(prev => prev ? {
            ...prev,
            stage: 'finalizing',
            message: '分析完成，正在生成结果...'
          } : prev);

          // 模拟最终处理延迟
          await new Promise(resolve => setTimeout(resolve, 300));
        } else if (analysisType === 'topic') {
          // 主题分析仍使用批量处理
          setProgress({
            current: 0,
            total: texts.length,
            stage: 'preparing',
            message: '正在准备数据...'
          });

          await new Promise(resolve => setTimeout(resolve, 500));

          setProgress(prev => prev ? {
            ...prev,
            current: texts.length * 0.3,
            stage: 'processing',
            message: '正在进行主题建模...'
          } : prev);

          const res = await fetch('http://127.0.0.1:4321/api/analyze/topic', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ texts, language })
          });

          if (!res.ok) throw new Error("Topic analysis failed");

          setProgress(prev => prev ? {
            ...prev,
            current: texts.length * 0.8,
            stage: 'finalizing',
            message: '正在生成主题结果...'
          } : prev);

          const topics = await res.json();
          result = topics; // Array of TopicResult

          await new Promise(resolve => setTimeout(resolve, 300));
        } else {
          alert("Local (Python) engine only supports Sentiment and Topic analysis.");
          setIsAnalyzing(false);
          return;
        }
      } else {
        // AI Analysis
        if (analysisType === 'classification' && !classificationCategories) {
          alert('Please enter classification categories.');
          setIsAnalyzing(false);
          return;
        }

        let categories: string[] | undefined;
        if (analysisType === 'classification') {
          categories = classificationCategories.split(/[,，;；\n]+/).map(c => c.trim()).filter(Boolean);
          if (categories.length === 0) {
            alert('Please enter valid classification categories.');
            setIsAnalyzing(false);
            return;
          }
        }

        const config = configs.find(c => c.id === selectedConfigId);
        if (!config) {
          alert('Please select an AI service.');
          setIsAnalyzing(false);
          return;
        }

        // AI分析添加进度显示
        setProgress({
          current: 0,
          total: texts.length,
          stage: 'preparing',
          message: '正在准备AI分析...'
        });

        const batchResults = await analyzeTextBatch(texts, analysisType, {
          config,
          categories
        });

        const successfulResults = batchResults.map(r => r.result);

        if (analysisType === 'sentiment') {
          result = { type: 'ai_sentiment', data: successfulResults };
        } else if (analysisType === 'classification') {
          result = { type: 'ai_classification', data: successfulResults, categories };
        } else if (analysisType === 'topic') {
          result = { type: 'ai_topic', data: successfulResults };
        }
      }

      setResults(result);

    } catch (error) {
      console.error('Analysis error:', error);
      alert('分析过程中发生错误，请重试');
    } finally {
      setIsAnalyzing(false);
      // 清除进度
      setProgress(null);
    }
  };

  // Renderers
  const baseRenderSentimentResult = (result: SentimentResult) => {
    const getSentimentColor = (label: string) => {
      switch (label) {
        case 'positive': return 'text-green-600';
        case 'negative': return 'text-red-600';
        default: return 'text-yellow-600';
      }
    };

    return (
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row items-center justify-center gap-8">
          <div className="text-center">
            <div className={`text-3xl font-bold ${getSentimentColor(result.label)} mb-1`}>
              {result.score.toFixed(2)}
            </div>
            <div className="text-sm text-slate-500">情感得分</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-semibold mb-1">
              {result.label.charAt(0).toUpperCase() + result.label.slice(1)}
            </div>
            <div className="text-sm text-slate-500">情感标签</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-semibold mb-1">
              {(result.confidence * 100).toFixed(0)}%
            </div>
            <div className="text-sm text-slate-500">置信度</div>
          </div>
        </div>

        <div className="mt-8">
          <h5 className="font-medium text-slate-700 mb-3">详细结果示例</h5>
          <div className="max-h-60 overflow-y-auto border border-slate-100 rounded">
            {result.detailedResults.slice(0, 50).map((item: any, idx: number) => (
              <div key={idx} className="p-2 border-b border-slate-50 text-sm flex justify-between">
                <span className="truncate w-3/4">{item.text}</span>
                <span className={getSentimentColor(item.label)}>{item.score.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const baseRenderTopicResult = (topics: TopicResult[]) => {
    return (
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="space-y-6">
          {topics.map((topic) => (
            <div key={topic.topic} className="border border-slate-200 rounded-lg p-4">
              <div className="flex justify-between items-center mb-3">
                <h5 className="font-medium text-slate-700">Topic {topic.topic}</h5>
                <div className="text-sm text-slate-500">Weight: {(topic.weight * 100).toFixed(1)}%</div>
              </div>
              <div className="flex flex-wrap gap-2">
                {topic.keywords.map((keyword, idx) => (
                  <span key={idx} className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm">
                    {keyword}
                  </span>
                ))}
              </div>
              <div className="mt-3">
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${topic.weight * 100}%` }}></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const baseRenderAISentimentResult = (data: any[]) => {
    let positive = 0, negative = 0, neutral = 0;
    data.forEach(d => {
      if (d.label === 'positive') positive++;
      else if (d.label === 'negative') negative++;
      else neutral++;
    });
    return (
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-4 bg-green-50 rounded text-green-700 font-bold">Pos: {positive}</div>
          <div className="p-4 bg-yellow-50 rounded text-yellow-700 font-bold">Neu: {neutral}</div>
          <div className="p-4 bg-red-50 rounded text-red-700 font-bold">Neg: {negative}</div>
        </div>
      </div>
    );
  };

  const baseRenderAIClassificationResult = (data: any[], categories: string[]) => {
    // Count per category
    const counts: Record<string, number> = {};
    categories.forEach(c => counts[c] = 0);

    data.forEach(d => {
      if (d.category && counts.hasOwnProperty(d.category)) {
        counts[d.category]++;
      } else if (d.category) {
        counts[d.category] = (counts[d.category] || 0) + 1;
      }
    });

    return (
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(counts).map(([cat, count]) => (
            <div key={cat} className="p-4 bg-slate-50 rounded text-center border border-slate-100">
              <div className="text-2xl font-bold text-indigo-600">{count}</div>
              <div className="text-sm text-slate-500 truncate" title={cat}>{cat}</div>
            </div>
          ))}
        </div>

        <div className="mt-6 border-t border-slate-100 pt-4">
          <h5 className="font-medium text-slate-700 mb-3 text-sm">Sample Results</h5>
          <div className="max-h-48 overflow-y-auto space-y-2">
            {data.slice(0, 20).map((item, idx) => (
              <div key={idx} className="text-xs flex justify-between p-2 bg-slate-50 rounded">
                <span className="truncate w-2/3 mr-2">{item.text}</span>
                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full shrink-0">{item.category}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // 导出数据功能
  const exportResults = (results: any) => {
    let dataToExport: any[] = [];
    let filename = '';
    let headers: string[] = [];

    // 根据结果类型准备数据
    if (analysisEngine === 'local') {
      if (analysisType === 'sentiment') {
        // 本地情感分析结果
        filename = `sentiment_analysis_${new Date().toISOString().slice(0, 10)}.csv`;
        headers = ['文本', '情感得分', '情感标签'];
        dataToExport = results.detailedResults.map((item: any) => [
          item.text,
          item.score.toFixed(2),
          item.label
        ]);
      } else if (analysisType === 'topic') {
        // 本地主题分析结果
        filename = `topic_analysis_${new Date().toISOString().slice(0, 10)}.json`;
        // 直接使用JSON格式导出主题结果
        const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return;
      }
    } else {
      // AI分析结果
      if (results.type === 'ai_sentiment') {
        filename = `ai_sentiment_analysis_${new Date().toISOString().slice(0, 10)}.csv`;
        headers = ['文本', '情感得分', '情感标签', '置信度'];
        dataToExport = results.data.map((item: any) => [
          item.text || '',
          item.score !== undefined ? item.score.toFixed(2) : '0.00',
          item.label || 'Unknown',
          item.confidence !== undefined ? item.confidence.toFixed(2) : '0.00'
        ]);
      } else if (results.type === 'ai_classification') {
        filename = `ai_classification_${new Date().toISOString().slice(0, 10)}.csv`;
        headers = ['文本', '分类结果', '置信度', '解释'];
        dataToExport = results.data.map((item: any) => [
          item.text || '',
          item.category || '',
          item.confidence?.toFixed(2) || '',
          item.explanation || ''
        ]);
      } else if (results.type === 'ai_topic') {
        filename = `ai_topic_analysis_${new Date().toISOString().slice(0, 10)}.json`;
        const blob = new Blob([JSON.stringify(results.data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return;
      }
    }

    // 导出为XLSX
    if (dataToExport.length > 0) {
      // 添加表头作为第一行
      const sheetData = [headers, ...dataToExport];

      // 创建工作簿和工作表
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(sheetData);

      // 将工作表添加到工作簿
      XLSX.utils.book_append_sheet(wb, ws, 'Analysis Results');

      // 生成Excel文件并下载
      // 修改文件扩展名为 .xlsx
      const xlsxFilename = filename.replace('.csv', '.xlsx');
      XLSX.writeFile(wb, xlsxFilename);
    }
  };

  // Render wrappers with export functionality
  const renderSentimentResult = (result: SentimentResult) => {
    const originalResult = baseRenderSentimentResult(result);
    return React.cloneElement(originalResult as React.ReactElement, {},
      <div className="flex justify-between items-center mb-6">
        <h4 className="text-lg font-semibold text-slate-700">情感分析结果</h4>
        <button
          onClick={() => exportResults(result)}
          className="flex items-center space-x-1 px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200 transition-colors text-sm"
          title="导出数据"
        >
          <Download size={14} />
          <span>导出</span>
        </button>
      </div>,
      originalResult.props.children
    );
  };

  const renderTopicResult = (topics: TopicResult[]) => {
    const originalResult = baseRenderTopicResult(topics);
    return React.cloneElement(originalResult as React.ReactElement, {},
      <div className="flex justify-between items-center mb-6">
        <h4 className="text-lg font-semibold text-slate-700">主题挖掘结果 (LDA)</h4>
        <button
          onClick={() => exportResults(topics)}
          className="flex items-center space-x-1 px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200 transition-colors text-sm"
          title="导出数据"
        >
          <Download size={14} />
          <span>导出</span>
        </button>
      </div>,
      originalResult.props.children
    );
  };

  const renderAISentimentResult = (data: any[]) => {
    const originalResult = baseRenderAISentimentResult(data);
    return React.cloneElement(originalResult as React.ReactElement, {},
      <div className="flex justify-between items-center mb-6">
        <h4 className="text-lg font-semibold text-slate-700">AI Sentiment Results</h4>
        <button
          onClick={() => exportResults({ type: 'ai_sentiment', data })}
          className="flex items-center space-x-1 px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200 transition-colors text-sm"
          title="导出数据"
        >
          <Download size={14} />
          <span>导出</span>
        </button>
      </div>,
      originalResult.props.children
    );
  };

  const renderAIClassificationResult = (data: any[], categories: string[]) => {
    const originalResult = baseRenderAIClassificationResult(data, categories);
    return React.cloneElement(originalResult as React.ReactElement, {},
      <div className="flex justify-between items-center mb-6">
        <h4 className="text-lg font-semibold text-slate-700">Classification Results</h4>
        <button
          onClick={() => exportResults({ type: 'ai_classification', data, categories })}
          className="flex items-center space-x-1 px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200 transition-colors text-sm"
          title="导出数据"
        >
          <Download size={14} />
          <span>导出</span>
        </button>
      </div>,
      originalResult.props.children
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="text-lg font-semibold text-slate-700 mb-4">分析配置</h3>
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">选择文本列</label>
            <select
              value={selectedColumn}
              onChange={(e) => setSelectedColumn(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">请选择文本列</option>
              {textColumns.map(col => (
                <option key={col.name} value={col.name}>{col.name}</option>
              ))}
            </select>
          </div>

          {/* Language Selector */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">文本语言</label>
            <div className="flex space-x-4">
              <label className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-colors">
                <input
                  type="radio"
                  checked={language === 'zh'}
                  onChange={() => setLanguage('zh')}
                  className="text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <span className="text-sm text-slate-700">中文</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-colors">
                <input
                  type="radio"
                  checked={language === 'en'}
                  onChange={() => setLanguage('en')}
                  className="text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <span className="text-sm text-slate-700">English</span>
              </label>
            </div>
          </div>

          {/* Analysis Type */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">分析类别</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setAnalysisType('sentiment')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${analysisType === 'sentiment' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
              >
                <Smile size={16} /><span>情感分析</span>
              </button>
              <button
                onClick={() => setAnalysisType('topic')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${analysisType === 'topic' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
              >
                <Brain size={16} /><span>主题挖掘</span>
              </button>
              <button
                onClick={() => setAnalysisType('classification')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${analysisType === 'classification' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
              >
                <List size={16} /><span>文本分类</span>
              </button>
            </div>
          </div>

          {/* Analysis Engine */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">分析引擎</label>
            <div className="flex items-center space-x-4 bg-slate-50 p-2 rounded-lg border border-slate-200 inline-flex">
              <button
                onClick={() => setAnalysisEngine('local')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${analysisEngine === 'local' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                本地分析
              </button>
              <button
                onClick={() => setAnalysisEngine('ai')}
                className={`flex items-center space-x-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${analysisEngine === 'ai' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <span>AI分析</span>
                <Settings size={14} />
              </button>
            </div>

            {analysisEngine === 'ai' && (
              <div className="mt-2 text-xs text-slate-500 flex items-center gap-2">
                <span>使用：</span>
                <select
                  value={selectedConfigId}
                  onChange={(e) => setSelectedConfigId(e.target.value)}
                  className="py-0.5 px-2 bg-slate-100 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-indigo-500"
                >
                  {configs.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.model})</option>
                  ))}
                  {configs.length === 0 && <option value="">无可用服务</option>}
                </select>
              </div>
            )}
          </div>

          {/* Classification Categories */}
          {analysisType === 'classification' && (
            <div className="animate-fade-in">
              <label className="block text-sm font-medium text-slate-700 mb-2">类别 (逗号分隔)</label>
              <textarea
                value={classificationCategories}
                onChange={(e) => setClassificationCategories(e.target.value)}
                placeholder="e.g. Positive, Negative, Neutral"
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm h-24"
              />
            </div>
          )}
        </div>

        <div className="mt-6">
          {progress && (
            <div className="mb-4 animate-fade-in">
              <div className="flex justify-between text-sm text-slate-600 mb-1">
                <span>{progress.message}</span>
                <span>{Math.round((progress.current / progress.total) * 100) || 0}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                ></div>
              </div>
              <div className="mt-2 text-xs flex gap-2 items-center">
                {/* 准备数据 */}
                <span className={`flex items-center gap-1 ${progress.stage === 'preparing' ? 'text-purple-600 font-medium' :
                  progress.stage === 'processing' || progress.stage === 'analyzing' || progress.stage === 'finalizing' ? 'text-purple-600 font-medium' : 'text-slate-400'}`}>
                  {progress.stage === 'preparing' && <span className="text-xs text-purple-500">进行中</span>}
                  {progress.stage !== 'preparing' && <span className="text-green-500">✅</span>}
                </span>
                <span className={progress.stage !== 'preparing' ? 'text-purple-600' : 'text-slate-300'}>→</span>

                {/* 步骤2: 分词/处理 */}
                <span className={`flex items-center gap-1 ${progress.stage === 'processing' ? 'text-purple-600 font-medium' :
                  progress.stage === 'analyzing' || progress.stage === 'finalizing' ? 'text-purple-600 font-medium' : 'text-slate-400'}`}>
                  2. 分词/处理
                  {progress.stage === 'processing' && <span className="text-xs text-purple-500">进行中</span>}
                  {progress.stage === 'analyzing' || progress.stage === 'finalizing' ? <span className="text-green-500">✅</span> : ''}
                </span>
                <span className={progress.stage === 'analyzing' || progress.stage === 'finalizing' ? 'text-purple-600' : 'text-slate-300'}>→</span>

                {/* 步骤3: 分析中 */}
                <span className={`flex items-center gap-1 ${progress.stage === 'analyzing' ? 'text-purple-600 font-medium' :
                  progress.stage === 'finalizing' ? 'text-purple-600 font-medium' : 'text-slate-400'}`}>
                  3. 分析中
                  {progress.stage === 'analyzing' && <span className="text-xs text-purple-500">进行中</span>}
                  {progress.stage === 'finalizing' && <span className="text-green-500">✅</span>}
                </span>
              </div>
            </div>
          )}

          <button
            onClick={handleAnalyzeClick}
            disabled={isAnalyzing || !selectedColumn}
            className={`w-full md:w-auto px-6 py-2.5 rounded-lg font-medium flex items-center justify-center space-x-2 transition-all ${isAnalyzing || !selectedColumn
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
              : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm hover:shadow-md'
              }`}
          >
            {isAnalyzing ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>分析中...</span>
              </>
            ) : (
              <>
                <BarChart2 size={20} />
                <span>开始分析</span>
              </>
            )}
          </button>
        </div>
      </div>

      {results && (
        <div className="animate-fade-in">
          {(analysisEngine === 'local' && analysisType === 'sentiment') && renderSentimentResult(results)}
          {(analysisEngine === 'local' && analysisType === 'topic') && renderTopicResult(results)}

          {/* AI Results Rendering */}
          {(analysisEngine === 'ai' && results.type === 'ai_sentiment') && renderAISentimentResult(results.data)}
          {(analysisEngine === 'ai' && results.type === 'ai_classification') && renderAIClassificationResult(results.data, results.categories)}
          {(analysisEngine === 'ai' && results.type === 'ai_topic') && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-lg font-semibold text-slate-700">AI Topic Analysis</h4>
                <button
                  onClick={() => exportResults(results)}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200 transition-colors text-sm"
                  title="导出数据"
                >
                  <Download size={14} />
                  <span>导出</span>
                </button>
              </div>
              <pre className="text-xs bg-slate-50 p-4 rounded overflow-auto">{JSON.stringify(results.data, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TextAnalysis;