/**
 * main.js - 应用入口模块
 * 负责: 初始化、事件绑定、模块协调、模式切换
 */

import { cacheFrames } from './sprite.js';
import { startAnimation, stopAnimation, renderCurrentFrame, updatePlayButton } from './animator.js';
import { saveConfig, loadConfig, clearConfig } from './storage.js';
import { exportGif } from './gif-export.js';
import { exportJson, exportPngSequence } from './file-export.js';
import { startWalkAnimation, stopWalkAnimation, renderWalkFrame, updateWalkPlayButton, resetWalkPosition, initWalkMode, cleanupWalkMode } from './walkAnimator.js';
import { loadBackground, clearBackground, showBackgroundPreview, resetBackgroundUploadZone } from './background.js';
import { initYAxisControl, setYAxisPosition } from './yAxisControl.js';
import { initSpriteResizeControl } from './spriteResizeControl.js';

// 全局状态对象
const state = {
  // === 预览模式 ===
  previewMode: 'static',     // 'static' | 'walk'  预览模式

  // === 图片相关 ===
  image: null,
  imageWidth: 0,
  imageHeight: 0,

  // === 切分参数 ===
  rows: 4,
  cols: 4,

  // === 静止动画参数 ===
  fps: 8,
  isPlaying: false,
  isLooping: true,      // 循环播放开关
  isReverse: false,     // 倒序播放开关
  currentFrame: 0,
  totalFrames: 16,
  cachedFrames: [],
  // 帧范围
  frameRange: {
    start: 0,   // 起始帧索引 (0-based)
    end: 15     // 结束帧索引 (0-based)
  },

  // === 行走预览参数 ===
  background: null,          // 背景图片对象
  backgroundWidth: 0,        // 背景宽度
  backgroundHeight: 0,       // 背景高度

  walkY: 400,                // Y轴位置（地面高度）
  walkSpeed: 50,             // 行走速度（像素/秒）
  walkX: 0,                  // 当前X坐标位置
  walkStartFrame: 0,         // 行走动画起始帧
  walkEndFrame: 15,          // 行走动画结束帧
  walkLoopMode: 'infinite',  // 'infinite' | 指定次数
  walkLoopCount: 0,          // 已循环次数
  isWalkPlaying: false,      // 行走动画播放状态
  walkCurrentFrame: 0,       // 行走当前帧

  // === Canvas尺寸 ===
  canvasWidth: 800,          // 预览Canvas宽度（固定）
  canvasHeight: 600,         // 预览Canvas高度（固定）

  // === 背景渲染参数 ===
  backgroundMode: 'fit',     // 'tile' | 'stretch' | 'fit'（自适应填满）

  // === 精灵缩放参数 ===
  spriteScale: 1.0,          // 缩放比例（0.1 - 5.0）
};

// 最大文件大小限制 (200MB)
const MAX_FILE_SIZE = 200 * 1024 * 1024;

/**
 * 初始化应用
 */
function init() {
  // 暴露state到window（供yAxisControl.js使用）
  window.appState = state;

  // 加载保存的配置
  const savedConfig = loadConfig();
  state.rows = savedConfig.rows;
  state.cols = savedConfig.cols;
  state.fps = savedConfig.fps;
  state.backgroundMode = savedConfig.backgroundMode;
  state.spriteScale = savedConfig.spriteScale || 1.0; // 确保有效值
  state.walkY = savedConfig.walkY;

  // 设置UI初始值（静止模式）
  document.getElementById('rows-input').value = state.rows;
  document.getElementById('cols-input').value = state.cols;
  document.getElementById('fps-slider').value = state.fps;
  document.getElementById('fps-value').textContent = state.fps;

  // 设置UI初始值（行走模式）
  document.getElementById('walk-rows-input').value = state.rows;
  document.getElementById('walk-cols-input').value = state.cols;
  document.getElementById('walk-y-input').value = state.walkY;
  document.getElementById('walk-speed-slider').value = state.walkSpeed;
  document.getElementById('walk-speed-value').textContent = state.walkSpeed;
  document.getElementById('walk-start-frame').value = state.walkStartFrame + 1;
  document.getElementById('walk-end-frame').value = state.walkEndFrame + 1;
  document.getElementById('sprite-scale-slider').value = state.spriteScale * 100;
  document.getElementById('sprite-scale-value').textContent = `${Math.round(state.spriteScale * 100)}%`;
  document.getElementById('background-mode-select').value = state.backgroundMode;

  // 初始化帧范围
  state.totalFrames = state.rows * state.cols;
  state.frameRange.end = state.totalFrames - 1;
  state.walkEndFrame = state.totalFrames - 1;
  document.getElementById('end-frame-input').value = state.totalFrames;
  document.getElementById('walk-end-frame').value = state.totalFrames;

  // 设置循环按钮初始状态
  updateLoopButton(state.isLooping);
  updateDirectionButton(state.isReverse);

  // 初始化Y轴拖拽控制
  const canvas = document.getElementById('preview-canvas');
  initYAxisControl(state, canvas);

  // 初始化精灵缩放拖拽控制
  initSpriteResizeControl(state, canvas);

  // 绑定事件
  setupEventListeners();

  // 设置初始模式
  state.previewMode = 'static';

  console.log('Sprite Preview initialized');
}

