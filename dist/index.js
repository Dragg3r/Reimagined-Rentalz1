var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import express3 from "express";

// server/routes.ts
import { createServer } from "http";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  customers: () => customers,
  insertCustomerSchema: () => insertCustomerSchema,
  insertRentalSchema: () => insertRentalSchema,
  loginSchema: () => loginSchema,
  rentals: () => rentals,
  staff: () => staff,
  staffLoginSchema: () => staffLoginSchema
});
import { pgTable, text, serial, integer, boolean, timestamp, jsonb, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  hashedPassword: text("hashed_password").notNull(),
  // IC/Passport hashed
  phone: text("phone").notNull(),
  address: text("address").notNull(),
  icPassportNumber: text("ic_passport_number"),
  icPassportUrl: text("ic_passport_url").notNull(),
  utilityBillUrl: text("utility_bill_url"),
  socialMediaHandle: text("social_media_handle"),
  // Instagram username or Facebook ID
  status: text("status").notNull().default("active"),
  // active, blacklisted
  hasAcceptedTerms: boolean("has_accepted_terms").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var rentals = pgTable("rentals", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").references(() => customers.id).notNull(),
  vehicle: text("vehicle").notNull(),
  color: text("color").notNull(),
  mileageLimit: integer("mileage_limit").notNull(),
  extraMileageCharge: decimal("extra_mileage_charge", { precision: 10, scale: 2 }).notNull(),
  fuelLevel: integer("fuel_level").notNull(),
  // 0-8 scale
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  totalDays: integer("total_days").notNull(),
  rentalPerDay: decimal("rental_per_day", { precision: 10, scale: 2 }).notNull(),
  deposit: decimal("deposit", { precision: 10, scale: 2 }).notNull(),
  discount: decimal("discount", { precision: 10, scale: 2 }).default("0").notNull(),
  grandTotal: decimal("grand_total", { precision: 10, scale: 2 }).notNull(),
  vehiclePhotos: jsonb("vehicle_photos").default({}),
  // URLs of photos (optional)
  paymentProofUrl: text("payment_proof_url").default(""),
  signatureUrl: text("signature_url").default(""),
  agreementPdfUrl: text("agreement_pdf_url"),
  status: text("status").notNull().default("pending"),
  // pending, completed
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var staff = pgTable("staff", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  hashedPassword: text("hashed_password").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  createdAt: true,
  hasAcceptedTerms: true,
  status: true
}).partial({
  utilityBillUrl: true,
  socialMediaHandle: true
});
var insertRentalSchema = createInsertSchema(rentals).omit({
  id: true,
  createdAt: true,
  status: true,
  agreementPdfUrl: true
});
var loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});
var staffLoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
});

// server/db.ts
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
neonConfig.webSocketConstructor = ws;
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}
var pool = new Pool({ connectionString: process.env.DATABASE_URL });
var db = drizzle({ client: pool, schema: schema_exports });

