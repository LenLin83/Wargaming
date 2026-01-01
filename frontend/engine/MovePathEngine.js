/**
 * Frontend 層 - 移動路徑引擎
 * Frontend Layer - Move Path Engine
 * 負責：3D 場景中的路徑渲染、動畫播放、視覺元素管理
 */

import * as THREE from 'three';
import { eventBus } from '../core/EventBus.js';

export class MovePathEngine {
  constructor(scene3D, unitEngine) {
    this.scene3D = scene3D;
    this.unitEngine = unitEngine;

    // 路徑資料
    this.waypoints = []; // { position: Vector3, handleIn, handleOut }
    this.currentUnit = null;

    // 動畫狀態
    this.isPlaying = false;
    this.animationId = null;

    // 視覺元素
    this.pathLine = null;
    this.waypointMarkers = [];

    // 顯示模式
    this.readOnlyMode = false;

    // 事件監聽器清理
    this._eventCleanup = [];

    this._setupEventListeners();
  }

  /**
   * 獲取場景
   */
  get scene() {
    return this.scene3D?.scene;
  }

  /**
   * 獲取地形
   */
  get terrain() {
    return this.scene3D?.terrain;
  }

  /**
   * 獲取攝影機
   */
  get camera() {
    return this.scene3D?.camera;
  }

  /**
   * 設置事件監聽
   */
  _setupEventListeners() {
    // 監聽單位更新事件
    const cleanup1 = eventBus.on('backend:unit:updated', ({ uuid }) => {
      if (this.currentUnit && this.currentUnit.uuid === uuid) {
        // 單位更新時刷新路徑顯示
        this._updatePathLine();
        this._updateWaypointMarkers();
      }
    });
    this._eventCleanup.push(cleanup1);
  }

  /**
   * 設置路徑資料
   */
  setPath(unitUuid, waypoints) {
    this.currentUnit = { uuid: unitUuid };
    this.waypoints = waypoints.map(wp => ({
      position: new THREE.Vector3(wp.x, wp.y, wp.z),
      handleIn: wp.handleIn ? new THREE.Vector3(wp.handleIn.x, wp.handleIn.y, wp.handleIn.z) : null,
      handleOut: wp.handleOut ? new THREE.Vector3(wp.handleOut.x, wp.handleOut.y, wp.handleOut.z) : null
    }));

    this._createVisualElements();
  }

  /**
   * 設置顯示模式
   */
  setDisplayMode(readOnly) {
    this.readOnlyMode = readOnly;
    this._updatePathLine();
    this._updateWaypointMarkers();
  }

  /**
   * 添加路徑點
   */
  addWaypoint(position) {
    const waypoint = {
      position: position.clone(),
      handleIn: null,
      handleOut: null
    };

    this.waypoints.push(waypoint);

    // 更新視覺元素
    this._updatePathLine();
    this._updateWaypointMarkers();

    // 通知事件
    eventBus.emit('engine:path-waypoint-added', {
      waypointIndex: this.waypoints.length - 1,
      totalWaypoints: this.waypoints.length
    });

    return this.waypoints.length - 1;
  }

  /**
   * 移除路徑點
   */
  removeWaypoint(index) {
    if (index < 0 || index >= this.waypoints.length) return;
    if (index === 0) {
      console.warn('無法刪除起點');
      return;
    }

    this.waypoints.splice(index, 1);

    // 更新視覺元素
    this._updatePathLine();
    this._updateWaypointMarkers();

    // 通知事件
    eventBus.emit('engine:path-waypoint-removed', {
      waypointIndex: index,
      totalWaypoints: this.waypoints.length
    });
  }

  /**
   * 清除路徑
   */
  clearPath() {
    const startPoint = this.waypoints[0];
    this.waypoints = startPoint ? [startPoint] : [];

    this._updatePathLine();
    this._updateWaypointMarkers();

    eventBus.emit('engine:path-cleared');
  }

  /**
   * 創建視覺元素
   */
  _createVisualElements() {
    this._updatePathLine();
    this._updateWaypointMarkers();
  }

  /**
   * 更新路徑線（使用貝茲曲線）
   */
  _updatePathLine() {
    const scene = this.scene;
    if (!scene) return;

    // 移除舊的路徑線
    if (this.pathLine) {
      scene.remove(this.pathLine);
      this.pathLine.geometry.dispose();
      this.pathLine.material.dispose();
      this.pathLine = null;
    }

    if (this.waypoints.length < 2) return;

    // 生成貝茲曲線點
    const curve = this._createBezierCurve();
    if (!curve) return;

    const points = curve.getPoints(100);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);

    // 根據模式選擇顏色
    const color = this.readOnlyMode ? 0x888888 : 0x00ff00;
    const material = new THREE.LineBasicMaterial({
      color: color,
      linewidth: 2
    });

