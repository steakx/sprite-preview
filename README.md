# Sprite Preview

一个纯前端的精灵表图预览工具，用于快速验证帧动画效果。

## 功能特性

### 核心功能

- **图片上传** - 支持拖拽或点击上传 PNG/JPG 格式的精灵表图（最大 200MB）
- **精灵切分** - 指定行列数自动切分精灵表图
- **动画播放** - 实时预览帧动画效果
- **FPS 调节** - 滑块控制播放速度（1-60 FPS）

### 播放控制

- **循环/单次播放** - 切换循环或单次播放模式
- **正序/倒序播放** - 支持正向和反向播放
- **帧跳转** - 点击帧指示器跳转到指定帧
- **帧范围选择** - 设置播放起始帧和结束帧

### 导出功能

- **GIF 导出** - 导出动画为 GIF 文件（透明背景）
- **PNG 序列导出** - 导出帧范围为 ZIP 打包的 PNG 序列
- **JSON 配置导出** - 导出切分参数配置文件

### 界面特性

- **深色主题** - 适合长时间使用的深色界面
- **左右分栏布局** - 控制面板 30%，预览区 70%
- **响应式设计** - 自动适配桌面和移动端
- **帧网格预览** - 显示所有帧的缩略图，支持点击跳转

## 技术栈

- **前端框架**: 无框架 - 原生 JavaScript (ES6+)
- **样式**: 原生 CSS
- **渲染**: Canvas API
- **动画**: requestAnimationFrame
- **存储**: localStorage

## 项目结构

```
sprite-preview/
├── index.html              # 单页入口
├── css/
│   └── style.css           # 深色主题样式
├── js/
│   ├── main.js             # 应用入口、事件绑定
│   ├── sprite.js           # 精灵切分逻辑
│   ├── animator.js         # 动画播放控制
│   ├── storage.js          # localStorage 配置管理
│   ├── gif-export.js       # GIF 导出模块
│   ├── file-export.js      # PNG/JSON 导出模块
│   └── lib/
│       ├── gif.js          # GIF 编码库
│       ├── gif.worker.js   # GIF Worker
│       └── jszip.min.js    # ZIP 打包库
└── assets/
    └── icons/              # 图标目录
```

## 部署方式

### 方式一：直接打开

无需任何服务器或构建工具，直接在浏览器中打开 `index.html` 即可使用。

```bash
# Windows
start index.html

# macOS
open index.html

# Linux
xdg-open index.html
```

### 方式二：本地服务器

使用任意静态文件服务器托管：

```bash
# 使用 Python
python -m http.server 8080

# 使用 Node.js (需安装 serve)
npx serve -l 3000

# 使用 PHP
php -S localhost:8080
```

然后访问 `http://localhost:8080` 或对应端口。

### 方式三：部署到静态托管平台

项目为纯静态文件，可直接部署到：

- GitHub Pages
- Netlify
- Vercel
- Cloudflare Pages
- 任意静态文件服务器

只需将整个目录上传即可，无需构建步骤。

## 使用方式

1. **上传图片** - 拖拽或点击上传精灵表图
2. **设置参数** - 输入行列数，调节 FPS
3. **播放预览** - 点击播放按钮查看动画效果
4. **调整控制** - 切换循环/倒序，设置帧范围
5. **导出文件** - 导出 GIF、PNG 序列或 JSON 配置

## 浏览器支持

| 浏览器 | 版本要求 |
|--------|----------|
| Chrome | 最新版 + 前2版本 |
| Firefox | 最新版 + 前2版本 |
| Edge | 最新版 + 前2版本 |
| Safari | 最新版 + 前2版本 |

**不支持**: IE 及旧版浏览器

## 配置自动保存

应用的配置参数（行列数、FPS）会自动保存到 localStorage，下次打开自动恢复。

localStorage 键名（`sp_` 前缀）:
- `sp_rows` - 行数
- `sp_cols` - 列数  
- `sp_fps` - 帧率

## 开发说明

### 模块依赖关系

```
main.js (入口)
  ├── sprite.js (精灵切分)
  ├── animator.js (动画播放)
  ├── storage.js (配置存储)
  ├── gif-export.js (GIF 导出)
  └── file-export.js (文件导出)
```

### 状态管理

使用简单对象管理全局状态：

```javascript
const state = {
  image: null,           // 原始图片
  imageWidth: 0,         // 图片宽度
  imageHeight: 0,        // 图片高度
  rows: 4,               // 切分行数
  cols: 4,               // 切分列数
  fps: 8,                // 帧率
  isPlaying: false,      // 播放状态
  isLooping: true,       // 循环播放
  isReverse: false,      // 倒序播放
  currentFrame: 0,       // 当前帧
  totalFrames: 16,       // 总帧数
  cachedFrames: [],      // 预缓存帧数组
  frameRange: {          // 播放范围
    start: 0,
    end: 15
  }
};
```

## License

MIT License - 自由使用和修改

## 作者

开发用于个人游戏开发工具，解决精灵动画快速验证的痛点。