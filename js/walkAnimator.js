/**
 * walkAnimator.js - 行走动画循环模块
 * 负责: 行走循环控制、X坐标计算、分层渲染
 */

import { stopAnimation } from './animator.js';
import { renderBackground } from './background.js';
import { renderYAxisIndicator } from './yAxisControl.js';
import { renderSpriteBorder } from './spriteResizeControl.js';

let walkAnimationId = null;
let lastWalkTime = 0;
let lastFrameTime = 0;

/**
 * 开始行走动画循环
 * @param {Object} state - 全局状态对象
 * @param {HTMLCanvasElement} canvas - 预览Canvas元素
 */
export function startWalkAnimation(state, canvas) {
  if (!state.cachedFrames.length) return;

  state.isWalkPlaying = true;
  lastWalkTime = performance.now();
  lastFrameTime = lastWalkTime;

  const ctx = canvas.getContext('2d');

  function walkAnimate(timestamp) {
    if (!state.isWalkPlaying || state.previewMode !== 'walk') return;

    const elapsed = timestamp - lastWalkTime;
    const frameElapsed = timestamp - lastFrameTime;

    // 计算位移：walkSpeed 像素/秒
    const deltaX = (state.walkSpeed * elapsed) / 1000;
    state.walkX += deltaX;

    // 循环边界检测：到达右侧后重置到左侧
    const scale = state.spriteScale || 1.0;
    const frameWidth = (state.cachedFrames[0]?.width || 64) * scale;
    const boundary = state.canvasWidth - frameWidth;

    if (state.walkX >= boundary) {
      state.walkX = 0;
      state.walkLoopCount++;

      // 检查循环次数限制
      if (state.walkLoopMode !== 'infinite' && state.walkLoopCount >= state.walkLoopMode) {
        stopWalkAnimation(state);
        updateWalkPlayButton(false);
        return;
      }
    }

    // 帧动画同步：根据时间更新行走帧
    const frameInterval = 1000 / state.fps;
    if (frameElapsed >= frameInterval) {
      const frameRange = state.walkEndFrame - state.walkStartFrame + 1;
      state.walkCurrentFrame = (state.walkCurrentFrame + 1) % frameRange + state.walkStartFrame;
      lastFrameTime = timestamp;
    }

    // 分层渲染
    renderWalkFrame(state, canvas);

    // 更新X坐标显示
    updateWalkPositionDisplay(state);

    lastWalkTime = timestamp;
    walkAnimationId = requestAnimationFrame(walkAnimate);
  }

  walkAnimationId = requestAnimationFrame(walkAnimate);
}

/**
 * 停止行走动画循环
 * @param {Object} state - 全局状态对象
 */
export function stopWalkAnimation(state) {
  state.isWalkPlaying = false;
  if (walkAnimationId) {
    cancelAnimationFrame(walkAnimationId);
    walkAnimationId = null;
  }
}

/**
 * 分层渲染行走预览帧
 * @param {Object} state - 全局状态对象
 * @param {HTMLCanvasElement} canvas - 预览Canvas元素
 */
export function renderWalkFrame(state, canvas) {
  const ctx = canvas.getContext('2d');

  // 设置Canvas尺寸
  canvas.width = state.canvasWidth;
  canvas.height = state.canvasHeight;

  // 清除Canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 背景层 (z=0)
  renderBackground(state, ctx);

  // 角色层 (z=1)
  renderSpriteLayer(state, ctx);

  // UI层 (z=2)
  renderYAxisIndicator(state, ctx);

  // 精灵边框层 (z=3)
  renderSpriteBorder(state, ctx);
}

/**
 * 渲染角色精灵层（支持缩放）
 * @param {Object} state - 全局状态对象
 * @param {CanvasRenderingContext2D} ctx - Canvas上下文
 */
function renderSpriteLayer(state, ctx) {
  if (!state.cachedFrames.length) return;

  const frameIndex = state.walkCurrentFrame;
  const frameCanvas = state.cachedFrames[frameIndex];
  if (!frameCanvas) return;

  const scale = state.spriteScale || 1.0;
  const frameWidth = frameCanvas.width * scale;
  const frameHeight = frameCanvas.height * scale;

  // Y轴位置：角色底部在walkY位置（考虑缩放后的高度）
  const spriteY = state.walkY - frameHeight;

  // 绘制缩放后的精灵
  ctx.drawImage(frameCanvas, state.walkX, spriteY, frameWidth, frameHeight);
}

/**
 * 更新行走位置显示
 * @param {Object} state - 全局状态对象
 */
function updateWalkPositionDisplay(state) {
  const display = document.getElementById('walk-x-display');
  if (display) {
    display.textContent = `X: ${Math.round(state.walkX)}`;
  }
}

/**
 * 更新行走播放按钮状态
 * @param {boolean} isPlaying - 是否正在播放
 */
export function updateWalkPlayButton(isPlaying) {
  const btn = document.getElementById('walk-play-btn');
  if (btn) {
    btn.textContent = isPlaying ? '⏸' : '▶';
    btn.setAttribute('aria-label', isPlaying ? '暂停行走' : '播放行走');
    btn.setAttribute('aria-pressed', isPlaying ? 'true' : 'false');
  }
}

/**
 * 重置行走位置到起点
 * @param {Object} state - 全局状态对象
 * @param {HTMLCanvasElement} canvas - 预览Canvas元素
 */
export function resetWalkPosition(state, canvas) {
  state.walkX = 0;
  state.walkLoopCount = 0;
  state.walkCurrentFrame = state.walkStartFrame;

  if (state.previewMode === 'walk') {
    renderWalkFrame(state, canvas);
    updateWalkPositionDisplay(state);
  }
}

/**
 * 切换到行走模式时初始化
 * @param {Object} state - 全局状态对象
 */
export function initWalkMode(state) {
  // 停止静止动画
  stopAnimation(state);

  // 初始化行走状态
  state.previewMode = 'walk';
  state.walkX = 0;
  state.walkLoopCount = 0;
  state.walkCurrentFrame = state.walkStartFrame;
  state.isWalkPlaying = false;

  // 设置行走帧范围默认值
  if (state.walkEndFrame >= state.totalFrames) {
    state.walkEndFrame = state.totalFrames - 1;
  }

  // 初始渲染
  const canvas = document.getElementById('preview-canvas');
  renderWalkFrame(state, canvas);
  updateWalkPositionDisplay(state);
  updateWalkPlayButton(false);
}

/**
 * 切换回静止模式时清理
 * @param {Object} state - 全局状态对象
 */
export function cleanupWalkMode(state) {
  // 停止行走动画
  stopWalkAnimation(state);

  // 切换模式
  state.previewMode = 'static';
  state.isWalkPlaying = false;
}