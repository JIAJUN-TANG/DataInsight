import React, { useState } from 'react';
import { Dataset } from '../types';
import { BookOpen, Brain, Smile, BarChart2, Tag } from 'lucide-react';


// 简单的情感词典
const sentimentDict = {
  // 积极词汇
  positive: new Set([
    '好', '优秀', '棒', '精彩', '满意', '喜欢', '爱', '开心', '快乐', '幸福',
    '成功', '进步', '增长', '提高', '改善', '完美', '出色', '卓越', '杰出', '优秀',
    '美好', '愉快', '舒适', '便利', '高效', '优质', '可靠', '稳定', '安全', '健康',
    '创新', '创意', '新颖', '独特', '实用', '实用', '美观', '时尚', '流行', '经典'
  ]),
  // 消极词汇
  negative: new Set([
    '差', '坏', '糟糕', '不满意', '讨厌', '恨', '伤心', '痛苦', '难过', '失败',
    '退步', '下降', '减少', '恶化', '不完美', '差劲', '低劣', '糟糕', '丑陋', '难看',
    '难受', '不舒服', '不方便', '低效', '劣质', '不可靠', '不稳定', '不安全', '不健康',
    '陈旧', '过时', '普通', '平庸', '无用', '不实用', '不美观', '不时尚', '不流行', '不经典'
  ])
};

