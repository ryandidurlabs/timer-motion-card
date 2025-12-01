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
      // Control options
      show_brightness_control: true,
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
    if (!this.config || !this.config.timer_enabled) return;
    try {
      // Clear any existing interval
      if (this.timerInterval) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
      }
      
      this.remainingTime = this.config.timer_duration || 300;
      this.updateTimerDisplay();
      
      // Start the countdown interval
      this.timerInterval = setInterval(() => {
        this.updateTimer();
      }, 1000);
    } catch (error) {
      console.error('Timer Motion Card: Error starting timer', error);
    }
  }

  updateTimer() {
    if (!this.config || !this.config.entity) return;
    try {
      if (this.remainingTime > 0) {
        this.remainingTime--;
        this.updateTimerDisplay();
      } else if (this.remainingTime === 0 && this.config.timer_enabled) {
        // Timer expired - turn off entity
        if (this._hass && this._hass.states) {
          const entity = this._hass.states[this.config.entity];
          if (entity && entity.state === 'on') {
            this.callService('turn_off', this.config.entity);
            // Clear the timer interval
            if (this.timerInterval) {
              clearInterval(this.timerInterval);
              this.timerInterval = null;
            }
            this.remainingTime = 0;
            this.updateTimerDisplay();
          }
        }
        this.remainingTime = -1;
      }
    } catch (error) {
      console.error('Timer Motion Card: Error updating timer', error);
    }
  }

  updateTimerDisplay() {
    if (!this._hass || !this._hass.states || !this.config || !this.config.entity || !this.shadowRoot) return;
    
    try {
      const entity = this._hass.states[this.config.entity];
      const timerText = (this.config.timer_enabled && this.remainingTime > 0) 
        ? ` • ${this.formatTime(this.remainingTime)}` 
        : '';
      
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
      const motionIcon = this.shadowRoot.querySelector('.motion-icon-corner');
      
      // Update state display if element exists
      if (stateElement) {
        const isOn = entity.state === 'on';
        let brightness = 0;
        if (entity.attributes && entity.attributes.brightness !== undefined && entity.attributes.brightness !== null) {
          brightness = Number(entity.attributes.brightness);
          if (isNaN(brightness)) brightness = 0;
        }
        const brightnessPct = brightness > 0 ? Math.max(0, Math.min(100, Math.round((brightness / 255) * 100))) : 0;
        const timerText = (this.config.timer_enabled && this.remainingTime > 0) 
          ? ` • ${this.formatTime(this.remainingTime)}` 
          : '';
        
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
      if (entity.state === 'on' && this.config.timer_enabled && this.remainingTime <= 0) {
        this.startTimer();
      }

      // If entity turns off, reset timer
      if (entity.state === 'off') {
        this.remainingTime = 0;
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
    // Don't toggle if clicking on settings button, modal, or controls
    if (e && (e.target.closest('.settings-button') || 
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
          --slider-color: ${sliderColor};
          --slider-bg-color: ${sliderBgColor};
        }
        .mushroom-brightness-control ha-slider {
          --paper-slider-active-color: var(--slider-color);
          --paper-slider-secondary-color: var(--slider-bg-color);
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
        .mushroom-card {
          position: relative;
        }
        .motion-icon-corner {
          position: absolute;
          bottom: 8px;
          right: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10;
        }
        .motion-icon-corner.active {
          color: var(--mush-success-text-color, #4caf50);
        }
        .motion-icon-corner:not(.active) {
          color: var(--secondary-text-color, rgba(0,0,0,0.54));
        }
        .motion-icon-corner ha-icon {
          width: 12px;
          height: 12px;
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
            ${iconType !== 'none' ? `
              <div class="mushroom-shape-icon ${isOn ? 'active' : ''}">
                <ha-icon icon="${icon}"></ha-icon>
              </div>
            ` : ''}
            <div class="mushroom-state-info">
              ${primaryInfo === 'name' ? `
                <div class="primary">${name}</div>
              ` : ''}
              ${primaryInfo === 'state' ? `
                <div class="primary">${stateDisplay}</div>
              ` : ''}
              ${secondaryInfo === 'state' && primaryInfo !== 'state' ? `
                <div class="secondary">${stateDisplay}</div>
              ` : ''}
              ${secondaryInfo === 'name' && primaryInfo !== 'name' ? `
                <div class="secondary">${name}</div>
              ` : ''}
            </div>
            <div class="settings-button">
              <ha-icon icon="mdi:cog"></ha-icon>
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
          ${this.config.motion_enabled ? `
            <div class="motion-icon-corner ${motionActive ? 'active' : ''}">
              <ha-icon icon="mdi:motion-sensor"></ha-icon>
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
            label="Icon"
            value="${this._config.icon || ''}"
            config-value="icon"
            placeholder="mdi:lightbulb"
          ></paper-input>
        </div>
        
        <h3>Appearance</h3>
        <div class="config-row">
          <label>Layout</label>
          <paper-dropdown-menu label="Layout" config-value="layout">
            <paper-listbox slot="dropdown-content" selected="${['default', 'horizontal', 'vertical'].indexOf(this._config.layout || 'default')}">
              <paper-item>default</paper-item>
              <paper-item>horizontal</paper-item>
              <paper-item>vertical</paper-item>
            </paper-listbox>
          </paper-dropdown-menu>
        </div>
        <div class="config-row">
          <ha-switch
            checked="${this._config.fill_container || false}"
            config-value="fill_container"
          ></ha-switch>
          <span>Fill Container</span>
        </div>
        <div class="config-row">
          <label>Primary Info</label>
          <paper-dropdown-menu label="Primary Info" config-value="primary_info">
            <paper-listbox slot="dropdown-content" selected="${['name', 'state', 'last-changed', 'last-updated', 'none'].indexOf(this._config.primary_info || 'name')}">
              <paper-item>name</paper-item>
              <paper-item>state</paper-item>
              <paper-item>last-changed</paper-item>
              <paper-item>last-updated</paper-item>
              <paper-item>none</paper-item>
            </paper-listbox>
          </paper-dropdown-menu>
        </div>
        <div class="config-row">
          <label>Secondary Info</label>
          <paper-dropdown-menu label="Secondary Info" config-value="secondary_info">
            <paper-listbox slot="dropdown-content" selected="${['name', 'state', 'last-changed', 'last-updated', 'none'].indexOf(this._config.secondary_info || 'state')}">
              <paper-item>name</paper-item>
              <paper-item>state</paper-item>
              <paper-item>last-changed</paper-item>
              <paper-item>last-updated</paper-item>
              <paper-item>none</paper-item>
            </paper-listbox>
          </paper-dropdown-menu>
        </div>
        <div class="config-row">
          <label>Icon Type</label>
          <paper-dropdown-menu label="Icon Type" config-value="icon_type">
            <paper-listbox slot="dropdown-content" selected="${['icon', 'entity-picture', 'none'].indexOf(this._config.icon_type || 'icon')}">
              <paper-item>icon</paper-item>
              <paper-item>entity-picture</paper-item>
              <paper-item>none</paper-item>
            </paper-listbox>
          </paper-dropdown-menu>
        </div>
        
        <h3>Controls</h3>
        <div class="config-row">
          <ha-switch
            checked="${this._config.show_brightness_control !== false}"
            config-value="show_brightness_control"
          ></ha-switch>
          <span>Show Brightness Control</span>
        </div>
        <div class="config-row">
          <ha-switch
            checked="${this._config.show_color_temp_control || false}"
            config-value="show_color_temp_control"
          ></ha-switch>
          <span>Show Color Temperature Control</span>
        </div>
        <div class="config-row">
          <ha-switch
            checked="${this._config.show_color_control || false}"
            config-value="show_color_control"
          ></ha-switch>
          <span>Show Color Control</span>
        </div>
        <div class="config-row">
          <ha-switch
            checked="${this._config.collapsible_controls || false}"
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
          margin-bottom: 12px;
          gap: 12px;
        }
        .config-row label {
          min-width: 120px;
          font-size: 14px;
        }
        .config-row paper-input,
        .config-row paper-dropdown-menu {
          flex: 1;
        }
        .config-row ha-switch {
          margin-right: 8px;
        }
      </style>
    `;

    // Add event listeners
    const inputs = this.querySelectorAll('paper-input, ha-switch, paper-dropdown-menu');
    inputs.forEach((input) => {
      const configValue = input.getAttribute('config-value');
      if (input.tagName === 'HA-SWITCH') {
        input.addEventListener('change', (e) => {
          const newConfig = { ...this._config };
          newConfig[configValue] = input.checked;
          this.configChanged(newConfig);
        });
      } else if (input.tagName === 'PAPER-DROPDOWN-MENU') {
        input.addEventListener('iron-select', (e) => {
          const newConfig = { ...this._config };
          const listbox = input.querySelector('paper-listbox');
          if (listbox) {
            const selected = listbox.selected;
            const items = listbox.querySelectorAll('paper-item');
            if (items[selected]) {
              newConfig[configValue] = items[selected].textContent.trim();
              this.configChanged(newConfig);
            }
          }
        });
      } else {
        input.addEventListener('change', (e) => {
          const newConfig = { ...this._config };
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
          this.configChanged(newConfig);
        });
      }
    });
  }
}

customElements.define('timer-motion-card-editor', TimerMotionCardEditor);

