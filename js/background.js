/**
 * background.js - 背景图片加载模块
 * 负责: 背景加载、缓存、渲染（支持平铺/拉升/自适应三种模式）
 */

const MAX_BACKGROUND_SIZE = 20 * 1024 * 1024; // 20MB

/**
 * 加载背景图片
 * @param {File} file - 背景图片文件
 * @param {Object} state - 全局状态对象
 * @param {Function} onSuccess - 成功回调
 * @param {Function} onError - 错误回调
 */
export function loadBackground(file, state, onSuccess, onError) {
  // 验证文件类型
  if (!file.type.match(/image\/(png|jpeg|jpg)/)) {
    onError('仅支持PNG/JPG格式');
    return;
  }

  // 验证文件大小
  if (file.size > MAX_BACKGROUND_SIZE) {
    onError('背景图片过大，最大支持20MB');
    return;
  }

  const reader = new FileReader();

  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      state.background = img;
      state.backgroundWidth = img.width;
      state.backgroundHeight = img.height;

      // Canvas尺寸保持固定（不再随背景调整）
      // state.canvasWidth 和 canvasHeight 保持默认 800x600

      onSuccess(img);
    };
    img.onerror = () => {
      onError('背景图片加载失败');
    };
    img.src = e.target.result;
  };

  reader.onerror = () => {
    onError('文件读取失败');
  };

  reader.readAsDataURL(file);
}

/**
 * 清除背景图片
 * @param {Object} state - 全局状态对象
 */
export function clearBackground(state) {
  state.background = null;
  state.backgroundWidth = 0;
  state.backgroundHeight = 0;
  state.backgroundMode = 'fit'; // 重置为默认模式

  // Canvas尺寸保持固定
}

/**
 * 渲染背景层（支持三种渲染模式）
 * @param {Object} state - 全局状态对象
 * @param {CanvasRenderingContext2D} ctx - Canvas上下文
 */
export function renderBackground(state, ctx) {
  if (!state.background) return;

  const bg = state.background;
  const canvasWidth = state.canvasWidth;
  const canvasHeight = state.canvasHeight;
  const mode = state.backgroundMode || 'fit';

  switch (mode) {
    case 'tile':
      // 平铺模式：以原始尺寸平铺填充
      renderBackgroundTile(bg, ctx, canvasWidth, canvasHeight);
      break;
    case 'stretch':
      // 拉升模式：拉升至Canvas尺寸（忽略比例）
      ctx.drawImage(bg, 0, 0, canvasWidth, canvasHeight);
      break;
    case 'fit':
      // 自适应模式：保持比例填满Canvas，超出部分裁剪
      renderBackgroundFit(bg, ctx, canvasWidth, canvasHeight);
      break;
    default:
      renderBackgroundFit(bg, ctx, canvasWidth, canvasHeight);
  }
}

/**
 * 平铺模式渲染
 */
function renderBackgroundTile(bg, ctx, canvasWidth, canvasHeight) {
  const tileWidth = bg.width;
  const tileHeight = bg.height;

  // 从左上角开始平铺
  for (let y = 0; y < canvasHeight; y += tileHeight) {
    for (let x = 0; x < canvasWidth; x += tileWidth) {
      ctx.drawImage(bg, x, y, tileWidth, tileHeight);
    }
  }
}

/**
 * 自适应模式渲染（保持比例填满，裁剪超出部分）
 */
function renderBackgroundFit(bg, ctx, canvasWidth, canvasHeight) {
  // 计算缩放比例（填满Canvas，可能超出）
  const scale = Math.max(canvasWidth / bg.width, canvasHeight / bg.height);
  const scaledWidth = bg.width * scale;
  const scaledHeight = bg.height * scale;

  // 计算偏移量（居中）
  const offsetX = (canvasWidth - scaledWidth) / 2;
  const offsetY = (canvasHeight - scaledHeight) / 2;

  ctx.drawImage(bg, offsetX, offsetY, scaledWidth, scaledHeight);
}

/**
 * 显示背景预览缩略图
 * @param {HTMLImageElement} img - 背景图片对象
 */
export function showBackgroundPreview(img) {
  const uploadZone = document.getElementById('background-upload-zone');
  if (uploadZone) {
    uploadZone.innerHTML = `
      <img src="${img.src}" alt="背景预览" class="background-thumb">
      <p class="image-info">${img.width} × ${img.height}</p>
      <button id="clear-background-btn" class="clear-btn" aria-label="清除背景">清除</button>
      <input type="file" id="background-input" accept=".png,.jpg,.jpeg" hidden aria-label="选择背景文件">
    `;
    uploadZone.classList.add('has-background');
  }
}

/**
 * 重置背景上传区显示
 */
export function resetBackgroundUploadZone() {
  const uploadZone = document.getElementById('background-upload-zone');
  if (uploadZone) {
    uploadZone.innerHTML = `
      <p class="upload-hint">拖拽或点击上传背景</p>
      <input type="file" id="background-input" accept=".png,.jpg,.jpeg" hidden aria-label="选择背景文件">
    `;
    uploadZone.classList.remove('has-background');
  }
}