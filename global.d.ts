declare global {
  interface Window {
    electronAPI: {
      checkForUpdates: () => void;
      readEnvFile: () => Promise<string>;
      writeEnvFile: (data: string) => Promise<boolean>;
      checkEnvFile: () => Promise<boolean>;
      cutText: (text: string) => Promise<string[]>;
      extractKeywords: (text: string, topN?: number) => Promise<Array<{word: string, weight: number}>>;
    };
  }
}

export {};