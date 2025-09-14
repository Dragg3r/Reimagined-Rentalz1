import nodemailer from 'nodemailer';
import type { Customer, Rental } from '@shared/schema';

export class AdminNotificationService {
  private transporter;
  private adminEmail: string;

  constructor() {
    this.adminEmail = "reimaginedrentalz@gmail.com";
    
    // Gmail SMTP Configuration
    this.transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false, // Use STARTTLS for port 587
      auth: {
        user: process.env.ADMIN_EMAIL_USER || this.adminEmail,
        pass: process.env.ADMIN_EMAIL_PASS || "", // Will need to be set in environment
      },
    });
  }

  async notifyNewCustomerRegistration(customer: Customer) {
    const mailOptions = {
      from: this.adminEmail,
      to: this.adminEmail,
      subject: `🔔 New Customer Registration - ${customer.fullName}`,
      html: this.createNewCustomerEmailTemplate(customer),
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Admin notification sent for new customer: ${customer.email}`);
    } catch (error) {
      console.error("Error sending admin notification for new customer:", error);
      // Don't throw error to avoid disrupting registration flow
    }
  }

  async notifyNewRentalBooking(rental: Rental, customer: Customer) {
    const mailOptions = {
      from: this.adminEmail,
      to: this.adminEmail,
      subject: `🚗 New Rental Booking - ${customer.fullName}`,
      html: this.createNewBookingEmailTemplate(rental, customer),
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Admin notification sent for new booking: Rental ID ${rental.id}`);
    } catch (error) {
      console.error("Error sending admin notification for new booking:", error);
      // Don't throw error to avoid disrupting booking flow
    }
  }

  private createNewCustomerEmailTemplate(customer: Customer): string {
    const registrationTime = new Date(customer.createdAt).toLocaleString('en-MY', {
      timeZone: 'Asia/Kuala_Lumpur',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #c53030 0%, #2d3748 100%); padding: 30px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 28px;">🔔 New Customer Alert</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px;">Reimagined Rentalz Admin Dashboard</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 30px; background: white; margin: 0;">
          <div style="background: #e6fffa; border-left: 4px solid #38b2ac; padding: 20px; margin-bottom: 25px; border-radius: 0 8px 8px 0;">
            <h2 style="color: #2d3748; margin: 0 0 10px 0; font-size: 20px;">
              ✅ New Customer Registration Completed
            </h2>
            <p style="color: #4a5568; margin: 0; font-size: 14px;">
              A new customer has successfully registered on the system
            </p>
          </div>

          <!-- Customer Details -->
          <div style="background: #f7fafc; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
            <h3 style="color: #2d3748; margin: 0 0 20px 0; font-size: 18px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">
              👤 Customer Information
            </h3>
            
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #4a5568; width: 140px;">Full Name:</td>
                <td style="padding: 8px 0; color: #2d3748;">${customer.fullName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #4a5568;">Email:</td>
                <td style="padding: 8px 0; color: #2d3748;">
                  <a href="mailto:${customer.email}" style="color: #3182ce; text-decoration: none;">
                    ${customer.email}
                  </a>
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #4a5568;">Phone:</td>
                <td style="padding: 8px 0; color: #2d3748;">
                  <a href="tel:${customer.phone}" style="color: #3182ce; text-decoration: none;">
                    ${customer.phone}
                  </a>
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #4a5568;">IC/Passport:</td>
                <td style="padding: 8px 0; color: #2d3748;">${customer.icPassportNumber || 'Not provided'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #4a5568;">Address:</td>
                <td style="padding: 8px 0; color: #2d3748;">${customer.address}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #4a5568;">Social Media:</td>
                <td style="padding: 8px 0; color: #2d3748;">${customer.socialMediaHandle || 'Not provided'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #4a5568;">Status:</td>
                <td style="padding: 8px 0;">
                  <span style="background: #48bb78; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold;">
                    ${customer.status?.toUpperCase() || 'ACTIVE'}
                  </span>
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #4a5568;">Registered:</td>
                <td style="padding: 8px 0; color: #2d3748; font-weight: bold;">${registrationTime}</td>
              </tr>
            </table>
          </div>

          <!-- Document Status -->
          <div style="background: #fff5f5; border: 1px solid #fed7d7; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
            <h3 style="color: #c53030; margin: 0 0 15px 0; font-size: 16px;">📋 Document Upload Status</h3>
            <div style="display: flex; flex-wrap: wrap; gap: 10px;">
              <span style="background: ${customer.icPassportUrl ? '#c6f6d5' : '#fed7d7'}; color: ${customer.icPassportUrl ? '#22543d' : '#c53030'}; padding: 6px 12px; border-radius: 4px; font-size: 12px; font-weight: bold;">
                ${customer.icPassportUrl ? '✅' : '❌'} IC/Passport
              </span>
              <span style="background: ${customer.driversLicenseUrl ? '#c6f6d5' : '#fed7d7'}; color: ${customer.driversLicenseUrl ? '#22543d' : '#c53030'}; padding: 6px 12px; border-radius: 4px; font-size: 12px; font-weight: bold;">
                ${customer.driversLicenseUrl ? '✅' : '❌'} Driver's License
              </span>
              <span style="background: ${customer.utilityBillUrl ? '#c6f6d5' : '#fed7d7'}; color: ${customer.utilityBillUrl ? '#22543d' : '#c53030'}; padding: 6px 12px; border-radius: 4px; font-size: 12px; font-weight: bold;">
                ${customer.utilityBillUrl ? '✅' : '❌'} Utility Bill
              </span>
            </div>
          </div>

          <!-- Action Buttons -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="#" style="background: #3182ce; color: white; padding: 12px 25px; border-radius: 6px; text-decoration: none; font-weight: bold; margin-right: 15px;">
              📱 View Customer Details
            </a>
            <a href="mailto:${customer.email}" style="background: #38a169; color: white; padding: 12px 25px; border-radius: 6px; text-decoration: none; font-weight: bold;">
              ✉️ Contact Customer
            </a>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background: #2d3748; color: #a0aec0; text-align: center; padding: 20px;">
          <p style="margin: 0; font-size: 12px;">
            Reimagined Rentalz - Admin Notification System<br>
            This is an automated notification. Please do not reply to this email.
          </p>
        </div>
      </div>
    `;
  }

  private createNewBookingEmailTemplate(rental: Rental, customer: Customer): string {
    const bookingTime = new Date().toLocaleString('en-MY', {
      timeZone: 'Asia/Kuala_Lumpur',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    const startDate = new Date(rental.startDate).toLocaleDateString('en-MY', {
      timeZone: 'Asia/Kuala_Lumpur',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const endDate = new Date(rental.endDate).toLocaleDateString('en-MY', {
      timeZone: 'Asia/Kuala_Lumpur',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #c53030 0%, #2d3748 100%); padding: 30px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 28px;">🚗 New Booking Alert</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px;">Reimagined Rentalz Admin Dashboard</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 30px; background: white; margin: 0;">
          <div style="background: #fef5e7; border-left: 4px solid #ed8936; padding: 20px; margin-bottom: 25px; border-radius: 0 8px 8px 0;">
            <h2 style="color: #2d3748; margin: 0 0 10px 0; font-size: 20px;">
              🎉 New Rental Booking Received
            </h2>
            <p style="color: #4a5568; margin: 0; font-size: 14px;">
              A customer has successfully completed a rental booking
            </p>
          </div>

          <!-- Booking Summary -->
          <div style="background: #f0fff4; border: 2px solid #9ae6b4; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
            <h3 style="color: #22543d; margin: 0 0 15px 0; font-size: 18px; text-align: center;">
              💰 Booking Summary
            </h3>
            <div style="text-align: center;">
              <div style="font-size: 24px; font-weight: bold; color: #22543d; margin-bottom: 5px;">
                RM ${rental.grandTotal}
              </div>
              <div style="color: #4a5568; font-size: 14px;">
                ${rental.totalDays} day${rental.totalDays > 1 ? 's' : ''} rental
              </div>
            </div>
          </div>

          <!-- Customer Information -->
          <div style="background: #f7fafc; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
            <h3 style="color: #2d3748; margin: 0 0 20px 0; font-size: 18px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">
              👤 Customer Details
            </h3>
            
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #4a5568; width: 120px;">Name:</td>
                <td style="padding: 8px 0; color: #2d3748; font-weight: bold;">${customer.fullName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #4a5568;">Email:</td>
                <td style="padding: 8px 0; color: #2d3748;">
                  <a href="mailto:${customer.email}" style="color: #3182ce; text-decoration: none;">
                    ${customer.email}
                  </a>
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #4a5568;">Phone:</td>
                <td style="padding: 8px 0; color: #2d3748;">
                  <a href="tel:${customer.phone}" style="color: #3182ce; text-decoration: none;">
                    ${customer.phone}
                  </a>
                </td>
              </tr>
            </table>
          </div>

          <!-- Vehicle & Rental Information -->
          <div style="background: #f7fafc; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
            <h3 style="color: #2d3748; margin: 0 0 20px 0; font-size: 18px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">
              🚙 Vehicle & Rental Details
            </h3>
            
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #4a5568; width: 140px;">Vehicle:</td>
                <td style="padding: 8px 0; color: #2d3748; font-weight: bold;">${rental.vehicle}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #4a5568;">Color:</td>
                <td style="padding: 8px 0; color: #2d3748;">${rental.color}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #4a5568;">Start Date:</td>
                <td style="padding: 8px 0; color: #2d3748; font-weight: bold;">${startDate}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #4a5568;">End Date:</td>
                <td style="padding: 8px 0; color: #2d3748; font-weight: bold;">${endDate}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #4a5568;">Duration:</td>
                <td style="padding: 8px 0; color: #2d3748;">${rental.totalDays} day${rental.totalDays > 1 ? 's' : ''}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #4a5568;">Mileage Limit:</td>
                <td style="padding: 8px 0; color: #2d3748;">${rental.mileageLimit} KM</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #4a5568;">Fuel Level:</td>
                <td style="padding: 8px 0; color: #2d3748;">${rental.fuelLevel}/8</td>
              </tr>
            </table>
          </div>

          <!-- Pricing Breakdown -->
          <div style="background: #fff5f5; border: 1px solid #fed7d7; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
            <h3 style="color: #c53030; margin: 0 0 15px 0; font-size: 16px;">💵 Pricing Breakdown</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 5px 0; color: #4a5568;">Rental per day:</td>
                <td style="padding: 5px 0; color: #2d3748; text-align: right;">RM ${rental.rentalPerDay}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0; color: #4a5568;">Deposit:</td>
                <td style="padding: 5px 0; color: #2d3748; text-align: right;">RM ${rental.deposit}</td>
              </tr>
              ${rental.discount !== "0" ? `
              <tr>
                <td style="padding: 5px 0; color: #4a5568;">Discount:</td>
                <td style="padding: 5px 0; color: #38a169; text-align: right;">-RM ${rental.discount}</td>
              </tr>
              ` : ''}
              <tr style="border-top: 1px solid #e2e8f0;">
                <td style="padding: 10px 0 5px 0; color: #2d3748; font-weight: bold; font-size: 16px;">Total Amount:</td>
                <td style="padding: 10px 0 5px 0; color: #22543d; text-align: right; font-weight: bold; font-size: 18px;">RM ${rental.grandTotal}</td>
              </tr>
            </table>
          </div>

          <!-- Booking Information -->
          <div style="background: #edf2f7; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
            <h3 style="color: #2d3748; margin: 0 0 15px 0; font-size: 16px;">📅 Booking Information</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 5px 0; font-weight: bold; color: #4a5568; width: 120px;">Booking ID:</td>
                <td style="padding: 5px 0; color: #2d3748; font-weight: bold;">#${rental.id}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0; font-weight: bold; color: #4a5568;">Booked at:</td>
                <td style="padding: 5px 0; color: #2d3748;">${bookingTime}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0; font-weight: bold; color: #4a5568;">Payment Proof:</td>
                <td style="padding: 5px 0; color: #2d3748;">
                  ${rental.paymentProofUrl ? '✅ Uploaded' : '❌ Not uploaded'}
                </td>
              </tr>
              <tr>
                <td style="padding: 5px 0; font-weight: bold; color: #4a5568;">Customer Signature:</td>
                <td style="padding: 5px 0; color: #2d3748;">
                  ${rental.signatureUrl ? '✅ Signed' : '❌ Not signed'}
                </td>
              </tr>
            </table>
          </div>

          <!-- Action Buttons -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="#" style="background: #3182ce; color: white; padding: 12px 25px; border-radius: 6px; text-decoration: none; font-weight: bold; margin-right: 15px; margin-bottom: 10px; display: inline-block;">
              📋 View Booking Details
            </a>
            <a href="mailto:${customer.email}" style="background: #38a169; color: white; padding: 12px 25px; border-radius: 6px; text-decoration: none; font-weight: bold; margin-right: 15px; margin-bottom: 10px; display: inline-block;">
              ✉️ Contact Customer
            </a>
            <a href="tel:${customer.phone}" style="background: #ed8936; color: white; padding: 12px 25px; border-radius: 6px; text-decoration: none; font-weight: bold; margin-bottom: 10px; display: inline-block;">
              📞 Call Customer
            </a>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background: #2d3748; color: #a0aec0; text-align: center; padding: 20px;">
          <p style="margin: 0; font-size: 12px;">
            Reimagined Rentalz - Admin Notification System<br>
            This is an automated notification. Please do not reply to this email.
          </p>
        </div>
      </div>
    `;
  }
}

export const adminNotificationService = new AdminNotificationService();