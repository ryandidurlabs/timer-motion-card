# Timer Motion Card for Home Assistant

A custom Lovelace card styled like Mushroom Light Card that adds timer and motion sensor functionality to any light or fan entity in Home Assistant. Features a beautiful Mushroom-style UI with in-card settings, brightness control, and automatic device management.

## Features

- 🎨 **Mushroom Card Styling**: Matches Mushroom Light Card design exactly
- ⏱️ **Timer Functionality**: Automatically turn off lights/fans after a specified duration
- ⏲️ **Countdown Display**: Timer countdown shown next to brightness percentage (e.g., "75% • 5:30")
- 🏃 **Motion Sensor Integration**: Automatically turn on/off devices based on motion sensor state
- 🎚️ **Brightness Control**: Built-in brightness slider with color theming
- ⚙️ **In-Card Settings**: Gear icon opens settings modal to configure everything
- 🌈 **Color Support**: Proper RGB and color temperature handling
- 👆 **Click to Toggle**: Tap the card to manually turn devices on/off
- 💾 **Persistent Settings**: Settings saved per entity in localStorage

## Installation

### Method 1: HACS (Home Assistant Community Store) - Recommended

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
   - **Restart Home Assistant**

4. **Add the resource to Lovelace:**
   - Go to Settings → Dashboards → Resources (or Developer Tools → YAML → Resources)
   - The resource should be automatically added, but if not:
     - Click **"Add Resource"**
     - URL: `/hacsfiles/timer-motion-card/timer-motion-card.js`
     - Resource type: `JavaScript Module`
     - Click **"Create"**

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

### Using the Settings UI

Click the **gear icon** (⚙️) in the top-right corner of any card to open the settings modal where you can configure:
- Card name, entity, and icon
- Card size (width and height)
- Timer settings (enable/disable, duration)
- Motion sensor settings (enable/disable, sensor selection, delay)
- Brightness control visibility
- All Mushroom card appearance options

Settings are automatically saved and persist across page reloads.

### Full Configuration Options

#### Entity & Display Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `entity` | string | **required** | The entity ID of the light or fan (e.g., `light.bedroom_light`) |
| `name` | string | entity name | Custom name to display on the card |
| `icon` | string | entity icon | Custom icon to display (e.g., `mdi:lightbulb`) |
| `icon_color` | string | `''` | Custom icon color (e.g., `rgb(255, 0, 0)`) |
| `use_light_color` | boolean | `true` | Use the light's RGB color for icon theming |

#### Mushroom Appearance Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `layout` | string | `'default'` | Card layout: `'default'`, `'horizontal'`, or `'vertical'` |
| `fill_container` | boolean | `false` | Fill the container width |
| `primary_info` | string | `'name'` | Primary info: `'name'`, `'state'`, `'last-changed'`, `'last-updated'`, or `'none'` |
| `secondary_info` | string | `'state'` | Secondary info: `'name'`, `'state'`, `'last-changed'`, `'last-updated'`, or `'none'` |
| `icon_type` | string | `'icon'` | Icon type: `'icon'`, `'entity-picture'`, or `'none'` |

#### Action Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `tap_action` | object | `{ action: 'toggle' }` | Action on tap: `'toggle'`, `'more-info'`, `'navigate'`, `'call-service'`, or `'none'` |
| `hold_action` | object | `{ action: 'more-info' }` | Action on hold |
| `double_tap_action` | object | `null` | Action on double tap |

#### Control Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `show_brightness_control` | boolean | `true` | Show brightness slider for dimmable lights |
| `show_color_temp_control` | boolean | `false` | Show color temperature control |
| `show_color_control` | boolean | `false` | Show color picker control |
| `collapsible_controls` | boolean | `false` | Hide controls when device is off |

#### Timer Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `timer_enabled` | boolean | `false` | Enable automatic timer functionality |
| `timer_duration` | number | `300` | Timer duration in seconds (default: 5 minutes) |

#### Motion Sensor Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `motion_enabled` | boolean | `false` | Enable motion sensor integration |
| `motion_sensor` | string | `''` | Entity ID of the motion sensor (e.g., `binary_sensor.motion`) |
| `motion_off_delay` | number | `60` | Delay in seconds before turning off after motion stops |

#### Legacy Options (for compatibility)

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `show_icon` | boolean | `true` | Show/hide the icon |
| `show_name` | boolean | `true` | Show/hide the name |
| `width` | string | `''` | Custom card width (e.g., `'200px'`, `'50%'`) |
| `height` | string | `''` | Custom card height (e.g., `'150px'`, `'auto'`) |

## Usage Examples

### Example 1: Light with Timer Only

