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
├── main.css                     # 全站视觉样式、响应式布局、明暗模式与语义色变量
├── theme-styles.css              # 六套外观风格令牌、装饰收敛规则与打印样式
├── main.js                      # 搜索、筛选、主题/风格/游戏导航、点击飘字、自动模式与滚动动画
├── search-index.js               # 独立搜索索引，覆盖文章、归档页和游戏页
├── games/
│   └── watermelon/               # 切西瓜：index.html + game.css + game.js（纯 Canvas）
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

## 外观风格系统

站点有两套互相独立的视觉维度，可以任意组合（6 套风格 × 明暗 = 12 种外观）：

| 维度 | 属性 | 取值 | 入口 |
|---|---|---|---|
| 明暗 | `data-theme` | `light` / `dark` | 导航栏的太阳/月亮按钮（浅色 → 深色 → 跟随系统） |
| 风格 | `data-style` | `editorial` / `tech` / `retro` / `minimal` / `sage` / `terminal`，另加 `auto` | 导航栏的下拉框（移动端在折叠菜单内） |

六套风格：

| 风格 | 观感 |
|---|---|
| `editorial` 纸感手稿 | 默认。米黄纸、墨绿砖红、纸张倾斜与手绘涂鸦，复用 `main.css` 基础变量 |
| `tech` 科技风 | 冷蓝网格、等宽标题、直角、零旋转 |
| `retro` 复古风 | 做旧牛皮纸、打字机小字、双线边框、更重的纸纹 |
| `minimal` 简约风 | 近乎无彩、去掉噪点与所有手绘装饰 |
| `sage` 护眼豆沙绿 | 低饱和灰绿纸、墨绿正文，为长时间阅读降低刺激 |
| `terminal` 终端绿 | 浅色像点阵打印纸，深色是黑底荧光绿；等宽字、扫描线、零手绘 |

- `editorial` 是默认风格，未设置 `data-style` 时的表现与旧版一致。
- 每套风格在 `theme-styles.css` 里用 `:root[data-style="x"]`（浅色）和 `:root[data-style="x"][data-theme="dark"]`（深色）两组令牌定义，并可按风格追加装饰收敛规则。
- 选择写入 `localStorage`（`z-blog-style`、`z-blog-theme`），并在各页 `head` 的内联脚本里于首屏渲染前应用，避免跳页或刷新时闪回。
- 链接可直接指定外观，便于分享：`/?style=tech&theme=dark`、`/?style=auto`。参数应用后写入本地存储并从地址栏清除。

### 自动模式

下拉框最后一项 `auto` 不是风格而是一个模式，解析规则（引导脚本与 `main.js` 的 `resolveChoice` 必须保持一致）：

1. `prefers-contrast: more` → `minimal`（无障碍优先）；
2. 否则按访问者本地时间：07:00–18:59 用 `editorial`，19:00–06:59 用 `tech`。

`data-style` 始终写解析后的具体风格名；`localStorage` 存用户选择（可能是 `auto`）。页面重新可见或整点变化时静默重算，不弹播报。默认仍是 `editorial`，不会覆盖已有用户的选择。

### 下拉控件

`main.js` 动态注入一个带双色色块预览的 listbox：每项显示风格名、一句说明和勾选态。原生 `<select>` 仍保留在 DOM 中作为无 JS 兜底，JS 接管后隐藏。焦点留在触发按钮上，用 `aria-activedescendant` 指向高亮项，支持 `↑` `↓` `Home` `End` `Enter` `Space` `Esc` `Tab` 和点击外部关闭。桌面与移动端两个实例状态同步。

页脚 `footer-bottom` 会显示当前风格名和「切换」入口；窄屏点击后会展开折叠菜单并聚焦下拉框。

### 打印

`theme-styles.css` 末尾的 `@media print` 无论屏幕上是哪套风格、哪种明暗，一律强制走简约风：白纸黑字、去掉噪点与装饰、隐藏导航/搜索/切换器/页脚风格标识，并强制显示入场动画元素（否则打印会是一片空白）。`figure`、`table`、`pre` 避免跨页截断。打印规则放在文件末尾，以保证能覆盖前面所有风格选择器。

### 新增一套风格

1. 在 `theme-styles.css` 增加两组令牌：

   ```css
   :root[data-style="your-style"] { /* 浅色令牌 */ }
   :root[data-style="your-style"][data-theme="dark"] { /* 深色令牌 */ }
   ```

   至少覆盖 `--paper` `--paper-deep` `--paper-light` `--ink` `--muted` `--line` `--green` `--green-dark` `--red` `--yellow` `--shadow`，以及 `--on-accent` `--on-featured`（决定强调色块上的文字颜色）。其余 `--art-*`、圆角、纸纹、装饰透明度按需覆盖。
