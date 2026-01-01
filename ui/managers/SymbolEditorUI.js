/**
 * UI 層 - 符號編輯器 UI (雙面板版)
 * UI Layer - Symbol Editor UI
 * 負責：符號編輯面板、組織編輯面板
 */

import {
  IdentityOptions,
  LevelOptions,
  DimensionOptions,
  BranchTypeOptions,
  CommandTypeOptions,
  StatusModifierOptions,
  CommandIndicatorOptions
} from '../../frontend/engine/SymbolEditor.js';

/**
 * 戰鬥維度對應的兵種選項
 * 對應 test.html 的 functionMaps
 */
const DimensionFunctionMaps = {
  "G": [ // 地面部隊
    { value: "UCI----", text: "步兵 (Infantry)" },
    { value: "UCIM---", text: "機械化步兵 (Mech Infantry)" },
    { value: "UCA----", text: "裝甲/戰車 (Armor)" },
    { value: "UCV----", text: "陸軍航空 (Aviation)" },
    { value: "UCF----", text: "砲兵 (Artillery)" },
    { value: "UCE----", text: "工兵 (Engineer)" },
    { value: "UCR----", text: "偵察 (Recon)" },
    { value: "UU-----", text: "戰鬥支援 (Combat Support)" }
  ],
  "A": [ // 空中部隊
    { value: "MF-----", text: "定翼機 (Fixed Wing)" },
    { value: "MH-----", text: "旋翼機 (Rotary Wing)" },
    { value: "MQ-----", text: "無人機 (Drone/UAV)" },
    { value: "MA-----", text: "攻擊機 (Attack)" },
    { value: "MB-----", text: "轟炸機 (Bomber)" },
    { value: "MFQ----", text: "戰鬥機 (Fighter)" }
  ],
  "S": [ // 海上水面部隊
    { value: "NS-----", text: "水面作戰艦 (Surface Combatant)" },
    { value: "NA-----", text: "兩棲作戰艦 (Amphibious)" },
    { value: "NM-----", text: "水雷戰艦艇 (Mine Warfare)" },
    { value: "NF-----", text: "巡防艦 (Frigate)" },
    { value: "NB-----", text: "戰列艦 (Battleship)" }
  ],
  "U": [ // 水下部隊 (Subsurface)
    { value: "S------", text: "潛艦 (Submarine)" },
    { value: "SN-----", text: "核動力潛艦 (Nuclear)" },
    { value: "SD-----", text: "柴電潛艦 (Diesel)" }
  ]
};

/**
 * 層級選項 (已修正為符合 NATO APP-6/MIL-STD-2525 標準)
 * SIDC Position 12 (Symbol Modifier 2)
 * -: Null
 * A: Team/Crew (伍/組)
 * B: Squad (班)
 * C: Section (組/班)
 * D: Platoon (排)
 * E: Company (連)
 * F: Battalion (營)
 * G: Regiment (團)
 * H: Brigade (旅)
 * I: Division (師)
 * J: Corps (軍)
 * K: Army (軍團/方面軍)
 */
const TestEchelonOptions = [
  { value: "-", text: "- 無 -", echelonName: "", levelName: "" },
  { value: "A", text: "伍/組 (Team)", echelonName: "team", levelName: "team" },
  { value: "B", text: "班 (Squad)", echelonName: "squad", levelName: "squad" },
  { value: "C", text: "分排/組 (Section)", echelonName: "section", levelName: "section" },
  { value: "D", text: "排 (Platoon)", echelonName: "platoon", levelName: "platoon" },
  { value: "E", text: "連 (Company)", echelonName: "company", levelName: "company" },
  { value: "F", text: "營 (Battalion)", echelonName: "battalion", levelName: "battalion" },
  { value: "G", text: "團 (Regiment)", echelonName: "regiment", levelName: "regiment" },
  { value: "H", text: "旅 (Brigade)", echelonName: "brigade", levelName: "brigade" },
  { value: "I", text: "師 (Division)", echelonName: "division", levelName: "division" },
  { value: "J", text: "軍 (Corps)", echelonName: "corps", levelName: "corps" },
  { value: "K", text: "軍團 (Army)", echelonName: "army", levelName: "army" }
];

export class SymbolEditorUI {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.container = null;
    this.previewCanvas = null;
    this.previewCtx = null;
    this.sidcCodeElement = null;

    // 當前選擇的值 (對應 test.html)
    this.currentValues = {
      affiliation: 'F',  // 友軍
      dimension: 'G',    // 地面部隊
      functionId: 'UCI----',  // 步兵
      echelon: 'F',      // 預設為營 (Battalion)
      designation: '',   // 部隊番號
      higherFormation: '', // 上級單位
      status: ''         // 狀態 (空=現行, '1'=計畫中)
    };

    // 當前面板
    this.currentPanel = 'symbol'; // 'symbol' or 'organization'

    // 組織資料
    this.organization = {
      id: 'org-' + Date.now(),
      name: '新建組織',
      units: []
    };

    // 儲存的組織列表
    this.savedOrganizations = [];

    // 符號庫 (可拖曳使用的符號集合)
    this.symbolLibrary = [];

    // 組織樹縮放與平移
    this.orgTreeScale = 1;
    this.orgTreeMinScale = 0.3;
    this.orgTreeMaxScale = 2;
    this.orgTreeTranslateX = 0;
    this.orgTreeTranslateY = 0;
    this.isDraggingOrgTree = false;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.dragStartTranslateX = 0;
    this.dragStartTranslateY = 0;

