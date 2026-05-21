/**
 * animator.js - 动画播放控制模块
 * 负责: 动画循环、FPS控制、帧渲染
 */

let animationId = null;
let lastFrameTime = 0;

/**
 * 开始动画播放
 * @param {Object} state - 全局状态对象
 * @param {HTMLCanvasElement} canvas - 预览Canvas元素
 */
export function startAnimation(state, canvas) {
  if (!state.cachedFrames.length) return;

  state.isPlaying = true;
  lastFrameTime = 0;

  const ctx = canvas.getContext('2d');
  const frameInterval = 1000 / state.fps;

  function animate(timestamp) {
    if (!state.isPlaying) return;

    const elapsed = timestamp - lastFrameTime;
    if (elapsed >= frameInterval) {
      // 渲染当前帧
      renderCurrentFrame(state, canvas);

      // 更新帧索引
      const nextFrame = state.isReverse
        ? state.currentFrame - 1
        : state.currentFrame + 1;

      // 使用帧范围进行循环检查
      const rangeStart = state.frameRange.start;
      const rangeEnd = state.frameRange.end;

      // 检查是否超出范围
      if (nextFrame > rangeEnd || nextFrame < rangeStart) {
        if (state.isLooping) {
          // 循环模式：在范围内循环
          state.currentFrame = state.isReverse ? rangeEnd : rangeStart;
        } else {
          // 非循环模式，播放结束后停止
          state.currentFrame = state.isReverse ? rangeStart : rangeEnd;
          stopAnimation(state);
          updatePlayButton(false);
          return;
        }
      } else {
        state.currentFrame = nextFrame;
      }

      lastFrameTime = timestamp;

      // 更新帧指示器
      updateFrameIndicator(state);
    }

    animationId = requestAnimationFrame(animate);
  }

  animationId = requestAnimationFrame(animate);
}

/**
 * 停止动画播放
 * @param {Object} state - 全局状态对象
 */
export function stopAnimation(state) {
  state.isPlaying = false;
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
}

/**
 * 渲染当前帧到Canvas
 * @param {Object} state - 全局状态对象
 * @param {HTMLCanvasElement} canvas - 预览Canvas元素
 */
export function renderCurrentFrame(state, canvas) {
  if (!state.cachedFrames.length) return;

  const frameCanvas = state.cachedFrames[state.currentFrame];
  if (!frameCanvas) return;

  const ctx = canvas.getContext('2d');

  // 使用固定Canvas尺寸
  canvas.width = state.canvasWidth || 800;
  canvas.height = state.canvasHeight || 600;

  // 清除Canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 计算居中位置
  const scale = state.spriteScale || 1.0;
  const scaledWidth = frameCanvas.width * scale;
  const scaledHeight = frameCanvas.height * scale;
  const centerX = (canvas.width - scaledWidth) / 2;
  const centerY = (canvas.height - scaledHeight) / 2;

  // 绘制缩放后的帧（居中）
  ctx.drawImage(frameCanvas, centerX, centerY, scaledWidth, scaledHeight);
}

/**
 * 更新帧指示器显示
 * @param {Object} state - 全局状态对象
 */
function updateFrameIndicator(state) {
  const indicator = document.getElementById('frame-indicator');
  if (indicator) {
    indicator.textContent = `帧 ${state.currentFrame + 1}/${state.totalFrames}`;
  }
}

/**
 * 更新播放按钮状态
 * @param {boolean} isPlaying - 是否正在播放
 */
export function updatePlayButton(isPlaying) {
  const btn = document.getElementById('play-btn');
  if (btn) {
    btn.textContent = isPlaying ? '⏸' : '▶';
    btn.setAttribute('aria-label', isPlaying ? '暂停' : '播放');
    btn.setAttribute('aria-pressed', isPlaying ? 'true' : 'false');
  }
}