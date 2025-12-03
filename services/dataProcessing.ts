import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import initSqlJs from 'sql.js';
import { Dataset, ColumnInfo, ColumnType, DataRow, ColumnStats } from '../types';

export const parseFile = async (file: File): Promise<Dataset> => {
  const extension = file.name.split('.').pop()?.toLowerCase();
  let rows: DataRow[] = [];

  if (extension === 'csv') {
    rows = await parseCSV(file);
  } else if (extension === 'json') {
    rows = await parseJSON(file);
  } else if (['xlsx', 'xls'].includes(extension || '')) {
    rows = await parseExcel(file);
  } else if (['sqlite', 'sqlite3', 'db'].includes(extension || '')) {
    rows = await parseSQLite(file);
  } else {
    throw new Error('Unsupported file format');
  }

  // Normalize and clean data
  const cleanedRows = rows.map(row => {
    const newRow: DataRow = {};
    Object.keys(row).forEach(key => {
      // Basic cleaning: trim strings, handle empty strings as null
      const val = row[key];
      if (typeof val === 'string') {
        const trimmed = val.trim();
        newRow[key] = trimmed === '' ? null : (isNaN(Number(trimmed)) ? trimmed : Number(trimmed));
      } else {
        newRow[key] = val as any;
      }
    });
    return newRow;
  });

  const columns = analyzeColumns(cleanedRows);

  return {
    name: file.name,
    rows: cleanedRows,
    columns,
    rowCount: cleanedRows.length,
  };
};

const parseCSV = (file: File): Promise<DataRow[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: (results) => resolve(results.data as DataRow[]),
      error: (error: Error) => reject(error),
    });
  });
};

const parseJSON = (file: File): Promise<DataRow[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        resolve(Array.isArray(json) ? json : [json]);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsText(file);
  });
};

export const getExcelSheets = async (file: File): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        resolve(workbook.SheetNames);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
};

export const parseExcelSheet = async (file: File, sheetName: string): Promise<DataRow[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[sheetName];
        if (!sheet) {
          reject(new Error(`Sheet ${sheetName} not found`));
          return;
        }
        const json = XLSX.utils.sheet_to_json(sheet) as DataRow[];
        resolve(json);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
};

const parseExcel = async (file: File): Promise<DataRow[]> => {
  const sheets = await getExcelSheets(file);
  if (sheets.length === 0) {
    throw new Error("No sheets found in the Excel file.");
  }
  return parseExcelSheet(file, sheets[0]);
};

export const getSQLiteTables = async (file: File): Promise<string[]> => {
  try {
    const SQL = await initSqlJs({
      locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.11.0/sql-wasm.wasm`
    });

    const buffer = await file.arrayBuffer();
    const db = new SQL.Database(new Uint8Array(buffer));

    const result = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
    db.close();

    if (result.length === 0 || result[0].values.length === 0) {
      return [];
    }

    return result[0].values.map(v => v[0] as string);
  } catch (err) {
    console.error("Error getting SQLite tables:", err);
    throw new Error("Failed to read SQLite file.");
  }
};

export const parseSQLiteTable = async (file: File, tableName: string): Promise<DataRow[]> => {
  try {
    const SQL = await initSqlJs({
      locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.11.0/sql-wasm.wasm`
    });

    const buffer = await file.arrayBuffer();
    const db = new SQL.Database(new Uint8Array(buffer));

    const queryRes = db.exec(`SELECT * FROM "${tableName}"`);

    if (queryRes.length === 0) {
      db.close();
      return [];
    }

    const columns = queryRes[0].columns;
    const values = queryRes[0].values;

    db.close();

    return values.map((row: any[]) => {
      const rowObj: DataRow = {};
      columns.forEach((col, index) => {
        rowObj[col] = row[index];
      });
      return rowObj;
    });

  } catch (err) {
    console.error("Error parsing SQLite table:", err);
    throw new Error(`Failed to read table ${tableName} from SQLite file.`);
  }
};

const parseSQLite = async (file: File): Promise<DataRow[]> => {
  const tables = await getSQLiteTables(file);
  if (tables.length === 0) {
    throw new Error("No tables found in the SQLite database.");
  }
  // Default to the first table
  return parseSQLiteTable(file, tables[0]);
};

export const analyzeColumns = (rows: DataRow[]): ColumnInfo[] => {
  if (rows.length === 0) return [];
  const keys = Object.keys(rows[0]);

  return keys.map(key => {
    // Determine type based on first non-null value
    let type = ColumnType.Unknown;
    const sampleValues = rows.slice(0, 100).map(r => r[key]).filter(v => v !== null && v !== undefined);

    if (sampleValues.length > 0) {
      const testVal = sampleValues[0];
      if (typeof testVal === 'number') type = ColumnType.Number;
      else if (typeof testVal === 'boolean') type = ColumnType.Boolean;
      else if (typeof testVal === 'string') {
        // Simple date check
        if (!isNaN(Date.parse(testVal)) && testVal.length > 5) {
          // Very loose date check, defaulting to string to avoid false positives often
          type = ColumnType.String;
        } else {
          type = ColumnType.String;
        }
      }
    }

    const stats = calculateColumnStats(rows, key, type);

    return { name: key, type, stats };
  });
};

const calculateColumnStats = (rows: DataRow[], key: string, type: ColumnType): ColumnStats => {
  const values = rows.map(r => r[key]).filter(v => v !== null && v !== undefined);
  const nullCount = rows.length - values.length;

  if (type === ColumnType.Number) {
    const numValues = values as number[];
    if (numValues.length === 0) return { nullCount, uniqueCount: 0 };

    numValues.sort((a, b) => a - b);
    const sum = numValues.reduce((a, b) => a + b, 0);
    const min = numValues[0];
    const max = numValues[numValues.length - 1];
    const mean = sum / numValues.length;
    const mid = Math.floor(numValues.length / 2);
    const median = numValues.length % 2 !== 0 ? numValues[mid] : (numValues[mid - 1] + numValues[mid]) / 2;
    const uniqueCount = new Set(numValues).size;

    return { min, max, mean, median, nullCount, uniqueCount };
  } else {
    // String/Categorical stats
    const strValues = values.map(String);
    const uniqueCount = new Set(strValues).size;

    // Frequency map for top values
    const counts: Record<string, number> = {};
    strValues.forEach(v => counts[v] = (counts[v] || 0) + 1);
    const topValues = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([value, count]) => ({ value, count }));

    return { nullCount, uniqueCount, topValues };
  }
};