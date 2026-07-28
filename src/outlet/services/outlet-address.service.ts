import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { FindOptions, Transaction } from 'sequelize';
import { getNextCopyName } from 'src/common/helpers/copy-name.helper';
import { OutletAddress } from '../models/outlet-address.model';
import { CreateOutletAddressDto } from '../dtos/create-outlet-address-dto';
import { Area } from 'src/area/models/area.model';
import { Neighbourhood } from 'src/neighbourhood/models/neighbourhood.model';
import { CustomPinoLogger } from 'src/logger/custom-logger.service';

@Injectable()
export class OutletAddressService {
  private readonly serviceName = 'OutletAddressService';
  constructor(
    @InjectModel(OutletAddress)
    private readonly outletAddressModel: typeof OutletAddress,
    private readonly logger: CustomPinoLogger
  ) {}

  async insert(
    outlet_id: string,
    addressDto: CreateOutletAddressDto,
    transaction: Transaction,
    userId: string
  ): Promise<OutletAddress> {
    await this.update_inactive(outlet_id, transaction, userId);
    return await this.outletAddressModel.create(
      {
        outletId: outlet_id,
        googlePlaceId: addressDto?.googlePlaceId?.trim(),
        mapUrl: addressDto?.mapUrl?.trim(),
        latitude: addressDto?.latitude,
        longitude: addressDto?.longitude,
        formattedAddress: addressDto?.formattedAddress?.trim(),
        formattedAddressAr: addressDto?.formattedAddressAr?.trim() ?? addressDto?.formattedAddress?.trim(),
        areaId: addressDto?.cityId,
        neighbourhoodId: addressDto?.neighbourhoodId,
        location: addressDto?.location,
        locationAr: addressDto?.locationAr ?? addressDto?.location,
        isActive: true,
        updatedBy: userId,
      },
      { transaction }
    );
  }

  async cloneAddress(
    outlet_id: string,
    transaction: Transaction,
    userId: string,
    existingOutletId: string
  ): Promise<OutletAddress> {
    const methodName = 'cloneAddress';
    this.logger.info(`${this.serviceName}.${methodName} - starts`, { outlet_id, userId, existingOutletId });
    try {
      await this.update_inactive(outlet_id, transaction, userId);

      const existingAddress = await this.outletAddressModel.findOne({
        where: { outletId: existingOutletId, isActive: true },
        raw: true,
      });

      const address = await this.outletAddressModel.create(
        {
          outletId: outlet_id,
          googlePlaceId: existingAddress?.googlePlaceId ?? null,
          mapUrl: existingAddress?.mapUrl,
          latitude: null,
          longitude: null,
          formattedAddress: null,
          formattedAddressAr: null,
          areaId: existingAddress?.areaId,
          neighbourhoodId: existingAddress?.neighbourhoodId,
          location: getNextCopyName(existingAddress?.location ?? ''),
          locationAr: getNextCopyName(existingAddress?.locationAr ?? existingAddress?.location ?? ''),
          isActive: existingAddress?.isActive,
          updatedBy: userId,
        },
        { transaction }
      );
      this.logger.info(`${this.serviceName}.${methodName} - completed`, { outlet_id, userId, existingOutletId });
      return address;
    } catch (error) {
      this.logger.error(`${this.serviceName}.${methodName} - exception`, { error });
      throw new HttpException(
        error?.response?.data?.message ?? error?.message ?? 'Error in cloning outlet address',
        error?.response?.status ?? error?.status ?? HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async update_inactive(outlet_id: string, transaction: Transaction, userId: string) {
    const [, [updatedUser]] = await this.outletAddressModel.update(
      { isActive: false, updatedBy: userId },
      {
        where: { outletId: outlet_id },
        returning: true,
        transaction: transaction,
      }
    );
    return updatedUser;
  }

  find(outlet_id: string): Promise<OutletAddress> {
    const userOptions: FindOptions<OutletAddress> = {
      where: {
        outletId: outlet_id,
        isActive: true,
      },
      include: [
        {
          model: Neighbourhood,
          include: [
            {
              model: Area,
            },
          ],
        },
      ],
    };
    return this.outletAddressModel.findOne(userOptions);
  }
  async getOutletLocation(outletId: string): Promise<OutletAddress> {
    return await this.outletAddressModel.findOne({
      where: {
        outletId: outletId,
        isActive: true,
      },
      attributes: ['location', 'outletId'],
    });
  }
}
