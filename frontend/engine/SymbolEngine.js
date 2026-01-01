/**
 * 前端層 - 符號引擎
 * Frontend Layer - Symbol Engine
 * 負責：軍事符號生成、貼圖管理、快取
 */

import * as THREE from 'three';
import { eventBus } from '../core/EventBus.js';
import { Identity } from '../../shared/Enums.js';

// milsymbol is loaded as global 'ms' object via script tag

export class SymbolEngine {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.cache = new Map(); // sidc -> texture
  }

  /**
   * 初始化
   */
  async initialize() {
    console.log('符號引擎已就緒');
  }

  /**
   * 生成符號貼圖
   * @param {string} sidc - SIDC 代碼
   * @param {Object} options - 選項
   * @param {number} options.size - 尺寸 (預設 200 以容納文字)
   * @param {number} options.outlineWidth - 描邊寬度
   * @param {string} options.outlineColor - 描邊顏色
   * @param {string} options.uniqueDesignation - 部隊番號
   * @param {string} options.higherFormation - 上級單位
   * @param {string} options.echelon - 層級名稱 (如 "company", "battalion")
   */
  async generateTexture(sidc, options = {}) {
    const {
      size = 200,
      outlineWidth = 0,
      outlineColor = '#000000',
      uniqueDesignation = '',
      higherFormation = '',
      echelon = ''
    } = options;

    // 檢查快取 (包含文字參數)
    const cacheKey = `${sidc}-${size}-${uniqueDesignation}-${higherFormation}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    // 建構 milsymbol 選項
    const msOptions = {
      size: size,
      outlineWidth: outlineWidth,
      outlineColor: outlineColor,
      // 文字設定
      infoColor: '#ffffff',
      infoSize: 20,
      infoPadding: 8
    };

    // 添加文字參數
    if (uniqueDesignation) msOptions.uniqueDesignation = uniqueDesignation;
    if (higherFormation) msOptions.higherFormation = higherFormation;
    if (echelon) msOptions.echelon = echelon;

    // 使用 milsymbol.js 生成符號
    const symbol = new window.ms.Symbol(sidc, msOptions);

    // 取得 Canvas
    const canvas = symbol.asCanvas();

    // 建立貼圖
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;

    // 快取
    this.cache.set(cacheKey, texture);

    return texture;
  }

  /**
   * 生成符號 Sprite
   * @param {string} sidc - SIDC 代碼
   * @param {Object} options - 選項
   * @param {number} options.size - Sprite 顯示尺寸
   * @param {number} options.opacity - 透明度
   * @param {number} options.offsetY - Y 軸偏移
   * @param {string} options.uniqueDesignation - 部隊番號
   * @param {string} options.higherFormation - 上級單位
   * @param {string} options.echelon - 層級名稱
   */
  async generateSprite(sidc, options = {}) {
    const {
      size = 32,
      opacity = 0.9,
      offsetY = 5,
      uniqueDesignation = '',
      higherFormation = '',
      echelon = ''
    } = options;

    const texture = await this.generateTexture(sidc, {
      size: 200, // 貼圖尺寸固定為 100 以容納文字
      uniqueDesignation,
      higherFormation,
      echelon
    });

    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: opacity,
      depthTest: true,
      depthWrite: false
    });

    const sprite = new THREE.Sprite(material);
    sprite.scale.set(size, size, 1);
    sprite.renderOrder = 1; // 確保在其他物體之上渲染

    return sprite;
  }

  /**
   * 生成標籤 Sprite
   */
  async generateLabel(text, options = {}) {
    const {
      fontSize = 16,
      color = '#ffffff',
      backgroundColor = 'rgba(0, 0, 0, 0.5)',
      padding = 4
    } = options;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // 測量文字
    ctx.font = `${fontSize}px Arial, sans-serif`;
    const metrics = ctx.measureText(text);
    const textWidth = metrics.width;

    // 設定 Canvas 大小
    canvas.width = textWidth + padding * 2;
    canvas.height = fontSize + padding * 2;

    // 繪製背景
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 繪製文字
    ctx.fillStyle = color;
    ctx.font = `${fontSize}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    // 建立貼圖
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;

    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: true,
      depthWrite: false
    });

    const sprite = new THREE.Sprite(material);
    sprite.scale.set(canvas.width / 10, canvas.height / 10, 1);
    sprite.renderOrder = 2;

    return sprite;
  }

  /**
   * 從 SIDC 取得身份顏色
   */
  getIdentityColor(sidc) {
    const identity = sidc[1];
    switch (identity) {
      case Identity.FRIEND:
        return 0x00FFFF;  // 青色
      case Identity.HOSTILE:
        return 0xFF0000;  // 紅色
      case Identity.NEUTRAL:
        return 0x00FF00;  // 綠色
      case Identity.UNKNOWN:
        return 0xFFFF00;  // 黃色
      default:
        return 0xFFFFFF;
    }
  }

  /**
   * 清除快取
   */
  clearCache() {
    this.cache.forEach(texture => texture.dispose());
    this.cache.clear();
  }

  /**
   * 移除特定快取
   */
  removeFromCache(sidc) {
    const keysToDelete = [];
    for (const key of this.cache.keys()) {
      if (key.startsWith(sidc)) {
        keysToDelete.push(key);
      }
    }
    for (const key of keysToDelete) {
      this.cache.get(key).dispose();
      this.cache.delete(key);
    }
  }

  /**
   * 銷毀
   */
  dispose() {
    this.clearCache();
  }
}
