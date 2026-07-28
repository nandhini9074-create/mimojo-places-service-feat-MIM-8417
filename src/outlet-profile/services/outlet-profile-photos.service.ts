import { HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { OutletProfilePhotos } from '../entities/outlet-profile-photos';
import { OutletPhoto } from 'src/outlet/models/outlet-photo.model';
import { Transaction } from 'sequelize';
import { ChangeImageOrderDto } from 'src/images/dtos/change-image-order-dto';
import { CustomPinoLogger } from 'src/logger/custom-logger.service';

@Injectable()
export class OutletProfilePhotosService {
  private readonly serviceName = 'OutletProfilePhotosService';
  constructor(
    @InjectModel(OutletProfilePhotos) private readonly outletProfilePhotosModel: typeof OutletProfilePhotos,
    private readonly logger: CustomPinoLogger
  ) {}

  async getOutletProfilePhotos(outletProfileId: string) {
    try {
      return await this.outletProfilePhotosModel.findAll({
        where: {
          outletProfileMetadataId: outletProfileId,
          isActive: true,
          isDefault: false,
        },
      });
    } catch (error) {
      this.logger.error('OutletProfilePhotosService.getOutletProfilePhotos failed', { error });
      throw new HttpException('Failed to fetch the outlet profile photos', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
  async deleteOutletProfilePhoto(outletProfilePhotoId: string) {
    try {
      const deletedCount = await this.outletProfilePhotosModel.destroy({
        where: {
          id: outletProfilePhotoId,
        },
      });
      if (deletedCount === 0) throw new NotFoundException(`OutletProfilePhoto with id ${outletProfilePhotoId} not found`);
      return deletedCount;
    } catch (error) {
      throw new HttpException(
        error?.response ?? 'Failed to delete outlet profile photo',
        error?.status ?? HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
  async deleteOutletProfilePhotosByOutletProfileId(outletProfileId: string, transaction: Transaction) {
    return await this.outletProfilePhotosModel.destroy({
      where: {
        outletProfileMetadataId: outletProfileId,
      },
      transaction,
    });
  }
  async insertDefaultOutletImages(outletPhotos: OutletPhoto[], outletProfileId: string, transaction: Transaction) {
    const outletProfilePhotos = outletPhotos.map(outletPhoto => ({
      cdnUrl: outletPhoto.cdnUrl,
      sortOrder: outletPhoto.sortOrder,
      height: outletPhoto.height,
      width: outletPhoto.width,
      isActive: outletPhoto.isActive,
      isDefault: outletPhoto.isDefault,
      outletProfileMetadataId: outletProfileId,
    }));
    await this.outletProfilePhotosModel.bulkCreate(outletProfilePhotos, { transaction });
  }

  async cloneProfileOutletImages(
    existingOutletProfilePhotos: OutletProfilePhotos[],
    outletProfileId: string,
    transaction: Transaction
  ) {
    this.logger.info(`${this.serviceName}.cloneProfileOutletImages - starts`);
    try {
      const outletProfilePhotos = existingOutletProfilePhotos.map(outletPhoto => ({
        cdnUrl: outletPhoto.cdnUrl,
        sortOrder: outletPhoto.sortOrder,
        height: outletPhoto.height,
        width: outletPhoto.width,
        isActive: outletPhoto.isActive,
        isDefault: outletPhoto.isDefault,
        outletProfileMetadataId: outletProfileId,
      }));
      await this.outletProfilePhotosModel.bulkCreate(outletProfilePhotos, { transaction });
      this.logger.info(`${this.serviceName}.cloneProfileOutletImages - completed`);
    } catch (error) {
      this.logger.error(`${this.serviceName}.cloneProfileOutletImages - exception`, { error });
      throw error;
    }
  }

  async changeImageOrder(orderData: ChangeImageOrderDto) {
    try {
      const updatePromises = orderData.orderData.map(image =>
        this.outletProfilePhotosModel.update({ sortOrder: image.sortOrder }, { where: { id: image.outletPhotoId } })
      );
      await Promise.all(updatePromises);
    } catch (error) {
      throw new HttpException('Failed to change image order ', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
