/**
 * file-export.js - 文件导出模块
 * 负责: JSON 配置导出、PNG 序列 ZIP 打包导出
 */

/**
 * 导出配置为 JSON 文件
 * @param {Object} state - 全局状态对象
 */
export function exportJson(state) {
  const rangeStart = state.frameRange.start;
  const rangeEnd = state.frameRange.end;

  const config = {
    name: 'sprite-animation',
    rows: state.rows,
    cols: state.cols,
    fps: state.fps,
    frameWidth: state.imageWidth / state.cols,
    frameHeight: state.imageHeight / state.rows,
    totalFrames: state.totalFrames,
    playRange: {
      start: rangeStart + 1,
      end: rangeEnd + 1
    },
    imageWidth: state.imageWidth,
    imageHeight: state.imageHeight,
    generatedAt: new Date().toISOString()
  };

  // 创建 JSON 文件
  const json = JSON.stringify(config, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  // 下载
  const a = document.createElement('a');
  a.href = url;
  a.download = `sprite-config-${state.rows}x${state.cols}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * 导出帧范围内的所有帧为 PNG 序列（打包为 ZIP）
 * @param {Object} state - 全局状态对象
 */
export async function exportPngSequence(state) {
  // 检查 JSZip 库是否加载
  // eslint-disable-next-line no-undef
  if (typeof JSZip === 'undefined') {
    alert('ZIP 库加载失败，请刷新页面重试');
    return;
  }

  const rangeStart = state.frameRange.start;
  const rangeEnd = state.frameRange.end;

  // eslint-disable-next-line no-undef
  const zip = new JSZip();

  // 添加帧范围内的所有 PNG 到 ZIP
  for (let i = rangeStart; i <= rangeEnd; i++) {
    const frameCanvas = state.cachedFrames[i];
    if (!frameCanvas) continue;

    // 将 Canvas 转换为 PNG Blob
    const dataUrl = frameCanvas.toDataURL('image/png');
    const base64Data = dataUrl.split(',')[1];

    // 添加到 ZIP，使用帧编号命名
    const frameNum = String(i + 1).padStart(3, '0');
    zip.file(`frame-${frameNum}.png`, base64Data, { base64: true });
  }

  // 生成 ZIP 文件
  const content = await zip.generateAsync({ type: 'blob' });

  // 下载 ZIP
  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sprite-frames-${rangeStart + 1}-${rangeEnd + 1}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * 导出单帧 PNG
 * @param {HTMLCanvasElement} frameCanvas - 帧 Canvas
 * @param {number} frameIndex - 帧索引
 */
export function exportSingleFrame(frameCanvas, frameIndex) {
  const dataUrl = frameCanvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = `frame-${String(frameIndex + 1).padStart(3, '0')}.png`;
  a.click();
}