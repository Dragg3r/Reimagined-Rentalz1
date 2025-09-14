import fetch from 'node-fetch';
import fs from 'fs';
import FormData from 'form-data';

export class WhatsAppService {
  private baseUrl: string;
  private token: string;

  constructor() {
    this.baseUrl = process.env.WHATSAPP_BASE_URL || 'https://api.whatsapp.com/send';
    this.token = process.env.WHATSAPP_TOKEN || '';
  }

  // Method to send document via WhatsApp Business API
  async sendDocument(phoneNumber: string, documentPath: string, customerName: string, rentalDetails: any, pdfUrl?: string) {
    try {
      // For now, we'll use the web WhatsApp approach with pre-filled message
      const message = this.createWhatsAppMessage(customerName, rentalDetails, pdfUrl);
      const whatsappUrl = this.generateWhatsAppUrl(phoneNumber, message);
      
      return {
        success: true,
        url: whatsappUrl,
        message: 'WhatsApp link generated successfully'
      };
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      throw error;
    }
  }

  private createWhatsAppMessage(customerName: string, rentalDetails: any, pdfUrl?: string): string {
    // Robust base URL resolution with proper fallbacks
    const baseUrl = process.env.APP_BASE_URL || 
                   process.env.REPLIT_APP_URL || 
                   (process.env.REPL_SLUG && process.env.REPL_OWNER ? 
                     `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.replit.app` : null) ||
                   (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
                   process.env.RENDER_EXTERNAL_URL ||
                   'http://localhost:5000';
    
    // Remove trailing slash and handle absolute vs relative URLs
    const normalizedBaseUrl = baseUrl.replace(/\/$/, '');
    
    let fullPdfUrl = '';
    if (pdfUrl) {
      if (pdfUrl.startsWith('http://') || pdfUrl.startsWith('https://')) {
        // Already absolute URL, use as-is
        fullPdfUrl = pdfUrl;
      } else {
        // Relative URL, ensure leading slash and concatenate
        const normalizedPath = pdfUrl.startsWith('/') ? pdfUrl : `/${pdfUrl}`;
        fullPdfUrl = `${normalizedBaseUrl}${normalizedPath}`;
      }
    }
    
    // Log resolved URLs in development for debugging
    if (process.env.NODE_ENV !== 'production') {
      console.log(`🔗 WhatsApp PDF URL resolved: ${fullPdfUrl}`);
    }
    
    return `Hello ${customerName}!

Your Reimagined Rentalz rental agreement is ready!

*Rental Details:*
Vehicle: ${rentalDetails.vehicle} - ${rentalDetails.color}
Period: ${new Date(rentalDetails.startDate).toLocaleDateString()} - ${new Date(rentalDetails.endDate).toLocaleDateString()}
Total: RM ${rentalDetails.grandTotal}

*Download your agreement here:*
${fullPdfUrl}

Please save this document for your records. If you have any questions, feel free to contact us.

Thank you for choosing Reimagined Rentalz!

--
Reimagined Rentalz Team`;
  }

  private generateWhatsAppUrl(phoneNumber: string, message: string): string {
    // Clean phone number (remove spaces, dashes, etc.)
    const cleanNumber = phoneNumber.replace(/[^\d+]/g, '');
    
    // Add Malaysia country code if not present
    const formattedNumber = cleanNumber.startsWith('+') 
      ? cleanNumber 
      : cleanNumber.startsWith('60') 
        ? `+${cleanNumber}` 
        : `+60${cleanNumber.replace(/^0/, '')}`;
    
    const encodedMessage = encodeURIComponent(message);
    return `https://wa.me/${formattedNumber.replace('+', '')}?text=${encodedMessage}`;
  }

  // Alternative method for WhatsApp Business API (if available)
  async sendDocumentViaAPI(phoneNumber: string, documentPath: string, customerName: string, rentalDetails: any) {
    if (!this.token || !process.env.WHATSAPP_PHONE_NUMBER_ID) {
      throw new Error('WhatsApp Business API not configured');
    }

    try {
      // First, upload the document
      const mediaId = await this.uploadMedia(documentPath);
      
      // Then send the document
      const response = await fetch(`${this.baseUrl}/v17.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: phoneNumber,
          type: 'document',
          document: {
            id: mediaId,
            caption: `Your Budget Plus Transport rental agreement - ${customerName}`,
            filename: `rental-agreement-${customerName.replace(/\s+/g, '-')}.pdf`
          }
        })
      });

      const result = await response.json() as any;
      
      if (!response.ok) {
        throw new Error(`WhatsApp API error: ${result.error?.message || 'Unknown error'}`);
      }

      return {
        success: true,
        messageId: result.messages?.[0]?.id,
        message: 'Document sent successfully via WhatsApp'
      };

    } catch (error) {
      console.error('Error sending document via WhatsApp API:', error);
      throw error;
    }
  }

  private async uploadMedia(filePath: string): Promise<string> {
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));
    formData.append('type', 'application/pdf');
    formData.append('messaging_product', 'whatsapp');

    const response = await fetch(`${this.baseUrl}/v17.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/media`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
      body: formData
    });

    const result = await response.json() as any;
    
    if (!response.ok) {
      throw new Error(`Media upload failed: ${result.error?.message || 'Unknown error'}`);
    }

    return result.id;
  }
}

export const whatsappService = new WhatsAppService();