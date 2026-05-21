/**
 * sprite.js - 精灵切分模块
 * 负责: 图片切分、帧缓存管理
 */

/**
 * 缓存精灵表图的所有帧到小Canvas数组
 * @param {Object} state - 全局状态对象
 * @returns {boolean} - 切分是否成功
 */
export function cacheFrames(state) {
  if (!state.image) return false;

  const { imageWidth, imageHeight, rows, cols } = state;
  const frameWidth = Math.floor(imageWidth / cols);
  const frameHeight = Math.floor(imageHeight / rows);

  // 清除旧缓存
  state.cachedFrames = [];
  state.totalFrames = rows * cols;

  // 创建并缓存每帧
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const canvas = document.createElement('canvas');
      canvas.width = frameWidth;
      canvas.height = frameHeight;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(
        state.image,
        col * frameWidth, row * frameHeight, frameWidth, frameHeight,
        0, 0, frameWidth, frameHeight
      );

      state.cachedFrames.push(canvas);
    }
  }

  return true;
}

/**
 * 获取指定帧的绘制矩形区域
 * @param {Object} state - 全局状态对象
 * @param {number} frameIndex - 帧索引
 * @returns {Object|null} - {sx, sy, sw, sh} 或 null
 */
export function getFrameRect(state, frameIndex) {
  if (!state.image || frameIndex >= state.totalFrames) return null;

  const { imageWidth, imageHeight, rows, cols } = state;
  const frameWidth = Math.floor(imageWidth / cols);
  const frameHeight = Math.floor(imageHeight / rows);

  const row = Math.floor(frameIndex / cols);
  const col = frameIndex % cols;

  return {
    sx: col * frameWidth,
    sy: row * frameHeight,
    sw: frameWidth,
    sh: frameHeight
  };
}