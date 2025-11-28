export type CellValue = string | number | boolean | null;

export interface DataRow {
  [key: string]: CellValue;
}

export enum ColumnType {
  String = 'String',
  Number = 'Number',
  Boolean = 'Boolean',
  Date = 'Date',
  Unknown = 'Unknown'
}

export interface ColumnStats {
  min?: number;
  max?: number;
  mean?: number;
  median?: number;
  nullCount: number;
  uniqueCount: number;
  topValues?: { value: string; count: number }[]; // For categorical
}

export interface ColumnInfo {
  name: string;
  type: ColumnType;
  stats?: ColumnStats;
}

export interface Dataset {
  name: string;
  rows: DataRow[];
  columns: ColumnInfo[];
  rowCount: number;
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  timestamp: number;
}

export enum AppView {
  Upload = 'UPLOAD',
  Data = 'DATA',
  Visualize = 'VISUALIZE',
  AI = 'AI',
  TextAnalysis = 'TEXT_ANALYSIS',
  APIConfig = 'API_CONFIG'
}