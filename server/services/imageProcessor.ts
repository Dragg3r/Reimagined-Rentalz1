import sharp from "sharp";
import path from "path";
import fs from "fs/promises";
import { ObjectStorageService } from "../objectStorage";

export class ImageProcessor {
  private uploadsDir = path.join(process.cwd(), "app", "uploads");
  private backupsDir = path.join(process.cwd(), "app", "backups");
  private objectStorageService = new ObjectStorageService();

  constructor() {
    this.ensureDirectories();
  }

  private async ensureDirectories() {
    try {
      await fs.mkdir(this.uploadsDir, { recursive: true });
      await fs.mkdir(this.backupsDir, { recursive: true });
    } catch (error) {
      console.error("Error creating directories:", error);
    }
  }

  async processAndWatermarkImage(buffer: Buffer, filename: string): Promise<string> {
    console.log('Processing image:', filename);
    console.log('Buffer size:', buffer.length);

    try {
      // Process the image with proper watermark handling
      console.log('Resizing and converting to JPEG...');
      const processedImage = await sharp(buffer)
        .resize(1200, 1200, { 
          fit: 'inside',
          withoutEnlargement: true 
        })
        .jpeg({ quality: 92 })
        .toBuffer();

      console.log('Processed image size:', processedImage.length);

      // Get the exact dimensions of the processed image
      const { width, height } = await sharp(processedImage).metadata();
      console.log('Image dimensions:', { width, height });
      
      let finalBuffer: Buffer;
      
      if (width && height) {
        // Create a watermark that matches the exact dimensions
        const watermarkSvg = `
          <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
            <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" 
                  font-family="Arial, sans-serif" font-size="24" font-weight="bold" 
                  fill="rgba(255,255,255,0.7)" opacity="0.8" 
                  transform="rotate(-45 ${width/2} ${height/2})">
              REIMAGINED RENTALZ
            </text>
          </svg>
        `;

        console.log('Applying watermark...');
        // Apply watermark to the processed image
        finalBuffer = await sharp(processedImage)
          .composite([{
            input: Buffer.from(watermarkSvg),
            blend: 'overlay'
          }])
          .jpeg({ quality: 92 })
          .toBuffer();
      } else {
        console.log('Dimensions not available, using without watermark...');
        finalBuffer = processedImage;
      }

      // Save to object storage FIRST (permanent), then local (temporary backup)
      console.log('Saving to permanent storage...');
      const timestamp = Date.now();
      const processedFilename = `processed_${timestamp}_${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      
      // PRIMARY: Save to object storage (permanent)
      try {
        const objectStorageUrl = await this.objectStorageService.uploadFile(
          finalBuffer,
          processedFilename,
          'image/jpeg'
        );
        console.log('✅ File saved to PERMANENT object storage:', objectStorageUrl);
        
        // SECONDARY: Also save locally as backup
        try {
          const localFilePath = path.join(this.uploadsDir, processedFilename);
          await fs.writeFile(localFilePath, finalBuffer);
          console.log('✅ Backup saved to local storage:', localFilePath);
        } catch (localError) {
          console.warn('⚠️ Local backup failed (object storage succeeded):', localError.message);
        }
        
        return `/uploads/${processedFilename}`;
      } catch (objectError) {
        console.error('❌ Object storage failed, falling back to local only:', objectError.message);
        // Fallback to local storage if object storage fails
        const localFilePath = path.join(this.uploadsDir, processedFilename);
        await fs.writeFile(localFilePath, finalBuffer);
        console.log('⚠️ Saved to local storage only (temporary):', localFilePath);
        return `/uploads/${processedFilename}`;
      }
    } catch (error) {
      console.error('Error processing image:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      
      try {
        // Fallback: save original image without processing if there's an error
        console.log('Attempting fallback upload...');
        const fallbackBuffer = await sharp(buffer)
          .resize(1200, 1200, { 
            fit: 'inside',
            withoutEnlargement: true 
          })
          .jpeg({ quality: 92 })
          .toBuffer();
        
        const timestamp = Date.now();
        const fallbackFilename = `fallback_${timestamp}_${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const fallbackPath = path.join(this.uploadsDir, fallbackFilename);
        
        // Save fallback to object storage FIRST
        try {
          await this.objectStorageService.uploadFile(fallbackBuffer, fallbackFilename, 'image/jpeg');
          console.log('✅ Fallback saved to PERMANENT object storage');
        } catch (objectError) {
          console.error('❌ Failed to save fallback to object storage:', objectError.message);
        }
        
        // Also save locally as backup
        await fs.writeFile(fallbackPath, fallbackBuffer);
        console.log('✅ Fallback saved to local storage:', fallbackPath);
        
        return `/uploads/${fallbackFilename}`;
      } catch (fallbackError) {
        console.error('Fallback upload also failed:', fallbackError);
        throw new Error(`Image processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  async processSignature(dataUrl: string, filename: string): Promise<string> {
    const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, 'base64');
    
    const processedBuffer = await sharp(buffer)
      .png()
      .toBuffer();

    // Save to object storage FIRST (permanent)
    const timestamp = Date.now();
    const signatureFilename = `signature_${timestamp}_${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    
    // PRIMARY: Save to object storage
    try {
      await this.objectStorageService.uploadFile(processedBuffer, signatureFilename, 'image/png');
      console.log('✅ Signature saved to PERMANENT object storage');
    } catch (objectError) {
      console.error('❌ Failed to save signature to object storage:', objectError.message);
    }
    
    // SECONDARY: Save locally as backup
    const filePath = path.join(this.uploadsDir, signatureFilename);
    await fs.writeFile(filePath, processedBuffer);
    console.log('✅ Signature backup saved locally:', filePath);
    
    return `/uploads/${signatureFilename}`;
  }

  async processVehiclePhoto(buffer: Buffer, filename: string): Promise<string> {
    // Process with 4:3 aspect ratio (800x600) with high quality optimization
    const processedBuffer = await sharp(buffer)
      .resize(800, 600, { 
        fit: 'cover', // Ensures exact 4:3 ratio by cropping if necessary
        position: 'center'
      })
      .jpeg({ 
        quality: 92,  // Higher quality for vehicle photos
        progressive: true,
        mozjpeg: true // Better compression
      })
      .toBuffer();

    // Save to object storage FIRST (permanent)  
    const timestamp = Date.now();
    const vehicleFilename = `vehicle_${timestamp}_${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    
    // PRIMARY: Save to object storage
    try {
      await this.objectStorageService.uploadFile(processedBuffer, vehicleFilename, 'image/jpeg');
      console.log('✅ Vehicle photo saved to PERMANENT object storage');
    } catch (objectError) {
      console.error('❌ Failed to save vehicle photo to object storage:', objectError.message);
    }
    
    // SECONDARY: Save locally as backup
    const filePath = path.join(this.uploadsDir, vehicleFilename);
    await fs.writeFile(filePath, processedBuffer);
    console.log('✅ Vehicle photo backup saved locally:', filePath);
    
    return `/uploads/${vehicleFilename}`;
  }
}

export const imageProcessor = new ImageProcessor();