// server/storage.ts
import { eq, desc } from "drizzle-orm";
import bcrypt from "bcrypt";
var DatabaseStorage = class {
  async createCustomer(insertCustomer) {
    const customerData = {
      ...insertCustomer,
      utilityBillUrl: insertCustomer.utilityBillUrl || null,
      socialMediaHandle: insertCustomer.socialMediaHandle || null
    };
    const [customer] = await db.insert(customers).values(customerData).returning();
    return customer;
  }
  async getCustomerByEmail(email) {
    const [customer] = await db.select().from(customers).where(eq(customers.email, email));
    return customer || void 0;
  }
  async getCustomerById(id) {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    return customer || void 0;
  }
  async updateCustomerTermsAcceptance(id) {
    await db.update(customers).set({ hasAcceptedTerms: true }).where(eq(customers.id, id));
  }
  async updateCustomerStatus(id, status) {
    await db.update(customers).set({ status }).where(eq(customers.id, id));
  }
  async updateCustomerPassword(id, hashedPassword) {
    await db.update(customers).set({ hashedPassword }).where(eq(customers.id, id));
  }
  async getAllCustomers() {
    return await db.select().from(customers).orderBy(customers.fullName);
  }
  async createRental(insertRental) {
    const [rental] = await db.insert(rentals).values(insertRental).returning();
    return rental;
  }
  async getRentalById(id) {
    const [rental] = await db.select().from(rentals).where(eq(rentals.id, id));
    return rental || void 0;
  }
  async updateRentalPdf(id, pdfUrl) {
    await db.update(rentals).set({ agreementPdfUrl: pdfUrl, status: "completed" }).where(eq(rentals.id, id));
  }
  async getRentalsByCustomer(customerId) {
    return await db.select().from(rentals).where(eq(rentals.customerId, customerId)).orderBy(desc(rentals.createdAt));
  }
  async getAllRentals() {
    return await db.select().from(rentals).orderBy(desc(rentals.createdAt));
  }
  async getStaffByUsername(username) {
    const [staffMember] = await db.select().from(staff).where(eq(staff.username, username));
    return staffMember || void 0;
  }
  async hashPassword(password) {
    return await bcrypt.hash(password, 12);
  }
  async comparePassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }
};
var storage = new DatabaseStorage();

// server/services/imageProcessor.ts
import sharp from "sharp";
import path from "path";
import fs from "fs/promises";
var ImageProcessor = class {
  uploadsDir = path.join(process.cwd(), "uploads");
  backupsDir = path.join(process.cwd(), "backups");
  constructor() {
    this.ensureDirectories();
  }
  async ensureDirectories() {
    try {
      await fs.mkdir(this.uploadsDir, { recursive: true });
      await fs.mkdir(this.backupsDir, { recursive: true });
    } catch (error) {
      console.error("Error creating directories:", error);
    }
  }
  async processAndWatermarkImage(buffer, filename) {
    const processedFilename = `processed_${Date.now()}_${filename}`;
    const outputPath = path.join(this.uploadsDir, processedFilename);
    const watermarkSvg = `
      <svg width="800" height="600">
        <defs>
          <pattern id="watermark" patternUnits="userSpaceOnUse" width="400" height="300" patternTransform="rotate(45)">
            <text x="0" y="150" font-family="Arial, sans-serif" font-size="24" font-weight="bold" 
                  fill="rgba(0,0,0,0.3)" opacity="0.5">FOR DRIVE KL EXECUTIVE SDN BHD USE ONLY</text>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#watermark)"/>
      </svg>
    `;
    await sharp(buffer).resize(1200, 1200, {
      fit: "inside",
      withoutEnlargement: true
    }).jpeg({ quality: 80 }).composite([{
      input: Buffer.from(watermarkSvg),
      blend: "overlay"
    }]).toFile(outputPath);
    return `/uploads/${processedFilename}`;
  }
  async processSignature(dataUrl, filename) {
    const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    const processedFilename = `signature_${Date.now()}_${filename}`;
    const outputPath = path.join(this.uploadsDir, processedFilename);
    await sharp(buffer).png().toFile(outputPath);
    return `/uploads/${processedFilename}`;
  }
  async processVehiclePhoto(buffer, filename) {
    const processedFilename = `vehicle_${Date.now()}_${filename}`;
    const outputPath = path.join(this.uploadsDir, processedFilename);
    await sharp(buffer).resize(800, 600, {
      fit: "inside",
      withoutEnlargement: true
    }).jpeg({ quality: 85 }).toFile(outputPath);
    return `/uploads/${processedFilename}`;
  }
};
var imageProcessor = new ImageProcessor();

