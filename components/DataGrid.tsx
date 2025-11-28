import React, { useState, useEffect } from 'react';
import { Dataset, DataRow } from '../types';
import { ChevronLeft, ChevronRight, Trash2, AlertTriangle, RefreshCw } from 'lucide-react';

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

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
      {/* 顶部工具栏 */}
      <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
        <div className="flex items-center space-x-4">
          <h3 className="font-semibold text-slate-700">数据预览 ({dataset.rowCount.toLocaleString()} 行)</h3>
          
          {/* 数据清洗按钮 */}
          <button
            onClick={() => setShowCleaningPanel(!showCleaningPanel)}
            className="flex items-center space-x-2 px-3 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors text-sm"
          >
            <AlertTriangle size={16} />
            <span>数据清洗</span>
          </button>

          {/* 删除选中列按钮 */}
          {selectedColumns.length > 0 && (
            <button
              onClick={handleDeleteSelectedColumns}
              className="flex items-center space-x-2 px-3 py-1.5 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors text-sm"
            >
              <Trash2 size={16} />
              <span>删除列 ({selectedColumns.length})</span>
            </button>
          )}

          {/* 删除选中行按钮 */}
          {selectedRows.length > 0 && (
            <button
              onClick={handleDeleteSelectedRows}
              className="flex items-center space-x-2 px-3 py-1.5 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors text-sm"
            >
              <Trash2 size={16} />
              <span>删除行 ({selectedRows.length})</span>
            </button>
          )}
        </div>
        
        {/* 分页控制 */}
        <div className="flex items-center space-x-2">
            <span className="text-sm text-slate-500 mr-2">
                第 {page + 1} 页，共 {totalPages} 页
            </span>
            <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="p-1 rounded hover:bg-slate-200 disabled:opacity-50"
            >
                <ChevronLeft size={20} />
            </button>
            <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page === totalPages - 1}
                className="p-1 rounded hover:bg-slate-200 disabled:opacity-50"
            >
                <ChevronRight size={20} />
            </button>
        </div>
      </div>

      {/* 数据清洗面板 */}
      {showCleaningPanel && (
        <div className="bg-amber-50 border-b border-amber-200 p-4">
          <div className="flex justify-between items-start mb-4">
            <h4 className="font-semibold text-amber-800 flex items-center">
              <AlertTriangle size={18} className="mr-2" />
              数据清洗建议
            </h4>
            <button
              onClick={() => setShowCleaningPanel(false)}
              className="text-amber-600 hover:text-amber-800"
            >
              关闭
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* 全Null列 */}
            <div className="bg-white p-3 rounded border border-amber-200">
              <h5 className="font-medium text-amber-700 mb-2">全Null列 ({detectedIssues.allNullColumns.length})</h5>
              {detectedIssues.allNullColumns.length > 0 ? (
                <ul className="text-sm space-y-1">
                  {detectedIssues.allNullColumns.map(col => (
                    <li key={col} className="flex items-center text-amber-600">
                      <AlertTriangle size={12} className="mr-1" />
                      <span>{col}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-green-600">无</p>
              )}
            </div>
            
            {/* 全相同值列 */}
            <div className="bg-white p-3 rounded border border-amber-200">
              <h5 className="font-medium text-amber-700 mb-2">全相同值列 ({detectedIssues.allSameValueColumns.length})</h5>
              {detectedIssues.allSameValueColumns.length > 0 ? (
                <ul className="text-sm space-y-1">
                  {detectedIssues.allSameValueColumns.map(col => (
                    <li key={col} className="flex items-center text-amber-600">
                      <AlertTriangle size={12} className="mr-1" />
                      <span>{col}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-green-600">无</p>
              )}
            </div>
            
            {/* 重复行 */}
            <div className="bg-white p-3 rounded border border-amber-200">
              <h5 className="font-medium text-amber-700 mb-2">重复行 ({detectedIssues.duplicateRows})</h5>
              {detectedIssues.duplicateRows > 0 ? (
                <p className="text-sm text-amber-600">检测到 {detectedIssues.duplicateRows} 行重复数据</p>
              ) : (
                <p className="text-sm text-green-600">无</p>
              )}
            </div>
          </div>
          
          {/* 一键清洗按钮 */}
          <button
            onClick={handleCleanData}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            disabled={detectedIssues.allNullColumns.length === 0 && detectedIssues.allSameValueColumns.length === 0 && detectedIssues.duplicateRows === 0}
          >
            <RefreshCw size={16} />
            <span>一键清洗</span>
          </button>
        </div>
      )}

      {/* 数据表格 */}
      <div className="overflow-auto flex-1">
        <table className="w-full text-sm text-left text-slate-600">
          <thead className="text-xs text-slate-700 uppercase bg-slate-100 sticky top-0">
            <tr>
              {/* 行选择列 */}
              <th className="px-2 py-3 font-semibold whitespace-nowrap border-b border-slate-200 w-10">
                <input
                  type="checkbox"
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                  onChange={selectAllRows}
                  checked={paginatedData.every((_, idx) => selectedRows.includes(page * pageSize + idx))}
                />
              </th>
              
              {/* 数据列 */}
              {dataset.columns.map((col) => {
                const isAllNull = detectedIssues.allNullColumns.includes(col.name);
                const isAllSameValue = detectedIssues.allSameValueColumns.includes(col.name);
                
                return (
                  <th 
                    key={col.name} 
                    className={`px-6 py-3 font-semibold whitespace-nowrap border-b border-slate-200 relative ${
                      isAllNull || isAllSameValue ? 'bg-amber-100' : ''
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      {/* 列选择 */}
                      <input
                        type="checkbox"
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                        onChange={() => toggleColumnSelection(col.name)}
                        checked={selectedColumns.includes(col.name)}
                      />
                      
                      <div className="flex flex-col">
                        <span>{col.name}</span>
                        <span className="text-[10px] text-slate-400 font-normal normal-case">{col.type}</span>
                      </div>
                      
                      {/* 问题标记 */}
                      {(isAllNull || isAllSameValue) && (
                        <AlertTriangle 
                          size={14} 
                          className="text-amber-600 absolute -top-1 -right-1"
                          aria-label={isAllNull ? '全Null列' : '全相同值列'}
                        />
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          
          <tbody>
            {paginatedData.map((row, idx) => {
              const absoluteIndex = page * pageSize + idx;
              return (
                <tr 
                  key={idx} 
                  className={`bg-white border-b hover:bg-slate-50 ${
                    selectedRows.includes(absoluteIndex) ? 'bg-indigo-50' : ''
                  }`}
                >
                  {/* 行选择 */}
                  <td className="px-2 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                      onChange={() => toggleRowSelection(idx)}
                      checked={selectedRows.includes(absoluteIndex)}
                    />
                  </td>
                  
                  {/* 数据单元格 */}
                  {dataset.columns.map((col) => (
                    <td 
                      key={`${idx}-${col.name}`} 
                      className="px-6 py-4 whitespace-nowrap truncate max-w-xs"
                    >
                      {row[col.name]?.toString() || <span className="text-slate-300 italic">null</span>}
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