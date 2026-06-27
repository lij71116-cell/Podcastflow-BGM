# Visual Research

## 竞品视觉证据表

| 竞品 | URL | 截图/证据路径 | 可借鉴点 | 不采用点 |
|------|-----|---------------|----------|----------|
| 小宇宙 | https://www.xiaoyuzhoufm.com | [优设设计分析](https://www.uisdc.com/xiaoyuzhou) / [站酷 App 分析](https://www.zcool.com.cn/article/ZMTIzNDcwMA==.html) | 封面+标题+播客名信息层级；单集卡片；播放器进度/音量；封面主题色适配；底部 mini 播放器 | 社区/评论/打赏；下载；发现页推荐；App 原生体验 |
| Mixle | https://mixle.app | 官网 Hero 与功能区块（公开页面） | 「播客+BGM」价值表达；ambient 选择交互；封面取色；全屏/沉浸播放；放松氛围 | 实时混音；离线下载；Premium 订阅；自有播客库聚合 |
| ENDE Podcast Automixer | https://ende.app/en/creator-tools/podcast-automixer | 官网功能页（公开页面） | 创建页步骤感；音量/混音参数控件；任务结果反馈 | 导出下载；创作者工具文案；浏览器 Web Audio 方案 |

## 用户选定方向

- 采用：**融合方案（A + B）**
- 选择原因：
  - 方案 A（小宇宙延续风）：播客信息展示、卡片列表、播放器交互符合中文播客用户习惯
  - 方案 B（Mixle 沉浸风）：BGM 增强收听的价值表达与 ambient 混控交互
  - 轻量借鉴方案 C：创建页编号步骤分区，不做重型多轨编辑器
  - Podcast Flow 独有：链接解析 → 后端合成 → 资产库 → stream 播放，无下载

## 可复用视觉规则

- **页面结构**：顶栏导航（创建 / 我的音频库）+ 内容区 + 全局底部播放器
- **组件形态**：Ant Design Card / Slider / Upload / Steps（轻量）/ List / Progress
- **色彩倾向**：白底为主；解析成功后封面取色作 accent（卡片边框、进度条、按钮点缀）
- **字体/字号倾向**：标题 20–24px；正文 14px；辅助信息 12px；遵循 Ant Design 默认层级
- **间距/圆角/阴影**：卡片圆角 8px；区块间距 24px；卡片轻阴影；创建页纵向步骤卡片
- **信息密度**：中等；创建页纵向分区；音频库双列卡片网格（桌面端）

## 原型阶段必须参考

- [小宇宙设计分析](https://www.uisdc.com/xiaoyuzhou)：单集卡片、播放器信息层级、封面主题色
- [Mixle 官网](https://mixle.app)：BGM 混听价值表达、ambient 面板式交互、封面取色
- [ENDE Automixer](https://ende.app/en/creator-tools/podcast-automixer)：创建流程步骤感、混音参数控件布局

## 禁止照搬

- 不复制小宇宙、Mixle、ENDE 的品牌、Logo、真实文案、商业数据
- 只借鉴结构、交互、视觉规律
- 不出现任何下载按钮或导出入口