// server/services/pdfGenerator.ts
import PDFDocument from "pdfkit";
import fs2 from "fs";
import path2 from "path";
var PDFGenerator = class {
  backupsDir = path2.join(process.cwd(), "backups");
  constructor() {
    this.ensureBackupsDirectory();
  }
  async ensureBackupsDirectory() {
    try {
      await fs2.promises.mkdir(this.backupsDir, { recursive: true });
    } catch (error) {
      console.error("Error creating backups directory:", error);
    }
  }
  async generateRentalAgreement(rental, customer) {
    const filename = `${customer.fullName.replace(/\s+/g, "-")}-${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}-agreement.pdf`;
    const filePath = path2.join(this.backupsDir, filename);
    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(fs2.createWriteStream(filePath));
    doc.fontSize(20).font("Helvetica-Bold").text("DRIVE KL EXECUTIVE SDN BHD", { align: "center" });
    doc.fontSize(16).font("Helvetica").text("CAR RENTAL AGREEMENT", { align: "center" });
    doc.moveDown();
    doc.fontSize(14).font("Helvetica-Bold").text("CUSTOMER INFORMATION");
    doc.fontSize(12).font("Helvetica");
    doc.text(`Full Name: ${customer.fullName}`);
    doc.text(`IC/Passport Number: ${customer.icPassportNumber || "N/A"}`);
    doc.text(`Email: ${customer.email}`);
    doc.text(`Phone: ${customer.phone}`);
    doc.text(`Address: ${customer.address}`);
    doc.moveDown();
    doc.fontSize(14).font("Helvetica-Bold").text("VEHICLE INFORMATION");
    doc.fontSize(12).font("Helvetica");
    doc.text(`Vehicle: ${rental.vehicle}`);
    doc.text(`Color: ${rental.color}`);
    doc.text(`Mileage Limit: ${rental.mileageLimit} KM`);
    doc.text(`Extra Mileage Charge: RM ${rental.extraMileageCharge}/km`);
    doc.text(`Fuel Level at Pickup: ${this.getFuelLevelText(rental.fuelLevel)}`);
    doc.moveDown();
    doc.fontSize(14).font("Helvetica-Bold").text("RENTAL DETAILS");
    doc.fontSize(12).font("Helvetica");
    doc.text(`Start Date: ${new Date(rental.startDate).toLocaleDateString()}`);
    doc.text(`End Date: ${new Date(rental.endDate).toLocaleDateString()}`);
    doc.text(`Total Days: ${rental.totalDays}`);
    doc.moveDown();
    doc.fontSize(14).font("Helvetica-Bold").text("PAYMENT INFORMATION");
    doc.fontSize(12).font("Helvetica");
    doc.text(`Rental Per Day: RM ${rental.rentalPerDay}`);
    doc.text(`Deposit: RM ${rental.deposit}`);
    doc.text(`Discount: RM ${rental.discount}`);
    doc.fontSize(14).font("Helvetica-Bold").text(`GRAND TOTAL: RM ${rental.grandTotal}`);
    doc.moveDown();
    doc.addPage();
    doc.fontSize(16).font("Helvetica-Bold").text("TERMS AND CONDITIONS", { align: "center" });
    doc.moveDown();
    this.addTermsAndConditions(doc);
    doc.addPage();
    doc.fontSize(14).font("Helvetica-Bold").text("VEHICLE CONDITION PHOTOS");
    doc.moveDown();
    const photos = rental.vehiclePhotos;
    let yPosition = doc.y;
    let xPosition = 50;
    let photosPerRow = 2;
    let photoCount = 0;
    for (const [photoType, photoUrl] of Object.entries(photos)) {
      if (photoUrl && fs2.existsSync(path2.join(process.cwd(), photoUrl.replace("/", "")))) {
        try {
          doc.fontSize(10).text(photoType, xPosition, yPosition);
          doc.image(path2.join(process.cwd(), photoUrl.replace("/", "")), xPosition, yPosition + 15, {
            width: 200,
            height: 150
          });
          photoCount++;
          if (photoCount % photosPerRow === 0) {
            yPosition += 180;
            xPosition = 50;
          } else {
            xPosition += 250;
          }
          if (yPosition > 650) {
            doc.addPage();
            yPosition = 50;
            xPosition = 50;
          }
        } catch (error) {
          console.error(`Error adding image ${photoType}:`, error);
        }
      }
    }
    doc.addPage();
    doc.fontSize(14).font("Helvetica-Bold").text("DIGITAL SIGNATURE");
    doc.moveDown();
    if (rental.signatureUrl && fs2.existsSync(path2.join(process.cwd(), rental.signatureUrl.replace("/", "")))) {
      try {
        doc.image(path2.join(process.cwd(), rental.signatureUrl.replace("/", "")), 50, doc.y, {
          width: 300,
          height: 100
        });
      } catch (error) {
        console.error("Error adding signature:", error);
      }
    }
    doc.moveDown(8);
    doc.text(`Customer Name: ${customer.fullName}`);
    doc.text(`Date: ${(/* @__PURE__ */ new Date()).toLocaleDateString()}`);
    doc.end();
    return `/backups/${filename}`;
  }
  getFuelLevelText(level) {
    const levels = ["Empty", "1/8", "1/4", "3/8", "1/2", "5/8", "3/4", "7/8", "Full"];
    return levels[level] || "Unknown";
  }
  addTermsAndConditions(doc) {
    doc.fontSize(12).font("Helvetica");
    const terms = `
This Agreement outlines the terms for vehicle rental from Drive KL Executive Sdn Bhd. By signing, the Renter agrees to these clauses. Breaches may lead to penalties, deposit forfeiture, agreement termination, and legal action.

1. RENTAL PERIOD AND VEHICLE USAGE

1.1. Genting Highland Usage Fee: An additional surcharge (RM150-RM350, vehicle-dependent) applies for Genting Highlands travel. Declare and settle this fee with Drive KL Executive Sdn Bhd before departure.

1.2. Early Termination of Rental: No refunds or partial refunds are provided for early returns. The Renter must honor the original booking duration.

1.3. Late Return Penalty: Vehicles returned late incur a RM 25-300 per hour penalty, unless Drive KL Executive Sdn Bhd provides prior written agreement.

1.4. Mileage Limits & Charges: Exceeding any daily mileage cap results in an overage charge (RM1.50\u2013RM5.00/km), payable to Drive KL Executive Sdn Bhd.

1.5. Fuel Level Requirement: Return vehicles with the same fuel level as received. Drive KL Executive Sdn Bhd will impose a RM50\u2013RM200 refueling charge if not met.

2. DRIVER AUTHORIZATION & RESPONSIBILITIES

2.1. Unregistered Drivers Prohibited: Only authorized individuals listed in this Agreement may drive the vehicle. Any unregistered driver voids this Agreement and forfeits the full deposit to Drive KL Executive Sdn Bhd.

2.2. Traffic Violations & Summons: The Renter is solely responsible for all traffic fines, parking summons, and toll charges incurred during the rental period. Outstanding penalties will be deducted from the deposit by Drive KL Executive Sdn Bhd.

3. VEHICLE CARE AND PROHIBITED ACTIONS

3.1. Unauthorized Workshop Visits: Renters are strictly prohibited from sending the vehicle to any external workshop. Violations result in immediate agreement termination by Drive KL Executive Sdn Bhd and full deposit forfeiture. All repairs must be coordinated with Drive KL Executive Sdn Bhd.

3.2. Vehicle Misuse & Reckless Behavior: Vehicle abuse (e.g., drifting, burnouts, unauthorized decals/stickers, aggressive revving, off-road use, redlining while idle) is strictly forbidden. This results in full deposit forfeiture to Drive KL Executive Sdn Bhd and potential legal action.

3.3. Speed Limit Violations: Speeding is monitored via GPS/dash cam. A first offense results in a written warning from Drive KL Executive Sdn Bhd. A second offense leads to immediate rental termination and full deposit forfeiture, with no exceptions.

3.4. Smoking & Vaping Strictly Prohibited: A RM300 cleaning fee will be charged by Drive KL Executive Sdn Bhd if the interior smells of smoke, vape, or strong odors.

4. INSURANCE COVERAGE AND DAMAGES

All rental vehicles are covered by comprehensive insurance. However, the Renter is responsible for the first RM2,000-RM5,000 of any damage claim, depending on the vehicle category. This excess amount will be deducted from the deposit.

By signing below, the Renter acknowledges reading, understanding, and agreeing to all terms and conditions outlined in this Agreement.
    `;
    doc.text(terms, {
      width: 500,
      align: "justify"
    });
  }
};
var pdfGenerator = new PDFGenerator();

