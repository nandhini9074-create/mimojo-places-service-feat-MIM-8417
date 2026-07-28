import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { OutletProfileFilters } from '../entities/outlet-profile-filters';
import { Op, Sequelize, Transaction } from 'sequelize';
import { OutletProfileFiltersDto } from '../dtos/outlet-profile-filter.dto';
import { CustomPinoLogger } from 'src/logger/custom-logger.service';

/** Mutation operations for outlet profile filters */
export interface IOutletProfileFilterMutationService {
  addOutletProfileFilters(
    filters: OutletProfileFiltersDto[],
    outletProfileId: string,
    transaction: Transaction,
    userId?: string
  ): Promise<void>;
  cloneOutletProfileFilters(
    filters: OutletProfileFilters[],
    outletProfileId: string,
    transaction: Transaction,
    userId?: string
  ): Promise<void>;
  handleOutletProfileNotCustomizedFiltersChange(
    filters: { filterId: string; MerchantProfileFilter?: { included?: boolean } }[],
    outletProfileIds: string[],
    userId: string,
    transaction: Transaction
  ): Promise<void>;
  deleteByOutletId(id: string, transaction: Transaction): Promise<void>;
  insertOnlyNotCustomized(outletProfileFilters: OutletProfileFilters[], transaction: Transaction): Promise<void>;
  deleteByOutletProfileIds(ids: string[], transaction: Transaction): Promise<void>;
  insertOutletProfileFilters(outletProfileFilters: OutletProfileFilters[], transaction: Transaction): Promise<unknown>;
}

/** Query operations for outlet profile filters */
export interface IOutletProfileFilterQueryService {
  hasOverrideFlag(outletProfileId: string): Promise<boolean>;
  getOutletIdsUsingOrOperation(filterIds: string[], included: boolean): Promise<string[]>;
  getOutletIdsUsingAndOperation(filterIds: string[], included: boolean): Promise<string[] | undefined>;
}

