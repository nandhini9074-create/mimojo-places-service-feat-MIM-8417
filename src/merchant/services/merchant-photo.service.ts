import { InjectModel } from '@nestjs/sequelize';
import { MerchantPhoto } from '../entities/merchant-photo.model';
import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorMessages } from 'src/errors/error-messages';
import { CustomPinoLogger } from 'src/logger/custom-logger.service';

export class MerchantPhotoService {
  constructor(
    @InjectModel(MerchantPhoto) private readonly merchantPhotoModel: typeof MerchantPhoto,
    private readonly logger: CustomPinoLogger
  ) {}

  async deleteMerchantPhotoById(photoId): Promise<{ deleted: boolean }> {
    try {
      const merchantPhoto = await this.merchantPhotoModel.findByPk(photoId);

      if (!merchantPhoto) {
        throw new HttpException(ErrorMessages.merchant.merchantPhoto.notFound, HttpStatus.NOT_FOUND);
      }
      await merchantPhoto.destroy();
      return { deleted: true };
    } catch (error) {
      this.logger.error('MerchantPhotoService.deleteMerchantPhotoById failed', { error });
      throw new HttpException(
        error?.response ?? 'Failed to delete merchant merchant photo ',
        error?.status ?? HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
  async getMerchantPhotos(merchantId: string): Promise<MerchantPhoto[]> {
    try {
      return await this.merchantPhotoModel.findAll({
        where: {
          merchantId: merchantId,
          isActive: true,
        },
        attributes: ['id', 'merchantId', 'cdnUrl', 'isDefault'],
      });
    } catch (error) {
      this.logger.error('MerchantProfileService.getMerchantProfilePhotos failed', { error });
      throw new HttpException('Failed to get merchant profile photos', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
