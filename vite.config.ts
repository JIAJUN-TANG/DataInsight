import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.NODE_ENV': JSON.stringify(mode)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        },
        extensions: ['.tsx', '.ts', '.js', '.jsx']
      },
      build: {
        // 使用相对路径，确保file://协议下能正常加载
        outDir: 'dist',
        assetsDir: 'assets',
        // 确保使用相对路径
        base: './',
        // 确保生成的文件使用兼容的格式
        target: 'es2020',
        // 手动指定入口文件
        rollupOptions: {
          input: {
            main: path.resolve(__dirname, 'index.html')
          },
          // 确保所有依赖都被打包
          external: [],
          output: {
            // 使用默认的es模块格式，确保Vite能正确打包
            format: 'es',
            // 确保资源路径正确
            assetFileNames: 'assets/[name]-[hash][extname]',
            chunkFileNames: 'assets/[name]-[hash].js',
            entryFileNames: 'assets/[name]-[hash].js',
            // 确保生成的HTML中使用相对路径
            manualChunks: undefined
          }
        }
      }
    };
  });