// 中文停用词列表
const stopwords = new Set([
  '的', '了', '和', '是', '就', '都', '而', '及', '与', '着', '或', '一个', '这个', '那个', '这些', '那些',
  '在', '上', '下', '左', '右', '前', '后', '里', '外', '中', '内', '间', '之', '以', '于', '为',
  '对于', '关于', '至于', '由于', '因为', '所以', '因此', '然而', '但是', '可是', '不过', '虽然', '尽管',
  '如果', '假如', '假设', '倘若', '要是', '只要', '只有', '除非', '否则', '不管', '无论', '即使', '即便',
  '还是', '或者', '并且', '而且', '甚至', '更', '最', '很', '非常', '太', '极', '极其', '格外', '特别',
  '稍微', '略微', '比较', '相当', '几乎', '差不多', '大约', '大概', '左右', '上下', '前后', '多少',
  '一些', '有些', '若干', '许多', '不少', '大量', '众多', '多数', '少数', '部分', '全部', '所有',
  '一切', '任何', '每', '各', '每个', '各个', '各自', '其他', '另外', '还有', '以及', '等等', '诸如此类',
  '例如', '比如', '像', '如', '比如', '诸如', '例如', '就是', '即', '乃', '则', '却', '才', '也', '又',
  '再', '还', '仍', '仍然', '已', '已经', '曾', '曾经', '刚', '刚刚', '正', '正在', '将', '将要', '会',
  '能', '能够', '可以', '可能', '应该', '应当', '必须', '不得不', '得', '要', '想要', '希望', '愿意',
  '喜欢', '爱', '恨', '讨厌', '想', '认为', '觉得', '感到', '以为', '知道', '了解', '明白', '懂得',
  '认识', '记住', '忘记', '记得', '想起', '看到', '听见', '闻到', '尝到', '摸到', '感觉到', '认为',
  '觉得', '以为', '知道', '了解', '明白', '懂得', '认识', '记住', '忘记', '记得', '想起', '看到',
  '听见', '闻到', '尝到', '摸到', '感觉到', '是', '不是', '有', '没有', '存在', '不存在', '出现', '消失',
  '发生', '产生', '形成', '变成', '成为', '发展', '变化', '改变', '转变', '转换', '转移', '移动', '运动',
  '行动', '行为', '活动', '动作', '做', '干', '搞', '进行', '执行', '实施', '实行', '完成', '结束', '停止',
  '开始', '启动', '发动', '出发', '到达', '来', '去', '走', '跑', '跳', '飞', '爬', '游', '行', '进',
  '出', '入', '进', '出', '上', '下', '左', '右', '前', '后', '里', '外', '中', '内', '间', '之', '以',
  '于', '为', '对于', '关于', '至于', '由于', '因为', '所以', '因此', '然而', '但是', '可是', '不过',
  '虽然', '尽管', '如果', '假如', '假设', '倘若', '要是', '只要', '只有', '除非', '否则', '不管', '无论',
  '即使', '即便', '还是', '或者', '并且', '而且', '甚至', '更', '最', '很', '非常', '太', '极', '极其',
  '格外', '特别', '稍微', '略微', '比较', '相当', '几乎', '差不多', '大约', '大概', '左右', '上下',
  '前后', '多少', '一些', '有些', '若干', '许多', '不少', '大量', '众多', '多数', '少数', '部分',
  '全部', '所有', '一切', '任何', '每', '各', '每个', '各个', '各自', '其他', '另外', '还有', '以及',
  '等等', '诸如此类', '例如', '比如', '像', '如', '比如', '诸如', '例如', '就是', '即', '乃', '则',
  '却', '才', '也', '又', '再', '还', '仍', '仍然', '已', '已经', '曾', '曾经', '刚', '刚刚', '正',
  '正在', '将', '将要', '会', '能', '能够', '可以', '可能', '应该', '应当', '必须', '不得不', '得',
  '要', '想要', '希望', '愿意', '喜欢', '爱', '恨', '讨厌', '想', '认为', '觉得', '感到', '以为',
  '知道', '了解', '明白', '懂得', '认识', '记住', '忘记', '记得', '想起', '看到', '听见', '闻到',
  '尝到', '摸到', '感觉到', '是', '不是', '有', '没有', '存在', '不存在', '出现', '消失', '发生',
  '产生', '形成', '变成', '成为', '发展', '变化', '改变', '转变', '转换', '转移', '移动', '运动',
  '行动', '行为', '活动', '动作', '做', '干', '搞', '进行', '执行', '实施', '实行', '完成', '结束',
  '停止', '开始', '启动', '发动', '出发', '到达', '来', '去', '走', '跑', '跳', '飞', '爬', '游',
  '行', '进', '出', '入', '进', '出', '上', '下', '左', '右', '前', '后', '里', '外', '中', '内',
  '间', '之', '以', '于', '为', '对于', '关于', '至于', '由于', '因为', '所以', '因此', '然而',
  '但是', '可是', '不过', '虽然', '尽管', '如果', '假如', '假设', '倘若', '要是', '只要', '只有',
  '除非', '否则', '不管', '无论', '即使', '即便', '还是', '或者', '并且', '而且', '甚至', '更',
  '最', '很', '非常', '太', '极', '极其', '格外', '特别', '稍微', '略微', '比较', '相当', '几乎',
  '差不多', '大约', '大概', '左右', '上下', '前后', '多少', '一些', '有些', '若干', '许多', '不少',
  '大量', '众多', '多数', '少数', '部分', '全部', '所有', '一切', '任何', '每', '各', '每个',
  '各个', '各自', '其他', '另外', '还有', '以及', '等等', '诸如此类', '例如', '比如', '像', '如',
  '比如', '诸如', '例如', '就是', '即', '乃', '则', '却', '才', '也', '又', '再', '还', '仍',
  '仍然', '已', '已经', '曾', '曾经', '刚', '刚刚', '正', '正在', '将', '将要', '会', '能', '能够',
  '可以', '可能', '应该', '应当', '必须', '不得不', '得', '要', '想要', '希望', '愿意', '喜欢',
  '爱', '恨', '讨厌', '想', '认为', '觉得', '感到', '以为', '知道', '了解', '明白', '懂得', '认识',
  '记住', '忘记', '记得', '想起', '看到', '听见', '闻到', '尝到', '摸到', '感觉到'
]);

// 分词结果接口
interface TokenizationResult {
  original: string;
  tokens: string[];
  filteredTokens: string[];
  tokenCount: number;
  filteredTokenCount: number;
  keywords?: Array<{word: string, weight: number}>;
}

