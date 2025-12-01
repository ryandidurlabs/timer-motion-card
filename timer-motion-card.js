class TimerMotionCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.timerInterval = null;
    this.remainingTime = 0;
    this.motionState = null;
    this.motionListener = null;
    this.settingsOpen = false;
  }

  static getConfigElement() {
    return document.createElement('timer-motion-card-editor');
  }

  static getStubConfig() {
    return {
      type: 'custom:timer-motion-card',
      entity: '',
      name: '',
      timer_enabled: false,
      timer_duration: 300, // 5 minutes default
      motion_enabled: false,
      motion_sensor: '',
      motion_off_delay: 60, // 1 minute default
      icon: '',
      show_icon: true,
      show_name: true,
      width: '',
      height: '',
      show_brightness: true,
    };
  }

  setConfig(config) {
    if (!config.entity) {
      throw new Error('Entity is required');
    }

    // Load saved settings from localStorage
    const savedSettings = this.loadSettings(config.entity);
    
    this.config = {
      ...TimerMotionCard.getStubConfig(),
      ...config,
      ...savedSettings, // Override with saved settings
    };

    if (this._hass) {
      this.render();
      this.setupEventListeners();
    }
  }

  loadSettings(entityId) {
    try {
      const key = `timer_motion_card_${entityId}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Timer Motion Card: Error loading settings', e);
    }
    return {};
  }

  saveSettings() {
    try {
      const key = `timer_motion_card_${this.config.entity}`;
      const settingsToSave = {
        name: this.config.name,
        entity: this.config.entity,
        icon: this.config.icon,
        width: this.config.width,
        height: this.config.height,
        show_brightness: this.config.show_brightness,
        timer_enabled: this.config.timer_enabled,
        timer_duration: this.config.timer_duration,
        motion_enabled: this.config.motion_enabled,
        motion_sensor: this.config.motion_sensor,
        motion_off_delay: this.config.motion_off_delay,
      };
      localStorage.setItem(key, JSON.stringify(settingsToSave));
    } catch (e) {
      console.warn('Timer Motion Card: Error saving settings', e);
    }
  }

  openSettings(e) {
    e.stopPropagation(); // Prevent card toggle
    this.settingsOpen = true;
    this.render();
  }

  closeSettings() {
    this.settingsOpen = false;
    const modal = this.shadowRoot.querySelector('.settings-modal');
    if (modal) {
      modal.remove();
    }
  }

  updateSetting(key, value) {
    const oldEntity = this.config.entity;
    this.config[key] = value;
    
    // If entity changed, migrate settings
    if (key === 'entity' && value !== oldEntity && oldEntity) {
      const oldSettings = this.loadSettings(oldEntity);
      const newKey = `timer_motion_card_${value}`;
      try {
        localStorage.setItem(newKey, JSON.stringify({...oldSettings, entity: value}));
        // Update config with migrated settings
        this.config = {...this.config, ...oldSettings, entity: value};
      } catch (e) {
        console.warn('Timer Motion Card: Error migrating settings', e);
      }
    }
    
    this.saveSettings();
    this.setupEventListeners(); // Re-setup listeners if motion/timer/entity changed
    this.render();
  }

  connectedCallback() {
    if (this._hass) {
      this.render();
      this.setupEventListeners();
    }
  }

  disconnectedCallback() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    if (this.motionListener) {
      this.motionListener();
    }
  }

  setupEventListeners() {
    // Don't setup if hass is not available
    if (!this._hass || !this._hass.connection) {
      return;
    }

    // Clean up existing listeners
    if (this.motionListener) {
      this.motionListener();
      this.motionListener = null;
    }

    // Listen to entity state changes
    const entityId = this.config.entity;
    if (entityId && this._hass.connection) {
      try {
        this._hass.connection.subscribeEvents(
          (ev) => {
            if (ev.data && ev.data.entity_id === entityId) {
              this.updateEntityState();
            }
          },
          'state_changed'
        );
      } catch (e) {
        console.warn('Timer Motion Card: Error subscribing to entity state changes', e);
      }
    }

    // Listen to motion sensor if enabled
    if (this.config.motion_enabled && this.config.motion_sensor && this._hass.connection) {
      try {
        this.motionListener = this._hass.connection.subscribeEvents(
          (ev) => {
            if (ev.data && ev.data.entity_id === this.config.motion_sensor) {
              this.handleMotionChange(ev.data.new_state);
            }
          },
          'state_changed'
        );
      } catch (e) {
        console.warn('Timer Motion Card: Error subscribing to motion sensor', e);
      }
    }

    // Update timer display every second
    if (this.config.timer_enabled) {
      if (this.timerInterval) {
        clearInterval(this.timerInterval);
      }
      this.timerInterval = setInterval(() => {
        this.updateTimer();
      }, 1000);
    }
  }

  handleMotionChange(newState) {
    if (!newState) return;
    
    const isMotion = newState.state === 'on' || newState.state === 'detected';
    
    if (isMotion) {
      // Turn on the light/fan
      this.callService('turn_on', this.config.entity);
      
      // If timer is enabled, start/reset it
      if (this.config.timer_enabled) {
        this.startTimer();
      }
    } else {
      // Motion cleared - wait for delay then turn off
      setTimeout(() => {
        if (!this._hass || !this._hass.states) return;
        const currentMotionState = this._hass.states[this.config.motion_sensor];
        if (currentMotionState && 
            (currentMotionState.state === 'off' || currentMotionState.state === 'unavailable')) {
          this.callService('turn_off', this.config.entity);
        }
      }, this.config.motion_off_delay * 1000);
    }
  }

  startTimer() {
    this.remainingTime = this.config.timer_duration;
    this.updateTimer();
  }

  updateTimer() {
    if (this.remainingTime > 0) {
      this.remainingTime--;
      this.updateTimerDisplay();
    } else if (this.remainingTime === 0 && this.config.timer_enabled) {
      // Timer expired - turn off entity
      if (this._hass && this._hass.states) {
        const entity = this._hass.states[this.config.entity];
        if (entity && entity.state === 'on') {
          this.callService('turn_off', this.config.entity);
        }
      }
      this.remainingTime = -1;
    }
  }

  updateTimerDisplay() {
    const brightnessValue = this.shadowRoot.querySelector('.brightness-value');
    if (brightnessValue) {
      const entity = this._hass?.states?.[this.config.entity];
      if (entity && entity.attributes.brightness !== undefined) {
        const brightnessPct = Math.round((entity.attributes.brightness / 255) * 100);
        const timerText = (this.config.timer_enabled && this.remainingTime > 0) 
          ? `<span class="timer-text"> • ${this.formatTime(this.remainingTime)}</span>` 
          : '';
        brightnessValue.innerHTML = `${brightnessPct}%${timerText}`;
      } else {
        // If no brightness, just update timer if it exists
        const timerSpan = brightnessValue.querySelector('.timer-text');
        if (timerSpan) {
          if (this.remainingTime > 0) {
            timerSpan.textContent = ` • ${this.formatTime(this.remainingTime)}`;
            timerSpan.style.display = 'inline';
          } else {
            timerSpan.style.display = 'none';
          }
        }
      }
    }
  }

  updateEntityState() {
    if (!this._hass || !this._hass.states) return;
    
    const entity = this._hass.states[this.config.entity];
    if (!entity) return;

    const stateElement = this.shadowRoot.querySelector('.entity-state');
    const iconElement = this.shadowRoot.querySelector('.entity-icon');
    const motionIcon = this.shadowRoot.querySelector('.motion-icon-header');
    const brightnessValue = this.shadowRoot.querySelector('.brightness-value');
    
    if (stateElement) {
      stateElement.textContent = entity.state === 'on' ? 'ON' : 'OFF';
    }

    // Update motion icon state
    if (motionIcon && this.config.motion_enabled && this.config.motion_sensor) {
      const motionEntity = this._hass.states[this.config.motion_sensor];
      const motionActive = motionEntity && 
        (motionEntity.state === 'on' || motionEntity.state === 'detected');
      if (motionActive) {
        motionIcon.classList.add('active');
      } else {
        motionIcon.classList.remove('active');
      }
    }

    // Update brightness and timer display
    if (brightnessValue && entity.attributes.brightness !== undefined) {
      const brightnessPct = Math.round((entity.attributes.brightness / 255) * 100);
      const timerText = (this.config.timer_enabled && this.remainingTime > 0) 
        ? `<span class="timer-text"> • ${this.formatTime(this.remainingTime)}</span>` 
        : '';
      brightnessValue.innerHTML = `${brightnessPct}%${timerText}`;
    }

    // If entity turns on and timer is enabled, start timer
    if (entity.state === 'on' && this.config.timer_enabled && this.remainingTime <= 0) {
      this.startTimer();
    }

    // If entity turns off, reset timer
    if (entity.state === 'off') {
      this.remainingTime = 0;
      this.updateTimerDisplay();
    }
  }

  callService(service, entityId) {
    if (!this._hass) return;
    const domain = entityId.split('.')[0];
    this._hass.callService(domain, service, { entity_id: entityId });
  }

  toggleEntity(e) {
    // Don't toggle if clicking on settings button, modal, or brightness slider
    if (e && (e.target.closest('.settings-button') || 
              e.target.closest('.settings-modal') ||
              e.target.closest('.brightness-container') ||
              e.target.closest('ha-slider'))) {
      return;
    }
    
    if (!this._hass || !this._hass.states) return;
    
    const entity = this._hass.states[this.config.entity];
    if (!entity) return;

    if (entity.state === 'on') {
      this.callService('turn_off', this.config.entity);
    } else {
      this.callService('turn_on', this.config.entity);
      if (this.config.timer_enabled) {
        this.startTimer();
      }
    }
  }

  setBrightness(value) {
    if (!this._hass) return;
    const brightness = Math.round((parseInt(value) / 100) * 255);
    const domain = this.config.entity.split('.')[0];
    this._hass.callService(domain, 'turn_on', {
      entity_id: this.config.entity,
      brightness: brightness,
    });
  }

  formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  render() {
    if (!this._hass || !this._hass.states) return;

    const entity = this._hass.states[this.config.entity];
    if (!entity) {
      this.shadowRoot.innerHTML = `
        <ha-card>
          <div class="error">Entity not found: ${this.config.entity}</div>
        </ha-card>
      `;
      return;
    }

    const isOn = entity.state === 'on';
    const icon = this.config.icon || entity.attributes.icon || 'mdi:lightbulb';
    const name = this.config.name || entity.attributes.friendly_name || entity.entity_id;
    const brightness = entity.attributes.brightness || 0;
    const brightnessPct = Math.round((brightness / 255) * 100);
    const supportsBrightness = 'brightness' in entity.attributes;
    const showBrightness = this.config.show_brightness && supportsBrightness && isOn;
    
    // Get color for icon (like Mushroom cards)
    const rgbColor = entity.attributes.rgb_color || null;
    const colorTemp = entity.attributes.color_temp || null;
    let iconColor = 'var(--mush-rgb, var(--rgb-disabled-rgb))';
    if (isOn && rgbColor) {
      iconColor = `rgb(${rgbColor.join(',')})`;
    } else if (isOn && colorTemp) {
      // Approximate color temp to RGB (simplified)
      const temp = colorTemp;
      let r, g, b;
      if (temp <= 66) {
        r = 255;
        g = temp;
        g = 99.4708025861 * Math.log(g) - 161.1195681661;
        b = temp <= 19 ? 0 : temp - 10;
        b = 138.5177312231 * Math.log(b) - 305.0447927307;
      } else {
        r = temp - 60;
        r = 329.698727446 * Math.pow(r, -0.1332047592);
        g = temp - 60;
        g = 288.1221695283 * Math.pow(g, -0.0755148492);
        b = 255;
      }
      r = Math.max(0, Math.min(255, r));
      g = Math.max(0, Math.min(255, g));
      b = Math.max(0, Math.min(255, b));
      iconColor = `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
    } else if (isOn) {
      iconColor = 'var(--mush-rgb, var(--rgb-state-light-on-rgb, 255, 184, 0))';
    }

    // Timer countdown text (for brightness label)
    const timerText = (this.config.timer_enabled && this.remainingTime > 0) 
      ? ` • ${this.formatTime(this.remainingTime)}` 
      : '';

    // Motion sensor status
    const motionActive = this.config.motion_enabled && this.config.motion_sensor && this._hass.states
      ? (() => {
          const motionEntity = this._hass.states[this.config.motion_sensor];
          return motionEntity && (motionEntity.state === 'on' || motionEntity.state === 'detected');
        })()
      : false;

    const cardWidth = this.config.width ? `width: ${this.config.width};` : '';
    const cardHeight = this.config.height ? `height: ${this.config.height};` : '';
    const cardBoxSizing = (this.config.width || this.config.height) ? 'box-sizing: border-box;' : '';

    this.shadowRoot.innerHTML = `
      <style>
        ha-card {
          padding: 0;
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
          border-radius: var(--mush-border-radius, 12px);
          overflow: hidden;
          ${cardWidth}
          ${cardHeight}
          ${cardBoxSizing}
        }
        .card-content {
          display: flex;
          flex-direction: column;
          background: var(--card-background-color, var(--mush-card-background, #fff));
          border-radius: var(--mush-border-radius, 12px);
        }
        .card-header {
          position: relative;
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .settings-button {
          position: absolute;
          top: 8px;
          right: 8px;
          cursor: pointer;
          padding: 8px;
          color: var(--secondary-text-color, rgba(0,0,0,0.54));
          transition: color 0.2s;
          z-index: 10;
          border-radius: 50%;
          background: var(--card-background-color, rgba(255,255,255,0.8));
        }
        .settings-button:hover {
          color: var(--primary-color, #03a9f4);
          background: var(--card-background-color, rgba(255,255,255,0.95));
        }
        .settings-button ha-icon {
          width: 18px;
          height: 18px;
        }
        .entity-icon-container {
          position: relative;
          width: 48px;
          height: 48px;
          border-radius: var(--mush-icon-border-radius, 50%);
          background: ${isOn ? `rgba(${iconColor.replace('rgb(', '').replace(')', '')}, 0.2)` : 'var(--mush-icon-bg, rgba(0,0,0,0.05))'};
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: all 0.2s;
        }
        .entity-icon {
          font-size: 24px;
          color: ${isOn ? iconColor : 'var(--mush-icon-color, rgba(0,0,0,0.54))'};
          transition: all 0.2s;
        }
        .entity-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 0;
        }
        .entity-name {
          font-size: 14px;
          font-weight: 500;
          color: var(--primary-text-color, rgba(0,0,0,0.87));
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .entity-state {
          font-size: 12px;
          font-weight: 400;
          color: ${isOn ? 'var(--mush-state-color, var(--primary-color, #03a9f4))' : 'var(--secondary-text-color, rgba(0,0,0,0.54))'};
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .brightness-container {
          padding: 0 16px 16px 16px;
          display: ${showBrightness ? 'block' : 'none'};
        }
        .brightness-slider {
          width: 100%;
          --paper-slider-active-color: ${iconColor};
          --paper-slider-secondary-color: rgba(${iconColor.replace('rgb(', '').replace(')', '')}, 0.2);
        }
        .brightness-label {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
          font-size: 12px;
          color: var(--secondary-text-color, rgba(0,0,0,0.54));
        }
        .brightness-value {
          font-weight: 500;
          color: var(--primary-text-color, rgba(0,0,0,0.87));
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .timer-text {
          font-weight: 500;
          color: var(--mush-warning-text-color, #ff9800);
        }
        .motion-icon-header {
          display: inline-flex;
          align-items: center;
          margin-left: 8px;
        }
        .motion-icon-header.active {
          color: var(--mush-success-text-color, #4caf50);
        }
        .motion-icon-header:not(.active) {
          color: var(--secondary-text-color, rgba(0,0,0,0.54));
        }
        .motion-icon-header ha-icon {
          width: 16px;
          height: 16px;
        }
        .error {
          color: var(--error-color, #f44336);
          padding: 16px;
        }
        ha-icon {
          width: 24px;
          height: 24px;
        }
        .settings-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .settings-dialog {
          background-color: var(--card-background-color, #fff);
          border-radius: 8px;
          padding: 24px;
          max-width: 500px;
          width: 90%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .settings-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .settings-title {
          font-size: 20px;
          font-weight: 500;
        }
        .settings-close {
          cursor: pointer;
          color: var(--secondary-text-color, rgba(0,0,0,0.54));
        }
        .settings-close:hover {
          color: var(--primary-color, #03a9f4);
        }
        .settings-section {
          margin-bottom: 20px;
        }
        .settings-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }
        .settings-label {
          flex: 1;
          font-size: 14px;
        }
        .settings-input {
          min-width: 150px;
        }
        .settings-select {
          min-width: 200px;
        }
        .settings-description {
          font-size: 12px;
          color: var(--secondary-text-color, rgba(0,0,0,0.54));
          margin-top: 4px;
        }
      </style>
      <ha-card>
        <div class="card-content">
          <div class="card-header">
            ${this.config.show_icon ? `
              <div class="entity-icon-container">
                <ha-icon class="entity-icon" icon="${icon}"></ha-icon>
              </div>
            ` : ''}
            <div class="entity-info">
              ${this.config.show_name ? `<div class="entity-name">${name}${this.config.motion_enabled ? `<span class="motion-icon-header ${motionActive ? 'active' : ''}"><ha-icon icon="mdi:motion-sensor"></ha-icon></span>` : ''}</div>` : ''}
              <div class="entity-state">${isOn ? 'ON' : 'OFF'}</div>
            </div>
            <div class="settings-button">
              <ha-icon icon="mdi:cog"></ha-icon>
            </div>
          </div>
          ${showBrightness ? `
            <div class="brightness-container">
              <div class="brightness-label">
                <span>Brightness</span>
                <span class="brightness-value">${brightnessPct}%<span class="timer-text">${timerText}</span></span>
              </div>
              <ha-slider
                class="brightness-slider"
                min="0"
                max="100"
                step="1"
                value="${brightnessPct}"
                pin
                @change="${(e) => this.setBrightness(e.target.value)}"
                @click="${(e) => e.stopPropagation()}"
              ></ha-slider>
            </div>
          ` : ''}
        </div>
      </ha-card>
    `;

    // Add click handler for card
    const card = this.shadowRoot.querySelector('ha-card');
    if (card) {
      card.addEventListener('click', (e) => this.toggleEntity(e));
    }

    // Add settings button handler
    const settingsBtn = this.shadowRoot.querySelector('.settings-button');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', (e) => this.openSettings(e));
    }

    // Add brightness slider handler
    const brightnessSlider = this.shadowRoot.querySelector('ha-slider');
    if (brightnessSlider) {
      brightnessSlider.addEventListener('change', (e) => {
        e.stopPropagation();
        this.setBrightness(e.target.value);
      });
      brightnessSlider.addEventListener('click', (e) => e.stopPropagation());
    }

    // Render settings modal if open
    if (this.settingsOpen) {
      this.renderSettingsModal();
    }

    this.updateEntityState();
  }

  renderSettingsModal() {
    // Remove existing modal if any
    const existingModal = this.shadowRoot.querySelector('.settings-modal');
    if (existingModal) {
      existingModal.remove();
    }

    const motionSensors = this.getMotionSensors();
    const availableEntities = this.getAvailableEntities();
    const modal = document.createElement('div');
    modal.className = 'settings-modal';
    modal.innerHTML = `
      <div class="settings-dialog">
        <div class="settings-header">
          <div class="settings-title">Settings</div>
          <div class="settings-close">
            <ha-icon icon="mdi:close"></ha-icon>
          </div>
        </div>
        <div class="settings-section">
          <div class="settings-row">
            <div class="settings-label">Name</div>
            <ha-textfield class="name-input settings-input" value="${this.config.name || ''}" placeholder="Card name"></ha-textfield>
          </div>
          <div class="settings-row">
            <div class="settings-label">Entity</div>
            <select class="entity-select settings-select" style="padding: 8px; border-radius: 4px; border: 1px solid var(--divider-color, rgba(0,0,0,0.12)); background: var(--card-background-color, #fff);">
              <option value="">Select entity...</option>
              ${availableEntities.map(entity => `<option value="${entity.entity_id}" ${entity.entity_id === this.config.entity ? 'selected' : ''}>${entity.name}</option>`).join('')}
            </select>
          </div>
          <div class="settings-row">
            <div class="settings-label">Icon</div>
            <ha-textfield class="icon-input settings-input" value="${this.config.icon || ''}" placeholder="mdi:lightbulb"></ha-textfield>
          </div>
          <div class="settings-row">
            <div class="settings-label">Card Width</div>
            <ha-textfield class="width-input settings-input" value="${this.config.width || ''}" placeholder="e.g. 200px, 50%"></ha-textfield>
          </div>
          <div class="settings-row">
            <div class="settings-label">Card Height</div>
            <ha-textfield class="height-input settings-input" value="${this.config.height || ''}" placeholder="e.g. 150px, auto"></ha-textfield>
          </div>
          <div class="settings-row">
            <div>
              <div class="settings-label">Show Brightness Slider</div>
              <div class="settings-description">Display brightness control for dimmable lights</div>
            </div>
            <ha-switch class="brightness-switch" ${this.config.show_brightness !== false ? 'checked' : ''}></ha-switch>
          </div>
        </div>
        <div class="settings-section">
          <div class="settings-row">
            <div>
              <div class="settings-label">Enable Timer</div>
              <div class="settings-description">Automatically turn off after duration</div>
            </div>
            <ha-switch class="timer-switch" ${this.config.timer_enabled ? 'checked' : ''}></ha-switch>
          </div>
          <div class="timer-duration-row" style="display: ${this.config.timer_enabled ? 'flex' : 'none'}">
            <div class="settings-label">Timer Duration (seconds)</div>
            <ha-textfield class="timer-duration-input settings-input" type="number" value="${this.config.timer_duration}"></ha-textfield>
          </div>
        </div>
        <div class="settings-section">
          <div class="settings-row">
            <div>
              <div class="settings-label">Enable Motion Sensor</div>
              <div class="settings-description">Automatically control based on motion</div>
            </div>
            <ha-switch class="motion-switch" ${this.config.motion_enabled ? 'checked' : ''}></ha-switch>
          </div>
          <div class="motion-settings-row" style="display: ${this.config.motion_enabled ? 'flex' : 'none'}; flex-direction: column; gap: 12px;">
            <div class="settings-row">
              <div class="settings-label">Motion Sensor</div>
              <select class="motion-sensor-select settings-select" style="padding: 8px; border-radius: 4px; border: 1px solid var(--divider-color, rgba(0,0,0,0.12)); background: var(--card-background-color, #fff);">
                <option value="">Select sensor...</option>
                ${motionSensors.map(sensor => `<option value="${sensor.entity_id}" ${sensor.entity_id === this.config.motion_sensor ? 'selected' : ''}>${sensor.name}</option>`).join('')}
              </select>
            </div>
            <div class="settings-row">
              <div class="settings-label">Motion Off Delay (seconds)</div>
              <ha-textfield class="motion-delay-input settings-input" type="number" value="${this.config.motion_off_delay}"></ha-textfield>
            </div>
          </div>
        </div>
      </div>
    `;

    // Add event listeners
    const closeBtn = modal.querySelector('.settings-close');
    closeBtn.addEventListener('click', () => this.closeSettings());

    const backdrop = modal;
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        this.closeSettings();
      }
    });

    const timerSwitch = modal.querySelector('.timer-switch');
    timerSwitch.addEventListener('change', (e) => {
      this.updateSetting('timer_enabled', e.target.checked);
      const durationRow = modal.querySelector('.timer-duration-row');
      durationRow.style.display = e.target.checked ? 'flex' : 'none';
    });

    const timerDurationInput = modal.querySelector('.timer-duration-input');
    timerDurationInput.addEventListener('change', (e) => {
      this.updateSetting('timer_duration', parseInt(e.target.value) || 300);
    });

    const motionSwitch = modal.querySelector('.motion-switch');
    motionSwitch.addEventListener('change', (e) => {
      this.updateSetting('motion_enabled', e.target.checked);
      const motionRow = modal.querySelector('.motion-settings-row');
      motionRow.style.display = e.target.checked ? 'flex' : 'none';
    });

    const motionSensorSelect = modal.querySelector('.motion-sensor-select');
    if (motionSensorSelect) {
      motionSensorSelect.addEventListener('change', (e) => {
        this.updateSetting('motion_sensor', e.target.value);
      });
    }

    const motionDelayInput = modal.querySelector('.motion-delay-input');
    motionDelayInput.addEventListener('change', (e) => {
      this.updateSetting('motion_off_delay', parseInt(e.target.value) || 60);
    });

    const nameInput = modal.querySelector('.name-input');
    if (nameInput) {
      nameInput.addEventListener('change', (e) => {
        this.updateSetting('name', e.target.value);
      });
    }

    const entitySelect = modal.querySelector('.entity-select');
    if (entitySelect) {
      entitySelect.addEventListener('change', (e) => {
        if (e.target.value) {
          this.updateSetting('entity', e.target.value);
        }
      });
    }

    const iconInput = modal.querySelector('.icon-input');
    if (iconInput) {
      iconInput.addEventListener('change', (e) => {
        this.updateSetting('icon', e.target.value);
      });
    }

    const widthInput = modal.querySelector('.width-input');
    if (widthInput) {
      widthInput.addEventListener('change', (e) => {
        this.updateSetting('width', e.target.value);
      });
    }

    const heightInput = modal.querySelector('.height-input');
    if (heightInput) {
      heightInput.addEventListener('change', (e) => {
        this.updateSetting('height', e.target.value);
      });
    }

    const brightnessSwitch = modal.querySelector('.brightness-switch');
    if (brightnessSwitch) {
      brightnessSwitch.addEventListener('change', (e) => {
        this.updateSetting('show_brightness', e.target.checked);
      });
    }

    this.shadowRoot.appendChild(modal);
  }

  getAvailableEntities() {
    if (!this._hass || !this._hass.states) return [];
    
    const entities = [];
    for (const [entityId, state] of Object.entries(this._hass.states)) {
      if (entityId.startsWith('light.') || entityId.startsWith('fan.') || 
          entityId.startsWith('switch.') || entityId.startsWith('input_boolean.')) {
        entities.push({
          entity_id: entityId,
          name: state.attributes.friendly_name || entityId,
        });
      }
    }
    return entities.sort((a, b) => a.name.localeCompare(b.name));
  }

  getMotionSensors() {
    if (!this._hass || !this._hass.states) return [];
    
    const sensors = [];
    for (const [entityId, state] of Object.entries(this._hass.states)) {
      if (entityId.startsWith('binary_sensor.') && 
          (state.attributes.device_class === 'motion' || 
           state.attributes.device_class === 'occupancy' ||
           entityId.toLowerCase().includes('motion'))) {
        sensors.push({
          entity_id: entityId,
          name: state.attributes.friendly_name || entityId,
        });
      }
    }
    return sensors.sort((a, b) => a.name.localeCompare(b.name));
  }

  set hass(hass) {
    this._hass = hass;
    if (this.config) {
      this.render();
      this.setupEventListeners();
    }
  }

  get hass() {
    return this._hass;
  }
}

