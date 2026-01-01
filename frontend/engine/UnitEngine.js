/**
 * 前端層 - 單位引擎
 * Frontend Layer - Unit Engine
 * 負責：單位 3D 實體管理、LOD 控制、選取管理
 */

import * as THREE from 'three';
import { Config } from '../core/Config.js';
import { eventBus, Events } from '../core/EventBus.js';
import { LODLevel } from '../../shared/Enums.js';

export class UnitEngine {
  constructor(scene3D, symbolEngine, eventBus) {
    this.scene3D = scene3D;
    this.symbolEngine = symbolEngine;
    this.eventBus = eventBus;

    this.units = new Map(); // uuid -> UnitEntity
    this.selectedUnitId = null;
  }

  /**
   * 初始化
   */
  async initialize() {
    console.log('單位引擎已就緒');
  }

  /**
   * 新增單位
   */
  async addUnit(unitData) {
    // 檢查是否已存在
    if (this.units.has(unitData.uuid)) {
      console.warn(`單位已存在: ${unitData.uuid}`);
      return this.units.get(unitData.uuid);
    }

    // 建立單位實體
    const entity = new UnitEntity(unitData, this.symbolEngine);

    // 建立模型
    await entity.createModel();

    // 建立符號
    await entity.createSymbol();


    // 設定位置
    entity.updateTransform();

    // 加入場景
    this.scene3D.unitGroup.add(entity.group);

    // 註冊
    this.units.set(unitData.uuid, entity);

    // 觸發事件
    this.eventBus.emit(Events.ENGINE_UNIT_ADDED, { uuid: unitData.uuid });

    return entity;
  }

  /**
   * 更新單位
   */
  updateUnit(uuid, updates) {
    const entity = this.units.get(uuid);
    if (!entity) {
      console.warn(`找不到單位: ${uuid}`);
      return;
    }

    // 更新資料
    entity.update(updates);

    // 如果更新 SIDC，需要重新生成符號
    if (updates.sidc) {
      entity.regenerateSymbol();
    }
  }

  /**
   * 移除單位
   */
  removeUnit(uuid) {
    const entity = this.units.get(uuid);
    if (!entity) return;

    // 從場景移除
    this.scene3D.unitGroup.remove(entity.group);

    // 釋放資源
    entity.dispose();

    // 從地圖移除
    this.units.delete(uuid);

    // 如果是選中狀態，取消選取
    if (this.selectedUnitId === uuid) {
      this.deselectUnit();
    }

    // 觸發事件
    this.eventBus.emit(Events.ENGINE_UNIT_REMOVED, { uuid });
  }

  /**
   * 選取單位
   */
  selectUnit(uuid) {
    // 取消之前的選取
    if (this.selectedUnitId) {
      const prevEntity = this.units.get(this.selectedUnitId);
      if (prevEntity) {
        prevEntity.setSelected(false);
      }
    }

    // 選取新單位
    const entity = this.units.get(uuid);
    if (entity) {
      entity.setSelected(true);
      this.selectedUnitId = uuid;
    }
  }

  /**
   * 取消選取
   */
  deselectUnit() {
    if (this.selectedUnitId) {
      const entity = this.units.get(this.selectedUnitId);
      if (entity) {
        entity.setSelected(false);
      }
      this.selectedUnitId = null;
    }
  }

  /**
   * 移動單位到新位置
   */
  moveUnitToPosition(uuid, position) {
    const entity = this.units.get(uuid);
    if (!entity) {
      console.warn(`找不到要移動的單位: ${uuid}`);
      return;
    }

    // 更新 3D 位置
    entity.group.position.set(position.x, position.y, position.z);

    // 更新資料
    entity.data.transform.position = { ...position };

    console.log(`單位已移動: ${uuid} → (${position.x.toFixed(1)}, ${position.y.toFixed(1)}, ${position.z.toFixed(1)})`);
  }

  /**
   * 更新 LOD（每幀調用）
   */
  updateLOD() {
    if (!Config.lod.enabled) return;

    const cameraPosition = this.scene3D.camera.position;

    for (const entity of this.units.values()) {
      const distance = cameraPosition.distanceTo(entity.group.position);
      entity.updateLOD(distance, Config.lod.levels);
    }
  }

  /**
   * 取得單位實體
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
   * 取得單位數量
   */
  getUnitCount() {
    return this.units.size;
  }

  /**
   * 清空所有單位
   */
  clear() {
    for (const entity of this.units.values()) {
      this.scene3D.unitGroup.remove(entity.group);
      entity.dispose();
    }
    this.units.clear();
    this.selectedUnitId = null;
  }