    this.pathLine = new THREE.Line(geometry, material);
    this.pathLine.position.y = 1;
    scene.add(this.pathLine);
  }

  /**
   * 創建貝茲曲線
   */
  _createBezierCurve() {
    if (this.waypoints.length < 2) return null;
    const points = this.waypoints.map(wp => wp.position.clone());
    return new THREE.CatmullRomCurve3(points);
  }

  /**
   * 更新路徑點標記
   */
  _updateWaypointMarkers() {
    const scene = this.scene;
    if (!scene) return;

    // 清除舊標記
    this.waypointMarkers.forEach(marker => {
      scene.remove(marker);
      marker.geometry.dispose();
      marker.material.dispose();
    });
    this.waypointMarkers = [];

    // 創建新標記
    this.waypoints.forEach((wp, index) => {
      const geometry = new THREE.SphereGeometry(2, 16, 16);

      // 根據模式選擇顏色
      let color;
      if (this.readOnlyMode) {
        color = 0x888888;
      } else {
        color = index === 0 ? 0x00ff00 : 0xffff00;
      }

      const material = new THREE.MeshBasicMaterial({ color });
      const marker = new THREE.Mesh(geometry, material);
      marker.position.copy(wp.position);
      marker.position.y += 1;
      marker.userData.waypointIndex = index;

      scene.add(marker);
      this.waypointMarkers.push(marker);
    });
  }

  /**
   * 播放移動動畫
   */
  play() {
    if (this.waypoints.length < 2) {
      console.warn('需要至少 2 個路徑點才能播放');
      return;
    }

    if (this.isPlaying) {
      this.stop();
    }

    this.isPlaying = true;

    const curve = this._createBezierCurve();
    if (!curve) return;

    const duration = 5000;
    const startTime = Date.now();
    const entity = this.unitEngine.getUnit(this.currentUnit.uuid);

    if (!entity) {
      console.error('找不到單位實體');
      return;
    }

    const animate = () => {
      if (!this.isPlaying) return;

      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      const point = curve.getPoint(progress);

      entity.group.position.copy(point);
      entity.data.transform.position = { x: point.x, y: point.y, z: point.z };

      if (progress < 1) {
        this.animationId = requestAnimationFrame(animate);
      } else {
        this.isPlaying = false;
        eventBus.emit('engine:path-playback-complete', {
          uuid: this.currentUnit.uuid
        });
      }
    };

    animate();

    eventBus.emit('engine:path-playback-start', {
      uuid: this.currentUnit.uuid,
      duration: duration
    });
  }

  /**
   * 停止播放並將單位移回起始點
   */
  stop() {
    this.isPlaying = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    // 將單位移回路徑起始點
    if (this.currentUnit && this.waypoints.length > 0) {
      const startPoint = this.waypoints[0].position;
      this.moveUnitToPosition(startPoint);
      console.log('[MovePathEngine] 停止播放，單位回到起始點:', startPoint);
    }

    eventBus.emit('engine:path-playback-stopped', {
      uuid: this.currentUnit?.uuid
    });
  }

  /**
   * 獲取路徑資訊
   */
  getPathInfo() {
    if (this.waypoints.length < 2) return null;

    const curve = this._createBezierCurve();
    if (!curve) return null;

    return {
      waypointCount: this.waypoints.length,
      totalLength: curve.getLength(),
      waypoints: this.waypoints.map((wp, i) => ({
        index: i,
        x: wp.position.x.toFixed(1),
        y: wp.position.y.toFixed(1),
        z: wp.position.z.toFixed(1)
      }))
    };
  }

  /**
   * 獲取可保存的路徑資料
   */
  getPath() {
    return this.waypoints.map(wp => ({
      x: wp.position.x,
      y: wp.position.y,
      z: wp.position.z
    }));
  }

  /**
   * 將單位移動到指定位置
   */
  moveUnitToPosition(position) {
    if (!this.currentUnit) return;

    const entity = this.unitEngine.getUnit(this.currentUnit.uuid);
    if (entity) {
      entity.group.position.copy(position);
      entity.data.transform.position = {
        x: position.x,
        y: position.y,
        z: position.z
      };

      // 觸發更新事件
      eventBus.emit('backend:unit:updated', {
        uuid: this.currentUnit.uuid,
        updates: {
          x: position.x,
          y: position.y,
          z: position.z
        }
      });
    }
  }

  /**
   * 清除視覺元素
   */
  _clearVisualElements() {
    const scene = this.scene;
    if (!scene) return;

    if (this.pathLine) {
      scene.remove(this.pathLine);
      this.pathLine.geometry.dispose();
      this.pathLine.material.dispose();
      this.pathLine = null;
    }

    this.waypointMarkers.forEach(marker => {
      scene.remove(marker);
      marker.geometry.dispose();
      marker.material.dispose();
    });
    this.waypointMarkers = [];
  }

  /**
   * 清空
   */
  dispose() {
    this.stop();
    this._clearVisualElements();
    this._eventCleanup.forEach(cleanup => cleanup());
    this._eventCleanup = [];
    this.currentUnit = null;
    this.waypoints = [];
  }
}
