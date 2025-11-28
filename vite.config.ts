import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react(), tailwindcss()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.NODE_ENV': JSON.stringify(mode)
      },
      resolve: {
        alias: {
          // 修改：@ 通常指向src目录（如果有src文件夹），否则使用当前目录
          '@': path.resolve(__dirname, './src') || path.resolve(__dirname, '.'),
        },
        extensions: ['.tsx', '.ts', '.js', '.jsx']
      },
      // 关键：确保生产环境使用相对路径
      base: mode === 'production' ? './' : '/',
      build: {
        // 使用相对路径（去掉./前缀，Vite内部会处理）
        outDir: 'dist',
        assetsDir: 'assets',
        // 确保生成的文件使用兼容的格式
        target: 'es2020',
        // 确保生成的HTML中使用相对路径引用资源
        rollupOptions: {
          input: {
            main: path.resolve(__dirname, 'index.html')
          },
          output: {
            // 确保所有资源路径都是相对的
            entryFileNames: 'assets/[name].[hash].js',
            chunkFileNames: 'assets/[name].[hash].js',
            assetFileNames: 'assets/[name].[hash].[ext]',
            // 确保使用相对路径
            compact: true,
          }
        },
        // 确保清空输出目录
        emptyOutDir: true,
        // 禁用CSS代码分割，避免路径问题
        cssCodeSplit: false,
      }
    };
  });