  /**
   * 更新符號高度 (GUI 控制)
   */
  updateSymbolHeight(height) {
    for (const entity of this.units.values()) {
      entity.updateSymbolHeight(height);
    }
  }

  /**
   * 更新符號大小 (GUI 控制)
   */
  updateSymbolSize(width, height) {
    for (const entity of this.units.values()) {
      entity.updateSymbolSize(width, height);
    }
  }

  /**
   * 更新連接線顯示 (GUI 控制)
   */
  updateConnectionLines(show) {
    for (const entity of this.units.values()) {
      entity.updateConnectionLines(show);
    }
  }

  /**
   * 更新連接線透明度 (GUI 控制)
   */
  updateLineOpacity(opacity) {
    for (const entity of this.units.values()) {
      entity.updateLineOpacity(opacity);
    }
  }

  /**
   * 更新模型大小 (GUI 控制)
   */
  updateModelSize(size) {
    for (const entity of this.units.values()) {
      entity.updateModelSize(size);
    }
  }

  /**
   * 切換符號顯示 (GUI 控制)
   */
  toggleSymbols(show) {
    for (const entity of this.units.values()) {
      if (entity.symbol) {
        entity.symbol.visible = show;
      }
    }
  }

  /**
   * 切換模型顯示 (GUI 控制)
   */
  toggleModels(show) {
    for (const entity of this.units.values()) {
      if (entity.model) {
        entity.model.visible = show;
      }
    }
  }

  /**
   * 切換標籤顯示 (GUI 控制)
   */
  toggleLabels(show) {
    for (const entity of this.units.values()) {
      if (entity.label) {
        entity.label.visible = show;
      }
    }
  }

  /**
   * 銷毀
   */
  dispose() {
    this.clear();
  }
}

/**
 * 單位實體類別
 */
class UnitEntity {
  constructor(unitData, symbolEngine) {
    this.data = unitData;
    this.symbolEngine = symbolEngine;

    this.group = new THREE.Group();
    this.group.name = `unit-${unitData.uuid}`;

    this.model = null;
    this.symbol = null;
    this.label = null;
    this.connectionLine = null;

    // 火力視覺元素
    this.fireRangeRing = null;
    this.fireSectorMesh = null;

    this.selected = false;
    this.lodLevel = LODDetail.DETAIL;
  }

