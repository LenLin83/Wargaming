/**
 * 後端層 - 場景資料模型
 * Backend Layer - Scene Data Model
 */

/**
 * 場景資料模型
 */
export class Scene {
  constructor(data = {}) {
    this.uuid = data.uuid || this.generateUUID();
    this.name = data.name || '新場景';
    this.description = data.description || '';
    this.version = data.version || '1.0.0';

    // 地形配置
    this.terrain = data.terrain || {
      type: 'flat',
      width: 1000,
      height: 1000,
      heightRange: { min: 0, max: 0 }
    };

    // 所有單位 (以 UUID 為鍵)
    this.units = data.units || {};

    // 戰術圖形
    this.graphics = data.graphics || [];

    // 場景設定
    this.settings = data.settings || {
      lod: { enabled: true },
      camera: {
        position: { x: 0, y: 100, z: 200 },
        target: { x: 0, y: 0, z: 0 }
      },
      display: {
        showGrid: true,
        showUnitLabels: true,
        showTacticalGraphics: true
      }
    };

    // 時間相關
    this.time = data.time || {
      currentTime: '2024-01-01T08:00:00',
      duration: 600, // 10 分鐘（秒）
      isPlaying: false,
      playbackSpeed: 1
    };

    // 元資料
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
    this.author = data.author || '';
  }

  /**
   * 生成 UUID
   */
  generateUUID() {
    return 'scene-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * 新增單位
   */
  addUnit(unit) {
    this.units[unit.uuid] = unit;
    this.updatedAt = new Date().toISOString();
  }

  /**
   * 移除單位
   */
  removeUnit(uuid) {
    delete this.units[uuid];
    this.updatedAt = new Date().toISOString();
  }

  /**
   * 取得單位
   */
  getUnit(uuid) {
    return this.units[uuid];
  }

  /**
   * 取得所有單位
   */
  getAllUnits() {
    return Object.values(this.units);
  }

  /**
   * 新增戰術圖形
   */
  addGraphic(graphic) {
    this.graphics.push(graphic);
    this.updatedAt = new Date().toISOString();
  }

  /**
   * 移除戰術圖形
   */
  removeGraphic(uuid) {
    this.graphics = this.graphics.filter(g => g.uuid !== uuid);
    this.updatedAt = new Date().toISOString();
  }

  /**
   * 轉換為 JSON
   */
  toJSON() {
    return {
      uuid: this.uuid,
      name: this.name,
      description: this.description,
      version: this.version,
      terrain: this.terrain,
      units: this.units,
      graphics: this.graphics,
      settings: this.settings,
      time: this.time,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      author: this.author
    };
  }

  /**
   * 從 JSON 建立實例
   */
  static fromJSON(json) {
    return new Scene(json);
  }
}
