/**
 * storage.js - 配置存储模块
 * 负责: localStorage配置读写
 */

const STORAGE_PREFIX = 'sp_';

/**
 * 保存配置到localStorage
 * @param {Object} config - 配置对象 {rows, cols, fps, backgroundMode, spriteScale, walkY}
 */
export function saveConfig(config) {
  localStorage.setItem(STORAGE_PREFIX + 'rows', config.rows);
  localStorage.setItem(STORAGE_PREFIX + 'cols', config.cols);
  localStorage.setItem(STORAGE_PREFIX + 'fps', config.fps);
  if (config.backgroundMode) {
    localStorage.setItem(STORAGE_PREFIX + 'backgroundMode', config.backgroundMode);
  }
  if (config.spriteScale) {
    localStorage.setItem(STORAGE_PREFIX + 'spriteScale', config.spriteScale);
  }
  if (config.walkY) {
    localStorage.setItem(STORAGE_PREFIX + 'walkY', config.walkY);
  }
}

/**
 * 从localStorage加载配置
 * @returns {Object} - 配置对象，无配置时返回默认值
 */
export function loadConfig() {
  const defaultConfig = { rows: 4, cols: 4, fps: 8, backgroundMode: 'fit', spriteScale: 1.0, walkY: 400 };

  const rows = localStorage.getItem(STORAGE_PREFIX + 'rows');
  const cols = localStorage.getItem(STORAGE_PREFIX + 'cols');
  const fps = localStorage.getItem(STORAGE_PREFIX + 'fps');
  const backgroundMode = localStorage.getItem(STORAGE_PREFIX + 'backgroundMode');
  const spriteScale = localStorage.getItem(STORAGE_PREFIX + 'spriteScale');
  const walkY = localStorage.getItem(STORAGE_PREFIX + 'walkY');

  return {
    rows: rows ? parseInt(rows, 10) : defaultConfig.rows,
    cols: cols ? parseInt(cols, 10) : defaultConfig.cols,
    fps: fps ? parseInt(fps, 10) : defaultConfig.fps,
    backgroundMode: backgroundMode || defaultConfig.backgroundMode,
    spriteScale: spriteScale && !isNaN(parseFloat(spriteScale)) ? parseFloat(spriteScale) : defaultConfig.spriteScale,
    walkY: walkY ? parseInt(walkY, 10) : defaultConfig.walkY
  };
}

/**
 * 清除保存的配置
 */
export function clearConfig() {
  localStorage.removeItem(STORAGE_PREFIX + 'rows');
  localStorage.removeItem(STORAGE_PREFIX + 'cols');
  localStorage.removeItem(STORAGE_PREFIX + 'fps');
  localStorage.removeItem(STORAGE_PREFIX + 'backgroundMode');
  localStorage.removeItem(STORAGE_PREFIX + 'spriteScale');
  localStorage.removeItem(STORAGE_PREFIX + 'walkY');
}