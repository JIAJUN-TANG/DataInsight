declare global {
  interface Window {
    electronAPI: {
      checkForUpdates: () => void;
      readEnvFile: () => Promise<string>;
      writeEnvFile: (data: string) => Promise<boolean>;
      checkEnvFile: () => Promise<boolean>;
    };
  }
}

export {};