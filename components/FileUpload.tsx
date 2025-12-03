import React, { useCallback, useState } from 'react';
import { Upload, FileType, AlertCircle, Loader2 } from 'lucide-react';
import { parseFile, getSQLiteTables, parseSQLiteTable, analyzeColumns, getExcelSheets, parseExcelSheet } from '../services/dataProcessing';
import { Dataset } from '../types';

interface FileUploadProps {
  onDataLoaded: (data: Dataset) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onDataLoaded }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [currentFile, setCurrentFile] = useState<File | null>(null);

  const processFile = async (file: File) => {
    setLoading(true);
    setError(null);
    setTables([]);
    setSelectedTable('');
    setCurrentFile(null);

    try {
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (['sqlite', 'sqlite3', 'db'].includes(extension || '')) {
        const tableList = await getSQLiteTables(file);
        if (tableList.length === 0) {
          throw new Error("No tables found in the SQLite database.");
        }
        setTables(tableList);
        setCurrentFile(file);
        // If only one table, load it automatically
        if (tableList.length === 1) {
          await loadTableData(file, tableList[0]);
        }
      } else if (['xlsx', 'xls'].includes(extension || '')) {
        const sheetList = await getExcelSheets(file);
        if (sheetList.length === 0) {
          throw new Error("No sheets found in the Excel file.");
        }
        setTables(sheetList);
        setCurrentFile(file);
        // If only one sheet, load it automatically
        if (sheetList.length === 1) {
          await loadTableData(file, sheetList[0]);
        }
      } else {
        const dataset = await parseFile(file);
        onDataLoaded(dataset);
      }
    } catch (err: any) {
      console.error(err);
      setError("Failed to parse file. Please ensure it is a valid CSV, Excel, JSON, or SQLite file.");
    } finally {
      setLoading(false);
    }
  };

  const loadTableData = async (file: File, tableName: string) => {
    setLoading(true);
    setError(null);
    try {
      const extension = file.name.split('.').pop()?.toLowerCase();
      let rows: any[] = [];

      if (['sqlite', 'sqlite3', 'db'].includes(extension || '')) {
        rows = await parseSQLiteTable(file, tableName);
      } else if (['xlsx', 'xls'].includes(extension || '')) {
        rows = await parseExcelSheet(file, tableName);
      }

      const columns = analyzeColumns(rows);

      const dataset: Dataset = {
        name: file.name + ' - ' + tableName,
        rows,
        columns,
        rowCount: rows.length,
      };

      onDataLoaded(dataset);
      setSelectedTable(tableName);
    } catch (err: any) {
      console.error(err);
      setError(`Failed to load table/sheet ${tableName}.`);
    } finally {
      setLoading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const handleTableChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const tableName = e.target.value;
    if (tableName && currentFile) {
      loadTableData(currentFile, tableName);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] p-6">
      <div className="max-w-xl w-full">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-slate-800 mb-2">上传数据集</h2>
          <p className="text-slate-500">支持的文件格式：.csv, .json, .xlsx, .xls, .sqlite, .db</p>
        </div>

        {tables.length > 0 ? (
          <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">选择数据表</h3>
            <p className="text-slate-600 mb-6">检测到多个数据表，请选择要加载的表：</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 max-h-[300px] overflow-y-auto pr-2">
              {tables.map(table => (
                <button
                  key={table}
                  onClick={() => currentFile && loadTableData(currentFile, table)}
                  disabled={loading}
                  className={`
                    flex items-center p-4 rounded-xl border-2 text-left transition-all duration-200 group
                    ${selectedTable === table
                      ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200'
                      : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                    }
                  `}
                >
                  <div className={`
                    p-3 rounded-lg mr-4 transition-colors
                    ${selectedTable === table ? 'bg-indigo-200 text-indigo-700' : 'bg-slate-100 text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-600'}
                  `}>
                    <FileType size={24} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className={`font-medium truncate ${selectedTable === table ? 'text-indigo-900' : 'text-slate-700'}`}>
                      {table}
                    </h4>
                  </div>
                  {selectedTable === table && (
                    <div className="text-indigo-600 animate-in fade-in zoom-in duration-200">
                      <Loader2 size={20} className={loading ? "animate-spin" : "hidden"} />
                    </div>
                  )}
                </button>
              ))}
            </div>

            {loading && (
              <div className="flex items-center justify-center text-indigo-600 mb-6">
                <Loader2 size={24} className="animate-spin mr-2" />
                <span>正在加载数据...</span>
              </div>
            )}

            <div className="flex justify-end border-t border-slate-100 pt-4">
              <button
                onClick={() => {
                  setTables([]);
                  setCurrentFile(null);
                  setSelectedTable('');
                }}
                className="text-slate-500 hover:text-slate-700 text-sm font-medium px-4 py-2 rounded-lg hover:bg-slate-100 transition-colors"
              >
                取消并重新上传
              </button>
            </div>
          </div>
        ) : (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200 ease-in-out
              ${isDragging
                ? 'border-indigo-500 bg-indigo-50 scale-[1.02]'
                : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50 bg-white'
              }
            `}
          >
            <input
              type="file"
              id="file-upload"
              className="hidden"
              accept=".csv,.json,.xlsx,.xls,.sqlite,.sqlite3,.db"
              onChange={handleInputChange}
              disabled={loading}
            />

            <label
              htmlFor="file-upload"
              className="flex flex-col items-center cursor-pointer w-full h-full"
            >
              {loading ? (
                <div className="animate-spin text-indigo-600 mb-4">
                  <Loader2 size={48} />
                </div>
              ) : (
                <div className="bg-indigo-100 p-4 rounded-full text-indigo-600 mb-4">
                  <FileType size={32} />
                </div>
              )}

              <span className="text-lg font-medium text-slate-700 mb-1">
                {loading ? "处理中..." : "点击上传或拖拽文件"}
              </span>
            </label>
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-700">
            <AlertCircle size={20} className="mr-2 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUpload;