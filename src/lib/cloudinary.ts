// Cloudinary configuration and utilities
export interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

export interface UploadResult {
  publicId: string;
  url: string;
  secureUrl: string;
  width: number;
  height: number;
  format: string;
  resourceType: string;
}

class CloudinaryService {
  private config: CloudinaryConfig | null = null;
  private uploadPreset: string = 'ml_default';

  constructor() {
    // Cloudinary config will be set via environment variables
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const apiKey = import.meta.env.VITE_CLOUDINARY_API_KEY;
    
    if (cloudName && apiKey) {
      this.config = {
        cloudName,
        apiKey,
        apiSecret: import.meta.env.VITE_CLOUDINARY_API_SECRET || '',
      };
      
      // Use custom upload preset if provided, otherwise try common presets
      const customPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
      if (customPreset) {
        this.uploadPreset = customPreset;
      } else {
        // Try to find a working upload preset
        this.uploadPreset = 'ml_default';
        console.warn('No upload preset specified. Using default "ml_default". If uploads fail, please create a custom upload preset in your Cloudinary dashboard.');
      }
    }
  }

  isConfigured(): boolean {
    return this.config !== null;
  }

  // Add method to validate configuration and test upload preset
  async validateConfiguration(): Promise<{ isValid: boolean; error?: string }> {
    if (!this.config) {
      return { isValid: false, error: 'Cloudinary is not configured' };
    }

    // Test if the upload preset is working by attempting a minimal upload
    try {
      // Create a minimal test file (1x1 transparent PNG)
      const testImageData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
      const response = await fetch(testImageData);
      const blob = await response.blob();
      const testFile = new File([blob], 'test.png', { type: 'image/png' });

      // Try to upload the test file
      await this.uploadImage(testFile, 'test');
      
      return { isValid: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Provide specific guidance based on error type
      if (errorMessage.includes('400') || errorMessage.includes('Bad Request')) {
        return { 
          isValid: false, 
          error: `Upload preset '${this.uploadPreset}' is not working. Please check your Cloudinary dashboard and ensure the upload preset is configured correctly. You may need to create a new upload preset or use an existing one.` 
        };
      }
      
      return { isValid: false, error: errorMessage };
    }
  }

  // Helper method to get upload preset creation instructions
  getUploadPresetInstructions(): string {
    return `
To fix Cloudinary upload issues, you need to create an upload preset:

1. Go to your Cloudinary Dashboard: https://cloudinary.com/console
2. Navigate to Settings > Upload
3. Scroll down to "Upload presets"
4. Click "Add upload preset"
5. Configure the preset:
   - Name: Choose a name (e.g., "cars-g-uploads")
   - Signing Mode: "Unsigned" (for client-side uploads)
   - Folder: "cars-g" (optional)
   - Allowed formats: "jpg, png, gif, webp"
   - Max file size: 10MB
6. Save the preset
7. Update your .env file:
   VITE_CLOUDINARY_UPLOAD_PRESET=your_preset_name

Current upload preset: ${this.uploadPreset}
    `.trim();
  }

  // Method to try alternative upload presets
  private async tryAlternativePresets(file: File, folder: string): Promise<UploadResult> {
    const alternativePresets = ['cars-g-uploads', 'cars-g', 'ml_default', 'general'];
    
    for (const preset of alternativePresets) {
      if (preset === this.uploadPreset) continue; // Skip current preset
      
      try {
        console.log(`Trying alternative upload preset: ${preset}`);
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', preset);
        formData.append('folder', folder);

        const response = await fetch(
          `https://api.cloudinary.com/v1_1/${this.config!.cloudName}/image/upload`,
          {
            method: 'POST',
            body: formData,
          }
        );

        if (response.ok) {
          const result = await response.json();
          console.log(`✅ Alternative preset "${preset}" worked!`);
          
          // Update the current preset to the working one
          this.uploadPreset = preset;
          
          return {
            publicId: result.public_id,
            url: result.url,
            secureUrl: result.secure_url,
            width: result.width,
            height: result.height,
            format: result.format,
            resourceType: result.resource_type,
          };
        }
      } catch (error) {
        console.log(`❌ Alternative preset "${preset}" failed:`, error);
        continue;
      }
    }
    
    throw new Error('All upload presets failed. Please create a custom upload preset in your Cloudinary dashboard.');
  }

  async uploadImage(file: File, folder: string = 'cars-g'): Promise<UploadResult> {
    if (!this.config) {
      throw new Error('Cloudinary is not configured');
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', this.uploadPreset);
    formData.append('folder', folder);

    // Log upload attempt for debugging
    console.log('Attempting Cloudinary upload:', {
      cloudName: this.config.cloudName,
      uploadPreset: this.uploadPreset,
      folder,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    });

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${this.config.cloudName}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        // Get detailed error information
        let errorDetails = '';
        try {
          const errorResponse = await response.json();
          errorDetails = errorResponse.error?.message || errorResponse.error || JSON.stringify(errorResponse);
        } catch (parseError) {
          errorDetails = response.statusText;
        }
        
        console.error('Cloudinary upload failed:', {
          status: response.status,
          statusText: response.statusText,
          errorDetails,
          cloudName: this.config.cloudName,
          uploadPreset: this.uploadPreset
        });
        
        // If it's a 400 error, try alternative presets
        if (response.status === 400) {
          console.log('🔄 Trying alternative upload presets...');
          try {
            return await this.tryAlternativePresets(file, folder);
          } catch (fallbackError) {
            console.error('All alternative presets failed:', fallbackError);
            throw new Error(`Upload failed: ${response.status} ${response.statusText} - ${errorDetails}. ${fallbackError instanceof Error ? fallbackError.message : ''}`);
          }
        }
        
        throw new Error(`Upload failed: ${response.status} ${response.statusText} - ${errorDetails}`);
      }

      const result = await response.json();
      
      console.log('Cloudinary upload successful:', {
        publicId: result.public_id,
        url: result.url,
        secureUrl: result.secure_url
      });
      
      return {
        publicId: result.public_id,
        url: result.url,
        secureUrl: result.secure_url,
        width: result.width,
        height: result.height,
        format: result.format,
        resourceType: result.resource_type,
      };
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      throw new Error(`Failed to upload image to Cloudinary: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async uploadVideo(file: File, folder: string = 'cars-g/videos'): Promise<UploadResult> {
    if (!this.config) {
      throw new Error('Cloudinary is not configured');
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', this.uploadPreset);
    formData.append('folder', folder);
    formData.append('resource_type', 'video');

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${this.config.cloudName}/video/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      return {
        publicId: result.public_id,
        url: result.url,
        secureUrl: result.secure_url,
        width: result.width,
        height: result.height,
        format: result.format,
        resourceType: result.resource_type,
      };
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      throw new Error('Failed to upload video to Cloudinary');
    }
  }

  getOptimizedUrl(publicId: string, options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'auto' | 'webp' | 'jpg' | 'png';
  } = {}): string {
    if (!this.config) {
      throw new Error('Cloudinary is not configured');
    }

    const { width, height, quality = 80, format = 'auto' } = options;
    let url = `https://res.cloudinary.com/${this.config.cloudName}/image/upload`;

    // Add transformations
    const transformations = [];
    if (width) transformations.push(`w_${width}`);
    if (height) transformations.push(`h_${height}`);
    transformations.push(`q_${quality}`);
    transformations.push(`f_${format}`);

    if (transformations.length > 0) {
      url += `/${transformations.join(',')}`;
    }

    return `${url}/${publicId}`;
  }

  async deleteResource(publicId: string, resourceType: 'image' | 'video' = 'image'): Promise<void> {
    if (!this.config) {
      throw new Error('Cloudinary is not configured');
    }

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${this.config.cloudName}/${resourceType}/destroy`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            public_id: publicId,
            api_key: this.config.apiKey,
            signature: this.generateSignature(publicId),
            timestamp: Math.floor(Date.now() / 1000),
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Delete failed: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Cloudinary delete error:', error);
      throw new Error('Failed to delete resource from Cloudinary');
    }
  }

  private generateSignature(publicId: string): string {
    // This is a simplified signature generation
    // In production, you should implement proper signature generation
    const timestamp = Math.floor(Date.now() / 1000);
    const params = `public_id=${publicId}&timestamp=${timestamp}`;
    
    // Note: In a real implementation, you'd use crypto to generate the signature
    // This is just a placeholder
    return btoa(params);
  }
}

// Export singleton instance
export const cloudinary = new CloudinaryService(); 