import { forwardRef, HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/sequelize';
import { Op, Sequelize, Transaction } from 'sequelize';
import { ErrorMessages } from 'src/errors/error-messages';
import { CloneOutletMappingDto, CreateOutletProfileDto } from '../dtos/create-outlet-profile-dto';
import { MerchantOutletProfilesDto } from '../dtos/merchant-outlet-profile-dto';
import { UpdateOutletProfileDto } from '../dtos/update-outlet-profile-dto';
import { OutletProfileMapping } from '../models/outlet-profile-mapping.model';
import { Outlet } from '../models/outlet.model';
import { Profile } from '../models/profile.model';
import { OutletProfileMappingDto } from '../dtos/outlet-profile-mapping-dto';
import { OutletProfileService } from 'src/outlet-profile/services/outlet-profile.service';
import { CustomPinoLogger } from 'src/logger/custom-logger.service';
import { SearchServiceProxy } from '../proxies/search-service.proxy';
import { OutletService } from './outlet.service';
import { OutletProfileStatusEnum } from 'src/outlet-profile/enums/outlet-profile-enum';
import { OutletOfferProxy } from '../proxies/outlet-offer.proxy';
import { SchemeServiceProxy } from '../proxies/scheme-service.proxy';
import { ConfigService } from '@nestjs/config';
import { IAppConfig } from 'config/interface';
import { RewardEngineWrapperProxy } from '../proxies/reward-engine-wrapper.proxy';

@Injectable()
export class OutletProfileMappingService {
  private isRewardEngineEnabled: boolean;
  constructor(
    @InjectModel(Profile)
    private readonly profile: typeof Profile,
    @InjectModel(OutletProfileMapping)
    private readonly outletProfileMapping: typeof OutletProfileMapping,
    private readonly logger: CustomPinoLogger,
    @Inject(forwardRef(() => OutletService))
    private readonly outletService: OutletService,
    @InjectConnection('default') private readonly sequelize: Sequelize,
    @Inject(forwardRef(() => OutletProfileService))
    private readonly outletProfileService: OutletProfileService,
    private readonly searchServiceProxy: SearchServiceProxy,
    private readonly outletOfferProxy: OutletOfferProxy,
    private readonly schemeServiceProxy: SchemeServiceProxy,
    private readonly configService: ConfigService,
    private readonly rewardEngineWrapperProxy: RewardEngineWrapperProxy
  ) {
    const { IS_REWARD_ENGINE_ENABLED } = this.configService.get<IAppConfig>('app');
    this.isRewardEngineEnabled = IS_REWARD_ENGINE_ENABLED;
  }

  async create(createOutletProfileDto: CreateOutletProfileDto, transaction?: Transaction) {
    this.logger.info('OutletProfileMappingService.create method called', {
      data: createOutletProfileDto,
    });
    try {
      return await this.outletProfileMapping.create(createOutletProfileDto, { transaction });
    } catch (error) {
      this.logger.error('OutletProfileMappingService.create method error', { error });
      if (error.name === 'SequelizeUniqueConstraintError') {
        throw new HttpException(ErrorMessages.outletProfileMapping.outletProfileMappingAlreadyExist, HttpStatus.BAD_REQUEST);
      }
      throw new HttpException(ErrorMessages.outletProfileMapping.outletProfileMappingCreationFailed, HttpStatus.BAD_REQUEST);
    }
  }

  async clone(dto: CloneOutletMappingDto, transaction?: Transaction) {
    this.logger.info('OutletProfileMappingService.create method called', {
      data: dto,
    });
    try {
      const existingMapping = await this.outletProfileMapping.findOne({
        where: {
          outletId: dto.existingOutletId,
          profileId: dto.profileId,
        },
        raw: true,
        attributes: { exclude: ['id', 'createdAt', 'updatedAt'] },
      });

      const newMapping = {
        ...existingMapping,
        outletId: dto.outletId,
        updatedBy: dto.updatedBy,
      };

      return await this.outletProfileMapping.create(newMapping, { transaction });
    } catch (error) {
      this.logger.error('OutletProfileMappingService.create method error', { error });
      if (error.name === 'SequelizeUniqueConstraintError') {
        throw new HttpException(ErrorMessages.outletProfileMapping.outletProfileMappingAlreadyExist, HttpStatus.BAD_REQUEST);
      }
      throw new HttpException(ErrorMessages.outletProfileMapping.outletProfileMappingCreationFailed, HttpStatus.BAD_REQUEST);
    }
  }

  async updateByOutletIdProfileId(updateOutletProfileDto: UpdateOutletProfileDto, transaction?: Transaction) {
    this.logger.info('OutletProfileMappingService.update method called', {
      data: updateOutletProfileDto,
    });
    try {
      return await this.outletProfileMapping.update(updateOutletProfileDto, {
        where: {
          outletId: updateOutletProfileDto.outletId,
          profileId: updateOutletProfileDto.profileId,
        },
        returning: true,
        transaction,
      });
    } catch (error) {
      this.logger.error('OutletProfileMappingService.update method error', { error });
      throw new HttpException(ErrorMessages.outletProfileMapping.outletProfileMappingUpdateFailed, HttpStatus.BAD_REQUEST);
    }
  }

  async deleteByOutletIdProfileId(outletId: string, profileId: string, transaction?: Transaction) {
    this.logger.info('OutletProfileMappingService.delete method called', { outletId, profileId });
    try {
      return await this.outletProfileMapping.destroy({
        where: { outletId, profileId },
        transaction,
      });
    } catch (error) {
      this.logger.error('OutletProfileMappingService.delete method error', { error });
      throw new HttpException(ErrorMessages.outletProfileMapping.outletProfileMappingDeletionFailed, HttpStatus.BAD_REQUEST);
    }
  }

  async findAll() {
    this.logger.info('OutletProfileMappingService.findAll method called');
    try {
      return await this.outletProfileMapping.findAll({ include: ['outlet', 'profile'] });
    } catch (error) {
      this.logger.error('OutletProfileMappingService.findAll method error', { error });
    }
  }

  async findOne(outletId: string, profileId: string) {
    this.logger.info('OutletProfileMappingService.findOne method called', { outletId, profileId });
    try {
      return await this.outletProfileMapping.findOne({
        where: { outletId, profileId },
        include: ['outlet', 'profile'],
      });
    } catch (error) {
      this.logger.error('OutletProfileMappingService.findOne method error', { error });
    }
  }

  async findByOutletId(outletId: string) {
    this.logger.info('OutletProfileMappingService.findByOutletId method called', { outletId });
    try {
      return await this.outletProfileMapping.findAll({
        where: { outletId },
        include: ['outlet', 'profile'],
      });
    } catch (error) {
      this.logger.error('OutletProfileMappingService.findByOutletId method error', { error });
    }
  }

  async findOneByTransactionDate(outletId: string, profileId: string, transactionDate: Date, bin?: string) {
    this.logger.info('OutletProfileMappingService.findOneByTransactionDate method called', {
      outletId,
      profileId,
    });
    try {
      const whereCondition = this._getWhereCondition(outletId, profileId, transactionDate);
      const outletProfileMappingData = await this.outletProfileMapping.findOne({
        where: whereCondition,
        include: ['outlet', 'profile'],
        paranoid: false,
      });

      if (!outletProfileMappingData) return null;

      const allowedBins = outletProfileMappingData.allowedBins || [];

      if (bin && allowedBins.length > 0 && !allowedBins.includes(bin)) {
        return null;
      }

      return outletProfileMappingData;
    } catch (error) {
      this.logger.error('OutletProfileMappingService.findOne method error', { error });
      return null;
    }
  }

  async findAllOutletsByTransactionDate(outletId: string, transactionDate: Date) {
    this.logger.info('OutletProfileMappingService.findAllOutletsByTransactionDate method called', {
      outletId,
    });
    try {
      const whereCondition = this._getWhereCondition(outletId, undefined, transactionDate);
      return await this.outletProfileMapping.findAll({
        where: whereCondition,
        include: ['outlet', 'profile'],
        paranoid: false,
      });
    } catch (error) {
      this.logger.error('OutletProfileMappingService.findAllOutletsByTransactionDate method error', { error });
    }
  }

  async findByProfileId(profileId: string) {
    this.logger.info('OutletProfileMappingService.findByProfileId method called', { profileId });
    try {
      const outletProfiles = await this.outletProfileMapping.findAll({
        attributes: ['id', 'outletId', 'startDate', 'endDate', 'isActive'],
        where: { profileId },
        include: [
          {
            model: Outlet,
            as: 'outlet',
            attributes: ['outletId', 'merchantId'],
          },
        ],
      });

      const result = outletProfiles.reduce((acc, curr) => {
        const merchantId = curr.outlet.merchantId;
        const existingMerchant = acc.find(item => item.merchantId === merchantId);

        if (existingMerchant) {
          existingMerchant.includedOutlets.push(curr.outletId);
        } else {
          acc.push({
            merchantId,
            startDate: curr.startDate,
            endDate: curr.endDate,
            includedOutlets: [curr.outletId],
          });
        }

        return acc;
      }, []);

      return result;
    } catch (error) {
      this.logger.error('OutletProfileMappingService.findByProfileId method error', { error });
    }
  }

  async saveMerchantOutletProfile(merchantOutletProfilesDto: MerchantOutletProfilesDto, userId: string) {
    this.logger.info('OutletProfileMappingService.saveMerchantOutletProfile called', {
      data: merchantOutletProfilesDto,
    });

    try {
      const { profileId, merchantOutletProfileDtos } = merchantOutletProfilesDto;

      const mappingPromises: Promise<OutletProfileMapping | true>[] = [];

      for (const item of merchantOutletProfileDtos) {
        const { merchantId, includedOutlets = [], excludedOutlets = [] } = item;

        for (const outletId of excludedOutlets) {
          mappingPromises.push(
            this.mapOutletToProfile(
              {
                outletId,
                profileId,
                merchantId,
                mapToProfile: false,
              },
              userId,
              true
            )
          );
        }

        for (const outletId of includedOutlets) {
          mappingPromises.push(
            this.mapOutletToProfile(
              {
                outletId,
                profileId,
                merchantId,
                mapToProfile: true,
                startDate: item.startDate,
                endDate: item.endDate,
              },
              userId,
              true
            )
          );
        }
      }

      const results = await Promise.all(mappingPromises);

      const mappedRecords = results.filter((r): r is OutletProfileMapping => r !== true);

      return mappedRecords;
    } catch (error) {
      this.logger.error('OutletProfileMappingService.saveMerchantOutletProfile error', { error });
      throw new HttpException(ErrorMessages.outletProfileMapping.outletProfileMappingCreationFailed, HttpStatus.BAD_REQUEST);
    }
  }

  async fetchProfileMappingCount(headers: Record<string, string>) {
    this.logger.info('OutletProfileMappingService.fetchProfileMappingCount method called');
    try {
      const result = await this.profile.findAll({
        attributes: [
          'id',
          'name',
          [this.profile.sequelize.fn('COUNT', this.profile.sequelize.col('outletProfileMapping.id')), 'mappingCount'],
        ],
        include: [
          {
            model: OutletProfileMapping,
            attributes: [],
          },
        ],
        group: ['Profile.id'],
      });
      const visaOnboardingAvailability = await this.schemeServiceProxy.getVisaB2bMerchantOnboardingAvailability(
        result.map(r => r.id),
        headers
      );
      const availabilityMap = new Map(
        visaOnboardingAvailability.map((v: { profileId: string; isVisaOnboardingEnabled: boolean }) => [
          v.profileId,
          v.isVisaOnboardingEnabled,
        ])
      );
      result.forEach(r => {
        (r as Profile & { dataValues: Record<string, unknown> }).dataValues.isVisaOnboardingEnabled =
          availabilityMap.get(r.id) || false;
      });
      return result;
    } catch (error: unknown) {
      this.logger.error('OutletProfileMappingService.fetchProfileMappingCount method error', {
        error,
      });
      const err = error as HttpException;
      throw new HttpException(
        err?.getResponse?.() ?? ErrorMessages.outletProfileMapping.outletProfileMappingFetchFailed,
        err?.getStatus?.() ?? HttpStatus.BAD_REQUEST
      );
    }
  }

  private _getWhereCondition(outletId: string, profileId?: string, transactionDate?: Date) {
    const baseCondition: Record<string, unknown> = { outletId, isActive: true };

    if (profileId) {
      baseCondition.profileId = profileId;
    }

    if (!transactionDate) {
      return baseCondition;
    }

    return {
      ...baseCondition,
      [Op.and]: [
        { createdAt: { [Op.lte]: transactionDate } },
        {
          [Op.or]: [{ deletedAt: { [Op.gte]: transactionDate } }, { deletedAt: null }],
        },
        {
          [Op.or]: [
            { startDate: { [Op.lte]: transactionDate }, endDate: { [Op.gte]: transactionDate } },
            { startDate: { [Op.lte]: transactionDate }, endDate: null },
            { startDate: null, endDate: { [Op.gte]: transactionDate } },
            { startDate: null, endDate: null },
          ],
        },
      ],
    };
  }
  async mapOutletToProfile(
    dto: OutletProfileMappingDto,
    userId: string,
    fromProfileMapping?: boolean
  ): Promise<OutletProfileMapping | true> {
    try {
      let result: OutletProfileMapping | null = null;

      const existingMapping = await this.outletProfileMapping.findOne({
        where: {
          outletId: dto.outletId,
          profileId: dto.profileId,
        },
        paranoid: false,
      });

      if (dto.mapToProfile) {
        await this.sequelize.transaction(async (transaction: Transaction) => {
          if (!existingMapping) {
            result = await this.outletProfileMapping.create(
              {
                outletId: dto.outletId,
                profileId: dto.profileId,
                isActive: true,
                startDate: dto.startDate,
                endDate: dto.endDate,
                updatedBy: userId,
              },
              { transaction }
            );
          } else {
            await existingMapping.restore({ transaction });
            result = await existingMapping.update(
              {
                isActive: true,
                startDate: dto.startDate,
                endDate: dto.endDate,
                updatedBy: userId,
              },
              { transaction }
            );
          }

          await this.insertToOutletProfileMetadata(dto.outletId, dto.profileId, dto.merchantId, transaction);

          if (this.isRewardEngineEnabled) {
            await this.rewardEngineWrapperProxy.UpdateOutletMaxOfferForProfile(dto.outletId, dto.profileId);
          } else {
            await this.outletOfferProxy.getOutletCurrentOfferForProfile(dto.outletId, dto.profileId);
          }
        });
      } else {
        await this.outletProfileMapping.destroy({
          where: {
            outletId: dto.outletId,
            profileId: dto.profileId,
          },
        });

        await this.outletProfileService.updateStatusForProfile(dto.outletId, dto.profileId, OutletProfileStatusEnum.Pending);
      }

      // Search sync
      await this.searchServiceProxy.updateOutletStatus(dto.outletId, dto.profileId, dto.mapToProfile ? undefined : 'false');

      // return entity only for profile-mapping + map=true
      if (fromProfileMapping && dto.mapToProfile && result) {
        return result;
      }

      return true;
    } catch (error) {
      this.logger.error(`OutletProfileMappingService.mapOutletToProfile error`, { error });
      throw new HttpException('Failed to map the outlet to profile', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async insertToOutletProfileMetadata(outletId: string, profileId: string, merchantId: string, transaction?: Transaction) {
    try {
      await this.outletProfileService.insertOutletProfileMetadata(outletId, profileId, merchantId, transaction);
    } catch (error) {
      this.logger.error('OutletProfileMappingService.insertToOutletProfileMetadata failed', {
        error,
      });
      throw new HttpException(
        error?.response ?? 'Failed to insert OutletProfileMetadata  ',
        error?.status ?? HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async cloneToOutletProfileMetadata(
    outletId: string,
    profileId: string,
    merchantId: string,
    existingOutletId: string,
    userId: string,
    transaction?: Transaction
  ) {
    try {
      await this.outletProfileService.cloneOutletProfileMetadata(
        outletId,
        profileId,
        merchantId,
        existingOutletId,
        userId,
        transaction
      );
    } catch (error) {
      this.logger.error('OutletProfileMappingService.insertToOutletProfileMetadata failed', {
        error,
      });
      throw new HttpException(
        error?.response ?? 'Failed to insert OutletProfileMetadata  ',
        error?.status ?? HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async findOrCreate(dto: CreateOutletProfileDto) {
    return await this.outletProfileMapping.findOrCreate({
      where: {
        outletId: dto.outletId,
        profileId: dto.profileId,
      },
      defaults: {
        isActive: true,
        updatedBy: dto.updatedBy,
      },
    });
  }
  async getMappedOutletDetails(profileId: string) {
    try {
      const mappedOutletDetails = await this.outletProfileMapping.findAll({
        where: {
          profileId,
        },
        attributes: ['outletId', 'startDate', 'endDate', 'profileId'],
      });
      return mappedOutletDetails;
    } catch (error) {
      throw new HttpException('Failed to fetch mapped outlets', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getExpiredOutlets(startTime: Date, endTime: Date) {
    this.logger.info('OutletProfileMappingService.getExpiredOutlets - starts', { startTime, endTime });
    try {
      const expiredOutlets = await this.outletProfileMapping.findAll({
        where: {
          isActive: true,
          endDate: { [Op.between]: [startTime, endTime] },
        },
      });
      this.logger.info(`OutletProfileMappingService.getExpiredOutlets - completed with count: ${expiredOutlets?.length}`);
      return expiredOutlets;
    } catch (error) {
      this.logger.error('OutletProfileMappingService.getExpiredOutlets - exception', { error });
      throw error;
    }
  }
}
