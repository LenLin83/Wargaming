/**
 * 前端層 - 應用程式主類
 * Frontend Layer - Main Application
 * 負責：協調三層架構、初始化、生命週期管理
 */

import { eventBus, Events } from './EventBus.js';
import { Config } from './Config.js';
import { Scene3D } from '../engine/Scene3D.js';
import { TerrainEngine } from '../engine/TerrainEngine.js';
import { UnitEngine } from '../engine/UnitEngine.js';
import { SymbolEngine } from '../engine/SymbolEngine.js';
import { TacticalEngine } from '../engine/TacticalEngine.js';
import { GUIManager } from '../engine/GUIManager.js';
import { UIManager } from '../../ui/UIManager.js';

export class App {
  constructor() {
    this.initialized = false;
    this.scene3D = null;
    this.terrainEngine = null;
    this.unitEngine = null;
    this.symbolEngine = null;
    this.tacticalEngine = null;
    this.guiManager = null;
    this.uiManager = null;
  }

  /**
   * 初始化應用程式
   */
  async initialize(canvasId = 'main-canvas') {
    if (this.initialized) {
      console.warn('應用程式已初始化');
      return;
    }

    console.log(`正在初始化 ${Config.app.name} v${Config.app.version}...`);

    try {
      // 1. 初始化 3D 場景
      this.scene3D = new Scene3D(eventBus);
      await this.scene3D.initialize(canvasId);
      console.log('✓ 3D 場景已初始化');

      // 2. 初始化地形引擎
      this.terrainEngine = new TerrainEngine(this.scene3D, eventBus);
      await this.terrainEngine.initialize();
      console.log('✓ 地形引擎已初始化');

      // 3. 初始化符號引擎
      this.symbolEngine = new SymbolEngine(eventBus);
      await this.symbolEngine.initialize();
      console.log('✓ 符號引擎已初始化');

      // 4. 初始化單位引擎
      this.unitEngine = new UnitEngine(this.scene3D, this.symbolEngine, eventBus);
      await this.unitEngine.initialize();
      console.log('✓ 單位引擎已初始化');

      // 5. 初始化戰術標繪引擎
      this.tacticalEngine = new TacticalEngine(this.scene3D, eventBus);
      await this.tacticalEngine.initialize();
      console.log('✓ 戰術標繪引擎已初始化');

      // 6. 初始化 GUI 管理器
      this.guiManager = new GUIManager(eventBus);
      await this.guiManager.initialize();
      console.log('✓ GUI 管理器已初始化');

      // 暴露 GUI 控制到全域
      window.toggleGUI = () => {
        const guiElement = document.querySelector('.dg.ac');
        if (guiElement) {
          guiElement.style.display = guiElement.style.display === 'none' ? 'block' : 'none';
        }
      };
      window.closeGUI = () => {
        const guiElement = document.querySelector('.dg.ac');
        if (guiElement) {
          guiElement.style.display = 'none';
        }
      };
      window.openGUI = () => {
        const guiElement = document.querySelector('.dg.ac');
        if (guiElement) {
          guiElement.style.display = 'block';
        }
      };
      console.log('提示: 使用 toggleGUI() 開關控制面板');

      // 7. 初始化 UI 管理器
      this.uiManager = new UIManager(eventBus);
      this.uiManager.initialize();
      console.log('✓ UI 管理器已初始化');

      // 8. 註冊引擎事件處理
      this._setupEventHandlers();

      // 9. 註冊 GUI 事件處理
      this._setupGUIHandlers();

      // 10. 啟動渲染循環
      this.scene3D.startRenderLoop();

      this.initialized = true;

      // 觸發初始化完成事件
      eventBus.emit(Events.APP_READY);
      console.log('✓ 應用程式初始化完成');

    } catch (error) {
      console.error('應用程式初始化失敗:', error);
      eventBus.emit(Events.APP_ERROR, { error });
      throw error;
    }
  }

