# Sideload iOS App Without Apple Developer Account

## Method 1: AltStore (Recommended)

### What is AltStore?
- Free alternative App Store for iOS
- No jailbreak required
- Uses your personal Apple ID (free)
- 7-day signing limit (renewable)

### Setup Steps:
1. **Install AltServer on Computer:**
   - Download from: https://altstore.io/
   - Install on Mac/Windows

2. **Install AltStore on iPhone:**
   - Connect iPhone to computer
   - Open AltServer and install AltStore

3. **Sideload Your App:**
   - Build IPA file using Codemagic (unsigned version)
   - Import IPA into AltStore
   - Install directly on iPhone

### Codemagic Configuration for AltStore:
Use the `codemagic-development.yaml` (unsigned build) I created earlier.

## Method 2: Sideloadly

### Features:
- Free sideloading tool
- Works with any Apple ID
- Automatic re-signing
- No computer required after setup

### Setup:
1. **Download Sideloadly:** https://sideloadly.io/
2. **Connect iPhone** to computer
3. **Import IPA file** from Codemagic build
4. **Enter Apple ID** (free account works)
5. **Install directly** to iPhone

## Method 3: 3uTools

### Features:
- Free iOS management tool
- IPA installation without developer account
- Device management features

### Setup:
1. **Download 3uTools:** http://www.3u.com/
2. **Connect iPhone** via USB
3. **Go to Apps section**
4. **Install IPA** from Codemagic build

## Method 4: Xcode (Mac Only)

### Requirements:
- Mac computer with Xcode
- Free Apple ID
- Physical iPhone

### Steps:
1. **Download project** from GitHub
2. **Open in Xcode**
3. **Sign with free Apple ID**
4. **Install to connected iPhone**
5. **Trust developer** in iPhone settings

## Method 5: GitHub Actions + Self-Hosted

### Concept:
- Build on GitHub Actions
- Host IPA files privately
- Download and sideload with tools above

### Implementation:
I can create a GitHub Actions workflow that builds your app and provides download links.

## Method 6: Progressive Web App (PWA)

### Alternative Approach:
- Add to iPhone home screen
- Works like native app
- No installation required
- Uses Safari engine

### Setup:
I can configure your existing web app as a PWA that installs like a native app.

## Recommended Workflow:

### For Development Testing:
1. **Use Codemagic** with unsigned build configuration
2. **Download IPA** from build artifacts
3. **Install via AltStore** or Sideloadly
4. **Refresh weekly** (7-day limit)

### For Long-term Use:
1. **Convert to PWA** for permanent installation
2. **No renewal required**
3. **Works offline**
4. **Native-like experience**

## Limitations of Free Sideloading:

### 7-Day Signing:
- Apps expire after 7 days
- Must be refreshed/reinstalled
- AltStore can auto-refresh

### Device Limit:
- 3 apps maximum per free Apple ID
- Can delete and reinstall others

### No App Store Features:
- No automatic updates
- No TestFlight distribution
- No public distribution

## Which Method Would You Prefer?

1. **AltStore** - Most convenient for regular use
2. **Sideloadly** - Simple one-time setup
3. **PWA** - No expiration, works forever
4. **Xcode** - If you have a Mac available

I can set up any of these methods and provide detailed instructions for your specific needs.