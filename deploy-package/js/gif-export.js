/**
 * gif-export.js - GIF 导出模块
 * 负责: 将帧动画导出为 GIF 文件（支持透明背景）
 * 使用本地 gif.js 库
 */

/**
 * 导出动画为 GIF 文件
 * @param {Object} state - 全局状态对象
 * @param {Function} onProgress - 进度回调函数
 * @param {Function} onComplete - 完成回调函数
 */
export function exportGif(state, onProgress, onComplete) {
  if (!state.cachedFrames.length) {
    alert('请先上传并切分图片');
    return;
  }

  // GIF 是全局变量（通过本地脚本加载）
  // eslint-disable-next-line no-undef
  if (typeof GIF === 'undefined') {
    console.error('GIF library not loaded');
    alert('GIF 库加载失败，请刷新页面重试');
    if (onComplete) onComplete();
    return;
  }

  // 获取帧范围内的帧
  const rangeStart = state.frameRange.start;
  const rangeEnd = state.frameRange.end;

  // 将范围内的帧转换为透明背景的帧
  const framesInRange = [];
  for (let i = rangeStart; i <= rangeEnd; i++) {
    const originalCanvas = state.cachedFrames[i];
    if (!originalCanvas) continue;

    // 创建透明背景的帧
    const transparentCanvas = document.createElement('canvas');
    transparentCanvas.width = originalCanvas.width;
    transparentCanvas.height = originalCanvas.height;
    const ctx = transparentCanvas.getContext('2d');

    // 清除背景（保持透明）
    ctx.clearRect(0, 0, transparentCanvas.width, transparentCanvas.height);
    ctx.drawImage(originalCanvas, 0, 0);

    framesInRange.push(transparentCanvas);
  }

  // 根据播放方向确定帧顺序
  const frames = state.isReverse
    ? [...framesInRange].reverse()
    : framesInRange;

  if (frames.length === 0) {
    alert('请选择有效的帧范围');
    if (onComplete) onComplete();
    return;
  }

  // eslint-disable-next-line no-undef
  const gif = new GIF({
    workers: 2,
    quality: 10,
    width: frames[0].width,
    height: frames[0].height,
    workerScript: 'js/lib/gif.worker.js',
    transparent: 0x00000000,  // 透明色
    background: null          // 无背景
  });

  // 添加所有帧到 GIF
  const frameDelay = 1000 / state.fps;

  frames.forEach((frameCanvas) => {
    gif.addFrame(frameCanvas, { delay: frameDelay, copy: true });
  });

  // 进度回调
  gif.on('progress', (p) => {
    if (onProgress) onProgress(Math.round(p * 100));
  });

  // 完成回调
  gif.on('finished', (blob) => {
    // 下载 GIF
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sprite-animation-${rangeStart + 1}-${rangeEnd + 1}-${state.fps}fps.gif`;
    a.click();
    URL.revokeObjectURL(url);

    if (onComplete) onComplete();
  });

  // 开始渲染
  gif.render();
}