  /**
   * 建立 3D 模型
   */
  async createModel() {
    const { type, size, color } = Config.unit.defaultModel;

    let geometry;
    switch (type) {
      case 'box':
        geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
        break;
      case 'sphere':
        geometry = new THREE.SphereGeometry(size.x / 2, 16, 16);
        break;
      default:
        geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
    }

    const material = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.7,
      metalness: 0.3
    });

    this.model = new THREE.Mesh(geometry, material);
    this.model.castShadow = true;
    this.model.receiveShadow = true;
    this.model.position.y = size.y / 2; // 放在地面上
    

    this.group.add(this.model);
  }

  /**
   * 建立符號
   */
  async createSymbol() {
    // 符號高度位置 (距離地面)
    const symbolHeight = 100;
    const modelTop = this.model ? 2 : 0; // 模型頂部高度

    // 建立連接線 (從模型頂部到符號) - 綠色發光效果
    const lineGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, modelTop, 0),
      new THREE.Vector3(0, symbolHeight, 0)
    ]);
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x00ff88,      // 亮綠色
      transparent: true,
      opacity: 0.9          // 提高透明度使發光效果更明顯
    });
    this.connectionLine = new THREE.Line(lineGeometry, lineMaterial);
    this.group.add(this.connectionLine);

    // 建立符號 - 傳遞文字參數
    this.symbol = await this.symbolEngine.generateSprite(this.data.sidc, {
      size: Config.unit.symbol.defaultSize,
      opacity: Config.unit.symbol.opacity,
      uniqueDesignation: this.data.designation || '',
      higherFormation: this.data.higherFormation || '',
      echelon: this.data.level || '' // level 與 echelon 使用相同值（如 company, battalion）
    });

    // 固定符號大小為 100x50
    this.symbol.scale.set(100, 50, 1);
    this.customSymbolSize = { width: 100, height: 50 };
    this.symbol.userData.uuid = this.data.uuid;
    this.symbol.position.y = symbolHeight;

    this.group.add(this.symbol);
  }

  /**
   * 建立或更新火力範圍圓圈
   */
  updateFireRange(range) {
    // 移除舊的範圍圓圈
    if (this.fireRangeRing) {
      this.group.remove(this.fireRangeRing);
      this.fireRangeRing.geometry.dispose();
      this.fireRangeRing.material.dispose();
      this.fireRangeRing = null;
    }

    if (range <= 0) return;

    // 建立圓圈幾何
    const segments = 64;
    const geometry = new THREE.RingGeometry(range - 0.5, range + 0.5, segments);
    geometry.rotateX(-Math.PI / 2); // 旋轉至水平

    const material = new THREE.MeshBasicMaterial({
      color: 0xff4444,      // 紅色
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide
    });

    this.fireRangeRing = new THREE.Mesh(geometry, material);
    this.fireRangeRing.position.y = 0.5; // 略高於地面避免 z-fighting

    this.group.add(this.fireRangeRing);
  }

  /**
   * 建立或更新射界扇形
   * @param {number} directionStart - 射界左起角度 (度數, 0=北, 90=東, 180=南, 270=西)
   * @param {number} directionEnd - 射界右至角度 (度數)
   * @param {number} range - 火力範圍
   */
  updateFireSector(directionStart, directionEnd, range) {
    // 移除舊的射界
    if (this.fireSectorMesh) {
      this.group.remove(this.fireSectorMesh);
      this.fireSectorMesh.geometry.dispose();
      this.fireSectorMesh.material.dispose();
      this.fireSectorMesh = null;
    }

    if (range <= 0) return;

    // 如果沒有設置射界角度，不顯示扇形
    if (directionStart === 0 && directionEnd === 0) return;

    // 建立扇形幾何
    const segments = 64;
    const shape = new THREE.Shape();

    // 轉換角度為弧度
    const startAngle = THREE.MathUtils.degToRad(directionStart);
    const endAngle = THREE.MathUtils.degToRad(directionEnd);

    // 計算角度範圍（處理跨越 0/360 度的情況）
    let angleDiff = endAngle - startAngle;
    if (angleDiff < 0) {
      angleDiff += Math.PI * 2; // 跨越 0 度
    }

    // 繪製扇形（從左起角度到右至角度，順時針）
    shape.moveTo(0, 0);
    for (let i = 0; i <= segments; i++) {
      const angle = startAngle + (angleDiff * i / segments);
      const x = Math.cos(angle) * range;
      const z = Math.sin(angle) * range;
      shape.lineTo(x, z);
    }
    shape.closePath();

    const geometry = new THREE.ShapeGeometry(shape);
    geometry.rotateX(-Math.PI / 2); // 旋轉至水平

    const material = new THREE.MeshBasicMaterial({
      color: 0xffaa00,      // 橙色
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide
    });

    this.fireSectorMesh = new THREE.Mesh(geometry, material);
    this.fireSectorMesh.position.y = 0.6; // 略高於範圍圓圈

    this.group.add(this.fireSectorMesh);
  }

  /**
   * 更新火力視覺化（統一入口）
   */
  updateFirepower(firepower) {
    if (firepower) {
      this.updateFireRange(firepower.range || 0);
      this.updateFireSector(
        firepower.directionStart || 0,
        firepower.directionEnd || 0,
        firepower.range || 0
      );
    }
  }

  /**
   * 建立標籤
   */
  async createLabel() {
    this.label = await this.symbolEngine.generateLabel(this.data.name, {
      fontSize: 14,
      color: '#ffffff'
    });

    this.label.position.y = 23; // 符號高度 + 間距

    this.group.add(this.label);
  }

  /**
   * 更新變換
   */
  updateTransform() {
    const { position, rotation } = this.data.transform;
    this.group.position.set(position.x, position.y, position.z);
    this.group.rotation.y = THREE.MathUtils.degToRad(rotation.y);
  }

  /**
   * 更新資料
   */
  update(updates) {
    Object.assign(this.data, updates);

    if (updates.transform) {
      this.updateTransform();
    }
  }

  /**
   * 重新生成符號
   */
  async regenerateSymbol() {
    // 移除舊符號和連接線
    if (this.symbol) {
      this.group.remove(this.symbol);
      this.symbol.material.dispose();
    }
    if (this.connectionLine) {
      this.group.remove(this.connectionLine);
      this.connectionLine.geometry.dispose();
      this.connectionLine.material.dispose();
    }
    await this.createSymbol();
  }

  /**
   * 設定選取狀態
   */
  setSelected(selected) {
    this.selected = selected;

    if (this.model) {
      if (selected) {
        this.model.material.emissive = new THREE.Color(0x333333);
      } else {
        this.model.material.emissive = new THREE.Color(0x000000);
      }
    }

    if (this.connectionLine) {
      if (selected) {
        // 選取時使用更亮的綠色
        this.connectionLine.material.color.setHex(0x00ff88);
        this.connectionLine.material.opacity = 1;
      } else {
        // 未選取時也是綠色，但透明度稍低
        this.connectionLine.material.color.setHex(0x00ff88);
        this.connectionLine.material.opacity = 0.9;
      }
    }
  }

  /**
   * 更新符號大小 (GUI 控制)
   * 禁用 LOD 對符號大小的自動調整
   */
  updateSymbolSize(width, height) {
    this.customSymbolSize = { width, height };
    if (this.symbol) {
      this.symbol.scale.set(width, height, 1);
    }
  }

  /**
   * 更新符號高度 (GUI 控制)
   */
  updateSymbolHeight(height) {
    if (this.symbol) {
      this.symbol.position.y = height;
    }
    // 更新連接線
    if (this.connectionLine && this.model) {
      const modelTop = this.model.scale.y;
      const points = [
        new THREE.Vector3(0, modelTop, 0),
        new THREE.Vector3(0, height, 0)
      ];
      this.connectionLine.geometry.setFromPoints(points);
    }
    // 更新標籤位置
    if (this.label) {
      this.label.position.y = height + 8;
    }
  }

  /**
   * 更新連接線顯示 (GUI 控制)
   */
  updateConnectionLines(show) {
    if (this.connectionLine) {
      this.connectionLine.visible = show && (this.model?.visible !== false);
    }
  }

  /**
   * 更新連接線透明度 (GUI 控制)
   */
  updateLineOpacity(opacity) {
    if (this.connectionLine && !this.selected) {
      this.connectionLine.material.opacity = opacity;
    }
  }

  /**
   * 更新模型大小 (GUI 控制)
   */
  updateModelSize(size) {
    if (this.model) {
      this.model.scale.set(size, size, size);
      this.model.position.y = size / 2;
      // 更新連接線底部位置
      if (this.connectionLine) {
        const symbolHeight = this.symbol ? this.symbol.position.y : 100;
        const points = [
          new THREE.Vector3(0, size, 0),
          new THREE.Vector3(0, symbolHeight, 0)
        ];
        this.connectionLine.geometry.setFromPoints(points);
      }
    }
  }

  /**
   * 更新 LOD
   */
  updateLOD(distance, levels) {
    let newLevel = LODDetail.DETAIL;

    // 從遠到近檢查
    for (let i = levels.length - 1; i >= 0; i--) {
      if (distance >= levels[i].minDistance) {
        newLevel = levels[i].name;
        break;
      }
    }

    if (newLevel !== this.lodLevel) {
      this.lodLevel = newLevel;
      this.applyLOD(newLevel, levels);
    }
  }

  /**
   * 套用 LOD 設定
   */
  applyLOD(level, levels) {
    const config = levels.find(l => l.name === level);
    if (!config) return;

    // 模型可見性
    if (this.model) {
      this.model.visible = config.showModel;
    }

    // 連接線可見性 (跟隨模型)
    if (this.connectionLine) {
      this.connectionLine.visible = config.showModel;
    }

    // 符號可見性
    if (this.symbol) {
      this.symbol.visible = config.showSymbol;
      // 如果有用戶自訂的大小，使用自訂大小；否則使用 LOD 配置
      if (this.customSymbolSize) {
        this.symbol.scale.set(this.customSymbolSize.width, this.customSymbolSize.height, 1);
      } else {
        this.symbol.scale.set(config.symbolSize, config.symbolSize, 1);
      }
    }
  }

  /**
   * 釋放資源
   */
  dispose() {
    if (this.model) {
      this.model.geometry.dispose();
      this.model.material.dispose();
    }
    if (this.connectionLine) {
      this.connectionLine.geometry.dispose();
      this.connectionLine.material.dispose();
    }
    if (this.symbol) {
      this.symbol.material.dispose();
    }
    if (this.label) {
      this.label.material.dispose();
    }
    // 清理火力視覺元素
    if (this.fireRangeRing) {
      this.fireRangeRing.geometry.dispose();
      this.fireRangeRing.material.dispose();
    }
    if (this.fireSectorMesh) {
      this.fireSectorMesh.geometry.dispose();
      this.fireSectorMesh.material.dispose();
    }
  }
}

/**
 * LOD 細節等級
 */
const LODDetail = {
  STRATEGIC: 'strategic',
  OPERATIONAL: 'operational',
  TACTICAL: 'tactical',
  DETAIL: 'detail'
};
