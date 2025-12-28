/**
 * 前端層 - 地形引擎
 * Frontend Layer - Terrain Engine
 * 負責：地形渲染、高度查詢、地形交互
 */

import * as THREE from 'three';
import { Config } from '../core/Config.js';
import { eventBus, Events } from '../core/EventBus.js';

export class TerrainEngine {
  constructor(scene3D, eventBus) {
    this.scene3D = scene3D;
    this.eventBus = eventBus;

    this.terrain = null;
    this.heightData = null;
  }

  /**
   * 初始化
   */
  async initialize() {
    // 建立預設平面地形
    await this.createFlatTerrain(
      Config.terrain.width,
      Config.terrain.height
    );

    console.log('地形引擎已就緒');
  }

  /**
   * 建立平面地形
   */
  async createFlatTerrain(width, height) {
    // 清除舊地形
    this.clear();

    const geometry = new THREE.PlaneGeometry(
      width,
      height,
      Config.terrain.segments,
      Config.terrain.segments
    );

    // 旋轉為水平
    geometry.rotateX(-Math.PI / 2);

    const material = new THREE.MeshStandardMaterial({
      color: Config.terrain.color,
      roughness: 0.8,
      metalness: 0.1,
      flatShading: false,
      wireframe: Config.terrain.wireframe
    });

    this.terrain = new THREE.Mesh(geometry, material);
    this.terrain.receiveShadow = true;
    this.terrain.name = 'terrain';

    this.scene3D.terrainGroup.add(this.terrain);

    // 觸發地形就緒事件
    this.eventBus.emit(Events.ENGINE_TERRAIN_READY, { width, height });

    return this.terrain;
  }

  /**
   * 建立高程地形（預留功能）
   */
  async createHeightmapTerrain(heightmapUrl, options = {}) {
    const {
      width = Config.terrain.width,
      height = Config.terrain.height,
      maxHeight = 100,
      minHeight = 0
    } = options;

    // 載入高程圖
    const loader = new THREE.TextureLoader();
    const texture = await new Promise((resolve, reject) => {
      loader.load(heightmapUrl, resolve, undefined, reject);
    });

    // 建立地形幾何
    const segmentsX = Math.floor(width / 10);
    const segmentsZ = Math.floor(height / 10);

    const geometry = new THREE.PlaneGeometry(width, height, segmentsX, segmentsZ);
    geometry.rotateX(-Math.PI / 2);

    // 應用高度
    this._applyHeightmap(geometry, texture.image, maxHeight, minHeight);

    const material = new THREE.MeshStandardMaterial({
      color: Config.terrain.color,
      roughness: 0.8,
      metalness: 0.1
    });

    this.terrain = new THREE.Mesh(geometry, material);
    this.terrain.receiveShadow = true;
    this.terrain.name = 'terrain';

    this.scene3D.terrainGroup.add(this.terrain);

    return this.terrain;
  }

  /**
   * 應用高程圖
   */
  _applyHeightmap(geometry, image, maxHeight, minHeight) {
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);

    const imageData = ctx.getImageData(0, 0, image.width, image.height);

    const positions = geometry.attributes.position.array;
    const vertexCount = positions.length / 3;

    for (let i = 0; i < vertexCount; i++) {
      // 對應高程圖位置
      const x = i % (geometry.parameters.widthSegments + 1);
      const z = Math.floor(i / (geometry.parameters.widthSegments + 1));

      const u = x / geometry.parameters.widthSegments;
      const v = z / geometry.parameters.heightSegments;

      const pixelX = Math.floor(u * image.width);
      const pixelY = Math.floor(v * image.height);

      const pixelIndex = (pixelY * image.width + pixelX) * 4;
      const heightValue = imageData.data[pixelIndex] / 255;

      // 設定高度（Y 軸）
      positions[i * 3 + 1] = minHeight + heightValue * (maxHeight - minHeight);
    }

    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
  }

  /**
   * 取得地形高度
   */
  getTerrainHeight(x, z) {
    if (!this.terrain) return 0;

    // 使用射線檢測取得高度
    const raycaster = new THREE.Raycaster();
    raycaster.set(
      new THREE.Vector3(x, 1000, z),
      new THREE.Vector3(0, -1, 0)
    );

    const intersects = raycaster.intersectObject(this.terrain);

    if (intersects.length > 0) {
      return intersects[0].point.y;
    }

    return 0;
  }

  /**
   * 射線檢測地形
   */
  raycast(x, z) {
    if (!this.terrain) return null;

    const raycaster = new THREE.Raycaster();
    raycaster.set(
      new THREE.Vector3(x, 1000, z),
      new THREE.Vector3(0, -1, 0)
    );

    const intersects = raycaster.intersectObject(this.terrain);

    if (intersects.length > 0) {
      return intersects[0].point;
    }

    return null;
  }

  /**
   * 將單位對齊到地形
   */
  snapToTerrain(unitMesh) {
    if (!unitMesh || !this.terrain) return;

    const position = unitMesh.position;
    const height = this.getTerrainHeight(position.x, position.z);
    position.y = height;
  }

  /**
   * 清除地形
   */
  clear() {
    if (this.terrain) {
      this.scene3D.terrainGroup.remove(this.terrain);
      this.terrain.geometry.dispose();
      this.terrain.material.dispose();
      this.terrain = null;
    }
  }

  /**
   * 設定地形可見性
   */
  setVisible(visible) {
    if (this.terrain) {
      this.terrain.visible = visible;
    }
  }

  /**
   * 銷毀
   */
  dispose() {
    this.clear();
  }
}
