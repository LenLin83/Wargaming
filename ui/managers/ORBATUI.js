/**
 * UI 層 - ORBAT 樹管理器
 * UI Layer - ORBAT Tree Manager
 * 負責：戰鬥序列樹的渲染與交互
 */

export class ORBATUI {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.container = document.getElementById('orbat-tree');
    this.unitMap = new Map(); // uuid -> DOM element
    this.draggedNode = null;
    this.contextMenu = null;

    this._setupEventListeners();
  }

  /**
   * 設定事件監聽
   */
  _setupEventListeners() {
    // 監聽單位移動事件
    this.eventBus.on('backend:unit:moved', ({ uuid, oldParentId, newParentId }) => {
      this._handleUnitMoved(uuid);
    });
  }

  /**
   * 新增單位節點
   */
  addUnitNode(unit) {
    // 如果節點已存在，只更新
    if (this.unitMap.has(unit.uuid)) {
      this.updateUnitNode(unit.uuid, unit);
      return;
    }

    const node = this._createNodeElement(unit);
    this.unitMap.set(unit.uuid, node);

    // 如果有父節點，加入到父節點
    if (unit.parentId && this.unitMap.has(unit.parentId)) {
      const parentNode = this.unitMap.get(unit.parentId);
      const childrenContainer = parentNode.querySelector('.tree-children');
      childrenContainer.appendChild(node);
      parentNode.classList.add('has-children');
      parentNode.classList.add('expanded');
    } else {
      // 頂層節點
      this.container.appendChild(node);
    }
  }

  /**
   * 更新單位節點
   */
  updateUnitNode(uuid, updates) {
    const node = this.unitMap.get(uuid);
    if (!node) return;

    if (updates.name) {
      const label = node.querySelector('.node-label');
      if (label) label.textContent = updates.name;
    }

    if (updates.sidc) {
      const icon = node.querySelector('.node-symbol-icon');
      if (icon && window.ms) {
        const symbol = new window.ms.Symbol(updates.sidc, { size: 20 });
        const canvas = symbol.asCanvas();
        icon.innerHTML = '';
        if (canvas) {
          icon.appendChild(canvas);
        }
      }
    }
  }

  /**
   * 移除單位節點
   */
  removeUnitNode(uuid) {
    const node = this.unitMap.get(uuid);
    if (!node) return;

    // 從父節點的 children 中移除
    const parent = node.parentElement;
    if (parent && parent.classList.contains('tree-children')) {
      const grandParent = parent.parentElement;
      if (grandParent && grandParent.classList.contains('tree-node')) {
        const remainingChildren = grandParent.querySelector('.tree-children').children.length;
        if (remainingChildren === 0) {
          grandParent.classList.remove('has-children', 'expanded');
        }
      }
    }

    node.remove();
    this.unitMap.delete(uuid);
  }

  /**
   * 建立節點元素
   */
  _createNodeElement(unit) {
    const div = document.createElement('div');
    div.className = 'tree-node';
    div.dataset.uuid = unit.uuid;
    div.draggable = true;

    const content = document.createElement('div');
    content.className = 'node-content';

    // 展開/收起按鈕
    const expander = document.createElement('span');
    expander.className = 'node-expander';
    expander.innerHTML = '<svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 2l3 3 3-3" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>';
    expander.onclick = (e) => {
      e.stopPropagation();
      this._toggleNode(div);
    };

    // 符號圖標
    const icon = document.createElement('span');
    icon.className = 'node-symbol-icon';
    if (window.ms) {
      const symbol = new window.ms.Symbol(unit.sidc, { size: 20 });
      const canvas = symbol.asCanvas();
      if (canvas) {
        icon.appendChild(canvas);
      }
    }

    // 單位名稱
    const label = document.createElement('span');
    label.className = 'node-label';
    label.textContent = unit.name;

    // 層級標籤
    const levelBadge = document.createElement('span');
    levelBadge.className = 'node-level-badge';
    levelBadge.textContent = this._getLevelLabel(unit.level);
    levelBadge.title = unit.level;

    content.appendChild(expander);
    content.appendChild(icon);
    content.appendChild(label);
    content.appendChild(levelBadge);
    div.appendChild(content);

    const children = document.createElement('div');
    children.className = 'tree-children';
    div.appendChild(children);

    // 拖拽事件
    div.addEventListener('dragstart', (e) => this._onDragStart(e, div, unit));
    div.addEventListener('dragend', (e) => this._onDragEnd(e, div));
    div.addEventListener('dragover', (e) => this._onDragOver(e, div));
    div.addEventListener('drop', (e) => this._onDrop(e, div, unit));
    div.addEventListener('dragleave', (e) => this._onDragLeave(e, div));

    // 右鍵選單
    div.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this._showContextMenu(e, unit, div);
    });

    // 點擊選擇
    content.addEventListener('click', () => {
      this._selectNode(div, unit);
    });

    return div;
  }

  /**
   * 取得層級標籤
   */
  _getLevelLabel(level) {
    const labels = {
      'theater': '戰區',
      'army': '軍團',
      'corps': '軍',
      'division': '師',
      'brigade': '旅',
      'regiment': '團',
      'battalion': '營',
      'company': '連',
      'platoon': '排',
      'squad': '班'
    };
    return labels[level] || level;
  }

  /**
   * 切換節點展開/收起
   */
  _toggleNode(node) {
    node.classList.toggle('expanded');
    const expander = node.querySelector('.node-expander');
    const children = node.querySelector('.tree-children');

    if (node.classList.contains('expanded')) {
      expander.innerHTML = '<svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 5l3 3 3-3" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>';
      children.style.display = 'block';
    } else {
      expander.innerHTML = '<svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 3l3 3 3-3" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>';
      children.style.display = 'none';
    }
  }

  /**
   * 選擇節點
   */
  _selectNode(node, unit) {
    // 移除之前的選擇
    document.querySelectorAll('.tree-node.selected').forEach(n => {
      n.classList.remove('selected');
    });

    node.classList.add('selected');

    // 觸發單位選擇事件
    this.eventBus.emit('ui:unit-selected', { uuid: unit.uuid });
  }

  /**
   * 拖拽開始
   */
  _onDragStart(e, node, unit) {
    this.draggedNode = { node, unit };
    node.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', unit.uuid);
  }

  /**
   * 拖拽結束
   */
  _onDragEnd(e, node) {
    node.classList.remove('dragging');
    document.querySelectorAll('.tree-node.drag-over').forEach(n => {
      n.classList.remove('drag-over');
    });
    this.draggedNode = null;
  }

  /**
   * 拖拽經過
   */
  _onDragOver(e, node) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    node.classList.add('drag-over');
  }

  /**
   * 拖拽離開
   */
  _onDragLeave(e, node) {
    node.classList.remove('drag-over');
  }

  /**
   * 放下
   */
  _onDrop(e, targetNode, targetUnit) {
    e.preventDefault();
    targetNode.classList.remove('drag-over');

    if (!this.draggedNode) return;

    const { node: draggedNode, unit: draggedUnit } = this.draggedNode;

    // 不能拖到自己或自己的子節點
    if (draggedUnit.uuid === targetUnit.uuid) return;
    if (this._isDescendant(draggedUnit.uuid, targetUnit.uuid)) return;

    // 觸發移動事件
    this.eventBus.emit('ui:move-unit', {
      uuid: draggedUnit.uuid,
      newParentId: targetUnit.uuid
    });
  }

  /**
   * 檢查是否為子孫節點
   */
  _isDescendant(ancestorUuid, descendantUuid) {
    const ancestorNode = this.unitMap.get(ancestorUuid);
    if (!ancestorNode) return false;

    const children = ancestorNode.querySelector('.tree-children');
    if (!children) return false;

    for (const child of children.children) {
      const childUuid = child.dataset.uuid;
      if (childUuid === descendantUuid) return true;
      if (this._isDescendant(childUuid, descendantUuid)) return true;
    }

    return false;
  }

  /**
   * 處理單位移動
   */
  _handleUnitMoved(uuid) {
    const node = this.unitMap.get(uuid);
    if (!node) return;

    // 重新渲染整個樹
    this._rebuildTree();
  }

  /**
   * 重新建構樹
   */
  _rebuildTree() {
    // 清空容器
    this.container.innerHTML = '';
    this.unitMap.clear();

    // 請求重新渲染
    this.eventBus.emit('ui:rebuild-orbat-tree');
  }

  /**
   * 顯示右鍵選單
   */
  _showContextMenu(e, unit, node) {
    // 移除現有的選單
    this._hideContextMenu();

    this.contextMenu = document.createElement('div');
    this.contextMenu.className = 'orbat-context-menu';

    // 新增子單位
    const addChildItem = document.createElement('div');
    addChildItem.className = 'context-menu-item';
    addChildItem.innerHTML = '<span class="menu-icon">➕</span> 新增子單位';
    addChildItem.onclick = () => {
      this._hideContextMenu();
      this._addChildUnit(unit);
    };

    // 編輯
    const editItem = document.createElement('div');
    editItem.className = 'context-menu-item';
    editItem.innerHTML = '<span class="menu-icon">✏️</span> 編輯';
    editItem.onclick = () => {
      this._hideContextMenu();
      this._editUnit(unit);
    };

    // 複製 SIDC
    const copySidcItem = document.createElement('div');
    copySidcItem.className = 'context-menu-item';
    copySidcItem.innerHTML = '<span class="menu-icon">📋</span> 複製 SIDC';
    copySidcItem.onclick = () => {
      this._hideContextMenu();
      navigator.clipboard.writeText(unit.sidc);
      // 顯示提示
      this._showToast('SIDC 已複製到剪貼板');
    };

    // 移到頂層
    if (unit.parentId) {
      const moveToTopItem = document.createElement('div');
      moveToTopItem.className = 'context-menu-item';
      moveToTopItem.innerHTML = '<span class="menu-icon">⬆️</span> 移到頂層';
      moveToTopItem.onclick = () => {
        this._hideContextMenu();
        this.eventBus.emit('ui:move-unit', {
          uuid: unit.uuid,
          newParentId: null
        });
      };
      this.contextMenu.appendChild(moveToTopItem);
    }

    // 刪除
    const deleteItem = document.createElement('div');
    deleteItem.className = 'context-menu-item danger';
    deleteItem.innerHTML = '<span class="menu-icon">🗑️</span> 刪除';
    deleteItem.onclick = () => {
      this._hideContextMenu();
      this._deleteUnit(unit, node);
    };

    this.contextMenu.appendChild(addChildItem);
    this.contextMenu.appendChild(editItem);
    this.contextMenu.appendChild(copySidcItem);
    this.contextMenu.appendChild(deleteItem);

    document.body.appendChild(this.contextMenu);

    // 定位選單
    const rect = this.contextMenu.getBoundingClientRect();
    let x = e.clientX;
    let y = e.clientY;

    // 確保不超出視窗
    if (x + rect.width > window.innerWidth) {
      x = window.innerWidth - rect.width - 10;
    }
    if (y + rect.height > window.innerHeight) {
      y = window.innerHeight - rect.height - 10;
    }

    this.contextMenu.style.left = x + 'px';
    this.contextMenu.style.top = y + 'px';

    // 點擊其他地方關閉選單
    setTimeout(() => {
      document.addEventListener('click', this._hideContextMenu.bind(this), { once: true });
    }, 0);
  }

  /**
   * 隱藏右鍵選單
   */
  _hideContextMenu() {
    if (this.contextMenu) {
      this.contextMenu.remove();
      this.contextMenu = null;
    }
  }

  /**
   * 新增子單位
   */
  _addChildUnit(parentUnit) {
    // 切換到符號編輯器並預設上級單位
    const symbolEditorTab = document.querySelector('.tab-btn[data-tab="symbol-editor"]');
    if (symbolEditorTab) {
      symbolEditorTab.click();
    }

    // 觸發事件通知符號編輯器預設上級單位
    this.eventBus.emit('symbol-editor:set-parent-unit', { parentId: parentUnit.uuid, parentName: parentUnit.name });
  }

  /**
   * 編輯單位
   */
  _editUnit(unit) {
    this._showEditDialog(unit);
  }

  /**
   * 顯示編輯對話框
   */
  _showEditDialog(unit) {
    const dialog = document.createElement('div');
    dialog.className = 'orbat-add-dialog-overlay';
    dialog.innerHTML = `
      <div class="orbat-add-dialog">
        <div class="dialog-header">
          <h3>編輯單位</h3>
          <button class="dialog-close-btn" id="dialog-close-btn">&times;</button>
        </div>
        <div class="dialog-body">
          <div class="dialog-preview">
            <canvas id="dialog-preview-canvas" width="100" height="100"></canvas>
          </div>
          <div class="dialog-form">
            <div class="form-group">
              <label for="edit-unit-name">單位名稱 *</label>
              <input type="text" id="edit-unit-name" class="form-input" value="${unit.name}">
            </div>
            <div class="form-group">
              <label for="edit-unit-callsign">呼號</label>
              <input type="text" id="edit-unit-callsign" class="form-input" value="${unit.callsign || ''}">
            </div>
          </div>
        </div>
        <div class="dialog-footer">
          <button class="dialog-btn secondary" id="dialog-cancel-btn">取消</button>
          <button class="dialog-btn primary" id="dialog-save-btn">儲存</button>
        </div>
      </div>
    `;

    document.body.appendChild(dialog);

    // 繪製預覽
    setTimeout(() => {
      const previewCanvas = document.getElementById('dialog-preview-canvas');
      if (previewCanvas && window.ms) {
        const ctx = previewCanvas.getContext('2d');
        const symbol = new window.ms.Symbol(unit.sidc, { size: 80 });
        const symbolCanvas = symbol.asCanvas();
        if (symbolCanvas) {
          const x = (100 - symbolCanvas.width) / 2;
          const y = (100 - symbolCanvas.height) / 2;
          ctx.drawImage(symbolCanvas, x, y);
        }
      }
    }, 0);

    // 關閉對話框
    const closeDialog = () => {
      dialog.remove();
    };

    document.getElementById('dialog-close-btn').addEventListener('click', closeDialog);
    document.getElementById('dialog-cancel-btn').addEventListener('click', closeDialog);

    // 儲存
    document.getElementById('dialog-save-btn').addEventListener('click', () => {
      const name = document.getElementById('edit-unit-name').value.trim();
      const callsign = document.getElementById('edit-unit-callsign').value.trim();

      if (!name) {
        alert('請輸入單位名稱');
        return;
      }

      // 觸發更新事件
      this.eventBus.emit('ui:update-unit', {
        uuid: unit.uuid,
        updates: { name, callsign }
      });

      closeDialog();
    });

    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) closeDialog();
    });
  }

  /**
   * 刪除單位
   */
  _deleteUnit(unit, node) {
    const confirmMsg = unit.children && unit.children.length > 0
      ? `確定要刪除「${unit.name}」及其所有下級單位嗎？`
      : `確定要刪除「${unit.name}」嗎？`;

    if (confirm(confirmMsg)) {
      this.eventBus.emit('ui:delete-unit', { uuid: unit.uuid });
    }
  }

  /**
   * 顯示提示
   */
  _showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'orbat-toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('show');
    }, 0);

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }

  /**
   * 銷毀
   */
  dispose() {
    this._hideContextMenu();
    this.container.innerHTML = '';
    this.unitMap.clear();
  }
}
