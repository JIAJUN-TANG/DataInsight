import React, { useState, useEffect } from 'react';
import { Dataset, DataRow } from '../types';
import { ChevronLeft, ChevronRight, Trash2, AlertTriangle, RefreshCw, X, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';

interface DataGridProps {
  dataset: Dataset;
  onDatasetChange: (dataset: Dataset) => void;
}

const DataGrid: React.FC<DataGridProps> = ({ dataset, onDatasetChange }) => {
  const [page, setPage] = useState(0);
  const pageSize = 20;
  const totalPages = Math.ceil(dataset.rows.length / pageSize);

  // 数据清洗相关状态
  const [detectedIssues, setDetectedIssues] = useState({
    allNullColumns: [] as string[],
    allSameValueColumns: [] as string[],
    duplicateRows: 0,
  });
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [showCleaningPanel, setShowCleaningPanel] = useState(false);

  const paginatedData = dataset.rows.slice(page * pageSize, (page + 1) * pageSize);

  // 检测数据问题
  const detectDataIssues = () => {
    const allNullColumns: string[] = [];
    const allSameValueColumns: string[] = [];
    const rowValues = new Set<string>();
    let duplicateRows = 0;

    // 检测列问题
    dataset.columns.forEach(column => {
      const columnValues = dataset.rows.map(row => row[column.name]);
      const nullCount = columnValues.filter(val => val === null).length;
      const uniqueValues = new Set(columnValues).size;

      // 全null列
      if (nullCount === dataset.rows.length) {
        allNullColumns.push(column.name);
      }

      // 全相同值列
      if (uniqueValues === 1) {
        allSameValueColumns.push(column.name);
      }
    });

    // 检测重复行
    dataset.rows.forEach(row => {
      const rowStr = JSON.stringify(row);
      if (rowValues.has(rowStr)) {
        duplicateRows++;
      } else {
        rowValues.add(rowStr);
      }
    });

    setDetectedIssues({
      allNullColumns,
      allSameValueColumns,
      duplicateRows,
    });
  };

  // 初始化检测
  useEffect(() => {
    detectDataIssues();
  }, [dataset]);

  // 一键清洗功能
  const handleCleanData = () => {
    let cleanedRows = [...dataset.rows];
    let cleanedColumns = [...dataset.columns];

    // 1. 去除全null列和全相同值列
    const columnsToRemove = [...detectedIssues.allNullColumns, ...detectedIssues.allSameValueColumns];
    cleanedColumns = cleanedColumns.filter(col => !columnsToRemove.includes(col.name));

    // 2. 去除重复行
    const uniqueRows = new Map<string, DataRow>();
    cleanedRows.forEach(row => {
      const rowStr = JSON.stringify(row);
      if (!uniqueRows.has(rowStr)) {
        uniqueRows.set(rowStr, row);
      }
    });
    cleanedRows = Array.from(uniqueRows.values());

    // 3. 更新数据集
    const updatedDataset: Dataset = {
      ...dataset,
      rows: cleanedRows,
      columns: cleanedColumns,
      rowCount: cleanedRows.length,
    };

    onDatasetChange(updatedDataset);
    detectDataIssues(); // 重新检测
  };

  // 删除选中的列
  const handleDeleteSelectedColumns = () => {
    if (selectedColumns.length === 0) return;

    const cleanedColumns = dataset.columns.filter(col => !selectedColumns.includes(col.name));
    const cleanedRows = dataset.rows.map(row => {
      const newRow: DataRow = {};
      cleanedColumns.forEach(col => {
        newRow[col.name] = row[col.name];
      });
      return newRow;
    });

    const updatedDataset: Dataset = {
      ...dataset,
      rows: cleanedRows,
      columns: cleanedColumns,
      rowCount: cleanedRows.length,
    };

    onDatasetChange(updatedDataset);
    setSelectedColumns([]);
    detectDataIssues(); // 重新检测
  };

  // 删除选中的行
  const handleDeleteSelectedRows = () => {
    if (selectedRows.length === 0) return;

    const cleanedRows = dataset.rows.filter((_, idx) => !selectedRows.includes(idx));

    const updatedDataset: Dataset = {
      ...dataset,
      rows: cleanedRows,
      rowCount: cleanedRows.length,
    };

    onDatasetChange(updatedDataset);
    setSelectedRows([]);
    detectDataIssues(); // 重新检测
  };

  // 切换列选择
  const toggleColumnSelection = (columnName: string) => {
    setSelectedColumns(prev => {
      if (prev.includes(columnName)) {
        return prev.filter(col => col !== columnName);
      } else {
        return [...prev, columnName];
      }
    });
  };

  // 切换行选择
  const toggleRowSelection = (rowIndex: number) => {
    const absoluteIndex = page * pageSize + rowIndex;
    setSelectedRows(prev => {
      if (prev.includes(absoluteIndex)) {
        return prev.filter(idx => idx !== absoluteIndex);
      } else {
        return [...prev, absoluteIndex];
      }
    });
  };

  // 选择所有行
  const selectAllRows = () => {
    const startIndex = page * pageSize;
    const endIndex = Math.min(startIndex + pageSize, dataset.rows.length);
    const allPageRows = Array.from({ length: endIndex - startIndex }, (_, i) => startIndex + i);
    setSelectedRows(prev => {
      const hasAllSelected = allPageRows.every(idx => prev.includes(idx));
      if (hasAllSelected) {
        return prev.filter(idx => !allPageRows.includes(idx));
      } else {
        return [...prev, ...allPageRows.filter(idx => !prev.includes(idx))];
      }
    });
  };

  const hasIssues = detectedIssues.allNullColumns.length > 0 ||
    detectedIssues.allSameValueColumns.length > 0 ||
    detectedIssues.duplicateRows > 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
      {/* 顶部工具栏 - Glassmorphism Style */}
      <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center space-x-4">
          <div>
            <h3 className="font-bold text-slate-800 text-lg">数据预览</h3>
            <p className="text-xs text-slate-500 mt-0.5">共 {dataset.rowCount.toLocaleString()} 行，{dataset.columns.length} 列</p>
          </div>

          <div className="h-8 w-px bg-slate-200 mx-2"></div>

          {/* 数据清洗按钮 */}
          <button
            onClick={() => setShowCleaningPanel(!showCleaningPanel)}
            className={`
              flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 font-medium text-sm
              ${showCleaningPanel
                ? 'bg-indigo-100 text-indigo-700 ring-2 ring-indigo-500/20'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-indigo-300 hover:text-indigo-600'
              }
            `}
          >
            <Sparkles size={16} className={showCleaningPanel ? "text-indigo-600" : "text-slate-400"} />
            <span>数据健康</span>
            {hasIssues && (
              <span className="flex h-2 w-2 rounded-full bg-amber-500 ml-1"></span>
            )}
          </button>

          {/* 批量操作按钮组 */}
          {(selectedColumns.length > 0 || selectedRows.length > 0) && (
            <div className="flex items-center space-x-2 animate-in fade-in slide-in-from-left-4 duration-200">
              {selectedColumns.length > 0 && (
                <button
                  onClick={handleDeleteSelectedColumns}
                  className="flex items-center space-x-2 px-3 py-2 bg-red-50 text-red-600 border border-red-100 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
                >
                  <Trash2 size={16} />
                  <span>删除 {selectedColumns.length} 列</span>
                </button>
              )}
              {selectedRows.length > 0 && (
                <button
                  onClick={handleDeleteSelectedRows}
                  className="flex items-center space-x-2 px-3 py-2 bg-red-50 text-red-600 border border-red-100 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
                >
                  <Trash2 size={16} />
                  <span>删除 {selectedRows.length} 行</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* 分页控制 */}
        <div className="flex items-center bg-slate-50 rounded-lg p-1 border border-slate-200">
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="p-1.5 rounded-md hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:shadow-none transition-all text-slate-600"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-xs font-medium text-slate-600 px-3 min-w-[80px] text-center">
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
            disabled={page === totalPages - 1}
            className="p-1.5 rounded-md hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:shadow-none transition-all text-slate-600"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* 数据健康仪表盘 */}
      {showCleaningPanel && (
        <div className="bg-slate-50/80 border-b border-slate-200 p-6 animate-in slide-in-from-top-4 duration-300">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h4 className="text-lg font-bold text-slate-800 flex items-center">
                <Sparkles size={20} className="mr-2 text-indigo-500" />
                数据健康概览
              </h4>
              <p className="text-sm text-slate-500 mt-1">自动检测并建议修复的数据质量问题</p>
            </div>
            <button
              onClick={() => setShowCleaningPanel(false)}
              className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 全Null列卡片 */}
            <div className={`
              rounded-xl p-5 border transition-all duration-200
              ${detectedIssues.allNullColumns.length > 0
                ? 'bg-white border-amber-200 shadow-sm'
                : 'bg-white/50 border-slate-200 opacity-70'
              }
            `}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <div className={`p-2 rounded-lg ${detectedIssues.allNullColumns.length > 0 ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'}`}>
                    <AlertCircle size={20} />
                  </div>
                  <span className="font-semibold text-slate-700">空值列</span>
                </div>
                <span className={`text-2xl font-bold ${detectedIssues.allNullColumns.length > 0 ? 'text-amber-600' : 'text-slate-300'}`}>
                  {detectedIssues.allNullColumns.length}
                </span>
              </div>
              {detectedIssues.allNullColumns.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs text-slate-500">检测到以下列完全为空：</p>
                  <div className="flex flex-wrap gap-1">
                    {detectedIssues.allNullColumns.slice(0, 3).map(col => (
                      <span key={col} className="px-2 py-1 bg-amber-50 text-amber-700 text-xs rounded border border-amber-100">
                        {col}
                      </span>
                    ))}
                    {detectedIssues.allNullColumns.length > 3 && (
                      <span className="px-2 py-1 text-xs text-slate-400">+{detectedIssues.allNullColumns.length - 3}</span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center text-green-600 text-sm mt-2">
                  <CheckCircle2 size={14} className="mr-1" />
                  <span>未发现空值列</span>
                </div>
              )}
            </div>

            {/* 全相同值列卡片 */}
            <div className={`
              rounded-xl p-5 border transition-all duration-200
              ${detectedIssues.allSameValueColumns.length > 0
                ? 'bg-white border-blue-200 shadow-sm'
                : 'bg-white/50 border-slate-200 opacity-70'
              }
            `}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <div className={`p-2 rounded-lg ${detectedIssues.allSameValueColumns.length > 0 ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                    <AlertTriangle size={20} />
                  </div>
                  <span className="font-semibold text-slate-700">单一值列</span>
                </div>
                <span className={`text-2xl font-bold ${detectedIssues.allSameValueColumns.length > 0 ? 'text-blue-600' : 'text-slate-300'}`}>
                  {detectedIssues.allSameValueColumns.length}
                </span>
              </div>
              {detectedIssues.allSameValueColumns.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs text-slate-500">检测到以下列包含单一重复值：</p>
                  <div className="flex flex-wrap gap-1">
                    {detectedIssues.allSameValueColumns.slice(0, 3).map(col => (
                      <span key={col} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded border border-blue-100">
                        {col}
                      </span>
                    ))}
                    {detectedIssues.allSameValueColumns.length > 3 && (
                      <span className="px-2 py-1 text-xs text-slate-400">+{detectedIssues.allSameValueColumns.length - 3}</span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center text-green-600 text-sm mt-2">
                  <CheckCircle2 size={14} className="mr-1" />
                  <span>未发现单一值列</span>
                </div>
              )}
            </div>

            {/* 重复行卡片 */}
            <div className={`
              rounded-xl p-5 border transition-all duration-200
              ${detectedIssues.duplicateRows > 0
                ? 'bg-white border-purple-200 shadow-sm'
                : 'bg-white/50 border-slate-200 opacity-70'
              }
            `}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <div className={`p-2 rounded-lg ${detectedIssues.duplicateRows > 0 ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-400'}`}>
                    <RefreshCw size={20} />
                  </div>
                  <span className="font-semibold text-slate-700">重复行</span>
                </div>
                <span className={`text-2xl font-bold ${detectedIssues.duplicateRows > 0 ? 'text-purple-600' : 'text-slate-300'}`}>
                  {detectedIssues.duplicateRows}
                </span>
              </div>
              {detectedIssues.duplicateRows > 0 ? (
                <p className="text-xs text-slate-500 mt-2">
                  检测到 {detectedIssues.duplicateRows} 行完全重复的数据记录。建议移除以保证数据准确性。
                </p>
              ) : (
                <div className="flex items-center text-green-600 text-sm mt-2">
                  <CheckCircle2 size={14} className="mr-1" />
                  <span>未发现重复行</span>
                </div>
              )}
            </div>
          </div>

          {/* 底部操作栏 */}
          <div className="mt-6 flex justify-end items-center border-t border-slate-200 pt-4">
            {hasIssues ? (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-slate-500">
                  共发现 <span className="font-bold text-slate-800">{detectedIssues.allNullColumns.length + detectedIssues.allSameValueColumns.length + (detectedIssues.duplicateRows > 0 ? 1 : 0)}</span> 类问题
                </span>
                <button
                  onClick={handleCleanData}
                  className="flex items-center space-x-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm hover:shadow transition-all font-medium"
                >
                  <Sparkles size={18} />
                  <span>一键智能清洗</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center text-green-600 bg-green-50 px-4 py-2 rounded-lg border border-green-100">
                <CheckCircle2 size={18} className="mr-2" />
                <span className="font-medium">当前数据质量良好，无需清洗</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 数据表格 */}
      <div className="overflow-auto flex-1 relative">
        <table className="w-full text-sm text-left text-slate-600">
          <thead className="text-xs text-slate-500 uppercase bg-slate-50/80 backdrop-blur sticky top-0 z-0">
            <tr>
              {/* 行选择列 */}
              <th className="px-4 py-3 font-semibold whitespace-nowrap border-b border-slate-200 w-12 text-center">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 transition-all cursor-pointer"
                  onChange={selectAllRows}
                  checked={paginatedData.every((_, idx) => selectedRows.includes(page * pageSize + idx))}
                />
              </th>

              {/* 数据列 */}
              {dataset.columns.map((col) => {
                const isAllNull = detectedIssues.allNullColumns.includes(col.name);
                const isAllSameValue = detectedIssues.allSameValueColumns.includes(col.name);
                const hasIssue = isAllNull || isAllSameValue;

                return (
                  <th
                    key={col.name}
                    className={`
                      px-6 py-3 font-semibold whitespace-nowrap border-b border-slate-200 min-w-[150px] transition-colors
                      ${hasIssue ? 'bg-amber-50/50' : ''}
                    `}
                  >
                    <div className="flex items-center justify-between group">
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          onChange={() => toggleColumnSelection(col.name)}
                          checked={selectedColumns.includes(col.name)}
                        />
                        <div className="flex flex-col">
                          <span className={`text-slate-700 ${hasIssue ? 'text-amber-700' : ''}`}>{col.name}</span>
                          <span className="text-[10px] text-slate-400 font-normal normal-case bg-slate-100 px-1.5 py-0.5 rounded w-fit mt-0.5">
                            {col.type}
                          </span>
                        </div>
                      </div>

                      {hasIssue && (
                        <div className="relative group/tooltip">
                          <AlertTriangle
                            size={16}
                            className="text-amber-500 cursor-help"
                          />
                          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover/tooltip:block bg-slate-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-20">
                            {isAllNull ? '全空值列' : '单一值列'}
                          </div>
                        </div>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {paginatedData.map((row, idx) => {
              const absoluteIndex = page * pageSize + idx;
              const isSelected = selectedRows.includes(absoluteIndex);

              return (
                <tr
                  key={idx}
                  className={`
                    transition-colors duration-150
                    ${isSelected ? 'bg-indigo-50/60' : 'bg-white hover:bg-slate-50'}
                  `}
                >
                  {/* 行选择 */}
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      onChange={() => toggleRowSelection(idx)}
                      checked={isSelected}
                    />
                  </td>

                  {/* 数据单元格 */}
                  {dataset.columns.map((col) => (
                    <td
                      key={`${idx}-${col.name}`}
                      className={`
                        px-6 py-3 whitespace-nowrap truncate max-w-xs text-slate-600
                        ${(detectedIssues.allNullColumns.includes(col.name) || detectedIssues.allSameValueColumns.includes(col.name)) ? 'bg-amber-50/30' : ''}
                      `}
                    >
                      {row[col.name] !== null && row[col.name] !== undefined && row[col.name] !== '' ? (
                        <span>{String(row[col.name])}</span>
                      ) : (
                        <span className="text-slate-300 italic text-xs">null</span>
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DataGrid;