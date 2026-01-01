/**
 * 兵棋沙盤推演系統 - 主程式進入點
 * Wargame Sandbox - Main Entry Point
 */

import { App } from '../frontend/core/App.js';
import { eventBus, Events } from '../frontend/core/EventBus.js';
import * as THREE from 'three';

// 後端服務（模擬三層架構）
import { ORBATService } from '../backend/services/ORBATService.js';
import { SceneService } from '../backend/services/SceneService.js';
import { SymbolService } from '../backend/services/SymbolService.js';

// Frontend 引擎
import { InteractionManager } from '../frontend/engine/InteractionManager.js';
import { MovePathEngine } from '../frontend/engine/MovePathEngine.js';

// UI 管理器
import { UIManager } from '../ui/UIManager.js';
import { MovePathUI } from '../ui/managers/MovePathUI.js';

// 應用程式實例
let app = null;

// Frontend 引擎實例
let interactionManager = null;

// UI 管理器實例
let uiManager = null;

// 後端服務實例
let orbatService = null;
let sceneService = null;
let symbolService = null;

// Frontend 引擎實例
let movePathEngine = null;

// UI 管理器實例
let movePathUI = null;

/**
 * 初始化後端服務
 */
function initBackendServices() {
  console.log('初始化後端服務...');

  orbatService = new ORBATService(eventBus);
  sceneService = new SceneService(eventBus);
  symbolService = new SymbolService(eventBus);

  // 建立預設場景
  const scene = sceneService.createScene({
    name: '預設場景',
    description: '新建立的沙盤推演場景'
  });

  console.log('✓ 後端服務已初始化');

  return { orbatService, sceneService, symbolService };
}

/**
 * 新增範例單位
 */
function addSampleUnits() {
  const sampleUnits = [
    {
      name: '第1戰車營',
      sidc: 'SFGPUCA----D',
      level: 'battalion',
      x: 0, y: 0, z: 0
    },
    {
      name: '第1連',
      sidc: 'SFGPUCA----C',
      level: 'company',
      x: -30, y: 0, z: 20
    },
    {
      name: '第2連',
      sidc: 'SFGPUCA----C',
      level: 'company',
      x: 30, y: 0, z: 20
    },
    {
      name: '敵方裝甲排',
      sidc: 'SHGPUCA----B',
      level: 'platoon',
      x: 100, y: 0, z: 50
    }
  ];

  for (const unitData of sampleUnits) {
    const unit = orbatService.addUnit(unitData);
    sceneService.addUnitToScene(unit);
  }

  console.log(`✓ 已新增 ${sampleUnits.length} 個範例單位`);
}

/**
 * 載入已儲存的組織到 ORBAT 樹
 */
function loadSavedOrganizations() {
  try {
    const stored = localStorage.getItem('wargame-organizations');
    if (!stored) {
      console.log('沒有已儲存的組織');
      return;
    }

    const organizations = JSON.parse(stored);
    if (!Array.isArray(organizations) || organizations.length === 0) {
      console.log('沒有已儲存的組織');
      return;
    }

    console.log(`找到 ${organizations.length} 個已儲存的組織`);

    // 觸發事件載入每個組織到 ORBAT 樹
    for (const org of organizations) {
      eventBus.emit('organization:loaded', { organization: org });
    }

    console.log(`✓ 已載入 ${organizations.length} 個組織到 ORBAT 樹`);
  } catch (error) {
    console.error('載入已儲存組織時發生錯誤:', error);
  }
}

/**
 * 錯誤處理
 */