customElements.define('timer-motion-card', TimerMotionCard);

// Card editor for Lovelace UI
class TimerMotionCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = config;
  }

  configChanged(newConfig) {
    const event = new CustomEvent('config-changed', {
      detail: { config: newConfig },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
  }

  connectedCallback() {
    this.render();
  }

  render() {
    if (!this._config) {
      this.innerHTML = '<div>Loading...</div>';
      return;
    }

    this.innerHTML = `
      <div class="card-config">
        <div class="config-row">
          <paper-input
            label="Entity"
            value="${this._config.entity || ''}"
            config-value="entity"
            placeholder="light.bedroom"
          ></paper-input>
        </div>
        <div class="config-row">
          <paper-input
            label="Name (optional)"
            value="${this._config.name || ''}"
            config-value="name"
          ></paper-input>
        </div>
        <div class="config-row">
          <ha-switch
            checked="${this._config.timer_enabled || false}"
            config-value="timer_enabled"
          ></ha-switch>
          <span>Enable Timer</span>
        </div>
        <div class="config-row">
          <paper-input
            label="Timer Duration (seconds)"
            value="${this._config.timer_duration || 300}"
            type="number"
            config-value="timer_duration"
          ></paper-input>
        </div>
        <div class="config-row">
          <ha-switch
            checked="${this._config.motion_enabled || false}"
            config-value="motion_enabled"
          ></ha-switch>
          <span>Enable Motion Sensor</span>
        </div>
        <div class="config-row">
          <paper-input
            label="Motion Sensor Entity"
            value="${this._config.motion_sensor || ''}"
            config-value="motion_sensor"
            placeholder="binary_sensor.motion_sensor"
          ></paper-input>
        </div>
        <div class="config-row">
          <paper-input
            label="Motion Off Delay (seconds)"
            value="${this._config.motion_off_delay || 60}"
            type="number"
            config-value="motion_off_delay"
          ></paper-input>
        </div>
        <div class="config-row">
          <paper-input
            label="Icon (optional)"
            value="${this._config.icon || ''}"
            config-value="icon"
            placeholder="mdi:lightbulb"
          ></paper-input>
        </div>
      </div>
    `;

    // Add event listeners
    const inputs = this.querySelectorAll('paper-input, ha-switch');
    inputs.forEach((input) => {
      const configValue = input.getAttribute('config-value');
      input.addEventListener('change', (e) => {
        const newConfig = { ...this._config };
        if (input.tagName === 'HA-SWITCH') {
          newConfig[configValue] = input.checked;
        } else {
          newConfig[configValue] = input.value;
        }
        this.configChanged(newConfig);
      });
    });
  }
}

customElements.define('timer-motion-card-editor', TimerMotionCardEditor);

