#!/bin/bash

# Installation script for Timer Motion Card
# This script helps set up the card in Home Assistant

echo "Timer Motion Card Installation Script"
echo "======================================"
echo ""

# Check if we're in the right directory
if [ ! -f "timer-motion-card.js" ]; then
    echo "Error: timer-motion-card.js not found in current directory"
    exit 1
fi

# Get Home Assistant config directory
HA_CONFIG="${HOME}/.homeassistant"
if [ -z "$HA_CONFIG" ] || [ ! -d "$HA_CONFIG" ]; then
    # Try common locations
    if [ -d "/config" ]; then
        HA_CONFIG="/config"
    elif [ -d "${HOME}/config" ]; then
        HA_CONFIG="${HOME}/config"
    else
        echo "Please enter your Home Assistant config directory path:"
        read HA_CONFIG
    fi
fi

if [ ! -d "$HA_CONFIG" ]; then
    echo "Error: Home Assistant config directory not found: $HA_CONFIG"
    exit 1
fi

# Create www directory if it doesn't exist
WWW_DIR="${HA_CONFIG}/www"
if [ ! -d "$WWW_DIR" ]; then
    echo "Creating www directory..."
    mkdir -p "$WWW_DIR"
fi

# Create card directory
CARD_DIR="${WWW_DIR}/timer-motion-card"
if [ ! -d "$CARD_DIR" ]; then
    echo "Creating timer-motion-card directory..."
    mkdir -p "$CARD_DIR"
fi

# Copy card file
echo "Copying timer-motion-card.js..."
cp timer-motion-card.js "${CARD_DIR}/timer-motion-card.js"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Installation complete!"
    echo ""
    echo "Next steps:"
    echo "1. Go to Home Assistant → Settings → Dashboards → Resources"
    echo "2. Click 'Add Resource'"
    echo "3. URL: /local/timer-motion-card/timer-motion-card.js"
    echo "4. Resource type: JavaScript Module"
    echo "5. Click 'Create'"
    echo ""
    echo "Then add the card to your Lovelace dashboard using:"
    echo "  type: custom:timer-motion-card"
    echo "  entity: light.your_light"
    echo ""
else
    echo "❌ Installation failed!"
    exit 1
fi

