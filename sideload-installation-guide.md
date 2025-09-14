# Sideload Installation Guide - Drive KL Rental System

## Overview
This guide shows you how to install your Drive KL Rental iOS app using the unsigned IPA file built by Codemagic.

**Your Apple ID**: m.aqibnadeem@live.com (use this for all sideloading methods)

## Method 1: AltStore (Recommended)

### Step 1: Install AltServer on Computer
1. **Download AltServer**: https://altstore.io/
2. **Install on Mac/Windows**
3. **Run AltServer** (appears in menu bar/system tray)

### Step 2: Install AltStore on iPhone
1. **Connect iPhone** to computer via USB
2. **Trust the computer** on iPhone
3. **In AltServer menu**: Click "Install AltStore" → Select your iPhone
4. **Enter Apple ID**: m.aqibnadeem@live.com
5. **Enter password** for your Apple ID
6. **AltStore installs** on iPhone

### Step 3: Trust AltStore
1. **iPhone Settings** → General → VPN & Device Management
2. **Find your Apple ID** → Trust
3. **Open AltStore** on iPhone

### Step 4: Install Drive KL Rental
1. **Download IPA** from Codemagic build artifacts
2. **Import to AltStore**:
   - Option A: Email IPA to yourself and open with AltStore
   - Option B: Use AltServer "Install .ipa" feature
3. **Install completes automatically**

### Step 5: Refresh Weekly
- AltStore automatically refreshes apps every 7 days
- Keep AltServer running on computer for auto-refresh

## Method 2: Sideloadly

### Step 1: Download Sideloadly
1. **Download**: https://sideloadly.io/
2. **Install on Mac/Windows**
3. **Run Sideloadly**

### Step 2: Install App
1. **Connect iPhone** via USB
2. **Drag IPA file** into Sideloadly
3. **Enter Apple ID**: m.aqibnadeem@live.com
4. **Enter password**
5. **Click Start** - app installs automatically

### Step 3: Trust Developer
1. **iPhone Settings** → General → VPN & Device Management
2. **Trust** your Apple ID certificate
3. **Launch Drive KL Rental** app

## Method 3: 3uTools

### Step 1: Install 3uTools
1. **Download**: http://www.3u.com/
2. **Install and run** on computer
3. **Connect iPhone** via USB

### Step 2: Install IPA
1. **Go to Apps** section in 3uTools
2. **Click Install** → Select IPA file
3. **Installation begins** automatically
4. **Trust developer** in iPhone settings

## Method 4: Xcode (Mac Only)

### Step 1: Download Project
1. **Clone from GitHub**: https://github.com/Dragg3r/drive-kl-rental-system.git
2. **Open in Xcode**: Open ios/App/App.xcworkspace

### Step 2: Configure Signing
1. **Select App target**
2. **Signing & Capabilities**
3. **Team**: Select your Apple ID (m.aqibnadeem@live.com)
4. **Bundle Identifier**: com.drivekl.rental.dev (add .dev to avoid conflicts)

### Step 3: Build and Run
1. **Select your iPhone** as destination
2. **Click Run** (▶ button)
3. **Trust developer** on iPhone when prompted
4. **App launches** directly

## Troubleshooting

### "App Not Trusted" Error
**Solution**: iPhone Settings → General → VPN & Device Management → Trust Developer

### "Apple ID Verification" Required
**Solution**: Check email (m.aqibnadeem@live.com) for verification code

### App Crashes on Launch
**Solution**: 
- Ensure iPhone iOS version is 13.0+
- Try reinstalling the app
- Check device storage space

### 7-Day Expiration
**Solution**:
- Apps expire after 7 days with free Apple ID
- Use AltStore for automatic renewal
- Or manually reinstall via any method

## Build Process Summary

### What Codemagic Creates:
1. **Unsigned IPA file** - Ready for sideloading
2. **Build info file** - Contains installation instructions
3. **Email notification** - Sent to m.aqibnadeem@live.com

### IPA File Format:
- **Filename**: DriveKL-Rental-Sideload-YYYYMMDD-HHMM.ipa
- **Size**: ~50-100MB
- **Compatibility**: iOS 13.0+

## Installation Success Checklist

✅ **AltStore/Sideloadly installed** on computer
✅ **iPhone connected** via USB
✅ **Apple ID trusted** on iPhone
✅ **IPA file downloaded** from Codemagic
✅ **App installed** and launches successfully
✅ **All features working** (camera, forms, PDF generation)

## Next Steps After Installation

1. **Test core features**: Registration, login, rental booking
2. **Verify camera access**: Document uploads work properly
3. **Test PDF generation**: Rental agreements create successfully
4. **Check data persistence**: Information saves correctly
5. **Report issues**: Any problems with functionality

Your Drive KL Rental System is now installed and ready to use on iPhone without an Apple Developer account!