@Injectable()
export class OutletProfileFilterService implements IOutletProfileFilterMutationService, IOutletProfileFilterQueryService {
  constructor(
    @InjectModel(OutletProfileFilters) private readonly outletProfileFiltersModel: typeof OutletProfileFilters,
    private readonly logger: CustomPinoLogger
  ) {}
  async addOutletProfileFilters(
    filters: OutletProfileFiltersDto[],
    outletProfileId: string,
    transaction: Transaction,
    userId?: string
  ) {
    try {
      if (filters && filters.length) {
        let outletFilters = filters?.map(of => {
          return {
            outletProfileMetadataId: outletProfileId,
            filterId: of?.filter?.id ?? of.id,
            isCustomized: of?.isCustomized ?? false,
            included: of?.included != undefined ? of.included : true,
            updatedBy: userId,
          } as OutletProfileFilters;
        });
        await this.insertOutletProfileFilters(outletFilters, transaction);
      } else {
        await this.deleteByOutletProfileIds([outletProfileId], transaction);
      }
    } catch (error) {
      this.logger.error('OutletProfileFilterService.addOutletProfileFilters failed', { error });
      throw new HttpException('Failed to insert the outlet profile filters', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async cloneOutletProfileFilters(
    filters: OutletProfileFilters[],
    outletProfileId: string,
    transaction: Transaction,
    userId?: string
  ) {
    try {
      if (filters?.length) {
        let outletFilters = filters?.map(of => {
          return {
            outletProfileMetadataId: outletProfileId,
            filterId: of?.filterId,
            isCustomized: of?.isCustomized ?? false,
            included: of.included ?? true,
            updatedBy: userId,
          } as OutletProfileFilters;
        });
        await this.insertOutletProfileFilters(outletFilters, transaction);
      }
    } catch (error) {
      this.logger.error('OutletProfileFilterService.cloneOutletProfileFilters failed', { error });
      throw error;
    }
  }

  async handleOutletProfileNotCustomizedFiltersChange(
    filters: { filterId: string; MerchantProfileFilter?: { included?: boolean } }[],
    outletProfileIds: string[],
    userId: string,
    transaction: Transaction
  ) {
    if (outletProfileIds?.length) {
      for (const outletProfileId of outletProfileIds) {
        let outletProfileFilters = filters.map(f => {
          return {
            outletProfileMetadataId: outletProfileId,
            filterId: f.filterId,
            isCustomized: false,
            included: f.MerchantProfileFilter?.included != undefined ? f.MerchantProfileFilter?.included : true,
            updatedBy: userId,
          } as OutletProfileFilters;
        });

        if (!(await this.hasOverrideFlag(outletProfileId))) {
          await this.deleteByOutletId(outletProfileId, transaction);
          await this.insertOnlyNotCustomized(outletProfileFilters, transaction);
        }
      }
    }
  }
  async hasOverrideFlag(outletProfileId: string) {
    const result = await this.outletProfileFiltersModel.findOne({
      where: {
        outletProfileMetadataId: outletProfileId,
        isCustomized: true,
      },
    });
    return result == null ? false : true;
  }
  async deleteByOutletId(id: string, transaction: Transaction) {
    await this.outletProfileFiltersModel.destroy({
      where: { outletProfileMetadataId: id },
      transaction,
    });
  }
  async insertOnlyNotCustomized(outletProfileFilters: OutletProfileFilters[], transaction: Transaction) {
    await this.outletProfileFiltersModel.bulkCreate(outletProfileFilters, { validate: true, transaction });
  }
  async deleteByOutletProfileIds(ids: string[], transaction: Transaction) {
    try {
      await this.outletProfileFiltersModel.destroy({
        where: { outletProfileMetadataId: ids },
        transaction: transaction,
      });
    } catch (error) {
      this.logger.error('OutletProfileFilterService.deleteByOutletProfileIds failed', { error });
      throw new HttpException('Failed delete Outlet profile filters', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async insertOutletProfileFilters(outletProfileFilters: OutletProfileFilters[], transaction: Transaction) {
    await this.deleteByOutletProfileIds(
      outletProfileFilters.map(of => of.outletProfileMetadataId),
      transaction
    );
    return await this.outletProfileFiltersModel.bulkCreate(outletProfileFilters, {
      transaction,
    });
  }

  async getOutletIdsUsingOrOperation(filterIds: string[], included: boolean) {
    this.logger.info('OutletProfileFilterService.getOutletIdsUsingOrOperation - starts', { filterIds, included });
    try {
      const outletProfileFilters = await this.outletProfileFiltersModel.findAndCountAll({
        attributes: ['outletProfileMetadataId'],
        distinct: true,
        where: {
          filterId: { [Op.in]: filterIds },
          included: included,
        },
        group: ['outletProfileMetadataId'],
      });

      const profileMetaIds = outletProfileFilters.rows.map(f => f.dataValues.outletProfileMetadataId);
      return profileMetaIds;
    } catch (error) {
      this.logger.error('OutletProfileFilterService.getOutletIdsUsingOrOperation - exception', { error });
      return [];
    }
  }

  async getOutletIdsUsingAndOperation(filterIds: string[], included: boolean) {
    try {
      this.logger.info('OutletProfileFilterService.getOutletIdsUsingAndOperation - starts', { filterIds, included });
      let safeLength = 0;
      if (Array.isArray(filterIds)) {
        safeLength = Number(filterIds.length);
      } else {
        this.logger.error('Expected filterIds to be an array', { filterIds });
        throw new HttpException('Invalid filterIds type', HttpStatus.BAD_REQUEST);
      }
      // Ensure safeLength is a non-negative integer
      if (!Number.isInteger(safeLength) || safeLength < 0) {
        this.logger.error('filterIds length is not a valid non-negative integer', { safeLength });
        throw new HttpException('Invalid filterIds length', HttpStatus.BAD_REQUEST);
      }
      const outletProfileFilters = await this.outletProfileFiltersModel.findAndCountAll({
        attributes: ['outletProfileMetadataId'],
        distinct: true,
        where: {
          filterId: { [Op.in]: filterIds },
          included: included,
        },
        group: ['outletProfileMetadataId'],
        having: Sequelize.literal(`COUNT(*) = ${safeLength}`),
      });
      const profileMetaIds = outletProfileFilters.rows.map(f => f.dataValues.outletProfileMetadataId);
      return profileMetaIds;
    } catch (error) {
      this.logger.error('OutletProfileFilterService.getOutletIdsUsingAndOperation - exception', { error });
    }
  }
}
