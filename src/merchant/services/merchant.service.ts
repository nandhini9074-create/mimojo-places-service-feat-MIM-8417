import { Body, forwardRef, HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { EnvKeysEnum } from 'config/env.enum';
import { Op, Transaction } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { FindOptions } from 'sequelize/types/model';
import { generatePaginationObject, Pagination } from 'src/common/helpers/utils';
import { MerchantConfigurationService } from 'src/merchant-configuration/services/merchant-configuration.service';
import { Category } from 'src/category/models/category.model';
import { ErrorMessages } from 'src/errors/error-messages';
import { Filter } from 'src/filters/models/filter.model';
import { Group } from '../../groups/entities/group.model';
import { GenericHttpService } from '../../http/generic-http.service';
import { MerchantFiltersService } from '../../merchant-filters/services/merchant-filters.service';
import { SubCategory } from 'src/sub-category/models/sub-category.model';
import { CreateMerchantCRM } from '../dtos/create-merchant-crm.dto';
import { GetAllMerchantsDto } from '../dtos/get-all-merchants.dto';
import { UpdateMerchantOutletsNumberDto } from '../dtos/update-merchant-outlets-number.dto';
import { UpdateMerchantDto } from '../dtos/update-merchant.dto';
import { Merchant } from '../entities/merchant.model';
import { MerchantPaymentPlanEnum } from '../enums/merchant-payment-plan.enum';
import { MerchantStatusEnum } from '../enums/merchant-status.enum';
import { GroupMerchantService } from '../shared/group-merchant.service';
import { FastPaymentMerchantStatusDto } from '../dtos/fast-payment-merchant-status.dto';
import { DataOperationsProducer } from 'src/kafka-services/data-operations.producer';
import { OutletService } from 'src/outlet/services/outlet.service';
import { MerchantMetadataUpdatedDto } from 'src/outlet/dtos/merchant-metadata-dto';
import { MerchantStatusUpdatedDto } from 'src/outlet/dtos/merchant-status-dto';
import { UpdateMerchantStatusDto } from '../dtos/update-merchant-status.dto';
import { SortDto } from 'src/common/dtos/sort.dto';
import { PaginationDto } from 'src/common/dtos/pagenation.dto';
import { MerchantProfileMetadata } from 'src/merchant-profile/entities/merchant-profile-metadata.model';
import { MerchantProfileStatusEnum } from 'src/merchant-profile/enums/merchant-profile-status-enum';
import { MerchantIdentityProxy } from 'src/proxy/services/merchant-identity.proxy';
import { Outlet } from 'src/outlet/models/outlet.model';
import { linkedOutletsMapper } from '../mappers/outlet-link.mapper';
import { CustomPinoLogger } from 'src/logger/custom-logger.service';
import { OfferServiceProxy } from 'src/proxy/services/offer-service.proxy';
import { MerchantProfilePhoto } from 'src/merchant-profile/entities/merchant-profile-photo.entity';
import { RewardEngineWrapperProxy } from 'src/outlet/proxies/reward-engine-wrapper.proxy';
import { MerchantCrmService } from './merchant-crm.service';
import {
  IMerchantReadService,
  IMerchantWriteService,
  IMerchantStatusService,
  IMerchantValidationService,
} from '../interfaces/merchant-service.interfaces';

@Injectable()
export class MerchantService
  implements IMerchantReadService, IMerchantWriteService, IMerchantStatusService, IMerchantValidationService
{
  constructor(
    @InjectModel(Merchant) private readonly merchantModel: typeof Merchant,
    private readonly merchantConfigurationService: MerchantConfigurationService,
    private readonly sequelize: Sequelize,
    private readonly httpService: GenericHttpService,
    private readonly merchantFilterService: MerchantFiltersService,
    private readonly groupMerchantService: GroupMerchantService,
    private readonly logger: CustomPinoLogger,
    private readonly dataOperationsProducer: DataOperationsProducer,
    private readonly merchantIdentityProxy: MerchantIdentityProxy,
    @Inject(forwardRef(() => OutletService)) private readonly outletService: OutletService,
    @InjectModel(MerchantProfileMetadata) private readonly merchantProfile: typeof MerchantProfileMetadata,
    private readonly offerServiceProxy: OfferServiceProxy,
    private readonly rewardEngineWrapperProxy: RewardEngineWrapperProxy,
    private readonly merchantCrmService: MerchantCrmService
  ) {}

  async getMerchantById(id: string): Promise<Merchant> {
    try {
      this.logger.info('MerchantService.getMerchantById - starts', { id });
      const merchant = await this.merchantModel.findByPk(id, {
        include: [
          {
            model: Filter,
            attributes: [
              ['filter_id', 'id'],
              'name',
              'nameAr',
              'categoryId',
              'subCategoryId',
              'updatedBy',
              'createdAt',
              'updatedAt',
              'category_id',
              'sub_category_id',
            ],
            through: { attributes: ['included'] },
            include: [
              {
                model: Category,
                attributes: [
                  ['category_id', 'id'],
                  'name',
                  'nameAr',
                  'imageUrl',
                  'darkImageUrl',
                  'isAnimated',
                  'isNewCategory',
                  'isVirtual',
                  'updatedBy',
                  'isBordered',
                  'displayOrder',
                  'createdAt',
                  'updatedAt',
                ],
              },
              {
                model: SubCategory,
                attributes: [
                  ['sub_category_id', 'id'],
                  'name',
                  'nameAr',
                  'type',
                  'typeAr',
                  'updatedBy',
                  'updatedAt',
                  'createdAt',
                ],
              },
            ],
          },
        ],
      });
      if (!merchant) throw new HttpException(ErrorMessages.merchant.notFound, HttpStatus.NOT_FOUND);
      const configuration = await this.getCoreMerchantAccountConfiguration(id);
      merchant.paymentPlan = (configuration?.data as Record<string, unknown>)?.paymentTerm as MerchantPaymentPlanEnum;
      this.logger.info('MerchantService.getMerchantById - ends', { id, merchant });
      return merchant;
    } catch (error) {
      this.logger.error('MerchantService.getMerchantById - exception', { error, id });
      throw new HttpException(
        error?.response?.data?.message ?? error?.message ?? 'Error in getting merchant',
        error?.status ?? HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async getCoreMerchantAccountConfiguration(id: string): Promise<Record<string, unknown>> {
    const response = await this.httpService.get<Record<string, unknown>>(
      `${process.env[EnvKeysEnum.CORE_MERCHANT_URL]}/account/configuration/${id}`
    );
    return response.data;
  }

  async getMerchantDetailsById(id: string, options?: FindOptions): Promise<Record<string, unknown>> {
    const merchant = await this.merchantModel.findByPk(id, options);
    const merchantPaymentPlan: { data: { data: object } } = await this.httpService.get(
      `${process.env[EnvKeysEnum.CORE_MERCHANT_URL]}/account/configuration/${id}`
    );
    if (!merchant) throw new HttpException(ErrorMessages.merchant.notFound, HttpStatus.NOT_FOUND);
    merchant.paymentPlan = merchantPaymentPlan?.data?.data
      ? merchantPaymentPlan.data.data['paymentTerm']
      : merchant?.paymentPlan;

    const merchantConfiguration = await this.merchantConfigurationService.getMerchantConfigurationByMerchantId(id);

    return {
      ...merchant.dataValues,
      ...merchantConfiguration.dataValues,
    };
  }

  async getMerchant(id: string) {
    const merchant = await this.getMerchantById(id);
    const merchantOffer: { data: { data: object } } = await this.httpService.get(
      `${process.env[EnvKeysEnum.MERCHANT_OFFER_URL]}${id}`
    );
    const merchantConfiguration = await this.merchantConfigurationService.getMerchantConfigurationByMerchantId(id);

    return {
      merchant,
      merchantOffer: merchantOffer.data.data,
      merchantConfiguration: merchantConfiguration,
    };
  }

  async getAllMerchants(
    customFilters: GetAllMerchantsDto,
    sortDto: SortDto,
    paginationDto: PaginationDto
  ): Promise<{ data: Record<string, unknown>[]; pagination: Pagination }> {
    return await this.groupMerchantService.getAllMerchants(customFilters, sortDto, paginationDto, null, null);
  }

  async createMerchantWithUserFromCRM(data: CreateMerchantCRM) {
    await this.merchantCrmService.createMerchantWithUserFromCRM(data);
  }

  private pushMerchantAuditLog(status: string, values: unknown, configKey: EnvKeysEnum) {
    this.dataOperationsProducer.pushToAuditLogService(
      'mimojo-places-service',
      { status, values },
      {
        audit_main_node_configuration_id: process.env[configKey],
      }
    );
  }

  async updateMerchant(id: string, @Body() data: UpdateMerchantDto, headers: Record<string, string>, updatedBy: string) {
    // 1. Validation and main DB update (critical path)
    const merchantData = await this.merchantModel.findByPk(id);
    if (!merchantData) throw new HttpException(ErrorMessages.common.entityNotFound('Merchant'), 404);
    const groupExist = await Group.findOne({
      where: {
        id: data.groupId,
      },
    });
    if (!groupExist) throw new HttpException(ErrorMessages.common.entityNotFound('Group'), 404);

    if (data.isModified && merchantData && groupExist) {
      const merchantValue = await this.merchantModel.findOne({
        where: {
          name: data.name,
          groupId: groupExist.id,
          city: data.city,
        },
      });
      if (merchantValue) {
        throw new HttpException(ErrorMessages.auth.merchantAlreadyRegisteredWithGroup, HttpStatus.BAD_REQUEST);
      }
    }

    const filtersSet = new Set([...data.filterIds, ...data.excludedFilterIds]);

    const { count } = await Filter.findAndCountAll({
      where: {
        filterId: [...filtersSet],
      },
    });

    if (count < filtersSet.size)
      throw new HttpException(ErrorMessages.common.entityNotFound('Category and Sub-Category'), 404);

    // 2. Main transactional update
    let updatedMerchant = await this.sequelize.transaction(async (transaction: Transaction) => {
      const [, merchant] = await this.merchantModel.update(
        {
          name: data.name,
          nameAr: data.nameAr ?? data.name,
          country: data.country,
          city: data.city,
          imageUrl: data.imageUrl ?? null,
          groupId: data.groupId,
          desc: data.desc,
          descAr: data.descAr ?? data.desc,
          salesPerson: data.salesPerson,
          isCircle: data.isCircle,
          artDesc: data.artDesc ?? null,
          competitorDesc: data.competitorDesc ?? null,
          updatedBy,
        },
        {
          where: { id },
          returning: true,
          transaction,
        }
      );
      // update category and subCategory
      await merchant[0].$set('filters', [...data.filterIds, ...data.excludedFilterIds]);
      await this.merchantFilterService.updateMerchantFiltersStatus(
        id,
        data.excludedFilterIds,
        false,
        transaction,
        updatedBy
      );
      await this.merchantFilterService.updateMerchantFiltersStatus(id, data.filterIds, true, transaction, updatedBy);
      return merchant[0];
    });
    updatedMerchant = await updatedMerchant.reload({
      attributes: [
        [Sequelize.literal('"Merchant"."id"'), 'merchantId'],
        [Sequelize.literal('"Merchant"."status"'), 'status'],
        [Sequelize.literal('"Merchant"."fast_payment_status"'), 'fastPaymentStatus'],
        [Sequelize.literal('"Merchant"."image_url"'), 'merchantLogoUrl'],
        [Sequelize.literal('"Merchant"."name"'), 'merchantName'],
        [Sequelize.literal('"Merchant"."desc"'), 'MerchantDesc'],
      ],
      include: [
        {
          through: { attributes: ['included'] },
          model: Filter,
          as: 'filters',
          include: [Category, SubCategory],
        },
      ],
    });

    // 3. Prepare data for background processing
    const userId: string = updatedBy;
    const updatedMerchantData: MerchantMetadataUpdatedDto = updatedMerchant.get({
      plain: true,
    }) as unknown as MerchantMetadataUpdatedDto;

    // 4. Update circle merchant status in external service before background operations
    await this.updateExternalCircleMerchantStatus(id, updatedMerchant, headers, userId);

    // 5. Schedule background operations to run after response is sent
    setImmediate(() => {
      this.executeBackgroundOperations(id, data, updatedMerchantData, headers, userId);
    });

    // 6. Return response immediately - background operations will run after this
    return updatedMerchant;
  }

  private async executeBackgroundOperations(
    merchantId: string,
    updateData: UpdateMerchantDto,
    updatedMerchantData: MerchantMetadataUpdatedDto,
    headers: Record<string, string>,
    userId: string
  ): Promise<void> {
    try {
      // Update merchant metadata to all outlets
      await this.updateMerchantMetadataToOutlets(updatedMerchantData, userId, headers);

      // Update outlet status if circle status changed to false
      if (updateData.isCircle === false) {
        await this.updateOutletsCircleStatus(merchantId, headers, userId);
      }
    } catch (err) {
      this.logger.error('updateMerchant background operations error', {
        err,
        merchantId,
        operation: 'executeBackgroundOperations',
      });
    }
  }

  private async updateMerchantMetadataToOutlets(
    updatedMerchantData: MerchantMetadataUpdatedDto,
    userId: string,
    headers: Record<string, string>
  ): Promise<void> {
    await this.sequelize.transaction(async (transaction: Transaction) => {
      await this.outletService.updateMerchantMetadataToOutlet(updatedMerchantData, transaction, userId, headers);
    });
  }

  private async updateOutletsCircleStatus(
    merchantId: string,
    headers: Record<string, string>,
    userId: string
  ): Promise<void> {
    const merchantStatusUpdatedDto: MerchantStatusUpdatedDto = {
      merchantId,
      circleMerchantStatus: false,
    };

    await this.sequelize.transaction(async (transaction: Transaction) => {
      await this.outletService.updateOutletsStatus(merchantStatusUpdatedDto, transaction, headers, userId);
    });
  }

  private async updateExternalCircleMerchantStatus(
    merchantId: string,
    updatedMerchant: Merchant,
    headers: Record<string, string>,
    userId: string
  ): Promise<void> {
    await this.merchantCrmService.updateCircleMerchant(
      {
        merchantId,
        name: updatedMerchant?.name,
        status: updatedMerchant?.fastPaymentStatus,
        logoUrl: updatedMerchant.imageUrl,
        currencyId: headers['currencyid'],
      } as FastPaymentMerchantStatusDto,
      headers,
      userId
    );
  }

  private async updateMerchantStatusInternal(
    id: string,
    status: boolean,
    token: string,
    updatedBy: string,
    hasActiveOfferCheck: (merchantId: string, token: string) => Promise<boolean>
  ) {
    const merchant = await this.merchantModel.findByPk(id, {
      include: [
        {
          model: Filter,
        },
      ],
    });

    if (!merchant) throw new HttpException(ErrorMessages.common.entityNotFound('Merchant'), 404);
    const merchantAdminUserData = await this.getMerchantAdminUserData(id);

    if (status) {
      const isMerchantHasOffer = await hasActiveOfferCheck(id, token);
      if (!isMerchantHasOffer) {
        throw new HttpException(ErrorMessages.merchant.noActiveOffer, 422);
      }
      const canActiveMerchant = this.canActivateMerchant(merchant, true, merchantAdminUserData);
      if (canActiveMerchant) {
        await merchant.update({ status: MerchantStatusEnum.ACTIVE, updatedBy });
        await this.sendFirstActivationEmail(merchant);
        this.pushMerchantAuditLog('ACTIVE', merchant, EnvKeysEnum.AUDIT_LOG_NODE_MERCHANT_STATUS);
      }
    } else {
      await this.sequelize.transaction(async (transaction: Transaction) => {
        const canActiveMerchant = this.canActivateMerchant(merchant, false, merchantAdminUserData);
        if (!canActiveMerchant) {
          await merchant.update({ status: MerchantStatusEnum.PENDING, updatedBy }, { transaction });
          this.pushMerchantAuditLog('PENDING', merchant, EnvKeysEnum.AUDIT_LOG_NODE_MERCHANT_STATUS);
        } else if (canActiveMerchant) {
          await merchant.update({ status: MerchantStatusEnum.DISABLED, updatedBy }, { transaction });
          this.pushMerchantAuditLog('DISABLED', merchant, EnvKeysEnum.AUDIT_LOG_NODE_MERCHANT_STATUS);
        }
        const headers = {
          Authorization: token,
        };
        const userId = updatedBy;
        const merchantStatusUpdatedDto: MerchantStatusUpdatedDto = {
          merchantId: id,
          cloMerchantStatus: false,
        };
        await this.updateMerchantProfileStatus(id, transaction);
        await this.outletService.updateOutletsStatus(merchantStatusUpdatedDto, transaction, headers, userId);
      });
    }
  }

  async updateMerchantStatus(id: string, status: boolean, token: string, updatedBy: string) {
    return this.updateMerchantStatusInternal(id, status, token, updatedBy, (merchantId, headersToken) =>
      this.offerServiceProxy.checkMerchantHasActiveOffer(merchantId, headersToken)
    );
  }

  async updateMerchantStatusRewardEngine(id: string, status: boolean, token: string, updatedBy: string) {
    return this.updateMerchantStatusInternal(id, status, token, updatedBy, (merchantId, headersToken) =>
      this.rewardEngineWrapperProxy.checkMerchantHasActiveOffer(merchantId, headersToken)
    );
  }

  async sendFirstActivationEmail(merchant: Merchant) {
    try {
      if (merchant?.isFirstActivationEmailSent === true) {
        return;
      }

      const response = await this.merchantIdentityProxy.sendMerchantLiveEmail({
        merchantId: merchant.id,
        type: 'MERCHANT_LIVE',
      });
      if (response) {
        await this.markFirstActivationEmailSent(merchant);
      }
      return true;
    } catch (ex: unknown) {
      this.logger.error(`sendFirstActivationEmail - exception; merchantId: ${merchant?.id}`, { error: ex });
      return false;
    }
  }

  async markFirstActivationEmailSent(merchant: Merchant) {
    merchant.isFirstActivationEmailSent = true;
    await merchant.save();
  }

  async updateMerchantFastPaymentStatus(id: string, status: boolean, headers: Record<string, string>, updatedBy: string) {
    const merchant = await this.merchantModel.findByPk(id, {
      include: [
        {
          model: Filter,
        },
      ],
    });

    if (!merchant) throw new HttpException(ErrorMessages.common.entityNotFound('Merchant'), 404);
    const merchantAdminUserData = await this.getMerchantAdminUserData(id);
    if (status) {
      const canActiveMerchant = this.canActivateMerchant(merchant, true, merchantAdminUserData);
      this.validateMerchant(merchant);
      if (canActiveMerchant) {
        await merchant.update({
          fastPaymentStatus: MerchantStatusEnum.ACTIVE,
          isCircle: true,
          updatedBy,
        });
      }
    } else {
      const canActiveMerchant = this.canActivateMerchant(merchant, false, merchantAdminUserData);
      if (!canActiveMerchant) {
        await merchant.update({ fastPaymentStatus: MerchantStatusEnum.PENDING, updatedBy });
      } else if (canActiveMerchant) {
        await merchant.update({ fastPaymentStatus: MerchantStatusEnum.DISABLED, updatedBy });
      }
      const outletHeaders = {
        'Authorization': headers['authorization'] ?? null,
        'x-device-id': headers['x-device-id'] ?? null,
      };
      const userId = updatedBy;
      const merchantStatusUpdatedDto: MerchantStatusUpdatedDto = {
        merchantId: id,
        cloMerchantStatus: false,
      };
      await this.sequelize.transaction(async (transaction: Transaction) => {
        await this.outletService.updateOutletsStatus(merchantStatusUpdatedDto, transaction, outletHeaders, userId);
      });
    }

    await this.merchantCrmService.updateCircleMerchant(
      {
        merchantId: id,
        status: merchant.fastPaymentStatus,
      } as FastPaymentMerchantStatusDto,
      headers,
      updatedBy
    );
  }
  validateMerchant(merchant: Merchant) {
    if (merchant.maxOfferValue > 0 && merchant.status !== MerchantStatusEnum.ACTIVE) {
      throw new HttpException(ErrorMessages.merchant.cloStatusShouldBeActive, 422);
    }
  }

  async updateMerchantOutletsNumber(id: string, body: UpdateMerchantOutletsNumberDto) {
    const merchant = await this.merchantModel.findByPk(id);
    if (!merchant) throw new HttpException(ErrorMessages.common.entityNotFound('Merchant'), 404);
    await this.merchantModel.update(
      {
        activeOutletsNum: body.activeOutletsNum,
        inActiveOutletsNum: body.inActiveOutletsNum,
      },
      {
        where: {
          id,
        },
      }
    );
  }

  async getSalesOwners(paginationRequest, country: string) {
    const countryWhereClause: Record<string, unknown> = {};
    if (country) {
      countryWhereClause.country = country;
    }
    const res = await this.merchantModel.findAndCountAll({
      attributes: [[Sequelize.literal('Distinct(sales_person)'), 'sales_person']],
      offset: paginationRequest.page - 1,
      limit: paginationRequest.limit,
      distinct: true,
      col: 'sales_person',
      where: countryWhereClause,
    });

    const pagination = generatePaginationObject(paginationRequest, res.count, res.rows.length);
    return { data: res.rows, pagination };
  }

  /**
   * Merchant Should already have the access to association Filters and Main Admin
   * @param merchant
   * @param throwError
   */
  canActivateMerchant(merchant: Merchant, throwError = false, merchantAdmin): boolean {
    if (!merchant.city || !merchant.name || !merchant.country) {
      if (throwError) {
        throw new HttpException(ErrorMessages.merchant.missingRequiredFields, 404);
      }
      return false;
    }

    if (merchant.filters.length <= 0) {
      if (throwError) {
        throw new HttpException(ErrorMessages.merchant.merchantShouldBelongToAtLeastOneCategory, 422);
      }
      return false;
    }

    if (!merchantAdmin?.length || !merchantAdmin[0].user?.isRegistered) {
      if (throwError) {
        throw new HttpException(ErrorMessages.merchant.merchantAdminIsNotActivated, 422);
      }
      return false;
    }

    return true;
  }

  async updateMerchantPaymentType(merchantId: string, paymentPlan: MerchantPaymentPlanEnum, updatedBy: string) {
    return this.merchantModel.update(
      {
        paymentPlan: paymentPlan,
        updatedBy,
      },
      {
        where: {
          id: merchantId,
        },
      }
    );
  }

  //User management UI

  async getGroupIdsByMerchantIds(merchantIds: string[]): Promise<Merchant[]> {
    return await this.merchantModel.findAll({
      where: {
        id: {
          [Op.in]: merchantIds,
        },
      },
      attributes: [['id', 'merchantId'], 'groupId'],
    });
  }

  async updateMaxOffer(offers: { merchantId: string; maxOfferValue: number }[]) {
    try {
      this.logger.info(`MerchantService.updateMaxOffer called with offers: ${JSON.stringify(offers)}`);
      for (const offer of offers) {
        if (offer.merchantId && offer.maxOfferValue !== undefined) {
          await this.merchantModel.update(
            { maxOfferValue: offer.maxOfferValue },
            {
              where: { id: offer.merchantId },
            }
          );
        }
      }
    } catch (error) {
      this.logger.error(`MerchantService.updateMaxOffer error`, { error });
      throw new HttpException('Failed to update max offer value', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
  async getMerchantNames(merchantIds: string[]) {
    try {
      return await this.merchantModel.findAll({
        where: {
          id: {
            [Op.in]: merchantIds,
          },
        },
        include: [
          {
            model: Group,
            attributes: ['id', 'name'],
          },
        ],
        attributes: ['id', 'name'],
      });
    } catch (error) {
      this.logger.error(`MerchantService.getMerchantNames error`, { error });
      throw new HttpException('Failed to fetch merchant names', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async updateMerchantStatusById(merchantData: UpdateMerchantStatusDto) {
    try {
      await this.merchantModel.update(
        { status: merchantData.status },
        { where: { id: merchantData.merchantId }, returning: false }
      );
      return true;
    } catch (error) {
      this.logger.error(`MerchantService.updateMerchantStatusById error`, { error });
      throw new HttpException('Failed to update the merchant status', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getMerchantDataById(merchantId: string) {
    try {
      return await this.merchantModel.findByPk(merchantId);
    } catch (error) {
      this.logger.error(`MerchantService.updateMerchantStatusById error`, { error });
      throw new HttpException('Failed to get  the merchant details', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private async getMerchantAdminUserData(merchantId: string) {
    try {
      const response = await this.httpService.get<Record<string, unknown>>(
        `${process.env[EnvKeysEnum.MERCHANT_IDENTITY_URL]}/users/merchant-users/${merchantId}`
      );
      return response.data?.data;
    } catch (error) {
      this.logger.error(`MerchantService.getMerchantAdminUserData error`, { error });
      return [];
    }
  }
  private async updateMerchantProfileStatus(merchantId: string, transaction: Transaction) {
    this.logger.info(`MerchantService.updateMerchantProfileStatus called with merchant id ${merchantId}`);
    try {
      await this.merchantProfile.update(
        {
          status: MerchantProfileStatusEnum.READY,
        },
        {
          where: {
            merchantId: merchantId,
            status: MerchantProfileStatusEnum.ACTIVE,
          },
          transaction,
        }
      );
    } catch (error) {
      this.logger.error('MerchantService.updateMerchantProfileStatus failed ', { error });
      throw new HttpException(`Failed to update the merchant profile status`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getOutletLinksByUserId(userId: string) {
    if (!userId) {
      return { linkedOutlets: [] };
    }

    try {
      const outletLinks = await this.merchantIdentityProxy.outletUserLinks(userId);

      const outletIds = outletLinks.map((outletLink: { outletId: string }) => outletLink.outletId);

      const outlets = await Outlet.findAll({
        attributes: ['outletId', 'merchantId', 'merchantName', 'name'],
        where: { outletId: { [Op.in]: outletIds } },
        raw: true,
      });

      const linkedOutlets = linkedOutletsMapper(outletLinks, outlets);

      return { linkedOutlets };
    } catch (ex: unknown) {
      this.logger.error(`MerchantService.getOutletLinksByUserId - exception; userId: ${userId}`, { ex });
      throw new HttpException(`Failed to get outlet links by user ID`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getActiveFabMerchants(ids: string[], profileId: string) {
    this.logger.info('OutletService.getActiveFabOutlets - starts');
    try {
      const merchants = await this.merchantModel.findAll({
        where: { status: MerchantStatusEnum.ACTIVE, id: { [Op.in]: ids } },
        attributes: ['id'],
        include: [
          {
            model: MerchantProfileMetadata,
            attributes: ['imageUrl'],
            where: { profileId, status: MerchantProfileStatusEnum.ACTIVE },
            include: [
              {
                model: MerchantProfilePhoto,
                required: false,
                where: {
                  isActive: true,
                  isDefault: false,
                },
                attributes: ['cdnUrl'],
              },
              {
                model: Filter,
                through: { attributes: ['included'] },
                include: [
                  {
                    model: Category,
                    attributes: ['name'],
                  },
                  {
                    model: SubCategory,
                    attributes: ['name'],
                  },
                ],
              },
            ],
          },
        ],
      });
      this.logger.info('OutletService.getActiveFabOutlets - ends', { length: merchants.length });
      return merchants;
    } catch (error) {
      this.logger.info('OutletService.getActiveFabOutlets - exception', { error });
      throw error;
    }
  }
}
