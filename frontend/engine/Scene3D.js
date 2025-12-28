/**
 * 前端層 - 3D 場景管理
 * Frontend Layer - 3D Scene Management
 * 負責：Three.js 場景初始化、渲染循環、攝影機控制
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Config } from '../core/Config.js';
import { eventBus, Events } from '../core/EventBus.js';

export class Scene3D {
  constructor(eventBus) {
    this.eventBus = eventBus;

    // Three.js 核心物件
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;

    // 容器
    this.container = null;
    this.canvas = null;

    // 場景容器
    this.terrainGroup = new THREE.Group();
    this.unitGroup = new THREE.Group();
    this.graphicGroup = new THREE.Group();
    this.gridGroup = new THREE.Group();

    // 渲染狀態
    this.isRendering = false;
    this.frameCount = 0;
    this.lastTime = performance.now();
    this.fps = 60;
  }

  /**
   * 初始化場景
   */
  async initialize(canvasId) {
    // 取得 Canvas
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) {
      throw new Error(`找不到 Canvas: ${canvasId}`);
    }

    this.container = this.canvas.parentElement;

    // 建立場景
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(Config.render.backgroundColor);
    this.scene.fog = new THREE.Fog(Config.render.fogColor, Config.render.fogNear, Config.render.fogFar);

    // 建立攝影機
    const aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(
      Config.camera.fov,
      aspect,
      Config.camera.near,
      Config.camera.far
    );
    this.camera.position.set(
      Config.camera.position.x,
      Config.camera.position.y,
      Config.camera.position.z
    );

    // 建立渲染器
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: Config.render.antialias,
      alpha: true
    });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Config.render.pixelRatio);
    this.renderer.shadowMap.enabled = Config.render.shadows;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // 建立控制器
    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = Config.controls.enableDamping;
    this.controls.dampingFactor = Config.controls.dampingFactor;
    this.controls.rotateSpeed = Config.controls.rotateSpeed;
    this.controls.panSpeed = Config.controls.panSpeed;
    this.controls.zoomSpeed = Config.controls.zoomSpeed;
    this.controls.minDistance = Config.controls.minDistance;
    this.controls.maxDistance = Config.controls.maxDistance;
    this.controls.maxPolarAngle = Config.controls.maxPolarAngle;
    this.controls.minPolarAngle = Config.controls.minPolarAngle;
    this.controls.target.set(
      Config.camera.target.x,
      Config.camera.target.y,
      Config.camera.target.z
    );

    // 設定燈光
    this._setupLights();

    // 設定網格
    this._setupGrid();

    // 加入場景容器
    this.scene.add(this.terrainGroup);
    this.scene.add(this.unitGroup);
    this.scene.add(this.graphicGroup);
    this.scene.add(this.gridGroup);

    // 監聽視窗大小變化
    window.addEventListener('resize', () => this._onWindowResize());

    // 射線檢測器（用於點擊選擇）
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    // 監聽 Canvas 點擊
    this.canvas.addEventListener('click', (e) => this._onCanvasClick(e));

    // 觸發場景就緒事件
    this.eventBus.emit(Events.ENGINE_SCENE_READY);
  }

  /**
   * 設定燈光
   */
  _setupLights() {
    // 環境光
    const ambient = new THREE.AmbientLight(
      Config.lights.ambient.color,
      Config.lights.ambient.intensity
    );
    this.scene.add(ambient);

    // 平行光（太陽）
    const directional = new THREE.DirectionalLight(
      Config.lights.directional.color,
      Config.lights.directional.intensity
    );
    directional.position.set(
      Config.lights.directional.position.x,
      Config.lights.directional.position.y,
      Config.lights.directional.position.z
    );
    directional.castShadow = true;
    directional.shadow.mapSize.width = Config.render.shadowMapSize;
    directional.shadow.mapSize.height = Config.render.shadowMapSize;
    directional.shadow.camera.near = 0.5;
    directional.shadow.camera.far = 1000;
    directional.shadow.camera.left = -500;
    directional.shadow.camera.right = 500;
    directional.shadow.camera.top = 500;
    directional.shadow.camera.bottom = -500;
    this.scene.add(directional);

    // 半球光
    const hemisphere = new THREE.HemisphereLight(
      Config.lights.hemisphere.skyColor,
      Config.lights.hemisphere.groundColor,
      Config.lights.hemisphere.intensity
    );
    this.scene.add(hemisphere);
  }

  /**
   * 設定網格
   */
  _setupGrid() {
    if (!Config.grid.show) return;

    const grid = new THREE.GridHelper(
      Config.grid.size,
      Config.grid.divisions,
      Config.grid.color,
      Config.grid.color
    );
    grid.material.opacity = Config.grid.opacity;
    grid.material.transparent = true;
    this.gridGroup.add(grid);
  }

  /**
   * 視窗大小變化
   */
  _onWindowResize() {
    if (!this.container || !this.camera || !this.renderer) return;

    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
  }

  /**
   * Canvas 點擊處理
   */
  _onCanvasClick(event) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    // 檢測單位群組中的物件
    const intersects = this.raycaster.intersectObjects(this.unitGroup.children, true);

    if (intersects.length > 0) {
      // 找到對應的單位 UUID
      const object = intersects[0].object;
      const uuid = object.userData.uuid;
      if (uuid) {
        this.eventBus.emit(Events.UI_UNIT_SELECTED, { uuid });
      }
    } else {
      this.eventBus.emit(Events.UI_UNIT_DESELECTED);
    }
  }

  /**
   * 啟動渲染循環
   */
  startRenderLoop() {
    this.isRendering = true;
    this._animate();
  }

  /**
   * 停止渲染循環
   */
  stopRenderLoop() {
    this.isRendering = false;
  }

  /**
   * 動畫循環
   */
  _animate() {
    if (!this.isRendering) return;

    requestAnimationFrame(() => this._animate());

    // 更新控制器
    this.controls.update();

    // 計算 FPS
    this._calculateFPS();

    // 渲染場景
    this.renderer.render(this.scene, this.camera);

    // 觸發渲染幀事件
    this.eventBus.emit(Events.ENGINE_RENDER_TICK, { delta: 0, fps: this.fps });
  }

  /**
   * 計算 FPS
   */
  _calculateFPS() {
    this.frameCount++;
    const currentTime = performance.now();
    const elapsed = currentTime - this.lastTime;

    if (elapsed >= 1000) {
      this.fps = Math.round((this.frameCount * 1000) / elapsed);
      this.frameCount = 0;
      this.lastTime = currentTime;
    }
  }

  /**
   * 調整大小
   */
  resize(width, height) {
    if (this.camera && this.renderer) {
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    }
  }

  /**
   * 取得 FPS
   */
  getFPS() {
    return this.fps;
  }

  /**
   * 切換網格顯示 (GUI 控制)
   */
  toggleGrid(show) {
    this.gridGroup.visible = show;
  }

  /**
   * 切換霧氣顯示 (GUI 控制)
   */
  toggleFog(show) {
    this.scene.fog = show ? new THREE.Fog(Config.render.fogColor, Config.render.fogNear, Config.render.fogFar) : null;
  }

  /**
   * 設定相機距離 (GUI 控制)
   */
  setCameraDistance(distance) {
    const direction = this.camera.position.clone().sub(this.controls.target).normalize();
    this.camera.position.copy(this.controls.target).add(direction.multiplyScalar(distance));
  }

  /**
   * 銷毀
   */
  dispose() {
    this.stopRenderLoop();

    if (this.controls) {
      this.controls.dispose();
    }

    if (this.renderer) {
      this.renderer.dispose();
    }

    window.removeEventListener('resize', () => this._onWindowResize());
  }
}
