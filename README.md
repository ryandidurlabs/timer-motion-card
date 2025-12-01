# Timer & Motion Card for Home Assistant

A custom Lovelace card that adds timer and motion sensor functionality to any light or fan entity in Home Assistant. The card displays a countdown timer when enabled and can automatically control devices based on motion sensor triggers.

## Features

- ✅ **Timer Functionality**: Automatically turn off lights/fans after a specified duration
- ✅ **Countdown Display**: Visual countdown timer shown on the card
- ✅ **Motion Sensor Integration**: Automatically turn on/off devices based on motion sensor state
- ✅ **Configurable Delays**: Set custom delays for motion sensor off triggers
- ✅ **Mushroom Card Style**: Clean, modern UI similar to Mushroom cards
- ✅ **Click to Toggle**: Tap the card to manually turn devices on/off

## Installation

### Method 1: HACS (Home Assistant Community Store) - Recommended

**If installing from a GitHub repository:**

1. **Install HACS** (if you haven't already):
   - Follow the [HACS installation guide](https://hacs.xyz/docs/setup/download)

2. **Add this repository to HACS:**
   - Open HACS in Home Assistant
   - Go to **Frontend**
   - Click the three dots menu (⋮) in the top right → **Custom repositories**
   - Click **"Add"**
   - Enter:
     - **Repository**: `https://github.com/ryandidurlabs/timer-motion-card`
     - **Category**: `Lovelace`
   - Click **"Add"**

3. **Install the card:**
   - Search for "Timer Motion Card" in HACS Frontend
   - Click on it
   - Click **"Download"** or **"Install"**
   - Restart Home Assistant

4. **Add the resource to Lovelace:**
   - Go to Settings → Dashboards → Resources (or Developer Tools → YAML → Resources)
   - The resource should be automatically added, but if not:
     - Click **"Add Resource"**
     - URL: `/hacsfiles/timer-motion-card/timer-motion-card.js`
     - Resource type: `JavaScript Module`
     - Click **"Create"**

**If installing from a local repository (for development):**

1. Copy this entire folder to your Home Assistant config directory
2. Add the resource manually:
   - Go to Settings → Dashboards → Resources
   - URL: `/local/timer-motion-card/timer-motion-card.js`
   - Resource type: `JavaScript Module`

### Method 2: Manual Installation

1. **Copy the card file:**
   - Copy `timer-motion-card.js` to `/config/www/timer-motion-card/`
   - Create the directory if it doesn't exist

2. **Add the resource to Lovelace:**
   - Go to Settings → Dashboards → Resources
   - Click "Add Resource"
   - URL: `/local/timer-motion-card/timer-motion-card.js`
   - Resource type: JavaScript Module
   - Click "Create"

## Configuration

### Basic Configuration

```yaml
type: custom:timer-motion-card
entity: light.bedroom_light
name: Bedroom Light
```

### Full Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `entity` | string | **required** | The entity ID of the light or fan (e.g., `light.bedroom_light`) |
| `name` | string | entity name | Custom name to display on the card |
| `timer_enabled` | boolean | `false` | Enable automatic timer functionality |
| `timer_duration` | number | `300` | Timer duration in seconds (default: 5 minutes) |
| `motion_enabled` | boolean | `false` | Enable motion sensor integration |
| `motion_sensor` | string | `''` | Entity ID of the motion sensor (e.g., `binary_sensor.motion`) |
| `motion_off_delay` | number | `60` | Delay in seconds before turning off after motion stops |
| `icon` | string | entity icon | Custom icon to display (e.g., `mdi:lightbulb`) |
| `show_icon` | boolean | `true` | Show/hide the icon |
| `show_name` | boolean | `true` | Show/hide the name |

## Usage Examples

### Example 1: Light with Timer Only

```yaml
type: custom:timer-motion-card
entity: light.bedroom_light
name: Bedroom Light
timer_enabled: true
timer_duration: 600  # 10 minutes
icon: mdi:lightbulb
```

### Example 2: Fan with Motion Sensor Only

```yaml
type: custom:timer-motion-card
entity: fan.bedroom_fan
name: Bedroom Fan
motion_enabled: true
motion_sensor: binary_sensor.bedroom_motion
motion_off_delay: 120  # 2 minutes after motion stops
icon: mdi:fan
```

### Example 3: Light with Both Timer and Motion

```yaml
type: custom:timer-motion-card
entity: light.kitchen_light
name: Kitchen Light
timer_enabled: true
timer_duration: 300  # 5 minutes
motion_enabled: true
motion_sensor: binary_sensor.kitchen_motion
motion_off_delay: 180  # 3 minutes after motion stops
icon: mdi:lightbulb-outline
```

## How It Works

### Timer Functionality

- When the timer is enabled and the device turns on, a countdown timer starts
- The timer displays in MM:SS format on the card
- When the timer reaches zero, the device automatically turns off
- The timer resets if the device is manually turned off

### Motion Sensor Functionality

- When motion is detected (sensor state becomes `on` or `detected`):
  - The device automatically turns on
  - If timer is enabled, the timer starts/resets
- When motion stops (sensor state becomes `off`):
  - After the configured delay period, the device turns off
  - The delay prevents flickering if motion briefly stops

### Manual Control

- Click anywhere on the card to manually toggle the device on/off
- Manual control works independently of timer and motion settings

## Troubleshooting

### Card Not Appearing

1. **Check Resource Loading:**
   - Go to Settings → Dashboards → Resources
   - Verify the resource is loaded correctly
   - Check browser console for JavaScript errors

2. **Check File Path:**
   - Ensure `timer-motion-card.js` is in `/config/www/timer-motion-card/`
   - Verify file permissions allow reading

3. **Clear Browser Cache:**
   - Hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R)
   - Or clear browser cache

### Timer Not Working

- Verify `timer_enabled` is set to `true`
- Check that `timer_duration` is a positive number
- Ensure the entity supports `turn_on` and `turn_off` services

### Motion Sensor Not Working

- Verify `motion_enabled` is set to `true`
- Check that `motion_sensor` points to a valid binary sensor entity
- Ensure the motion sensor state changes between `on`/`off` or `detected`/`clear`
- Check Home Assistant logs for any service call errors

## Customization

The card uses CSS variables that can be customized in your theme:

- `--primary-color`: Main icon color
- `--success-color`: On state color
- `--disabled-color`: Off state color
- `--warning-color`: Timer background color
- `--info-color`: Motion status background color
- `--card-background-color`: Card background

## Support

For issues or feature requests, please check:
- Home Assistant Community Forums
- GitHub Issues (if repository exists)

## License

This is a custom card for personal use with Home Assistant.

