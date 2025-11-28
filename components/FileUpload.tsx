import React, { useCallback, useState } from 'react';
import { Upload, FileType, AlertCircle, Loader2 } from 'lucide-react';
import { parseFile } from '../services/dataProcessing';
import { Dataset } from '../types';

interface FileUploadProps {
  onDataLoaded: (data: Dataset) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onDataLoaded }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processFile = async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      const dataset = await parseFile(file);
      onDataLoaded(dataset);
    } catch (err: any) {
      console.error(err);
      setError("Failed to parse file. Please ensure it is a valid CSV, Excel, JSON, or SQLite file.");
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

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] p-6">
      <div className="max-w-xl w-full">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-slate-800 mb-2">上传数据集</h2>
          <p className="text-slate-500">支持的文件格式：.csv, .json, .xlsx, .xls, .sqlite, .db</p>
        </div>

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