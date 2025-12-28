/**
 * 後端層 - ORBAT 業務服務
 * Backend Layer - ORBAT Business Service
 */

import { Unit } from '../data/index.js';

/**
 * ORBAT 業務服務
 * 負責：單位管理、層級關係、樹狀結構
 */
export class ORBATService {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.units = new Map(); // uuid -> Unit
    this.rootUnits = []; // 頂層單位 UUID 列表
  }

  /**
   * 新增單位
   */
  addUnit(unitData) {
    const unit = new Unit(unitData);

    // 加入地圖
    this.units.set(unit.uuid, unit);

    // 處理層級關係
    if (unit.parentId) {
      const parent = this.units.get(unit.parentId);
      if (parent && !parent.children.includes(unit.uuid)) {
        parent.children.push(unit.uuid);
      }
    } else {
      if (!this.rootUnits.includes(unit.uuid)) {
        this.rootUnits.push(unit.uuid);
      }
    }

    // 觸發事件
    this.eventBus.emit('backend:unit:added', { unit });

    return unit;
  }

  /**
   * 更新單位
   */
  updateUnit(uuid, updates) {
    const unit = this.units.get(uuid);
    if (!unit) {
      throw new Error(`單位不存在: ${uuid}`);
    }

    unit.update(updates);

    // 觸發事件
    this.eventBus.emit('backend:unit:updated', { uuid, updates });

    return unit;
  }

  /**
   * 移除單位
   */
  removeUnit(uuid) {
    const unit = this.units.get(uuid);
    if (!unit) {
      throw new Error(`單位不存在: ${uuid}`);
    }

    // 遞歸移除所有子單位
    this._removeUnitRecursive(uuid);

    // 觸發事件
    this.eventBus.emit('backend:unit:removed', { uuid });
  }

  /**
   * 遞歸移除單位
   */
  _removeUnitRecursive(uuid) {
    const unit = this.units.get(uuid);
    if (!unit) return;

    // 先移除所有子單位
    for (const childId of unit.children) {
      this._removeUnitRecursive(childId);
    }

    // 從父單位移除
    if (unit.parentId) {
      const parent = this.units.get(unit.parentId);
      if (parent) {
        parent.children = parent.children.filter(id => id !== uuid);
      }
    } else {
      this.rootUnits = this.rootUnits.filter(id => id !== uuid);
    }

    // 從地圖移除
    this.units.delete(uuid);
  }

  /**
   * 取得單位
   */
  getUnit(uuid) {
    return this.units.get(uuid);
  }

  /**
   * 取得所有單位
   */
  getAllUnits() {
    return Array.from(this.units.values());
  }

  /**
   * 建構樹狀結構
   */
  getTree() {
    const buildNode = (uuid) => {
      const unit = this.units.get(uuid);
      if (!unit) return null;

      return {
        uuid: unit.uuid,
        name: unit.name,
        sidc: unit.sidc,
        level: unit.level,
        children: unit.children.map(buildNode).filter(n => n !== null)
      };
    };

    return this.rootUnits.map(buildNode).filter(n => n !== null);
  }

  /**
   * 移動單位（改變父節點）
   */
  moveUnit(uuid, newParentId) {
    const unit = this.units.get(uuid);
    if (!unit) {
      throw new Error(`單位不存在: ${uuid}`);
    }

    const oldParentId = unit.parentId;

    // 從舊父單位移除
    if (oldParentId) {
      const oldParent = this.units.get(oldParentId);
      if (oldParent) {
        oldParent.children = oldParent.children.filter(id => id !== uuid);
      }
    } else {
      this.rootUnits = this.rootUnits.filter(id => id !== uuid);
    }

    // 加入新父單位
    unit.parentId = newParentId || null;

    if (newParentId) {
      const newParent = this.units.get(newParentId);
      if (newParent && !newParent.children.includes(uuid)) {
        newParent.children.push(uuid);
      }
    } else {
      if (!this.rootUnits.includes(uuid)) {
        this.rootUnits.push(uuid);
      }
    }

    // 觸發事件
    this.eventBus.emit('backend:unit:moved', { uuid, oldParentId, newParentId });
  }

  /**
   * 批次新增單位
   */
  addUnits(unitsData) {
    const units = [];
    for (const data of unitsData) {
      const unit = this.addUnit(data);
      units.push(unit);
    }
    return units;
  }

  /**
   * 清空所有單位
   */
  clear() {
    this.units.clear();
    this.rootUnits = [];

    this.eventBus.emit('backend:orbat:cleared');
  }

  /**
   * 取得統計資料
   */
  getStats() {
    const allUnits = this.getAllUnits();
    return {
      total: allUnits.length,
      byLevel: this._countByLevel(allUnits),
      byBranch: this._countByBranch(allUnits)
    };
  }

  /**
   * 按層級統計
   */
  _countByLevel(units) {
    const stats = {};
    for (const unit of units) {
      stats[unit.level] = (stats[unit.level] || 0) + 1;
    }
    return stats;
  }

  /**
   * 按兵種統計
   */
  _countByBranch(units) {
    const stats = {};
    for (const unit of units) {
      stats[unit.branch] = (stats[unit.branch] || 0) + 1;
    }
    return stats;
  }
}
