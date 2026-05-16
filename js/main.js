/**
 * main.js - 应用入口模块
 * 负责: 初始化、事件绑定、模块协调
 */

import { cacheFrames } from './sprite.js';
import { startAnimation, stopAnimation, renderCurrentFrame, updatePlayButton } from './animator.js';
import { saveConfig, loadConfig, clearConfig } from './storage.js';
import { exportGif } from './gif-export.js';
import { exportJson, exportPngSequence } from './file-export.js';

// 全局状态对象
const state = {
  image: null,
  imageWidth: 0,
  imageHeight: 0,
  rows: 4,
  cols: 4,
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
  }
};

// 最大文件大小限制 (200MB)
const MAX_FILE_SIZE = 200 * 1024 * 1024;

/**
 * 初始化应用
 */
function init() {
  // 加载保存的配置
  const savedConfig = loadConfig();
  state.rows = savedConfig.rows;
  state.cols = savedConfig.cols;
  state.fps = savedConfig.fps;

  // 设置UI初始值
  document.getElementById('rows-input').value = state.rows;
  document.getElementById('cols-input').value = state.cols;
  document.getElementById('fps-slider').value = state.fps;
  document.getElementById('fps-value').textContent = state.fps;

  // 初始化帧范围
  state.totalFrames = state.rows * state.cols;
  state.frameRange.end = state.totalFrames - 1;
  document.getElementById('end-frame-input').value = state.totalFrames;

  // 设置循环按钮初始状态
  updateLoopButton(state.isLooping);
  updateDirectionButton(state.isReverse);

  // 绑定事件
  setupEventListeners();

  console.log('Sprite Preview initialized');
}

/**
 * 设置事件监听器
 */
function setupEventListeners() {
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
    saveConfig({ rows: state.rows, cols: state.cols, fps: state.fps });

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
    saveConfig({ rows: state.rows, cols: state.cols, fps: state.fps });

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
  saveConfig({ rows: state.rows, cols: state.cols, fps: state.fps });
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
  if (document.hidden && state.isPlaying) {
    stopAnimation(state);
    updatePlayButton(false);
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

// 启动应用
init();