/**
 * 设置事件监听器
 */
function setupEventListeners() {
  // === 静止动画预览模式事件 ===

  // 上传区拖拽事件
  const uploadZone = document.getElementById('upload-zone');
  uploadZone.addEventListener('dragover', handleDragOver);
  uploadZone.addEventListener('dragleave', handleDragLeave);
  uploadZone.addEventListener('drop', handleFileDrop);

  // 点击上传（鼠标和键盘）
  uploadZone.addEventListener('click', () => {
    document.getElementById('file-input').click();
  });
  uploadZone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      document.getElementById('file-input').click();
    }
  });
  document.getElementById('file-input').addEventListener('change', handleFileSelect);

  // 参数变化事件
  document.getElementById('rows-input').addEventListener('change', handleRowsChange);
  document.getElementById('cols-input').addEventListener('change', handleColsChange);
  document.getElementById('fps-slider').addEventListener('input', handleFpsChange);

  // 帧范围变化事件
  document.getElementById('start-frame-input').addEventListener('change', handleStartFrameChange);
  document.getElementById('end-frame-input').addEventListener('change', handleEndFrameChange);

  // 播放按钮
  document.getElementById('play-btn').addEventListener('click', handlePlayClick);

  // 清除按钮
  document.getElementById('clear-btn').addEventListener('click', handleClearClick);

  // 循环播放按钮
  document.getElementById('loop-btn').addEventListener('click', handleLoopClick);

  // 播放方向按钮
  document.getElementById('direction-btn').addEventListener('click', handleDirectionClick);

  // GIF 导出按钮
  document.getElementById('export-gif-btn').addEventListener('click', handleExportGifClick);

  // JSON 导出按钮
  document.getElementById('export-json-btn').addEventListener('click', handleExportJsonClick);

  // PNG 导出按钮
  document.getElementById('export-png-btn').addEventListener('click', handleExportPngClick);

  // 帧指示器点击（帧跳转）
  const frameIndicator = document.getElementById('frame-indicator');
  frameIndicator.addEventListener('click', handleFrameIndicatorClick);
  frameIndicator.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleFrameIndicatorClick();
    }
  });

  // === 模式切换事件 ===
  document.getElementById('static-mode-btn').addEventListener('click', handleStaticModeClick);
  document.getElementById('walk-mode-btn').addEventListener('click', handleWalkModeClick);

  // === 行走预览模式事件 ===

  // 精灵上传（行走模式）
  const spriteUploadZone = document.getElementById('sprite-upload-zone');
  spriteUploadZone.addEventListener('dragover', handleDragOver);
  spriteUploadZone.addEventListener('dragleave', handleDragLeave);
  spriteUploadZone.addEventListener('drop', handleSpriteDrop);
  spriteUploadZone.addEventListener('click', () => {
    document.getElementById('sprite-input').click();
  });
  document.getElementById('sprite-input').addEventListener('change', handleSpriteSelect);

  // 背景上传
  const backgroundUploadZone = document.getElementById('background-upload-zone');
  backgroundUploadZone.addEventListener('dragover', handleDragOver);
  backgroundUploadZone.addEventListener('dragleave', handleDragLeave);
  backgroundUploadZone.addEventListener('drop', handleBackgroundDrop);
  backgroundUploadZone.addEventListener('click', (e) => {
    // 如果点击的是清除按钮，不触发文件选择器
    if (e.target.closest('#clear-background-btn')) return;
    document.getElementById('background-input').click();
  });
  document.getElementById('background-input').addEventListener('change', handleBackgroundSelect);

  // 背景渲染模式选择
  document.getElementById('background-mode-select').addEventListener('change', handleBackgroundModeChange);

  // 行走参数变化
  document.getElementById('walk-y-input').addEventListener('change', handleWalkYChange);
  document.getElementById('walk-speed-slider').addEventListener('input', handleWalkSpeedChange);
  document.getElementById('walk-rows-input').addEventListener('change', handleWalkRowsChange);
  document.getElementById('walk-cols-input').addEventListener('change', handleWalkColsChange);
  document.getElementById('walk-start-frame').addEventListener('change', handleWalkStartFrameChange);
  document.getElementById('walk-end-frame').addEventListener('change', handleWalkEndFrameChange);
  document.getElementById('sprite-scale-slider').addEventListener('input', handleSpriteScaleChange);

  // 行走控制按钮
  document.getElementById('walk-play-btn').addEventListener('click', handleWalkPlayClick);
  document.getElementById('walk-reset-btn').addEventListener('click', handleWalkResetClick);

  // 循环模式选择
  document.getElementById('loop-mode-select').addEventListener('change', handleLoopModeChange);

  // === 全局事件 ===

  // 页面可见性变化（暂停动画）
  document.addEventListener('visibilitychange', handleVisibilityChange);

  // 键盘无障碍
  document.addEventListener('keydown', handleKeyDown);
}

