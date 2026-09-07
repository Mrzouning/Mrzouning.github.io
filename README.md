# Mr zou · 个人博客

这是小邹的个人博客，发布在 [mrzouning.github.io](https://mrzouning.github.io/)。博客记录 AI 学习、Agent 协作、前端工程、项目实践和生活里的长期问题。

## 项目定位

这个仓库是一个无构建步骤的静态网站，重点是：

- 用文章记录可复用的思考和实践
- 用项目板块展示真实产出
- 用 GitHub Pages 持续发布和维护
- 保持轻量、可读、方便长期更新

## 技术结构

```text
.
├── index.html                    # 首页：介绍、文章、项目、经历和联系方式
├── main.css                     # 全站视觉样式、响应式布局和深色模式
├── main.js                      # 全站搜索、筛选、主题切换、移动菜单和滚动动画
├── search-index.js               # 独立文章搜索索引，覆盖文章页和归档页
├── favicon.svg                   # 站点图标（SVG）
├── apple-touch-icon.png          # iOS 主屏图标（180×180，由 apple-touch-icon.svg 生成）
├── social-card.png               # Open Graph 分享图（1200×630，由 social-card.svg 生成）
├── 404.html                      # GitHub Pages 自定义错误页
├── 2026/                         # 按年月组织的文章
│   └── 09/
├── 2016/                         # 早期文章
├── archives/                     # 总归档、年度归档和月份归档
├── feed.xml                     # RSS 订阅
├── robots.txt                    # 搜索引擎抓取规则
└── sitemap.xml                   # 站点地图
```

项目不依赖 Node.js、npm 或后端服务，直接由浏览器加载 HTML、CSS 和 JavaScript。

## 本地预览

在仓库根目录执行：

```bash
python3 -m http.server 4173
```

然后打开：

```text
http://127.0.0.1:4173/
```

也可以使用任意静态文件服务器预览。修改 HTML、CSS 或 JavaScript 后刷新页面即可看到结果。

## 内容目录

### AI 与工程

- [把博客改造成长期可维护的个人站](2026/09/07/blog-redesign-review/)
- [学习 AI，从工具到能力](2026/09/07/learning-ai-skills/)
- [AI 如何改变互联网](2026/09/06/ai-internet-impact/)
- [模型与 Agent，怎样一起工作](2026/09/05/models-and-agents/)
- [我如何用 AI 完成一个真实项目](2026/09/04/ai-project-workflow/)
- [从 0 到 1 搭一个 Agent](2026/09/03/build-agent-from-zero/)

### 早期记录

- [Hello World](2016/11/22/hello-world/)

## 新增文章流程

1. 在 `YYYY/MM/DD/slug/index.html` 创建文章页面。
2. 在 `search-index.js` 增加标题、摘要、分类、关键词和正文主题。
3. 在首页 `index.html` 增加文章卡片和分类信息。
4. 更新 `archives/index.html`、年度归档和月份归档。
5. 在文章底部增加上一篇、下一篇或归档入口。
6. 更新 `sitemap.xml` 和 `feed.xml`，检查页面的 JSON-LD 和 Open Graph 信息。
7. 用本地静态服务器检查首页、文章页、归档页、404 页面和移动端布局。
8. 通过 Git 提交并推送到 `master`，GitHub Pages 会自动发布。

文章建议包含：明确的问题、真实过程、失败记录、可复用结论和边界说明。项目类文章尽量附仓库、截图、输入输出和结果证据；涉及模型能力时，注明测试日期和模型版本，避免把快速变化的结论写成永久事实。

## 发布方式

当前站点使用 GitHub Pages 发布：

- 站点地址：[https://mrzouning.github.io/](https://mrzouning.github.io/)
- 仓库地址：[https://github.com/Mrzouning/Mrzouning.github.io](https://github.com/Mrzouning/Mrzouning.github.io)
- 发布分支：`master`

常用发布命令：

```bash
git add .
git commit -m "更新博客内容"
git push origin master
```

推送后，GitHub Pages 通常需要几十秒到几分钟完成构建。若页面暂未变化，可以等待构建结束后进行强制刷新。

## 联系方式

- Email：[mrzouning812@gmail.com](mailto:mrzouning812@gmail.com)
- GitHub：[Mrzouning](https://github.com/Mrzouning)

## 维护约定

- 不提交真实密钥、Cookie、访问令牌或私密资料。
- 外部链接使用 `target="_blank" rel="noopener"`。
- 文章页面保持中文标题、描述、日期和阅读时长一致。
- 修改布局后至少检查桌面端和 375px 左右的移动端宽度。
- AI 相关文章优先写真实案例，补充输入、输出、失败和评估证据。
