# Quick Start Guide

## Installation (5 minutes)

### Method 1: HACS Installation (Recommended)

1. **Open HACS** in Home Assistant
2. Go to **Frontend** tab
3. Click **three dots menu (⋮)** → **Custom repositories**
4. Click **"Add"**
5. Enter:
   - **Repository**: `https://github.com/ryandidurlabs/timer-motion-card`
   - **Category**: `Lovelace`
6. Click **"Add"**
7. Search for **"Timer Motion Card"** in HACS
8. Click **"Download"** or **"Install"**
9. **Restart Home Assistant**

### Method 2: Manual Installation

1. **Copy the card file:**
   - Copy `timer-motion-card.js` to `/config/www/timer-motion-card/`
   - Create the directory if it doesn't exist

2. **Add resource to Lovelace:**
   - Go to **Settings** → **Dashboards** → **Resources**
   - Click **"Add Resource"**
   - Enter:
     - **URL**: `/local/timer-motion-card/timer-motion-card.js`
     - **Resource type**: `JavaScript Module`
   - Click **"Create"**

## Adding Your First Card

### Step 1: Add Card to Dashboard

1. Go to your Lovelace dashboard
2. Click **three dots menu** → **Edit Dashboard**
3. Click **"Add Card"**
4. Choose **"Manual"** (or search for "Timer Motion Card" if it appears)
5. Paste this example:

```yaml
type: custom:timer-motion-card
entity: light.bedroom_light
name: Bedroom Light
timer_enabled: true
timer_duration: 600
```

6. Replace `light.bedroom_light` with your actual entity ID
7. Click **"Save"**

### Step 2: Configure via Settings UI

1. Click the **gear icon (⚙️)** in the top-right corner of the card
2. Configure:
   - Enable/disable timer
   - Set timer duration
   - Enable/disable motion sensor
   - Select motion sensor
   - Adjust card name, icon, and size
3. Settings are saved automatically

## Common Configurations

### Timer Only (5 minutes)
```yaml
type: custom:timer-motion-card
entity: light.bedroom_light
timer_enabled: true
timer_duration: 300
```

### Motion Sensor Only
```yaml
type: custom:timer-motion-card
entity: light.kitchen_light
motion_enabled: true
motion_sensor: binary_sensor.kitchen_motion
motion_off_delay: 120
```

### Both Timer + Motion
```yaml
type: custom:timer-motion-card
entity: light.hallway_light
timer_enabled: true
timer_duration: 600
motion_enabled: true
motion_sensor: binary_sensor.hallway_motion
motion_off_delay: 180
```

### With Brightness Control
```yaml
type: custom:timer-motion-card
entity: light.bedroom_light
show_brightness_control: true
timer_enabled: true
timer_duration: 300
```

## Finding Your Entity IDs

1. Go to **Settings** → **Devices & Services**
2. Find your light/fan device
3. Click on it to see entity IDs
4. Or use **Developer Tools** → **States** to browse all entities

## Quick Tips

- **Timer countdown** appears next to brightness (e.g., "75% • 5:30")
- **Motion icon** appears in card header when motion is enabled
- **Settings gear icon** is in the top-right corner of each card
- **Click card** to toggle device on/off
- **Drag brightness slider** to adjust brightness
- All settings are saved per entity automatically

## Troubleshooting

**Card shows "Entity not found"**
- Check the entity ID is correct
- Make sure the entity exists in Home Assistant

**Card not appearing in picker**
- Clear browser cache (Ctrl+Shift+R or Cmd+Shift+R)
- Restart Home Assistant
- Try adding manually with "Manual" option
- Check Resources are loaded

**Timer not counting down**
- Verify timer is enabled (check settings gear icon)
- Timer only shows when brightness control is visible
- Check `timer_duration` is a positive number

**Motion sensor not working**
- Verify motion is enabled (check settings gear icon)
- Check `motion_sensor` entity ID is correct
- Ensure motion sensor state changes (check in Developer Tools → States)

**Brightness slider not showing**
- Ensure light supports brightness (is dimmable)
- Check light is turned on (if `collapsible_controls` is enabled)
- Verify `show_brightness_control` is true

**Settings not saving**
- Check browser console (F12) for errors
- Ensure browser allows localStorage
- Try clearing browser cache

## Need More Help?

- Check [README.md](README.md) for full documentation
- Check [INSTALL_FROM_HACS.md](INSTALL_FROM_HACS.md) for HACS installation details
- Visit GitHub: https://github.com/ryandidurlabs/timer-motion-card
