---
name: Podcast Flow
colors:
  surface: '#faf9f5'
  surface-dim: '#dbdad6'
  surface-bright: '#faf9f5'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f4f0'
  surface-container: '#efeeea'
  surface-container-high: '#e9e8e4'
  surface-container-highest: '#e3e2df'
  on-surface: '#1b1c1a'
  on-surface-variant: '#414846'
  inverse-surface: '#30312e'
  inverse-on-surface: '#f2f1ed'
  outline: '#717976'
  outline-variant: '#c0c8c5'
  surface-tint: '#40655c'
  primary: '#002720'
  on-primary: '#ffffff'
  primary-container: '#163d35'
  on-primary-container: '#80a89d'
  inverse-primary: '#a6cfc4'
  secondary: '#b32b00'
  on-secondary: '#ffffff'
  secondary-container: '#ff5729'
  on-secondary-container: '#550f00'
  tertiary: '#381810'
  on-tertiary: '#ffffff'
  tertiary-container: '#512d24'
  on-tertiary-container: '#c79487'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#c2ebdf'
  primary-fixed-dim: '#a6cfc4'
  on-primary-fixed: '#00201a'
  on-primary-fixed-variant: '#284d45'
  secondary-fixed: '#ffdbd2'
  secondary-fixed-dim: '#ffb4a1'
  on-secondary-fixed: '#3c0800'
  on-secondary-fixed-variant: '#891e00'
  tertiary-fixed: '#ffdad2'
  tertiary-fixed-dim: '#f1baac'
  on-tertiary-fixed: '#31130b'
  on-tertiary-fixed-variant: '#643d33'
  background: '#faf9f5'
  on-background: '#1b1c1a'
  surface-variant: '#e3e2df'
  surface-white: '#FFFFFF'
  surface-elevated: '#FAFAF8'
  primary-hover: '#1E5248'
  primary-soft: rgba(22, 61, 53, 0.08)
  text-primary: '#121212'
  text-secondary: '#6B6B6B'
  text-tertiary: '#9CA3AF'
  border-subtle: rgba(0, 0, 0, 0.07)
  border-strong: rgba(0, 0, 0, 0.12)
typography:
  display-lg:
    fontFamily: DM Sans
    fontSize: 36px
    fontWeight: '700'
    lineHeight: '1.2'
  display-lg-mobile:
    fontFamily: DM Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Noto Sans SC
    fontSize: 18px
    fontWeight: '600'
    lineHeight: '1.5'
  body-md:
    fontFamily: Noto Sans SC
    fontSize: 15px
    fontWeight: '400'
    lineHeight: '1.6'
  label-sm:
    fontFamily: DM Sans
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1'
    letterSpacing: 0.05em
  mono-num:
    fontFamily: DM Sans
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  container-max: 1280px
  margin-edge: 24px
  gutter: 20px
  unit-xs: 4px
  unit-sm: 8px
  unit-md: 16px
  unit-lg: 24px
  unit-xl: 48px
---

## 品牌与风格

此设计系统专为“播客流”(Podcast Flow) 打造，旨在营造一种如晨间纸质阅读般的温暖、宁静且专注的混音体验。

### 设计愿景
设计风格定义为 **现代温暖主义 (Modern Warmth)**。它结合了极简主义的克制与触感设计的温度。界面通过大面积的留白（纸张色底色）和细腻的色彩过渡，消除数字产品的冰冷感，使用户能够沉浸在音频剪辑与流转的艺术中。

### 核心美学
- **宁静感 (Serenity):** 使用非纯白的暖色调底色，减少视觉疲劳。
- **专业感 (Focused):** 核心交互组件（如滑块、波形图）使用深色调翠绿色，确保功能区域清晰可见。
- **触感化 (Tactile):** 通过柔和的分层阴影和圆润的轮廓，使界面元素看起来如同放置在桌面上的实体卡片。

## 色彩方案

色彩系统以“暖纸色”为基调，配以深邃的“森林绿”作为功能核心，并以“夕阳橙”作为情绪点缀。

- **背景逻辑:** 全局背景采用 `#F5F4F0`。在桌面端建议在左上角叠加 `radial-gradient(circle, rgba(22,61,53,0.03) 0%, transparent 70%)`，右上角叠加 `radial-gradient(circle, rgba(232,71,26,0.03) 0%, transparent 70%)`，以增加环境氛围。
- **层级区分:** 
  - **Level 0 (Background):** `#F5F4F0` 用于应用底色。
  - **Level 1 (Surface):** `#FFFFFF` 用于主要的交互卡片和内容容器。
  - **Level 2 (Elevated):** `#FAFAF8` 用于侧边栏或次要悬浮区域。
