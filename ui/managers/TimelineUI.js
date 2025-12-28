/**
 * UI 層 - 時間軸管理器
 * UI Layer - Timeline Manager
 * 負責：時間軸渲染、播放控制
 */

export class TimelineUI {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.isPlaying = false;
    this.playbackSpeed = 1;
    this.currentTime = 0;
    this.totalTime = 600;
    this._setupEventListeners();
  }

  /**
   * 設定事件監聽
   */
  _setupEventListeners() {
    // 播放/暫停按鈕
    const playPauseBtn = document.getElementById('btn-play-pause');
    if (playPauseBtn) {
      playPauseBtn.addEventListener('click', () => this._togglePlayPause());
    }

    // 速度按鈕
    const speedButtons = document.querySelectorAll('.speed-button');
    speedButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const speed = parseFloat(btn.dataset.speed);
        this._setPlaybackSpeed(speed);
      });
    });

    // 時間軸滑桿（預留拖拽功能）
    const slider = document.getElementById('timeline-slider');
    if (slider) {
      // TODO: 實現拖拽
    }
  }

  /**
   * 切換播放/暫停
   */
  _togglePlayPause() {
    this.isPlaying = !this.isPlaying;

    const btn = document.getElementById('btn-play-pause');
    if (btn) {
      if (this.isPlaying) {
        btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="3" y="3" width="3" height="8"/><rect x="8" y="3" width="3" height="8"/></svg>';
      } else {
        btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><path d="M4 3l8 4-8 4V3z"/></svg>';
      }
    }

    this.eventBus.emit('ui:playback:toggled', { isPlaying: this.isPlaying });
  }

  /**
   * 設定播放速度
   */
  _setPlaybackSpeed(speed) {
    this.playbackSpeed = speed;

    // 更新 UI 狀態
    document.querySelectorAll('.speed-button').forEach(btn => {
      btn.classList.toggle('active', parseFloat(btn.dataset.speed) === speed);
    });

    this.eventBus.emit('ui:playback:speed', { speed });
  }

  /**
   * 更新時間顯示
   */
  updateTime(currentTime, totalTime) {
    this.currentTime = currentTime;
    this.totalTime = totalTime;

    const progress = (currentTime / totalTime) * 100;

    // 更新進度條
    const progressBar = document.getElementById('timeline-progress');
    if (progressBar) {
      progressBar.style.width = `${progress}%`;
    }

    const thumb = document.getElementById('timeline-thumb');
    if (thumb) {
      thumb.style.left = `${progress}%`;
    }

    // 更新時間文字
    const currentEl = document.getElementById('current-time');
    if (currentEl) {
      currentEl.textContent = this._formatTime(currentTime);
    }

    const totalEl = document.getElementById('total-time');
    if (totalEl) {
      totalEl.textContent = this._formatTime(totalTime);
    }
  }

  /**
   * 格式化時間（秒 → MM:SS）
   */
  _formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * 銷毀
   */
  dispose() {
    const playPauseBtn = document.getElementById('btn-play-pause');
    if (playPauseBtn) {
      playPauseBtn.replaceWith(playPauseBtn.cloneNode(true));
    }

    const speedButtons = document.querySelectorAll('.speed-button');
    speedButtons.forEach(btn => {
      btn.replaceWith(btn.cloneNode(true));
    });
  }
}