```yaml
type: custom:timer-motion-card
entity: light.bedroom_light
name: Bedroom Light
timer_enabled: true
timer_duration: 600  # 10 minutes
```

### Example 2: Fan with Motion Sensor Only

```yaml
type: custom:timer-motion-card
entity: fan.bedroom_fan
name: Bedroom Fan
motion_enabled: true
motion_sensor: binary_sensor.bedroom_motion
motion_off_delay: 120  # 2 minutes after motion stops
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
```

### Example 4: Full Mushroom Card Configuration

```yaml
type: custom:timer-motion-card
entity: light.hallway_light
name: Hallway Light
layout: default
primary_info: name
secondary_info: state
icon_type: icon
use_light_color: true
show_brightness_control: true
collapsible_controls: false
timer_enabled: true
timer_duration: 600
motion_enabled: true
motion_sensor: binary_sensor.hallway_motion
motion_off_delay: 180
tap_action:
  action: toggle
hold_action:
  action: more-info
```

## How It Works

### Timer Functionality

- When the timer is enabled and the device turns on, a countdown timer starts
- The timer displays next to the brightness percentage (e.g., "75% • 5:30")
- When the timer reaches zero, the device automatically turns off
- The timer resets if the device is manually turned off

### Motion Sensor Functionality

- When motion is detected (sensor state becomes `on` or `detected`):
  - The device automatically turns on
  - A small motion icon appears in the card header (green when active)
  - If timer is enabled, the timer starts/resets
- When motion stops (sensor state becomes `off`):
  - After the configured delay period, the device turns off
  - The delay prevents flickering if motion briefly stops

### Brightness Control

- Brightness slider appears when the light supports dimming and is on
- Slider color matches the light's RGB color or color temperature
- Timer countdown displays inline with brightness percentage
- Adjust brightness by dragging the slider

### Settings UI

- Click the gear icon (⚙️) in the top-right corner to open settings
- Configure all options without editing YAML
- Settings are saved per entity in localStorage
- Changes take effect immediately

### Manual Control

- Click anywhere on the card to manually toggle the device on/off
- Manual control works independently of timer and motion settings
- Actions can be customized via `tap_action`, `hold_action`, and `double_tap_action`

## Troubleshooting

### Card Not Appearing in Dashboard Picker

1. **Check Resource Loading:**
   - Go to Settings → Dashboards → Resources
   - Verify `/hacsfiles/timer-motion-card/timer-motion-card.js` is listed
   - If not, add it manually

2. **Clear Browser Cache:**
   - Hard refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
   - Or clear browser cache completely

3. **Restart Home Assistant:**
   - After installing/updating via HACS, restart Home Assistant

4. **Try Manual Entry:**
   - In dashboard editor, choose "Manual" instead of searching
   - Enter: `type: custom:timer-motion-card`

5. **Check Browser Console:**
   - Press F12 to open developer tools
   - Look for JavaScript errors

### Timer Not Working

- Verify `timer_enabled` is set to `true` (check in settings UI)
- Check that `timer_duration` is a positive number
- Ensure the entity supports `turn_on` and `turn_off` services
- Timer only shows when device is on and brightness control is visible

### Motion Sensor Not Working

- Verify `motion_enabled` is set to `true` (check in settings UI)
- Check that `motion_sensor` points to a valid binary sensor entity
- Ensure motion sensor state changes between `on`/`off` or `detected`/`clear`
- Check Home Assistant logs for any service call errors
- Motion icon should appear in card header when enabled

### Brightness Slider Not Showing

- Ensure `show_brightness_control` is `true` (default)
- Check that the light supports brightness (has `brightness` attribute)
- Slider only appears when the light is on (if `collapsible_controls` is enabled)

### Settings Not Saving

- Check browser console for localStorage errors
- Ensure browser allows localStorage
- Try clearing browser cache and reloading

## Customization

The card uses Mushroom CSS variables for theming:

- `--mush-border-radius`: Card border radius
- `--mush-card-background`: Card background color
- `--mush-icon-size`: Icon size
- `--mush-icon-border-radius`: Icon border radius
- `--rgb-state-light-on-rgb`: Light on color
- `--rgb-disabled-rgb`: Disabled/off color
- `--rgb-primary-text-color`: Primary text color
- `--rgb-secondary-text-color`: Secondary text color

The card automatically adapts to your Home Assistant theme and uses the light's actual color for icon and slider theming.

## Version

Current version: **2.0.3**

## Support

- **GitHub Repository**: https://github.com/ryandidurlabs/timer-motion-card
- **Issues**: https://github.com/ryandidurlabs/timer-motion-card/issues
- **Releases**: https://github.com/ryandidurlabs/timer-motion-card/releases

## License

This is a custom card for use with Home Assistant.
