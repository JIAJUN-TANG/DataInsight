# DataInsight - AI 数据分析平台

DataInsight 是一个强大的 AI 数据分析平台，帮助用户轻松上传、预览、分析和可视化数据，发现数据中的隐藏模式和洞察。

## 主要功能

### 📊 数据处理
- **文件上传**：支持多种数据格式上传
- **数据预览**：直观的表格视图，支持分页和搜索
- **数据清洗**：去除空值、重复行和无用列
- **手动编辑**：支持手动删除行和列

### 📈 数据可视化
- **自动图表生成**：根据数据类型自动生成合适的图表
- **多种图表类型**：支持柱状图、折线图、散点图、饼图等
- **自定义配置**：支持修改图表类型、数据列和标题
- **交互式图表**：支持缩放、平移和悬停查看详情

### 📝 文本分析
- **分词处理**：中文分词和停用词去除
- **情感分析**：分析文本情感倾向
- **LDA 主题挖掘**：自动提取文本主题
- **关键词提取**：识别文本中的关键信息

### 🤖 AI 数据分析
- **智能问答**：使用 AI 回答关于数据的问题
- **模式发现**：自动发现数据中的模式和趋势
- **多 AI 服务支持**：支持 Gemini、OpenAI、Claude 等多种 AI 服务
- **实时生成**：AI 分析结果实时生成和展示

### 🔑 API 配置
- **多 AI 服务配置**：支持配置多种 AI 服务的 API 密钥
- **本地存储**：API 密钥安全存储在浏览器本地
- **灵活切换**：可以随时切换使用的 AI 服务
- **状态管理**：支持启用/禁用特定 AI 服务

## 技术栈

### 前端
- **框架**：React 18
- **语言**：TypeScript
- **构建工具**：Vite
- **样式**：Tailwind CSS
- **图标**：Lucide React
- **图表库**：Recharts
- **Markdown**：ReactMarkdown

### AI 服务
- **Google Gemini**：用于 AI 数据分析
- **OpenAI**：支持 ChatGPT 系列模型
- **Anthropic Claude**：支持 Claude 系列模型

### 数据处理
- **文件解析**：支持 CSV、Excel 等格式
- **数据类型检测**：自动检测数据类型
- **统计分析**：基本统计信息计算

## 快速开始

### 前置条件
- Node.js 16+ 环境
- npm 或 yarn 包管理器

### 安装和运行

1. **克隆仓库**
   ```bash
   git clone https://github.com/JIAJUN-TANG/DataInsight.git
   cd DataInsight
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **配置环境变量**
   创建 `.env.local` 文件并添加以下内容：
   ```bash
   # Gemini API 密钥
   GEMINI_API_KEY=your_gemini_api_key
   ```

4. **启动开发服务器**
   ```bash
   npm run dev
   ```

5. **访问应用**
   打开浏览器访问 `http://localhost:3000`

## 项目结构

```
DataInsight/
├── components/          # React 组件
│   ├── AIChat.tsx       # AI 聊天组件
│   ├── APIConfig.tsx    # API 配置组件
│   ├── Charts.tsx       # 图表组件
│   ├── DataGrid.tsx     # 数据表格组件
│   ├── FileUpload.tsx   # 文件上传组件
│   └── TextAnalysis.tsx # 文本分析组件
├── services/           # 服务层
│   ├── dataProcessing.ts # 数据处理服务
│   └── geminiService.ts   # Gemini AI 服务
├── types.ts            # TypeScript 类型定义
├── App.tsx             # 主应用组件
├── index.tsx           # 应用入口
├── package.json        # 项目配置
├── tsconfig.json       # TypeScript 配置
└── vite.config.ts      # Vite 配置
```

## 使用说明

### 1. 上传数据
- 点击左侧导航栏的 "上传文件" 按钮
- 选择要上传的数据文件（支持 CSV、Excel 等格式）
- 等待文件解析完成

### 2. 数据预览和编辑
- 在 "数据预览" 视图中查看数据
- 使用搜索框查找特定数据
- 使用分页导航浏览大量数据
- 点击 "数据清洗" 按钮进行自动清洗
- 使用复选框选择行或列进行删除

### 3. 数据可视化
- 在 "数据可视化" 视图中查看自动生成的图表
- 点击 "新增图表" 按钮添加新图表
- 点击图表标题栏的设置按钮修改图表配置
- 选择不同的图表类型和数据列

### 4. 文本分析
- 在 "文本分析" 视图中选择要分析的文本列
- 选择分析类型（情感分析或 LDA 主题挖掘）
- 点击 "执行分析" 按钮查看结果
- 查看分词结果和情感分布

### 5. AI 数据分析
- 在 "AI 数据分析" 视图中输入您的问题
- 选择要使用的 AI 服务
- 等待 AI 生成分析结果
- 查看 AI 生成的 Markdown 格式分析报告

### 6. API 配置
- 在 "API 配置" 视图中配置 AI 服务的 API 密钥
- 启用或禁用特定 AI 服务
- 保存配置后，在 AI 分析视图中即可使用

## 贡献指南

欢迎贡献代码、报告问题或提出建议！

### 报告问题
请在 GitHub Issues 中报告问题，包括：
- 问题描述
- 复现步骤
- 预期行为
- 实际行为
- 截图（如果适用）

### 提交代码
1. Fork 仓库
2. 创建特性分支
3. 提交更改
4. 创建 Pull Request

## 许可证

本项目采用 MIT 许可证。详见 [LICENSE](LICENSE) 文件。

## 联系方式

如有任何问题或建议，欢迎通过以下方式联系：

- GitHub Issues：[https://github.com/JIAJUN-TANG/DataInsight/issues](https://github.com/JIAJUN-TANG/DataInsight/issues)
- 电子邮件：[your-email@example.com](mailto:your-email@example.com)

---

**DataInsight** - 让数据分析变得简单、智能、高效！ 🚀
