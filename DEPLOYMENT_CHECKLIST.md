# Deployment Checklist

Use this checklist to ensure everything is ready for HACS deployment.

## Pre-Deployment Checklist

- [x] `timer-motion-card.js` - Main card file exists
- [x] `hacs.json` - HACS configuration file exists
- [x] `info.md` - HACS info page exists
- [x] `README.md` - Main documentation exists
- [x] `manifest.json` - Version information exists
- [x] `.hacsignore` - Files to ignore in HACS
- [x] `.gitignore` - Git ignore file

## File Structure Verification

Your repository should have this structure:

```
timer-motion-card/
├── timer-motion-card.js      ✅ Main card (required)
├── hacs.json                  ✅ HACS config (required)
├── info.md                    ✅ HACS info (recommended)
├── README.md                  ✅ Documentation (recommended)
├── manifest.json              ✅ Version info (optional)
├── .hacsignore                ✅ Ignore file (optional)
├── .gitignore                 ✅ Git ignore (optional)
├── HACS_SETUP.md             📖 Setup guide
├── QUICK_START.md            📖 Quick start guide
└── (other example files)     📝 Examples
```

## Git Repository Setup

1. **Initialize Git** (if not done):
   ```bash
   git init
   git add .
   git commit -m "Initial release: Timer Motion Card v1.0.0"
   ```

2. **Create GitHub Repository**:
   - Go to GitHub and create a new repository
   - Name: `timer-motion-card` (or your preferred name)
   - Make it **public** (required for HACS) or ensure proper authentication

3. **Push to GitHub**:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/timer-motion-card.git
   git branch -M main
   git push -u origin main
   ```

4. **Create First Release** (recommended):
   - Go to GitHub repository → Releases → Create new release
   - Tag: `v1.0.0`
   - Title: `Timer Motion Card v1.0.0`
   - Publish release

## HACS Installation Steps

### For End Users:

1. Open HACS in Home Assistant
2. Go to **Frontend** tab
3. Click **⋮** (three dots) → **Custom repositories**
4. Click **"Add"**
5. Enter:
   - **Repository**: `https://github.com/YOUR_USERNAME/timer-motion-card`
   - **Category**: `Lovelace`
6. Click **"Add"**
7. Search for "Timer Motion Card"
8. Click on it → **"Download"**
9. **Restart Home Assistant**

### Verify Installation:

1. Go to **Settings** → **Dashboards** → **Resources**
2. Verify resource is listed: `/hacsfiles/timer-motion-card/timer-motion-card.js`
3. Add test card to dashboard:
   ```yaml
   type: custom:timer-motion-card
   entity: light.test_light
   timer_enabled: true
   timer_duration: 60
   ```
4. Verify card appears and functions correctly

## Testing Checklist

Before deploying, test:

- [ ] Card displays correctly
- [ ] Timer countdown works
- [ ] Timer turns off device when expired
- [ ] Motion sensor triggers device on
- [ ] Motion sensor turns off device after delay
- [ ] Manual toggle works (click card)
- [ ] Card updates when entity state changes
- [ ] Works with lights
- [ ] Works with fans
- [ ] Error handling (invalid entity shows error)

## Common Issues

### Card not appearing in HACS
- ✅ Repository is public (or authenticated)
- ✅ `hacs.json` exists in root
- ✅ `timer-motion-card.js` exists in root
- ✅ Repository structure is correct

### Installation fails
- ✅ Check HACS logs
- ✅ Verify file permissions
- ✅ Check repository URL is correct

### Card not loading
- ✅ Resource added in Lovelace Resources
- ✅ Browser cache cleared
- ✅ Home Assistant restarted
- ✅ Check browser console for errors

## Next Steps After Deployment

1. **Test thoroughly** on your Home Assistant instance
2. **Update documentation** with any issues found
3. **Create GitHub releases** for version tracking
4. **Consider adding**:
   - Screenshots to README
   - More usage examples
   - Video tutorial (optional)
   - GitHub Actions for automation (optional)

## Version Updates

When updating:

1. Update version in `manifest.json`
2. Update `README.md` with changelog
3. Commit changes:
   ```bash
   git add .
   git commit -m "v1.0.1: Description of changes"
   git push
   ```
4. Create new release tag on GitHub
5. Users can update via HACS

---

**Ready to deploy?** Follow the steps in `HACS_SETUP.md` for detailed instructions.