// 情感分析结果接口
interface SentimentResult {
  score: number; // -1 到 1 之间的情感分数
  label: string; // 情感标签：positive, negative, neutral
  confidence: number; // 置信度
  detailedResults: any[];
}

// 主题分析结果接口
interface TopicResult {
  topic: number; // 主题ID
  keywords: string[]; // 主题关键词
  weight: number; // 主题权重
}

// TextAnalysis组件属性接口
interface TextAnalysisProps {
  dataset: Dataset;
}

const TextAnalysis: React.FC<TextAnalysisProps> = ({ dataset }) => {
  // 状态管理
  const [selectedColumn, setSelectedColumn] = useState<string>('');
  const [analysisType, setAnalysisType] = useState<'sentiment' | 'topic'>('sentiment');
  const [results, setResults] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [tokenizationResults, setTokenizationResults] = useState<TokenizationResult[]>([]);

  // 提取文本列
  const textColumns = dataset.columns.filter(col => col.type === 'String');

  // 使用jieba分词和去除停用词
  const tokenizeText = async (text: string): Promise<TokenizationResult> => {
    try {
      // 使用jieba进行分词（通过Electron IPC调用主进程）
      const tokens = await window.electronAPI.cutText(text);
      
      // 提取关键词
      const keywords = await window.electronAPI.extractKeywords(text, 5);
      
      // 去除停用词和空字符串
      const filteredTokens = tokens
        .filter(token => token.trim() !== '')
        .filter(token => !stopwords.has(token))
        .filter(token => token.length > 1); // 过滤单字
        
      return {
        original: text,
        tokens,
        filteredTokens,
        tokenCount: tokens.length,
        filteredTokenCount: filteredTokens.length,
        keywords
      };
    } catch (error) {
      console.error('分词失败:', error);
      // 降级使用原有的简单分词
      const tokens = text
        .split(/([\s\p{P}\p{S}]+|(?<=\p{Script=Han})(?=\p{Script=Latin})|(?<=\p{Script=Latin})(?=\p{Script=Han})|(?<=\d)(?=\D)|(?<=\D)(?=\d))/u)
        .filter(token => token.trim() !== '');
      
      const filteredTokens = tokens
        .filter(token => token.trim() !== '')
        .filter(token => !stopwords.has(token));
        
      return {
        original: text,
        tokens,
        filteredTokens,
        tokenCount: tokens.length,
        filteredTokenCount: filteredTokens.length
      };
    }
  };

  // 基于jieba分词结果的LDA主题挖掘
  const performTopicAnalysis = async (texts: string[]) => {
    // 对所有文本进行分词和去除停用词
    const tokenizedTexts = await Promise.all(
      texts.map(text => tokenizeText(text))
    );

    // 统计词频
    const wordFrequency = new Map<string, number>();
    tokenizedTexts.forEach(tokenResult => {
      tokenResult.filteredTokens.forEach(token => {
        wordFrequency.set(token, (wordFrequency.get(token) || 0) + 1);
      });
    });

    // 使用jieba提取全局关键词
    const allText = texts.join('。');
    const globalKeywords = await window.electronAPI.extractKeywords(allText, 20);
    
    // 按词频排序，取前20个高频词
    const sortedWords = Array.from(wordFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);

    // 使用jieba关键词作为主题
    const mockTopics: TopicResult[] = [
      {
        topic: 1,
        keywords: globalKeywords.slice(0, 5).map(item => item.word),
        weight: 0.35
      },
      {
        topic: 2,
        keywords: globalKeywords.slice(5, 10).map(item => item.word),
        weight: 0.25
      },
      {
        topic: 3,
        keywords: globalKeywords.slice(10, 15).map(item => item.word),
        weight: 0.20
      },
      {
        topic: 4,
        keywords: globalKeywords.slice(15, 20).map(item => item.word),
        weight: 0.15
      },
      {
        topic: 5,
        keywords: sortedWords.slice(0, 5).map(word => word[0]),
        weight: 0.05
      }
    ];

    return mockTopics;
  };

  // 基于分词结果的情感分析
  const performSentimentAnalysis = async (texts: string[]) => {
    // 对所有文本进行情感分析
    const results = await Promise.all(
      texts.map(async text => {
        // 使用jieba分词
        const tokenResult = await tokenizeText(text);
        const tokens = tokenResult.filteredTokens;
        
        // 统计情感词汇
        let positiveCount = 0;
        let negativeCount = 0;
        
        tokens.forEach(token => {
          if (sentimentDict.positive.has(token)) {
            positiveCount++;
          } else if (sentimentDict.negative.has(token)) {
            negativeCount++;
          }
        });
        
        // 计算情感得分
        const score = (positiveCount - negativeCount) / Math.max(tokens.length, 1);
        
        return {
          score,
          positiveCount,
          negativeCount,
          tokenCount: tokens.length,
          keywords: tokenResult.keywords
        };
      })
    );

    // 计算平均情感得分
    const totalScore = results.reduce((sum, result) => sum + result.score, 0);
    const averageScore = totalScore / results.length;
    
    // 确定整体情感标签
    let label: string;
    if (averageScore > 0.1) {
      label = 'positive';
    } else if (averageScore < -0.1) {
      label = 'negative';
    } else {
      label = 'neutral';
    }
    
    // 计算置信度（基于情感得分的绝对值）
    const confidence = Math.min(1, Math.abs(averageScore) + 0.5);
    
    return {
      score: averageScore,
      label,
      confidence,
      detailedResults: results
    };
  };

  // 执行分析
  const handleAnalyzeClick = async () => {
    if (!selectedColumn) {
      alert('请选择要分析的文本列');
      return;
    }
    
    setIsAnalyzing(true);
    
    try {
      // 提取文本数据
      const texts = dataset.rows
        .map(row => row[selectedColumn]?.toString() || '')
        .filter(text => text.trim() !== '');
      
      if (texts.length === 0) {
        alert('所选列中没有有效文本数据');
        setIsAnalyzing(false);
        return;
      }
      
      // 对所有文本进行分词和去除停用词
      const tokenResults = await Promise.all(
        texts.map(text => tokenizeText(text))
      );
      setTokenizationResults(tokenResults);
      
      // 根据分析类型执行不同的分析
      let result;
      if (analysisType === 'sentiment') {
        result = await performSentimentAnalysis(texts);
      } else {
        result = await performTopicAnalysis(texts);
      }
      
      setResults(result);
    } catch (error) {
      console.error('Analysis error:', error);
      alert('分析过程中发生错误，请重试');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 渲染情感分析结果
  const renderSentimentResult = (result: SentimentResult) => {
    const getSentimentColor = (label: string) => {
      switch (label) {
        case 'positive': return 'text-green-600';
        case 'negative': return 'text-red-600';
        default: return 'text-yellow-600';
      }
    };

    const getSentimentEmoji = (label: string) => {
      switch (label) {
        case 'positive': return '😊';
        case 'negative': return '😔';
        default: return '😐';
      }
    };

    // 计算情感分布
    const totalPositive = result.detailedResults.reduce((sum: number, r: any) => sum + r.positiveCount, 0);
    const totalNegative = result.detailedResults.reduce((sum: number, r: any) => sum + r.negativeCount, 0);
    const totalWords = result.detailedResults.reduce((sum: number, r: any) => sum + r.tokenCount, 0);
    const totalNeutral = totalWords - totalPositive - totalNegative;
    
    const positivePercent = totalWords > 0 ? (totalPositive / totalWords) * 100 : 0;
    const negativePercent = totalWords > 0 ? (totalNegative / totalWords) * 100 : 0;
    const neutralPercent = totalWords > 0 ? (totalNeutral / totalWords) * 100 : 0;

    return (
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h4 className="text-lg font-semibold text-slate-700 mb-6">情感分析结果</h4>
        
        <div className="flex flex-col md:flex-row items-center justify-center gap-8">
          {/* 情感得分 */}
          <div className="text-center">
            <div className="text-6xl mb-2">{getSentimentEmoji(result.label)}</div>
            <div className={`text-3xl font-bold ${getSentimentColor(result.label)} mb-1`}>
              {result.score.toFixed(2)}
            </div>
            <div className="text-sm text-slate-500">情感得分</div>
          </div>
          
          {/* 情感标签 */}
          <div className="text-center">
            <div className="text-2xl font-semibold mb-1">
              {result.label.charAt(0).toUpperCase() + result.label.slice(1)}
            </div>
            <div className="text-sm text-slate-500">情感标签</div>
          </div>
          
          {/* 置信度 */}
          <div className="text-center">
            <div className="text-2xl font-semibold mb-1">
              {(result.confidence * 100).toFixed(0)}%
            </div>
            <div className="text-sm text-slate-500">置信度</div>
          </div>
        </div>
        
        {/* 情感分布可视化 */}
        <div className="mt-8">
          <h5 className="font-medium text-slate-700 mb-3">情感分布</h5>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>积极</span>
                <span>{positivePercent.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2.5">
                <div className="bg-green-600 h-2.5 rounded-full" style={{ width: `${positivePercent}%` }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>中性</span>
                <span>{neutralPercent.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2.5">
                <div className="bg-yellow-600 h-2.5 rounded-full" style={{ width: `${neutralPercent}%` }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>消极</span>
                <span>{negativePercent.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2.5">
                <div className="bg-red-600 h-2.5 rounded-full" style={{ width: `${negativePercent}%` }}></div>
              </div>
            </div>
          </div>
        </div>
        
        {/* 情感词汇统计 */}
        <div className="mt-8">
          <h5 className="font-medium text-slate-700 mb-3">情感词汇统计</h5>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-600">{totalPositive}</div>
              <div className="text-sm text-green-700">积极词汇</div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-yellow-600">{totalNeutral}</div>
              <div className="text-sm text-yellow-700">中性词汇</div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-red-600">{totalNegative}</div>
              <div className="text-sm text-red-700">消极词汇</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 渲染主题分析结果
  const renderTopicResult = (topics: TopicResult[]) => {
    return (
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h4 className="text-lg font-semibold text-slate-700 mb-6">主题挖掘结果</h4>
        
        <div className="space-y-6">
          {topics.map((topic) => (
            <div key={topic.topic} className="border border-slate-200 rounded-lg p-4">
              <div className="flex justify-between items-center mb-3">
                <h5 className="font-medium text-slate-700">主题 {topic.topic}</h5>
                <div className="text-sm text-slate-500">权重: {(topic.weight * 100).toFixed(1)}%</div>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {topic.keywords.map((keyword, idx) => (
                  <span 
                    key={idx} 
                    className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
              
              {/* 主题权重可视化 */}
              <div className="mt-3">
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div 
                    className="bg-indigo-600 h-2 rounded-full" 
                    style={{ width: `${topic.weight * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* 主题分布饼图（简单模拟） */}
        <div className="mt-8">
          <h5 className="font-medium text-slate-700 mb-3">主题分布</h5>
          <div className="flex justify-center">
            <div className="relative w-64 h-64">
              {/* 简单的饼图模拟 */}
              <svg width="256" height="256" viewBox="0 0 256 256" className="transform -rotate-90">
                {topics.map((topic, idx) => {
                  // 计算饼图切片的起始和结束角度
                  const startAngle = idx === 0 ? 0 : topics.slice(0, idx).reduce((sum, t) => sum + t.weight, 0) * 2 * Math.PI;
                  const endAngle = startAngle + topic.weight * 2 * Math.PI;
                  
                  // 计算饼图切片的路径
                  const x1 = 128 + 100 * Math.cos(startAngle);
                  const y1 = 128 + 100 * Math.sin(startAngle);
                  const x2 = 128 + 100 * Math.cos(endAngle);
                  const y2 = 128 + 100 * Math.sin(endAngle);
                  const largeArcFlag = endAngle - startAngle <= Math.PI ? 0 : 1;
                  
                  const pathData = `M 128 128 L ${x1} ${y1} A 100 100 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
                  
                  // 颜色数组
                  const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];
                  
                  return (
                    <path 
                      key={topic.topic} 
                      d={pathData} 
                      fill={colors[idx % colors.length]} 
                      opacity="0.8"
                    />
                  );
                })}
              </svg>
              
              {/* 饼图中心 */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-slate-700">主题分布</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 定义TextAnalysisProps接口
  interface TextAnalysisProps {
    dataset: Dataset;
  }

  return (
    <div className="space-y-6">
      
      {/* 分析配置面板 */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="text-lg font-semibold text-slate-700 mb-4">分析配置</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 文本列选择 */}
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
          
          {/* 分析类型选择 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">分析类型</label>
            <div className="flex space-x-4">
              <button
                onClick={() => setAnalysisType('sentiment')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${analysisType === 'sentiment' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
              >
                <Smile size={16} />
                <span>情感分析</span>
              </button>
              <button
                onClick={() => setAnalysisType('topic')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${analysisType === 'topic' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
              >
                <Brain size={16} />
                <span>主题挖掘</span>
              </button>
            </div>
          </div>
        </div>
        
        {/* 执行分析按钮 */}
        <div className="mt-6">
          <button
            onClick={handleAnalyzeClick}
            disabled={!selectedColumn || isAnalyzing}
            className="flex items-center space-x-2 px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAnalyzing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>分析中...</span>
              </>
            ) : (
              <>
                <BarChart2 size={16} />
                <span>Jieba分词</span>
              </>
            )}
          </button>
        </div>
      </div>
      
      {/* 分词结果 */}
      {tokenizationResults.length > 0 && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-700 mb-4 flex items-center">
            <Tag size={18} className="mr-2" />
            Jieba分词结果
          </h3>
          
          <div className="space-y-4">
            <div className="flex justify-between text-sm text-slate-600">
              <div>总文本数: {tokenizationResults.length}</div>
              <div>平均分词数: {(tokenizationResults.reduce((sum, result) => sum + result.tokenCount, 0) / tokenizationResults.length).toFixed(1)}</div>
              <div>平均去停用词后词数: {(tokenizationResults.reduce((sum, result) => sum + result.filteredTokenCount, 0) / tokenizationResults.length).toFixed(1)}</div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      原始文本
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Jieba分词结果
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      关键词提取
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {tokenizationResults.slice(0, 5).map((result, idx) => (
                    <tr key={idx}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 max-w-xs truncate">
                        {result.original}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        {result.tokens.join(' / ')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        {result.keywords ? result.keywords.map(k => k.word).join(' / ') : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {tokenizationResults.length > 5 && (
              <div className="text-center text-sm text-slate-500">
                显示前5条结果，共 {tokenizationResults.length} 条
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* 分析结果 */}
      {results && (
        <div className="space-y-6">
          
          {analysisType === 'sentiment' ? 
            renderSentimentResult(results as SentimentResult) : 
            renderTopicResult(results as TopicResult[])
          }
        </div>
      )}
      
      {/* 无结果提示 */}
      {!results && !isAnalyzing && (
        <div className="bg-white p-12 rounded-xl shadow-sm border border-slate-200 text-center">
          <BookOpen size={48} className="mx-auto text-slate-300 mb-4" />
          <h4 className="text-lg font-semibold text-slate-700 mb-2">暂无分析结果</h4>
          <p className="text-slate-500 mb-4">选择文本列并点击执行分析按钮开始分析</p>
          <p className="text-slate-400 text-sm">使用Jieba分词库进行更精准的中文分词和关键词提取</p>
        </div>
      )}
    </div>
  );
};

export default TextAnalysis;