// === 事件处理函数 ===

function handleDragOver(e) {
  e.preventDefault();
  e.stopPropagation();
  e.currentTarget.classList.add('is-dragging');
}

function handleDragLeave(e) {
  e.preventDefault();
  e.stopPropagation();
  e.currentTarget.classList.remove('is-dragging');
}

function handleFileDrop(e) {
  e.preventDefault();
  e.stopPropagation();
  e.currentTarget.classList.remove('is-dragging');

  const files = e.dataTransfer.files;
  if (files.length) {
    processFile(files[0]);
  }
}

function handleFileSelect(e) {
  const files = e.target.files;
  if (files.length) {
    processFile(files[0]);
  }
}

function handleRowsChange(e) {
  const value = parseInt(e.target.value, 10);
  if (value >= 1) {
    state.rows = value;
    state.totalFrames = state.rows * state.cols;
    // 重置帧范围
    state.frameRange.start = 0;
    state.frameRange.end = state.totalFrames - 1;
    updateFrameRangeInputs();
    saveConfig({ rows: state.rows, cols: state.cols, fps: state.fps, backgroundMode: state.backgroundMode, spriteScale: state.spriteScale, walkY: state.walkY });

    if (state.image) {
      cacheFrames(state);
      renderCurrentFrame(state, document.getElementById('preview-canvas'));
      showFrameGrid();
    }
  }
}

function handleColsChange(e) {
  const value = parseInt(e.target.value, 10);
  if (value >= 1) {
    state.cols = value;
    state.totalFrames = state.rows * state.cols;
    // 重置帧范围
    state.frameRange.start = 0;
    state.frameRange.end = state.totalFrames - 1;
    updateFrameRangeInputs();
    saveConfig({ rows: state.rows, cols: state.cols, fps: state.fps, backgroundMode: state.backgroundMode, spriteScale: state.spriteScale, walkY: state.walkY });

    if (state.image) {
      cacheFrames(state);
      renderCurrentFrame(state, document.getElementById('preview-canvas'));
      showFrameGrid();
    }
  }
}

function handleFpsChange(e) {
  const value = parseInt(e.target.value, 10);
  state.fps = value;
  document.getElementById('fps-value').textContent = value;
  saveConfig({ rows: state.rows, cols: state.cols, fps: state.fps, backgroundMode: state.backgroundMode, spriteScale: state.spriteScale, walkY: state.walkY });
}

