/**
 * UI 層 - 屬性面板管理器
 * UI Layer - Property Panel Manager
 * 負責：單位屬性顯示與編輯
 */

export class PropertyUI {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.container = document.getElementById('property-content');
  }

  /**
   * 顯示單位屬性
   */
  showUnit(uuid) {
    // 這裡從後端服務取得單位資料
    // 暫時用事件通知後端
    // TODO: 整合後端服務

    this.container.innerHTML = `
      <div class="property-group">
        <div class="group-title">基本資訊</div>
        <div class="property-row">
          <span class="property-label">UUID</span>
          <span class="property-value">${uuid}</span>
        </div>
      </div>
    `;
  }

  /**
   * 清空屬性面板
   */
  clear() {
    this.container.innerHTML = `
      <div class="empty-state">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="#555" stroke-width="2">
          <circle cx="24" cy="24" r="8"/>
          <path d="M24 4v8m0 24v8M4 24h8m24 0h8"/>
        </svg>
        <p>未選擇單位</p>
        <p class="hint">在 3D 視圖中點擊單位以檢視屬性</p>
      </div>
    `;
  }

  /**
   * 銷毀
   */
  dispose() {
    this.clear();
  }
}
