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
    }
  }

  isConfigured(): boolean {
    return this.config !== null;
  }

  async uploadImage(file: File, folder: string = 'cars-g'): Promise<UploadResult> {
    if (!this.config) {
      throw new Error('Cloudinary is not configured');
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', this.uploadPreset);
    formData.append('folder', folder);

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${this.config.cloudName}/image/upload`,
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
      throw new Error('Failed to upload image to Cloudinary');
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