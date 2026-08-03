import { Injectable } from '@nestjs/common';
import axios from 'axios';
import * as FormData from 'form-data';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class LlmImageOptimizationProxy {
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('OUTLET_IMAGES_SERVICE_URL');
  }

  async proxyImageToImagesService(fileBuffer: Buffer, filename: string, profileId?: string): Promise<Buffer> {
    const formData = new FormData();
    formData.append('image', fileBuffer, { filename });

    if (profileId) {
      formData.append('profileId', profileId);
    }

    try {
      const response = await axios.post(`${this.baseUrl}/v1/files/optimize-image-buffer`, formData, {
        headers: {
          ...formData.getHeaders(),
        },
        responseType: 'arraybuffer',
      });

      return Buffer.from(response.data);
    } catch (error) {
      const errorMsg = error.response?.data?.toString() || error.message;
      console.error('LLM Proxy Error from images-service:', errorMsg);
      throw new Error(`LLM Proxy failed: ${errorMsg}`);
    }
  }
}
