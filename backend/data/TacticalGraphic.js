/**
 * 後端層 - 戰術圖形資料模型
 * Backend Layer - Tactical Graphic Data Model
 */

import { GraphicType } from '../../shared/Enums.js';

/**
 * 戰術圖形資料模型
 */
export class TacticalGraphic {
  constructor(data = {}) {
    this.uuid = data.uuid || this.generateUUID();
    this.type = data.type || GraphicType.POINT;
    this.name = data.name || '新圖形';
    this.layer = data.layer || 'default';

    // 樣式
    this.style = {
      strokeColor: data.strokeColor || '#00FF00',
      fillColor: data.fillColor || '#00FF00',
      strokeWidth: data.strokeWidth || 2,
      fillOpacity: data.fillOpacity !== undefined ? data.fillOpacity : 0.3,
      lineDash: data.lineDash || 'solid',
      showLabel: data.showLabel !== undefined ? data.showLabel : true
    };

    // 幾何資料
    this.geometry = {};

    // 根據類型初始化幾何資料
    switch (this.type) {
      case GraphicType.POINT:
      case GraphicType.WAYPOINT:
      case GraphicType.CHECKPOINT:
      case GraphicType.OBJECTIVE:
        this.geometry.point = data.point || { x: 0, y: 0, z: 0 };
        break;

      case GraphicType.LINE:
      case GraphicType.AXIS_OF_ADVANCE:
      case GraphicType.BOUNDARY:
      case GraphicType.ROUTE:
        this.geometry.points = data.points || [];
        this.geometry.closed = data.closed || false;
        break;

      case GraphicType.ARROW:
      case GraphicType.ATTACK_ARROW:
        this.geometry.points = data.points || [];
        break;

      case GraphicType.AREA:
      case GraphicType.AO:
        this.geometry.vertices = data.vertices || [];
        break;

      case GraphicType.CIRCULAR:
        this.geometry.center = data.center || { x: 0, y: 0, z: 0 };
        this.geometry.radius = data.radius || 50;
        this.geometry.startAngle = data.startAngle || 0;
        this.geometry.endAngle = data.endAngle || 360;
        break;
    }

    // 文字標籤
    this.label = data.label || '';

    // 狀態
    this.locked = data.locked || false;
    this.visible = data.visible !== undefined ? data.visible : true;

    // 元資料
    this.metadata = data.metadata || {};

    // 時間
    this.createdAt = data.createdAt || new Date().toISOString();
  }

  /**
   * 生成 UUID
   */
  generateUUID() {
    return 'graphic-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * 更新幾何資料
   */
  updateGeometry(updates) {
    Object.assign(this.geometry, updates);
  }

  /**
   * 更新樣式
   */
  updateStyle(updates) {
    Object.assign(this.style, updates);
  }

  /**
   * 設定位置（點位類型）
   */
  setPosition(x, y, z) {
    if (this.geometry.point !== undefined) {
      this.geometry.point = { x, y, z };
    } else if (this.geometry.center !== undefined) {
      this.geometry.center = { x, y, z };
    }
  }

  /**
   * 新增節點（線條類型）
   */
  addPoint(x, y, z) {
    if (this.geometry.points) {
      this.geometry.points.push({ x, y, z });
    }
  }

  /**
   * 轉換為 JSON
   */
  toJSON() {
    return {
      uuid: this.uuid,
      type: this.type,
      name: this.name,
      layer: this.layer,
      style: this.style,
      geometry: this.geometry,
      label: this.label,
      locked: this.locked,
      visible: this.visible,
      metadata: this.metadata,
      createdAt: this.createdAt
    };
  }

  /**
   * 從 JSON 建立實例
   */
  static fromJSON(json) {
    return new TacticalGraphic(json);
  }
}
