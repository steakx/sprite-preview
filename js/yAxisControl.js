/**
 * yAxisControl.js - Y轴拖拽控制模块
 * 负责: Y轴指示线拖拽、位置更新、渲染
 */

import { saveConfig } from './storage.js';

let isDragging = false;
let dragStartY = 0;
let indicatorElement = null;
let stateRef = null;
let canvasRef = null;

/**
 * 初始化Y轴拖拽控制
 * @param {Object} state - 全局状态对象
 * @param {HTMLCanvasElement} canvas - 预览Canvas元素
 */
export function initYAxisControl(state, canvas) {
  stateRef = state;
  canvasRef = canvas;
  indicatorElement = document.getElementById('y-axis-indicator');

  // Canvas 鼠标事件
  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('mouseup', handleMouseUp);
  canvas.addEventListener('mouseleave', handleMouseLeave);

  // HTML 指示器拖拽事件
  if (indicatorElement) {
    indicatorElement.addEventListener('mousedown', handleIndicatorMouseDown);
    indicatorElement.hidden = true; // 初始隐藏
  }

  // 键盘事件（上下箭头调整Y轴）
  canvas.addEventListener('keydown', handleYAxisKeyDown);
  canvas.setAttribute('tabindex', '0');
  canvas.setAttribute('aria-label', '行走预览Canvas，使用上下箭头调整角色高度');
}

/**
 * 处理 HTML 指示器鼠标按下
 */
function handleIndicatorMouseDown(e) {
  if (stateRef.previewMode !== 'walk') return;

  isDragging = true;
  const rect = canvasRef.getBoundingClientRect();
  dragStartY = e.clientY - rect.top;
  indicatorElement.style.cursor = 'grabbing';
  e.preventDefault();

  // 添加全局鼠标事件
  document.addEventListener('mousemove', handleDragMove);
  document.addEventListener('mouseup', handleDragEnd);
}

/**
 * 处理拖拽移动
 */
function handleDragMove(e) {
  if (!isDragging || !stateRef) return;

  const rect = canvasRef.getBoundingClientRect();
  const canvasScaleY = canvasRef.height / rect.height;
  const mouseY = (e.clientY - rect.top) * canvasScaleY;

  // 边界限制：允许精灵顶部超出Canvas，但底部不能低于Canvas顶部
  const minY = 0;
  const maxY = stateRef.canvasHeight;

  const clampedY = Math.max(minY, Math.min(mouseY, maxY));

  // 更新状态
  stateRef.walkY = clampedY;
  saveConfig({
    rows: stateRef.rows,
    cols: stateRef.cols,
    fps: stateRef.fps,
    backgroundMode: stateRef.backgroundMode,
    spriteScale: stateRef.spriteScale,
    walkY: stateRef.walkY
  });

  // 触发重新渲染
  if (stateRef.previewMode === 'walk' && !stateRef.isWalkPlaying) {
    import('./walkAnimator.js').then(({ renderWalkFrame }) => {
      renderWalkFrame(stateRef, canvasRef);
    });
  }

  // 更新Y轴数值显示
  updateYAxisDisplay(stateRef.walkY);
}

/**
 * 处理拖拽结束
 */
function handleDragEnd(e) {
  if (isDragging) {
    isDragging = false;
    if (indicatorElement) {
      indicatorElement.style.cursor = 'grab';
    }
    canvasRef.style.cursor = 'default';

    // 移除全局鼠标事件
    document.removeEventListener('mousemove', handleDragMove);
    document.removeEventListener('mouseup', handleDragEnd);
  }
}

/**
 * 处理 Canvas 鼠标按下事件
 */
function handleMouseDown(e) {
  if (stateRef.previewMode !== 'walk') return;

  const canvas = e.target;
  const rect = canvas.getBoundingClientRect();
  const mouseY = e.clientY - rect.top;

  // 检查是否点击在Y轴指示线附近（±10像素热区）
  const indicatorY = parseFloat(canvas.dataset.walkY || 200);
  const canvasScaleY = canvas.height / rect.height;
  const indicatorCanvasY = indicatorY * canvasScaleY;
  const clickCanvasY = mouseY * canvasScaleY;

  if (Math.abs(clickCanvasY - indicatorCanvasY) <= 10 * canvasScaleY) {
    isDragging = true;
    dragStartY = mouseY;
    canvas.style.cursor = 'grabbing';
    e.preventDefault();

    // 添加全局鼠标事件
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
  }
}

/**
 * 处理鼠标移动事件（Canvas hover检测）
 */
function handleMouseMove(e) {
  if (!stateRef || stateRef.previewMode !== 'walk') return;

  const canvas = e.target;
  const rect = canvas.getBoundingClientRect();
  const mouseY = e.clientY - rect.top;
  const canvasScaleY = canvas.height / rect.height;

  // Hover状态：检查是否接近指示线
  const indicatorY = stateRef.walkY;
  const indicatorCanvasY = indicatorY * canvasScaleY;
  const hoverCanvasY = mouseY * canvasScaleY;

  if (Math.abs(hoverCanvasY - indicatorCanvasY) <= 10 * canvasScaleY) {
    canvas.style.cursor = 'grab';
  } else {
    canvas.style.cursor = 'default';
  }
}