    this._setupEventListeners();
  }

  /**
   * 初始化
   */
  initialize() {
    this.container = document.getElementById('symbol-editor-controls');
    this.internalSidcCodeElement = null;

    if (!this.container) {
      console.warn('找不到符號編輯器容器');
      return;
    }

    // 載入已儲存的組織
    this._loadSavedOrganizations();

    // 載入符號庫
    this._loadSymbolLibrary();

    // 創建 UI
    this._createUI();
    this._updatePreview();
  }

  /**
   * 創建 UI (對應 test.html 的結構)
   */
  _createUI() {
    this.container.innerHTML = `
      <div class="symbol-editor-layout">
        <!-- 左側菜單 -->
        <nav class="editor-sidebar">
          <div class="sidebar-menu">
            <button class="menu-item active" data-panel="symbol">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 2c-1.1 0-2 .9-2 2v2H6c-.55 0-1 .45-1 1v6c0 .55.45 1 1 1h8c.55 0 1-.45 1-1V7c0-.55-.45-1-1-1h-2V4c0-1.1-.9-2-2-2zm0 1c.55 0 1 .45 1 1v2H9V4c0-.55.45-1 1-1zM6 7h8v6H6V7z"/>
              </svg>
              <span>符號編輯</span>
            </button>
            <button class="menu-item" data-panel="organization">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path d="M3 3h14v2H3V3zm0 4h14v2H3V7zm0 4h14v2H3v-2zm0 4h10v2H3v-2z"/>
              </svg>
              <span>組織編輯</span>
            </button>
          </div>

          <div class="sidebar-footer">
            <button class="footer-btn" id="refresh-org-btn" title="重新載入組織">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 2A6 6 0 1 0 14 8h-2A4 4 0 1 1 8 4v4l4-4-4-4v2z"/>
              </svg>
            </button>
          </div>
        </nav>

        <!-- 右側內容區 -->
        <div class="editor-content-area">
          <!-- 符號編輯面板 (對應 test.html 結構) -->
          <div class="editor-panel" id="panel-symbol">
            <!-- 預覽區域 -->
            <div class="symbol-preview-section">
              <div class="preview-container" id="internal-preview-container">
                <!-- SVG 將在此處動態生成 -->
              </div>
              <div class="preview-sidc">
                <div class="preview-sidc-label">SIDC</div>
                <div class="preview-sidc-code" id="internal-sidc-code">--</div>
              </div>
            </div>

            <div class="panel-scroll">
              <!-- 陣營 (Affiliation) -->
              <div class="editor-section">
                <div class="section-title">陣營 (Affiliation)</div>
                <select id="affiliation-select" class="editor-select">
                  <option value="F" ${this.currentValues.affiliation === 'F' ? 'selected' : ''}>友軍 (Friend)</option>
                  <option value="H" ${this.currentValues.affiliation === 'H' ? 'selected' : ''}>敵軍 (Hostile)</option>
                  <option value="N" ${this.currentValues.affiliation === 'N' ? 'selected' : ''}>中立 (Neutral)</option>
                  <option value="U" ${this.currentValues.affiliation === 'U' ? 'selected' : ''}>未知 (Unknown)</option>
                </select>
              </div>

              <!-- 戰鬥維度 (Battle Dimension) -->
              <div class="editor-section">
                <div class="section-title">戰鬥維度 (Battle Dimension)</div>
                <select id="dimension-select" class="editor-select">
                  <option value="G" ${this.currentValues.dimension === 'G' ? 'selected' : ''}>地面部隊 (Ground)</option>
                  <option value="A" ${this.currentValues.dimension === 'A' ? 'selected' : ''}>空中部隊 (Air)</option>
                  <option value="S" ${this.currentValues.dimension === 'S' ? 'selected' : ''}>海上部隊 (Sea)</option>
                  <option value="U" ${this.currentValues.dimension === 'U' ? 'selected' : ''}>水下部隊 (Subsurface)</option>
                </select>
              </div>

              <!-- 兵種/功能 (Function) - 根據戰鬥維度動態變化 -->
              <div class="editor-section">
                <div class="section-title">兵種/功能 (Function)</div>
                <select id="function-select" class="editor-select">
                  <!-- 由 JavaScript 動態生成 -->
                </select>
              </div>

              <!-- 層級 (Echelon) -->
              <div class="editor-section">
                <div class="section-title">層級 (Echelon)</div>
                <select id="echelon-select" class="editor-select">
                  ${TestEchelonOptions.map(opt => `
                    <option value="${opt.value}" ${this.currentValues.echelon === opt.value ? 'selected' : ''}>
                      ${opt.text}
                    </option>
                  `).join('')}
                </select>
              </div>

              <!-- 部隊番號 (Unique Designation) -->
              <div class="editor-section">
                <div class="section-title">部隊番號 (Unique Designation)</div>
                <input type="text" id="designation-input" class="editor-input"
                       value="${this.currentValues.designation}"
                       placeholder="例如: 101, A, 1st">
              </div>

              <!-- 上級單位 (Higher Formation) -->
              <div class="editor-section">
                <div class="section-title">上級單位 (Higher Formation)</div>
                <input type="text" id="higher-formation-input" class="editor-input"
                       value="${this.currentValues.higherFormation}"
                       placeholder="例如: 601旅">
              </div>

              <!-- 狀態 (Status) -->
              <div class="editor-section">
                <div class="section-title">狀態 (Status)</div>
                <select id="status-select" class="editor-select">
                  <option value="" ${this.currentValues.status === '' ? 'selected' : ''}>現行 (Present)</option>
                  <option value="1" ${this.currentValues.status === '1' ? 'selected' : ''}>計畫中 (Anticipated)</option>
                </select>
              </div>

              <!-- 操作按鈕 -->
              <div class="editor-actions">
                <button class="action-btn secondary" id="apply-btn">應用到選中單位</button>
                <button class="action-btn primary" id="copy-sidc-btn">複製 SIDC</button>
                <button class="action-btn primary" id="copy-svg-btn">複製 SVG</button>
                <button class="action-btn success" id="add-to-org-btn">新增到當前組織</button>
                <button class="action-btn primary" id="add-to-library-btn">加入符號庫</button>
              </div>
            </div>
          </div>

          <!-- 組織編輯面板 (直式布局，右側邊欄) -->
          <div class="editor-panel org-editor-layout-vertical" id="panel-organization" style="display: none;">
            <!-- 左側主區域：組織樹編輯區 -->
            <div class="org-tree-main">
              <div class="org-tree-header">
                <h3 id="current-org-name">新建組織</h3>
                <div class="header-actions">
                  <button class="icon-btn" id="save-org-btn" title="儲存組織">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M8 1l-5 3v4c0 3.5 2.2 6.7 5 7.5 2.8-.8 5-4 5-7.5V4l-5-3z"/>
                    </svg>
                  </button>
                  <button class="icon-btn danger" id="delete-org-btn" title="刪除組織">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M5 3h6v1H5V3zm-1 2h8v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5z"/>
                    </svg>
                  </button>
                </div>
              </div>

              <!-- 組織名稱編輯 -->
              <div class="org-name-edit">
                <input type="text" id="org-name-input" class="org-name-input" value="${this.organization.name}" placeholder="組織名稱">
              </div>

              <!-- 組織樹編輯區 -->
              <div class="org-tree-area">
                <div class="org-tree-drop-zone" id="org-tree-drop-zone">
                  <div class="org-tree" id="org-tree">
                    <!-- 動態生成組織樹 -->
                  </div>
                </div>
              </div>
            </div>

            <!-- 符號來源區 -->
            <div class="sidebar-section">
              <div class="section-title">
                符號來源
                <button class="icon-btn-small" id="clear-library-btn" title="清空符號庫">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                    <path d="M4 4l6 6M10 4l-6 6" stroke="currentColor" stroke-width="1.5"></path>
                  </svg>
                </button>
              </div>
              <div class="symbol-library-container" id="symbol-library">
                <!-- 動態生成符號庫 -->
              </div>
              <div class="sidebar-hint">從符號編輯器新增符號，然後拖曳到左側組織樹中</div>
            </div>

            <!-- 組織列表區 -->
            <div class="sidebar-section org-list-section-compact">
              <div class="section-title">
                已儲存的組織
                <button class="icon-btn-small" id="create-org-btn" title="新建組織">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                    <path d="M7 2v10M2 7h10" stroke="currentColor" stroke-width="2"/>
                  </svg>
                </button>
              </div>
              <div class="org-list-compact" id="org-list">
                <!-- 動態生成 -->
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // 綁定事件
    this._bindUIEvents();

    // 獲取內部預覽元素引用
    this.internalSidcCodeElement = document.getElementById('internal-sidc-code');

    // 初始化兵種選單 (根據當前戰鬥維度)
    this._updateFunctionOptions();

    // 渲染組織列表
    this._renderOrgList();

    // 渲染當前組織樹
    this._renderOrgTree();

    // 初始化源預覽
    this._initSourcePreview();

    // 確保更新預覽
    setTimeout(() => this._updatePreview(), 100);
  }

  /**
   * 綁定 UI 事件
   */
  _bindUIEvents() {
    // 側邊欄菜單切換
    const menuItems = this.container.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
      item.addEventListener('click', () => {
        const panel = item.dataset.panel;
        this._switchPanel(panel);
      });
    });

    // 重新載入按鈕
    document.getElementById('refresh-org-btn')?.addEventListener('click', () => {
      this._loadSavedOrganizations();
      this._renderOrgList();
    });

    // 符號編輯面板事件
    this._bindSymbolEditorEvents();

    // 組織編輯面板事件
    this._bindOrgEditorEvents();
  }

  /**
   * 綁定符號編輯器事件
   */
  _bindSymbolEditorEvents() {
    // 陣營選擇
    const affiliationSelect = document.getElementById('affiliation-select');
    affiliationSelect?.addEventListener('change', (e) => {
      this.currentValues.affiliation = e.target.value;
      this._updatePreview();
      this._updateSourcePreview();
    });

    // 戰鬥維度選擇 (觸發動態兵種選單更新)
    const dimensionSelect = document.getElementById('dimension-select');
    dimensionSelect?.addEventListener('change', (e) => {
      this.currentValues.dimension = e.target.value;
      this._updateFunctionOptions();  // 更新兵種選單
      this._updatePreview();
      this._updateSourcePreview();
    });

    // 兵種/功能選擇
    const functionSelect = document.getElementById('function-select');
    functionSelect?.addEventListener('change', (e) => {
      this.currentValues.functionId = e.target.value;
      this._updatePreview();
      this._updateSourcePreview();
    });

    // 層級選擇
    const echelonSelect = document.getElementById('echelon-select');
    echelonSelect?.addEventListener('change', (e) => {
      this.currentValues.echelon = e.target.value;
      this._updatePreview();
      this._updateSourcePreview();
    });

    // 部隊番號輸入
    const designationInput = document.getElementById('designation-input');
    designationInput?.addEventListener('input', (e) => {
      this.currentValues.designation = e.target.value;
      this._updatePreview();
      this._updateSourcePreview();
    });

    // 上級單位輸入
    const higherFormationInput = document.getElementById('higher-formation-input');
    higherFormationInput?.addEventListener('input', (e) => {
      this.currentValues.higherFormation = e.target.value;
      this._updatePreview();
      this._updateSourcePreview();
    });

    // 狀態選擇
    const statusSelect = document.getElementById('status-select');
    statusSelect?.addEventListener('change', (e) => {
      this.currentValues.status = e.target.value;
      this._updatePreview();
      this._updateSourcePreview();
    });

    // 應用按鈕
    const applyBtn = document.getElementById('apply-btn');
    applyBtn?.addEventListener('click', () => {
      this._applyToSelectedUnit();
    });

    // 複製 SIDC 按鈕
    const copyBtn = document.getElementById('copy-sidc-btn');
    copyBtn?.addEventListener('click', () => {
      this._copySIDC();
    });

    // 複製 SVG 按鈕
    const copySvgBtn = document.getElementById('copy-svg-btn');
    copySvgBtn?.addEventListener('click', () => {
      this._copySVG();
    });

    // 新增到當前組織按鈕
    const addToOrgBtn = document.getElementById('add-to-org-btn');
    addToOrgBtn?.addEventListener('click', () => {
      this._addSymbolToOrganization();
    });

    // 加入符號庫按鈕
    const addToLibraryBtn = document.getElementById('add-to-library-btn');
    addToLibraryBtn?.addEventListener('click', () => {
      this._addSymbolToLibrary();
    });

    // 清空符號庫按鈕
    const clearLibraryBtn = document.getElementById('clear-library-btn');
    clearLibraryBtn?.addEventListener('click', () => {
      this._clearSymbolLibrary();
    });
  }

  /**
   * 更新兵種選單 (根據戰鬥維度動態變化)
   * 對應 test.html 的 updateFunctionOptions()
   */
  _updateFunctionOptions() {
    const functionSelect = document.getElementById('function-select');
    if (!functionSelect) return;

    const dim = this.currentValues.dimension;
    const options = DimensionFunctionMaps[dim] || DimensionFunctionMaps["G"];

    // 清空現有選項
    functionSelect.innerHTML = "";

    // 填入新選項
    options.forEach(opt => {
      const el = document.createElement("option");
      el.value = opt.value;
      el.textContent = opt.text;
      if (opt.value === this.currentValues.functionId) {
        el.selected = true;
      }
      functionSelect.appendChild(el);
    });

    // 如果當前兵種不在新維度的選項中，使用第一個選項
    if (!options.find(o => o.value === this.currentValues.functionId)) {
      this.currentValues.functionId = options[0].value;
      functionSelect.value = options[0].value;
    }
  }

  /**
   * 綁定組織編輯器事件
   */
  _bindOrgEditorEvents() {
    // 新建組織
    document.getElementById('create-org-btn')?.addEventListener('click', () => {
      this._createNewOrganization();
    });

    // 儲存組織
    document.getElementById('save-org-btn')?.addEventListener('click', () => {
      this._saveOrganization();
    });

    // 刪除組織
    document.getElementById('delete-org-btn')?.addEventListener('click', () => {
      this._deleteOrganization();
    });

    // 組織名稱變更
    const nameInput = document.getElementById('org-name-input');
    nameInput?.addEventListener('change', (e) => {
      this.organization.name = e.target.value;
      document.getElementById('current-org-name').textContent = e.target.value;
    });

    // 拖拖拉源符號 (舊版保留，但不再使用)
    const draggableSymbol = document.getElementById('draggable-symbol');
    draggableSymbol?.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('application/symbol', JSON.stringify(this._getSymbolData()));
      draggableSymbol.classList.add('dragging');
    });

    draggableSymbol?.addEventListener('dragend', () => {
      draggableSymbol.classList.remove('dragging');
    });

    // 組織樹放置區 (拖放空白處添加到根層)
    const dropZone = document.getElementById('org-tree-drop-zone');
    dropZone?.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      dropZone.classList.add('drag-over');
    });

    dropZone?.addEventListener('dragleave', () => {
      dropZone.classList.remove('drag-over');
    });

    dropZone?.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove('drag-over');

      // 只在沒有放到卡片上時處理
      if (!e.target.closest('.org-unit-card')) {
        // 嘗試獲取符號庫符號 ID
        const symbolId = e.dataTransfer.getData('application/symbol-id');
        if (symbolId) {
          // 從符號庫獲取符號資料
          const librarySymbol = this.symbolLibrary.find(s => s.id === symbolId);
          if (librarySymbol) {
            this._addSymbolUnitToTree({
              sidc: librarySymbol.sidc,
              name: librarySymbol.name,
              designation: librarySymbol.designation,
              higherFormation: librarySymbol.higherFormation,
              level: librarySymbol.level
            });
          }
        } else {
          // 舊版直接拖曳
          const symbolData = e.dataTransfer.getData('application/symbol');
          if (symbolData) {
            const data = JSON.parse(symbolData);
            this._addSymbolUnitToTree(data);
          }
        }
      }
    });

    // 滾輪縮放組織樹
    const treeDropZone = document.getElementById('org-tree-drop-zone');
    treeDropZone?.addEventListener('wheel', (e) => {
      e.preventDefault();

      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      const newScale = Math.min(
        this.orgTreeMaxScale,
        Math.max(this.orgTreeMinScale, this.orgTreeScale + delta)
      );

      if (newScale !== this.orgTreeScale) {
        this.orgTreeScale = newScale;
        this._applyOrgTreeScale();
      }
    }, { passive: false });

    // 左鍵拖動移動組織樹
    treeDropZone?.addEventListener('mousedown', (e) => {
      // 只在左鍵且點擊空白處時啟用拖動
      if (e.button !== 0) return;
      if (e.target.closest('.org-unit-card')) return;

      this.isDraggingOrgTree = true;
      this.dragStartX = e.clientX;
      this.dragStartY = e.clientY;
      this.dragStartTranslateX = this.orgTreeTranslateX;
      this.dragStartTranslateY = this.orgTreeTranslateY;

      treeDropZone.style.cursor = 'grabbing';
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.isDraggingOrgTree) return;

      const deltaX = e.clientX - this.dragStartX;
      const deltaY = e.clientY - this.dragStartY;

      this.orgTreeTranslateX = this.dragStartTranslateX + deltaX;
      this.orgTreeTranslateY = this.dragStartTranslateY + deltaY;

      this._applyOrgTreeScale();
    });

    document.addEventListener('mouseup', () => {
      if (this.isDraggingOrgTree) {
        this.isDraggingOrgTree = false;
        treeDropZone.style.cursor = '';
      }
    });
  }

  /**
   * 套用組織樹縮放與平移
   */
  _applyOrgTreeScale() {
    const treeContainer = document.getElementById('org-tree');
    if (!treeContainer) return;

    treeContainer.style.transform = `translate(${this.orgTreeTranslateX}px, ${this.orgTreeTranslateY}px) scale(${this.orgTreeScale})`;
    treeContainer.style.transformOrigin = 'center center';

    // 顯示當前縮放比例
    this._showScaleIndicator();
  }

  /**
   * 顯示縮放指示器
   */
  _showScaleIndicator() {
    let indicator = document.getElementById('org-scale-indicator');
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'org-scale-indicator';
      indicator.className = 'org-scale-indicator';
      document.body.appendChild(indicator);
    }

    indicator.textContent = `${Math.round(this.orgTreeScale * 100)}%`;
    indicator.classList.add('show');

    // 清除之前的定時器
    if (this.scaleIndicatorTimer) {
      clearTimeout(this.scaleIndicatorTimer);
    }

    // 2秒後隱藏
    this.scaleIndicatorTimer = setTimeout(() => {
      indicator.classList.remove('show');
    }, 2000);
  }

  /**
   * 重置組織樹縮放與平移
   */
  _resetOrgTreeScale() {
    this.orgTreeScale = 1;
    this.orgTreeTranslateX = 0;
    this.orgTreeTranslateY = 0;
    this._applyOrgTreeScale();
  }

  /**
   * 切換面板
   */
  _switchPanel(panel) {
    this.currentPanel = panel;

    // 更新菜單狀態
    this.container.querySelectorAll('.menu-item').forEach(item => {
      item.classList.toggle('active', item.dataset.panel === panel);
    });

    // 切換面板顯示
    document.getElementById('panel-symbol').style.display = panel === 'symbol' ? 'block' : 'none';
    document.getElementById('panel-organization').style.display = panel === 'organization' ? 'block' : 'none';

    // 如果切換到組織面板，更新預覽
    if (panel === 'organization') {
      this._renderSymbolLibrary();
      this._renderOrgTree();
    }
  }

  /**
   * 初始化源預覽
   */
  _initSourcePreview() {
    this._renderSymbolLibrary();
  }

  /**
   * 更新源預覽
   */
  _updateSourcePreview() {
    const canvas = document.getElementById('source-preview-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const sidc = this._generateSIDC();

    if (window.ms) {
      // 獲取 echelon 對應的完整名稱
      const echelonData = TestEchelonOptions.find(opt => opt.value === this.currentValues.echelon) || TestEchelonOptions[0];

      // 增大尺寸並顯式指定層級以確保層級符號可見
      const symbol = new window.ms.Symbol(sidc, {
        size: 80,  // 增大尺寸
        uniqueDesignation: this.currentValues.designation,
        higherFormation: this.currentValues.higherFormation,
        echelon: echelonData.echelonName,  // 使用完整名稱
        // 設定文字為白色
        infoColor: '#ffffff',
        infoSize: 12,
        infoPadding: 4
      });

      ctx.clearRect(0, 0, 60, 60);
      const symbolCanvas = symbol.asCanvas();
      if (symbolCanvas) {
        // 縮小以適應容器
        const scale = Math.min(60 / symbolCanvas.width, 60 / symbolCanvas.height);
        const x = (60 - symbolCanvas.width * scale) / 2;
        const y = (60 - symbolCanvas.height * scale) / 2;
        ctx.drawImage(symbolCanvas, x, y, symbolCanvas.width * scale, symbolCanvas.height * scale);
      }
    }
  }

  /**
   * 取得符號資料
   */
  _getSymbolData() {
    const echelonData = TestEchelonOptions.find(opt => opt.value === this.currentValues.echelon) || TestEchelonOptions[0];
    return {
      sidc: this._generateSIDC(),
      name: '新建單位',
      level: echelonData.levelName,
      commandType: this.currentValues.commandType,
      branchType: this.currentValues.branchType
    };
  }

  /**
   * 新增符號到組織
   */
  _addSymbolToOrganization() {
    this._addSymbolUnitToTree(this._getSymbolData());
    this._showToast('已新增到組織');
  }

  /**
   * 新增符號單位到樹
   */
  _addSymbolUnitToTree(symbolData, parentId = null) {
    const unit = {
      id: 'unit-' + Date.now(),
      sidc: symbolData.sidc,
      name: symbolData.designation || symbolData.name || '新建單位',
      designation: symbolData.designation,
      higherFormation: symbolData.higherFormation,
      level: symbolData.level,
      children: []
    };

    if (parentId) {
      // 新增為子單位
      const parent = this._findUnit(this.organization.units, parentId);
      if (parent) {
        if (!parent.children) parent.children = [];
        parent.children.push(unit);
      } else {
        // 找不到父節點，加到根層
        this.organization.units.push(unit);
      }
    } else {
      // 加到根層 - 檢查是否已有根節點
      if (this.organization.units.length > 0) {
        this._showToast('只能有一個初始節點，請拖放到現有單位上作為子單位');
        return;
      }
      this.organization.units.push(unit);
    }

    this._renderOrgTree();
  }

  /**
   * 渲染組織列表
   */
  _renderOrgList() {
    const listContainer = document.getElementById('org-list');
    if (!listContainer) return;

    if (this.savedOrganizations.length === 0) {
      listContainer.innerHTML = '<div class="empty-state">尚未儲存任何組織</div>';
      return;
    }

    listContainer.innerHTML = this.savedOrganizations.map((org, index) => {
      // 遞歸計算所有單位數量
      const unitCount = this._countAllUnits(org.units);

      return `
      <div class="org-item ${this.organization.id === org.id ? 'active' : ''}" data-index="${index}">
        <div class="org-item-icon">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M3 3h14v2H3V3zm0 4h14v2H3V7zm0 4h14v2H3v-2zm0 4h10v2H3v-2z"/>
          </svg>
        </div>
        <div class="org-item-info">
          <div class="org-item-name">${org.name}</div>
          <div class="org-item-count">${unitCount} 個單位</div>
        </div>
        <button class="org-item-action" data-action="load" title="載入">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
            <path d="M5 9l4-4 4 4"/>
          </svg>
        </button>
        <button class="org-item-action danger" data-action="delete" title="刪除">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
            <path d="M4 4l6 6M10 4l-6 6" stroke="currentColor" stroke-width="1.5"/>
          </svg>
        </button>
      </div>
    `;
    }).join('');

    // 綁定事件
    listContainer.querySelectorAll('.org-item').forEach(item => {
      const index = parseInt(item.dataset.index);
      const org = this.savedOrganizations[index];

      item.querySelector('[data-action="load"]')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this._loadOrganization(org);
      });

      item.querySelector('[data-action="delete"]')?.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm(`確定要刪除「${org.name}」嗎？`)) {
          this.savedOrganizations.splice(index, 1);
          this._saveOrganizationsToStorage();
          this._renderOrgList();
        }
      });

      item.addEventListener('click', () => {
        this._loadOrganization(org);
      });
    });
  }

  /**
   * 遞歸計算所有單位數量（包括子單位）
   */
  _countAllUnits(units) {
    let count = 0;
    for (const unit of units) {
      count++;
      if (unit.children && unit.children.length > 0) {
        count += this._countAllUnits(unit.children);
      }
    }
    return count;
  }

  /**
   * 渲染組織樹 (層級式組織架構圖)
   */
  _renderOrgTree() {
    const treeContainer = document.getElementById('org-tree');
    if (!treeContainer) return;

    if (this.organization.units.length === 0) {
      treeContainer.innerHTML = '<div class="empty-state">拖拉符號到此處建立組織</div>';
      return;
    }

    // 使用新的層級式樹狀圖渲染
    treeContainer.innerHTML = '';
    treeContainer.className = 'org-hierarchy-container';

    // 渲染每個頂層單位
    this.organization.units.forEach(unit => {
      this._renderHierarchyNode(unit, treeContainer, true);
    });

    // 繪製所有符號
    this._drawSymbols();
  }

  /**
   * 渲染層級式節點 (參考 ll.html 的組織架構圖樣式)
   */
  _renderHierarchyNode(unit, container, isRoot = false) {
    // 創建包裝器
    const wrapper = document.createElement('div');
    wrapper.className = 'org-node-wrapper';
    wrapper.dataset.id = unit.id;

    // 1. 上方連接線 (如果不是根節點)
    if (!isRoot) {
      const topLine = document.createElement('div');
      topLine.className = 'org-line-vertical org-line-top';
      wrapper.appendChild(topLine);
    }

    // 2. 節點卡片
    const card = this._createUnitCard(unit, isRoot);
    wrapper.appendChild(card);

    // 3. 處理子節點
    if (unit.children && unit.children.length > 0) {
      // 展開/收起按鈕
      const toggleBtn = document.createElement('div');
      toggleBtn.className = 'org-toggle-btn';
      toggleBtn.textContent = '−';
      card.appendChild(toggleBtn);

      // 子節點容器
      const childrenContainer = document.createElement('div');
      childrenContainer.className = 'org-children-container';

      // 下方連接線
      const bottomLine = document.createElement('div');
      bottomLine.className = 'org-line-vertical org-line-bottom';
      childrenContainer.appendChild(bottomLine);

      // 橫向包裝器
      const horizontalWrapper = document.createElement('div');
      horizontalWrapper.className = 'org-horizontal-wrapper';

      // 橫跨線 (連接所有子節點)
      if (unit.children.length > 1) {
        const crossLine = document.createElement('div');
        crossLine.className = 'org-line-cross';
        horizontalWrapper.appendChild(crossLine);
      }

      // 遞迴渲染每個子節點
      unit.children.forEach(child => {
        const childWrapper = document.createElement('div');
        childWrapper.className = 'org-child-wrapper';

        // 子節點頂部的小豎線 (連接到橫跨線)
        if (unit.children.length > 1) {
          const connector = document.createElement('div');
          connector.className = 'org-line-connector';
          childWrapper.appendChild(connector);
        }

        this._renderHierarchyNode(child, childWrapper, false);
        horizontalWrapper.appendChild(childWrapper);
      });

      childrenContainer.appendChild(horizontalWrapper);
      wrapper.appendChild(childrenContainer);

      // 點擊事件：切換展開/收起
      let isExpanded = true;
      card.addEventListener('click', (e) => {
        e.stopPropagation();
        isExpanded = !isExpanded;
        toggleBtn.textContent = isExpanded ? '−' : '+';
        childrenContainer.style.display = isExpanded ? 'flex' : 'none';
      });
    }

    // 編輯和刪除按鈕事件
    card.querySelector('.org-card-edit')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this._editUnitName(unit.id);
    });

    card.querySelector('.org-card-delete')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this._removeUnit(unit.id);
    });

    // 拖拉支援
    card.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      wrapper.classList.add('drop-target');
    });

    card.addEventListener('dragleave', () => {
      wrapper.classList.remove('drop-target');
    });

    card.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      wrapper.classList.remove('drop-target');

      // 嘗試獲取符號庫符號 ID
      const symbolId = e.dataTransfer.getData('application/symbol-id');
      if (symbolId) {
        // 從符號庫獲取符號資料
        const librarySymbol = this.symbolLibrary.find(s => s.id === symbolId);
        if (librarySymbol) {
          this._addSymbolUnitToTree({
            sidc: librarySymbol.sidc,
            name: librarySymbol.name,
            designation: librarySymbol.designation,
            higherFormation: librarySymbol.higherFormation,
            level: librarySymbol.level
          }, unit.id);
        }
      } else {
        // 舊版直接拖曳
        const symbolData = e.dataTransfer.getData('application/symbol');
        if (symbolData) {
          const data = JSON.parse(symbolData);
          this._addSymbolUnitToTree(data, unit.id);
        }
      }
    });

    container.appendChild(wrapper);
  }

  /**
   * 創建單位卡片
   */
  _createUnitCard(unit, isRoot = false) {
    const card = document.createElement('div');
    card.className = `org-unit-card ${isRoot ? 'is-root' : ''}`;

    // 符號容器
    const symbolContainer = document.createElement('div');
    symbolContainer.className = 'org-symbol-container';

    const canvas = document.createElement('canvas');
    canvas.className = 'unit-symbol-canvas';
    canvas.width = 60;
    canvas.height = 60;
    canvas.dataset.sidc = unit.sidc;
    symbolContainer.appendChild(canvas);

    card.appendChild(symbolContainer);

    // 文字資訊
    const textContainer = document.createElement('div');
    textContainer.className = 'org-text-container';

    const title = document.createElement('h3');
    title.className = 'org-unit-name';
    title.textContent = unit.name;

    textContainer.appendChild(title);
    card.appendChild(textContainer);

    // 操作按鈕
    const actions = document.createElement('div');
    actions.className = 'org-card-actions';
    actions.innerHTML = `
      <button class="org-card-edit" title="編輯">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
          <path d="M2 10l2-1 5-5-1-1-5 5-1 2zm7-7l1 1M8 2l2 2"/>
        </svg>
      </button>
      <button class="org-card-delete" title="刪除">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
          <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" stroke-width="1.2"/>
        </svg>
      </button>
    `;
    card.appendChild(actions);

    return card;
  }

  /**
   * 繪製所有符號
   */
  _drawSymbols() {
    const treeContainer = document.getElementById('org-tree');
    if (!treeContainer) return;

    treeContainer.querySelectorAll('.unit-symbol-canvas').forEach(canvas => {
      const sidc = canvas.dataset.sidc;
      if (sidc && window.ms) {
        const ctx = canvas.getContext('2d');
        // 從 SIDC 解析層級字母
        const echelonLetter = sidc[13];

        // 獲取 TestEchelonOptions 對應的 echelonName
        const echelonData = TestEchelonOptions.find(opt => opt.value === echelonLetter) || TestEchelonOptions[0];

        const symbol = new window.ms.Symbol(sidc, {
          size: 60,
          echelon: echelonData.echelonName
        });
        const symbolCanvas = symbol.asCanvas();
        if (symbolCanvas) {
          ctx.clearRect(0, 0, 60, 60);
          ctx.drawImage(symbolCanvas, 0, 0, 60, 60);
        }
      }
    });
  }

  /**
   * 舊的渲染樹節點函數 (保留兼容)
   */
  _renderTreeNode(units, depth) {
    return units.map((unit, index) => `
      <div class="org-tree-node" data-id="${unit.id}" style="padding-left: ${depth * 20}px;">
        <div class="tree-node-content">
          <span class="tree-node-symbol">
            <canvas class="unit-icon" width="20" height="20" data-sidc="${unit.sidc}"></canvas>
          </span>
          <span class="tree-node-label">${unit.name}</span>
          <button class="tree-node-action" data-action="edit" title="編輯名稱">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <path d="M2 10l2-1 5-5-1-1-5 5-1 2zm7-7l1 1M8 2l2 2"/>
            </svg>
          </button>
          <button class="tree-node-action danger" data-action="remove" title="移除">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" stroke-width="1.2"/>
            </svg>
          </button>
        </div>
        ${unit.children && unit.children.length > 0 ? this._renderTreeNode(unit.children, depth + 1) : ''}
      </div>
    `).join('');

    // 繪製符號
    setTimeout(() => {
      treeContainer.querySelectorAll('.unit-icon').forEach(canvas => {
        const sidc = canvas.dataset.sidc;
        if (sidc && window.ms) {
          const ctx = canvas.getContext('2d');
          // 從 SIDC 解析層級字母，然後映射到完整名稱
          const echelonLetter = sidc[13];
          const levelData = LevelOptions.find(opt => opt.sidc === echelonLetter) || LevelOptions[7];

          // 增大尺寸並顯式指定層級
          const symbol = new window.ms.Symbol(sidc, {
            size: 30,  // 增大尺寸以確保層級可見
            echelon: levelData.value  // 使用完整名稱
          });
          const symbolCanvas = symbol.asCanvas();
          if (symbolCanvas) {
            // 縮小以適應 20x20 的 canvas
            const scale = Math.min(18 / symbolCanvas.width, 18 / symbolCanvas.height);
            const x = (20 - symbolCanvas.width * scale) / 2;
            const y = (20 - symbolCanvas.height * scale) / 2;
            ctx.drawImage(symbolCanvas, x, y, symbolCanvas.width * scale, symbolCanvas.height * scale);
          }
        }
      });

      // 綁定節點事件
      treeContainer.querySelectorAll('.org-tree-node').forEach(node => {
        const unitId = node.dataset.id;

        node.querySelector('[data-action="edit"]')?.addEventListener('click', () => {
          this._editUnitName(unitId);
        });

        node.querySelector('[data-action="remove"]')?.addEventListener('click', () => {
          this._removeUnit(unitId);
        });

        // 拖拉支援
        node.addEventListener('dragover', (e) => {
          e.preventDefault();
          node.classList.add('drop-target');
        });

        node.addEventListener('dragleave', () => {
          node.classList.remove('drop-target');
        });

        node.addEventListener('drop', (e) => {
          e.preventDefault();
          node.classList.remove('drop-target');

          // 嘗試獲取符號庫符號 ID
          const symbolId = e.dataTransfer.getData('application/symbol-id');
          if (symbolId) {
            // 從符號庫獲取符號資料
            const librarySymbol = this.symbolLibrary.find(s => s.id === symbolId);
            if (librarySymbol) {
              this._addSymbolUnitToTree({
                sidc: librarySymbol.sidc,
                name: librarySymbol.name,
                designation: librarySymbol.designation,
                higherFormation: librarySymbol.higherFormation,
                level: librarySymbol.level
              }, unitId);
            }
          } else {
            // 舊版直接拖曳
            const symbolData = e.dataTransfer.getData('application/symbol');
            if (symbolData) {
              const data = JSON.parse(symbolData);
              this._addSymbolUnitToTree(data, unitId);
            }
          }
        });
      });
    }, 0);
  }

  /**
   * 編輯單位名稱
   */
  _editUnitName(unitId) {
    const unit = this._findUnit(this.organization.units, unitId);
    if (!unit) return;

    const newName = prompt('請輸入單位名稱:', unit.name);
    if (newName && newName.trim()) {
      unit.name = newName.trim();
      this._renderOrgTree();
    }
  }

  /**
   * 移除單位
   */
  _removeUnit(unitId) {
    if (confirm('確定要移除此單位嗎？')) {
      this._removeUnitRecursive(this.organization.units, unitId);
      this._renderOrgTree();
    }
  }

  /**
   * 遞歸移除單位
   */
  _removeUnitRecursive(units, id) {
    const index = units.findIndex(u => u.id === id);
    if (index !== -1) {
      units.splice(index, 1);
      return true;
    }

    for (const unit of units) {
      if (unit.children && this._removeUnitRecursive(unit.children, id)) {
        return true;
      }
    }

    return false;
  }

  /**
   * 查找單位
   */
  _findUnit(units, id) {
    for (const unit of units) {
      if (unit.id === id) return unit;
      if (unit.children) {
        const found = this._findUnit(unit.children, id);
        if (found) return found;
      }
    }
    return null;
  }

  /**
   * 新建組織
   */
  _createNewOrganization() {
    this.organization = {
      id: 'org-' + Date.now(),
      name: '新建組織',
      units: []
    };

    document.getElementById('org-name-input').value = this.organization.name;
    document.getElementById('current-org-name').textContent = this.organization.name;

    this._renderOrgTree();
    this._showToast('已建立新組織');
  }

  /**
   * 載入組織
   */
  _loadOrganization(org) {
    this.organization = JSON.parse(JSON.stringify(org));
    document.getElementById('org-name-input').value = this.organization.name;
    document.getElementById('current-org-name').textContent = this.organization.name;

    this._renderOrgTree();
    this._renderOrgList();

    // 發射事件到 ORBAT，同步組織單位到沙盤
    this.eventBus.emit('organization:loaded', {
      organization: this.organization
    });
  }

  /**
   * 儲存組織
   */
  _saveOrganization() {
    // 更新名稱
    const nameInput = document.getElementById('org-name-input');
    this.organization.name = nameInput.value.trim() || '未命名組織';

    // 檢查是否已存在
    const existingIndex = this.savedOrganizations.findIndex(o => o.id === this.organization.id);

    if (existingIndex !== -1) {
      // 組織已存在，詢問是否更新或另存為新組織
      const action = confirm(
        `「${this.organization.name}」已存在。\n\n` +
        `點擊「確定」更新現有組織\n` +
        `點擊「取消」另存為新組織`
      );

      if (action) {
        // 更新現有組織
        this.savedOrganizations[existingIndex] = JSON.parse(JSON.stringify(this.organization));
        this._showToast('組織已更新');
      } else {
        // 另存為新組織
        this._saveAsNewOrganization();
        return;
      }
    } else {
      // 新組織，直接保存
      this.savedOrganizations.push(JSON.parse(JSON.stringify(this.organization)));
      this._showToast('組織已儲存');
    }

    this._saveOrganizationsToStorage();
    this._renderOrgList();
  }

  /**
   * 另存為新組織
   */
  _saveAsNewOrganization() {
    // 創建新的組織副本，使用新的 ID
    const newOrg = JSON.parse(JSON.stringify(this.organization));
    newOrg.id = 'org-' + Date.now();
    newOrg.name = newOrg.name + ' (副本)';

    // 添加到列表
    this.savedOrganizations.push(newOrg);

    // 設為當前組織
    this.organization = newOrg;
    document.getElementById('org-name-input').value = this.organization.name;
    document.getElementById('current-org-name').textContent = this.organization.name;

    this._saveOrganizationsToStorage();
    this._renderOrgList();
    this._showToast('已另存為新組織');
  }

  /**
   * 刪除組織
   */
  _deleteOrganization() {
    if (confirm(`確定要刪除「${this.organization.name}」嗎？`)) {
      const index = this.savedOrganizations.findIndex(o => o.id === this.organization.id);
      if (index !== -1) {
        this.savedOrganizations.splice(index, 1);
        this._saveOrganizationsToStorage();
        this._renderOrgList();
        this._createNewOrganization();
        this._showToast('組織已刪除');
      }
    }
  }

  /**
   * 載入已儲存的組織
   */
  _loadSavedOrganizations() {
    const stored = localStorage.getItem('wargame-organizations');
    if (stored) {
      try {
        this.savedOrganizations = JSON.parse(stored);
      } catch (e) {
        console.error('載入組織失敗:', e);
        this.savedOrganizations = [];
      }
    }

    // 確保當前組織有 ID（用於首次保存）
    if (!this.organization.id) {
      this.organization.id = 'org-' + Date.now();
    }
  }

  /**
   * 儲存組織到本地儲存
   */
  _saveOrganizationsToStorage() {
    localStorage.setItem('wargame-organizations', JSON.stringify(this.savedOrganizations));
  }

  /**
   * 載入符號庫
   */
  _loadSymbolLibrary() {
    const stored = localStorage.getItem('wargame-symbol-library');
    if (stored) {
      try {
        this.symbolLibrary = JSON.parse(stored);
      } catch (e) {
        console.error('載入符號庫失敗:', e);
        this.symbolLibrary = [];
      }
    }
  }

  /**
   * 儲存符號庫到本地儲存
   */
  _saveSymbolLibrary() {
    localStorage.setItem('wargame-symbol-library', JSON.stringify(this.symbolLibrary));
  }

  /**
   * 新增當前符號到符號庫
   */
  _addSymbolToLibrary() {
    const echelonData = TestEchelonOptions.find(opt => opt.value === this.currentValues.echelon) || TestEchelonOptions[0];

    const symbolData = {
      id: 'lib-symbol-' + Date.now(),
      sidc: this._generateSIDC(),
      name: '單位',
      designation: this.currentValues.designation,
      higherFormation: this.currentValues.higherFormation,
      echelon: echelonData.echelonName,   // 用於 milsymbol.js 繪製
      level: echelonData.levelName,       // 用於 ORBAT 系統顯示
      affiliation: this.currentValues.affiliation,
      dimension: this.currentValues.dimension,
      functionId: this.currentValues.functionId,
      createdAt: new Date().toISOString()
    };

    this.symbolLibrary.push(symbolData);
    this._saveSymbolLibrary();
    this._renderSymbolLibrary();
    this._showToast('已加入符號庫');
  }

  /**
   * 渲染符號庫
   */
  _renderSymbolLibrary() {
    const container = document.getElementById('symbol-library');
    if (!container) return;

    if (this.symbolLibrary.length === 0) {
      container.innerHTML = `
        <div class="symbol-library-empty">
          <div class="empty-hint">符號庫是空的</div>
          <div class="empty-hint-small">在符號編輯器中點擊「加入符號庫」</div>
        </div>
      `;
      return;
    }

    container.innerHTML = this.symbolLibrary.map(symbol => this._createSymbolLibraryItem(symbol)).join('');

    // 綁定拖曳事件
    container.querySelectorAll('.library-symbol-item').forEach(item => {
      const symbolId = item.dataset.symbolId;
      item.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('application/symbol-id', symbolId);
        item.classList.add('dragging');
      });

      item.addEventListener('dragend', () => {
        item.classList.remove('dragging');
      });

      // 刪除按鈕
      const deleteBtn = item.querySelector('.library-symbol-delete');
      deleteBtn?.addEventListener('click', () => {
        this._deleteSymbolFromLibrary(symbolId);
      });
    });

    // 繪製符號
    setTimeout(() => this._drawSymbolLibrarySymbols(), 50);
  }

  /**
   * 創建符號庫項目 HTML
   */
  _createSymbolLibraryItem(symbolData) {
    const canvasId = 'lib-canvas-' + symbolData.id;

    return `
      <div class="library-symbol-item" draggable="true" data-symbol-id="${symbolData.id}">
        <canvas id="${canvasId}" width="300" height="300"></canvas>
        <button class="library-symbol-delete" title="刪除">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" stroke-width="1.5"/>
          </svg>
        </button>
      </div>
    `;
  }

  /**
   * 繪製符號庫中的符號
   */
  _drawSymbolLibrarySymbols() {
    if (!window.ms) return;

    this.symbolLibrary.forEach(symbolData => {
      const canvasId = 'lib-canvas-' + symbolData.id;
      const canvas = document.getElementById(canvasId);
      if (!canvas) return;

      const ctx = canvas.getContext('2d');

      // 增大尺寸以容納文字標籤
      const symbolSize = 500;
      const symbol = new window.ms.Symbol(symbolData.sidc, {
        size: symbolSize,
        uniqueDesignation: symbolData.designation,
        higherFormation: symbolData.higherFormation,
        echelon: symbolData.echelon,
        // 設定文字為白色
        infoColor: '#ffffff',
        infoSize: 40,
        infoPadding: 10
      });

      // 清除並繪製
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const symbolCanvas = symbol.asCanvas();
      if (symbolCanvas) {
        // 縮放以適應容器
        const scale = Math.min(canvas.width / symbolCanvas.width, canvas.height / symbolCanvas.height);
        const x = (canvas.width - symbolCanvas.width * scale) / 2;
        const y = (canvas.height - symbolCanvas.height * scale) / 2;
        ctx.drawImage(symbolCanvas, x, y, symbolCanvas.width * scale, symbolCanvas.height * scale);
      }
    });
  }

  /**
   * 從符號庫刪除符號
   */
  _deleteSymbolFromLibrary(symbolId) {
    const index = this.symbolLibrary.findIndex(s => s.id === symbolId);
    if (index !== -1) {
      this.symbolLibrary.splice(index, 1);
      this._saveSymbolLibrary();
      this._renderSymbolLibrary();
      this._showToast('符號已刪除');
    }
  }

  /**
   * 清空符號庫
   */
  _clearSymbolLibrary() {
    if (this.symbolLibrary.length === 0) {
      this._showToast('符號庫已經是空的');
      return;
    }

    if (confirm('確定要清空符號庫嗎？')) {
      this.symbolLibrary = [];
      this._saveSymbolLibrary();
      this._renderSymbolLibrary();
      this._showToast('符號庫已清空');
    }
  }

  /**
   * 更新預覽
   */
  _updatePreview() {
    const sidc = this._generateSIDC();

    // 更新內部預覽（面板內）
    if (this.internalSidcCodeElement) {
      this.internalSidcCodeElement.textContent = sidc;
    }

    if (!window.ms) {
      console.warn('milsymbol.js 尚未載入');
      return;
    }

    const previewContainer = document.getElementById('internal-preview-container');
    if (!previewContainer) {
      console.warn('內部預覽容器不存在');
      return;
    }

    try {
      // 獲取 echelon 對應的完整名稱
      const echelonData = TestEchelonOptions.find(opt => opt.value === this.currentValues.echelon) || TestEchelonOptions[0];

      // 使用生成的 SIDC 創建符號
      const symbol = new window.ms.Symbol(sidc, {
        size: 200,  // 增大尺寸以確保層級符號可見
        uniqueDesignation: this.currentValues.designation,
        higherFormation: this.currentValues.higherFormation,
        echelon: echelonData.echelonName,  // 使用完整名稱
        // 設定文字為白色
        infoColor: '#ffffff',
        infoSize: 16,
        infoPadding: 5
      });

      console.log('[SymbolEditor] 當前符號預覽:');
      console.log('- SIDC:', sidc);
      console.log('- 長度:', sidc.length);
      console.log('- 層級值:', this.currentValues.echelon);
      console.log('- 層級名稱:', echelonData.echelonName);
      console.log('- 部隊番號:', this.currentValues.designation);
      console.log('- 上級單位:', this.currentValues.higherFormation);
      console.log('- isValid():', symbol.isValid());

      const opts = symbol.getOptions();
      console.log('- echelon (來自 getOptions):', opts.echelon);
      console.log('- 完整選項:', opts);

      // 獲取 SVG 字符串
      const svgString = symbol.asSVG();

      if (!svgString) {
        console.warn('SVG 生成失敗');
        return;
      }

      // 將 SVG 插入到預覽容器中
      previewContainer.innerHTML = svgString;

      // 設置 SVG 的最大寬度和高度，使其適應容器
      const svgElement = previewContainer.querySelector('svg');
      if (svgElement) {
        svgElement.style.width = '100%';
        svgElement.style.height = '100%';
        svgElement.style.maxWidth = '240px';
        svgElement.style.maxHeight = '120px';
        svgElement.style.objectFit = 'contain';
      }

      // 同時輸出到控制台供檢視
      console.log('========================================');
      console.log('SVG 輸出:');
      console.log('========================================');
      console.log(svgString);
      console.log('========================================');

    } catch (error) {
      console.error('生成 SVG 時發生錯誤:', error);
    }

    // 觸發變更事件
    this.eventBus.emit('symbol-editor:preview-changed', { sidc, values: this.currentValues });
  }

  /**
   * 生成 SIDC (對應 test.html 格式)
   * 格式: S + Affiliation + Dimension + Status + FunctionID + Echelon
   */
  _generateSIDC() {
    const {
      affiliation,  // F/H/N/U
      dimension,     // G/A/S/U
      functionId,    // 如 UCI----
      echelon,       // D/E/F/G/H/I/J 或 -
      status         // 空或 '1'
    } = this.currentValues;

    // 狀態: 空字符串 = 現行(P), '1' = 計畫中(A)
    const stat = status === '1' ? 'A' : 'P';

    // 組合 SIDC (test.html 格式)
    // 注意：test.html 的 echelon 直接附加在最後，只有一個字符
    let sidc = "S" + affiliation + dimension + stat + functionId + echelon;

    console.log('[SymbolEditor] SIDC 生成詳情:', {
      affiliation,
      dimension,
      functionId,
      echelon,
      status: stat,
      sidc,
      length: sidc.length
    });

    return sidc;
  }

  /**
   * 應用到選中單位
   */
  _applyToSelectedUnit() {
    const sidc = this._generateSIDC();
    this.eventBus.emit('symbol-editor:apply', { sidc });
  }

  /**
   * 複製 SIDC 到剪貼板
   */
  _copySIDC() {
    const sidc = this._generateSIDC();
    navigator.clipboard.writeText(sidc).then(() => {
      const btn = document.getElementById('copy-sidc-btn');
      const originalText = btn.textContent;
      btn.textContent = '已複製!';
      setTimeout(() => {
        btn.textContent = originalText;
      }, 1500);
    });
  }

  /**
   * 複製 SVG 到剪貼板
   */
  _copySVG() {
    const sidc = this._generateSIDC();

    if (!window.ms) {
      this._showToast('milsymbol.js 尚未載入');
      return;
    }

    try {
      // 獲取 echelon 對應的完整名稱
      const echelonData = TestEchelonOptions.find(opt => opt.value === this.currentValues.echelon) || TestEchelonOptions[0];

      // 使用 asSVG() 方法獲取 SVG 字符串
      const symbol = new window.ms.Symbol(sidc, {
        size: 200,
        uniqueDesignation: this.currentValues.designation,
        higherFormation: this.currentValues.higherFormation,
        echelon: echelonData.echelonName,  // 使用完整名稱
        // 設定文字為白色
        infoColor: '#ffffff',
        infoSize: 16,
        infoPadding: 5
      });
      const svgString = symbol.asSVG();

      if (!svgString) {
        this._showToast('SVG 生成失敗');
        return;
      }

      // 複製到剪貼板
      navigator.clipboard.writeText(svgString).then(() => {
        const btn = document.getElementById('copy-svg-btn');
        const originalText = btn.textContent;
        btn.textContent = '已複製!';
        setTimeout(() => {
          btn.textContent = originalText;
        }, 1500);
        this._showToast('SVG 已複製到剪貼板');
      }).catch(err => {
        console.error('複製失敗:', err);
        this._showToast('複製失敗');
      });

      // 輸出到控制台供檢視
      console.log('========================================');
      console.log('SVG 輸出:');
      console.log('========================================');
      console.log(svgString);
      console.log('========================================');
    } catch (error) {
      console.error('生成 SVG 時發生錯誤:', error);
      this._showToast('SVG 生成失敗');
    }
  }

  /**
   * 從 SIDC 載入設定 (15位字母格式)
   *
   * 格式: S + Affiliation + Dimension + Status + FunctionID + '--' + Echelon
   */
  loadFromSIDC(sidc) {
    if (!sidc || sidc.length !== 15) return;

    // 解析 15位字母 SIDC
    const identityCode = sidc[1];      // Position 1: Affiliation
    const dimensionCode = sidc[2];     // Position 2: Dimension
    const functionID = sidc.substring(4, 10);  // Position 4-9: Function ID
    const echelonCode = sidc[13];     // Position 13: Echelon

    // 更新當前值
    const identityData = IdentityOptions.find(opt => opt.sidc === identityCode);
    if (identityData) this.currentValues.identity = identityData.value;

    const dimensionData = DimensionOptions.find(opt => opt.sidc === dimensionCode);
    if (dimensionData) this.currentValues.dimension = dimensionData.value;

    const levelData = LevelOptions.find(opt => opt.sidc === echelonCode);
    if (levelData) this.currentValues.level = levelData.value;

    this.currentValues.branchType = functionID;

    // 重新創建 UI 以反映新值
    if (this.container) {
      this._createUI();
    }
  }

  /**
   * 設定事件監聽
   */
  _setupEventListeners() {
    // 監聽標籤頁切換事件
    this.eventBus.on('tab:changed', ({ tab }) => {
      if (tab === 'symbol-editor') {
        // 切換到符號編輯器時刷新預覽
        this._updatePreview();
        this._updateSourcePreview();
      }
    });
  }

  /**
   * 顯示提示
   */
  _showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'editor-toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 0);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }

  /**
   * 顯示編輯器
   */
  show() {
    // 在標籤頁模式下，不需要此方法
  }

  /**
   * 隱藏編輯器
   */
  hide() {
    // 在標籤頁模式下，不需要此方法
  }

  /**
   * 銷毀
   */
  dispose() {
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}