2. 在 `main.js` 的 `STYLES` 数组加一项：`{ id, label, hint, swatch: [纸色, 强调色] }`，并在 `STYLE_COLORS` 加 `light` / `dark` 两个 `theme-color`。
3. 需要时在同一文件末尾追加装饰收敛规则。完成。无需改动任何 HTML：各页引导脚本按通用规则读取风格名，没有白名单；打印样式也不需要跟着改。

风格总数建议不超过 6 套，避免选择过载。

### 语义色变量

换肤最容易翻车的是「写死的颜色」。`main.css` 里所有影响可读性的颜色都已收敛为变量：

- `--on-accent` / `--on-accent-soft` / `--on-accent-meta` / `--on-accent-faint`：彩色或深色块上的文字及其层级。
- `--on-featured` / `--on-featured-meta`：暖色主推卡片上的文字。
- `--art-base` / `--art-glow` / `--art-scan` / `--art-grid` / `--art-tint` / `--tape`：首页手绘插画配色。
- `--radius`、`--grain-image`、`--grain-size`、`--grain-opacity`、`--grain-blend`：圆角与背景质感。

新增组件时优先使用这些变量，不要在组件内直接写十六进制色值，否则切换到新风格时会撞色。

## 交互效果

### 点击 +1 飘字

全站点任意位置点击，会在指针处浮起一枚 `+1`，缓缓上飘后淡出；连点几次就同时出现几枚，互不干扰。

- 实现位于 `main.js` 末尾的独立 IIFE 与 `main.css` 的 `.click-pop*` 规则，容器由 JS 动态创建，无需改动任何 HTML。
- 装饰层 `pointer-events: none`，不拦截链接、按钮、搜索与风格下拉；每个飘字在 `animationend` 后自动移除，并有超时兜底，同屏最多 40 枚。
- 用 `pointerdown` 记录、`pointerup` 判定，因此拖拽选字、页面滚动、长按（>700ms）、右键 / 修饰键点击、输入框内点击都不会误触发。
- 颜色跟随当前风格的 `--red`，所以六套风格与深浅色下都可读；打印时整层隐藏；开启「减少动效」偏好时改为一次短淡出，不做位移。

## 网页游戏

### 切西瓜 `/games/watermelon/`

纯 Canvas 2D 实现，无构建步骤、无第三方库、无外部资源（音效由 Web Audio 实时合成）。

- **玩法**：60 秒、3 条命。水果从底部抛起，按住鼠标或手指划过即可切开；一刀切中 2 个以上触发连击加分，漏掉水果扣一颗心，切到炸弹直接结束。最高分与音效开关写入 `localStorage`。
- **风格联动**：`game.js` 通过 `getComputedStyle` 读取 `--paper` / `--ink` / `--red` / `--line` 等变量，并用 `MutationObserver` 监听 `data-style` / `data-theme` 变化，所以切换六套外观或明暗时，画布背景、网格、描边、刀光会实时跟着变；水果本身保持自然色以保证辨识度。
- **接入方式**：游戏页复用站点的 `header` / `footer` 与 `main.css`、`theme-styles.css`、`main.js`。导航中的「游戏」项由 `ensureGameNav()` 动态注入（桌面 `.site-nav` 与移动端 `.mobile-menu`），16 个页面零改动；首页「项目」区块另有静态链接作为无 JS 兜底。
- **与点击飘字共存**：`.game-stage` 带 `data-no-click-pop`，`main.js` 的 `isIgnoredTarget()` 会跳过该容器内的指针事件，避免划刀时刷出大量 `+1`。
- 支持鼠标与触屏（`pointerdown/move/up` + `touch-action: none`）、`devicePixelRatio` 高清渲染、`ResizeObserver` 自适应、`prefers-reduced-motion`（减少粒子并关闭震动）、空格键开始 / 重开、`M` 键切换音效；打印时隐藏画布。

## 内容目录

### 职业与思考

- [前端何去何从，是坚持还是转行](2026/11/18/frontend-where-to-go/)

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
- 新增或修改风格后，按「6 套风格 × 明暗」检查强调色块上的文字对比度，避免深色块配白字或浅色块配浅字；同时用浏览器打印预览确认正文不是空白。
- AI 相关文章优先写真实案例，补充输入、输出、失败和评估证据。