function handleStartFrameChange(e) {
  const value = parseInt(e.target.value, 10);
  if (value >= 1 && value <= state.totalFrames) {
    state.frameRange.start = value - 1;
    // 确保起始帧不超过结束帧
    if (state.frameRange.start > state.frameRange.end) {
      state.frameRange.end = state.frameRange.start;
      document.getElementById('end-frame-input').value = state.frameRange.end + 1;
    }
    // 重置当前帧到范围内
    if (state.currentFrame < state.frameRange.start) {
      state.currentFrame = state.frameRange.start;
      renderCurrentFrame(state, document.getElementById('preview-canvas'));
      updateFrameIndicator();
    }
    updateThumbnailHighlight();
  }
}

function handleEndFrameChange(e) {
  const value = parseInt(e.target.value, 10);
  if (value >= 1 && value <= state.totalFrames) {
    state.frameRange.end = value - 1;
    // 确保结束帧不小于起始帧
    if (state.frameRange.end < state.frameRange.start) {
      state.frameRange.start = state.frameRange.end;
      document.getElementById('start-frame-input').value = state.frameRange.start + 1;
    }
    // 重置当前帧到范围内
    if (state.currentFrame > state.frameRange.end) {
      state.currentFrame = state.frameRange.end;
      renderCurrentFrame(state, document.getElementById('preview-canvas'));
      updateFrameIndicator();
    }
    updateThumbnailHighlight();
  }
}

function handlePlayClick() {
  const canvas = document.getElementById('preview-canvas');

  if (state.isPlaying) {
    stopAnimation(state);
    updatePlayButton(false);
  } else {
    startAnimation(state, canvas);
    updatePlayButton(true);
  }
}

function handleVisibilityChange() {
  if (document.hidden) {
    // 静止动画
    if (state.isPlaying) {
      stopAnimation(state);
      updatePlayButton(false);
    }
    // 行走动画
    if (state.isWalkPlaying) {
      stopWalkAnimation(state);
      updateWalkPlayButton(false);
    }
  }
}

/**
 * 清除配置按钮点击
 */
function handleClearClick() {
  clearConfig();
  state.rows = 4;
  state.cols = 4;
  state.fps = 8;

  // 更新UI
  document.getElementById('rows-input').value = state.rows;
  document.getElementById('cols-input').value = state.cols;
  document.getElementById('fps-slider').value = state.fps;
  document.getElementById('fps-value').textContent = state.fps;
}

/**
 * 循环播放按钮点击
 */
function handleLoopClick() {
  state.isLooping = !state.isLooping;
  updateLoopButton(state.isLooping);
}

/**
 * 播放方向按钮点击
 */
function handleDirectionClick() {
  state.isReverse = !state.isReverse;
  updateDirectionButton(state.isReverse);
}

/**
 * GIF 导出按钮点击
 */
function handleExportGifClick() {
  if (!state.cachedFrames.length) {
    showError('请先上传并切分图片');
    return;
  }

  const btn = document.getElementById('export-gif-btn');
  const originalText = btn.textContent;
  btn.textContent = '生成中...';
  btn.classList.add('is-loading');
  btn.disabled = true;

  exportGif(state,
    (progress) => {
      btn.textContent = `生成中 ${progress}%`;
    },
    () => {
      btn.textContent = originalText;
      btn.classList.remove('is-loading');
      btn.disabled = false;
      showSuccess('GIF 导出成功');
    }
  );
}

/**
 * JSON 配置导出按钮点击
 */
function handleExportJsonClick() {
  if (!state.image) {
    showError('请先上传图片');
    return;
  }
  exportJson(state);
}

/**
 * PNG 序列导出按钮点击
 */
function handleExportPngClick() {
  if (!state.cachedFrames.length) {
    showError('请先上传并切分图片');
    return;
  }
  exportPngSequence(state);
}

/**
 * 帧指示器点击 - 显示帧跳转输入
 */
function handleFrameIndicatorClick() {
  if (state.totalFrames === 0) return;

  // 创建帧跳转输入对话框
  const input = prompt(`跳转到帧 (1-${state.totalFrames}):`, state.currentFrame + 1);
  if (input === null) return;

  const frameNum = parseInt(input, 10);
  if (frameNum >= 1 && frameNum <= state.totalFrames) {
    jumpToFrame(frameNum - 1);
  }
}

/**
 * 跳转到指定帧
 * @param {number} frameIndex - 帧索引 (0-based)
 */