// server/services/emailService.ts
import nodemailer from "nodemailer";
var EmailService = class {
  transporter;
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: false,
      auth: {
        user: process.env.SMTP_USER || process.env.EMAIL_USER,
        pass: process.env.SMTP_PASS || process.env.EMAIL_PASS
      }
    });
  }
  async sendRentalAgreement(customer, pdfPath, rentalDetails) {
    const attachmentPath = pdfPath.startsWith("/") ? pdfPath.substring(1) : pdfPath;
    const mailOptions = {
      from: process.env.SMTP_FROM || "noreply@drivekl.com",
      to: customer.email,
      subject: "Your Drive KL Rental Agreement",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px;">Drive KL Executive</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">Your Rental Agreement is Ready</p>
          </div>
          
          <div style="padding: 30px; background: #f8f9fa;">
            <h2 style="color: #333; margin-top: 0;">Dear ${customer.fullName},</h2>
            
            <p style="color: #666; line-height: 1.6;">
              Thank you for choosing Drive KL Executive for your car rental needs. Your rental agreement has been successfully generated and is attached to this email.
            </p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
              <h3 style="color: #333; margin-top: 0;">Rental Summary:</h3>
              <ul style="color: #666; line-height: 1.8;">
                <li><strong>Vehicle:</strong> ${rentalDetails.vehicle} - ${rentalDetails.color}</li>
                <li><strong>Rental Period:</strong> ${new Date(rentalDetails.startDate).toLocaleDateString()} - ${new Date(rentalDetails.endDate).toLocaleDateString()}</li>
                <li><strong>Total Amount:</strong> RM ${rentalDetails.grandTotal}</li>
              </ul>
            </div>
            
            <p style="color: #666; line-height: 1.6;">
              Please review the attached agreement carefully and keep it for your records. If you have any questions or concerns, please don't hesitate to contact us.
            </p>
            
            <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; color: #1976d2; font-weight: 500;">
                <strong>Important:</strong> Please bring a printed copy of this agreement when picking up your vehicle.
              </p>
            </div>
            
            <p style="color: #666; line-height: 1.6;">
              Thank you for your business!<br>
              <strong>Drive KL Executive Team</strong>
            </p>
          </div>
          
          <div style="background: #333; padding: 20px; text-align: center; color: #999; font-size: 14px;">
            <p style="margin: 0;">Drive KL Executive Sdn Bhd</p>
            <p style="margin: 5px 0 0 0;">Premium Car Rental Services</p>
          </div>
        </div>
      `,
      attachments: [
        {
          filename: `rental-agreement-${customer.fullName.replace(/\s+/g, "-")}.pdf`,
          path: attachmentPath
        }
      ]
    };
    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Rental agreement email sent to ${customer.email}`);
    } catch (error) {
      console.error("Error sending email:", error);
      throw error;
    }
  }
};
var emailService = new EmailService();

