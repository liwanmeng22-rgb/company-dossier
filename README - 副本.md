# 公司拆解仪表盘（Company Dossier）

输入公司名称，先通过 Tavily 联网检索该公司的最新新闻/财报/风险信息，
再把检索结果连同固定的 JSON Schema 一起交给 DeepSeek API 生成结构化拆解报告
（行业定位 / 商业模式 / 护城河 / 风险 / 结论），并以「情报档案」风格渲染，
每条数据都带置信度标记（已披露 / 行业估算 / AI推测），支持一键导出PDF。

## 本地运行

```bash
npm install
cp .env.example .env.local   # 填入你的 DEEPSEEK_API_KEY 和 TAVILY_API_KEY
npm run dev
```

打开 http://localhost:3000

## 关于 Tavily（联网检索）

DeepSeek 官方 API 本身不带联网搜索能力，所以这里额外接了 Tavily 来补上时效性：

1. 打开 [tavily.com](https://tavily.com)，用 Google 或 GitHub 账号登录（不需要注册邮箱密码）
2. 登录后 Dashboard 里会有一个默认生成的 API Key，复制它
3. 免费额度是每月 1000 次搜索调用，不需要绑信用卡，个人测试完全够用

如果没有配置 `TAVILY_API_KEY`，应用仍然能跑，只是会退化成"纯靠模型自身知识生成"，
页面上会提示"本次未使用联网检索"。

## 导出PDF

报告生成后，输入框下方会出现"导出PDF"按钮。点击后会把报告内容截图并按A4尺寸
自动分页拼成一份PDF直接下载到本地（用的是 `html2canvas` + `jspdf`，纯前端完成，
不需要额外的服务端渲染）。

## 部署到 GitHub + Vercel

1. 新建一个 GitHub 仓库，把这个文件夹的内容推上去：
   ```bash
   git init
   git add .
   git commit -m "init"
   git branch -M main
   git remote add origin <你的仓库地址>
   git push -u origin main
   ```
2. 去 [vercel.com](https://vercel.com) 用 GitHub 账号登录，导入这个仓库。
3. 部署时在 Vercel 的 Environment Variables 里添加：
   - `DEEPSEEK_API_KEY` = 你的 DeepSeek API Key
   - `TAVILY_API_KEY` = 你的 Tavily API Key
4. 点击 Deploy，等构建完成即可访问。

⚠️ **模型名说明**：代码里用的是 `deepseek-v4-flash`（性价比模型，也可以在
`app/api/analyze/route.js` 里改成 `deepseek-v4-pro` 换取更强的推理质量）。
旧的 `deepseek-chat` 别名将于 2026年7月24日 停用，所以这里没有用它。

⚠️ **不要把 API Key 提交进 Git**。`.env.local` 已经在 `.gitignore` 里排除，
Key 只应该出现在 Vercel 的环境变量里，或者你本地的 `.env.local` 文件中。
所有对 DeepSeek 的调用都发生在服务端（`app/api/analyze/route.js`），
浏览器端拿不到 Key，这样部署到公网也是安全的。

## 项目结构

```
app/
  api/analyze/
    route.js    # 服务端接口：先联网检索，再调用DeepSeek、校验JSON
    search.js   # 调用Tavily做联网检索，拼装成上下文文本
    prompt.js   # 拼装发给DeepSeek的完整prompt（含JSON Schema）
  lib/exportPdf.js       # 前端导出PDF的工具函数
  components/            # 各分析板块的展示组件
  page.jsx                # 主页面：输入框 + 报告渲染 + 导出按钮
  layout.jsx              # 全局字体与样式
  globals.css              # 设计token（颜色/字体/间距）
```

## 后续可以扩展的方向

- 把每次生成的报告存到数据库（如 Supabase/PlanetScale），做成公司分析库
- 加一个"重新分析"按钮，定期刷新数据
- 支持公司对比页（两份JSON并排渲染）
- 把置信度为"AI推测"的字段做成可编辑，允许你手动核实后改成"已披露"
