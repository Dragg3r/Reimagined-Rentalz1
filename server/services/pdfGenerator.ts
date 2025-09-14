import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { Rental, Customer } from "@shared/schema";
import { ObjectStorageService } from "../objectStorage";
import { ImageProcessor } from "./imageProcessor";
import sharp from "sharp";

export class PDFGenerator {
  private backupsDir = path.join(process.cwd(), "app", "backups");
  private objectStorageService = new ObjectStorageService();
  private imageProcessor = new ImageProcessor();
  private allowedUploadDirs = [
    path.join(process.cwd(), "app", "uploads"),
    path.join(process.cwd(), "uploads")
  ];

  constructor() {
    this.ensureBackupsDirectory();
  }

  private async ensureBackupsDirectory() {
    try {
      await fs.promises.mkdir(this.backupsDir, { recursive: true });
    } catch (error) {
      console.error("Error creating backups directory:", error);
    }
  }

  // Secure file path resolution to prevent path traversal attacks
  private validateAndResolvePath(filePath: string): string | null {
    try {
      // Remove any leading slashes and normalize the path
      const cleanPath = filePath.replace(/^\/+/, '');
      
      // Check for suspicious patterns
      if (cleanPath.includes('..') || cleanPath.includes('~') || cleanPath.match(/[<>:"|?*]/)) {
        console.warn('Suspicious file path detected:', filePath);
        return null;
      }

      // Try different resolution strategies
      const possiblePaths = [
        path.resolve(path.join(process.cwd(), "app", "uploads", cleanPath)),
        path.resolve(path.join(process.cwd(), "app", cleanPath)),
        path.resolve(path.join(process.cwd(), "uploads", cleanPath))
      ];

      for (const resolvedPath of possiblePaths) {
        // Normalize the resolved path
        const normalizedPath = path.normalize(resolvedPath);
        
        // Check if the resolved path is within allowed directories
        const isAllowed = this.allowedUploadDirs.some(allowedDir => {
          const normalizedAllowedDir = path.normalize(allowedDir);
          return normalizedPath.startsWith(normalizedAllowedDir + path.sep) || normalizedPath === normalizedAllowedDir;
        });
        
        if (isAllowed && fs.existsSync(normalizedPath)) {
          console.log('✅ Validated file path:', normalizedPath);
          return normalizedPath;
        }
      }
      
      console.log('❌ File not found or path not allowed for:', filePath);
      return null;
    } catch (error) {
      console.error('❌ Error validating file path:', error);
      return null;
    }
  }

  // Helper function to load images from different sources (object storage, base64, local paths)
  private async loadImageBuffer(src: string): Promise<Buffer | null> {
    if (!src) {
      console.log('❌ No image source provided');
      return null;
    }

    try {
      console.log('🖼️ Loading image from:', src.substring(0, 100) + (src.length > 100 ? '...' : ''));
      
      // Handle base64 data URLs (signatures)
      if (src.startsWith('data:image/')) {
        console.log('📦 Decoding base64 data URL');
        const base64Data = src.replace(/^data:image\/[^;]+;base64,/, '');
        let buffer = Buffer.from(base64Data, 'base64');
        
        // Check if it's WebP and convert if needed
        const metadata = await sharp(buffer).metadata();
        if (metadata.format === 'webp') {
          console.log('🔄 Converting WebP to PNG');
          buffer = await sharp(buffer).png().toBuffer();
        }
        
        return buffer;
      }
      
      // Handle object storage URLs (starting with /objects/)
      if (src.startsWith('/objects/')) {
        console.log('☁️ Loading from object storage');
        let buffer = await this.objectStorageService.getFileFromStorage(src);
        if (buffer) {
          // Check if it's WebP and convert if needed
          const metadata = await sharp(buffer).metadata();
          if (metadata.format === 'webp') {
            console.log('🔄 Converting WebP to JPEG');
            buffer = await sharp(buffer).jpeg({ quality: 92 }).toBuffer();
          }
          return buffer;
        }
      }
      
      // Handle local file paths (starting with /uploads/)
      if (src.startsWith('/uploads/')) {
        console.log('💾 Loading from local storage');
        // First try object storage, then local
        try {
          let buffer = await this.objectStorageService.getFileFromStorage(src);
          if (buffer) {
            console.log('✅ Found in object storage');
            // Check if it's WebP and convert if needed
            const metadata = await sharp(buffer).metadata();
            if (metadata.format === 'webp') {
              console.log('🔄 Converting WebP to JPEG');
              buffer = await sharp(buffer).jpeg({ quality: 92 }).toBuffer();
            }
            return buffer;
          }
        } catch (error) {
          console.log('⚠️ Object storage failed, trying local...');
        }
        
        // Fallback to local file
        const localPath = this.validateAndResolvePath(src.replace('/uploads/', ''));
        if (localPath && fs.existsSync(localPath)) {
          console.log('✅ Found locally');
          let buffer = await fs.promises.readFile(localPath);
          
          // Check if it's WebP and convert if needed
          const metadata = await sharp(buffer).metadata();
          if (metadata.format === 'webp') {
            console.log('🔄 Converting WebP to JPEG');
            buffer = await sharp(buffer).jpeg({ quality: 92 }).toBuffer();
          }
          
          return buffer;
        }
      }
      
      console.log('❌ Image not found or format not supported:', src);
      return null;
    } catch (error) {
      console.error('❌ Error loading image buffer:', error);
      return null;
    }
  }

  // Check if we need a new page and add it if necessary
  private checkPageBreak(doc: PDFKit.PDFDocument, requiredSpace: number = 100) {
    // A4 page height is 792px, with 50px margins top/bottom, usable height is 692px
    const maxY = 740; // Leave some margin at bottom
    if (doc.y > maxY - requiredSpace) {
      doc.addPage();
      doc.y = 50;
      return true;
    }
    return false;
  }

  async generateRentalAgreement(rental: Rental, customer: Customer): Promise<string> {
    const filename = `${customer.fullName.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '')}-${new Date().toISOString().split('T')[0]}-agreement.pdf`;
    const filePath = path.join(this.backupsDir, filename);

    console.log('Generating PDF for rental:', rental.id);
    console.log('Customer:', customer.fullName);
    console.log('PDF filename:', filename);
    console.log('PDF path:', filePath);

    // Ensure the backups directory exists
    await this.ensureBackupsDirectory();

    return new Promise(async (resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const stream = fs.createWriteStream(filePath);
      
      stream.on('error', (error) => {
        console.error('Stream error:', error);
        reject(error);
      });
      
      stream.on('finish', async () => {
        console.log('PDF generated successfully:', filePath);
        // Verify the file exists and has content
        if (fs.existsSync(filePath)) {
          const stats = fs.statSync(filePath);
          console.log('PDF file size:', stats.size, 'bytes');
          if (stats.size > 0) {
            // Upload to object storage for permanent storage
            try {
              const pdfBuffer = await fs.promises.readFile(filePath);
              const objectPath = await this.objectStorageService.uploadPDF(pdfBuffer, filename);
              console.log('✅ PDF uploaded to PERMANENT object storage:', objectPath);
            } catch (uploadError) {
              console.error('❌ Failed to upload PDF to object storage:', uploadError);
              // Continue - local file still exists
            }
            resolve(`/backups/${filename}`);
          } else {
            reject(new Error('PDF file was created but is empty'));
          }
        } else {
          reject(new Error('PDF file was not created'));
        }
      });
      
      try {
        doc.pipe(stream);

        // Add professional header with logo and styling
        this.addModernHeader(doc);
        
        // Add customer information section
        await this.addCustomerSection(doc, customer);
        
        // Add vehicle information section
        this.addVehicleSection(doc, rental);
        
        // Add rental details section
        this.addRentalDetailsSection(doc, rental);
        
        // Add payment information section
        this.addPaymentSection(doc, rental);

        // Terms and Conditions - Start on new page to avoid overlapping
        doc.addPage();
        doc.y = 50;
        this.addModernTermsSection(doc);

        // Vehicle Photos - Start on new page to avoid overlapping
        doc.addPage();
        doc.y = 50;
        await this.addModernPhotosSection(doc, rental);

        // Digital signature section - Ensure enough space
        this.checkPageBreak(doc, 250);
        await this.addModernSignatureSection(doc, rental, customer);

        // Finalize the PDF
        doc.end();
      } catch (error) {
        console.error('Error generating PDF content:', error);
        reject(error);
      }
    });
  }

  private getFuelLevelText(level: number): string {
    const levels = ['Empty', '1/8', '1/4', '3/8', '1/2', '5/8', '3/4', '7/8', 'Full'];
    return levels[level] || 'Unknown';
  }

  private addModernHeader(doc: PDFKit.PDFDocument) {
    // Add Reimagined Rentalz logo with professional positioning
    const logoPath = path.join(process.cwd(), 'server/assets/reimagined-rentalz-logo.png');
    if (fs.existsSync(logoPath)) {
      try {
        doc.image(logoPath, 50, 50, { width: 120, height: 40 });
      } catch (error) {
        console.error('Error adding logo:', error);
      }
    }

    // Modern header styling with Reimagined Rentalz branding
    doc.fontSize(24).font('Helvetica-Bold')
       .fillColor('#1a365d')
       .text('REIMAGINED RENTALZ', 200, 50);

    // Professional subtitle with accent color
    doc.fontSize(18).font('Helvetica-Bold')
       .fillColor('#c53030')
       .text('VEHICLE RENTAL AGREEMENT', 50, 90, { align: 'center' });
    
    // Reset color for body text
    doc.fillColor('#000000');
    
    // Add decorative line
    doc.strokeColor('#e2e8f0')
       .lineWidth(2)
       .moveTo(50, 120)
       .lineTo(550, 120)
       .stroke();
    
    doc.y = 140; // Set position for next content
  }

  private async addCustomerSection(doc: PDFKit.PDFDocument, customer: Customer) {
    this.checkPageBreak(doc, 200); // Ensure space for customer section
    
    const headerY = doc.y;
    // Section header
    doc.rect(50, headerY, 500, 25)
       .fillAndStroke('#f7fafc', '#e2e8f0');
    
    doc.fontSize(12).font('Helvetica-Bold')
       .fillColor('#2d3748')
       .text('CUSTOMER INFORMATION', 60, headerY + 6);
    
    doc.fillColor('#000000');
    doc.y = headerY + 35;
    
    // Customer details in organized layout
    const startY = doc.y;
    doc.fontSize(10).font('Helvetica-Bold')
       .fillColor('#4a5568');
    
    // Left column
    doc.text('Full Name:', 60, startY);
    doc.text('IC/Passport:', 60, startY + 15);
    doc.text('Email:', 60, startY + 30);
    doc.text('Phone:', 60, startY + 45);
    
    // Right column headers
    doc.text('Address:', 300, startY);
    doc.text('Social Media:', 300, startY + 30);
    
    // Values
    doc.fontSize(10).font('Helvetica')
       .fillColor('#1a202c');
    
    doc.text(customer.fullName, 120, startY);
    doc.text(customer.icPassportNumber || 'N/A', 120, startY + 15);
    doc.text(customer.email, 120, startY + 30);
    doc.text(customer.phone, 120, startY + 45);
    doc.text(customer.address, 350, startY, { width: 200 });
    doc.text(customer.socialMediaHandle || 'N/A', 350, startY + 30);
    
    doc.y = startY + 70;

    // Add customer IC/Passport photo if available
    if (customer.icPassportUrl) {
      try {
        // Use new loadImageBuffer function to handle object storage URLs
        const imageBuffer = await this.loadImageBuffer(customer.icPassportUrl);
        
        if (imageBuffer) {
          this.checkPageBreak(doc, 130);
          
          doc.fontSize(10).font('Helvetica-Bold')
             .fillColor('#2b6cb0')
             .text('IDENTIFICATION DOCUMENT', 60, doc.y);
          
          doc.y += 20;
          const photoY = doc.y;
          
          // Photo frame with proper spacing
          doc.rect(60, photoY, 180, 100)
             .lineWidth(1)
             .strokeColor('#e2e8f0')
             .stroke();
          
          doc.image(imageBuffer, 65, photoY + 5, { 
            width: 170, 
            height: 90,
            fit: [170, 90]
          });
          
          doc.y = photoY + 110;
        } else {
          console.log('Customer IC photo could not be loaded');
          // Show placeholder text if photo not found
          doc.fontSize(9).font('Helvetica')
             .fillColor('#718096')
             .text('ID photo not available', 60, doc.y);
          doc.y += 15;
        }
      } catch (error) {
        console.error('Error adding IC/Passport photo:', error);
        doc.fontSize(9).font('Helvetica')
           .fillColor('#e53e3e')
           .text('❌ ID photo could not be loaded', 60, doc.y);
        doc.y += 15;
      }
    }
    
    doc.y += 20; // Section spacing
  }

  private addVehicleSection(doc: PDFKit.PDFDocument, rental: Rental) {
    this.checkPageBreak(doc, 100);
    
    const headerY = doc.y;
    // Section header
    doc.rect(50, headerY, 500, 25)
       .fillAndStroke('#f0fff4', '#9ae6b4');
    
    doc.fontSize(12).font('Helvetica-Bold')
       .fillColor('#2d3748')
       .text('VEHICLE INFORMATION', 60, headerY + 6);
    
    doc.fillColor('#000000');
    doc.y = headerY + 35;
    
    const startY = doc.y;
    doc.fontSize(10).font('Helvetica-Bold')
       .fillColor('#4a5568');
    
    // Vehicle details
    doc.text('Vehicle:', 60, startY);
    doc.text('Color:', 60, startY + 15);
    doc.text('Mileage Limit:', 60, startY + 30);
    
    doc.text('Extra Fee:', 300, startY);
    doc.text('Fuel Level:', 300, startY + 15);
    doc.text('Current Mileage:', 300, startY + 30);
    
    // Values
    doc.fontSize(10).font('Helvetica')
       .fillColor('#1a202c');
    
    doc.text(rental.vehicle, 120, startY);
    doc.text(rental.color, 120, startY + 15);
    doc.text(`${rental.mileageLimit.toLocaleString()} KM`, 120, startY + 30);
    
    doc.text(`RM ${rental.extraMileageCharge}/km`, 370, startY);
    doc.text(this.getFuelLevelText(rental.fuelLevel), 370, startY + 15);
    doc.text(`${rental.currentMileage || 0} km`, 370, startY + 30);
    
    doc.y = startY + 60;
  }

  private addRentalDetailsSection(doc: PDFKit.PDFDocument, rental: Rental) {
    this.checkPageBreak(doc, 100);
    
    const headerY = doc.y;
    // Section header
    doc.rect(50, headerY, 500, 25)
       .fillAndStroke('#fff5f5', '#fc8181');
    
    doc.fontSize(12).font('Helvetica-Bold')
       .fillColor('#2d3748')
       .text('RENTAL PERIOD', 60, headerY + 6);
    
    doc.fillColor('#000000');
    doc.y = headerY + 35;
    
    // Rental period in card layout
    const cardY = doc.y;
    doc.rect(60, cardY, 480, 40)
       .fillAndStroke('#f8fafc', '#cbd5e0');
    
    doc.fontSize(10).font('Helvetica-Bold')
       .fillColor('#2b6cb0');
    
    doc.text('Start Date', 80, cardY + 8);
    doc.text('End Date', 250, cardY + 8);
    doc.text('Duration', 420, cardY + 8);
    
    doc.fontSize(10).font('Helvetica')
       .fillColor('#1a202c');
    
    doc.text(new Date(rental.startDate).toLocaleDateString('en-GB'), 80, cardY + 22);
    doc.text(new Date(rental.endDate).toLocaleDateString('en-GB'), 250, cardY + 22);
    doc.text(`${rental.totalDays} Days`, 420, cardY + 22);
    
    doc.y = cardY + 55;
  }

  private addPaymentSection(doc: PDFKit.PDFDocument, rental: Rental) {
    this.checkPageBreak(doc, 200);
    
    const headerY = doc.y;
    // Section header
    doc.rect(50, headerY, 500, 25)
       .fillAndStroke('#fffaf0', '#f6ad55');
    
    doc.fontSize(12).font('Helvetica-Bold')
       .fillColor('#2d3748')
       .text('PAYMENT BREAKDOWN', 60, headerY + 6);
    
    doc.fillColor('#000000');
    doc.y = headerY + 35;
    
    // Payment table
    const tableY = doc.y;
    
    // Table header
    doc.rect(60, tableY, 480, 20)
       .fillAndStroke('#2b6cb0', '#2b6cb0');
    
    doc.fontSize(10).font('Helvetica-Bold')
       .fillColor('#ffffff')
       .text('Description', 80, tableY + 6)
       .text('Amount (RM)', 450, tableY + 6);
    
    doc.fillColor('#000000');
    
    // Table rows
    const rows = [
      ['Rental Per Day', `${parseFloat(rental.rentalPerDay).toFixed(2)}`],
      ['Total Days', `${rental.totalDays} days`],
      ['Subtotal', `${(parseFloat(rental.rentalPerDay) * rental.totalDays).toFixed(2)}`],
      ['Security Deposit', `${parseFloat(rental.deposit).toFixed(2)}`],
      ['Discount Applied', `-${parseFloat(rental.discount).toFixed(2)}`]
    ];
    
    rows.forEach((row, index) => {
      const rowY = tableY + 20 + (index * 18);
      const isEven = index % 2 === 0;
      
      doc.rect(60, rowY, 480, 18)
         .fillAndStroke(isEven ? '#f8fafc' : '#ffffff', '#e2e8f0');
      
      doc.fontSize(9).font('Helvetica')
         .fillColor('#4a5568')
         .text(row[0], 80, rowY + 5)
         .text(row[1], 450, rowY + 5);
    });
    
    // Grand total
    const totalY = tableY + 20 + (rows.length * 18);
    doc.rect(60, totalY, 480, 25)
       .fillAndStroke('#2d5a27', '#2d5a27');
    
    doc.fontSize(12).font('Helvetica-Bold')
       .fillColor('#ffffff')
       .text('GRAND TOTAL', 80, totalY + 8)
       .text(`RM ${parseFloat(rental.grandTotal).toFixed(2)}`, 420, totalY + 8);
    
    doc.y = totalY + 40;
  }

  private addModernTermsSection(doc: PDFKit.PDFDocument) {
    const headerY = doc.y;
    // Modern terms header
    doc.rect(50, headerY, 500, 30)
       .fillAndStroke('#1a365d', '#1a365d');
    
    doc.fontSize(14).font('Helvetica-Bold')
       .fillColor('#ffffff')
       .text('TERMS & CONDITIONS', 60, headerY + 8);
    
    doc.fillColor('#000000');
    doc.y = headerY + 40;
    
    // Introduction
    doc.fontSize(9).font('Helvetica')
       .fillColor('#4a5568')
       .text('This Agreement outlines the terms for vehicle rental from Reimagined Rentalz. By signing, the Renter agrees to these clauses.', 50, doc.y, {
         width: 500,
         align: 'justify'
       });
    
    doc.y += 25;
    
    const terms = [
      {
        title: '1. RENTAL PERIOD AND VEHICLE USAGE',
        items: [
          'Genting Highland Usage: Additional RM150-350 surcharge applies.',
          'Early Termination: No refunds for early returns.',
          'Late Return: RM25-300/hour penalty for late returns.',
          'Mileage: Overage charge RM1.50-5.00/km for exceeded limits.',
          'Fuel: Return with same fuel level or pay RM50-200 refueling charge.'
        ]
      },
      {
        title: '2. DRIVER AUTHORIZATION & RESPONSIBILITIES',
        items: [
          'Only authorized drivers listed may operate the vehicle.',
          'Renter responsible for all fines, summons, and tolls.',
          'Violations void agreement and forfeit deposit.'
        ]
      },
      {
        title: '3. VEHICLE CARE AND PROHIBITED ACTIONS',
        items: [
          'No unauthorized workshop visits or modifications.',
          'No abuse (drifting, burnouts, off-road use).',
          'No smoking, pets, or illegal activities in vehicle.',
          'Report accidents immediately to authorities and company.'
        ]
      },
      {
        title: '4. FINANCIAL OBLIGATIONS',
        items: [
          'Full payment required upon booking confirmation.',
          'Security deposit held until vehicle return.',
          'Additional charges deducted from deposit.',
          'Outstanding amounts payable immediately.'
        ]
      }
    ];

    terms.forEach(section => {
      this.checkPageBreak(doc, 60);
      
      doc.fontSize(10).font('Helvetica-Bold')
         .fillColor('#2b6cb0')
         .text(section.title, 50, doc.y);
      
      doc.y += 15;
      
      section.items.forEach(item => {
        this.checkPageBreak(doc, 15);
        doc.fontSize(8).font('Helvetica')
           .fillColor('#4a5568')
           .text(`• ${item}`, 60, doc.y, { width: 480 });
        doc.y += 12;
      });
      
      doc.y += 10;
    });
  }

  private async addModernPhotosSection(doc: PDFKit.PDFDocument, rental: Rental) {
    const headerY = doc.y;
    // Photos header
    doc.rect(50, headerY, 500, 30)
       .fillAndStroke('#2d5a27', '#2d5a27');
    
    doc.fontSize(14).font('Helvetica-Bold')
       .fillColor('#ffffff')
       .text('VEHICLE CONDITION DOCUMENTATION', 60, headerY + 8);
    
    doc.fillColor('#000000');
    doc.y = headerY + 40;
    
    const photos = rental.vehiclePhotos as Record<string, string>;
    
    if (!photos || Object.keys(photos).length === 0) {
      doc.fontSize(10).font('Helvetica')
         .fillColor('#718096')
         .text('No vehicle photos available for this rental.', 50, doc.y, { align: 'center' });
      doc.y += 30;
      return;
    }
    
    let photoCount = 0;
    const photosPerRow = 2;
    const photoWidth = 200;
    const photoHeight = 130;
    
    for (const [photoType, photoUrl] of Object.entries(photos)) {
      if (photoUrl) {
        try {
          // Use new loadImageBuffer function to handle object storage URLs and base64
          const imageBuffer = await this.loadImageBuffer(photoUrl);
          
          if (!imageBuffer) {
            console.log(`Photo could not be loaded: ${photoUrl}`);
            continue;
          }
          
          // Check if we need space for a photo
          this.checkPageBreak(doc, photoHeight + 40);
          
          const isLeftColumn = photoCount % photosPerRow === 0;
          const currentX = isLeftColumn ? 60 : 320;
          
          if (isLeftColumn && photoCount > 0) {
            doc.y += 20; // Space between rows
          }
          
          const currentY = doc.y;
          
          // Photo title
          doc.fontSize(9).font('Helvetica-Bold')
             .fillColor('#2b6cb0')
             .text(this.formatPhotoLabel(photoType), currentX, currentY);
          
          // Photo frame
          doc.rect(currentX, currentY + 15, photoWidth, photoHeight)
             .lineWidth(1)
             .strokeColor('#e2e8f0')
             .stroke();
          
          // Add photo using buffer instead of file path
          doc.image(imageBuffer, 
                   currentX + 5, currentY + 20, { 
                     width: photoWidth - 10, 
                     height: photoHeight - 10,
                     fit: [photoWidth - 10, photoHeight - 10]
                   });
          
          photoCount++;
          
          // Update Y position after completing a row
          if (photoCount % photosPerRow === 0) {
            doc.y = currentY + photoHeight + 25;
          }
          
        } catch (error) {
          console.error('Error adding photo:', error);
        }
      }
    }
    
    // If we ended on an incomplete row, adjust Y position
    if (photoCount % photosPerRow !== 0) {
      doc.y += photoHeight + 25;
    }
  }

  private async addModernSignatureSection(doc: PDFKit.PDFDocument, rental: Rental, customer: Customer) {
    this.checkPageBreak(doc, 250);
    
    const headerY = doc.y;
    // Signature header
    doc.rect(50, headerY, 500, 30)
       .fillAndStroke('#553c9a', '#553c9a');
    
    doc.fontSize(14).font('Helvetica-Bold')
       .fillColor('#ffffff')
       .text('DIGITAL SIGNATURE & AGREEMENT', 60, headerY + 8);
    
    doc.fillColor('#000000');
    doc.y = headerY + 40;
    
    // Agreement text
    doc.fontSize(9).font('Helvetica')
       .fillColor('#4a5568')
       .text('By signing below, I confirm that I have read and agree to all terms and conditions.', 50, doc.y, {
         width: 500,
         align: 'justify'
       });
    
    doc.y += 25;
    
    // Check for both signatureUrl and signatureData (base64)
    const signatureSource = rental.signatureUrl || (rental as any).signatureData;
    
    if (signatureSource) {
      try {
        // Use new loadImageBuffer function to handle object storage URLs and base64 data URLs
        const signatureBuffer = await this.loadImageBuffer(signatureSource);
        
        if (signatureBuffer) {
          // Add signature label with proper spacing
          doc.fontSize(10).font('Helvetica-Bold')
             .fillColor('#2b6cb0')
             .text('Customer Signature:', 60, doc.y);
          
          doc.y += 20;
          const signatureY = doc.y;
          
          // Enhanced signature frame with better styling
          doc.rect(60, signatureY, 350, 100)
             .lineWidth(2)
             .strokeColor('#e2e8f0')
             .stroke();
          
          // Add subtle background for signature area
          doc.rect(61, signatureY + 1, 348, 98)
             .fillColor('#f8fafc')
             .fill();
          
          // Add signature image using buffer instead of file path
          doc.image(signatureBuffer, 
                   70, signatureY + 10, { 
                     width: 330, 
                     height: 80,
                     fit: [330, 80],
                     align: 'center',
                     valign: 'center'
                   });
          
          doc.y = signatureY + 110;
          console.log('✅ Customer signature successfully added to PDF');
        } else {
          console.log(`❌ Signature could not be loaded: ${signatureSource}`);
          // Professional placeholder for missing signature
          doc.fontSize(10).font('Helvetica-Bold')
             .fillColor('#2b6cb0')
             .text('Customer Signature:', 60, doc.y);
          
          doc.y += 20;
          const signatureY = doc.y;
          
          doc.rect(60, signatureY, 350, 100)
             .lineWidth(2)
             .strokeColor('#cbd5e0')
             .stroke();
          
          doc.rect(61, signatureY + 1, 348, 98)
             .fillColor('#f7fafc')
             .fill();
          
          doc.fontSize(12).font('Helvetica')
             .fillColor('#a0aec0')
             .text('Signature Not Available', 60, signatureY + 40, { 
               width: 350, 
               align: 'center' 
             });
          
          doc.y = signatureY + 110;
        }
      } catch (error) {
        console.error('❌ Error adding signature:', error);
        // Professional error handling
        doc.fontSize(10).font('Helvetica-Bold')
           .fillColor('#2b6cb0')
           .text('Customer Signature:', 60, doc.y);
        
        doc.y += 20;
        const signatureY = doc.y;
        
        doc.rect(60, signatureY, 350, 100)
           .lineWidth(2)
           .strokeColor('#fed7d7')
           .stroke();
        
        doc.rect(61, signatureY + 1, 348, 98)
           .fillColor('#fef5e7')
           .fill();
        
        doc.fontSize(10).font('Helvetica')
           .fillColor('#e53e3e')
           .text('❌ Signature could not be loaded', 60, signatureY + 40, { 
             width: 350, 
             align: 'center' 
           });
        
        doc.y = signatureY + 110;
      }
    } else {
      // Professional placeholder for no signature provided
      doc.fontSize(10).font('Helvetica-Bold')
         .fillColor('#2b6cb0')
         .text('Customer Signature:', 60, doc.y);
      
      doc.y += 20;
      const signatureY = doc.y;
      
      doc.rect(60, signatureY, 350, 100)
         .lineWidth(2)
         .strokeColor('#e2e8f0')
         .stroke();
      
      doc.rect(61, signatureY + 1, 348, 98)
         .fillColor('#f8fafc')
         .fill();
      
      doc.fontSize(12).font('Helvetica')
         .fillColor('#a0aec0')
         .text('No Digital Signature Provided', 60, signatureY + 40, { 
           width: 350, 
           align: 'center' 
         });
      
      doc.y = signatureY + 110;
    }
    
    // Customer details - Fix alignment bug by capturing baseY
    doc.y += 20;
    
    const baseY = doc.y; // Capture the base Y position for proper alignment
    
    doc.fontSize(9).font('Helvetica-Bold')
       .fillColor('#4a5568')
       .text('Customer Name:', 60, baseY)
       .text('Agreement Date:', 60, baseY + 15)
       .text('Document ID:', 60, baseY + 30);
    
    doc.fontSize(9).font('Helvetica')
       .fillColor('#1a202c')
       .text(customer.fullName, 140, baseY)
       .text(new Date().toLocaleDateString('en-GB'), 140, baseY + 15)
       .text(`AGR-${rental.id}-${new Date().getFullYear()}`, 140, baseY + 30);
    
    // Update doc.y to be after all the customer details
    doc.y = baseY + 50;
  }

  private formatPhotoLabel(photoType: string): string {
    const labels: Record<string, string> = {
      front: 'Front View',
      back: 'Rear View',
      left: 'Left Side',
      right: 'Right Side',
      interior: 'Interior',
      dashboard: 'Dashboard',
      mileage: 'Mileage Reading'
    };
    return labels[photoType] || photoType.charAt(0).toUpperCase() + photoType.slice(1);
  }

  async generateInvoice(invoice: any): Promise<string> {
    const filename = `invoice-${invoice.id}-${new Date().toISOString().split('T')[0]}.pdf`;
    const filePath = path.join(this.backupsDir, filename);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const stream = fs.createWriteStream(filePath);
      
      stream.on('error', reject);
      stream.on('finish', () => {
        if (fs.existsSync(filePath) && fs.statSync(filePath).size > 0) {
          resolve(`/backups/${filename}`);
        } else {
          reject(new Error('Invoice PDF generation failed'));
        }
      });
      
      doc.pipe(stream);

      // Header
      doc.fontSize(20).font('Helvetica-Bold').text('REIMAGINED RENTALZ', { align: 'center' });
      doc.fontSize(16).font('Helvetica').text('INVOICE', { align: 'center' });
      doc.moveDown();

      // Invoice details
      doc.fontSize(12).font('Helvetica');
      doc.text(`Invoice #: ${invoice.id}`);
      doc.text(`Customer: ${invoice.customerName}`);
      doc.text(`Date: ${new Date(invoice.invoiceDate).toLocaleDateString()}`);
      doc.text(`Vehicle: ${invoice.vehicleRented}`);
      doc.text(`Duration: ${invoice.totalDays} days`);
      doc.text(`Total Amount: RM ${invoice.totalAmount}`);
      doc.moveDown();

      // Company bank details
      doc.text('Payment Details:');
      doc.text('Maybank - Account: 564427995291');

      doc.end();
    });
  }
}

export const pdfGenerator = new PDFGenerator();