function jumpToFrame(frameIndex) {
  if (frameIndex < 0 || frameIndex >= state.totalFrames) return;

  state.currentFrame = frameIndex;
  renderCurrentFrame(state, document.getElementById('preview-canvas'));
  updateFrameIndicator();
}

/**
 * 键盘无障碍处理
 */
function handleKeyDown(e) {
  const fpsSlider = document.getElementById('fps-slider');

  // 焦点在FPS滑块时，支持箭头键调节
  if (document.activeElement === fpsSlider) {
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
      e.preventDefault();
      fpsSlider.value = Math.min(60, parseInt(fpsSlider.value, 10) + 1);
      fpsSlider.dispatchEvent(new Event('input'));
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
      e.preventDefault();
      fpsSlider.value = Math.max(1, parseInt(fpsSlider.value, 10) - 1);
      fpsSlider.dispatchEvent(new Event('input'));
    }
  }

  // 空格键播放/暂停（焦点在播放按钮时）
  if (e.key === ' ' && document.activeElement === document.getElementById('play-btn')) {
    e.preventDefault();
    handlePlayClick();
  }
}

// === 文件处理 ===

function processFile(file) {
  // 验证文件类型
  if (!file.type.match(/image\/(png|jpeg|jpg)/)) {
    showError('仅支持PNG/JPG格式');
    return;
  }

  // 验证文件大小
  if (file.size > MAX_FILE_SIZE) {
    showError('文件过大，最大支持200MB');
    return;
  }

  hideError();
  showLoading(file.size);

  const reader = new FileReader();

  reader.onprogress = (e) => {
    if (e.lengthComputable) {
      updateProgress(Math.round((e.loaded / e.total) * 100));
    }
  };

  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      state.image = img;
      state.imageWidth = img.width;
      state.imageHeight = img.height;
      state.currentFrame = 0;

      // 重置帧范围
      state.frameRange.start = 0;
      state.frameRange.end = state.rows * state.cols - 1;
      updateFrameRangeInputs();

      hideLoading();
      showImagePreview(img);

      // 切分精灵
      cacheFrames(state);
      renderCurrentFrame(state, document.getElementById('preview-canvas'));
      updateFrameIndicator();

      // 显示帧网格预览和导出面板
      showFrameGrid();
      document.getElementById('export-panel').hidden = false;
    };
    img.src = e.target.result;
  };

  reader.onerror = () => {
    hideLoading();
    showError('图片加载失败');
  };

  reader.readAsDataURL(file);
}

// === UI辅助函数 ===

function showError(message) {
  const errorEl = document.getElementById('error-message');
  errorEl.textContent = message;
  errorEl.hidden = false;
}

function hideError() {
  document.getElementById('error-message').hidden = true;
}

function showSuccess(message) {
  const errorEl = document.getElementById('error-message');
  errorEl.textContent = message;
  errorEl.classList.add('is-success');
  errorEl.hidden = false;

  // 3秒后自动隐藏
  setTimeout(() => {
    errorEl.hidden = true;
    errorEl.classList.remove('is-success');
  }, 3000);
}

function showLoading(fileSize) {
  const uploadZone = document.getElementById('upload-zone');
  uploadZone.classList.add('is-loading');

  // 大文件显示进度条
  if (fileSize > 50 * 1024 * 1024) {
    const progressHtml = '<div class="progress-bar"><div class="progress-fill" style="width: 0%"></div></div><p class="loading-text">加载中...</p>';
    uploadZone.innerHTML = progressHtml;
  }
}

function updateProgress(percent) {
  const progressFill = document.querySelector('.progress-fill');
  if (progressFill) {
    progressFill.style.width = percent + '%';
  }
}

function hideLoading() {
  const uploadZone = document.getElementById('upload-zone');
  uploadZone.classList.remove('is-loading');
}

function showImagePreview(img) {
  const uploadZone = document.getElementById('upload-zone');
  // 保留隐藏的 file-input 元素，并添加重新上传提示
  uploadZone.innerHTML = `
    <img src="${img.src}" alt="精灵表图预览" class="preview-thumb">
    <p class="image-info">${img.width} × ${img.height}</p>
    <p class="reupload-hint">点击重新上传</p>
    <input type="file" id="file-input" accept=".png,.jpg,.jpeg" hidden aria-label="选择文件">
  `;
  // 重新绑定文件选择事件
  document.getElementById('file-input').addEventListener('change', handleFileSelect);
}

