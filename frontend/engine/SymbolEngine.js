/**
 * 前端層 - 符號引擎
 * Frontend Layer - Symbol Engine
 * 負責：軍事符號生成、貼圖管理、快取
 */

import * as THREE from 'three';
import { eventBus } from '../core/EventBus.js';
import { Identity } from '../../backend/data/Enums.js';

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
   */
  async generateTexture(sidc, options = {}) {
    const {
      size = 128,
      outlineWidth = 0,
      outlineColor = '#000000'
    } = options;

    // 檢查快取
    const cacheKey = `${sidc}-${size}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    // 使用 milsymbol.js 生成符號
    const symbol = new window.ms.Symbol(sidc, {
      size: size,
      outlineWidth: outlineWidth,
      outlineColor: outlineColor
    });

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
   */
  async generateSprite(sidc, options = {}) {
    const {
      size = 32,
      opacity = 0.9,
      offsetY = 5
    } = options;

    const texture = await this.generateTexture(sidc, { size: 64 });

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