  /**
   * 設定事件處理器
   */
  _setupEventHandlers() {
    // 後端單位新增 → 前端單位引擎
    eventBus.on(Events.BACKEND_UNIT_ADDED, ({ unit }) => {
      this.unitEngine.addUnit(unit);
    });

    // 後端單位更新 → 前端單位引擎
    eventBus.on(Events.BACKEND_UNIT_UPDATED, ({ uuid, updates }) => {
      this.unitEngine.updateUnit(uuid, updates);
    });

    // 後端單位移除 → 前端單位引擎
    eventBus.on(Events.BACKEND_UNIT_REMOVED, ({ uuid }) => {
      this.unitEngine.removeUnit(uuid);
    });

    // UI 單位選中 → 前端單位引擎高亮
    eventBus.on(Events.UI_UNIT_SELECTED, ({ uuid }) => {
      this.unitEngine.selectUnit(uuid);
    });

    // UI 單位取消選中 → 前端單位引擎取消高亮
    eventBus.on(Events.UI_UNIT_DESELECTED, () => {
      this.unitEngine.deselectUnit();
    });
  }

  /**
   * 設定 GUI 事件處理器
   */
  _setupGUIHandlers() {
    // 符號高度
    eventBus.on('gui:symbol:height', ({ height }) => {
      this.unitEngine.updateSymbolHeight(height);
    });

    // 連接線顯示
    eventBus.on('gui:connection:show', ({ show }) => {
      this.unitEngine.updateConnectionLines(show);
    });

    // 連接線透明度
    eventBus.on('gui:connection:opacity', ({ opacity }) => {
      this.unitEngine.updateLineOpacity(opacity);
    });

    // 模型大小
    eventBus.on('gui:model:size', ({ size }) => {
      this.unitEngine.updateModelSize(size);
    });

    // 符號顯示
    eventBus.on('gui:symbol:toggle', ({ show }) => {
      this.unitEngine.toggleSymbols(show);
    });

    // 模型顯示
    eventBus.on('gui:model:toggle', ({ show }) => {
      this.unitEngine.toggleModels(show);
    });

    // 標籤顯示
    eventBus.on('gui:label:toggle', ({ show }) => {
      this.unitEngine.toggleLabels(show);
    });

    // 網格顯示
    eventBus.on('gui:grid:toggle', ({ show }) => {
      this.scene3D.toggleGrid(show);
    });

    // 霧氣顯示
    eventBus.on('gui:fog:toggle', ({ show }) => {
      this.scene3D.toggleFog(show);
    });

    // 相機距離
    eventBus.on('gui:camera:distance', ({ distance }) => {
      this.scene3D.setCameraDistance(distance);
    });
  }

  /**
   * 取得場景
   */
  getScene() {
    return this.scene3D?.scene;
  }

  /**
   * 取得攝影機
   */
  getCamera() {
    return this.scene3D?.camera;
  }

  /**
   * 取得渲染器
   */
  getRenderer() {
    return this.scene3D?.renderer;
  }

  /**
   * 調整大小
   */
  resize(width, height) {
    if (this.scene3D) {
      this.scene3D.resize(width, height);
    }
  }

  /**
   * 銷毀應用程式
   */
  dispose() {
    if (this.tacticalEngine) this.tacticalEngine.dispose();
    if (this.unitEngine) this.unitEngine.dispose();
    if (this.symbolEngine) this.symbolEngine.dispose();
    if (this.terrainEngine) this.terrainEngine.dispose();
    if (this.scene3D) this.scene3D.dispose();
    if (this.guiManager) this.guiManager.dispose();
    if (this.uiManager) this.uiManager.dispose();

    eventBus.clear();
    this.initialized = false;

    console.log('應用程式已銷毀');
  }

  /**
   * 取得統計資訊
   */
  getStats() {
    return {
      units: this.unitEngine ? this.unitEngine.getUnitCount() : 0,
      graphics: this.tacticalEngine ? this.tacticalEngine.getGraphicCount() : 0,
      fps: this.scene3D ? this.scene3D.getFPS() : 0
    };
  }
}