function updateFrameIndicator() {
  const indicator = document.getElementById('frame-indicator');
  indicator.textContent = `帧 ${state.currentFrame + 1}/${state.totalFrames}`;
}

function updateFrameRangeInputs() {
  document.getElementById('start-frame-input').value = state.frameRange.start + 1;
  document.getElementById('end-frame-input').value = state.frameRange.end + 1;
  document.getElementById('end-frame-input').max = state.totalFrames;
  document.getElementById('start-frame-input').max = state.totalFrames;
}

/**
 * 更新循环播放按钮状态
 * @param {boolean} isLooping - 是否循环播放
 */
function updateLoopButton(isLooping) {
  const btn = document.getElementById('loop-btn');
  if (btn) {
    btn.classList.toggle('is-active', isLooping);
    btn.setAttribute('aria-label', isLooping ? '循环播放开启' : '循环播放关闭');
    btn.setAttribute('aria-pressed', isLooping ? 'true' : 'false');
  }
}

/**
 * 更新播放方向按钮状态
 * @param {boolean} isReverse - 是否倒序播放
 */
function updateDirectionButton(isReverse) {
  const btn = document.getElementById('direction-btn');
  if (btn) {
    btn.textContent = isReverse ? '⬅' : '➡';
    btn.classList.toggle('is-reverse', isReverse);
    btn.setAttribute('aria-label', isReverse ? '倒序播放' : '正序播放');
    btn.setAttribute('aria-pressed', isReverse ? 'true' : 'false');
  }
}

/**
 * 生成并显示帧网格预览
 */
function showFrameGrid() {
  if (!state.cachedFrames.length) return;

  const gridContainer = document.getElementById('frame-grid');
  const thumbnailsContainer = document.getElementById('frame-thumbnails');

  // 清空现有缩略图
  thumbnailsContainer.innerHTML = '';

  // 设置网格列数
  thumbnailsContainer.style.gridTemplateColumns = `repeat(${state.cols}, 1fr)`;

  // 创建每帧缩略图
  state.cachedFrames.forEach((frameCanvas, index) => {
    const thumbWrapper = document.createElement('div');
    thumbWrapper.className = 'frame-thumb';
    thumbWrapper.setAttribute('role', 'button');
    thumbWrapper.setAttribute('tabindex', '0');
    thumbWrapper.setAttribute('aria-label', `帧 ${index + 1}`);

    // 克隆帧Canvas为缩略图
    const thumbImg = document.createElement('img');
    thumbImg.src = frameCanvas.toDataURL();
    thumbImg.alt = `帧 ${index + 1}`;

    thumbWrapper.appendChild(thumbImg);

    // 点击跳转到该帧
    thumbWrapper.addEventListener('click', () => {
      jumpToFrame(index);
      updateThumbnailHighlight();
    });
    thumbWrapper.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        jumpToFrame(index);
        updateThumbnailHighlight();
      }
    });

    thumbnailsContainer.appendChild(thumbWrapper);
  });

  // 显示网格区域
  gridContainer.hidden = false;
  updateThumbnailHighlight();
}

/**
 * 更新缩略图高亮状态（包含帧范围标记）
 */
function updateThumbnailHighlight() {
  const thumbs = document.querySelectorAll('.frame-thumb');
  thumbs.forEach((thumb, index) => {
    thumb.classList.toggle('is-current', index === state.currentFrame);
    thumb.classList.toggle('in-range', index >= state.frameRange.start && index <= state.frameRange.end);
  });
}

// === 模式切换处理函数 ===

function handleStaticModeClick() {
  if (state.previewMode === 'static') return;

  // 清理行走模式
  cleanupWalkMode(state);

  // 更新UI
  document.getElementById('static-mode-btn').classList.add('is-active');
  document.getElementById('walk-mode-btn').classList.remove('is-active');
  document.getElementById('static-panel').hidden = false;
  document.getElementById('walk-panel').hidden = true;

  // 如果有图片，恢复静止预览
  if (state.image) {
    renderCurrentFrame(state, document.getElementById('preview-canvas'));
  }
}

