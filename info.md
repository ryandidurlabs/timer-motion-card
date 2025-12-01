# Timer Motion Card

A custom Lovelace card that adds timer and motion sensor functionality to any light or fan entity in Home Assistant.

## Features

- ⏱️ **Timer Functionality**: Automatically turn off lights/fans after a specified duration
- ⏲️ **Countdown Display**: Visual countdown timer shown on the card
- 🏃 **Motion Sensor Integration**: Automatically turn on/off devices based on motion sensor state
- ⚙️ **Configurable Delays**: Set custom delays for motion sensor off triggers
- 🎨 **Mushroom Card Style**: Clean, modern UI similar to Mushroom cards
- 👆 **Click to Toggle**: Tap the card to manually turn devices on/off

## Installation

### HACS Installation (Recommended)

1. Open HACS in Home Assistant
2. Go to **Frontend**
3. Click the three dots menu (⋮) → **Custom repositories**
4. Add this repository:
   - **Repository**: `https://github.com/ryandidurlabs/timer-motion-card`
   - **Category**: `Lovelace`
5. Click **"Add"**
6. Search for "Timer Motion Card" in HACS
7. Click **"Download"**
8. Restart Home Assistant

### Manual Installation

1. Copy `timer-motion-card.js` to `/config/www/timer-motion-card/`
2. Add resource in Lovelace:
   - Go to Settings → Dashboards → Resources
   - Add Resource: `/local/timer-motion-card/timer-motion-card.js`
   - Type: JavaScript Module

## Usage

### Basic Configuration

```yaml
type: custom:timer-motion-card
entity: light.bedroom_light
name: Bedroom Light
timer_enabled: true
timer_duration: 600  # 10 minutes
```

### With Motion Sensor

```yaml
type: custom:timer-motion-card
entity: light.kitchen_light
motion_enabled: true
motion_sensor: binary_sensor.kitchen_motion
motion_off_delay: 120  # 2 minutes
```

### Full Configuration

```yaml
type: custom:timer-motion-card
entity: light.hallway_light
name: Hallway Light
timer_enabled: true
timer_duration: 300
motion_enabled: true
motion_sensor: binary_sensor.hallway_motion
motion_off_delay: 180
icon: mdi:lightbulb-outline
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `entity` | string | **required** | Entity ID (e.g., `light.bedroom_light`) |
| `name` | string | entity name | Custom name to display |
| `timer_enabled` | boolean | `false` | Enable timer functionality |
| `timer_duration` | number | `300` | Timer duration in seconds |
| `motion_enabled` | boolean | `false` | Enable motion sensor |
| `motion_sensor` | string | `''` | Motion sensor entity ID |
| `motion_off_delay` | number | `60` | Delay before turning off (seconds) |
| `icon` | string | entity icon | Custom icon (e.g., `mdi:lightbulb`) |
| `show_icon` | boolean | `true` | Show/hide icon |
| `show_name` | boolean | `true` | Show/hide name |

## How It Works

- **Timer**: When enabled and device turns on, countdown starts. Device turns off when timer reaches zero.
- **Motion**: When motion detected, device turns on. After motion stops and delay expires, device turns off.
- **Manual Control**: Click card to toggle device on/off.

## Support

For issues or questions, please check the [README.md](README.md) file or open an issue on GitHub.

