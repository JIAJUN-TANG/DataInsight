import React, { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, ScatterChart, Scatter, PieChart, Pie, Cell
} from 'recharts';
import { Dataset, ColumnType } from '../types';
import { Trash2, Settings, Plus, Save, X } from 'lucide-react';

// 图表类型枚举
export enum ChartType {
  Bar = 'bar',
  Line = 'line',
  Scatter = 'scatter',
  Pie = 'pie'
}

// 图表配置接口
interface ChartConfig {
  id: string;
  type: ChartType;
  title: string;
  xColumn?: string;
  yColumn?: string;
  valueColumn?: string;
  categoryColumn?: string;
}

interface ChartsProps {
  dataset: Dataset;
}

const Charts: React.FC<ChartsProps> = ({ dataset }) => {
  // 识别数据列类型
  const numericCols = dataset.columns.filter(c => c.type === ColumnType.Number);
  const categoricalCols = dataset.columns.filter(c => c.type === ColumnType.String);
  const allCols = dataset.columns;

  // 图表配置状态
  const [charts, setCharts] = useState<ChartConfig[]>([
    {
      id: 'chart-1',
      type: ChartType.Bar,
      title: '分布图表',
      categoryColumn: categoricalCols[0]?.name,
      valueColumn: numericCols[0]?.name
    },
    {
      id: 'chart-2',
      type: ChartType.Line,
      title: '趋势图表',
      xColumn: allCols[0]?.name,
      yColumn: numericCols[0]?.name
    },
    {
      id: 'chart-3',
      type: ChartType.Scatter,
      title: '散点图表',
      xColumn: numericCols[0]?.name,
      yColumn: numericCols[1]?.name
    }
  ]);

  // 当前正在编辑的图表ID
  const [editingChartId, setEditingChartId] = useState<string | null>(null);

  // 新增图表
  const addChart = () => {
    const newChart: ChartConfig = {
      id: `chart-${Date.now()}`,
      type: ChartType.Bar,
      title: '新图表',
      categoryColumn: categoricalCols[0]?.name,
      valueColumn: numericCols[0]?.name
    };
    setCharts([...charts, newChart]);
    setEditingChartId(newChart.id);
  };

  // 删除图表
  const deleteChart = (chartId: string) => {
    setCharts(charts.filter(chart => chart.id !== chartId));
    if (editingChartId === chartId) {
      setEditingChartId(null);
    }
  };

  // 更新图表配置
  const updateChartConfig = (chartId: string, updates: Partial<ChartConfig>) => {
    setCharts(charts.map(chart => 
      chart.id === chartId ? { ...chart, ...updates } : chart
    ));
  };

  // 生成图表数据
  const generateChartData = (config: ChartConfig) => {
    switch (config.type) {
      case ChartType.Bar:
      case ChartType.Line:
        if (config.xColumn && config.yColumn) {
          return dataset.rows.slice(0, 500).map(row => ({
            x: row[config.xColumn],
            y: Number(row[config.yColumn])
          }));
        }
        if (config.categoryColumn && config.valueColumn) {
          // 聚合数据
          const categoryMap = new Map<any, number>();
          dataset.rows.forEach(row => {
            const category = row[config.categoryColumn];
            const value = Number(row[config.valueColumn]);
            if (!isNaN(value)) {
              categoryMap.set(category, (categoryMap.get(category) || 0) + value);
            }
          });
          return Array.from(categoryMap.entries()).map(([name, value]) => ({ name, value }));
        }
        break;

      case ChartType.Scatter:
        if (config.xColumn && config.yColumn) {
          return dataset.rows.slice(0, 500).map(row => ({
            x: Number(row[config.xColumn]),
            y: Number(row[config.yColumn])
          }));
        }
        break;

      case ChartType.Pie:
        if (config.categoryColumn && config.valueColumn) {
          // 聚合数据
          const categoryMap = new Map<any, number>();
          dataset.rows.forEach(row => {
            const category = row[config.categoryColumn];
            const value = Number(row[config.valueColumn]);
            if (!isNaN(value)) {
              categoryMap.set(category, (categoryMap.get(category) || 0) + value);
            }
          });
          return Array.from(categoryMap.entries()).map(([name, value]) => ({ name, value }));
        }
        break;
    }
    return [];
  };

  // 图表配置UI组件
  const ChartConfigPanel: React.FC<{ 
    config: ChartConfig; 
    onUpdate: (updates: Partial<ChartConfig>) => void; 
    onClose: () => void;
    numericCols: typeof numericCols;
    categoricalCols: typeof categoricalCols;
    allCols: typeof allCols;
  }> = ({ config, onUpdate, onClose, numericCols, categoricalCols, allCols }) => {
    return (
      <div className="bg-white p-4 rounded-lg shadow-md border border-slate-200">
        <div className="flex justify-between items-center mb-4">
          <h4 className="font-semibold text-slate-700">图表配置</h4>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700">
            <X size={16} />
          </button>
        </div>
        
        <div className="space-y-4">
          {/* 图表标题 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">图表标题</label>
            <input
              type="text"
              value={config.title}
              onChange={(e) => onUpdate({ title: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          
          {/* 图表类型 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">图表类型</label>
            <select
              value={config.type}
              onChange={(e) => onUpdate({ type: e.target.value as ChartType })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value={ChartType.Bar}>柱状图</option>
              <option value={ChartType.Line}>折线图</option>
              <option value={ChartType.Scatter}>散点图</option>
              <option value={ChartType.Pie}>饼图</option>
            </select>
          </div>
          
          {/* 根据图表类型显示不同的配置选项 */}
          {(config.type === ChartType.Bar || config.type === ChartType.Line) && (
            <>
              {/* X轴列 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">X轴列</label>
                <select
                  value={config.xColumn || ''}
                  onChange={(e) => onUpdate({ xColumn: e.target.value || undefined })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">选择X轴列</option>
                  {allCols.map(col => (
                    <option key={col.name} value={col.name}>{col.name} ({col.type})</option>
                  ))}
                </select>
              </div>
              
              {/* Y轴列 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Y轴列</label>
                <select
                  value={config.yColumn || ''}
                  onChange={(e) => onUpdate({ yColumn: e.target.value || undefined })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">选择Y轴列</option>
                  {numericCols.map(col => (
                    <option key={col.name} value={col.name}>{col.name} ({col.type})</option>
                  ))}
                </select>
              </div>
            </>
          )}
          
          {/* 散点图配置 */}
          {config.type === ChartType.Scatter && (
            <>
              {/* X轴列 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">X轴列</label>
                <select
                  value={config.xColumn || ''}
                  onChange={(e) => onUpdate({ xColumn: e.target.value || undefined })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">选择X轴列</option>
                  {numericCols.map(col => (
                    <option key={col.name} value={col.name}>{col.name} ({col.type})</option>
                  ))}
                </select>
              </div>
              
              {/* Y轴列 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Y轴列</label>
                <select
                  value={config.yColumn || ''}
                  onChange={(e) => onUpdate({ yColumn: e.target.value || undefined })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">选择Y轴列</option>
                  {numericCols.map(col => (
                    <option key={col.name} value={col.name}>{col.name} ({col.type})</option>
                  ))}
                </select>
              </div>
            </>
          )}
          
          {/* 柱状图和饼图的分类配置 */}
          {(config.type === ChartType.Bar || config.type === ChartType.Pie) && (
            <>
              {/* 分类列 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">分类列</label>
                <select
                  value={config.categoryColumn || ''}
                  onChange={(e) => onUpdate({ categoryColumn: e.target.value || undefined })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">选择分类列</option>
                  {categoricalCols.map(col => (
                    <option key={col.name} value={col.name}>{col.name} ({col.type})</option>
                  ))}
                </select>
              </div>
              
              {/* 值列 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">值列</label>
                <select
                  value={config.valueColumn || ''}
                  onChange={(e) => onUpdate({ valueColumn: e.target.value || undefined })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">选择值列</option>
                  {numericCols.map(col => (
                    <option key={col.name} value={col.name}>{col.name} ({col.type})</option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  // 渲染单个图表
  const renderChart = (config: ChartConfig) => {
    const data = generateChartData(config);
    const isEditing = editingChartId === config.id;
    const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];

    return (
      <div key={config.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col h-[500px]">
        {/* 图表标题栏 */}
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-lg font-semibold text-slate-700">{config.title}</h4>
          <div className="flex items-center space-x-2">
            {/* 配置按钮 */}
            <button
              onClick={() => setEditingChartId(isEditing ? null : config.id)}
              className="p-2 rounded hover:bg-slate-100 text-slate-600"
              title="配置图表"
            >
              <Settings size={16} />
            </button>
            
            {/* 删除按钮 */}
            <button
              onClick={() => deleteChart(config.id)}
              className="p-2 rounded hover:bg-red-100 text-red-600"
              title="删除图表"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
        
        {/* 图表配置面板 */}
        {isEditing && (
          <div className="mb-4">
            <ChartConfigPanel
              config={config}
              onUpdate={(updates) => updateChartConfig(config.id, updates)}
              onClose={() => setEditingChartId(null)}
              numericCols={numericCols}
              categoricalCols={categoricalCols}
              allCols={allCols}
            />
          </div>
        )}
        
        {/* 图表渲染区域 */}
        <div className="flex-1 w-full min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            {/* 柱状图 */}
            {config.type === ChartType.Bar && (
              <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis 
                  dataKey={config.xColumn ? 'x' : 'name'} 
                  stroke="#64748b" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <YAxis 
                  stroke="#64748b" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <Tooltip 
                  cursor={{ fill: '#f1f5f9' }} 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                />
                <Bar 
                  dataKey={config.yColumn ? 'y' : 'value'} 
                  fill="#6366f1" 
                  radius={[4, 4, 0, 0]} 
                />
              </BarChart>
            )}
            
            {/* 折线图 */}
            {config.type === ChartType.Line && (
              <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis 
                  dataKey={config.xColumn ? 'x' : 'name'} 
                  stroke="#64748b" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <YAxis 
                  stroke="#64748b" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                />
                <Line 
                  type="monotone" 
                  dataKey={config.yColumn ? 'y' : 'value'} 
                  stroke="#8b5cf6" 
                  strokeWidth={2} 
                  dot={false} 
                />
              </LineChart>
            )}
            
            {/* 散点图 */}
            {config.type === ChartType.Scatter && (
              <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  type="number" 
                  dataKey="x" 
                  name={config.xColumn} 
                  stroke="#64748b" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <YAxis 
                  type="number" 
                  dataKey="y" 
                  name={config.yColumn} 
                  stroke="#64748b" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <Tooltip 
                  cursor={{ strokeDasharray: '3 3' }} 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                />
                <Scatter name="Values" data={data} fill="#06b6d4" />
              </ScatterChart>
            )}
            
            {/* 饼图 */}
            {config.type === ChartType.Pie && (
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                />
              </PieChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* 顶部工具栏 */}
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-slate-800">数据可视化</h3>
        <button
          onClick={addChart}
          className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
        >
          <Plus size={16} />
          <span>新增图表</span>
        </button>
      </div>
      
      {/* 图表网格 */}
      {charts.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {charts.map(chart => renderChart(chart))}
        </div>
      ) : (
        <div className="bg-white p-12 rounded-xl shadow-sm border border-slate-200 text-center">
          <Plus size={48} className="mx-auto text-slate-300 mb-4" />
          <h4 className="text-lg font-semibold text-slate-700 mb-2">暂无图表</h4>
          <p className="text-slate-500 mb-4">点击按钮添加第一个图表</p>
        </div>
      )}
    </div>
  );
};

export default Charts;