// server/routes.ts
import multer from "multer";
import express from "express";
import path3 from "path";
var upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024
    // 10MB limit
  }
});
async function registerRoutes(app2) {
  app2.use("/uploads", express.static(path3.join(process.cwd(), "uploads")));
  app2.use("/backups", express.static(path3.join(process.cwd(), "backups")));
  app2.post("/api/customers/register", upload.fields([
    { name: "icPassport", maxCount: 1 },
    { name: "utilityBill", maxCount: 1 }
  ]), async (req, res) => {
    try {
      const { fullName, email, hashedPassword, phone, address, icPassportNumber, socialMediaHandle } = req.body;
      const files = req.files;
      if (!files?.icPassport?.[0]) {
        return res.status(400).json({ message: "IC/Passport image is required" });
      }
      if (!files?.utilityBill?.[0]) {
        return res.status(400).json({ message: "Utility bill image is required" });
      }
      if (!fullName || !email || !hashedPassword || !phone || !address || !icPassportNumber) {
        return res.status(400).json({ message: "All fields are required" });
      }
      const existingCustomer = await storage.getCustomerByEmail(email);
      if (existingCustomer) {
        return res.status(400).json({ message: "Customer with this email already exists" });
      }
      const icPassportUrl = await imageProcessor.processAndWatermarkImage(
        files.icPassport[0].buffer,
        files.icPassport[0].originalname
      );
      const utilityBillUrl = await imageProcessor.processAndWatermarkImage(
        files.utilityBill[0].buffer,
        files.utilityBill[0].originalname
      );
      const hashedPasswordValue = await storage.hashPassword(hashedPassword);
      const newCustomer = await storage.createCustomer({
        fullName,
        email,
        hashedPassword: hashedPasswordValue,
        phone,
        address,
        icPassportNumber,
        icPassportUrl,
        utilityBillUrl,
        socialMediaHandle: socialMediaHandle || null
      });
      const { hashedPassword: _password, ...safeCustomer } = newCustomer;
      res.json(safeCustomer);
    } catch (error) {
      console.error("Registration error:", error);
      res.status(400).json({ message: "Registration failed", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });
  app2.post("/api/customers/login", async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);
      const customer = await storage.getCustomerByEmail(email);
      if (!customer) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      if (customer.status === "blacklisted") {
        return res.status(403).json({ message: "Account has been suspended" });
      }
      const isValidPassword = await storage.comparePassword(password, customer.hashedPassword);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      const { hashedPassword: _, ...safeCustomer } = customer;
      res.json(safeCustomer);
    } catch (error) {
      console.error("Login error:", error);
      res.status(400).json({ message: "Login failed", error: error.message });
    }
  });
  app2.post("/api/customers/:id/accept-terms", async (req, res) => {
    try {
      const customerId = parseInt(req.params.id);
      await storage.updateCustomerTermsAcceptance(customerId);
      res.json({ message: "Terms accepted successfully" });
    } catch (error) {
      console.error("Terms acceptance error:", error);
      res.status(400).json({ message: "Failed to accept terms", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });
  app2.post("/api/rentals", upload.fields([
    { name: "vehiclePhotos", maxCount: 7 },
    { name: "paymentProof", maxCount: 1 }
  ]), async (req, res) => {
    try {
      const transformedData = {
        customerId: parseInt(req.body.customerId),
        vehicle: req.body.vehicle,
        color: req.body.color,
        mileageLimit: parseInt(req.body.mileageLimit.replace(/[^\d]/g, "")) || 0,
        // Extract number from "170 KM"
        extraMileageCharge: (parseFloat(req.body.extraMileageCharge.replace(/[^\d.]/g, "")) || 0).toString(),
        // Extract number from "RM 2.50"
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
      const files = req.files;
      const hasVehiclePhotos = files.vehiclePhotos && files.vehiclePhotos.length > 0;
      const hasPaymentProof = files.paymentProof && files.paymentProof.length > 0;
      const vehiclePhotos = {};
      const photoTypes = ["frontWithCustomer", "front", "back", "left", "right", "interiorMileage", "knownDamage"];
      if (hasVehiclePhotos) {
        for (let i = 0; i < files.vehiclePhotos.length; i++) {
          const photoUrl = await imageProcessor.processVehiclePhoto(
            files.vehiclePhotos[i].buffer,
            files.vehiclePhotos[i].originalname
          );
          vehiclePhotos[photoTypes[i]] = photoUrl;
        }
      }
      let paymentProofUrl = "";
      if (hasPaymentProof) {
        paymentProofUrl = await imageProcessor.processVehiclePhoto(
          files.paymentProof[0].buffer,
          files.paymentProof[0].originalname
        );
      }
      let signatureUrl = "";
      if (req.body.signatureData) {
        signatureUrl = await imageProcessor.processSignature(
          req.body.signatureData,
          "signature.png"
        );
      }
      const rental = await storage.createRental({
        ...transformedData,
        vehiclePhotos,
        paymentProofUrl,
        signatureUrl
      });
      res.json(rental);
    } catch (error) {
      console.error("Rental creation error:", error);
      res.status(400).json({ message: "Failed to create rental", error: error.message });
    }
  });
  app2.post("/api/rentals/:id/generate-agreement", async (req, res) => {
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
      const pdfUrl = await pdfGenerator.generateRentalAgreement(rentalRecord, customer);
      await storage.updateRentalPdf(rentalRecord.id, pdfUrl);
      let emailSent = false;
      try {
        await emailService.sendRentalAgreement(customer, pdfUrl, rentalRecord);
        emailSent = true;
        console.log("Email sent successfully to:", customer.email);
      } catch (emailError) {
        console.error("Error sending email:", emailError);
      }
      res.json({
        message: emailSent ? "Agreement generated and emailed successfully" : "Agreement generated successfully (email delivery unavailable)",
        pdfUrl,
        downloadUrl: `/api/rentals/${rentalRecord.id}/download-agreement`,
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
  app2.get("/api/rentals/:id/download-agreement", async (req, res) => {
    try {
      const rentalId = parseInt(req.params.id);
      const rental = await storage.getRentalById(rentalId);
      if (!rental || !rental.agreementPdfUrl) {
        return res.status(404).json({ message: "Agreement not found" });
      }
      const pdfPath = path3.join(process.cwd(), rental.agreementPdfUrl.replace("/", ""));
      res.download(pdfPath);
    } catch (error) {
      console.error("Download error:", error);
      res.status(500).json({ message: "Failed to download agreement", error: error.message });
    }
  });
  app2.post("/api/staff/login", async (req, res) => {
    try {
      const { username, password } = staffLoginSchema.parse(req.body);
      if (username === "Akib" && password === "1234") {
        res.json({
          id: 1,
          username: "Akib",
          message: "Login successful"
        });
      } else {
        res.status(401).json({ message: "Invalid staff credentials" });
      }
    } catch (error) {
      console.error("Staff login error:", error);
      res.status(400).json({ message: "Staff login failed", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });
  app2.get("/api/staff/customers", async (req, res) => {
    try {
      const customers2 = await storage.getAllCustomers();
      const safeCustomers = customers2.map(({ hashedPassword, ...customer }) => customer);
      res.json(safeCustomers);
    } catch (error) {
      console.error("Get customers error:", error);
      res.status(500).json({ message: "Failed to get customers", error: error.message });
    }
  });
  app2.patch("/api/staff/customers/:id/status", async (req, res) => {
    try {
      const customerId = parseInt(req.params.id);
      const { status } = req.body;
      if (!["active", "blacklisted"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      await storage.updateCustomerStatus(customerId, status);
      res.json({ message: "Customer status updated successfully" });
    } catch (error) {
      console.error("Update status error:", error);
      res.status(500).json({ message: "Failed to update customer status", error: error.message });
    }
  });
  app2.patch("/api/staff/customers/:id/reset-password", async (req, res) => {
    try {
      const customerId = parseInt(req.params.id);
      const { newPassword } = req.body;
      const hashedPassword = await storage.hashPassword(newPassword);
      await storage.updateCustomerPassword(customerId, hashedPassword);
      res.json({ message: "Password reset successfully" });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ message: "Failed to reset password", error: error.message });
    }
  });
  app2.get("/api/staff/rentals", async (req, res) => {
    try {
      const rentals2 = await storage.getAllRentals();
      res.json(rentals2);
    } catch (error) {
      console.error("Get rentals error:", error);
      res.status(500).json({ message: "Failed to get rentals", error: error.message });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express2 from "express";
import fs3 from "fs";
import path5 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path4 from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path4.resolve(import.meta.dirname, "client", "src"),
      "@shared": path4.resolve(import.meta.dirname, "shared"),
      "@assets": path4.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path4.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path4.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path5.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs3.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path5.resolve(import.meta.dirname, "public");
  if (!fs3.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express2.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path5.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express3();
app.use(express3.json());
app.use(express3.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path6 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path6.startsWith("/api")) {
      let logLine = `${req.method} ${path6} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = 5e3;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
