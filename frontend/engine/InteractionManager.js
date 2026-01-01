/**
 * Frontend 層 - 交互管理器
 * Frontend Layer - Interaction Manager
 * 負責：Raycast 操作、地形檢測、點擊事件處理
 */

import * as THREE from 'three';
import { eventBus } from '../core/EventBus.js';

export class InteractionManager {
  constructor(scene3D, terrainEngine) {
    this.scene3D = scene3D;
    this.terrainEngine = terrainEngine;
    this.raycaster = new THREE.Raycaster();
  }

  /**
   * 初始化
   */
  async initialize() {
    console.log('交互管理器已就緒');
  }

  /**
   * 取得地形網格
   */
  get terrain() {
    return this.terrainEngine?.terrain;
  }

  /**
   * 取得攝影機
   */
  get camera() {
    return this.scene3D?.camera;
  }

  /**
   * 從滑鼠位置進行 Raycast 檢測地形
   * @param {Object} mouse - 標準化設備坐標 { x, y }
   * @returns {THREE.Vector3|null} 地形交點，如果未找到則返回 null
   */
  raycastToTerrain(mouse) {
    if (!this.terrain || !this.camera) {
      console.error('[InteractionManager] 地形或攝影機未初始化');
      return null;
    }

    this.raycaster.setFromCamera(mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.terrain);

    if (intersects.length > 0) {
      return intersects[0].point;
    }

    return null;
  }

  /**
   * 從 DOM 事件取得滑鼠位置
   * @param {MouseEvent} event - DOM 滑鼠事件
   * @param {HTMLElement} canvas - Canvas 元素
   * @returns {Object} 標準化設備坐標 { x, y }
   */
  getMousePosition(event, canvas) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
      y: -((event.clientY - rect.top) / rect.height) * 2 + 1
    };
  }

  /**
   * Raycast 檢測單位
   * @param {Object} mouse - 標準化設備坐標 { x, y }
   * @param {Array} units - 單位陣列 (UnitEntity)
   * @returns {Object|null} { point, unit }，如果未找到則返回 null
   */
  raycastToUnits(mouse, units) {
    if (!this.camera) {
      console.error('[InteractionManager] 攝影機未初始化');
      return null;
    }

    this.raycaster.setFromCamera(mouse, this.camera);

    // 收集所有可互動的物體
    const interactableObjects = [];
    const unitMap = new Map();

    for (const unit of units) {
      if (unit.group) {
        interactableObjects.push(unit.group);
        unitMap.set(unit.group.uuid, unit);
      }
    }

    if (interactableObjects.length === 0) {
      return null;
    }

    const intersects = this.raycaster.intersectObjects(interactableObjects, true);

    if (intersects.length > 0) {
      // 找到對應的單位
      let obj = intersects[0].object;
      while (obj.parent && !unitMap.has(obj.uuid)) {
        obj = obj.parent;
      }

      const unit = unitMap.get(obj.uuid);
      if (unit) {
        return {
          point: intersects[0].point,
          unit: unit
        };
      }
    }

    return null;
  }

  /**
   * 銷毀
   */
  dispose() {
    // Raycaster 不需要特殊清理
  }
}
