#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "==================================="
echo "Homebridge Pollen - Development Setup"
echo "==================================="
echo

# Check Node.js version
NODE_VERSION=$(node -v 2>/dev/null | cut -d'v' -f2 | cut -d'.' -f1)
if [ -z "$NODE_VERSION" ]; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    exit 1
fi

if [ "$NODE_VERSION" -lt 20 ]; then
    echo -e "${RED}Error: Node.js 20 or later is required (found v$NODE_VERSION)${NC}"
    exit 1
fi
echo -e "${GREEN}✓${NC} Node.js v$(node -v | cut -d'v' -f2) detected"

# Install dependencies
echo
echo "Installing dependencies..."
npm install
echo -e "${GREEN}✓${NC} Dependencies installed"

# Create homebridge directory
mkdir -p .homebridge
echo -e "${GREEN}✓${NC} Created .homebridge/ directory"

# Get API key
echo
if [ -n "$AMBEE_API_KEY" ]; then
    API_KEY="$AMBEE_API_KEY"
    echo -e "${GREEN}✓${NC} Using API key from AMBEE_API_KEY environment variable"
else
    echo -e "${YELLOW}Enter your Ambee API key${NC} (get one free at https://api-dashboard.getambee.com/):"
    read -r API_KEY
    if [ -z "$API_KEY" ]; then
        echo -e "${RED}Error: API key is required${NC}"
        exit 1
    fi
fi

# Get location
echo
if [ -n "$POLLEN_LOCATION" ]; then
    LOCATION="$POLLEN_LOCATION"
    echo -e "${GREEN}✓${NC} Using location from POLLEN_LOCATION environment variable"
else
    echo -e "${YELLOW}Enter your location${NC} (zip code or city name, e.g., 10001 or \"New York\"):"
    read -r LOCATION
    if [ -z "$LOCATION" ]; then
        LOCATION="10001"
        echo "Using default location: $LOCATION"
    fi
fi

# Create config file
cat > .homebridge/config.json << EOF
{
  "bridge": {
    "name": "Test Homebridge",
    "username": "CC:22:3D:E3:CE:30",
    "port": 51826,
    "pin": "031-45-154"
  },
  "platforms": [
    {
      "platform": "HomebridgePollen",
      "apiKey": "$API_KEY",
      "location": "$LOCATION"
    }
  ]
}
EOF
echo -e "${GREEN}✓${NC} Created .homebridge/config.json"

# Build and link
echo
echo "Building and linking plugin..."
npm run build
npm link
echo -e "${GREEN}✓${NC} Plugin built and linked"

# Done
echo
echo "==================================="
echo -e "${GREEN}Setup complete!${NC}"
echo "==================================="
echo
echo "To start the development server:"
echo "  npm run dev"
echo
echo "To pair with Apple Home:"
echo "  1. Open Home app → + → Add Accessory → More Options..."
echo "  2. Select 'Test Homebridge'"
echo "  3. Enter PIN: 031-45-154"
echo
