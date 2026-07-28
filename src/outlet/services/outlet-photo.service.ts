import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { FindOptions, Transaction } from 'sequelize';
import { OutletPhoto } from '../models/outlet-photo.model';
import { ChangeImageOrderDto } from 'src/images/dtos/change-image-order-dto';
import { CustomPinoLogger } from 'src/logger/custom-logger.service';
import { DataOperationsProducer } from 'src/kafka-services/data-operations.producer';
import { EnvKeysEnum } from 'src/discovery/constants/outlet-profile-imports';

@Injectable()
export class OutletPhotoService {
  private readonly serviceName = 'OutletPhotoService';
  constructor(
    @InjectModel(OutletPhoto)
    private readonly outletPhotoModel: typeof OutletPhoto,
    private readonly logger: CustomPinoLogger,
    private readonly dataOperationsProducer: DataOperationsProducer
  ) {}

  find(outlet_id: string): Promise<OutletPhoto[]> {
    const userOptions: FindOptions<OutletPhoto> = {
      where: {
        outletId: outlet_id,
        isActive: true,
      },
    };
    return this.outletPhotoModel.findAll(userOptions);
  }

  findDefault(outlet_id: string): Promise<OutletPhoto> {
    console.log('photo.outlet_id', outlet_id);
    const userOptions: FindOptions<OutletPhoto> = {
      where: {
        outletId: outlet_id,
        isActive: true,
        isDefault: true,
      },
    };
    return this.outletPhotoModel.findOne(userOptions);
  }

  async updateDefaultImage(outlet_photo_id: string) {
    const outletPhoto = await this.outletPhotoModel.findByPk(outlet_photo_id);
    if (outletPhoto === null || outletPhoto === undefined) {
      throw new NotFoundException(`OutletPhoto with id ${outlet_photo_id} not found`);
    }
    await this.outletPhotoModel.update(
      { isDefault: false },
      {
        where: { outletId: outletPhoto.outletId },
        returning: true,
      }
    );

    const [, [updatedOutletPhoto]] = await this.outletPhotoModel.update(
      { isDefault: true },
      {
        where: { outletPhotoId: outlet_photo_id },
        returning: true,
      }
    );
    return updatedOutletPhoto;
  }

  async deleteImage(outlet_photo_id: string) {
    const rowsDeleted = await this.outletPhotoModel.destroy({
      where: { outletPhotoId: outlet_photo_id },
    });

    if (rowsDeleted === 0) {
      throw new NotFoundException(`OutletPhoto with id ${outlet_photo_id} not found`);
    }
    return rowsDeleted;
  }

  async changeImageOrder(orderData: ChangeImageOrderDto) {
    for (const image of orderData.orderData) {
      await this.outletPhotoModel.update({ sortOrder: image.sortOrder }, { where: { outletPhotoId: image.outletPhotoId } });
    }
  }

  async deselectDefaultImage(outletId: string): Promise<number> {
    const [updatedCount] = await this.outletPhotoModel.update(
      { isDefault: false },
      {
        where: { outletId, isDefault: true },
      }
    );
    return updatedCount;
  }

  async cloneOutletPhotos(oldOutletId: string, newOutletId: string, transaction: Transaction) {
    const methodName = 'cloneOutletPhotos';
    this.logger.info(`${this.serviceName} - ${methodName} - starts`, { oldOutletId, newOutletId });
    try {
      const outletPhotos = await this.outletPhotoModel.findAll({ where: { outletId: oldOutletId }, raw: true, transaction });
      const clonedPhotos = outletPhotos.map(photo => {
        const rawPhoto = photo as unknown as Record<string, unknown>;
        const { outletPhotoId, createdAt, updatedAt, ...photoData } = rawPhoto;
        return {
          ...photoData,
          outletId: newOutletId,
          outlet_id: newOutletId,
        };
      });
      const outletClonedPhotos = await this.outletPhotoModel.bulkCreate(clonedPhotos, { transaction });
      const photoHasHeroImage = outletClonedPhotos.find(photo => photo.isDefault === true);
      if (photoHasHeroImage) {
        this.logger.info(`${this.serviceName} - ${methodName} - hero image found, Pushing to audit log`, {
          oldOutletId,
          newOutletId,
        });
        // Audit Log : node_name = Hero Image
        this.dataOperationsProducer.pushToAuditLogService(
          'mimojo-places-service',
          {
            status: 'COMPLETED',
            values: photoHasHeroImage,
          },
          {
            audit_main_node_configuration_id: process.env[EnvKeysEnum.AUDIT_LOG_NODE_HERO_IMAGE],
          }
        );
      }
      this.logger.info(`${this.serviceName} - ${methodName} - completed successfully`, { oldOutletId, newOutletId });
    } catch (error) {
      this.logger.error(`${this.serviceName} - ${methodName} - failed`, { oldOutletId, newOutletId, error });
      throw error;
    }
  }
}
