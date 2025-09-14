import nodemailer from "nodemailer";
import { Customer } from "@shared/schema";
import path from "path";
import fs from "fs";

export class EmailService {
  private transporter;
  private isConfigured: boolean;

  constructor() {
    // Check if email is properly configured
    this.isConfigured = !!(process.env.SMTP_USER && process.env.SMTP_PASS);
    
    if (!this.isConfigured) {
      console.warn('⚠️ Email service not configured - missing SMTP_USER or SMTP_PASS environment variables');
      console.warn('💡 Emails will be logged but not sent. Set SMTP credentials to enable email functionality.');
    }

    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false
      }
    });
    
    if (this.isConfigured) {
      console.log('✅ Email service configured successfully');
    }
  }

  /**
   * Resolves PDF path to absolute path for email attachments
   * Handles both relative paths from PDF generator and already absolute paths
   */
  private resolvePdfPath(pdfPath: string): string {
    console.log('🔍 Resolving PDF path:', pdfPath);
    
    // If already absolute, return as-is
    if (path.isAbsolute(pdfPath)) {
      console.log('✅ Path is already absolute:', pdfPath);
      return pdfPath;
    }
    
    // Handle paths that start with / (relative from root)
    if (pdfPath.startsWith('/')) {
      const resolvedPath = path.join(process.cwd(), 'app', pdfPath.slice(1));
      console.log('🔧 Resolved relative path:', resolvedPath);
      return resolvedPath;
    }
    
    // Handle relative paths
    const resolvedPath = path.join(process.cwd(), 'app', pdfPath);
    console.log('🔧 Resolved relative path:', resolvedPath);
    return resolvedPath;
  }

  async sendRentalAgreement(customer: Customer, pdfPath: string, rentalDetails: any) {
    // Resolve PDF path to absolute path for email attachment
    const attachmentPath = this.resolvePdfPath(pdfPath);
    console.log('📧 Email Debug - Resolved attachment path:', attachmentPath);
    
    // Verify file exists before sending
    if (!fs.existsSync(attachmentPath)) {
      const error = new Error(`PDF file not found at path: ${attachmentPath}`);
      console.error('❌ Email Error - PDF file not found:', attachmentPath);
      throw error;
    }
    
    console.log('✅ Email Debug - PDF file exists, size:', fs.statSync(attachmentPath).size, 'bytes');
    
    const mailOptions = {
      from: process.env.SMTP_FROM || "reimaginedrentalz@gmail.com",
      to: customer.email,
      subject: "Your Reimagined Rentalz Rental Agreement",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #c53030 0%, #2d3748 100%); padding: 30px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px;">Reimagined Rentalz</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">Your Rental Agreement is Ready</p>
          </div>
          
          <div style="padding: 30px; background: #f8f9fa;">
            <h2 style="color: #333; margin-top: 0;">Dear ${customer.fullName},</h2>
            
            <p style="color: #666; line-height: 1.6;">
              Thank you for choosing Reimagined Rentalz for your car rental needs. Your rental agreement has been successfully generated and is attached to this email.
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
              <strong>Reimagined Rentalz Team</strong>
            </p>
          </div>
          
          <div style="background: #333; padding: 20px; text-align: center; color: #999; font-size: 14px;">
            <p style="margin: 0;">Reimagined Rentalz</p>
            <p style="margin: 5px 0 0 0;">Premium Car Rental Services</p>
          </div>
        </div>
      `,
      attachments: [
        {
          filename: `rental-agreement-${customer.fullName.replace(/\s+/g, '-')}.pdf`,
          path: attachmentPath,
        },
      ],
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Rental agreement email sent to ${customer.email}`);
    } catch (error) {
      console.error("Error sending email:", error);
      throw error;
    }
  }

  async sendRentalAgreementCopyToAdmin(customer: Customer, pdfPath: string, rentalDetails: any) {
    // Resolve PDF path to absolute path for email attachment
    const attachmentPath = this.resolvePdfPath(pdfPath);
    console.log('📧 Admin Email Debug - Resolved attachment path:', attachmentPath);
    
    // Verify file exists before sending
    if (!fs.existsSync(attachmentPath)) {
      console.error('❌ Admin Email Warning - PDF file not found:', attachmentPath);
      return; // Don't throw error for admin copy, just skip
    }
    const adminEmail = "reimaginedrentalz@gmail.com";
    
    const mailOptions = {
      from: process.env.SMTP_FROM || "reimaginedrentalz@gmail.com",
      to: adminEmail,
      subject: `📋 Rental Agreement Copy - ${customer.fullName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #c53030 0%, #2d3748 100%); padding: 30px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px;">Reimagined Rentalz</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">Rental Agreement Copy - Admin Record</p>
          </div>
          
          <div style="padding: 30px; background: #f8f9fa;">
            <h2 style="color: #333; margin-top: 0;">Rental Agreement Copy</h2>
            
            <p style="color: #666; line-height: 1.6;">
              This is a copy of the rental agreement that was successfully sent to the customer: <strong>${customer.fullName}</strong>
            </p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
              <h3 style="color: #333; margin-top: 0;">Customer & Rental Details:</h3>
              <ul style="color: #666; line-height: 1.8;">
                <li><strong>Customer:</strong> ${customer.fullName}</li>
                <li><strong>Email:</strong> ${customer.email}</li>
                <li><strong>Phone:</strong> ${customer.phone}</li>
                <li><strong>Vehicle:</strong> ${rentalDetails.vehicle} - ${rentalDetails.color}</li>
                <li><strong>Rental Period:</strong> ${new Date(rentalDetails.startDate).toLocaleDateString()} - ${new Date(rentalDetails.endDate).toLocaleDateString()}</li>
                <li><strong>Duration:</strong> ${rentalDetails.totalDays} days</li>
                <li><strong>Total Amount:</strong> RM ${rentalDetails.grandTotal}</li>
                <li><strong>Booking ID:</strong> #${rentalDetails.id}</li>
              </ul>
            </div>
            
            <div style="background: #e6fffa; border-left: 4px solid #38b2ac; padding: 15px; border-radius: 0 8px 8px 0; margin: 20px 0;">
              <p style="margin: 0; color: #2c7a7b; font-weight: 500;">
                <strong>Status:</strong> Agreement successfully generated and sent to customer.
              </p>
            </div>
            
            <p style="color: #666; line-height: 1.6;">
              The attached PDF contains the complete rental agreement with all terms, conditions, vehicle photos, and digital signature.
            </p>
            
            <p style="color: #666; line-height: 1.6;">
              <strong>Reimagined Rentalz Admin System</strong><br>
              Document generated: ${new Date().toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' })}
            </p>
          </div>
          
          <div style="background: #333; padding: 20px; text-align: center; color: #999; font-size: 14px;">
            <p style="margin: 0;">Reimagined Rentalz - Admin Copy</p>
            <p style="margin: 5px 0 0 0;">This is an automated admin record. Keep for business records.</p>
          </div>
        </div>
      `,
      attachments: [
        {
          filename: `ADMIN-COPY-${customer.fullName.replace(/\s+/g, '-')}-agreement.pdf`,
          path: attachmentPath,
        },
      ],
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Admin copy of rental agreement sent for customer: ${customer.fullName}`);
    } catch (error) {
      console.error("Error sending admin copy of rental agreement:", error);
      // Don't throw error to avoid disrupting the main booking flow
    }
  }

  async sendCustomerRegistrationWelcome(customer: Customer) {
    const mailOptions = {
      from: process.env.SMTP_FROM || "reimaginedrentalz@gmail.com",
      to: customer.email,
      subject: "Welcome to Reimagined Rentalz - Registration Successful",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #c53030 0%, #2d3748 100%); padding: 30px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px;">Welcome to Reimagined Rentalz!</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">Your Account is Ready</p>
          </div>
          
          <div style="padding: 30px; background: #f8f9fa;">
            <h2 style="color: #333; margin-top: 0;">Dear ${customer.fullName},</h2>
            
            <p style="color: #666; line-height: 1.6;">
              Welcome to Reimagined Rentalz! Your registration has been successfully completed and your account is now active.
            </p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
              <h3 style="color: #333; margin-top: 0;">Account Details:</h3>
              <ul style="color: #666; line-height: 1.8;">
                <li><strong>Name:</strong> ${customer.fullName}</li>
                <li><strong>Email:</strong> ${customer.email}</li>
                <li><strong>Phone:</strong> ${customer.phone}</li>
                <li><strong>Customer ID:</strong> #${customer.id}</li>
              </ul>
            </div>
            
            <p style="color: #666; line-height: 1.6;">
              You can now proceed to book your vehicle rental. Our team will review your documents and contact you for vehicle collection arrangements.
            </p>
            
            <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; color: #1976d2; font-weight: 500;">
                <strong>Next Steps:</strong> You can now log in and book your rental vehicle.
              </p>
            </div>
            
            <p style="color: #666; line-height: 1.6;">
              If you have any questions or need assistance, please don't hesitate to contact us.
            </p>
            
            <p style="color: #666; line-height: 1.6;">
              Thank you for choosing Reimagined Rentalz!<br>
              <strong>The Reimagined Rentalz Team</strong>
            </p>
          </div>
          
          <div style="background: #333; padding: 20px; text-align: center; color: #999; font-size: 14px;">
            <p style="margin: 0;">Reimagined Rentalz</p>
            <p style="margin: 5px 0 0 0;">Premium Car Rental Services</p>
          </div>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Welcome email sent to customer: ${customer.email}`);
    } catch (error) {
      console.error("Error sending welcome email:", error);
      throw error;
    }
  }

  async sendAdminNewCustomerNotification(customer: Customer) {
    const mailOptions = {
      from: process.env.SMTP_FROM || "reimaginedrentalz@gmail.com",
      to: "reimaginedrentalz@gmail.com",
      subject: `New Customer Registration - ${customer.fullName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #c53030 0%, #2d3748 100%); padding: 30px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px;">New Customer Registration</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">Reimagined Rentalz Admin Notification</p>
          </div>
          
          <div style="padding: 30px; background: #f8f9fa;">
            <h2 style="color: #333; margin-top: 0;">New Customer Registered</h2>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #38b2ac;">
              <h3 style="color: #333; margin-top: 0;">Customer Details:</h3>
              <ul style="color: #666; line-height: 1.8;">
                <li><strong>Name:</strong> ${customer.fullName}</li>
                <li><strong>Email:</strong> ${customer.email}</li>
                <li><strong>Phone:</strong> ${customer.phone}</li>
                <li><strong>Address:</strong> ${customer.address}</li>
                <li><strong>IC/Passport Number:</strong> ${customer.icPassportNumber}</li>
                <li><strong>Customer ID:</strong> #${customer.id}</li>
                <li><strong>Registration Time:</strong> ${new Date().toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' })}</li>
              </ul>
            </div>
            
            <div style="background: #e6fffa; border-left: 4px solid #38b2ac; padding: 15px; border-radius: 0 8px 8px 0; margin: 20px 0;">
              <p style="margin: 0; color: #2c7a7b; font-weight: 500;">
                <strong>Status:</strong> Customer account created and welcome email sent.
              </p>
            </div>
            
            <p style="color: #666; line-height: 1.6;">
              Please review the customer's documents and be ready to process any rental bookings.
            </p>
            
            <p style="color: #666; line-height: 1.6;">
              <strong>Reimagined Rentalz Admin System</strong><br>
              Notification generated: ${new Date().toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' })}
            </p>
          </div>
          
          <div style="background: #333; padding: 20px; text-align: center; color: #999; font-size: 14px;">
            <p style="margin: 0;">Reimagined Rentalz - Admin Notification</p>
            <p style="margin: 5px 0 0 0;">This is an automated admin notification.</p>
          </div>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Admin notification sent for new customer: ${customer.fullName}`);
    } catch (error) {
      console.error("Error sending admin notification:", error);
      throw error;
    }
  }

  async sendAdminNewRentalNotification(customer: Customer, rentalDetails: any) {
    const mailOptions = {
      from: process.env.SMTP_FROM || "reimaginedrentalz@gmail.com",
      to: "reimaginedrentalz@gmail.com",
      subject: `New Rental Booking - ${customer.fullName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #c53030 0%, #2d3748 100%); padding: 30px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px;">New Rental Booking</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">Reimagined Rentalz Admin Notification</p>
          </div>
          
          <div style="padding: 30px; background: #f8f9fa;">
            <h2 style="color: #333; margin-top: 0;">New Booking Received</h2>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
              <h3 style="color: #333; margin-top: 0;">Booking Details:</h3>
              <ul style="color: #666; line-height: 1.8;">
                <li><strong>Customer:</strong> ${customer.fullName}</li>
                <li><strong>Email:</strong> ${customer.email}</li>
                <li><strong>Phone:</strong> ${customer.phone}</li>
                <li><strong>Vehicle:</strong> ${rentalDetails.vehicle} - ${rentalDetails.color}</li>
                <li><strong>Rental Period:</strong> ${new Date(rentalDetails.startDate).toLocaleDateString()} - ${new Date(rentalDetails.endDate).toLocaleDateString()}</li>
                <li><strong>Duration:</strong> ${rentalDetails.totalDays} days</li>
                <li><strong>Total Amount:</strong> RM ${rentalDetails.grandTotal}</li>
                <li><strong>Booking ID:</strong> #${rentalDetails.id}</li>
                <li><strong>Booking Time:</strong> ${new Date().toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' })}</li>
              </ul>
            </div>
            
            <div style="background: #e6fffa; border-left: 4px solid #38b2ac; padding: 15px; border-radius: 0 8px 8px 0; margin: 20px 0;">
              <p style="margin: 0; color: #2c7a7b; font-weight: 500;">
                <strong>Status:</strong> Booking completed, agreement generated, and customer notified.
              </p>
            </div>
            
            <p style="color: #666; line-height: 1.6;">
              Please prepare the vehicle and contact the customer for collection arrangements.
            </p>
            
            <p style="color: #666; line-height: 1.6;">
              <strong>Reimagined Rentalz Admin System</strong><br>
              Notification generated: ${new Date().toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' })}
            </p>
          </div>
          
          <div style="background: #333; padding: 20px; text-align: center; color: #999; font-size: 14px;">
            <p style="margin: 0;">Reimagined Rentalz - Admin Notification</p>
            <p style="margin: 5px 0 0 0;">This is an automated admin notification.</p>
          </div>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Admin notification sent for new rental booking: ${customer.fullName}`);
      return true;
    } catch (error) {
      console.error("❌ Error sending admin rental notification:", error);
      console.error("Email error details:", error instanceof Error ? error.message : String(error));
      // Don't throw - let booking complete even if notification fails
      return false;
    }
  }

  async sendBookingRequestConfirmation(customer: Customer, bookingDetails: any) {
    const mailOptions = {
      from: process.env.SMTP_FROM || "reimaginedrentalz@gmail.com",
      to: customer.email,
      subject: "Booking Request Received - Reimagined Rentalz",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #c53030 0%, #2d3748 100%); padding: 30px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px;">Booking Request Received!</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">We'll review and get back to you soon</p>
          </div>
          
          <div style="padding: 30px; background: #f8f9fa;">
            <h2 style="color: #333; margin-top: 0;">Dear ${customer.fullName},</h2>
            
            <p style="color: #666; line-height: 1.6;">
              Thank you for your booking request! We have received your request and our team will review it within 24 hours.
            </p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
              <h3 style="color: #333; margin-top: 0;">Your Booking Request:</h3>
              <ul style="color: #666; line-height: 1.8;">
                <li><strong>Vehicle:</strong> ${bookingDetails.vehicleName}</li>
                <li><strong>Rental Period:</strong> ${new Date(bookingDetails.startDate).toLocaleDateString('en-MY')} - ${new Date(bookingDetails.endDate).toLocaleDateString('en-MY')}</li>
                <li><strong>Duration:</strong> ${bookingDetails.totalDays} days</li>
                <li><strong>Request ID:</strong> #${bookingDetails.id}</li>
                ${bookingDetails.customerMessage ? `<li><strong>Your Message:</strong> ${bookingDetails.customerMessage}</li>` : ''}
              </ul>
            </div>
            
            <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; color: #1976d2; font-weight: 500;">
                <strong>What's Next?</strong> Our team will check vehicle availability and pricing, then contact you via email or phone to confirm your booking.
              </p>
            </div>
            
            <div style="background: #f3e5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; color: #7b1fa2; font-weight: 500;">
                <strong>Need immediate assistance?</strong> WhatsApp us at +60 111 191 1595 for instant communication.
              </p>
            </div>
            
            <p style="color: #666; line-height: 1.6;">
              Thank you for choosing Reimagined Rentalz!<br>
              <strong>The Reimagined Rentalz Team</strong>
            </p>
          </div>
          
          <div style="background: #333; padding: 20px; text-align: center; color: #999; font-size: 14px;">
            <p style="margin: 0;">Reimagined Rentalz</p>
            <p style="margin: 5px 0 0 0;">Premium Car Rental Services</p>
          </div>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Booking request confirmation sent to customer: ${customer.email}`);
      return true;
    } catch (error) {
      console.error("❌ Error sending booking request confirmation:", error);
      return false;
    }
  }

  async sendAdminBookingRequestNotification(customer: Customer, bookingDetails: any) {
    const mailOptions = {
      from: process.env.SMTP_FROM || "reimaginedrentalz@gmail.com",
      to: "reimaginedrentalz@gmail.com",
      subject: `🚗 New Booking Request - ${customer.fullName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #c53030 0%, #2d3748 100%); padding: 30px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px;">New Booking Request</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">Reimagined Rentalz Admin Notification</p>
          </div>
          
          <div style="padding: 30px; background: #f8f9fa;">
            <h2 style="color: #333; margin-top: 0;">New Booking Request Received</h2>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
              <h3 style="color: #333; margin-top: 0;">Customer Details:</h3>
              <ul style="color: #666; line-height: 1.8;">
                <li><strong>Name:</strong> ${customer.fullName}</li>
                <li><strong>Email:</strong> ${customer.email}</li>
                <li><strong>Phone:</strong> ${customer.phone}</li>
                <li><strong>Customer ID:</strong> #${customer.id}</li>
              </ul>
            </div>

            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #38b2ac;">
              <h3 style="color: #333; margin-top: 0;">Booking Request Details:</h3>
              <ul style="color: #666; line-height: 1.8;">
                <li><strong>Vehicle:</strong> ${bookingDetails.vehicleName}</li>
                <li><strong>Rental Period:</strong> ${new Date(bookingDetails.startDate).toLocaleDateString('en-MY')} - ${new Date(bookingDetails.endDate).toLocaleDateString('en-MY')}</li>
                <li><strong>Duration:</strong> ${bookingDetails.totalDays} days</li>
                <li><strong>Request ID:</strong> #${bookingDetails.id}</li>
                <li><strong>Request Time:</strong> ${new Date().toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' })}</li>
                ${bookingDetails.customerMessage ? `<li><strong>Customer Message:</strong> "${bookingDetails.customerMessage}"</li>` : ''}
              </ul>
            </div>
            
            <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; border-radius: 0 8px 8px 0; margin: 20px 0;">
              <p style="margin: 0; color: #856404; font-weight: 500;">
                <strong>Action Required:</strong> Please review this booking request and confirm with the customer within 24 hours.
              </p>
            </div>
            
            <p style="color: #666; line-height: 1.6;">
              Customer has been notified that their request is being reviewed. Please check vehicle availability and pricing, then contact the customer to confirm the booking.
            </p>
            
            <p style="color: #666; line-height: 1.6;">
              <strong>Reimagined Rentalz Admin System</strong><br>
              Notification generated: ${new Date().toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' })}
            </p>
          </div>
          
          <div style="background: #333; padding: 20px; text-align: center; color: #999; font-size: 14px;">
            <p style="margin: 0;">Reimagined Rentalz - Admin Notification</p>
            <p style="margin: 5px 0 0 0;">This is an automated admin notification.</p>
          </div>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Admin notification sent for new booking request: ${customer.fullName}`);
      return true;
    } catch (error) {
      console.error("❌ Error sending admin booking request notification:", error);
      return false;
    }
  }
}

export const emailService = new EmailService();
