import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { IInternalApiConfig } from 'config/interface';

@Injectable()
export class UploadOutletImageProxy {
  private uploadOutletImageUrl: string;

  constructor(private readonly configService: ConfigService) {
    const { UPLOAD_OUTLET_IMAGE } = this.configService.get<IInternalApiConfig>('internal-apis');
    this.uploadOutletImageUrl = UPLOAD_OUTLET_IMAGE;
  }

  async uploadOutletImageDirect(
    outletId: string,
    imageName: string,
    isDefault: boolean,
    token: Record<string, string | string[] | undefined>
  ) {
    console.log({
      outletId: outletId,
      imageName: imageName,
      isDefault: isDefault,
    });
    try {
      const config = {
        headers: {
          'Authorization': token.authorization,
          'x-device-id': token['x-device-id'],
        },
      };
      return await axios.post(
        this.uploadOutletImageUrl,
        {
          outletId: outletId,
          imageName: imageName,
          isDefault: isDefault,
        },
        config
      );
    } catch (err) {
      throw new InternalServerErrorException('Something went wrong during outlet image upload!', err);
    }
  }
}