function handleWalkModeClick() {
  if (state.previewMode === 'walk') return;

  // 停止静止动画
  if (state.isPlaying) {
    stopAnimation(state);
    updatePlayButton(false);
  }

  // 初始化行走模式
  initWalkMode(state);

  // 更新UI
  document.getElementById('static-mode-btn').classList.remove('is-active');
  document.getElementById('walk-mode-btn').classList.add('is-active');
  document.getElementById('static-panel').hidden = true;
  document.getElementById('walk-panel').hidden = false;
}

// === 行走预览事件处理函数 ===

function handleSpriteDrop(e) {
  e.preventDefault();
  e.stopPropagation();
  e.currentTarget.classList.remove('is-dragging');

  const files = e.dataTransfer.files;
  if (files.length) {
    processSpriteFile(files[0]);
  }
}

function handleSpriteSelect(e) {
  const files = e.target.files;
  if (files.length) {
    processSpriteFile(files[0]);
  }
}

function processSpriteFile(file) {
  if (!file.type.match(/image\/(png|jpeg|jpg)/)) {
    showError('仅支持PNG/JPG格式');
    return;
  }

  if (file.size > MAX_FILE_SIZE) {
    showError('文件过大，最大支持200MB');
    return;
  }

  hideError();
  showLoading(file.size);

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      state.image = img;
      state.imageWidth = img.width;
      state.imageHeight = img.height;
      state.totalFrames = state.rows * state.cols;
      state.walkEndFrame = state.totalFrames - 1;

      // 缓存帧
      cacheFrames(state);

      // 计算帧高度，设置合理的初始 walkY（精灵底部在Canvas中间位置）
      if (state.cachedFrames.length > 0 && state.previewMode === 'walk') {
        const frameHeight = state.cachedFrames[0].height;
        const scale = state.spriteScale || 1.0;
        const scaledHeight = frameHeight * scale;

        // 设置初始位置：精灵底部在Canvas底部附近
        if (state.walkY === 200) {
          // 默认值，需要调整
          state.walkY = Math.min(state.canvasHeight - 20, state.canvasHeight / 2 + scaledHeight / 2);
        }

        // 更新 UI
        document.getElementById('walk-y-input').value = state.walkY;
      }

      hideLoading();
      showSpritePreview(img);

      if (state.previewMode === 'walk') {
        renderWalkFrame(state, document.getElementById('preview-canvas'));
        document.getElementById('walk-end-frame').value = state.totalFrames;
      }
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function showSpritePreview(img) {
  const uploadZone = document.getElementById('sprite-upload-zone');
  uploadZone.innerHTML = `
    <img src="${img.src}" alt="精灵表图预览" class="preview-thumb">
    <p class="image-info">${img.width} × ${img.height}</p>
    <input type="file" id="sprite-input" accept=".png,.jpg,.jpeg" hidden aria-label="选择精灵文件">
  `;
  document.getElementById('sprite-input').addEventListener('change', handleSpriteSelect);
}

function handleBackgroundDrop(e) {
  e.preventDefault();
  e.stopPropagation();
  e.currentTarget.classList.remove('is-dragging');

  const files = e.dataTransfer.files;
  if (files.length) {
    processBackgroundFile(files[0]);
  }
}

function handleBackgroundSelect(e) {
  const files = e.target.files;
  if (files.length) {
    processBackgroundFile(files[0]);
  }
}

function processBackgroundFile(file) {
  loadBackground(file, state,
    (img) => {
      hideError();
      showBackgroundPreview(img);

      // 重新渲染行走预览
      if (state.previewMode === 'walk') {
        renderWalkFrame(state, document.getElementById('preview-canvas'));
      }

      // 绑定清除按钮
      document.getElementById('clear-background-btn')?.addEventListener('click', handleClearBackgroundClick);
    },
    (errorMsg) => {
      showError(errorMsg);
    }
  );
}

function handleClearBackgroundClick(e) {
  // 阻止冒泡，避免触发上传区域的click事件
  e.stopPropagation();

  clearBackground(state);
  resetBackgroundUploadZone();

  // 重新绑定背景文件选择事件（uploadZone的click事件已在setupEventListeners中绑定，不需要重复）
  document.getElementById('background-input').addEventListener('change', handleBackgroundSelect);

  // 重置渲染模式选择器
  document.getElementById('background-mode-select').value = 'fit';

  // 重新渲染
  if (state.previewMode === 'walk') {
    renderWalkFrame(state, document.getElementById('preview-canvas'));
  }
}

function handleBackgroundModeChange(e) {
  state.backgroundMode = e.target.value;
  saveConfig({ rows: state.rows, cols: state.cols, fps: state.fps, backgroundMode: state.backgroundMode, spriteScale: state.spriteScale, walkY: state.walkY });

  // 重新渲染行走预览
  if (state.previewMode === 'walk' && !state.isWalkPlaying) {
    renderWalkFrame(state, document.getElementById('preview-canvas'));
  }
}

function handleWalkYChange(e) {
  const value = parseInt(e.target.value, 10);
  setYAxisPosition(state, value);
  saveConfig({ rows: state.rows, cols: state.cols, fps: state.fps, backgroundMode: state.backgroundMode, spriteScale: state.spriteScale, walkY: state.walkY });

  if (state.previewMode === 'walk' && !state.isWalkPlaying) {
    renderWalkFrame(state, document.getElementById('preview-canvas'));
  }
}

function handleWalkSpeedChange(e) {
  const value = parseInt(e.target.value, 10);
  state.walkSpeed = value;
  document.getElementById('walk-speed-value').textContent = value;
}

function handleWalkRowsChange(e) {
  const value = parseInt(e.target.value, 10);
  if (value >= 1) {
    state.rows = value;
    state.totalFrames = state.rows * state.cols;
    state.walkEndFrame = Math.min(state.walkEndFrame, state.totalFrames - 1);
    document.getElementById('walk-end-frame').value = state.walkEndFrame + 1;

    if (state.image) {
      cacheFrames(state);
      if (state.previewMode === 'walk' && !state.isWalkPlaying) {
        renderWalkFrame(state, document.getElementById('preview-canvas'));
      }
    }
  }
}

function handleWalkColsChange(e) {
  const value = parseInt(e.target.value, 10);
  if (value >= 1) {
    state.cols = value;
    state.totalFrames = state.rows * state.cols;
    state.walkEndFrame = Math.min(state.walkEndFrame, state.totalFrames - 1);
    document.getElementById('walk-end-frame').value = state.walkEndFrame + 1;

    if (state.image) {
      cacheFrames(state);
      if (state.previewMode === 'walk' && !state.isWalkPlaying) {
        renderWalkFrame(state, document.getElementById('preview-canvas'));
      }
    }
  }
}

function handleWalkStartFrameChange(e) {
  const value = parseInt(e.target.value, 10) - 1; // 转为0-based
  if (value >= 0 && value <= state.walkEndFrame) {
    state.walkStartFrame = value;
    state.walkCurrentFrame = value;
  }
}

function handleWalkEndFrameChange(e) {
  const value = parseInt(e.target.value, 10) - 1; // 转为0-based
  if (value >= state.walkStartFrame && value < state.totalFrames) {
    state.walkEndFrame = value;
  }
}

function handleSpriteScaleChange(e) {
  const value = parseInt(e.target.value, 10) / 100; // 百分比转为缩放系数
  state.spriteScale = value;
  document.getElementById('sprite-scale-value').textContent = `${e.target.value}%`;
  saveConfig({ rows: state.rows, cols: state.cols, fps: state.fps, backgroundMode: state.backgroundMode, spriteScale: state.spriteScale, walkY: state.walkY });

  if (state.previewMode === 'walk' && !state.isWalkPlaying) {
    renderWalkFrame(state, document.getElementById('preview-canvas'));
  }
}

function handleWalkPlayClick() {
  const canvas = document.getElementById('preview-canvas');

  if (state.isWalkPlaying) {
    stopWalkAnimation(state);
    updateWalkPlayButton(false);
  } else {
    startWalkAnimation(state, canvas);
    updateWalkPlayButton(true);
  }
}

function handleWalkResetClick() {
  const canvas = document.getElementById('preview-canvas');
  resetWalkPosition(state, canvas);
}

function handleLoopModeChange(e) {
  const value = e.target.value;
  state.walkLoopMode = value === 'infinite' ? 'infinite' : parseInt(value, 10);
  state.walkLoopCount = 0;
}

// 启动应用
init();