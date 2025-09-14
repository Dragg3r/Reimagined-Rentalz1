# Reimagined Rentalz

A comprehensive car rental management system with customer portal, staff approval workflow, and gamification features.

## Features

- **Customer Portal**: Account creation, vehicle browsing, and booking requests
- **Gamification System**: Points, levels, badges, and loyalty tiers to reward customer loyalty
- **Staff Dashboard**: Complete approval workflow for managing booking requests
- **Email Notifications**: Automated notifications for all workflow steps
- **PDF Generation**: Rental agreement creation with download and WhatsApp sharing
- **Mobile-Responsive**: Optimized design for all devices
- **Document Management**: Customer document uploads and verification

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **UI**: Radix UI + shadcn/ui + Tailwind CSS
- **File Processing**: Sharp for image processing, PDFKit for documents
- **Communication**: WhatsApp integration for PDF sharing, SendGrid for emails
- **Storage**: Object storage for file management

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Dragg3r/Reimagined-Rentalz1.git
cd Reimagined-Rentalz1
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

## Key Components

### Customer Experience
- User registration and authentication
- Vehicle browsing and selection
- Booking request submission
- Gamification rewards (points, levels, badges)
- Loyalty tier progression

### Staff Workflow
- Booking request management
- Customer approval process
- PDF rental agreement generation
- Email and WhatsApp notifications
- Complete rental workflow tracking

### System Features
- Real-time notifications
- Mobile-responsive design
- Secure file uploads and storage
- Automated PDF generation with sharing
- Dynamic domain detection for deployments

## Project Structure

```
├── client/          # React frontend with customer portal and staff dashboard
├── server/          # Express backend with API routes and services
├── shared/          # Shared schemas and types (Drizzle ORM)
├── app/             # File storage for uploads and generated PDFs
├── assets/          # App assets and images
└── attached_assets/ # Static assets for the application
```

## Development

- `npm run dev` - Start development server (frontend + backend)
- `npm run build` - Build for production
- `npm run db:push` - Update database schema

## Environment Variables

The system requires the following environment variables:
- `DATABASE_URL` - PostgreSQL connection string
- `SENDGRID_API_KEY` - For email notifications
- Email settings for automated notifications
- Object storage configuration

## License

Private project - Reimagined Rentalz Car Rental Management System