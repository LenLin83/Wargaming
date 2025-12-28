/**
 * 兵棋沙盤推演系統 - 主程式進入點
 * Wargame Sandbox - Main Entry Point
 */

import { App } from '../frontend/core/App.js';
import { eventBus, Events } from '../frontend/core/EventBus.js';

// 後端服務（模擬三層架構）
import { ORBATService } from '../backend/services/ORBATService.js';
import { SceneService } from '../backend/services/SceneService.js';
import { SymbolService } from '../backend/services/SymbolService.js';

// 應用程式實例
let app = null;

// 後端服務實例
let orbatService = null;
let sceneService = null;
let symbolService = null;

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

    // 3. 新增範例單位
    addSampleUnits();

    // 4. 設定渲染幀事件監聽
    eventBus.on(Events.ENGINE_RENDER_TICK, ({ fps }) => {
      updateFPSDisplay(fps);
      updateUnitCountDisplay(backend.orbatService.getAllUnits().length);
    });

    // 5. 設定 UI → 後端事件處理
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

    // 6. 觸發初始化完成事件
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
  get orbatService() { return orbatService; },
  get sceneService() { return sceneService; },
  get symbolService() { return symbolService; },
  get eventBus() { return eventBus; }
};
