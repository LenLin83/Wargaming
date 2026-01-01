/**
 * 前端層 - 戰術標繪引擎
 * Frontend Layer - Tactical Graphics Engine
 * 負責：戰術圖形渲染、點線面繪製
 */

import * as THREE from 'three';
import { eventBus } from '../core/EventBus.js';
import { GraphicType } from '../../shared/Enums.js';

export class TacticalEngine {
  constructor(scene3D, eventBus) {
    this.scene3D = scene3D;
    this.eventBus = eventBus;

    this.graphics = new Map(); // uuid -> GraphicEntity
  }

  /**
   * 初始化
   */
  async initialize() {
    console.log('戰術標繪引擎已就緒');
  }

  /**
   * 新增戰術圖形
   */
  addGraphic(graphicData) {
    // 檢查是否已存在
    if (this.graphics.has(graphicData.uuid)) {
      return this.graphics.get(graphicData.uuid);
    }

    const entity = new GraphicEntity(graphicData);
    const mesh = entity.createMesh();

    this.scene3D.graphicGroup.add(mesh);
    this.graphics.set(graphicData.uuid, entity);

    return entity;
  }

  /**
   * 移除戰術圖形
   */
  removeGraphic(uuid) {
    const entity = this.graphics.get(uuid);
    if (!entity) return;

    this.scene3D.graphicGroup.remove(entity.mesh);
    entity.dispose();
    this.graphics.delete(uuid);
  }

  /**
   * 更新戰術圖形
   */
  updateGraphic(uuid, updates) {
    const entity = this.graphics.get(uuid);
    if (!entity) return;

    entity.update(updates);

    // 重建 Mesh
    const newMesh = entity.createMesh();
    this.scene3D.graphicGroup.remove(entity.mesh);
    entity.mesh = newMesh;
    this.scene3D.graphicGroup.add(newMesh);
  }

  /**
   * 取得圖形數量
   */
  getGraphicCount() {
    return this.graphics.size;
  }

  /**
   * 清空所有圖形
   */
  clear() {
    for (const entity of this.graphics.values()) {
      this.scene3D.graphicGroup.remove(entity.mesh);
      entity.dispose();
    }
    this.graphics.clear();
  }

  /**
   * 設定圖層可見性
   */
  setLayerVisible(layer, visible) {
    for (const entity of this.graphics.values()) {
      if (entity.data.layer === layer) {
        entity.mesh.visible = visible;
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
 * 戰術圖形實體
 */
class GraphicEntity {
  constructor(data) {
    this.data = data;
    this.mesh = null;
  }

  /**
   * 建立對應的 3D 物件
   */
  createMesh() {
    switch (this.data.type) {
      case GraphicType.POINT:
      case GraphicType.WAYPOINT:
      case GraphicType.CHECKPOINT:
      case GraphicType.OBJECTIVE:
        return this.createPoint();

      case GraphicType.LINE:
      case GraphicType.AXIS_OF_ADVANCE:
      case GraphicType.BOUNDARY:
      case GraphicType.ROUTE:
        return this.createLine();

      case GraphicType.ARROW:
      case GraphicType.ATTACK_ARROW:
        return this.createArrow();

      case GraphicType.AREA:
      case GraphicType.AO:
        return this.createArea();

      case GraphicType.CIRCULAR:
        return this.createCircle();

      default:
        return new THREE.Group();
    }
  }

  /**
   * 建立點位
   */
  createPoint() {
    const geometry = new THREE.SphereGeometry(2, 16, 16);
    const material = new THREE.MeshBasicMaterial({
      color: this.data.style.strokeColor,
      transparent: true,
      opacity: 0.8
    });

    const mesh = new THREE.Mesh(geometry, material);

    if (this.data.geometry.point) {
      const { x, y, z } = this.data.geometry.point;
      mesh.position.set(x, y + 1, z);
    }

    mesh.visible = this.data.visible;
    return mesh;
  }

  /**
   * 建立線條
   */
  createLine() {
    const points = this.data.geometry.points || [];
    if (points.length < 2) {
      return new THREE.Group();
    }

    const threePoints = points.map(p => new THREE.Vector3(p.x, p.y + 0.5, p.z));
    const geometry = new THREE.BufferGeometry().setFromPoints(threePoints);

    const material = new THREE.LineBasicMaterial({
      color: this.data.style.strokeColor,
      linewidth: this.data.style.strokeWidth,
      transparent: true,
      opacity: 0.8
    });

    const line = new THREE.Line(geometry, material);
    line.visible = this.data.visible;
    return line;
  }

  /**
   * 建立箭頭
   */
  createArrow() {
    const group = new THREE.Group();
    const points = this.data.geometry.points || [];

    if (points.length >= 2) {
      // 主線條
      const threePoints = points.map(p => new THREE.Vector3(p.x, p.y + 0.5, p.z));
      const geometry = new THREE.BufferGeometry().setFromPoints(threePoints);
      const material = new THREE.LineBasicMaterial({
        color: this.data.style.strokeColor,
        linewidth: this.data.style.strokeWidth
      });
      const line = new THREE.Line(geometry, material);
      group.add(line);

      // 箭頭頭部
      const start = points[points.length - 2];
      const end = points[points.length - 1];
      const dir = new THREE.Vector3(end.x - start.x, 0, end.z - start.z).normalize();

      const arrowHelper = new THREE.ArrowHelper(
        dir,
        new THREE.Vector3(end.x, end.y, end.z),
        10,
        this.data.style.strokeColor,
        5,
        3
      );
      group.add(arrowHelper);
    }

    group.visible = this.data.visible;
    return group;
  }

  /**
   * 建立區域
   */
  createArea() {
    const vertices = this.data.geometry.vertices || [];
    if (vertices.length < 3) {
      return new THREE.Group();
    }

    const shape = new THREE.Shape();
    shape.moveTo(vertices[0].x, vertices[0].z);

    for (let i = 1; i < vertices.length; i++) {
      shape.lineTo(vertices[i].x, vertices[i].z);
    }
    shape.closePath();

    const geometry = new THREE.ShapeGeometry(shape);
    const material = new THREE.MeshBasicMaterial({
      color: this.data.style.fillColor || this.data.style.strokeColor,
      transparent: true,
      opacity: this.data.style.fillOpacity || 0.3,
      side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = 0.1;
    mesh.visible = this.data.visible;

    return mesh;
  }

  /**
   * 建立圓形
   */
  createCircle() {
    const { center, radius, startAngle, endAngle } = this.data.geometry;

    if (!center || radius === undefined) {
      return new THREE.Group();
    }

    const geometry = new THREE.RingGeometry(radius - 0.5, radius, 32);
    const material = new THREE.MeshBasicMaterial({
      color: this.data.style.strokeColor,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(center.x, center.y + 0.2, center.z);
    mesh.rotation.x = -Math.PI / 2;
    mesh.visible = this.data.visible;

    return mesh;
  }

  /**
   * 更新
   */
  update(updates) {
    Object.assign(this.data, updates);
  }

  /**
   * 釋放資源
   */
  dispose() {
    if (this.mesh) {
      if (this.mesh.geometry) {
        this.mesh.geometry.dispose();
      }
      if (this.mesh.material) {
        if (Array.isArray(this.mesh.material)) {
          this.mesh.material.forEach(m => m.dispose());
        } else {
          this.mesh.material.dispose();
        }
      }
    }
  }
}