- **状态颜色:** 所有的点击、激活、进度条填充均统一使用 `#163D35`。橙色 `#E8471A` 仅用于背景音乐 (BGM) 标记或强提醒。

## 字体排版

此设计系统采用双语字体策略。**Noto Sans SC** 提供清晰的中文阅读体验，而 **DM Sans** 则赋予数字和西文标题一种现代且几何的节奏感。

- **页面标题:** 使用 `display-lg`，强调内容的起始点。
- **节段标题:** 使用 `headline-md`，为混音面板或播放列表提供明确的分类。
- **数字显示:** 所有的音频时长、音量百分比建议强制使用 `DM Sans`，以确保数字对齐美观。
- **正文:** 保持在 `15px`，以确保在长时间编辑过程中文字依然清晰易读，不会因字号过小导致视觉疲劳。

## 布局与间距

采用基于 **8px** 的网格系统，但在卡片容器上使用更宽松的 **24px (unit-lg)** 内衬，以体现“流”的宽裕感。

- **布局模型:** 采用流式网格 (Fluid Grid)。侧边栏通常固定为 280px-320px，主操作区根据浏览器宽度自适应缩放。
- **断点策略:**
  - **Desktop (1024px+):** 12栏布局，主卡片居中。
  - **Tablet (768px-1023px):** 侧边栏折叠为图标模式，增加触控区域间距。
  - **Mobile (<767px):** 切换为单栏垂直堆叠，左右页边距缩小至 16px。
- **间距韵律:** 元素内部关联使用 `8px`，组件间距使用 `16px`，大区域分隔使用 `48px`。

## 高度与深度

为了维持“暖纸”的质感，不使用深重、生硬的投影，而是采用多层柔和的阴影来模拟物理厚度。

- **环境层 (Base):** 无投影，直接位于底色上。
- **卡片层 (Card):** 使用极轻的投影：`0 4px 20px rgba(0,0,0,0.04)`。
- **悬浮层 (Hover):** 当鼠标悬停在卡片上时，卡片向上位移 2px，阴影变为：`0 12px 30px rgba(0,0,0,0.08)`，产生“浮起”的动态反馈。
- **控制组件 (Controls):** 按钮和输入框仅使用 `1px` 的 `border-subtle`，只有在悬浮或激活时才赋予深度感，保持界面的平整性。

## 形状

形状设计语言趋向于温润与友好，避免任何尖锐的夹角。

- **大型卡片:** 统一使用 `16px` 圆角，赋予产品现代感的轮廓。
- **交互组件:** 按钮、搜索框、输入框使用 `10px` 圆角。这种适度的圆润感既保留了工具的严谨性，又比完全的圆角矩形更具专业感。
- **标签与状态:** Badge、Chip、Pill 组件统一使用 `999px` 全圆角，强调其作为独立、可交互实体的属性。

## 组件规范

### 1. 按钮 (Buttons)
- **Primary:** 背景 `#163D35`，文字白色。悬浮时切换至 `#1E5248`。
- **Secondary:** 背景 `primary-soft`，文字 `#163D35`。用于次要操作。
- **Icon Button:** 采用极简线性图标，无背景，仅在悬浮时显示浅灰色圆形背景。

### 2. 播客专用滑块 (Custom Slider)
- **轨道 (Track):** 高度 8px，底色为透明度 10% 的 Primary Green。
- **进度填充 (Fill):** `#163D35`。
- **滑块头 (Thumb):** 24px 直径圆，背景白色，带有 2px 的 `#163D35` 描边。

### 3. 卡片 (Cards)
- 背景为 `#FFFFFF`，边缘使用 `border-subtle`。
- 用于展示播客封面、节目列表或混音轨道。封面图建议应用 `8px` 圆角。

### 4. 输入框 (Inputs)
- 边框使用 `border-strong`，背景在非激活状态下与 `surface-elevated` 保持一致。
- 获取焦点时，边框颜色变为 `#163D35`。

### 5. 提示标签 (Chips/Badges)
- **BGM Badge:** 背景 `#E8471A`，文字白色。
- **Category Chip:** 浅绿色背景，`#163D35` 文字，全圆角。

### 6. 音频波形 (Waveforms)
- 静态部分使用 `text-tertiary`。
- 已播放/选定部分使用 `primary_color_hex`，呈现细腻的线性排列。