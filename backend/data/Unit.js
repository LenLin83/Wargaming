/**
 * 後端層 - 單位資料模型
 * Backend Layer - Unit Data Model
 */

import { UnitLevel, ServiceBranch, CombatPosture, MovementState } from './Enums.js';

/**
 * 單位資料模型
 */
export class Unit {
  constructor(data = {}) {
    // ========== 基本識別 ==========
    this.uuid = data.uuid || this.generateUUID();
    this.name = data.name || '未命名單位';
    this.callsign = data.callsign || null;
    this.parentId = data.parentId || null;
    this.children = data.children || [];

    // ========== 兵棋符號 ==========
    this.sidc = data.sidc || '10031000151211000020'; // 預設友軍裝甲
    this.symbolSize = data.symbolSize || 32;
    this.symbolColor = data.symbolColor || null;

    // ========== 單位屬性 ==========
    this.level = data.level || UnitLevel.COMPANY;
    this.branch = data.branch || ServiceBranch.ARMY;
    this.commander = data.commander || '';
    this.strength = data.strength || 100;
    this.authorizedStrength = data.authorizedStrength || 120;
    this.fillRate = this.calculateFillRate();

    // ========== 補給狀態 ==========
    this.supply = {
      fuel: data.fuel !== undefined ? data.fuel : 100,
      ammunition: data.ammunition !== undefined ? data.ammunition : 100,
      provisions: data.provisions !== undefined ? data.provisions : 100,
      overall: 100 // 自動計算
    };
    this.calculateSupplyOverall();

    // ========== 戰鬥狀態 ==========
    this.combat = {
      posture: data.posture || CombatPosture.GUARD,
      inContact: data.inContact || false,
      effectiveness: data.effectiveness !== undefined ? data.effectiveness : 100,
      suppression: data.suppression || 0
    };

    // ========== 移動狀態 ==========
    this.movement = {
      state: data.movementState || MovementState.STATIONARY,
      path: data.path || [],
      currentSpeed: 0,
      maxSpeed: data.maxSpeed || 60
    };

    // ========== 空間變換 ==========
    this.transform = {
      position: {
        x: data.x !== undefined ? data.x : 0,
        y: data.y !== undefined ? data.y : 0,
        z: data.z !== undefined ? data.z : 0
      },
      rotation: {
        x: 0,
        y: data.heading || 0,
        z: 0
      }
    };

    // ========== 時間 ==========
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();

    // ========== 元資料 ==========
    this.metadata = data.metadata || {};
  }

  /**
   * 生成 UUID
   */
  generateUUID() {
    return 'u-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * 計算滿員率
   */
  calculateFillRate() {
    if (this.authorizedStrength === 0) return 0;
    return Math.round((this.strength / this.authorizedStrength) * 100);
  }

  /**
   * 計算整體補給狀態
   */
  calculateSupplyOverall() {
    const { fuel, ammunition, provisions } = this.supply;
    this.supply.overall = Math.min(fuel, ammunition, provisions);
  }

  /**
   * 更新單位資料
   */
  update(updates) {
    Object.assign(this, updates);
    this.updatedAt = new Date().toISOString();

    // 重新計算衍生欄位
    if (updates.strength !== undefined || updates.authorizedStrength !== undefined) {
      this.fillRate = this.calculateFillRate();
    }
    if (updates.fuel !== undefined || updates.ammunition !== undefined || updates.provisions !== undefined) {
      this.supply.fuel = updates.fuel !== undefined ? updates.fuel : this.supply.fuel;
      this.supply.ammunition = updates.ammunition !== undefined ? updates.ammunition : this.supply.ammunition;
      this.supply.provisions = updates.provisions !== undefined ? updates.provisions : this.supply.provisions;
      this.calculateSupplyOverall();
    }
  }

  /**
   * 轉換為 JSON
   */
  toJSON() {
    return {
      uuid: this.uuid,
      name: this.name,
      callsign: this.callsign,
      parentId: this.parentId,
      children: this.children,
      sidc: this.sidc,
      symbolSize: this.symbolSize,
      symbolColor: this.symbolColor,
      level: this.level,
      branch: this.branch,
      commander: this.commander,
      strength: this.strength,
      authorizedStrength: this.authorizedStrength,
      fillRate: this.fillRate,
      supply: this.supply,
      combat: this.combat,
      movement: this.movement,
      transform: this.transform,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      metadata: this.metadata
    };
  }

  /**
   * 從 JSON 建立實例
   */
  static fromJSON(json) {
    return new Unit(json);
  }
}