/**
 * 处理鼠标释放事件
 */
function handleMouseUp(e) {
  if (isDragging) {
    isDragging = false;
    e.target.style.cursor = 'default';
  }
}

/**
 * 处理鼠标离开事件
 */
function handleMouseLeave(e) {
  if (!isDragging) return;
  handleDragEnd(e);
}

/**
 * 处理键盘上下箭头调整Y轴
 */
function handleYAxisKeyDown(e) {
  if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
    e.preventDefault();

    if (!stateRef || stateRef.previewMode !== 'walk') return;

    const delta = e.key === 'ArrowUp' ? -5 : 5;
    const minY = 0;
    const maxY = stateRef.canvasHeight;

    stateRef.walkY = Math.max(minY, Math.min(stateRef.walkY + delta, maxY));
    saveConfig({
      rows: stateRef.rows,
      cols: stateRef.cols,
      fps: stateRef.fps,
      backgroundMode: stateRef.backgroundMode,
      spriteScale: stateRef.spriteScale,
      walkY: stateRef.walkY
    });

    // 更新显示
    updateYAxisDisplay(stateRef.walkY);

    // 重新渲染
    if (!stateRef.isWalkPlaying) {
      import('./walkAnimator.js').then(({ renderWalkFrame }) => {
        renderWalkFrame(stateRef, canvasRef);
      });
    }
  }
}

/**
 * 更新Y轴数值显示
 * @param {number} yValue - Y轴数值
 */
function updateYAxisDisplay(yValue) {
  const display = document.getElementById('walk-y-input');
  if (display) {
    display.value = yValue;
  }
}

/**
 * 渲染Y轴指示线
 * @param {Object} state - 全局状态对象
 * @param {CanvasRenderingContext2D} ctx - Canvas上下文
 */
export function renderYAxisIndicator(state, ctx) {
  const walkY = state.walkY;
  const canvasWidth = state.canvasWidth;

  // 在Canvas内部只绘制水平红线
  ctx.save();
  ctx.strokeStyle = '#e94560';
  ctx.lineWidth = isDragging ? 3 : 2;
  ctx.globalAlpha = isDragging ? 1 : 0.5;
  ctx.setLineDash(isDragging ? [] : [5, 5]);

  ctx.beginPath();
  ctx.moveTo(0, walkY);
  ctx.lineTo(canvasWidth, walkY);
  ctx.stroke();
  ctx.restore();

  // 更新外部HTML指示器
  updateYAxisHTMLElement(state);

  // 存储Y值到Canvas dataset用于点击检测
  const canvas = ctx.canvas;
  canvas.dataset.walkY = walkY;
}

/**
 * 更新Y轴HTML指示器元素（箭头和提示在Canvas外部左侧）
 * @param {Object} state - 全局状态对象
 */
function updateYAxisHTMLElement(state) {
  const indicator = document.getElementById('y-axis-indicator');
  if (!indicator) return;

  // 仅在行走模式显示
  if (state.previewMode !== 'walk') {
    indicator.hidden = true;
    return;
  }

  indicator.hidden = false;

  // 计算位置：相对于preview-area定位
  const canvas = document.getElementById('preview-canvas');
  const previewArea = canvas.parentElement;
  const previewRect = previewArea.getBoundingClientRect();
  const canvasRect = canvas.getBoundingClientRect();

  // Y位置 = Canvas顶部相对于preview-area的偏移 + walkY
  const canvasTopOffset = canvasRect.top - previewRect.top;
  const yPosition = canvasTopOffset + state.walkY;

  // X位置 = Canvas左边缘相对于preview-area的偏移（箭头贴着Canvas）
  const canvasLeftOffset = canvasRect.left - previewRect.left;

  // 设置指示器位置
  indicator.style.top = `${yPosition}px`;
  indicator.style.left = `${canvasLeftOffset}px`;
  indicator.style.transform = 'translateX(-100%) translateY(-50%)'; // 箭头贴着Canvas左边缘

  // 更新提示文字
  const label = indicator.querySelector('.y-axis-label');
  if (label) {
    label.textContent = isDragging ? `Y: ${state.walkY}px` : '拖拽调整高度';
  }
}

/**
 * 通过输入框设置Y轴位置
 * @param {Object} state - 全局状态对象
 * @param {number} yValue - Y轴数值
 */
export function setYAxisPosition(state, yValue) {
  const minY = 0;
  const maxY = state.canvasHeight;

  state.walkY = Math.max(minY, Math.min(yValue, maxY));

  // 更新显示
  updateYAxisDisplay(state.walkY);
}