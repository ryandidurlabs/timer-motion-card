# HACS Setup Guide

This guide will help you set up this custom card for deployment through HACS.

## Prerequisites

1. **HACS installed** in your Home Assistant instance
2. **Git repository** (GitHub, GitLab, or Gitea) to host the card
3. **Git** installed on your local machine

## Step 1: Create a Git Repository

1. Create a new repository on GitHub (or your preferred Git hosting service)
2. Name it something like `timer-motion-card` or `ha-timer-motion-card`
3. Make it public (required for HACS) or ensure you have proper authentication

## Step 2: Prepare Files for Git

The repository should contain these files in the root:

```
timer-motion-card/
├── timer-motion-card.js    # Main card file (required)
├── hacs.json              # HACS configuration (required)
├── info.md                # HACS info page (optional but recommended)
├── README.md              # Main documentation (recommended)
├── manifest.json          # Version info (optional)
└── .hacsignore            # Files to ignore in HACS (optional)
```

## Step 3: Initialize Git Repository

```bash
# Navigate to the project directory
cd /Users/rdidur/Library/CloudStorage/OneDrive-Home/Git/Scripts/Home_Assistant

# Initialize git (if not already done)
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial release: Timer Motion Card v1.0.0"

# Add remote repository
git remote add origin https://github.com/ryandidurlabs/timer-motion-card.git

# Push to repository
git branch -M main
git push -u origin main
```

## Step 4: Create a Release (Optional but Recommended)

For version tracking, create a GitHub release:

1. Go to your repository on GitHub
2. Click **"Releases"** → **"Create a new release"**
3. Tag version: `v1.0.0`
4. Release title: `Timer Motion Card v1.0.0`
5. Description: Brief description of features
6. Click **"Publish release"**

## Step 5: Install via HACS

### For End Users:

1. Open HACS in Home Assistant
2. Go to **Frontend**
3. Click the three dots menu (⋮) → **Custom repositories**
4. Click **"Add"**
5. Enter:
   - **Repository**: `https://github.com/ryandidurlabs/timer-motion-card`
   - **Category**: `Lovelace`
6. Click **"Add"**
7. Search for "Timer Motion Card"
8. Click **"Download"**
9. Restart Home Assistant

### For Yourself (Local Development):

If you want to test locally before pushing to GitHub:

1. Copy the files to `/config/www/timer-motion-card/` on your Home Assistant instance
2. Add resource manually:
   - Settings → Dashboards → Resources
   - URL: `/local/timer-motion-card/timer-motion-card.js`
   - Type: JavaScript Module

## Step 6: Verify Installation

1. Go to Settings → Dashboards → Resources
2. Verify the card resource is listed
3. Add a card to your dashboard:
   ```yaml
   type: custom:timer-motion-card
   entity: light.test_light
   timer_enabled: true
   timer_duration: 60
   ```
4. Check that the card appears and works correctly

## Updating the Card

When you make changes:

1. Update the version in `manifest.json` (if using)
2. Commit changes:
   ```bash
   git add .
   git commit -m "Description of changes"
   git push
   ```
3. Create a new release tag (optional)
4. Users can update via HACS:
   - Go to HACS → Frontend
   - Find "Timer Motion Card"
   - Click **"Update"** if available

## HACS Configuration Details

The `hacs.json` file tells HACS:
- **name**: Display name in HACS
- **render_readme**: Whether to render README.md in HACS UI
- **filename**: The main JavaScript file to load
- **domains**: What type of integration this is (`lovelace` for cards)
- **iot_class**: Classification for Home Assistant

## Troubleshooting

### Card not appearing in HACS search
- Ensure repository is public (or you have proper authentication)
- Check that `hacs.json` is in the root directory
- Verify the repository structure matches HACS requirements

### Installation fails
- Check that `timer-motion-card.js` exists in the root
- Verify file permissions
- Check HACS logs: Settings → Add-ons → HACS → Logs

### Resource not loading
- Manually add resource in Lovelace Resources
- Check browser console for errors
- Verify the file path is correct

## Next Steps

- Consider adding screenshots to README.md
- Add more examples to documentation
- Create GitHub Actions for automated releases (optional)
- Add changelog for version tracking

