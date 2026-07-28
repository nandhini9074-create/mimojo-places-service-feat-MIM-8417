import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { MerchantProfileFilter } from '../entities/merchant-profile-filters.model';
import { MerchantProfileMetadataDto } from 'src/merchant-profile/dtos/create-merchant-profile-data.dto';
import { Transaction } from 'sequelize';
import { CustomPinoLogger } from 'src/logger/custom-logger.service';

@Injectable()
export class MerchantProfileFiltersService {
  constructor(
    @InjectModel(MerchantProfileFilter)
    private readonly merchantProfileFilterModel: typeof MerchantProfileFilter,
    private readonly logger: CustomPinoLogger
  ) {}

  async updateMerchantProfileFilters(
    dto: MerchantProfileMetadataDto,
    merchantProfileMetadataId: string,
    updatedBy: string,
    transaction: Transaction
  ) {
    try {
      this.logger.info(
        `MerchantProfileFiltersService.updateMerchantProfileFilters called with merchant profile id ${merchantProfileMetadataId} `
      );
      const merchantProfileFilters = [];
      await this.merchantProfileFilterModel.destroy({
        where: { merchantProfileMetadataId },
        transaction,
      });
      if (dto.filterIds?.length) {
        merchantProfileFilters.push(
          ...dto.filterIds.map(filterId => ({
            merchantProfileMetadataId: merchantProfileMetadataId,
            filterId,
            included: true,
            updatedBy: updatedBy,
          }))
        );
      }
      if (dto.excludedFilterIds?.length) {
        merchantProfileFilters.push(
          ...dto.excludedFilterIds.map(filterId => ({
            merchantProfileMetadataId: merchantProfileMetadataId,
            filterId,
            included: false,
            updatedBy: updatedBy,
          }))
        );
      }
      if (!merchantProfileFilters?.length) return;
      return await this.merchantProfileFilterModel.bulkCreate(merchantProfileFilters, { transaction });
    } catch (error) {
      this.logger.error('MerchantProfileFiltersService.updateMerchantProfileFilters failed', { error });
      throw new HttpException('Failed to update the filter details', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
