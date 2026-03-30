#!/bin/bash
# ═══════════════════════════════════════════════════
# GOOD TIMES iOS — ONE-COMMAND BUILD & DEPLOY
# Linda: Just run this script. It does everything.
# ═══════════════════════════════════════════════════

set -e
echo ""
echo "╔═══════════════════════════════════════════╗"
echo "║   GOOD TIMES iOS — Auto Build Script      ║"
echo "╚═══════════════════════════════════════════╝"
echo ""

# Check prerequisites
echo "🔍 Checking prerequisites..."
command -v node >/dev/null 2>&1 || { echo "❌ Node.js not found. Run: brew install node"; exit 1; }
command -v xcodebuild >/dev/null 2>&1 || { echo "❌ Xcode not found. Install from App Store."; exit 1; }
echo "✅ Node.js: $(node -v)"
echo "✅ Xcode: $(xcodebuild -version | head -1)"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install --silent
echo "✅ Dependencies installed"
echo ""

# Build web app
echo "🔨 Building web app..."
npm run build
echo "✅ Web app built"
echo ""

# Sync to iOS
echo "📱 Syncing to iOS..."
npx cap sync ios
echo "✅ iOS synced"
echo ""

# Open Xcode
echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║  XCODE IS OPENING. DO THESE 5 THINGS:                ║"
echo "║                                                       ║"
echo "║  1. Select 'App' target in sidebar                    ║"
echo "║  2. Go to 'Signing & Capabilities' tab                ║"
echo "║  3. Check 'Automatically manage signing'              ║"
echo "║  4. Select Dr. Dorsey's Team from dropdown            ║"
echo "║  5. Connect iPhone → Press ▶ Play to test             ║"
echo "║                                                       ║"
echo "║  WHEN READY TO SUBMIT:                                ║"
echo "║  Product → Archive → Distribute App →                 ║"
echo "║  App Store Connect → Upload                           ║"
echo "║                                                       ║"
echo "║  Then go to appstoreconnect.apple.com:                ║"
echo "║  TestFlight → Add thedoctordorsey@gmail.com           ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""

npx cap open ios

echo "🎉 Xcode opened. Follow the instructions above."
