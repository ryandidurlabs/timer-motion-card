# Install Timer Motion Card via HACS

Your card is now available on GitHub and ready to install via HACS!

## Repository URL
**https://github.com/ryandidurlabs/timer-motion-card**

## Installation Steps

### Step 1: Add Repository to HACS

1. Open **HACS** in your Home Assistant instance (ha.didur.com)
2. Go to the **Frontend** tab
3. Click the **three dots menu (⋮)** in the top right corner
4. Select **"Custom repositories"**
5. Click **"Add"** button
6. Enter the following:
   - **Repository**: `https://github.com/ryandidurlabs/timer-motion-card`
   - **Category**: `Lovelace`
7. Click **"Add"**

### Step 2: Install the Card

1. In HACS Frontend, search for **"Timer Motion Card"**
2. Click on **"Timer Motion Card"** in the search results
3. Click the **"Download"** or **"Install"** button
4. **Restart Home Assistant** (important!)

### Step 3: Add Resource to Lovelace

The resource should be automatically added, but if not:

1. Go to **Settings** → **Dashboards** → **Resources**
   - Or: **Developer Tools** → **YAML** → **Resources**
2. Click **"Add Resource"** (or **"+"** button)
3. Enter:
   - **URL**: `/hacsfiles/timer-motion-card/timer-motion-card.js`
   - **Resource type**: `JavaScript Module`
4. Click **"Create"** or **"Save"**

### Step 4: Add Card to Dashboard

1. Go to your Lovelace dashboard
2. Click the **three dots menu** → **Edit Dashboard**
3. Click **"Add Card"**
4. Choose **"Manual"** or search for **"Timer Motion Card"**
5. Add your first card:

```yaml
type: custom:timer-motion-card
entity: light.bedroom_light
name: Bedroom Light
timer_enabled: true
timer_duration: 600
```

Replace `light.bedroom_light` with your actual entity ID.

## Quick Test

Try this minimal configuration to test:

```yaml
type: custom:timer-motion-card
entity: light.YOUR_LIGHT_ENTITY
timer_enabled: true
timer_duration: 60
```

This will create a card that:
- Shows your light status
- Starts a 60-second countdown when turned on
- Automatically turns off after 60 seconds

## Verify Installation

1. Check **Settings** → **Dashboards** → **Resources**
   - Should see: `/hacsfiles/timer-motion-card/timer-motion-card.js`
2. Add a test card to your dashboard
3. Verify the card appears and shows the countdown timer

## Troubleshooting

**Card not appearing in HACS search:**
- Make sure you added the repository URL correctly
- Check that the repository is public (it is!)
- Try refreshing HACS

**Card not loading:**
- Restart Home Assistant after installation
- Check browser console (F12) for errors
- Verify resource is added in Lovelace Resources
- Clear browser cache (Ctrl+Shift+R or Cmd+Shift+R)

**Need help?**
- Check the [README.md](README.md) for full documentation
- Check [QUICK_START.md](QUICK_START.md) for quick reference

## Repository Links

- **GitHub**: https://github.com/ryandidurlabs/timer-motion-card
- **Releases**: https://github.com/ryandidurlabs/timer-motion-card/releases
- **Latest Release**: v1.0.0

---

**Enjoy your new Timer Motion Card!** 🎉

