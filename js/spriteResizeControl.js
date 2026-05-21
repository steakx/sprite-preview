/**
 * spriteResizeControl.js - 精灵边框拖拽缩放模块
 * 负责: 精灵悬停边框显示、拖拽缩放交互
 */

import { saveConfig } from './storage.js';
import { renderWalkFrame } from './walkAnimator.js';

let isResizing = false;
let resizeHandle = null;
let dragStartX = 0;
let dragStartY = 0;
let dragStartScale = 1.0;
let spriteBounds = null;

const HANDLE_SIZE = 8;
const MIN_SCALE = 0.1;
const MAX_SCALE = 5.0;

/**
 * 初始化精灵缩放拖拽控制
 * @param {Object} state - 全局状态对象
 * @param {HTMLCanvasElement} canvas - 预览Canvas元素
 */
export function initSpriteResizeControl(state, canvas) {
  canvas.addEventListener('mousemove', handleMouseMove.bind(null, state, canvas));
  canvas.addEventListener('mousedown', handleMouseDown.bind(null, state, canvas));
  canvas.addEventListener('mouseup', handleMouseUp.bind(null, state, canvas));
  canvas.addEventListener('mouseleave', handleMouseLeave.bind(null, state, canvas));
}

/**
 * 计算精灵边界
 * @param {Object} state - 全局状态对象
 * @returns {Object|null} - 精灵边界 {x, y, width, height}
 */
export function getSpriteBounds(state) {
  if (!state.cachedFrames.length) return null;

  const frameCanvas = state.cachedFrames[state.walkCurrentFrame || 0];
  if (!frameCanvas) return null;

  const scale = state.spriteScale || 1.0;
  const frameWidth = frameCanvas.width * scale;
  const frameHeight = frameCanvas.height * scale;

  // Y轴位置：角色底部在walkY位置
  const spriteY = state.walkY - frameHeight;

  return {
    x: state.walkX,
    y: spriteY,
    width: frameWidth,
    height: frameHeight
  };
}

/**
 * 渲染精灵边框和缩放手柄
 * @param {Object} state - 全局状态对象
 * @param {CanvasRenderingContext2D} ctx - Canvas上下文
 */
export function renderSpriteBorder(state, ctx) {
  // 仅在行走模式且未播放时显示边框
  if (state.previewMode !== 'walk' || state.isWalkPlaying) return;

  const bounds = getSpriteBounds(state);
  if (!bounds) return;

  // 绘制边框（虚线）
  ctx.strokeStyle = '#00ff00';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);
  ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
  ctx.setLineDash([]);

  // 绘制缩放手柄（四角）
  const handles = getResizeHandles(bounds);
  ctx.fillStyle = '#00ff00';

  handles.forEach(handle => {
    ctx.fillRect(handle.x, handle.y, HANDLE_SIZE, HANDLE_SIZE);
  });

  // 显示缩放百分比
  const scalePercent = Math.round(state.spriteScale * 100);
  ctx.font = '14px sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText(`${scalePercent}%`, bounds.x + bounds.width / 2, bounds.y - 10);
}

/**
 * 获取缩放手柄位置
 * @param {Object} bounds - 精灵边界
 * @returns {Array} - 手柄位置数组 [{x, y, type}]
 */
function getResizeHandles(bounds) {
  return [
    { x: bounds.x - HANDLE_SIZE / 2, y: bounds.y - HANDLE_SIZE / 2, type: 'nw' },
    { x: bounds.x + bounds.width - HANDLE_SIZE / 2, y: bounds.y - HANDLE_SIZE / 2, type: 'ne' },
    { x: bounds.x - HANDLE_SIZE / 2, y: bounds.y + bounds.height - HANDLE_SIZE / 2, type: 'sw' },
    { x: bounds.x + bounds.width - HANDLE_SIZE / 2, y: bounds.y + bounds.height - HANDLE_SIZE / 2, type: 'se' }
  ];
}

/**
 * 检测鼠标是否在手柄上
 * @param {number} mouseX - 鼠标X坐标
 * @param {number} mouseY - 鼠标Y坐标
 * @param {Object} bounds - 精灵边界
 * @returns {string|null} - 手柄类型或null
 */
function detectHandle(mouseX, mouseY, bounds) {
  const handles = getResizeHandles(bounds);

  for (const handle of handles) {
    if (mouseX >= handle.x && mouseX <= handle.x + HANDLE_SIZE &&
        mouseY >= handle.y && mouseY <= handle.y + HANDLE_SIZE) {
      return handle.type;
    }
  }
  return null;
}

/**
 * 检测鼠标是否在精灵上
 * @param {number} mouseX - 鼠标X坐标
 * @param {number} mouseY - 鼠标Y坐标
 * @param {Object} bounds - 精灵边界
 * @returns {boolean}
 */
function isOnSprite(mouseX, mouseY, bounds) {
  return mouseX >= bounds.x && mouseX <= bounds.x + bounds.width &&
         mouseY >= bounds.y && mouseY <= bounds.y + bounds.height;
}

