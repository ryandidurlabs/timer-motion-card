# Quick Start Guide

## Installation (5 minutes)

### Step 1: Copy the Card File

**Option A: Using SMB (Recommended for you)**
1. Connect to `ha.didur.com` via SMB
2. Navigate to `/config/www/`
3. Create folder `timer-motion-card` if it doesn't exist
4. Copy `timer-motion-card.js` into that folder

**Option B: Using File Editor**
1. Go to Home Assistant → Settings → Add-ons → File editor
2. Navigate to `/config/www/`
3. Create folder `timer-motion-card`
4. Create new file `timer-motion-card.js` and paste the contents

### Step 2: Add Resource to Lovelace

1. Go to **Settings** → **Dashboards** → **Resources** (or **Developer Tools** → **YAML** → **Resources**)
2. Click **"Add Resource"** (or **"+"** button)
3. Enter:
   - **URL**: `/local/timer-motion-card/timer-motion-card.js`
   - **Resource type**: `JavaScript Module`
4. Click **"Create"** or **"Save"**

### Step 3: Add Card to Dashboard

1. Go to your dashboard
2. Click the three dots menu → **Edit Dashboard**
3. Click **"Add Card"**
4. Choose **"Manual"** or **"By card"**
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

## Finding Your Entity IDs

1. Go to **Settings** → **Devices & Services**
2. Find your light/fan device
3. Click on it to see entity IDs
4. Or use **Developer Tools** → **States** to browse all entities

## Troubleshooting

**Card shows "Entity not found"**
- Check the entity ID is correct
- Make sure the entity exists in Home Assistant

**Timer not counting down**
- Verify `timer_enabled: true`
- Check `timer_duration` is a number (in seconds)
- Refresh the page

**Motion sensor not working**
- Verify `motion_enabled: true`
- Check `motion_sensor` entity ID is correct
- Ensure motion sensor state changes (check in Developer Tools → States)

**Card not appearing**
- Check Resources tab - card should be listed
- Clear browser cache (Ctrl+Shift+R)
- Check browser console for errors (F12)