function showErrorMessage(message) {
  const overlay = document.createElement('div');
  overlay.className = 'error-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
  `;

  overlay.innerHTML = `
    <div class="error-content" style="
      text-align: center;
      color: #e74c3c;
    ">
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 8v4m0 4h.01"/>
      </svg>
      <h2 style="margin: 16px 0 8px;">系統錯誤</h2>
      <p style="color: #aaa;">${message}</p>
      <button onclick="location.reload()" style="
        margin-top: 24px;
        padding: 10px 24px;
        background: #e74c3c;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
      ">重新整理</button>
    </div>
  `;

  document.body.appendChild(overlay);
}

/**
 * 更新 FPS 顯示
 */
function updateFPSDisplay(fps) {
  const fpsEl = document.getElementById('fps-counter');
  if (fpsEl) {
    fpsEl.textContent = fps;
  }
}

/**
 * 更新單位數量顯示
 */
function updateUnitCountDisplay(count) {
  const countEl = document.getElementById('unit-count');
  if (countEl) {
    countEl.textContent = count;
  }
}

/**
 * 設定標籤頁切換
 */
function setupTabs() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.dataset.tab;

      // 更新按鈕狀態
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // 更新內容顯示
      tabContents.forEach(content => {
        content.classList.remove('active');
        if (content.id === `tab-${tabName}`) {
          content.classList.add('active');
        }
      });

      // 觸發標籤切換事件
      if (tabName === 'symbol-editor') {
        eventBus.emit('tab:changed', { tab: 'symbol-editor' });
      } else if (tabName === 'sandbox') {
        eventBus.emit('tab:changed', { tab: 'sandbox' });
      }
    });
  });
}

/**
 * 連接 MovePathEngine 和 MovePathUI 的事件
 */
function _connectMovePathEvents(orbatService) {
  // ========== UI → Engine 事件 ==========

  // 加載路徑
  eventBus.on('ui:load-move-path', ({ uuid, path, readOnly }) => {
    movePathEngine.setPath(uuid, path);
    movePathEngine.setDisplayMode(readOnly || false);
  });

  // 隱藏路徑
  eventBus.on('ui:hide-move-path', () => {
    movePathEngine.dispose();
  });

  // 添加路徑點（UI 發送，需要 Raycast）
  eventBus.on('ui:add-path-waypoint-at', ({ mouse }) => {
    const point = interactionManager.raycastToTerrain(mouse);
    if (point) {
      movePathEngine.addWaypoint(point);
    }
  });

  // 清除路徑
  eventBus.on('ui:clear-move-path', () => {
    movePathEngine.clearPath();
  });

  // 播放路徑
  eventBus.on('ui:play-move-path', () => {
    movePathEngine.play();
  });

  // 停止播放動畫
  eventBus.on('ui:stop-path-playback', () => {
    movePathEngine.stop();
  });

  // 退出編輯模式
  eventBus.on('ui:exit-path-edit-mode', () => {
    movePathEngine.dispose();
  });

  // 將單位移回原始位置
  eventBus.on('ui:return-unit-to-position', ({ position }) => {
    movePathEngine.moveUnitToPosition(position);
  });

  // ========== Engine → UI 事件 ==========

  // 路徑模式激活
  eventBus.on('engine:path-mode-active', (data) => {
    eventBus.emit('ui:move-path-mode-active', data);
  });

  // 路徑模式非激活
  eventBus.on('engine:path-mode-inactive', () => {
    eventBus.emit('ui:move-path-mode-inactive');
  });

  // ========== UI → Backend → Engine 事件 ==========

  // 進入移動路徑編輯模式
  eventBus.on('ui:enter-move-path-mode', ({ uuid }) => {
    const unit = orbatService.getUnit(uuid);
    if (unit) {
      // 先停止正在播放的動畫（如果有），這會將單位移回路徑起始點
      movePathEngine.stop();

      // 從 3D 場景獲取單位的實際位置
      const unitEntity = app.unitEngine.getUnit(uuid);
      let actualPosition;

      if (unitEntity && unitEntity.group) {
        // 使用 3D 場景中的實際位置
        actualPosition = unitEntity.group.position.clone();
        console.log('[main] 使用 3D 場景位置:', actualPosition);
      } else {
        // 回退到後端資料中的位置
        actualPosition = new THREE.Vector3(
          unit.x || 0,
          unit.y || 0,
          unit.z || 0
        );
        console.log('[main] 使用後端資料位置:', actualPosition);
      }

      // 記錄原始位置（用於退出編輯模式時還原）
      movePathUI.originalPosition = actualPosition.clone();

      // 準備路徑資料，確保第一點在單位實際位置
      let path = unit.movePath || [];
      if (path.length === 0) {
        // 沒有現有路徑，創建初始點在單位實際位置
        path = [{
          x: actualPosition.x,
          y: actualPosition.y,
          z: actualPosition.z
        }];
        console.log('[main] 創建初始路徑點:', path[0]);
      } else {
        // 有現有路徑，確保第一點更新到當前位置
        path[0] = {
          x: actualPosition.x,
          y: actualPosition.y,
          z: actualPosition.z
        };
        console.log('[main] 更新路徑第一點:', path[0]);
      }

      // 將單位資料和路徑傳遞給 UI
      movePathUI.activate({ ...unit, movePath: path });
    }
  });

  // 退出移動路徑編輯模式
  eventBus.on('ui:exit-move-path-mode', () => {
    movePathUI.deactivate();
  });

  // 保存移動路徑（退出編輯模式時）
  eventBus.on('ui:save-move-path-request', ({ uuid, originalPosition }) => {
    const path = movePathEngine.getPath();
    if (path && path.length >= 1) {
      // 保存到後端（只有 1 個點時存為空陣列）
      const pathToSave = path.length === 1 ? [] : path;
      orbatService.updateUnit(uuid, { movePath: pathToSave });
      console.log(`[main] 保存移動路徑: ${uuid} → ${path.length} 個路徑點`);

      // 顯示灰色路徑（使用初始位置）
      let unit = orbatService.getUnit(uuid);
      if (unit) {
        // 使用初始位置（進入編輯模式前的位置）
        if (originalPosition) {
          unit = {
            ...unit,
            x: originalPosition.x,
            y: originalPosition.y,
            z: originalPosition.z,
            movePath: pathToSave
          };
        } else {
          // 如果沒有初始位置，從 3D 場景獲取
          const unitEntity = app.unitEngine.getUnit(uuid);
          if (unitEntity && unitEntity.group) {
            unit = {
              ...unit,
              x: unitEntity.group.position.x,
              y: unitEntity.group.position.y,
              z: unitEntity.group.position.z,
              movePath: pathToSave
            };
          }
        }
        movePathUI.showPath(unit);
      }

      // 注意：單位移動已在 stop() 中處理（移回路徑起始點）
    }
  });

  // 播放移動路徑
  eventBus.on('ui:play-move-path', ({ uuid }) => {
    movePathEngine.play();
  });

  // 移除路徑點
  eventBus.on('ui:remove-path-waypoint', ({ uuid, index }) => {
    movePathEngine.removeWaypoint(index);
  });

  // 保存移動路徑到單位
  eventBus.on('ui:save-move-path', ({ uuid, path }) => {
    orbatService.updateUnit(uuid, { movePath: path });
    console.log(`保存移動路徑: ${uuid} → ${path.length} 個路徑點`);
  });

  console.log('✓ 移動路徑事件已連接');
}

/**
 * DOM 載入完成後初始化
 */
document.addEventListener('DOMContentLoaded', async () => {
  // 設定標籤頁切換
  setupTabs();

  try {
    console.log('========================================');
    console.log('兵棋沙盤推演系統啟動中...');
    console.log('========================================');

    // 1. 初始化後端服務
    const backend = initBackendServices();

    // 2. 初始化應用程式
    app = new App();
    await app.initialize('main-canvas');

    // 2.5 初始化交互管理器
    interactionManager = new InteractionManager(app.scene3D, app.terrainEngine);
    await interactionManager.initialize();
    console.log('✓ 交互管理器已初始化');

    // 2.6 初始化 UI 管理器
    uiManager = new UIManager(eventBus);
    uiManager.initialize();
    console.log('✓ UI 管理器已初始化');

    // 2.7 初始化移動路徑引擎和 UI
    movePathEngine = new MovePathEngine(app.scene3D, app.unitEngine);
    movePathUI = new MovePathUI(eventBus);
    console.log('✓ 移動路徑引擎和 UI 已初始化');

    // 2.8 連接 MovePathEngine 和 MovePathUI 的事件
    _connectMovePathEvents(backend.orbatService);

    // 2.9 將 movePathUI 傳遞給 UIManager
    if (uiManager) {
      uiManager.setMovePathUI(movePathUI);
      console.log('✓ 移動路徑 UI 已連接到 UI 管理器');
    }

    // 3. 載入已儲存的組織到 ORBAT 樹
    loadSavedOrganizations();

    // 4. 新增範例單位（已停用 - 只使用組織編輯器的資料）
    // addSampleUnits();

    // 5. 設定渲染幀事件監聽
    eventBus.on(Events.ENGINE_RENDER_TICK, ({ fps }) => {
      updateFPSDisplay(fps);
      updateUnitCountDisplay(backend.orbatService.getAllUnits().length);
    });

    // 6. 設定 UI → 後端事件處理
    eventBus.on('ui:add-orbat-unit', (unitData) => {
      backend.orbatService.addUnit(unitData);
      // 同步到 3D 場景
      const unit = backend.orbatService.getUnit(unitData.uuid || backend.orbatService.getAllUnits().slice(-1)[0]?.uuid);
      if (unit) {
        backend.sceneService.addUnitToScene(unit);
      }
    });

    eventBus.on('ui:get-orbat-units', ({ callback }) => {
      const units = backend.orbatService.getAllUnits();
      if (callback) callback(units);
    });

    // 移動單位（改變父節點）
    eventBus.on('ui:move-unit', ({ uuid, newParentId }) => {
      backend.orbatService.moveUnit(uuid, newParentId);
    });

    // 更新單位
    eventBus.on('ui:update-unit', ({ uuid, updates }) => {
      backend.orbatService.updateUnit(uuid, updates);
    });

    // 刪除單位
    eventBus.on('ui:delete-unit', ({ uuid }) => {
      backend.orbatService.removeUnit(uuid);
      // 從 3D 場景移除
      eventBus.emit(Events.BACKEND_UNIT_REMOVED, { uuid });
    });

    // 重建 ORBAT 樹
    eventBus.on('ui:rebuild-orbat-tree', () => {
      const units = backend.orbatService.getAllUnits();
      // 清空現有樹
      document.getElementById('orbat-tree').innerHTML = '';
      // 重新加入所有單位
      units.forEach(unit => {
        eventBus.emit('backend:unit:added', { unit });
      });
    });

    // 組織儲存事件 - 將組織載入到 ORBAT
    eventBus.on('organization:saved', ({ organization }) => {
      // 清空現有 ORBAT
      backend.orbatService.clear();

      // 遞歸新增組織中的單位
      const addUnitsToORBAT = (units, parentId = null) => {
        units.forEach(unitData => {
          const unit = backend.orbatService.addUnit({
            sidc: unitData.sidc,
            name: unitData.name,
            level: unitData.level || 'company',
            designation: unitData.designation || '',
            higherFormation: unitData.higherFormation || '',
            parentId: parentId,
            x: 0,
            y: 0,
            z: 0
          });

          // 同步到 3D 場景
          backend.sceneService.addUnitToScene(unit);

          // 遞歸處理子單位
          if (unitData.children && unitData.children.length > 0) {
            addUnitsToORBAT(unitData.children, unit.uuid);
          }
        });
      };

      addUnitsToORBAT(organization.units);

      // 切換到沙盤標籤頁
      const sandboxTab = document.querySelector('.tab-btn[data-tab="sandbox"]');
      if (sandboxTab) {
        sandboxTab.click();
      }
    });

    // 處理單位部署事件（從 ORBAT 樹點擊部署）
    eventBus.on('ui:deploy-unit', ({ unit, mouse }) => {
      const point = interactionManager.raycastToTerrain(mouse);
      if (!point) return;

      // 新增單位到後端
      const deployedUnit = backend.orbatService.addUnit({
        sidc: unit.sidc,
        name: unit.name,
        level: unit.level,
        designation: unit.designation || '',
        higherFormation: unit.higherFormation || '',
        x: point.x,
        y: point.y,
        z: point.z
      });

      // 加入 3D 場景
      backend.sceneService.addUnitToScene(deployedUnit);

      console.log(`部署單位: ${unit.name} at (${point.x.toFixed(1)}, ${point.y.toFixed(1)}, ${point.z.toFixed(1)})`);
    });

    // 處理移動單位到新位置
    eventBus.on('ui:move-unit-to-position', ({ uuid, mouse }) => {
      const point = interactionManager.raycastToTerrain(mouse);
      if (!point) return;

      // 更新後端單位位置
      backend.orbatService.updateUnit(uuid, {
        x: point.x,
        y: point.y,
        z: point.z
      });

      // 更新 3D 場景中的單位位置
      app.unitEngine.moveUnitToPosition(uuid, point);

      // 觸發單位更新事件，讓 PropertyUI 更新位置顯示
      eventBus.emit('backend:unit:updated', {
        uuid,
        updates: { x: point.x, y: point.y, z: point.z }
      });

      console.log(`移動單位: ${uuid} → (${point.x.toFixed(1)}, ${point.y.toFixed(1)}, ${point.z.toFixed(1)})`);
    });

    // 處理獲取單位資料請求
    eventBus.on('ui:get-unit-data', ({ uuid, callback }) => {
      const unit = backend.orbatService.getUnit(uuid);
      if (callback) callback(unit);
    });

    // 處理火力更新事件
    eventBus.on('ui:update-firepower', ({ uuid, fireRange, directionStart, directionEnd }) => {
      // 更新後端單位火力資料
      backend.orbatService.updateUnit(uuid, {
        fireRange,
        directionStart,
        directionEnd
      });

      // 更新 3D 場景中的單位火力視覺化
      const entity = app.unitEngine.getUnit(uuid);
      if (entity) {
        entity.updateFirepower({
          range: fireRange,
          directionStart: directionStart,
          directionEnd: directionEnd
        });
      }

      console.log(`更新單位火力: ${uuid} → 範圍:${fireRange}m, 射界:${directionStart}°~${directionEnd}°`);
    });

    // ========== 額外移動路徑事件處理 ==========

    // 顯示/隱藏移動路徑（由 PropertyUI 觸發）
    eventBus.on('ui:show-move-path', ({ unitData }) => {
      // 從 3D 場景獲取單位的實際位置
      const unitEntity = app.unitEngine.getUnit(unitData.uuid);
      if (unitEntity && unitEntity.group) {
        // 使用 3D 場景中的實際位置更新單位資料
        unitData = {
          ...unitData,
          x: unitEntity.group.position.x,
          y: unitEntity.group.position.y,
          z: unitEntity.group.position.z
        };
        console.log('[main] 只讀路徑：使用 3D 場景位置', unitData);
      }
      movePathUI.showPath(unitData);
    });

    eventBus.on('ui:hide-move-path', () => {
      movePathEngine.dispose();
    });

    // 7. 觸發初始化完成事件
    eventBus.emit(Events.APP_READY);

    console.log('========================================');
    console.log('系統初始化完成！');
    console.log('========================================');

  } catch (error) {
    console.error('系統初始化失敗:', error);
    showErrorMessage(error.message || '發生未知錯誤');
  }
});

/**
 * 匯出應用程式實例供除錯使用
 */
window.__WARGAME_APP__ = {
  app,
  get interactionManager() { return interactionManager; },
  get uiManager() { return uiManager; },
  get orbatService() { return orbatService; },
  get sceneService() { return sceneService; },
  get symbolService() { return symbolService; },
  get movePathEngine() { return movePathEngine; },
  get movePathUI() { return movePathUI; },
  get eventBus() { return eventBus; }
};
