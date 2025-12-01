# Timer Motion Card

A custom Lovelace card styled like Mushroom Light Card that adds timer and motion sensor functionality to any light or fan entity in Home Assistant.

## Features

- 🎨 **Mushroom Card Styling**: Matches Mushroom Light Card design exactly
- ⏱️ **Timer Functionality**: Automatically turn off lights/fans after a specified duration
- ⏲️ **Countdown Display**: Timer countdown shown next to brightness percentage
- 🏃 **Motion Sensor Integration**: Automatically turn on/off devices based on motion
- 🎚️ **Brightness Control**: Built-in brightness slider with color theming
- ⚙️ **In-Card Settings**: Gear icon opens settings modal
- 🌈 **Color Support**: Proper RGB and color temperature handling
- 💾 **Persistent Settings**: Settings saved per entity

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

### Using Settings UI

Click the **gear icon (⚙️)** in the top-right corner of any card to configure:
- Timer settings
- Motion sensor settings
- Card appearance
- Brightness control
- All options without editing YAML

### Full Configuration

```yaml
type: custom:timer-motion-card
entity: light.hallway_light
name: Hallway Light
layout: default
primary_info: name
secondary_info: state
use_light_color: true
show_brightness_control: true
timer_enabled: true
timer_duration: 300
motion_enabled: true
motion_sensor: binary_sensor.hallway_motion
motion_off_delay: 180
```

## Configuration Options

### Core Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `entity` | string | **required** | Entity ID (e.g., `light.bedroom_light`) |
| `name` | string | entity name | Custom name to display |
| `icon` | string | entity icon | Custom icon (e.g., `mdi:lightbulb`) |
| `icon_color` | string | `''` | Custom icon color |
| `use_light_color` | boolean | `true` | Use light's RGB color for theming |

### Mushroom Appearance Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `layout` | string | `'default'` | Layout: `'default'`, `'horizontal'`, `'vertical'` |
| `fill_container` | boolean | `false` | Fill container width |
| `primary_info` | string | `'name'` | Primary info display |
| `secondary_info` | string | `'state'` | Secondary info display |
| `icon_type` | string | `'icon'` | Icon type: `'icon'`, `'entity-picture'`, `'none'` |

### Control Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `show_brightness_control` | boolean | `true` | Show brightness slider |
| `show_color_temp_control` | boolean | `false` | Show color temp control |
| `show_color_control` | boolean | `false` | Show color picker |
| `collapsible_controls` | boolean | `false` | Hide controls when off |

### Timer & Motion Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `timer_enabled` | boolean | `false` | Enable timer |
| `timer_duration` | number | `300` | Timer duration (seconds) |
| `motion_enabled` | boolean | `false` | Enable motion sensor |
| `motion_sensor` | string | `''` | Motion sensor entity ID |
| `motion_off_delay` | number | `60` | Delay before turning off (seconds) |

## How It Works

- **Timer**: When enabled and device turns on, countdown starts. Device turns off when timer reaches zero. Timer displays next to brightness (e.g., "75% • 5:30").
- **Motion**: When motion detected, device turns on. Motion icon appears in header. After motion stops and delay expires, device turns off.
- **Settings**: Click gear icon to configure all options. Settings saved automatically per entity.
- **Manual Control**: Click card to toggle device on/off.

## Support

For issues or questions, check the [README.md](README.md) file or open an issue on GitHub:
https://github.com/ryandidurlabs/timer-motion-card/issues
