class TimerMotionCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.timerInterval = null;
    this.remainingTime = 0;
    this.motionState = null;
    this.motionListener = null;
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
    };
  }

  setConfig(config) {
    if (!config.entity) {
      throw new Error('Entity is required');
    }

    this.config = {
      ...TimerMotionCard.getStubConfig(),
      ...config,
    };

    this.render();
    this.setupEventListeners();
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();
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
    // Listen to entity state changes
    const entityId = this.config.entity;
    if (entityId) {
      this.hass.connection.subscribeEvents(
        (ev) => {
          if (ev.data.entity_id === entityId) {
            this.updateEntityState();
          }
        },
        'state_changed'
      );
    }

    // Listen to motion sensor if enabled
    if (this.config.motion_enabled && this.config.motion_sensor) {
      this.motionListener = this.hass.connection.subscribeEvents(
        (ev) => {
          if (ev.data.entity_id === this.config.motion_sensor) {
            this.handleMotionChange(ev.data.new_state);
          }
        },
        'state_changed'
      );
    }

    // Update timer display every second
    if (this.config.timer_enabled) {
      this.timerInterval = setInterval(() => {
        this.updateTimer();
      }, 1000);
    }
  }

  handleMotionChange(newState) {
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
        const currentMotionState = this.hass.states[this.config.motion_sensor];
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
      const entity = this.hass.states[this.config.entity];
      if (entity && entity.state === 'on') {
        this.callService('turn_off', this.config.entity);
      }
      this.remainingTime = -1;
    }
  }

  updateTimerDisplay() {
    const timerElement = this.shadowRoot.querySelector('.timer-display');
    if (timerElement) {
      const minutes = Math.floor(this.remainingTime / 60);
      const seconds = this.remainingTime % 60;
      timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      timerElement.style.display = this.remainingTime > 0 ? 'block' : 'none';
    }
  }

  updateEntityState() {
    const entity = this.hass.states[this.config.entity];
    if (!entity) return;

    const stateElement = this.shadowRoot.querySelector('.entity-state');
    const iconElement = this.shadowRoot.querySelector('.entity-icon');
    
    if (stateElement) {
      stateElement.textContent = entity.state === 'on' ? 'ON' : 'OFF';
      stateElement.className = `entity-state ${entity.state}`;
    }

    if (iconElement) {
      const icon = this.config.icon || entity.attributes.icon || 'mdi:lightbulb';
      iconElement.innerHTML = `<ha-icon icon="${icon}"></ha-icon>`;
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
    const domain = entityId.split('.')[0];
    this.hass.callService(domain, service, { entity_id: entityId });
  }

  toggleEntity() {
    const entity = this.hass.states[this.config.entity];
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

  formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  render() {
    if (!this.hass) return;

    const entity = this.hass.states[this.config.entity];
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

    // Calculate timer display
    let timerHtml = '';
    if (this.config.timer_enabled && this.remainingTime > 0) {
      timerHtml = `
        <div class="timer-display">
          <ha-icon icon="mdi:timer"></ha-icon>
          <span>${this.formatTime(this.remainingTime)}</span>
        </div>
      `;
    }

    // Motion sensor status
    let motionHtml = '';
    if (this.config.motion_enabled && this.config.motion_sensor) {
      const motionEntity = this.hass.states[this.config.motion_sensor];
      const motionActive = motionEntity && 
        (motionEntity.state === 'on' || motionEntity.state === 'detected');
      motionHtml = `
        <div class="motion-status ${motionActive ? 'active' : ''}">
          <ha-icon icon="mdi:motion-sensor"></ha-icon>
          <span>${motionActive ? 'Motion' : 'No Motion'}</span>
        </div>
      `;
    }

    this.shadowRoot.innerHTML = `
      <style>
        ha-card {
          padding: 16px;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        ha-card:hover {
          background-color: var(--card-background-color, rgba(0,0,0,0.05));
        }
        .card-content {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .entity-header {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .entity-icon {
          font-size: 32px;
          color: var(--primary-color, #03a9f4);
        }
        .entity-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .entity-name {
          font-size: 16px;
          font-weight: 500;
        }
        .entity-state {
          font-size: 14px;
          font-weight: 400;
          text-transform: uppercase;
        }
        .entity-state.on {
          color: var(--success-color, #4caf50);
        }
        .entity-state.off {
          color: var(--disabled-color, #9e9e9e);
        }
        .timer-display {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background-color: var(--warning-color, rgba(255, 152, 0, 0.1));
          border-radius: 8px;
          font-size: 18px;
          font-weight: 600;
          color: var(--warning-text-color, #ff9800);
        }
        .motion-status {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background-color: var(--info-color, rgba(33, 150, 243, 0.1));
          border-radius: 8px;
          font-size: 14px;
        }
        .motion-status.active {
          background-color: var(--success-color, rgba(76, 175, 80, 0.1));
          color: var(--success-text-color, #4caf50);
        }
        .error {
          color: var(--error-color, #f44336);
          padding: 16px;
        }
        ha-icon {
          width: 24px;
          height: 24px;
        }
      </style>
      <ha-card>
        <div class="card-content">
          <div class="entity-header">
            ${this.config.show_icon ? `<div class="entity-icon"><ha-icon icon="${icon}"></ha-icon></div>` : ''}
            <div class="entity-info">
              ${this.config.show_name ? `<div class="entity-name">${name}</div>` : ''}
              <div class="entity-state ${isOn ? 'on' : 'off'}">${isOn ? 'ON' : 'OFF'}</div>
            </div>
          </div>
          ${timerHtml}
          ${motionHtml}
        </div>
      </ha-card>
    `;

    // Add click handler
    const card = this.shadowRoot.querySelector('ha-card');
    if (card) {
      card.addEventListener('click', () => this.toggleEntity());
    }

    this.updateEntityState();
  }

  set hass(hass) {
    this._hass = hass;
    this.render();
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

