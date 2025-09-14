import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertCustomerSchema, loginSchema, staffLoginSchema, insertRentalSchema, insertDeliverySchema, insertInvoiceSchema, bookingRequestSchema, insertBookingRequestSchema } from "@shared/schema";
import { imageProcessor } from "./services/imageProcessor";
import { pdfGenerator } from "./services/pdfGenerator";
import { emailService } from "./services/emailService";
import { whatsappService } from "./services/whatsappService";
import { adminNotificationService } from "./services/adminNotificationService";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import multer from "multer";
import express from "express";
import path from "path";
import fs from "fs";
import { promises as fsPromises } from "fs";

// Security helper functions
function isValidFilename(filename: string): boolean {
  // Only allow alphanumeric characters, dots, hyphens, and underscores
  const validFilenameRegex = /^[a-zA-Z0-9._-]+$/;
  return validFilenameRegex.test(filename);
}

function validateSecurePath(filename: string, baseDir: string): string | null {
  // Reject filenames with path separators or parent directory references
  if (filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
    return null;
  }
  
  // Validate filename format
  if (!isValidFilename(filename)) {
    return null;
  }
  
  // Resolve the full path and verify it's within the allowed directory
  const resolvedPath = path.resolve(baseDir, filename);
  const normalizedBaseDir = path.resolve(baseDir);
  
  // Ensure the resolved path starts with the base directory
  if (!resolvedPath.startsWith(normalizedBaseDir + path.sep) && resolvedPath !== normalizedBaseDir) {
    return null;
  }
  
  return resolvedPath;
}

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { 
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Helper function to generate and send rental agreement
async function generateAndSendRentalAgreement(rentalId: number, customer: any): Promise<void> {
  try {
    // Generate the rental agreement PDF - use correct port 5000
    const response = await fetch(`http://localhost:5000/api/rentals/${rentalId}/generate-agreement`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to generate agreement: ${response.status}`);
    }

    const agreementData = await response.json();
    console.log(`✅ Rental agreement generated and sent for rental ${rentalId}`);
    
  } catch (error) {
    console.error(`❌ Failed to generate/send agreement for rental ${rentalId}:`, error);
    throw error;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  const objectStorageService = new ObjectStorageService();

  // Serve uploaded files from object storage
  app.get("/objects/:objectPath(*)", async (req, res) => {
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error serving object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // Serve backup PDFs - CHECK OBJECT STORAGE FIRST (permanent) - SECURED
  app.get('/backups/:filename', async (req, res) => {
    const filename = req.params.filename;
    
    // SECURITY: Validate filename and enforce PDF extension
    if (!filename.endsWith('.pdf')) {
      console.error(`❌ Security: Invalid file extension for backups: ${filename}`);
      return res.status(400).send('Only PDF files allowed in backups');
    }
    
    const baseDir = path.join(process.cwd(), 'app', 'backups');
    const securePath = validateSecurePath(filename, baseDir);
    
    if (!securePath) {
      console.error(`❌ Security: Invalid or unsafe filename: ${filename}`);
      return res.status(400).send('Invalid filename');
    }
    
    // FIRST: Try object storage (permanent)
    try {
      const buffer = await objectStorageService.getFileFromStorage(`/backups/${filename}`);
      if (buffer) {
        console.log(`✅ Serving PDF from PERMANENT storage: ${filename}`);
        res.set('Content-Type', 'application/pdf');
        res.set('Content-Disposition', `inline; filename="${path.basename(filename)}"`);
        res.send(buffer);
        return;
      }
    } catch (err) {
      console.log(`⚠️ Object storage failed for PDF ${filename}, trying local...`);
    }
    
    // FALLBACK: Local storage with secure path
    if (fs.existsSync(securePath)) {
      console.log(`✅ Serving PDF from LOCAL storage: ${filename}`);
      res.sendFile(securePath);
    } else {
      console.error(`❌ PDF not found: ${filename}`);
      res.status(404).send('PDF not found');
    }
  });
  
  // Serve uploaded files - CHECK OBJECT STORAGE FIRST (permanent) - SECURED
  app.get('/uploads/:filename', async (req, res) => {
    const filename = req.params.filename;
    
    // SECURITY: Validate filename and allowed extensions
    const allowedExtensions = ['.pdf', '.png', '.jpg', '.jpeg', '.webp'];
    const hasValidExtension = allowedExtensions.some(ext => filename.toLowerCase().endsWith(ext));
    
    if (!hasValidExtension) {
      console.error(`❌ Security: Invalid file extension for uploads: ${filename}`);
      return res.status(400).send('File type not allowed');
    }
    
    const baseDir = path.join(process.cwd(), 'app', 'uploads');
    const securePath = validateSecurePath(filename, baseDir);
    
    if (!securePath) {
      console.error(`❌ Security: Invalid or unsafe filename: ${filename}`);
      return res.status(400).send('Invalid filename');
    }
    
    // FIRST: Try object storage (permanent)
    try {
      const buffer = await objectStorageService.getFileFromStorage(`/uploads/${filename}`);
      if (buffer) {
        console.log(`✅ Serving file from PERMANENT storage: ${filename}`);
        const contentType = filename.endsWith('.pdf') ? 'application/pdf' : 
                           filename.endsWith('.png') ? 'image/png' : 
                           filename.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
        res.set('Content-Type', contentType);
        res.send(buffer);
        return;
      }
    } catch (err) {
      console.log(`⚠️ Object storage failed for ${filename}, trying local...`);
    }
    
    // FALLBACK: Local storage with secure path
    if (fs.existsSync(securePath)) {
      console.log(`✅ Serving file from LOCAL storage: ${filename}`);
      res.sendFile(securePath);
    } else {
      console.error(`❌ File not found: ${filename}`);
      res.status(404).send('File not found');
    }
  });
  
  // Check if file exists endpoint - SECURED
  app.get('/api/check-file/:filename', (req, res) => {
    const filename = req.params.filename;
    
    // SECURITY: Validate filename
    const baseDir = path.join(process.cwd(), 'app', 'uploads');
    const securePath = validateSecurePath(filename, baseDir);
    
    if (!securePath) {
      console.error(`❌ Security: Invalid or unsafe filename: ${filename}`);
      return res.status(400).json({ exists: false, message: 'Invalid filename' });
    }
    
    console.log('Checking file existence:', filename);
    console.log('Secure path:', securePath);
    
    fs.access(securePath, fs.constants.F_OK, (err) => {
      if (err) {
        console.log('File does not exist:', filename);
        res.status(404).json({ exists: false, message: 'File not found' });
      } else {
        console.log('File exists:', filename);
        res.json({ exists: true });
      }
    });
  });

  // IC/Passport reupload endpoint
  app.post('/api/customers/:customerId/reupload-ic', upload.single('icPassport'), async (req, res) => {
    try {
      const { customerId } = req.params;
      const customer = await storage.getCustomerById(parseInt(customerId));
      
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "IC/Passport image is required" });
      }

      // Process and watermark the new IC/Passport image
      const icPassportUrl = await imageProcessor.processAndWatermarkImage(
        req.file.buffer, 
        req.file.originalname
      );

      // Update customer with new IC/Passport URL
      await storage.updateCustomer(parseInt(customerId), { 
        icPassportUrl
      });

      res.json({ 
        message: "IC/Passport image updated successfully",
        icPassportUrl
      });
    } catch (error) {
      console.error("IC reupload error:", error);
      res.status(500).json({ message: "Failed to update IC/Passport image", error: error.message });
    }
  });

  // Vehicle management endpoints
  app.get('/api/staff/vehicles', async (req, res) => {
    try {
      const vehicles = await storage.getAllVehicles();
      res.json(vehicles);
    } catch (error) {
      console.error("Get vehicles error:", error);
      res.status(500).json({ message: "Failed to retrieve vehicles" });
    }
  });

  // Public vehicles endpoint for customer booking
  app.get('/api/vehicles', async (req, res) => {
    try {
      const vehicles = await storage.getAllVehicles();
      const activeVehicles = vehicles.filter(vehicle => vehicle.isActive);
      res.json(activeVehicles);
    } catch (error) {
      console.error("Get vehicles error:", error);
      res.status(500).json({ message: "Failed to retrieve vehicles" });
    }
  });

  // Check vehicle availability for specific date range
  app.post('/api/vehicles/:id/check-availability', async (req, res) => {
    try {
      const vehicleId = parseInt(req.params.id);
      const { startDate, endDate } = req.body;

      if (!startDate || !endDate) {
        return res.status(400).json({ message: "Start date and end date are required" });
      }

      const start = new Date(startDate);
      const end = new Date(endDate);

      if (start >= end) {
        return res.status(400).json({ message: "End date must be after start date" });
      }

      // Get vehicle name first
      const vehicles = await storage.getAllVehicles();
      const vehicle = vehicles.find(v => v.id === vehicleId);
      
      if (!vehicle) {
        return res.status(404).json({ message: "Vehicle not found" });
      }

      // Check for existing bookings that overlap with the requested dates
      const conflictingRentals = await storage.getConflictingRentals(vehicle.name, start, end);
      const isAvailable = conflictingRentals.length === 0;

      res.json({
        available: isAvailable,
        conflictingDates: conflictingRentals.map(rental => ({
          startDate: rental.startDate,
          endDate: rental.endDate,
          customer: rental.customerId
        }))
      });
    } catch (error) {
      console.error("Check availability error:", error);
      res.status(500).json({ message: "Failed to check availability" });
    }
  });

  app.post('/api/staff/vehicles', async (req, res) => {
    try {
      const vehicle = await storage.createVehicle(req.body);
      res.json(vehicle);
    } catch (error) {
      console.error("Create vehicle error:", error);
      res.status(500).json({ message: "Failed to create vehicle" });
    }
  });

  app.patch('/api/staff/vehicles/:id', async (req, res) => {
    try {
      const vehicleId = parseInt(req.params.id);
      const vehicle = await storage.updateVehicle(vehicleId, req.body);
      res.json(vehicle);
    } catch (error) {
      console.error("Update vehicle error:", error);
      res.status(500).json({ message: "Failed to update vehicle" });
    }
  });

  app.delete('/api/staff/vehicles/:id', async (req, res) => {
    try {
      const vehicleId = parseInt(req.params.id);
      await storage.deleteVehicle(vehicleId);
      res.json({ message: "Vehicle deleted successfully" });
    } catch (error) {
      console.error("Delete vehicle error:", error);
      res.status(500).json({ message: "Failed to delete vehicle" });
    }
  });

  // Upload vehicle photo
  app.post("/api/staff/vehicles/upload-photo", upload.single('vehiclePhoto'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No photo file provided" });
      }

      console.log("Processing vehicle photo...");
      const photoUrl = await imageProcessor.processVehiclePhoto(
        req.file.buffer, 
        req.file.originalname
      );
      
      console.log("✅ Vehicle photo processed successfully:", photoUrl);
      res.json({ photoUrl });
    } catch (error) {
      console.error("Vehicle photo upload error:", error);
      res.status(500).json({ 
        message: "Failed to upload vehicle photo", 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Booking Request endpoints
  app.post("/api/booking-requests", async (req, res) => {
    try {
      const requestData = bookingRequestSchema.parse(req.body);
      
      // Calculate total days
      const startDate = new Date(requestData.startDate);
      const endDate = new Date(requestData.endDate);
      const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (totalDays <= 0) {
        return res.status(400).json({ message: "End date must be after start date" });
      }

      // Create booking request
      const bookingRequest = await storage.createBookingRequest({
        customerId: requestData.customerId,
        vehicleId: requestData.vehicleId,
        vehicleName: requestData.vehicleName,
        startDate,
        endDate,
        totalDays,
        customerMessage: requestData.customerMessage,
        status: "pending"
      });

      // Get customer details for email
      const customer = await storage.getCustomerById(requestData.customerId);
      
      if (customer) {
        // Send confirmation email to customer
        try {
          const emailSent = await emailService.sendBookingRequestConfirmation(customer, bookingRequest);
          if (emailSent) {
            await storage.updateBookingRequestNotifications(bookingRequest.id, true, false);
          }
        } catch (error) {
          console.error("Failed to send customer confirmation email:", error);
        }

        // Send notification email to admin
        try {
          await emailService.sendAdminBookingRequestNotification(customer, bookingRequest);
        } catch (error) {
          console.error("Failed to send admin notification email:", error);
        }
      }

      res.json({ 
        message: "Booking request submitted successfully",
        bookingRequest: {
          id: bookingRequest.id,
          vehicleName: bookingRequest.vehicleName,
          startDate: bookingRequest.startDate,
          endDate: bookingRequest.endDate,
          status: bookingRequest.status
        }
      });
    } catch (error) {
      console.error("Create booking request error:", error);
      res.status(500).json({ message: "Failed to create booking request" });
    }
  });

  app.get("/api/booking-requests/customer/:customerId", async (req, res) => {
    try {
      const customerId = parseInt(req.params.customerId);
      const requests = await storage.getBookingRequestsByCustomer(customerId);
      res.json(requests);
    } catch (error) {
      console.error("Get customer booking requests error:", error);
      res.status(500).json({ message: "Failed to get booking requests" });
    }
  });

  app.get("/api/staff/booking-requests", async (req, res) => {
    try {
      const { status } = req.query;
      const requests = status ? 
        await storage.getBookingRequestsByStatus(status as string) :
        await storage.getAllBookingRequests();
      res.json(requests);
    } catch (error) {
      console.error("Get booking requests error:", error);
      res.status(500).json({ message: "Failed to get booking requests" });
    }
  });

  app.patch("/api/staff/booking-requests/:id/status", async (req, res) => {
    try {
      const requestId = parseInt(req.params.id);
      const { status, staffId, reason } = req.body;
      
      // Update booking request status first
      await storage.updateBookingRequestStatus(requestId, status, staffId, reason);
      
      // Simple status update - no auto-rental creation
      res.json({ message: `Booking request ${status} successfully` });
      
    } catch (error) {
      console.error("Update booking request status error:", error);
      res.status(500).json({ message: "Failed to update booking request status" });
    }
  });

  // Delete booking request
  app.delete("/api/staff/booking-requests/:id", async (req, res) => {
    try {
      const requestId = parseInt(req.params.id);
      
      // Check if booking request exists
      const bookingRequest = await storage.getBookingRequestById(requestId);
      if (!bookingRequest) {
        return res.status(404).json({ message: "Booking request not found" });
      }
      
      // Log the status for debugging
      console.log(`🔄 Attempting to delete booking request ${requestId} with status: ${bookingRequest.status}`);
      
      // Allow deletion of completed requests as well - staff should have full control
      // Note: We'll warn about completed ones but still allow deletion
      if (bookingRequest.status === 'completed') {
        console.log(`⚠️ Deleting completed booking request ${requestId} - ensure no active rental dependencies`);
      }
      
      await storage.deleteBookingRequest(requestId);
      
      console.log(`✅ Booking request ${requestId} deleted successfully`);
      res.json({ message: "Booking request deleted successfully" });
      
    } catch (error) {
      console.error("Delete booking request error:", error);
      res.status(500).json({ message: "Failed to delete booking request" });
    }
  });

  app.post("/api/staff/booking-requests/:id/complete-booking", async (req, res) => {
    try {
      const requestId = parseInt(req.params.id);
      
      // Get the booking request details
      const bookingRequest = await storage.getBookingRequestById(requestId);
      if (!bookingRequest) {
        return res.status(404).json({ message: "Booking request not found" });
      }

      if (bookingRequest.status !== 'confirmed') {
        return res.status(400).json({ message: "Only confirmed booking requests can be completed" });
      }

      // Get customer details
      const customer = await storage.getCustomerById(bookingRequest.customerId);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }

      // Get vehicle details
      const vehicle = await storage.getVehicleById(bookingRequest.vehicleId);
      if (!vehicle) {
        return res.status(404).json({ message: "Vehicle not found" });
      }

      // Calculate rental pricing (basic estimation)
      const dailyRate = 120; // Default daily rate
      const deposit = dailyRate * 2; // 2 days deposit
      const subtotal = dailyRate * bookingRequest.totalDays;
      const grandTotal = subtotal + deposit;

      // Create rental record with booking request data
      const rentalData = {
        customerId: customer.id,
        fuelLevel: 4, // Default full tank
        currentMileage: 0, // Staff will update this
        mileageLimit: vehicle.mileageLimit || 300,
        extraMileageCharge: "1.50",
        vehicle: bookingRequest.vehicleName,
        color: "TBD", // Staff will update this during handover
        startDate: bookingRequest.startDate,
        endDate: bookingRequest.endDate,
        totalDays: bookingRequest.totalDays,
        rentalPerDay: dailyRate.toString(),
        deposit: deposit.toString(),
        discount: "0",
        grandTotal: grandTotal.toString(),
        status: "pending", // Will be completed during handover process
      };

      // Create the rental record
      const rental = await storage.createRental(rentalData);
      
      // Update booking request to track that it was converted
      await storage.updateBookingRequestStatus(requestId, 'completed', null, 'Converted to rental agreement');

      console.log(`✅ Booking request ${requestId} completed and converted to rental ${rental.id}`);

      res.json({ 
        message: "Booking completed successfully. Customer can now proceed with rental agreement.",
        rentalId: rental.id,
        customer: {
          id: customer.id,
          fullName: customer.fullName,
          email: customer.email
        }
      });
      
    } catch (error) {
      console.error("Complete booking request error:", error);
      res.status(500).json({ message: "Failed to complete booking request" });
    }
  });

  app.patch("/api/staff/rentals/:id/complete", upload.fields([
    { name: 'vehiclePhotos', maxCount: 10 },
    { name: 'paymentProof', maxCount: 1 }
  ]), async (req, res) => {
    try {
      const rentalId = parseInt(req.params.id);
      const { 
        currentMileage, fuelLevel, color, customerId, signatureData,
        rentalPerDay, totalDays, deposit, discount, grandTotal,
        mileageLimit, extraMileageCharge
      } = req.body;
      
      console.log("Completing rental:", { 
        rentalId, currentMileage, fuelLevel, color,
        rentalPerDay, totalDays, deposit, discount, grandTotal 
      });
      
      // Process vehicle photos
      const vehiclePhotoUrls: string[] = [];
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      if (files.vehiclePhotos && files.vehiclePhotos.length > 0) {
        for (const file of files.vehiclePhotos) {
          try {
            const photoUrl = await imageProcessor.processVehiclePhoto(
              file.buffer,
              file.originalname
            );
            vehiclePhotoUrls.push(photoUrl);
          } catch (error) {
            console.error("Error processing vehicle photo:", error);
          }
        }
      }
      
      // Process signature if provided
      let signatureUrl = "";
      if (signatureData) {
        try {
          signatureUrl = await imageProcessor.processSignature(signatureData);
        } catch (error) {
          console.error("Error processing signature:", error);
        }
      }
      
      // Process payment proof if provided
      let paymentProofUrl = "";
      if (files.paymentProof && files.paymentProof.length > 0) {
        try {
          paymentProofUrl = await imageProcessor.processVehiclePhoto(
            files.paymentProof[0].buffer,
            `payment-proof-${files.paymentProof[0].originalname}`
          );
        } catch (error) {
          console.error("Error processing payment proof:", error);
        }
      }
      
      // First get the rental to find the customer ID
      const rental = await storage.getRentalById(rentalId);
      if (!rental) {
        return res.status(404).json({ message: "Rental not found" });
      }

      // Update rental with completion data
      const updateData = {
        currentMileage: parseInt(currentMileage),
        fuelLevel: parseInt(fuelLevel),
        color: color,
        // Pricing fields
        rentalPerDay: parseFloat(rentalPerDay),
        totalDays: parseInt(totalDays),
        deposit: parseFloat(deposit),
        discount: parseFloat(discount),
        grandTotal: parseFloat(grandTotal),
        mileageLimit: parseInt(mileageLimit),
        extraMileageCharge: parseFloat(extraMileageCharge),
        // File URLs
        vehiclePhotos: { photos: vehiclePhotoUrls },
        paymentProofUrl: paymentProofUrl,
        signatureUrl: signatureUrl,
        status: "completed"
      };
      
      await storage.updateRental(rentalId, updateData);
      
      // Get customer details for agreement generation using rental's customer ID
      const customer = await storage.getCustomerById(rental.customerId);
      
      if (rental && customer) {
        // Generate and send rental agreement
        try {
          await generateAndSendRentalAgreement(rental.id, customer);
          console.log(`✅ Rental agreement generated and sent for rental ${rental.id}`);
        } catch (agreementError) {
          console.error("Error generating rental agreement:", agreementError);
        }
      }
      
      res.json({ 
        message: "Rental completed successfully",
        rentalId: rentalId,
        photoUrls: vehiclePhotoUrls,
        signatureUrl: signatureUrl
      });
      
    } catch (error) {
      console.error("Complete rental error:", error);
      res.status(500).json({ message: "Failed to complete rental" });
    }
  });

  // Regenerate rental agreement
  app.post("/api/staff/rentals/:id/regenerate-agreement", async (req, res) => {
    try {
      const rentalId = parseInt(req.params.id);
      
      // Get the rental details
      const rental = await storage.getRentalById(rentalId);
      if (!rental) {
        return res.status(404).json({ message: "Rental not found" });
      }
      
      // Get customer details
      const customer = await storage.getCustomerById(rental.customerId);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      console.log(`🔄 Regenerating agreement for rental ${rentalId}`);
      
      // Generate and send the rental agreement
      await generateAndSendRentalAgreement(rentalId, customer);
      
      res.json({ 
        message: "Rental agreement has been regenerated and emailed successfully",
        rentalId: rentalId
      });
      
    } catch (error) {
      console.error("Regenerate rental agreement error:", error);
      res.status(500).json({ message: "Failed to regenerate rental agreement" });
    }
  });

  // Gamification API routes
  app.get("/api/customers/profile", async (req, res) => {
    try {
      const customerId = req.headers['customer-id'];
      if (!customerId) {
        return res.status(400).json({ message: "Customer ID required" });
      }
      
      const profile = await storage.getCustomerById(parseInt(customerId.toString()));
      if (!profile) {
        return res.status(404).json({ message: "Customer not found" });
      }
      res.json(profile);
    } catch (error) {
      console.error("Get customer profile error:", error);
      res.status(500).json({ message: "Failed to get profile" });
    }
  });

  app.get("/api/customers/badges", async (req, res) => {
    try {
      const customerId = req.headers['customer-id'];
      if (!customerId) {
        return res.status(400).json({ message: "Customer ID required" });
      }
      
      const badges = await storage.getCustomerBadges(parseInt(customerId.toString()));
      res.json(badges);
    } catch (error) {
      console.error("Get customer badges error:", error);
      res.status(500).json({ message: "Failed to get badges" });
    }
  });

  app.get("/api/customers/activities", async (req, res) => {
    try {
      const customerId = req.headers['customer-id'];
      if (!customerId) {
        return res.status(400).json({ message: "Customer ID required" });
      }
      
      const activities = await storage.getCustomerActivities(parseInt(customerId.toString()));
      res.json(activities);
    } catch (error) {
      console.error("Get customer activities error:", error);
      res.status(500).json({ message: "Failed to get activities" });
    }
  });

  app.get("/api/customers/reviews", async (req, res) => {
    try {
      const customerId = req.headers['customer-id'];
      if (!customerId) {
        return res.status(400).json({ message: "Customer ID required" });
      }
      
      const reviews = await storage.getCustomerReviews(parseInt(customerId.toString()));
      res.json(reviews);
    } catch (error) {
      console.error("Get customer reviews error:", error);
      res.status(500).json({ message: "Failed to get reviews" });
    }
  });

  app.post("/api/customers/reviews", async (req, res) => {
    try {
      const customerId = req.headers['customer-id'];
      if (!customerId) {
        return res.status(400).json({ message: "Customer ID required" });
      }
      
      const { rating, reviewText } = req.body;
      
      // Create review
      const review = await storage.createCustomerReview({
        customerId: parseInt(customerId.toString()),
        rating: parseInt(rating),
        reviewText: reviewText,
        isPublic: true
      });
      
      // Award points for review
      const currentCustomer = await storage.getCustomerById(parseInt(customerId.toString()));
      const newPoints = (currentCustomer?.totalPoints || 0) + 25;
      await storage.updateCustomerPoints(parseInt(customerId.toString()), newPoints);
      
      // Add activity log
      await storage.addCustomerActivity({
        customerId: parseInt(customerId.toString()),
        activityType: 'review_submitted',
        pointsEarned: 25,
        description: 'Submitted a review for rental experience',
        metadata: { reviewId: review.id, rating }
      });
      
      res.json(review);
    } catch (error) {
      console.error("Create review error:", error);
      res.status(500).json({ message: "Failed to create review" });
    }
  });

  app.get("/api/customers/leaderboard", async (req, res) => {
    try {
      const leaderboard = await storage.getCustomerLeaderboard(10);
      res.json(leaderboard);
    } catch (error) {
      console.error("Get leaderboard error:", error);
      res.status(500).json({ message: "Failed to get leaderboard" });
    }
  });

  app.get("/api/customers/loyalty-tier", async (req, res) => {
    try {
      const customer = req.customer;
      if (!customer) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const profile = await storage.getCustomerById(customer.id);
      if (!profile) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      const tier = await storage.getLoyaltyTierByPoints(profile.totalPoints);
      res.json(tier);
    } catch (error) {
      console.error("Get loyalty tier error:", error);
      res.status(500).json({ message: "Failed to get loyalty tier" });
    }
  });

  // Check customer file integrity
  app.get('/api/staff/check-customer-files', async (req, res) => {
    try {
      const customers = await storage.getAllCustomers();
      const fileChecks = [];
      
      for (const customer of customers) {
        const issues = [];
        
        // Check IC/Passport file
        if (customer.icPassportUrl) {
          const icFilePath = path.join(process.cwd(), customer.icPassportUrl);
          try {
            await fs.promises.access(icFilePath, fs.constants.F_OK);
          } catch {
            issues.push(`IC/Passport file missing: ${customer.icPassportUrl}`);
          }
        } else {
          issues.push('IC/Passport URL not set');
        }
        
        // Check utility bill file
        if (customer.utilityBillUrl) {
          const utilityFilePath = path.join(process.cwd(), customer.utilityBillUrl);
          try {
            await fs.promises.access(utilityFilePath, fs.constants.F_OK);
          } catch {
            issues.push(`Utility bill file missing: ${customer.utilityBillUrl}`);
          }
        } else {
          issues.push('Utility bill URL not set');
        }
        
        if (issues.length > 0) {
          fileChecks.push({
            customerId: customer.id,
            customerName: customer.fullName,
            issues
          });
        }
      }
      
      res.json({ 
        totalCustomers: customers.length,
        customersWithIssues: fileChecks.length,
        issues: fileChecks
      });
    } catch (error) {
      console.error("File check error:", error);
      res.status(500).json({ message: "Failed to check files", error: error.message });
    }
  });

  // Customer Registration
  app.post("/api/customers/register", upload.fields([
    { name: 'icPassport', maxCount: 1 },
    { name: 'driversLicense', maxCount: 1 },
    { name: 'utilityBill', maxCount: 1 }
  ]), async (req, res) => {
    try {
      console.log("Registration request received");
      console.log("Request body:", req.body);
      console.log("Files:", req.files);
      
      // Validate only the required fields from the request body
      const { fullName, email, phone, address, icPassportNumber, socialMediaHandle } = req.body;
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      
      console.log("Extracted fields:", { fullName, email, phone, address, icPassportNumber, socialMediaHandle });
      console.log("Files check:", { icPassport: files?.icPassport, driversLicense: files?.driversLicense, utilityBill: files?.utilityBill });
      
      if (!files?.icPassport?.[0]) {
        return res.status(400).json({ message: "IC/Passport image is required" });
      }

      if (!files?.driversLicense?.[0]) {
        return res.status(400).json({ message: "Driver's license image is required" });
      }

      if (!files?.utilityBill?.[0]) {
        return res.status(400).json({ message: "Utility bill image is required" });
      }

      // Validate required fields
      if (!fullName || !email || !phone || !address) {
        return res.status(400).json({ message: "All required fields must be provided" });
      }

      // Check if customer already exists
      const existingCustomer = await storage.getCustomerByEmail(email);
      if (existingCustomer) {
        return res.status(400).json({ message: "Customer with this email already exists" });
      }

      // Process and watermark IC/Passport image
      console.log("Processing IC/Passport image...");
      console.log("IC/Passport file details:", {
        originalname: files.icPassport[0].originalname,
        mimetype: files.icPassport[0].mimetype,
        size: files.icPassport[0].size
      });
      
      const icPassportUrl = await imageProcessor.processAndWatermarkImage(
        files.icPassport[0].buffer, 
        files.icPassport[0].originalname
      );
      console.log("IC/Passport image processed successfully:", icPassportUrl);


      // Process and watermark driver's license image
      console.log("Processing driver's license image...");
      console.log("Driver's license file details:", {
        originalname: files.driversLicense[0].originalname,
        mimetype: files.driversLicense[0].mimetype,
        size: files.driversLicense[0].size
      });
      
      const driversLicenseUrl = await imageProcessor.processAndWatermarkImage(
        files.driversLicense[0].buffer, 
        files.driversLicense[0].originalname
      );
      console.log("Driver's license image processed successfully:", driversLicenseUrl);


      // Process and watermark utility bill image
      console.log("Processing utility bill image...");
      console.log("Utility bill file details:", {
        originalname: files.utilityBill[0].originalname,
        mimetype: files.utilityBill[0].mimetype,
        size: files.utilityBill[0].size
      });

      const utilityBillUrl = await imageProcessor.processAndWatermarkImage(
        files.utilityBill[0].buffer, 
        files.utilityBill[0].originalname
      );
      console.log("Utility bill image processed successfully:", utilityBillUrl);


      console.log("Creating customer in database...");
      const newCustomer = await storage.createCustomer({
        fullName,
        email,
        phone,
        address,
        icPassportNumber: icPassportNumber || null,
        icPassportUrl,
        driversLicenseUrl,
        utilityBillUrl,
        socialMediaHandle: socialMediaHandle || null,
      });

      console.log("Customer created successfully:", newCustomer.id);
      
      // Send welcome email to customer
      try {
        await emailService.sendCustomerRegistrationWelcome(newCustomer);
        console.log("Welcome email sent to customer:", newCustomer.email);
      } catch (emailError) {
        console.error("Failed to send welcome email to customer:", emailError);
        // Continue - customer creation was successful
      }

      // Send admin notification for new customer registration
      try {
        await emailService.sendAdminNewCustomerNotification(newCustomer);
        console.log("Admin notification sent for new customer registration");
      } catch (notificationError) {
        console.error("Failed to send admin notification for new customer:", notificationError);
        // Continue with response even if notification fails
      }
      
      res.json(newCustomer);
    } catch (error) {
      console.error("Registration error:", error);
      console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");
      
      // Clean up any partially created files on error
      try {
        const cleanupPromises = [];
        const timestamp = Date.now();
        
        // Try to clean up any files that might have been created
        if (files?.icPassport?.[0]) {
          const icFilename = `processed_${timestamp}_${files.icPassport[0].originalname}`;
          cleanupPromises.push(fsPromises.unlink(path.join(process.cwd(), 'uploads', icFilename)).catch(() => {}));
        }
        if (files?.driversLicense?.[0]) {
          const licenseFilename = `processed_${timestamp}_${files.driversLicense[0].originalname}`;
          cleanupPromises.push(fsPromises.unlink(path.join(process.cwd(), 'uploads', licenseFilename)).catch(() => {}));
        }
        if (files?.utilityBill?.[0]) {
          const billFilename = `processed_${timestamp}_${files.utilityBill[0].originalname}`;
          cleanupPromises.push(fsPromises.unlink(path.join(process.cwd(), 'uploads', billFilename)).catch(() => {}));
        }
        
        await Promise.all(cleanupPromises);
        console.log("Cleaned up partial files due to registration error");
      } catch (cleanupError) {
        console.error("Error during cleanup:", cleanupError);
      }
      
      res.status(400).json({ message: "Registration failed", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Customer Login
  app.post("/api/customers/login", async (req, res) => {
    try {
      const { email } = loginSchema.parse(req.body);
      
      const customer = await storage.getCustomerByEmail(email);
      if (!customer) {
        return res.status(401).json({ message: "Customer not found with this email address" });
      }

      if (customer.status === "blacklisted") {
        return res.status(403).json({ message: "Account has been suspended" });
      }

      // Return customer without sensitive fields
      res.json({
        id: customer.id,
        fullName: customer.fullName,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        status: customer.status,
        icPassportNumber: customer.icPassportNumber,
        icPassportUrl: customer.icPassportUrl,
        driversLicenseUrl: customer.driversLicenseUrl,
        utilityBillUrl: customer.utilityBillUrl,
        socialMediaHandle: customer.socialMediaHandle,
        createdAt: customer.createdAt
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(400).json({ message: "Login failed", error: (error as Error).message });
    }
  });

  // Accept Terms & Conditions
  app.post("/api/customers/:id/accept-terms", async (req, res) => {
    try {
      const customerId = parseInt(req.params.id);
      await storage.updateCustomerTermsAcceptance(customerId);
      res.json({ message: "Terms accepted successfully" });
    } catch (error) {
      console.error("Terms acceptance error:", error);
      res.status(400).json({ message: "Failed to accept terms", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Create Rental
  app.post("/api/rentals", upload.fields([
    { name: 'vehiclePhotos', maxCount: 7 },
    { name: 'paymentProof', maxCount: 1 }
  ]), async (req, res) => {
    try {
      // Transform form data to match schema expectations
      const transformedData = {
        customerId: parseInt(req.body.customerId),
        vehicle: req.body.vehicle,
        color: req.body.color,
        mileageLimit: parseInt(req.body.mileageLimit.replace(/[^\d]/g, '')) || 0, // Extract number from "170 KM"
        extraMileageCharge: (parseFloat(req.body.extraMileageCharge.replace(/[^\d.]/g, '')) || 0).toString(), // Extract number from "RM 2.50"
        fuelLevel: parseInt(req.body.fuelLevel),
        startDate: new Date(req.body.startDate),
        endDate: new Date(req.body.endDate),
        totalDays: parseInt(req.body.totalDays),
        rentalPerDay: req.body.rentalPerDay,
        deposit: req.body.deposit,
        discount: req.body.discount || "0",
        grandTotal: req.body.grandTotal
      };
      
      console.log("Transformed rental data:", transformedData);
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };

      // Vehicle photos are now optional
      const hasVehiclePhotos = files.vehiclePhotos && files.vehiclePhotos.length > 0;
      const hasPaymentProof = files.paymentProof && files.paymentProof.length > 0;

      // Process vehicle photos (optional)
      const vehiclePhotos: Record<string, string> = {};
      const photoTypes = ['frontWithCustomer', 'front', 'back', 'left', 'right', 'interiorMileage', 'knownDamage'];
      
      if (hasVehiclePhotos) {
        for (let i = 0; i < files.vehiclePhotos.length; i++) {
          const photoUrl = await imageProcessor.processVehiclePhoto(
            files.vehiclePhotos[i].buffer,
            files.vehiclePhotos[i].originalname
          );
          vehiclePhotos[photoTypes[i]] = photoUrl;
        }
      }

      // Process payment proof (optional)
      let paymentProofUrl = '';
      if (hasPaymentProof) {
        paymentProofUrl = await imageProcessor.processVehiclePhoto(
          files.paymentProof[0].buffer,
          files.paymentProof[0].originalname
        );
      }

      // Process signature
      let signatureUrl = '';
      if (req.body.signatureData) {
        signatureUrl = await imageProcessor.processSignature(
          req.body.signatureData,
          'signature.png'
        );
      }

      const rental = await storage.createRental({
        ...transformedData,
        vehiclePhotos,
        paymentProofUrl,
        signatureUrl,
      });

      // Send admin notification for new rental booking
      try {
        const customer = await storage.getCustomer(transformedData.customerId);
        if (customer) {
          await emailService.sendAdminNewRentalNotification(customer, rental);
          console.log("Admin notification sent for new rental booking");
        }
      } catch (notificationError) {
        console.error("Failed to send admin notification for new booking:", notificationError);
        // Continue with response even if notification fails
      }

      res.json(rental);
    } catch (error) {
      console.error("Rental creation error:", error);
      res.status(400).json({ message: "Failed to create rental", error: error.message });
    }
  });

  // Generate Agreement PDF
  app.post("/api/rentals/:id/generate-agreement", async (req, res) => {
    try {
      const rentalId = parseInt(req.params.id);
      const rentalRecord = await storage.getRentalById(rentalId);
      
      if (!rentalRecord) {
        return res.status(404).json({ message: "Rental not found" });
      }
      const customer = await storage.getCustomerById(rentalRecord.customerId);
      
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }

      // Generate PDF
      const pdfUrl = await pdfGenerator.generateRentalAgreement(rentalRecord, customer);
      
      // Update rental with PDF URL
      await storage.updateRentalPdf(rentalRecord.id, pdfUrl);

      // Try to send email with PDF attachment (optional)
      let emailSent = false;
      try {
        // Convert relative path to absolute path for email attachment
        const absolutePdfPath = path.isAbsolute(pdfUrl) ? pdfUrl : path.join(process.cwd(), pdfUrl.startsWith('/') ? pdfUrl.slice(1) : pdfUrl);
        await emailService.sendRentalAgreement(customer, absolutePdfPath, rentalRecord);
        emailSent = true;
        console.log("Email sent successfully to:", customer.email);
        
        // Send copy to admin
        try {
          await emailService.sendRentalAgreementCopyToAdmin(customer, absolutePdfPath, rentalRecord);
          console.log("Admin copy sent successfully");
        } catch (adminEmailError) {
          console.error("Error sending admin copy:", adminEmailError);
          // Continue - main email was successful
        }
      } catch (emailError) {
        console.error("Error sending email:", emailError);
        // Continue without email - PDF generation was successful
      }

      res.json({ 
        message: emailSent ? "Agreement generated and emailed successfully" : "Agreement generated successfully (email delivery unavailable)",
        pdfUrl,
        downloadUrl: pdfUrl, // Use direct PDF URL instead of API endpoint
        emailSent,
        // Include rental data for display
        customerName: customer.fullName,
        vehicle: rentalRecord.vehicle,
        period: `${new Date(rentalRecord.startDate).toLocaleDateString()} - ${new Date(rentalRecord.endDate).toLocaleDateString()}`,
        total: parseFloat(rentalRecord.grandTotal).toFixed(2),
        rental: rentalRecord
      });
    } catch (error) {
      console.error("Agreement generation error:", error);
      res.status(500).json({ message: "Failed to generate agreement", error: error.message });
    }
  });

  // Download Agreement
  app.get("/api/rentals/:id/download-agreement", async (req, res) => {
    try {
      const rentalId = parseInt(req.params.id);
      const rental = await storage.getRentalById(rentalId);
      
      if (!rental || !rental.agreementPdfUrl) {
        return res.status(404).json({ message: "Agreement not found" });
      }

      // Fix path issue - PDF generator uses app/backups but agreementPdfUrl starts with /backups
      const pdfPath = rental.agreementPdfUrl.startsWith('/backups/') 
        ? path.join(process.cwd(), 'app', rental.agreementPdfUrl)
        : path.join(process.cwd(), rental.agreementPdfUrl.startsWith('/') ? rental.agreementPdfUrl.slice(1) : rental.agreementPdfUrl);
      
      // Check if file exists, if not try to regenerate
      if (!fs.existsSync(pdfPath)) {
        console.log(`PDF file not found at ${pdfPath}, attempting to regenerate...`);
        
        // Try to regenerate the PDF
        try {
          const customer = await storage.getCustomerById(rental.customerId);
          if (customer) {
            console.log(`Regenerating PDF for customer: ${customer.fullName}, rental: ${rental.id}`);
            const newPdfUrl = await pdfGenerator.generateRentalAgreement(rental, customer);
            await storage.updateRentalPdf(rental.id, newPdfUrl);
            
            // Fix path issue - PDF generator uses app/backups but newPdfUrl starts with /backups
            const newPdfPath = newPdfUrl.startsWith('/backups/') 
              ? path.join(process.cwd(), 'app', newPdfUrl)
              : path.join(process.cwd(), newPdfUrl.startsWith('/') ? newPdfUrl.slice(1) : newPdfUrl);
            console.log(`New PDF path: ${newPdfPath}`);
            
            if (fs.existsSync(newPdfPath)) {
              console.log(`PDF regenerated successfully, serving file`);
              return res.download(newPdfPath);
            } else {
              console.log(`PDF regeneration failed - file not found at ${newPdfPath}`);
            }
          }
        } catch (regenError) {
          console.error("Error regenerating PDF:", regenError);
        }
        
        return res.status(404).json({ message: "PDF file not found and could not be regenerated" });
      }
      
      res.download(pdfPath);
    } catch (error) {
      console.error("Download error:", error);
      res.status(500).json({ message: "Failed to download agreement", error: error.message });
    }
  });

  // Send rental agreement via email
  app.post("/api/rentals/:id/send-email", async (req, res) => {
    try {
      const rentalId = parseInt(req.params.id);
      const rental = await storage.getRentalById(rentalId);
      
      if (!rental) {
        return res.status(404).json({ message: "Rental not found" });
      }

      const customer = await storage.getCustomerById(rental.customerId);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }

      // Check if PDF exists, generate if needed
      let pdfPath = rental.agreementPdfUrl;
      if (!pdfPath || !fs.existsSync(path.join(process.cwd(), pdfPath.startsWith('/') ? pdfPath.slice(1) : pdfPath))) {
        console.log("PDF not found, generating new one...");
        pdfPath = await pdfGenerator.generateRentalAgreement(rental, customer);
        await storage.updateRentalPdf(rental.id, pdfPath);
      }

      // Send email with PDF attachment
      await emailService.sendRentalAgreement(customer, pdfPath, rental);

      // Send copy to admin
      try {
        await emailService.sendRentalAgreementCopyToAdmin(customer, pdfPath, rental);
        console.log("Admin copy sent successfully");
      } catch (adminEmailError) {
        console.error("Error sending admin copy:", adminEmailError);
        // Continue - main email was successful
      }

      res.json({
        success: true,
        message: `Agreement sent successfully to ${customer.email}`,
        recipient: customer.email
      });

    } catch (error) {
      console.error("Email sending error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to send email", 
        error: error.message 
      });
    }
  });

  // Send rental agreement via WhatsApp
  app.post("/api/rentals/:id/send-whatsapp", async (req, res) => {
    try {
      const rentalId = parseInt(req.params.id);
      const rental = await storage.getRentalById(rentalId);
      
      if (!rental) {
        return res.status(404).json({ message: "Rental not found" });
      }

      const customer = await storage.getCustomerById(rental.customerId);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }

      if (!customer.phone) {
        return res.status(400).json({ message: "Customer phone number not available" });
      }

      // Check if PDF exists, generate if needed
      let pdfPath = rental.agreementPdfUrl;
      if (!pdfPath || !fs.existsSync(path.join(process.cwd(), pdfPath.startsWith('/') ? pdfPath.slice(1) : pdfPath))) {
        console.log("PDF not found, generating new one...");
        pdfPath = await pdfGenerator.generateRentalAgreement(rental, customer);
        await storage.updateRentalPdf(rental.id, pdfPath);
      }

      // Generate WhatsApp link with message and PDF URL
      const pdfUrl = `/api/rentals/${rental.id}/download-agreement`;
      const result = await whatsappService.sendDocument(customer.phone, pdfPath, customer.fullName, rental, pdfUrl);

      res.json({
        success: true,
        message: `WhatsApp link generated for ${customer.fullName}`,
        whatsappUrl: result.url,
        recipient: customer.phone
      });

    } catch (error) {
      console.error("WhatsApp sending error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to generate WhatsApp link", 
        error: error.message 
      });
    }
  });

  // Regenerate all missing PDFs
  app.post("/api/staff/regenerate-pdfs", async (req, res) => {
    try {
      const rentals = await storage.getAllRentals();
      const results = [];
      
      for (const rental of rentals) {
        if (rental.agreementPdfUrl) {
          // Fix path issue - PDF generator uses app/backups but agreementPdfUrl starts with /backups
          const pdfPath = rental.agreementPdfUrl.startsWith('/backups/') 
            ? path.join(process.cwd(), 'app', rental.agreementPdfUrl)
            : path.join(process.cwd(), rental.agreementPdfUrl.startsWith('/') ? rental.agreementPdfUrl.slice(1) : rental.agreementPdfUrl);
          
          if (!fs.existsSync(pdfPath)) {
            try {
              const customer = await storage.getCustomerById(rental.customerId);
              if (customer) {
                const newPdfUrl = await pdfGenerator.generateRentalAgreement(rental, customer);
                await storage.updateRentalPdf(rental.id, newPdfUrl);
                results.push({ 
                  rentalId: rental.id, 
                  status: 'regenerated', 
                  customerName: customer.fullName,
                  vehicle: rental.vehicle,
                  pdfUrl: newPdfUrl 
                });
              }
            } catch (error) {
              results.push({ 
                rentalId: rental.id, 
                status: 'failed', 
                error: error.message 
              });
            }
          } else {
            results.push({ 
              rentalId: rental.id, 
              status: 'exists' 
            });
          }
        }
      }
      
      res.json({ 
        message: `Processed ${results.length} rentals`,
        results: results.filter(r => r.status !== 'exists'),
        totalProcessed: results.length
      });
    } catch (error) {
      console.error("Bulk PDF regeneration error:", error);
      res.status(500).json({ message: "Failed to regenerate PDFs", error: error.message });
    }
  });


  // Staff Login
  app.post("/api/staff/login", async (req, res) => {
    try {
      const { username, password } = staffLoginSchema.parse(req.body);
      
      // Find staff member in database by username
      const staffMember = await storage.getStaffByUsername(username);
      
      if (!staffMember) {
        return res.status(401).json({ message: "Invalid staff credentials" });
      }

      // Verify password using bcrypt
      const isPasswordValid = await storage.comparePassword(password, staffMember.hashedPassword);
      
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Invalid staff credentials" });
      }

      // Log staff login activity
      try {
        await storage.createStaffLog({
          staffId: staffMember.id,
          staffUsername: staffMember.username,
          action: "STAFF_LOGIN",
          targetType: "authentication",
          targetId: staffMember.id,
          details: {
            loginTime: new Date().toISOString(),
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
          }
        });
      } catch (logError) {
        console.error("Failed to log staff login:", logError);
      }

      res.json({ 
        id: staffMember.id, 
        username: staffMember.username,
        message: "Login successful" 
      });
    } catch (error) {
      console.error("Staff login error:", error);
      res.status(400).json({ message: "Staff login failed", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Get All Customers (Staff)
  app.get("/api/staff/customers", async (req, res) => {
    try {
      const customers = await storage.getAllCustomers();
      const safeCustomers = customers.map(({ hashedPassword, ...customer }) => customer);
      res.json(safeCustomers);
    } catch (error) {
      console.error("Get customers error:", error);
      res.status(500).json({ message: "Failed to get customers", error: error.message });
    }
  });

  // Reset Customer Password (Staff)
  app.patch("/api/staff/customers/:id/reset-password", async (req, res) => {
    try {
      const customerId = parseInt(req.params.id);
      const { newPassword, staffId, staffUsername } = req.body;
      
      if (!newPassword || newPassword.length < 4) {
        return res.status(400).json({ message: "Password must be at least 4 characters" });
      }

      const customer = await storage.getCustomerById(customerId);
      const hashedPassword = await storage.hashPassword(newPassword);
      await storage.updateCustomerPassword(customerId, hashedPassword);
      
      // Log the action
      await storage.createStaffLog({
        staffId: staffId || 1,
        staffUsername: staffUsername || 'Unknown',
        action: 'customer_password_reset',
        targetType: 'customer',
        targetId: customerId,
        details: { customerName: customer?.fullName, ipAddress: req.ip }
      });
      
      res.json({ message: "Password reset successfully" });
    } catch (error) {
      console.error("Password reset error:", error);
      res.status(500).json({ message: "Failed to reset password", error: error.message });
    }
  });

  // Delete Rental Agreement (Staff)
  // Cancel Rental
  app.patch("/api/staff/rentals/:id/cancel", async (req, res) => {
    try {
      const rentalId = parseInt(req.params.id);
      const rental = await storage.updateRentalStatus(rentalId, "cancelled");
      
      // Log staff action for cancelling rental
      try {
        const staffId = req.body.staffId || 1; // Should be provided by frontend
        const staffUsername = req.body.staffUsername || "admin"; // Should be provided by frontend
        
        await storage.createStaffLog({
          staffId,
          staffUsername,
          action: "RENTAL_CANCELLED",
          targetType: "rental",
          targetId: rentalId,
          details: {
            rentalId,
            vehicle: rental.vehicle,
            customer: rental.customerId,
            reason: req.body.reason || "Cancelled by staff",
            cancelledAt: new Date().toISOString()
          }
        });
      } catch (logError) {
        console.error("Failed to log rental cancellation:", logError);
      }
      
      res.json({ message: "Rental cancelled successfully", rental });
    } catch (error) {
      console.error("Cancel rental error:", error);
      res.status(500).json({ message: "Failed to cancel rental", error: error.message });
    }
  });

  app.delete("/api/staff/rentals/:id", async (req, res) => {
    try {
      const rentalId = parseInt(req.params.id);
      const rental = await storage.getRentalById(rentalId);
      
      if (!rental) {
        return res.status(404).json({ message: "Rental not found" });
      }

      // Delete the PDF file if it exists
      if (rental.agreementPdfUrl) {
        // Fix path issue - PDF generator uses app/backups but agreementPdfUrl starts with /backups
        const pdfPath = rental.agreementPdfUrl.startsWith('/backups/') 
          ? path.join(process.cwd(), 'app', rental.agreementPdfUrl)
          : path.join(process.cwd(), rental.agreementPdfUrl.startsWith('/') ? rental.agreementPdfUrl.slice(1) : rental.agreementPdfUrl);
        if (fs.existsSync(pdfPath)) {
          fs.unlinkSync(pdfPath);
        }
      }
      
      // Log staff action for deleting rental
      try {
        const staffId = req.body.staffId || 1; // Should be provided by frontend
        const staffUsername = req.body.staffUsername || "admin"; // Should be provided by frontend
        
        await storage.createStaffLog({
          staffId,
          staffUsername,
          action: "RENTAL_DELETED",
          targetType: "rental",
          targetId: rentalId,
          details: {
            rentalId,
            vehicle: rental.vehicle,
            customer: rental.customerId,
            deletedAt: new Date().toISOString()
          }
        });
      } catch (logError) {
        console.error("Failed to log rental deletion:", logError);
      }

      await storage.deleteRental(rentalId);
      res.json({ message: "Rental agreement deleted successfully" });
    } catch (error) {
      console.error("Delete rental error:", error);
      res.status(500).json({ message: "Failed to delete rental", error: error.message });
    }
  });

  // Update Customer Status (Staff)
  app.patch("/api/staff/customers/:id/status", async (req, res) => {
    try {
      const customerId = parseInt(req.params.id);
      const { status, staffId, staffUsername } = req.body;
      
      if (!['active', 'blacklisted'].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const customer = await storage.getCustomerById(customerId);
      const oldStatus = customer?.status;
      
      await storage.updateCustomerStatus(customerId, status);
      
      // Log the action
      await storage.createStaffLog({
        staffId: staffId || 1,
        staffUsername: staffUsername || 'Unknown',
        action: 'customer_status_updated',
        targetType: 'customer',
        targetId: customerId,
        details: { oldStatus, newStatus: status, customerName: customer?.fullName }
      });
      
      res.json({ message: "Customer status updated successfully" });
    } catch (error) {
      console.error("Update status error:", error);
      res.status(500).json({ message: "Failed to update customer status", error: error.message });
    }
  });

  // Staff: Update Customer
  app.patch("/api/staff/customers/:id", async (req, res) => {
    try {
      const customerId = parseInt(req.params.id);
      const updates = req.body;
      const { staffId, staffUsername, ...customerUpdates } = updates;
      
      // Get current customer data for comparison
      const currentCustomer = await storage.getCustomerById(customerId);
      
      // Hash password if it's being updated
      if (customerUpdates.hashedPassword) {
        customerUpdates.hashedPassword = await storage.hashPassword(customerUpdates.hashedPassword);
      }
      
      const updatedCustomer = await storage.updateCustomer(customerId, customerUpdates);
      
      // Log the customer update action with detailed changes
      try {
        const changes: any = {};
        Object.keys(customerUpdates).forEach(key => {
          if (key === 'hashedPassword') return; // Don't log password details
          const oldValue = currentCustomer?.[key];
          const newValue = customerUpdates[key];
          if (oldValue !== newValue) {
            changes[key] = { from: oldValue, to: newValue };
          }
        });
        
        if (Object.keys(changes).length > 0) {
          await storage.createStaffLog({
            staffId: staffId || 1,
            staffUsername: staffUsername || "admin",
            action: "CUSTOMER_UPDATED",
            targetType: "customer",
            targetId: customerId,
            details: {
              customerId,
              customerName: currentCustomer?.fullName,
              changes,
              fieldsUpdated: Object.keys(changes),
              updatedAt: new Date().toISOString()
            }
          });
        }
      } catch (logError) {
        console.error("Failed to log customer update:", logError);
      }
      
      // Remove sensitive data from response
      const { hashedPassword: _password, ...safeCustomer } = updatedCustomer;
      res.json(safeCustomer);
    } catch (error) {
      console.error("Customer update error:", error);
      res.status(500).json({ message: "Failed to update customer" });
    }
  });

  // Staff: Delete Customer
  app.delete("/api/staff/customers/:id", async (req, res) => {
    try {
      const customerId = parseInt(req.params.id);
      const { staffId, staffUsername } = req.body;
      
      const customer = await storage.getCustomerById(customerId);
      await storage.deleteCustomer(customerId);
      
      // Log the action
      await storage.createStaffLog({
        staffId: staffId || 1,
        staffUsername: staffUsername || 'Unknown',
        action: 'customer_deleted',
        targetType: 'customer',
        targetId: customerId,
        details: { customerName: customer?.fullName, customerEmail: customer?.email }
      });
      
      res.json({ message: "Customer deleted successfully" });
    } catch (error) {
      console.error("Customer deletion error:", error);
      res.status(500).json({ message: "Failed to delete customer" });
    }
  });

  // Check if customer files exist on filesystem
  app.get("/api/customers/:id/check-files", async (req, res) => {
    try {
      const customerId = parseInt(req.params.id);
      const customer = await storage.getCustomerById(customerId);
      
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }

      const fileStatus = {
        icPassport: { exists: false, url: customer.icPassportUrl, size: 0 },
        driversLicense: { exists: false, url: customer.driversLicenseUrl, size: 0 },
        utilityBill: { exists: false, url: customer.utilityBillUrl, size: 0 }
      };

      // Check each file - OBJECT STORAGE FIRST (permanent), then local (temporary)
      const checkFile = async (url: string | null, key: keyof typeof fileStatus) => {
        if (!url) return;
        
        let fileFound = false;
        let fileSize = 0;
        
        // FIRST: Check object storage (permanent storage)
        try {
          const filename = url.replace('/uploads/', '');
          const objectFile = await objectStorageService.getObjectEntityFile(`/objects/uploads/${filename}`);
          if (objectFile) {
            const [metadata] = await objectFile.getMetadata();
            fileFound = true;
            fileSize = parseInt(metadata.size) || 0;
            console.log(`✅ File exists in PERMANENT object storage for ${key}: /objects/uploads/${filename} (${fileSize} bytes)`);
          }
        } catch (objectError) {
          console.log(`⚠️ Object storage check failed for ${key}, checking local...`);
          
          // FALLBACK: Check local storage if not in object storage
          try {
            const normalizedUrl = url.startsWith('/uploads/') ? url.replace('/uploads/', 'app/uploads/') : url;
            const filePath = path.join(process.cwd(), normalizedUrl);
            const stats = await fsPromises.stat(filePath);
            fileFound = true;
            fileSize = stats.size;
            console.log(`✅ File exists in LOCAL storage for ${key}: ${filePath} (${stats.size} bytes)`);
          } catch (localError) {
            console.log(`❌ File not found in either storage for ${key}:`, url);
          }
        }
        
        if (fileFound) {
          fileStatus[key].exists = true;
          fileStatus[key].size = fileSize;
        }
      };

      await Promise.all([
        checkFile(customer.icPassportUrl, 'icPassport'),
        checkFile(customer.driversLicenseUrl, 'driversLicense'),
        checkFile(customer.utilityBillUrl, 'utilityBill')
      ]);

      res.json(fileStatus);
    } catch (error) {
      console.error("File check error:", error);
      res.status(500).json({ message: "Failed to check files" });
    }
  });

  // Document re-upload endpoint for existing customers
  app.post("/api/staff/customers/:id/reupload-documents", upload.fields([
    { name: 'icPassport', maxCount: 1 },
    { name: 'driversLicense', maxCount: 1 },
    { name: 'utilityBill', maxCount: 1 }
  ]), async (req, res) => {
    try {
      const customerId = parseInt(req.params.id);
      const customer = await storage.getCustomerById(customerId);
      
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }

      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const updateData: any = {};

      // Process IC/Passport if uploaded
      if (files?.icPassport?.[0]) {
        console.log("Re-uploading IC/Passport for customer:", customer.fullName);
        const icPassportUrl = await imageProcessor.processAndWatermarkImage(
          files.icPassport[0].buffer, 
          files.icPassport[0].originalname
        );
        updateData.icPassportUrl = icPassportUrl;
        console.log("New IC/Passport URL:", icPassportUrl);
      }

      // Process Driver's License if uploaded
      if (files?.driversLicense?.[0]) {
        console.log("Re-uploading Driver's License for customer:", customer.fullName);
        const driversLicenseUrl = await imageProcessor.processAndWatermarkImage(
          files.driversLicense[0].buffer, 
          files.driversLicense[0].originalname
        );
        updateData.driversLicenseUrl = driversLicenseUrl;
        console.log("New Driver's License URL:", driversLicenseUrl);
      }

      // Process Utility Bill if uploaded
      if (files?.utilityBill?.[0]) {
        console.log("Re-uploading Utility Bill for customer:", customer.fullName);
        const utilityBillUrl = await imageProcessor.processAndWatermarkImage(
          files.utilityBill[0].buffer, 
          files.utilityBill[0].originalname
        );
        updateData.utilityBillUrl = utilityBillUrl;
        console.log("New Utility Bill URL:", utilityBillUrl);
      }

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: "No files provided for upload" });
      }

      // Update customer with new file URLs
      const updatedCustomer = await storage.updateCustomer(customerId, updateData);
      
      // Log the staff action
      try {
        await storage.createStaffLog({
          staffId: 1,
          staffUsername: "admin",
          action: "CUSTOMER_DOCUMENTS_REUPLOADED",
          targetType: "customer",
          targetId: customerId,
          details: {
            customerId,
            customerName: customer.fullName,
            documentsUpdated: Object.keys(updateData),
            updatedAt: new Date().toISOString()
          }
        });
      } catch (logError) {
        console.error("Failed to log document re-upload:", logError);
      }

      res.json({ 
        message: "Documents re-uploaded successfully", 
        customer: updatedCustomer,
        updatedDocuments: Object.keys(updateData)
      });

    } catch (error) {
      console.error("Document re-upload error:", error);
      res.status(500).json({ message: "Failed to re-upload documents", error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Staff: Get Calendar Bookings
  app.get("/api/staff/calendar", async (req, res) => {
    try {
      const month = req.query.month ? parseInt(req.query.month as string) : undefined;
      const year = req.query.year ? parseInt(req.query.year as string) : undefined;
      
      const bookings = await storage.getCalendarBookings(month, year);
      res.json(bookings);
    } catch (error) {
      console.error("Calendar bookings error:", error);
      res.status(500).json({ message: "Failed to fetch calendar bookings" });
    }
  });

  // Get All Rentals (Staff)
  app.get("/api/staff/rentals", async (req, res) => {
    try {
      const rentals = await storage.getAllRentals();
      res.json(rentals);
    } catch (error) {
      console.error("Get rentals error:", error);
      res.status(500).json({ message: "Failed to get rentals", error: error.message });
    }
  });

  // Check Vehicle Availability
  app.post("/api/rentals/check-availability", async (req, res) => {
    try {
      const { vehicle, startDate, endDate, excludeRentalId } = req.body;
      
      if (!vehicle || !startDate || !endDate) {
        return res.status(400).json({ message: "Vehicle and dates are required" });
      }

      const start = new Date(startDate);
      const end = new Date(endDate);
      
      const isAvailable = await storage.checkVehicleAvailability(vehicle, start, end, excludeRentalId);
      const conflicts = isAvailable ? [] : await storage.getConflictingRentals(vehicle, start, end, excludeRentalId);
      
      res.json({ 
        available: isAvailable,
        conflicts: conflicts.map(rental => ({
          id: rental.id,
          startDate: rental.startDate,
          endDate: rental.endDate,
          customerId: rental.customerId
        }))
      });
    } catch (error) {
      console.error("Availability check error:", error);
      res.status(500).json({ message: "Failed to check availability", error: error.message });
    }
  });

  // Get Vehicle Schedule
  app.get("/api/staff/vehicle-schedule/:vehicle", async (req, res) => {
    try {
      const { vehicle } = req.params;
      const { month, year } = req.query;
      
      const schedule = await storage.getVehicleSchedule(
        vehicle, 
        month ? parseInt(month as string) : undefined,
        year ? parseInt(year as string) : undefined
      );
      
      res.json(schedule);
    } catch (error) {
      console.error("Get schedule error:", error);
      res.status(500).json({ message: "Failed to get vehicle schedule", error: error.message });
    }
  });

  // Delivery endpoints
  app.post("/api/staff/deliveries", async (req, res) => {
    try {
      // Convert the deliveryTime string to Date object and ensure numeric values are strings
      const deliveryData = {
        ...req.body,
        deliveryTime: new Date(req.body.deliveryTime),
        totalKm: String(req.body.totalKm),
        miscExpense: String(req.body.miscExpense)
      };
      
      const validatedData = insertDeliverySchema.parse(deliveryData);
      const delivery = await storage.createDelivery(validatedData);
      res.json(delivery);
    } catch (error) {
      console.error("Create delivery error:", error);
      res.status(400).json({ message: "Failed to create delivery", error: (error as Error).message });
    }
  });

  app.get("/api/staff/deliveries", async (req, res) => {
    try {
      const deliveries = await storage.getAllDeliveries();
      res.json(deliveries);
    } catch (error) {
      console.error("Get deliveries error:", error);
      res.status(500).json({ message: "Failed to get deliveries", error: (error as Error).message });
    }
  });

  app.delete("/api/staff/deliveries/:id", async (req, res) => {
    try {
      const deliveryId = parseInt(req.params.id);
      await storage.deleteDelivery(deliveryId);
      res.json({ message: "Delivery deleted successfully" });
    } catch (error) {
      console.error("Delete delivery error:", error);
      res.status(500).json({ message: "Failed to delete delivery", error: (error as Error).message });
    }
  });

  // Invoice endpoints
  app.post("/api/staff/invoices", async (req, res) => {
    try {
      // Convert the invoiceDate string to Date object and ensure totalAmount is string
      const invoiceData = {
        ...req.body,
        invoiceDate: new Date(req.body.invoiceDate),
        totalAmount: req.body.totalAmount.toString()
      };
      
      const validatedData = insertInvoiceSchema.parse(invoiceData);
      const invoice = await storage.createInvoice(validatedData);
      
      // Generate PDF invoice
      try {
        const pdfPath = await pdfGenerator.generateInvoice(invoice);
        console.log("Invoice PDF generated:", pdfPath);
      } catch (pdfError) {
        console.error("PDF generation error:", pdfError);
        // Continue without failing the invoice creation
      }
      
      res.json(invoice);
    } catch (error) {
      console.error("Create invoice error:", error);
      res.status(400).json({ message: "Failed to create invoice", error: (error as Error).message });
    }
  });

  app.get("/api/staff/invoices", async (req, res) => {
    try {
      const invoices = await storage.getAllInvoices();
      res.json(invoices);
    } catch (error) {
      console.error("Get invoices error:", error);
      res.status(500).json({ message: "Failed to get invoices", error: error.message });
    }
  });

  app.delete("/api/staff/invoices/:id", async (req, res) => {
    try {
      const invoiceId = parseInt(req.params.id);
      await storage.deleteInvoice(invoiceId);
      res.json({ message: "Invoice deleted successfully" });
    } catch (error) {
      console.error("Delete invoice error:", error);
      res.status(500).json({ message: "Failed to delete invoice", error: (error as Error).message });
    }
  });

  // Download Invoice PDF endpoint
  app.get("/api/staff/invoices/:id/download", async (req, res) => {
    try {
      const invoiceId = parseInt(req.params.id);
      const invoice = await storage.getInvoiceById(invoiceId);
      
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      // Generate PDF for the invoice
      const pdfBuffer = await pdfGenerator.generateInvoicePDF(invoice);
      
      // Set headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoice.id}-${new Date(invoice.invoiceDate).toISOString().split('T')[0]}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      
      // Send the PDF buffer
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Download invoice PDF error:", error);
      res.status(500).json({ message: "Failed to download invoice PDF", error: (error as Error).message });
    }
  });

  // Download Rentals PDF endpoint
  app.get("/api/staff/rentals/download", async (req, res) => {
    try {
      const filter = req.query.filter as string;
      const result = await storage.getRentalsPDF(filter);
      
      // Generate actual PDF with the rental data
      const pdfBuffer = await pdfGenerator.generateRentalReportPDF(result.rentals, filter);
      
      // Set headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="rental-report-${new Date().toISOString().split('T')[0]}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      
      // Send the PDF buffer
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Download rentals PDF error:", error);
      res.status(500).json({ message: "Failed to download rentals PDF", error: (error as Error).message });
    }
  });

  // Staff Logging Routes
  
  // Create Staff Log
  app.post("/api/staff/logs", async (req, res) => {
    try {
      const logData = req.body;
      const staffLog = await storage.createStaffLog(logData);
      res.json(staffLog);
    } catch (error) {
      console.error("Create staff log error:", error);
      res.status(500).json({ message: "Failed to create staff log", error: error.message });
    }
  });

  // Get All Staff Logs (Protected - requires superstaff authentication)
  app.post("/api/staff/logs/view", async (req, res) => {
    try {
      const { username, password, staffId } = req.body;
      
      // Verify superstaff credentials
      if (username?.toLowerCase() !== "superstaff" || password !== "7145") {
        return res.status(401).json({ message: "Access denied. Superstaff credentials required." });
      }
      
      const logs = staffId ? await storage.getStaffLogsByStaffId(staffId) : await storage.getAllStaffLogs();
      res.json(logs);
    } catch (error) {
      console.error("Get staff logs error:", error);
      res.status(500).json({ message: "Failed to get staff logs", error: error.message });
    }
  });

  // Get Staff Members (for activity tracking)
  app.get("/api/staff/members", async (req, res) => {
    try {
      const staffMembers = await storage.getAllStaff();
      res.json(staffMembers);
    } catch (error) {
      console.error("Get staff members error:", error);
      res.status(500).json({ message: "Failed to fetch staff members" });
    }
  });

  // Create New Staff Member
  app.post("/api/staff/create", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }
      
      if (password.length < 4) {
        return res.status(400).json({ message: "Password must be at least 4 characters" });
      }
      
      // Check if username already exists (case-insensitive)
      const existingStaff = await storage.getStaffByUsername(username);
      if (existingStaff) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      const newStaff = await storage.createStaff({ username, password });
      res.json({ message: "Staff member created successfully", staff: { id: newStaff.id, username: newStaff.username } });
    } catch (error) {
      console.error("Create staff error:", error);
      res.status(500).json({ message: "Failed to create staff member", error: error.message });
    }
  });

  // Reset Staff Password
  app.patch("/api/staff/:staffId/reset-password", async (req, res) => {
    try {
      const staffId = parseInt(req.params.staffId);
      const { newPassword } = req.body;
      
      if (!newPassword || newPassword.length < 4) {
        return res.status(400).json({ message: "Password must be at least 4 characters" });
      }
      
      await storage.updateStaffPassword(staffId, newPassword);
      res.json({ message: "Staff password reset successfully" });
    } catch (error) {
      console.error("Reset staff password error:", error);
      res.status(500).json({ message: "Failed to reset staff password", error: error.message });
    }
  });

  // Delete Staff Member
  app.delete("/api/staff/:staffId", async (req, res) => {
    try {
      const staffId = parseInt(req.params.staffId);
      
      // Prevent deletion of superstaff
      if (staffId === 99) {
        return res.status(400).json({ message: "Cannot delete superstaff account" });
      }
      
      await storage.deleteStaff(staffId);
      res.json({ message: "Staff member deleted successfully" });
    } catch (error) {
      console.error("Delete staff error:", error);
      res.status(500).json({ message: "Failed to delete staff member", error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
