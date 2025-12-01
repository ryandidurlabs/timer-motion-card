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

  static getStubConfig(hass) {
    const entities = hass ? Object.keys(hass.states) : [];
    const lights = entities.filter((e) => 
      ['light', 'fan', 'switch', 'input_boolean'].includes(e.split('.')[0])
    );
    return {
      type: 'custom:timer-motion-card',
      entity: lights[0] || '',
      // Mushroom appearance options
      layout: 'default', // 'default' | 'horizontal' | 'vertical'
      fill_container: false,
      primary_info: 'name', // 'name' | 'state' | 'last-changed' | 'last-updated' | 'none'
      secondary_info: 'state', // 'name' | 'state' | 'last-changed' | 'last-updated' | 'none'
      icon_type: 'icon', // 'icon' | 'entity-picture' | 'none'
      // Mushroom action options
      tap_action: { action: 'toggle' },
      hold_action: { action: 'more-info' },
      double_tap_action: null,
      // Entity options
      name: '',
      icon: '',
      icon_color: '',
      use_light_color: true,
      // Control options (disabled by default)
      show_brightness_control: false,
      show_color_temp_control: false,
      show_color_control: false,
      collapsible_controls: false,
      // Timer and motion options
      timer_enabled: false,
      timer_duration: 300,
      default_brightness: null, // 0-100, null means use current/default
      motion_enabled: false,
      motion_sensor: '',
      motion_off_delay: 60,
      // Legacy options (kept for compatibility)
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
        icon_color: this.config.icon_color,
        use_light_color: this.config.use_light_color,
        layout: this.config.layout,
        fill_container: this.config.fill_container,
        primary_info: this.config.primary_info,
        secondary_info: this.config.secondary_info,
        icon_type: this.config.icon_type,
        show_brightness_control: this.config.show_brightness_control,
        show_color_temp_control: this.config.show_color_temp_control,
        show_color_control: this.config.show_color_control,
        collapsible_controls: this.config.collapsible_controls,
        width: this.config.width,
        height: this.config.height,
        timer_enabled: this.config.timer_enabled,
        timer_duration: this.config.timer_duration,
        default_brightness: this.config.default_brightness,
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
    if (e) {
      e.preventDefault();
      e.stopPropagation(); // Prevent card toggle
    }
    this.settingsOpen = true;
    this.render();
  }

  closeSettings(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
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
    // Only re-render if entity changed or motion/timer state changed (not for every setting)
    if (key === 'entity' || key === 'motion_enabled' || key === 'timer_enabled') {
      this.render();
    } else {
      // Just update the display without full re-render
      this.updateEntityState();
    }
  }

  connectedCallback() {
    if (this._hass) {
      this.render();
      // Check for existing timer when page loads
      if (this.config && this.config.timer_enabled && this.config.entity && this._hass.states) {
        const entity = this._hass.states[this.config.entity];
        if (entity && entity.state === 'on') {
          // Calculate remaining time from stored expiration
          this.calculateRemainingTime();
          if (this.remainingTime > 0) {
            // Timer is still active - start the interval
            if (!this.timerInterval) {
              this.timerInterval = setInterval(() => {
                this.updateTimer();
              }, 1000);
            }
            this.updateTimerDisplay();
          } else if (this.remainingTime <= 0) {
            // Timer expired while page was closed - turn off light
            this.callService('turn_off', this.config.entity);
            const timerKey = `timer_expiration_${this.config.entity}`;
            localStorage.removeItem(timerKey);
            localStorage.removeItem(`timer_start_${this.config.entity}`);
            this.remainingTime = 0;
          }
        } else {
          // Light is off - clear any timer data
          const timerKey = `timer_expiration_${this.config.entity}`;
          localStorage.removeItem(timerKey);
          localStorage.removeItem(`timer_start_${this.config.entity}`);
          this.remainingTime = 0;
        }
      }
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

    // Timer interval is managed by startTimer() method
    // Only start timer if entity is already on and no timer is running
    if (this.config.timer_enabled && this._hass && this._hass.states) {
      const entity = this._hass.states[this.config.entity];
      if (entity && entity.state === 'on') {
        this.calculateRemainingTime();
        if (this.remainingTime <= 0) {
          // No active timer - start one
          this.startTimer();
        } else {
          // Timer already running - just start the display interval
          if (!this.timerInterval) {
            this.timerInterval = setInterval(() => {
              this.updateTimer();
            }, 1000);
          }
          this.updateTimerDisplay();
        }
      }
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
    if (!this.config || !this.config.timer_enabled || !this._hass) return;
    try {
      const duration = this.config.timer_duration || 300;
      
      // Clear any existing interval
      if (this.timerInterval) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
      }
      
      // Store timer start time using entity's last_changed as reference
      // This way it persists across page reloads
      const entity = this._hass.states[this.config.entity];
      if (entity && entity.last_changed) {
        const startTime = new Date(entity.last_changed).getTime();
        const expirationTime = startTime + (duration * 1000);
        const timerKey = `timer_expiration_${this.config.entity}`;
        localStorage.setItem(timerKey, expirationTime.toString());
        localStorage.setItem(`timer_start_${this.config.entity}`, startTime.toString());
      }
      
      // Calculate initial remaining time
      this.calculateRemainingTime();
      this.updateTimerDisplay();
      
      // Start the countdown interval for display
      this.timerInterval = setInterval(() => {
        this.updateTimer();
      }, 1000);
    } catch (error) {
      console.error('Timer Motion Card: Error starting timer', error);
    }
  }

  calculateRemainingTime() {
    if (!this.config || !this.config.entity || !this._hass) {
      this.remainingTime = 0;
      return;
    }
    
    try {
      const timerKey = `timer_expiration_${this.config.entity}`;
      const expirationTimeStr = localStorage.getItem(timerKey);
      
      if (expirationTimeStr) {
        const expirationTime = parseInt(expirationTimeStr, 10);
        const now = Date.now();
        const remaining = Math.max(0, Math.floor((expirationTime - now) / 1000));
        this.remainingTime = remaining;
      } else {
        // No stored timer - check if entity was just turned on
        const entity = this._hass.states[this.config.entity];
        if (entity && entity.state === 'on' && entity.last_changed) {
          const startTime = new Date(entity.last_changed).getTime();
          const duration = this.config.timer_duration || 300;
          const expirationTime = startTime + (duration * 1000);
          const now = Date.now();
          
          if (now < expirationTime) {
            // Timer should be running
            const remaining = Math.floor((expirationTime - now) / 1000);
            this.remainingTime = remaining;
            // Store it for future reference
            localStorage.setItem(timerKey, expirationTime.toString());
            localStorage.setItem(`timer_start_${this.config.entity}`, startTime.toString());
          } else {
            // Timer should have expired
            this.remainingTime = 0;
            localStorage.removeItem(timerKey);
          }
        } else {
          this.remainingTime = 0;
        }
      }
    } catch (error) {
      console.error('Timer Motion Card: Error calculating remaining time', error);
      this.remainingTime = 0;
    }
  }

  createBackendTimer(duration) {
    if (!this._hass || !this.config.entity) return;
    
    try {
      // Use Home Assistant's script service with delay
      // Create a script that will turn off after delay
      const scriptId = `timer_motion_${this.config.entity.replace('.', '_')}`;
      
      // Store script configuration in localStorage for reference
      const scriptConfig = {
        entity: this.config.entity,
        duration: duration,
        createdAt: Date.now()
      };
      localStorage.setItem(`timer_script_${this.config.entity}`, JSON.stringify(scriptConfig));
      
      // Note: We can't create scripts/automations dynamically from frontend
      // So we'll use a different approach: store expiration and check periodically
      // The actual turn-off will be handled by checking expiration time
      
    } catch (error) {
      console.error('Timer Motion Card: Error creating backend timer', error);
    }
  }

  checkExpiredTimers() {
    if (!this._hass || !this.config || !this.config.entity) return;
    
    try {
      const entity = this._hass.states[this.config.entity];
      if (!entity) return;
      
      // If light is off, clear any timer
      if (entity.state === 'off') {
        const timerKey = `timer_expiration_${this.config.entity}`;
        localStorage.removeItem(timerKey);
        localStorage.removeItem(`timer_start_${this.config.entity}`);
        this.remainingTime = 0;
        if (this.timerInterval) {
          clearInterval(this.timerInterval);
          this.timerInterval = null;
        }
        return;
      }
      
      // If light is on and timer is enabled, check expiration
      if (entity.state === 'on' && this.config.timer_enabled) {
        this.calculateRemainingTime();
        
        if (this.remainingTime <= 0) {
          // Timer has expired - turn off the entity
          this.callService('turn_off', this.config.entity);
          const timerKey = `timer_expiration_${this.config.entity}`;
          localStorage.removeItem(timerKey);
          localStorage.removeItem(`timer_start_${this.config.entity}`);
          this.remainingTime = 0;
          if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
          }
        } else {
          // Timer is still running - restart display interval if needed
          if (!this.timerInterval) {
            this.timerInterval = setInterval(() => {
              this.updateTimer();
            }, 1000);
          }
        }
      }
    } catch (error) {
      console.error('Timer Motion Card: Error checking expired timers', error);
    }
  }

  updateTimer() {
    if (!this.config || !this.config.entity || !this._hass) return;
    try {
      const entity = this._hass.states[this.config.entity];
      
      // If light is off, clear timer
      if (!entity || entity.state === 'off') {
        if (this.remainingTime > 0) {
          this.remainingTime = 0;
          const timerKey = `timer_expiration_${this.config.entity}`;
          localStorage.removeItem(timerKey);
          localStorage.removeItem(`timer_start_${this.config.entity}`);
          if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
          }
          this.updateTimerDisplay();
        }
        return;
      }
      
      // Recalculate remaining time from stored expiration
      this.calculateRemainingTime();
      
      if (this.remainingTime <= 0) {
        // Timer expired - turn off entity
        if (entity.state === 'on') {
          this.callService('turn_off', this.config.entity);
        }
        // Clear the stored expiration and interval
        const timerKey = `timer_expiration_${this.config.entity}`;
        localStorage.removeItem(timerKey);
        localStorage.removeItem(`timer_start_${this.config.entity}`);
        if (this.timerInterval) {
          clearInterval(this.timerInterval);
          this.timerInterval = null;
        }
        this.updateTimerDisplay();
      } else {
        // Timer still running - update display
        this.updateTimerDisplay();
      }
    } catch (error) {
      console.error('Timer Motion Card: Error updating timer', error);
    }
  }

  updateTimerDisplay() {
    if (!this._hass || !this._hass.states || !this.config || !this.config.entity || !this.shadowRoot) return;
    
    try {
      const entity = this._hass.states[this.config.entity];
      
      // Only show timer if light is on and timer is enabled and has remaining time
      const showTimer = entity && 
                       entity.state === 'on' && 
                       this.config.timer_enabled && 
                       this.remainingTime > 0;
      
      const timerText = showTimer ? ` • ${this.formatTime(this.remainingTime)}` : '';
      
      // Update state display with timer (Mushroom structure)
      const stateElement = this.shadowRoot.querySelector('.mushroom-state-info .secondary');
      if (stateElement && entity) {
        const isOn = entity.state === 'on';
        let brightness = 0;
        if (entity.attributes && entity.attributes.brightness !== undefined && entity.attributes.brightness !== null) {
          brightness = Number(entity.attributes.brightness);
          if (isNaN(brightness)) brightness = 0;
        }
        const brightnessPct = brightness > 0 ? Math.max(0, Math.min(100, Math.round((brightness / 255) * 100))) : 0;
        
        if (brightness > 0 && this.supportsBrightnessControl(entity)) {
          stateElement.textContent = `${brightnessPct}%${timerText}`;
        } else {
          const stateText = this._hass.formatEntityState ? 
            this._hass.formatEntityState(entity) : 
            (isOn ? 'On' : 'Off');
          stateElement.textContent = `${stateText}${timerText}`;
        }
      }
    } catch (error) {
      console.error('Timer Motion Card: Error updating timer display', error);
    }
  }

  updateEntityState() {
    if (!this._hass || !this._hass.states || !this.config || !this.config.entity || !this.shadowRoot) return;
    
    try {
      const entity = this._hass.states[this.config.entity];
      if (!entity) return;

      const stateElement = this.shadowRoot.querySelector('.mushroom-state-info .secondary');
      const motionIcon = this.shadowRoot.querySelector('.motion-icon-header');
      
      // Update state display if element exists
      if (stateElement) {
        const isOn = entity.state === 'on';
        let brightness = 0;
        if (entity.attributes && entity.attributes.brightness !== undefined && entity.attributes.brightness !== null) {
          brightness = Number(entity.attributes.brightness);
          if (isNaN(brightness)) brightness = 0;
        }
        const brightnessPct = brightness > 0 ? Math.max(0, Math.min(100, Math.round((brightness / 255) * 100))) : 0;
        
        // Only show timer if light is on and timer is enabled and has remaining time
        const showTimer = isOn && 
                         this.config.timer_enabled && 
                         this.remainingTime > 0;
        const timerText = showTimer ? ` • ${this.formatTime(this.remainingTime)}` : '';
        
        if (brightness > 0 && this.supportsBrightnessControl(entity)) {
          stateElement.textContent = `${brightnessPct}%${timerText}`;
        } else {
          const stateText = this._hass.formatEntityState ? 
            this._hass.formatEntityState(entity) : 
            (isOn ? 'On' : 'Off');
          stateElement.textContent = `${stateText}${timerText}`;
        }
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

      // Update brightness slider if it exists
      const brightnessSlider = this.shadowRoot.querySelector('ha-slider');
      if (brightnessSlider && entity.attributes && entity.attributes.brightness !== undefined) {
        const brightness = Number(entity.attributes.brightness) || 0;
        const brightnessPct = Math.max(0, Math.min(100, Math.round((brightness / 255) * 100)));
        brightnessSlider.value = brightnessPct;
      }

      // If entity turns on and timer is enabled, start timer
      if (entity.state === 'on' && this.config.timer_enabled) {
        // Check if timer should be running based on last_changed
        this.calculateRemainingTime();
        if (this.remainingTime <= 0) {
          // No active timer or timer expired - start new one
          this.startTimer();
        } else {
          // Timer already running - just update display
          this.updateTimerDisplay();
          if (!this.timerInterval) {
            this.timerInterval = setInterval(() => {
              this.updateTimer();
            }, 1000);
          }
        }
      }

      // If entity turns off, reset timer
      if (entity.state === 'off') {
        const timerKey = `timer_expiration_${this.config.entity}`;
        localStorage.removeItem(timerKey);
        localStorage.removeItem(`timer_start_${this.config.entity}`);
        this.remainingTime = 0;
        if (this.timerInterval) {
          clearInterval(this.timerInterval);
          this.timerInterval = null;
        }
        this.updateTimerDisplay();
      }
    } catch (error) {
      console.error('Timer Motion Card: Error updating entity state', error);
      // Don't throw - just log the error
    }
  }

  callService(service, entityId, options = {}) {
    if (!this._hass || !entityId) return;
    try {
      const domain = entityId.split('.')[0];
      if (!domain) return;
      const serviceData = { entity_id: entityId, ...options };
      
      // If turning on and default_brightness is set and brightness control is supported
      if (service === 'turn_on' && this.config.default_brightness !== null && this.config.default_brightness !== undefined) {
        const entity = this._hass.states[entityId];
        if (entity && this.supportsBrightnessControl(entity) && this.config.show_brightness_control !== false) {
          const brightness = Math.round((this.config.default_brightness / 100) * 255);
          serviceData.brightness = brightness;
        }
      }
      
      this._hass.callService(domain, service, serviceData);
    } catch (error) {
      console.error('Timer Motion Card: Error calling service', error);
    }
  }

  handleCardClick(e) {
    // Don't toggle if clicking on settings button, timer icon, motion icon, modal, or controls
    if (e && (e.target.closest('.settings-button') || 
              e.target.closest('.timer-icon-header') ||
              e.target.closest('.motion-icon-header') ||
              e.target.closest('.header-actions') ||
              e.target.closest('.settings-modal') ||
              e.target.closest('.mushroom-actions') ||
              e.target.closest('ha-slider'))) {
      return;
    }
    
    const action = this.config.tap_action || { action: 'toggle' };
    this.handleAction(action);
  }

  toggleEntity(e) {
    if (!this._hass || !this._hass.states || !this.config || !this.config.entity) return;
    
    try {
      const entity = this._hass.states[this.config.entity];
      if (!entity) return;

      if (entity.state === 'on') {
        this.callService('turn_off', this.config.entity);
        // Clear timer when manually turned off
        const timerKey = `timer_expiration_${this.config.entity}`;
        localStorage.removeItem(timerKey);
        if (this.timerInterval) {
          clearInterval(this.timerInterval);
          this.timerInterval = null;
        }
        this.remainingTime = 0;
        this.updateTimerDisplay();
      } else {
        this.callService('turn_on', this.config.entity);
        if (this.config.timer_enabled) {
          this.startTimer();
        }
      }
    } catch (error) {
      console.error('Timer Motion Card: Error toggling entity', error);
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

  // Mushroom-style helper functions
  getRGBColor(entity) {
    if (!entity) return null;
    if (entity.attributes.rgb_color) {
      return entity.attributes.rgb_color;
    }
    if (entity.attributes.color_temp && entity.state === 'on') {
      // Convert color temp to RGB (simplified)
      const temp = entity.attributes.color_temp;
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
      return [Math.round(r), Math.round(g), Math.round(b)];
    }
    return null;
  }

  isColorLight(rgb) {
    if (!rgb) return false;
    // Calculate relative luminance
    const [r, g, b] = rgb.map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return luminance > 0.5;
  }

  isColorSuperLight(rgb) {
    if (!rgb) return false;
    const [r, g, b] = rgb.map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return luminance > 0.7;
  }

  supportsBrightnessControl(entity) {
    if (!entity || !entity.attributes) return false;
    // Check if entity supports brightness (has brightness attribute or supports brightness in color modes)
    if ('brightness' in entity.attributes) return true;
    if (entity.attributes.supported_color_modes) {
      return entity.attributes.supported_color_modes.some(mode => 
        ['brightness', 'brightness_pct'].includes(mode) || 
        mode.includes('brightness')
      );
    }
    return false;
  }

  supportsColorTempControl(entity) {
    return entity && 'color_temp' in entity.attributes && 
           entity.attributes.supported_color_modes && 
           entity.attributes.supported_color_modes.includes('color_temp');
  }

  supportsColorControl(entity) {
    return entity && entity.attributes.supported_color_modes && 
           (entity.attributes.supported_color_modes.includes('rgb') ||
            entity.attributes.supported_color_modes.includes('hs'));
  }

  handleAction(action) {
    if (!this._hass || !action || !this.config) return;
    
    try {
      switch (action.action) {
        case 'toggle':
          this.toggleEntity();
          break;
      case 'more-info':
        this.fireEvent('hass-more-info', { entityId: this.config.entity });
        break;
      case 'navigate':
        if (action.navigation_path) {
          this.fireEvent('location-changed', { replace: false });
          history.pushState(null, '', action.navigation_path);
          this.fireEvent('location-changed', { replace: false });
        }
        break;
      case 'call-service':
        if (action.service) {
          const [domain, service] = action.service.split('.');
          this._hass.callService(domain, service, action.service_data || {});
        }
        break;
      case 'none':
        break;
      }
    } catch (error) {
      console.error('Timer Motion Card: Error handling action', error);
    }
  }

  fireEvent(type, detail) {
    const event = new CustomEvent(type, {
      bubbles: true,
      composed: true,
      detail: detail,
    });
    this.dispatchEvent(event);
  }

  render() {
    if (!this._hass || !this._hass.states || !this.config || !this.config.entity) {
      if (this.shadowRoot && this.config) {
        this.shadowRoot.innerHTML = `
          <ha-card>
            <div class="error">Configuration error: Missing entity or hass object</div>
          </ha-card>
        `;
      }
      return;
    }

    try {
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
    
    // Safely get brightness - handle undefined/null for dimmable lights
    let brightness = 0;
    if (entity.attributes && entity.attributes.brightness !== undefined && entity.attributes.brightness !== null) {
      brightness = Number(entity.attributes.brightness);
      if (isNaN(brightness)) brightness = 0;
    } else if (isOn && this.supportsBrightnessControl(entity)) {
      // If light is on but brightness not set, default to 100%
      brightness = 255;
    }
    const brightnessPct = brightness > 0 ? Math.max(0, Math.min(100, Math.round((brightness / 255) * 100))) : 0;
    
    // Mushroom-style color handling
    const lightRgbColor = this.getRGBColor(entity);
    const useLightColor = this.config.use_light_color !== false;
    const iconColor = this.config.icon_color || '';
    
    // Determine icon and shape colors (Mushroom style)
    let iconStyleColor = '';
    let shapeColor = '';
    if (lightRgbColor && useLightColor && isOn) {
      const color = lightRgbColor.join(',');
      iconStyleColor = `rgb(${color})`;
      const isLight = this.isColorLight(lightRgbColor);
      const isSuperLight = this.isColorSuperLight(lightRgbColor);
      const darkMode = (this._hass.themes && this._hass.themes.darkMode) || false;
      if (isLight && !darkMode) {
        shapeColor = `rgba(var(--rgb-primary-text-color), 0.05)`;
        if (isSuperLight) {
          iconStyleColor = `rgba(var(--rgb-primary-text-color), 0.2)`;
        }
      } else {
        shapeColor = `rgba(${color}, 0.25)`;
      }
    } else if (iconColor && isOn) {
      // Use icon_color if provided
      iconStyleColor = iconColor.startsWith('rgb') ? iconColor : `rgb(${iconColor})`;
      shapeColor = iconColor.startsWith('rgba') ? iconColor : `rgba(${iconColor.replace('rgb(', '').replace(')', '')}, 0.2)`;
    } else {
      // Default Mushroom colors
      iconStyleColor = isOn 
        ? 'rgb(var(--rgb-state-light-on-rgb, 255, 184, 0))' 
        : 'rgb(var(--rgb-disabled-rgb, 158, 158, 158))';
      shapeColor = isOn 
        ? 'rgba(var(--rgb-state-light-on-rgb, 255, 184, 0), 0.2)' 
        : 'rgba(var(--rgb-disabled-rgb, 158, 158, 158), 0.1)';
    }
    
    // Control visibility
    const showBrightnessControl = (this.config.show_brightness_control !== false) && 
                                  this.supportsBrightnessControl(entity) && 
                                  (!this.config.collapsible_controls || isOn);
    const showColorTempControl = this.config.show_color_temp_control && 
                                 this.supportsColorTempControl(entity);
    const showColorControl = this.config.show_color_control && 
                             this.supportsColorControl(entity);
    
    // Determine which control to show
    let activeControl = null;
    if (showBrightnessControl) activeControl = 'brightness';
    else if (showColorTempControl) activeControl = 'color_temp';
    else if (showColorControl) activeControl = 'color';
    
    const hasControls = showBrightnessControl || showColorTempControl || showColorControl;
    const showControls = hasControls && (!this.config.collapsible_controls || isOn);

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

    // Format state display (Mushroom style)
    let stateDisplay = this._hass.formatEntityState ? 
      this._hass.formatEntityState(entity) : 
      (isOn ? 'On' : 'Off');
    if (brightness > 0 && showBrightnessControl) {
      stateDisplay = `${brightnessPct}%${timerText}`;
    } else if (timerText) {
      stateDisplay = `${stateDisplay}${timerText}`;
    }

    // Layout options
    const layout = this.config.layout || 'default';
    const fillContainer = this.config.fill_container || false;
    const primaryInfo = this.config.primary_info || 'name';
    const secondaryInfo = this.config.secondary_info || 'state';
    const iconType = this.config.icon_type || 'icon';
    
    const cardWidth = this.config.width ? `width: ${this.config.width};` : '';
    const cardHeight = this.config.height ? `height: ${this.config.height};` : '';
    const cardBoxSizing = (this.config.width || this.config.height) ? 'box-sizing: border-box;' : '';
    
    // Slider colors (Mushroom style)
    let sliderColor = iconStyleColor;
    let sliderBgColor = shapeColor;
    if (lightRgbColor && useLightColor && isOn) {
      const color = lightRgbColor.join(',');
      const isLight = this.isColorLight(lightRgbColor);
      const darkMode = (this._hass.themes && this._hass.themes.darkMode) || false;
      if (isLight && !darkMode) {
        sliderBgColor = 'rgba(var(--rgb-primary-text-color), 0.05)';
        sliderColor = 'rgba(var(--rgb-primary-text-color), 0.15)';
      } else {
        sliderColor = `rgb(${color})`;
        sliderBgColor = `rgba(${color}, 0.2)`;
      }
    } else if (iconColor && isOn) {
      sliderColor = iconStyleColor;
      sliderBgColor = shapeColor;
    }

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
        .mushroom-card {
          display: flex;
          flex-direction: column;
          background: var(--card-background-color, var(--mush-card-background, #fff));
          border-radius: var(--mush-border-radius, var(--ha-card-border-radius, 12px));
          overflow: hidden;
        }
        .header-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }
        .settings-button {
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          transition: background-color 0.2s;
        }
        .settings-button:hover {
          background-color: rgba(0, 0, 0, 0.05);
        }
        .settings-button ha-icon {
          width: 20px;
          height: 20px;
          color: var(--secondary-text-color, rgba(0,0,0,0.54));
        }
        .motion-icon-header {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4px;
        }
        .motion-icon-header.active {
          color: var(--mush-success-text-color, #4caf50);
        }
        .motion-icon-header:not(.active) {
          color: var(--secondary-text-color, rgba(0,0,0,0.54));
        }
        .motion-icon-header ha-icon {
          width: 20px;
          height: 20px;
        }
        .timer-icon-header {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4px;
          color: var(--secondary-text-color, rgba(0,0,0,0.54));
        }
        .timer-icon-header ha-icon {
          width: 20px;
          height: 20px;
        }
        /* Mushroom-style state item */
        .mushroom-state-item {
          display: flex;
          flex-direction: row;
          align-items: center;
          padding: var(--mush-card-padding, 12px);
          gap: var(--mush-card-gap, 12px);
          cursor: pointer;
          min-height: var(--mush-card-min-height, 64px);
        }
        .mushroom-shape-icon {
          position: relative;
          width: var(--mush-icon-size, 40px);
          height: var(--mush-icon-size, 40px);
          border-radius: var(--mush-icon-border-radius, var(--ha-card-border-radius, 12px));
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: all 0.2s;
          --icon-color: ${iconStyleColor};
          --shape-color: ${shapeColor};
          background: var(--shape-color);
        }
        .mushroom-shape-icon:not(.active) {
          --icon-color: rgb(var(--rgb-disabled-rgb, 158, 158, 158));
          --shape-color: rgba(var(--rgb-disabled-rgb, 158, 158, 158), 0.1);
          background: var(--shape-color);
          opacity: 0.5;
        }
        .mushroom-shape-icon ha-icon {
          color: var(--icon-color);
          width: var(--mush-icon-width, 24px);
          height: var(--mush-icon-height, 24px);
        }
        .mushroom-state-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: var(--mush-info-gap, 4px);
          min-width: 0;
        }
        .mushroom-state-info .primary {
          font-size: var(--mush-title-font-size, 14px);
          font-weight: var(--mush-title-font-weight, 500);
          color: rgb(var(--rgb-primary-text-color, 0, 0, 0));
          line-height: var(--mush-title-line-height, 1.2);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .mushroom-state-info .secondary {
          font-size: var(--mush-subtitle-font-size, 12px);
          font-weight: var(--mush-subtitle-font-weight, 400);
          color: ${isOn ? 'rgb(var(--rgb-state-light-on-rgb, 255, 184, 0))' : 'rgb(var(--rgb-secondary-text-color, 158, 158, 158))'};
          line-height: var(--mush-subtitle-line-height, 1.2);
        }
        .mushroom-actions {
          display: flex;
          flex-direction: row;
          align-items: center;
          padding: 0 var(--mush-card-padding, 12px) var(--mush-card-padding, 12px);
          gap: var(--mush-control-gap, 8px);
        }
        .mushroom-brightness-control {
          flex: 1;
          padding: 0;
        }
        .mushroom-brightness-control ha-slider {
          --slider-bar-color: ${sliderBgColor};
          --slider-bar-active-color: ${sliderColor};
          --slider-handle-color: ${sliderColor};
          --slider-handle-size: 20px;
          --slider-handle-border-width: 2px;
          --slider-handle-border-color: var(--card-background-color, #fff);
          --slider-bar-height: 4px;
          --slider-bar-border-radius: 2px;
          --slider-pin-font-size: 10px;
          --slider-pin-color: ${sliderColor};
          width: 100%;
          padding: 0;
          height: 42px;
          --mush-control-height: 42px;
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
      <ha-card class="${fillContainer ? 'fill-container' : ''}">
        <div class="mushroom-card">
          <div class="mushroom-state-item">
            ${iconType === 'icon' ? `
              <div class="mushroom-shape-icon ${isOn ? 'active' : ''}">
                <ha-icon icon="${icon}"></ha-icon>
              </div>
            ` : iconType === 'entity-picture' && entity && entity.attributes && entity.attributes.entity_picture ? `
              <div class="mushroom-shape-icon ${isOn ? 'active' : ''}" style="background-image: url('${entity.attributes.entity_picture}'); background-size: cover; background-position: center;">
              </div>
            ` : ''}
            <div class="mushroom-state-info">
              ${primaryInfo === 'name' ? `
                <div class="primary">${name}</div>
              ` : primaryInfo === 'state' ? `
                <div class="primary">${stateDisplay}</div>
              ` : primaryInfo === 'last-changed' ? `
                <div class="primary">${entity && entity.last_changed ? new Date(entity.last_changed).toLocaleString() : ''}</div>
              ` : primaryInfo === 'last-updated' ? `
                <div class="primary">${entity && entity.last_updated ? new Date(entity.last_updated).toLocaleString() : ''}</div>
              ` : ''}
              ${secondaryInfo === 'name' && primaryInfo !== 'name' ? `
                <div class="secondary">${name}</div>
              ` : secondaryInfo === 'state' && primaryInfo !== 'state' ? `
                <div class="secondary">${stateDisplay}</div>
              ` : secondaryInfo === 'last-changed' && primaryInfo !== 'last-changed' ? `
                <div class="secondary">${entity && entity.last_changed ? new Date(entity.last_changed).toLocaleString() : ''}</div>
              ` : secondaryInfo === 'last-updated' && primaryInfo !== 'last-updated' ? `
                <div class="secondary">${entity && entity.last_updated ? new Date(entity.last_updated).toLocaleString() : ''}</div>
              ` : ''}
            </div>
            <div class="header-actions">
              ${this.config.timer_enabled ? `
                <div class="timer-icon-header">
                  <ha-icon icon="mdi:timer-outline"></ha-icon>
                </div>
              ` : ''}
              ${this.config.motion_enabled ? `
                <div class="motion-icon-header ${motionActive ? 'active' : ''}">
                  <ha-icon icon="mdi:motion-sensor"></ha-icon>
                </div>
              ` : ''}
              <div class="settings-button">
                <ha-icon icon="mdi:cog"></ha-icon>
              </div>
            </div>
          </div>
          ${showControls ? `
            <div class="mushroom-actions">
              ${activeControl === 'brightness' ? `
                <div class="mushroom-brightness-control">
                  <ha-slider
                    min="0"
                    max="100"
                    step="1"
                    value="${Math.max(0, Math.min(100, brightnessPct))}"
                    pin
                  ></ha-slider>
                </div>
              ` : ''}
            </div>
          ` : ''}
        </div>
      </ha-card>
    `;

    // Add click handler for state item (Mushroom style)
    const stateItem = this.shadowRoot.querySelector('.mushroom-state-item');
    if (stateItem) {
      stateItem.addEventListener('click', (e) => this.handleCardClick(e));
    }

    // Add settings button handler
    const settingsBtn = this.shadowRoot.querySelector('.settings-button');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openSettings(e);
      });
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
    } catch (error) {
      console.error('Timer Motion Card: Error rendering card', error);
      if (this.shadowRoot) {
        this.shadowRoot.innerHTML = `
          <ha-card>
            <div class="error">Error rendering card: ${error.message}</div>
          </ha-card>
        `;
      }
    }
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
            <div>
              <div class="settings-label">Enable Timer</div>
              <div class="settings-description">Automatically turn off after duration</div>
            </div>
            <ha-switch class="timer-switch" ${this.config.timer_enabled ? 'checked' : ''}></ha-switch>
          </div>
          <div class="timer-duration-row" style="display: ${this.config.timer_enabled ? 'flex' : 'none'}">
            <div class="settings-label">Timer Duration (seconds)</div>
            <ha-textfield class="timer-duration-input settings-input" type="number" value="${this.config.timer_duration || 300}"></ha-textfield>
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
        </div>
      </div>
    `;

    // Add event listeners
    const closeBtn = modal.querySelector('.settings-close');
    closeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.closeSettings(e);
    });

    const backdrop = modal;
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        e.preventDefault();
        e.stopPropagation();
        this.closeSettings(e);
      }
    });
    
    // Prevent clicks inside dialog from closing
    const dialog = modal.querySelector('.settings-dialog');
    if (dialog) {
      dialog.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    }

    const timerSwitch = modal.querySelector('.timer-switch');
    timerSwitch.addEventListener('change', (e) => {
      e.stopPropagation();
      this.updateSetting('timer_enabled', e.target.checked);
      const durationRow = modal.querySelector('.timer-duration-row');
      durationRow.style.display = e.target.checked ? 'flex' : 'none';
    });

    const timerDurationInput = modal.querySelector('.timer-duration-input');
    timerDurationInput.addEventListener('change', (e) => {
      e.stopPropagation();
      this.updateSetting('timer_duration', parseInt(e.target.value) || 300);
    });

    const motionSwitch = modal.querySelector('.motion-switch');
    motionSwitch.addEventListener('change', (e) => {
      e.stopPropagation();
      this.updateSetting('motion_enabled', e.target.checked);
    });

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
    if (this.config && this.config.entity) {
      try {
        this.render();
        this.setupEventListeners();
      } catch (error) {
        console.error('Timer Motion Card: Error in set hass', error);
      }
    }
  }

  get hass() {
    return this._hass;
  }

  // Required for Lovelace card discovery
  getCardSize() {
    return 1;
  }
}

// Register with Lovelace BEFORE defining the element (like Mushroom does)
if (!window.customCards) {
  window.customCards = [];
}
window.customCards.push({
  type: 'timer-motion-card',
  name: 'Timer Motion Card',
  description: 'A card with timer and motion sensor functionality styled like Mushroom cards',
  preview: true,
  documentationURL: 'https://github.com/ryandidurlabs/timer-motion-card',
});

// Define the custom element
customElements.define('timer-motion-card', TimerMotionCard);

// Card editor for Lovelace UI
class TimerMotionCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = config || {};
    if (this._hass) {
      this.render();
    }
  }

  set hass(hass) {
    this._hass = hass;
    if (this._config) {
      this.render();
    }
  }

  configChanged(newConfig) {
    this._config = newConfig;
    const event = new CustomEvent('config-changed', {
      detail: { config: newConfig },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
  }

  connectedCallback() {
    if (this._config) {
      this.render();
    }
  }

  render() {
    if (!this._config || !this._hass) {
      this.innerHTML = '<div>Loading...</div>';
      return;
    }

    this.innerHTML = `
      <div class="card-config">
        <div class="config-row">
          <label>Entity</label>
          <ha-entity-picker
            .hass="${this._hass}"
            .value="${this._config.entity || ''}"
            config-value="entity"
            .includeDomains="${['light', 'fan', 'switch']}"
            allow-custom-entity
          ></ha-entity-picker>
        </div>
        <div class="config-row">
          <label>Name (optional)</label>
          <ha-textfield
            label="Name"
            value="${this._config.name || ''}"
            config-value="name"
            placeholder="Leave empty to use entity name"
          ></ha-textfield>
        </div>
        <div class="config-row">
          <ha-switch
            checked="${this._config.timer_enabled || false}"
            config-value="timer_enabled"
          ></ha-switch>
          <span>Enable Timer</span>
        </div>
        <div class="config-row">
          <label>Timer Duration (seconds)</label>
          <ha-textfield
            label="Duration"
            value="${this._config.timer_duration || 300}"
            type="number"
            config-value="timer_duration"
          ></ha-textfield>
        </div>
        <div class="config-row">
          <label>Default Brightness (%)</label>
          <ha-textfield
            label="Brightness"
            value="${this._config.default_brightness !== null && this._config.default_brightness !== undefined ? this._config.default_brightness : ''}"
            type="number"
            min="0"
            max="100"
            config-value="default_brightness"
            placeholder="Leave empty for default"
          ></ha-textfield>
          <span style="font-size: 12px; color: var(--secondary-text-color);">0-100, only if brightness control enabled</span>
        </div>
        <div class="config-row">
          <ha-switch
            checked="${this._config.motion_enabled || false}"
            config-value="motion_enabled"
          ></ha-switch>
          <span>Enable Motion Sensor</span>
        </div>
        <div class="config-row">
          <label>Motion Sensor Entity</label>
          <ha-entity-picker
            .hass="${this._hass}"
            .value="${this._config.motion_sensor || ''}"
            config-value="motion_sensor"
            .includeDomains="${['binary_sensor']}"
            allow-custom-entity
          ></ha-entity-picker>
        </div>
        <div class="config-row">
          <label>Motion Off Delay (seconds)</label>
          <ha-textfield
            label="Delay"
            value="${this._config.motion_off_delay || 60}"
            type="number"
            config-value="motion_off_delay"
          ></ha-textfield>
        </div>
        <div class="config-row">
          <label>Icon</label>
          <ha-icon-picker
            .hass="${this._hass}"
            .value="${this._config.icon || ''}"
            config-value="icon"
            placeholder="mdi:lightbulb"
          ></ha-icon-picker>
        </div>
        
        <h3>Appearance</h3>
        <div class="config-row">
          <label>Layout</label>
          <ha-select
            label="Layout"
            .value="${this._config.layout || 'default'}"
            config-value="layout"
          >
            <mwc-list-item value="default">default</mwc-list-item>
            <mwc-list-item value="horizontal">horizontal</mwc-list-item>
            <mwc-list-item value="vertical">vertical</mwc-list-item>
          </ha-select>
        </div>
        <div class="config-row">
          <ha-switch
            checked="${this._config.fill_container === true}"
            config-value="fill_container"
          ></ha-switch>
          <span>Fill Container</span>
        </div>
        <div class="config-row">
          <label>Primary Info</label>
          <ha-select
            label="Primary Info"
            .value="${this._config.primary_info || 'name'}"
            config-value="primary_info"
          >
            <mwc-list-item value="name">name</mwc-list-item>
            <mwc-list-item value="state">state</mwc-list-item>
            <mwc-list-item value="last-changed">last-changed</mwc-list-item>
            <mwc-list-item value="last-updated">last-updated</mwc-list-item>
            <mwc-list-item value="none">none</mwc-list-item>
          </ha-select>
        </div>
        <div class="config-row">
          <label>Secondary Info</label>
          <ha-select
            label="Secondary Info"
            .value="${this._config.secondary_info || 'state'}"
            config-value="secondary_info"
          >
            <mwc-list-item value="name">name</mwc-list-item>
            <mwc-list-item value="state">state</mwc-list-item>
            <mwc-list-item value="last-changed">last-changed</mwc-list-item>
            <mwc-list-item value="last-updated">last-updated</mwc-list-item>
            <mwc-list-item value="none">none</mwc-list-item>
          </ha-select>
        </div>
        <div class="config-row">
          <label>Icon Type</label>
          <ha-select
            label="Icon Type"
            .value="${this._config.icon_type || 'icon'}"
            config-value="icon_type"
          >
            <mwc-list-item value="icon">icon</mwc-list-item>
            <mwc-list-item value="entity-picture">entity-picture</mwc-list-item>
            <mwc-list-item value="none">none</mwc-list-item>
          </ha-select>
        </div>
        
        <h3>Controls</h3>
        <div class="config-row">
          <ha-switch
            checked="${this._config.show_brightness_control === true}"
            config-value="show_brightness_control"
          ></ha-switch>
          <span>Show Brightness Control</span>
        </div>
        <div class="config-row">
          <ha-switch
            checked="${this._config.show_color_temp_control === true}"
            config-value="show_color_temp_control"
          ></ha-switch>
          <span>Show Color Temperature Control</span>
        </div>
        <div class="config-row">
          <ha-switch
            checked="${this._config.show_color_control === true}"
            config-value="show_color_control"
          ></ha-switch>
          <span>Show Color Control</span>
        </div>
        <div class="config-row">
          <ha-switch
            checked="${this._config.collapsible_controls === true}"
            config-value="collapsible_controls"
          ></ha-switch>
          <span>Collapsible Controls</span>
        </div>
        <div class="config-row">
          <ha-switch
            checked="${this._config.use_light_color !== false}"
            config-value="use_light_color"
          ></ha-switch>
          <span>Use Light Color</span>
        </div>
      </div>
      <style>
        .card-config {
          padding: 16px;
        }
        .card-config h3 {
          margin: 16px 0 8px 0;
          font-size: 16px;
          font-weight: 500;
          color: var(--primary-text-color);
        }
        .card-config h3:first-child {
          margin-top: 0;
        }
        .config-row {
          display: flex;
          align-items: center;
          margin-bottom: 16px;
          gap: 16px;
        }
        .config-row:last-child {
          margin-bottom: 0;
        }
        .config-row label {
          min-width: 160px;
          font-size: 14px;
          color: var(--primary-text-color);
        }
        .config-row ha-textfield,
        .config-row ha-select,
        .config-row ha-entity-picker,
        .config-row ha-icon-picker {
          flex: 1;
        }
        .config-row ha-switch {
          margin-right: 16px;
          flex-shrink: 0;
        }
        .config-row span {
          flex: 1;
          font-size: 14px;
          color: var(--primary-text-color);
        }
      </style>
    `;

    // Add event listeners - use setTimeout to ensure elements are in DOM
    setTimeout(() => {
      const inputs = this.querySelectorAll('ha-textfield, ha-switch, ha-select, ha-entity-picker, ha-icon-picker');
      inputs.forEach((input) => {
        const configValue = input.getAttribute('config-value');
        if (!configValue) return;
        
        // Create a handler function
        const handler = (e) => {
          e.stopPropagation();
          const newConfig = { ...this._config };
          
          if (input.tagName === 'HA-SWITCH') {
            newConfig[configValue] = input.checked;
          } else if (input.tagName === 'HA-SELECT') {
            newConfig[configValue] = input.value;
          } else if (input.tagName === 'HA-ENTITY-PICKER' || input.tagName === 'HA-ICON-PICKER') {
            newConfig[configValue] = e.detail.value || '';
          } else {
            const value = input.value;
            if (input.type === 'number') {
              // For default_brightness, allow empty string to mean null
              if (configValue === 'default_brightness') {
                newConfig[configValue] = value && value !== '' ? parseInt(value, 10) : null;
              } else {
                newConfig[configValue] = value ? parseInt(value, 10) : undefined;
              }
            } else {
              newConfig[configValue] = value;
            }
          }
          
          this.configChanged(newConfig);
        };
        
        // Add appropriate event listener
        if (input.tagName === 'HA-ENTITY-PICKER' || input.tagName === 'HA-ICON-PICKER') {
          input.addEventListener('value-changed', handler);
        } else {
          input.addEventListener('change', handler);
        }
      });
    }, 100);
  }
}

customElements.define('timer-motion-card-editor', TimerMotionCardEditor);