/**
 * 处理鼠标移动
 */
function handleMouseMove(state, canvas, e) {
  if (state.previewMode !== 'walk' || state.isWalkPlaying) return;

  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const mouseX = (e.clientX - rect.left) * scaleX;
  const mouseY = (e.clientY - rect.top) * scaleY;

  const bounds = getSpriteBounds(state);
  if (!bounds) return;

  if (isResizing) {
    // 拖拽缩放
    handleResizeDrag(state, canvas, mouseX, mouseY);
  } else {
    // 检测悬停状态
    const handle = detectHandle(mouseX, mouseY, bounds);

    if (handle) {
      // 在手柄上：显示对应光标
      canvas.style.cursor = getCursorForHandle(handle);
    } else if (isOnSprite(mouseX, mouseY, bounds)) {
      // 在精灵上：显示移动光标
      canvas.style.cursor = 'grab';
    } else {
      canvas.style.cursor = 'default';
    }

    // 更新渲染（显示边框）
    renderWalkFrame(state, canvas);
  }
}

/**
 * 处理鼠标按下
 */
function handleMouseDown(state, canvas, e) {
  if (state.previewMode !== 'walk' || state.isWalkPlaying) return;

  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const mouseX = (e.clientX - rect.left) * scaleX;
  const mouseY = (e.clientY - rect.top) * scaleY;

  const bounds = getSpriteBounds(state);
  if (!bounds) return;

  const handle = detectHandle(mouseX, mouseY, bounds);

  if (handle) {
    // 开始拖拽缩放
    isResizing = true;
    resizeHandle = handle;
    dragStartX = mouseX;
    dragStartY = mouseY;
    dragStartScale = state.spriteScale;
    spriteBounds = bounds;
    canvas.style.cursor = getCursorForHandle(handle);
    e.preventDefault();
  }
}

/**
 * 处理鼠标释放
 */
function handleMouseUp(state, canvas, e) {
  if (isResizing) {
    isResizing = false;
    resizeHandle = null;
    canvas.style.cursor = 'default';

    // 保存配置
    saveConfig({
      rows: state.rows,
      cols: state.cols,
      fps: state.fps,
      backgroundMode: state.backgroundMode,
      spriteScale: state.spriteScale,
      walkY: state.walkY
    });

    // 更新UI滑块
    const slider = document.getElementById('sprite-scale-slider');
    const valueSpan = document.getElementById('sprite-scale-value');
    if (slider) slider.value = Math.round(state.spriteScale * 100);
    if (valueSpan) valueSpan.textContent = `${Math.round(state.spriteScale * 100)}%`;

    renderWalkFrame(state, canvas);
  }
}

/**
 * 处理鼠标离开
 */
function handleMouseLeave(state, canvas, e) {
  if (isResizing) {
    handleMouseUp(state, canvas, e);
  }
  canvas.style.cursor = 'default';
}

/**
 * 处理拖拽缩放
 */
function handleResizeDrag(state, canvas, mouseX, mouseY) {
  if (!resizeHandle || !spriteBounds) return;

  const deltaX = mouseX - dragStartX;
  const deltaY = mouseY - dragStartY;

  // 根据手柄类型计算新缩放
  let newScale = dragStartScale;

  // 使用原始帧尺寸作为基准
  const frameCanvas = state.cachedFrames[state.walkCurrentFrame || 0];
  if (!frameCanvas) return;

  const originalWidth = frameCanvas.width;
  const originalHeight = frameCanvas.height;

  // 根据手柄位置计算缩放变化
  switch (resizeHandle) {
    case 'se':
      // 右下角：X和Y方向都可以增大
      newScale = dragStartScale + (deltaX / originalWidth + deltaY / originalHeight) / 2;
      break;
    case 'nw':
      // 左上角：反向
      newScale = dragStartScale - (deltaX / originalWidth + deltaY / originalHeight) / 2;
      break;
    case 'ne':
      // 右上角：X正向，Y反向
      newScale = dragStartScale + (deltaX / originalWidth - deltaY / originalHeight) / 2;
      break;
    case 'sw':
      // 左下角：X反向，Y正向
      newScale = dragStartScale + (-deltaX / originalWidth + deltaY / originalHeight) / 2;
      break;
  }

  // 限制缩放范围
  newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));
  state.spriteScale = newScale;

  // 更新UI滑块
  const slider = document.getElementById('sprite-scale-slider');
  const valueSpan = document.getElementById('sprite-scale-value');
  if (slider) slider.value = Math.round(newScale * 100);
  if (valueSpan) valueSpan.textContent = `${Math.round(newScale * 100)}%`;

  // 重新渲染
  renderWalkFrame(state, canvas);
}

/**
 * 根据手柄类型获取光标样式
 */
function getCursorForHandle(handle) {
  switch (handle) {
    case 'nw': return 'nwse-resize';
    case 'ne': return 'nesw-resize';
    case 'sw': return 'nesw-resize';
    case 'se': return 'nwse-resize';
    default: return 'default';
  }
}