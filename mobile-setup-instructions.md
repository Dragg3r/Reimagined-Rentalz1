# Drive KL Rental System - Mobile iOS App Setup

## Overview
This project has been converted to include a mobile iOS app version using Expo React Native. The mobile app provides the same functionality as the web version but optimized for iOS devices.

## Prerequisites
1. Install Expo CLI globally: `npm install -g @expo/cli`
2. Install Expo Go app on your iOS device from the App Store
3. Ensure your iOS device and development machine are on the same WiFi network

## Setup Instructions

### 1. Initialize Expo Project
```bash
# Create new Expo project in a separate directory
npx create-expo-app DriveKLRentalMobile --template blank-typescript
cd DriveKLRentalMobile
```

### 2. Install Required Dependencies
```bash
# Core navigation and UI
npm install expo-router expo-status-bar
npm install @expo/vector-icons
npm install expo-image-picker expo-document-picker
npm install expo-file-system expo-sharing
npm install react-native-signature-canvas
npm install react-native-picker-select

# Optional: For better performance
npm install react-native-reanimated react-native-gesture-handler
```

### 3. Copy Mobile App Files
Copy the following files from this project to your new Expo project:
- `app/_layout.tsx` → Copy to your Expo project's `app/` directory
- `app/index.tsx` → Copy to your Expo project's `app/` directory  
- `app/register.tsx` → Copy to your Expo project's `app/` directory
- `app.json` → Replace the default app.json in your Expo project

### 4. Create Additional Screens
Create these additional screens in your Expo project's `app/` directory:
- `login.tsx` - Customer login screen
- `rental.tsx` - Rental booking form with mobile-optimized UI
- `staff.tsx` - Staff dashboard with mobile interface

### 5. Add Assets
Create an `assets/` directory in your Expo project and add:
- App icon (1024x1024px)
- Splash screen image
- DKL logo and AK13 logo images

### 6. Configure API Backend
Update the API calls in your mobile screens to connect to the existing backend server:
```typescript
// Configure your backend URL
const API_BASE_URL = 'http://your-server-url:5000';

// Example API call
const registerCustomer = async (formData: FormData) => {
  const response = await fetch(`${API_BASE_URL}/api/customers/register`, {
    method: 'POST',
    body: formData,
  });
  return response.json();
};
```

## Running the Mobile App

### 1. Start the Development Server
```bash
npx expo start
```

### 2. Open on iOS Device
1. Open Expo Go app on your iOS device
2. Scan the QR code displayed in your terminal
3. The app will load on your device

### 3. For iOS Simulator (requires macOS with Xcode)
```bash
npx expo start --ios
```

## Key Mobile Features Implemented

### 1. **Mobile-Optimized UI**
- Touch-friendly buttons and inputs
- Responsive design for iPhone screens
- Native iOS-style navigation

### 2. **Image Upload & Camera**
- Native camera integration for document capture
- Photo library access for IC/Passport and utility bill uploads
- Automatic image compression and quality optimization

### 3. **Form Handling**
- Mobile-optimized form inputs
- Touch-friendly validation
- Native keyboard types (email, phone, etc.)

### 4. **Navigation**
- Stack-based navigation using Expo Router
- iOS-style header with custom styling
- Deep linking support

### 5. **Document Management**
- PDF generation and sharing
- File system access for document storage
- Native sharing options

## Mobile App Screens

### 1. **Home Screen** (`app/index.tsx`)
- DKL logo display
- Role selection (Existing Customer, New Customer, Staff)
- AK13 branding in header

### 2. **Registration Screen** (`app/register.tsx`)
- Customer registration form
- IC/Passport and utility bill photo upload
- Social media handle input
- Form validation

### 3. **Login Screen** (`app/login.tsx`)
- Customer authentication
- Remember login option
- Forgot password functionality

### 4. **Rental Booking** (`app/rental.tsx`)
- Vehicle selection
- Date picker for rental period
- Mobile-optimized pricing calculator
- Vehicle photo uploads
- Digital signature capture

### 5. **Staff Dashboard** (`app/staff.tsx`)
- Customer management
- Rental history
- PDF agreement access

## Deployment

### 1. **Development Build**
```bash
# Install EAS CLI
npm install -g eas-cli

# Build for iOS
eas build --platform ios
```

### 2. **App Store Distribution**
1. Create Apple Developer account
2. Configure app signing
3. Submit for App Store review

## Backend Integration
The mobile app connects to the same Express.js backend server that powers the web version, ensuring:
- Shared database and customer data
- Consistent rental management
- Same PDF generation and email functionality
- Unified staff dashboard access

## Development Notes
- Use Expo Go for rapid development and testing
- Hot reload enabled for fast development cycles
- Native iOS features accessible through Expo SDK
- TypeScript support for type safety