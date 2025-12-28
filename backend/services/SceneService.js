/**
 * 後端層 - 場景業務服務
 * Backend Layer - Scene Business Service
 */

import { Scene } from '../data/Scene.js';
import { TacticalGraphic } from '../data/TacticalGraphic.js';

/**
 * 場景業務服務
 * 負責：場景管理、載入、儲存、匯入匯出
 */
export class SceneService {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.currentScene = null;
  }

  /**
   * 建立新場景
   */
  createScene(config = {}) {
    this.currentScene = new Scene(config);

    this.eventBus.emit('backend:scene:created', { scene: this.currentScene });

    return this.currentScene;
  }

  /**
   * 載入場景
   */
  loadScene(sceneData) {
    this.currentScene = Scene.fromJSON(sceneData);

    this.eventBus.emit('backend:scene:loaded', { scene: this.currentScene });

    return this.currentScene;
  }

  /**
   * 取得當前場景
   */
  getCurrentScene() {
    return this.currentScene;
  }

  /**
   * 更新場景設定
   */
  updateSettings(updates) {
    if (!this.currentScene) {
      throw new Error('沒有載入場景');
    }

    Object.assign(this.currentScene.settings, updates);
    this.currentScene.updatedAt = new Date().toISOString();

    this.eventBus.emit('backend:scene:settings:updated', { settings: this.currentScene.settings });

    return this.currentScene.settings;
  }

  /**
   * 匯出場景為 JSON
   */
  exportScene() {
    if (!this.currentScene) {
      throw new Error('沒有載入場景');
    }

    return this.currentScene.toJSON();
  }

  /**
   * 匯入場景從 JSON
   */
  importScene(json) {
    return this.loadScene(json);
  }

  /**
   * 儲存場景到本地儲存
   */
  async saveToLocal(key = 'wargame-scene') {
    if (!this.currentScene) {
      throw new Error('沒有載入場景');
    }

    const json = JSON.stringify(this.exportScene());
    localStorage.setItem(key, json);

    this.eventBus.emit('backend:scene:saved', { key });

    return true;
  }

  /**
   * 從本地儲存載入場景
   */
  async loadFromLocal(key = 'wargame-scene') {
    const json = localStorage.getItem(key);
    if (!json) {
      throw new Error('找不到儲存的場景');
    }

    const sceneData = JSON.parse(json);
    return this.loadScene(sceneData);
  }

  /**
   * 清空場景
   */
  clearScene() {
    this.currentScene = null;

    this.eventBus.emit('backend:scene:cleared');
  }

  /**
   * 新增單位到場景
   */
  addUnitToScene(unit) {
    if (!this.currentScene) {
      throw new Error('沒有載入場景');
    }

    this.currentScene.addUnit(unit);

    this.eventBus.emit('backend:scene:unit:added', { unit });

    return unit;
  }

  /**
   * 從場景移除單位
   */
  removeUnitFromScene(uuid) {
    if (!this.currentScene) {
      throw new Error('沒有載入場景');
    }

    this.currentScene.removeUnit(uuid);

    this.eventBus.emit('backend:scene:unit:removed', { uuid });
  }

  /**
   * 更新場景中的單位
   */
  updateUnitInScene(uuid, updates) {
    if (!this.currentScene) {
      throw new Error('沒有載入場景');
    }

    const unit = this.currentScene.getUnit(uuid);
    if (!unit) {
      throw new Error(`場景中找不到單位: ${uuid}`);
    }

    unit.update(updates);

    this.eventBus.emit('backend:scene:unit:updated', { uuid, updates });

    return unit;
  }

  /**
   * 新增戰術圖形到場景
   */
  addGraphicToScene(graphicData) {
    if (!this.currentScene) {
      throw new Error('沒有載入場景');
    }

    const graphic = new TacticalGraphic(graphicData);
    this.currentScene.addGraphic(graphic);

    this.eventBus.emit('backend:scene:graphic:added', { graphic });

    return graphic;
  }

  /**
   * 從場景移除戰術圖形
   */
  removeGraphicFromScene(uuid) {
    if (!this.currentScene) {
      throw new Error('沒有載入場景');
    }

    this.currentScene.removeGraphic(uuid);

    this.eventBus.emit('backend:scene:graphic:removed', { uuid });
  }

  /**
   * 更新場景時間
   */
  updateTime(timeData) {
    if (!this.currentScene) {
      throw new Error('沒有載入場景');
    }

    Object.assign(this.currentScene.time, timeData);

    this.eventBus.emit('backend:scene:time:updated', { time: this.currentScene.time });

    return this.currentScene.time;
  }

  /**
   * 播放/暫停
   */
  togglePlay() {
    if (!this.currentScene) {
      throw new Error('沒有載入場景');
    }

    this.currentScene.time.isPlaying = !this.currentScene.time.isPlaying;

    this.eventBus.emit('backend:scene:playback:toggled', {
      isPlaying: this.currentScene.time.isPlaying
    });

    return this.currentScene.time.isPlaying;
  }

  /**
   * 設定播放速度
   */
  setPlaybackSpeed(speed) {
    if (!this.currentScene) {
      throw new Error('沒有載入場景');
    }

    this.currentScene.time.playbackSpeed = speed;

    this.eventBus.emit('backend:scene:playback:speed:changed', { speed });

    return speed;
  }
}
