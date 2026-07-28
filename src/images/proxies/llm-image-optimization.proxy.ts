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

  async proxyImageToImagesService(fileBuffer: Buffer, filename: string): Promise<Buffer> {
    const formData = new FormData();
    formData.append('image', fileBuffer, { filename });

    const response = await axios.post(
      `${this.baseUrl}/files/optimize-image-buffer`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
        },
        responseType: 'arraybuffer',
      }
    );

    return Buffer.from(response.data);
  }
}

