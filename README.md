# Drive KL Rental System by Akib

A comprehensive car rental management system with native mobile iOS app support.

## Features

- **Customer Management**: Registration, login, document verification
- **Rental Booking**: Multi-step rental process with vehicle photos and digital signatures
- **Document Processing**: IC/Passport and utility bill uploads with automatic compression
- **PDF Generation**: Automated rental agreement creation and email delivery
- **Staff Dashboard**: Administrative interface for customer and rental management
- **Mobile iOS App**: Native iOS app using Capacitor

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **UI**: Radix UI + shadcn/ui + Tailwind CSS
- **Mobile**: Capacitor for iOS native app
- **File Processing**: Sharp for image processing, PDFKit for documents

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd drive-kl-rental-system
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
# Copy and configure your database URL
DATABASE_URL=your_postgresql_connection_string
```

4. Push database schema:
```bash
npm run db:push
```

5. Start the development server:
```bash
npm run dev
```

## Mobile iOS App

This project includes a native iOS app built with Capacitor.

### Building iOS App

1. Build the web app:
```bash
npm run build
```

2. Sync with Capacitor:
```bash
npx cap sync ios
```

3. Open in Xcode (macOS required):
```bash
npx cap open ios
```

### Cloud Builds

The project is configured for cloud builds using:
- Ionic Appflow
- Expo EAS Build
- GitHub Actions
- Codemagic
- Bitrise

See `capacitor-cloud-setup.md` for detailed instructions.

## App Configuration

- **App Name**: Drive KL Rental System by Akib
- **Bundle ID**: com.drivekl.rental
- **Platform**: iOS (App Store ready)

## Project Structure

```
├── client/          # React frontend
├── server/          # Express backend
├── shared/          # Shared schemas and types
├── ios/             # iOS native project (Capacitor)
├── assets/          # App icons and assets
├── dist/            # Built web app
└── uploads/         # File uploads directory
```

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run db:push` - Update database schema
- `npx cap sync ios` - Sync web changes with iOS

## License

Private project for Drive KL Executive Sdn Bhd