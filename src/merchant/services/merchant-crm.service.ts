import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Transaction } from 'sequelize';
import { EnvKeysEnum } from 'config/env.enum';
import { CategoryService } from 'src/category/services/category.service';
import { Category } from 'src/category/models/category.model';
import { ErrorMessages } from 'src/errors/error-messages';
import { Filter } from 'src/filters/models/filter.model';
import { GenericHttpService } from 'src/http/generic-http.service';
import { MerchantConfiguration } from 'src/merchant-configuration/entities/merchant-configuration.model';
import { MerchantConfigurationService } from 'src/merchant-configuration/services/merchant-configuration.service';
import { MerchantFiltersService } from 'src/merchant-filters/services/merchant-filters.service';
import { Merchant } from '../entities/merchant.model';
import { MerchantPaymentPlanEnum } from '../enums/merchant-payment-plan.enum';
import { MerchantStatusEnum } from '../enums/merchant-status.enum';
import { CreateMerchantCRM } from '../dtos/create-merchant-crm.dto';
import { Group } from 'src/groups/entities/group.model';
import { GroupService } from 'src/groups/services/group.service';
import { DataOperationsProducer } from 'src/kafka-services/data-operations.producer';
import { OfferServiceProducer } from 'src/kafka-services/offer-service.producer';
import { PaymentServiceProducer } from 'src/kafka-services/payment-service.producer';
import { CustomPinoLogger } from 'src/logger/custom-logger.service';
import { FastPaymentMerchantStatusDto, FastPaymentMerchantStatusResponse } from '../dtos/fast-payment-merchant-status.dto';
import { SubCategory } from 'src/sub-category/models/sub-category.model';

@Injectable()
export class MerchantCrmService {
  constructor(
    @InjectModel(Merchant) private readonly merchantModel: typeof Merchant,
    private readonly merchantConfigurationService: MerchantConfigurationService,
    private readonly sequelize: Sequelize,
    private readonly categoryService: CategoryService,
    private readonly httpService: GenericHttpService,
    private readonly merchantFilterService: MerchantFiltersService,
    private readonly groupService: GroupService,
    private readonly logger: CustomPinoLogger,
    private readonly offerServiceProducer: OfferServiceProducer,
    private readonly paymentServiceProducer: PaymentServiceProducer,
    private readonly dataOperationsProducer: DataOperationsProducer
  ) {}

  async createMerchantWithUserFromCRM(data: CreateMerchantCRM): Promise<void> {
    try {
      this.logger.info('createMerchantWithUserFromCRM - starts', { data });
      this.validateCreateMerchantFromCrm(data);

      const category = await this.resolveCategoryForCrm(data?.category ?? null, data?.subCategory ?? null);
      if (!category) {
        throw new HttpException(ErrorMessages.merchant.merchantCategoryIsNotValid, HttpStatus.BAD_REQUEST);
      }

      const group = await this.resolveGroupForCrm(data?.groupName ?? null);
      const existingMerchant = await this.findExistingMerchantForCrm(data?.merchantName ?? null, group, data);
      if (existingMerchant) {
        throw new HttpException(ErrorMessages.auth.merchantAlreadyRegisteredWithGroup, HttpStatus.BAD_REQUEST);
      }

      let merchant: Merchant;
      try {
        merchant = await this.runCreateMerchantFromCrmTransaction(data, category, group);
      } catch (error) {
        this.logger.error('createMerchantWithUserFromCRM - exception', { error });
        throw new HttpException(error?.response ?? ErrorMessages.merchant.merchantCreation.failed, HttpStatus.BAD_REQUEST);
      }

      setImmediate(() => this.sendKafkaMessages(merchant, data));
      if (merchant) {
        await this.runPostCreateMerchantFromCrm(merchant, category);
      }
    } catch (error) {
      this.logger.error('createMerchantWithUserFromCRM - exception', { error });
      throw new HttpException(
        error?.response ?? ErrorMessages.merchant.merchantCreation.failed,
        error?.status ?? HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  private validateCreateMerchantFromCrm(data: CreateMerchantCRM): void {
    if (data.maxOfferValue < 0) {
      throw new HttpException(ErrorMessages.merchant.negativeMaxOffer, HttpStatus.BAD_REQUEST);
    }
    if (data.maxOfferValue === 0 && data.paymentPlan === 'PRE-PAY') {
      throw new HttpException(ErrorMessages.merchant.merchantMaxOfferValueIsNotValid, HttpStatus.BAD_REQUEST);
    }
  }

  private parseSubCategoryNameForCrm(subCategoryName: string): string {
    const separator = ' - ';
    return subCategoryName.lastIndexOf(separator) === -1
      ? subCategoryName
      : subCategoryName.slice(subCategoryName.lastIndexOf(separator) + separator.length);
  }

  private async resolveCategoryForCrm(
    categoryName: string | null,
    subCategoryName: string | null
  ): Promise<Category | null> {
    if (!categoryName || !subCategoryName) return null;
    return this.categoryService.findOrFail({
      where: { name: categoryName },
      include: [
        {
          model: Filter,
          include: [
            {
              required: true,
              model: SubCategory,
              where: { name: this.parseSubCategoryNameForCrm(subCategoryName) },
            },
          ],
        },
      ],
    });
  }

  private async resolveGroupForCrm(groupName: string | null): Promise<Group | null> {
    if (!groupName) return null;
    return this.groupService.findGroup({ where: { name: groupName } });
  }

  private async findExistingMerchantForCrm(
    merchantName: string | null,
    group: Group | null,
    data: CreateMerchantCRM
  ): Promise<Merchant | null> {
    if (!merchantName || !group) return null;
    return this.merchantModel.findOne({
      where: {
        name: merchantName,
        groupId: group.id,
        city: data.opportunityCity,
      },
    });
  }

  private async runCreateMerchantFromCrmTransaction(
    data: CreateMerchantCRM,
    category: Category,
    group: Group | null
  ): Promise<Merchant> {
    return this.sequelize.transaction(async (transaction: Transaction) => {
      const merchant = await this.merchantModel.create(
        {
          name: data.merchantName,
          country: data.opportunityCountry,
          city: data.opportunityCity,
          classification: data.classification,
          salesPerson: data.salesPerson,
          currentDateTime: data.currentDateTime,
          maxOfferValue: data.maxOfferValue,
          crmCategoryName: data?.category,
          crmSubCategoryName: data?.subCategory,
          status: data.maxOfferValue === 0 ? MerchantStatusEnum.NOT_ENROLLED : MerchantStatusEnum.PENDING,
          groupId: group?.id,
          financeContactFirstName: data.financeContactFirstName,
          financeContactLastName: data.financeContactLastName,
          financeContactJobTitle: data.financeContactJobTitle,
          financeContactEmail: data.financeContactEmail,
          financeContactMobile: data.financeContactMobile,
          tradeLicenseNumber: data.tradeLicenseNumber,
          taxRegistrationNumber: data.taxRegistrationNumber,
          paymentPlan: data.paymentPlan === 'PRE-PAY' ? MerchantPaymentPlanEnum.PREPAID : MerchantPaymentPlanEnum.POSTPAID,
          prepayAmount: data.paymentPlan === 'PRE-PAY' ? data.prepayAmount : 0,
          merchantMids: data.opportunityInitialMIDs?.length > 0 ? data.opportunityInitialMIDs?.split(',') : null,
          isCircle: data.isCircle,
        },
        { transaction }
      );
      try {
        const response = await this.httpService.post(`${process.env[EnvKeysEnum.CORE_MERCHANT_URL]}/account/configure`, {
          merchantId: merchant.id,
          paymentTerm: merchant.paymentPlan,
          topUpAmount: merchant.prepayAmount,
        });
        this.logger.info('MerchantServic.createMerchantWithUserFromCRM - core merchant account configured', {
          response,
        });
      } catch (error) {
        this.logger.error('MerchantServic.createMerchantWithUserFromCRM - core merchant account configuration failed', {
          error,
        });
        throw new HttpException('Error in configuring core merchant account', 537);
      }
      await this.merchantFilterService.create(
        {
          filterId: category?.filters?.[0]?.filterId,
          merchantId: merchant.id,
          included: true,
        },
        transaction
      );
      let createdUser: Record<string, unknown> | undefined;
      try {
        const response = await this.httpService.post<Record<string, unknown>>(
          `${process.env[EnvKeysEnum.MERCHANT_IDENTITY_URL]}/merchants/${merchant.id}/user/create`,
          {
            contactEmail: data.contactEmail,
            contactFirstName: data.contactFirstName,
            contactLastName: data.contactLastName,
            contactMobileNumber: data.contactMobileNumber,
            contactJobTitle: data.contactJobTitle,
            contactCompanyName: data.contactCompanyName,
          }
        );
        createdUser = response?.data?.data as Record<string, unknown> | undefined;
      } catch (error) {
        this.logger.error('MerchantServic.createMerchantWithUserFromCRM.merchant user creation failed', { error });
        throw new HttpException(ErrorMessages.auth.merchantCreationFailed, 537);
      }
      if (!group && data.groupName) {
        const newGroup = await this.groupService.create(
          {
            name: data.groupName,
            nameAr: data.groupName,
            merchantIds: [merchant.id],
            groupViewers: createdUser?.id != null ? [createdUser.id as string] : [],
          },
          null,
          transaction
        );
        await merchant.update({ groupId: newGroup.id }, { transaction });
      }
      return merchant;
    });
  }

  private async runPostCreateMerchantFromCrm(merchant: Merchant, category: Category): Promise<void> {
    this.paymentServiceProducer.pushToPaymentService('merchant-payment-terms', {
      merchantId: merchant.id,
      merchantName: merchant.name,
      merchantType: merchant.paymentPlan,
    });
    const [merchantConfig] = await this.addMerchantConfiguration(merchant.id, merchant.country);
    await this.postCreateCustomerOnFinanceService(
      merchant as unknown as Record<string, unknown>,
      category as unknown as Record<string, unknown>,
      merchantConfig
    );
    await this.updateCircleMerchant({
      merchantId: merchant.id,
      name: merchant.name,
      status: merchant.isCircle ? MerchantStatusEnum.PENDING : MerchantStatusEnum.NOT_ENROLLED,
    } as FastPaymentMerchantStatusDto);
  }

  private sendKafkaMessages(merchant: Merchant, data: CreateMerchantCRM) {
    this.pushMerchantAuditLog('COMPLETED', merchant, EnvKeysEnum.AUDIT_LOG_NODE_CRM);
    this.pushMerchantAuditLog('COMPLETED', merchant, EnvKeysEnum.AUDIT_LOG_NODE_MERCHANT_CONFIGURATION);

    this.offerServiceProducer.pushToOfferService('merchant-offer', {
      merchantId: merchant?.id,
      maxOfferValue: data?.maxOfferValue,
      consumerSplit: data?.consumerSplit || undefined,
      merchantName: data?.merchantName,
      profileIds: [process.env[EnvKeysEnum.MIMOJO_PROFILE_ID], process.env[EnvKeysEnum.EIB_PROFILE_ID]],
    });

    this.pushMerchantAuditLog(
      'COMPLETED',
      { merchantId: merchant.id, maxOfferValue: data.maxOfferValue, consumerSplit: data.consumerSplit || undefined },
      EnvKeysEnum.AUDIT_LOG_NODE_MERCHANT_OFFER
    );
    this.pushMerchantAuditLog(
      'COMPLETED',
      { merchantId: merchant.id, paymentTerm: merchant.paymentPlan, topUpAmount: merchant.prepayAmount },
      EnvKeysEnum.AUDIT_LOG_NODE_MERCHANT_PAYMENT_TERMS
    );
    this.pushMerchantAuditLog('PENDING', merchant, EnvKeysEnum.AUDIT_LOG_NODE_MERCHANT_STATUS);
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

  private getTimezoneAndCurrencyForCountry(country: string): { timezoneInfo: string; currencyId: string } {
    if (country?.toLowerCase() === 'qatar') {
      return { timezoneInfo: 'Asia/Qatar', currencyId: 'e05aeae2-443a-46e0-b3d2-4ccd36222513' };
    }
    return {
      timezoneInfo: 'Asia/Dubai',
      currencyId: '9ef4e24c-44b6-48a3-83f5-44f209d37554',
    };
  }

  private async addMerchantConfiguration(merchantId: string, country: string): Promise<[MerchantConfiguration, boolean]> {
    try {
      const { timezoneInfo, currencyId } = this.getTimezoneAndCurrencyForCountry(country);
      const merchantConfig = {
        merchantId,
        timezoneInfo,
        currencyId,
      } as MerchantConfiguration;
      return await this.merchantConfigurationService.addMerchantConfiguration(merchantConfig);
    } catch (error) {
      this.logger.error(`create merchant configuration failed for merchantId: ${merchantId}`, { error });
    }
  }

  private resolveFinanceCategoryIdForMerchant(category: Record<string, unknown>): string | undefined {
    let categoryId: string | undefined = category?.id as string | undefined;
    if (category?.id === process.env[EnvKeysEnum.FB_CATEGORY_ID]) {
      categoryId = category?.filters?.[0]?.subCategoryId as string | undefined;
    }
    return categoryId;
  }

  private async postCreateCustomerOnFinanceService(
    merchant: Record<string, unknown>,
    category: Record<string, unknown>,
    merchantConfig: MerchantConfiguration
  ) {
    const merchantNo = await this.merchantModel.findOne({
      attributes: ['merchant_no'],
      where: { id: merchant.id },
    });
    const categoryId = this.resolveFinanceCategoryIdForMerchant(category);
    const currencyId = merchantConfig?.currencyId ?? null;
    try {
      await this.httpService.post(`${process.env[EnvKeysEnum.FINANCE_SERVICE_URL]}`, {
        id: merchant.id,
        customerNo: merchantNo?.dataValues['merchant_no'],
        name: merchant?.name,
        categories: [categoryId],
        subCategories: [category?.filters?.[0]?.subCategoryId],
        paymentGroup: merchant.paymentPlan,
        customerRegion: merchant.city,
        currencyId,
      });
    } catch (error) {
      this.logger.error(`create-customer-on-bc api failed: merchant-id: ${merchant?.id}`, { error });
    }
  }

  async updateCircleMerchant(
    fastPaymentMerchantStatusDto: FastPaymentMerchantStatusDto,
    headers?: Record<string, string>,
    updatedBy?: string
  ): Promise<boolean | undefined> {
    const { merchantId, status } = fastPaymentMerchantStatusDto;
    const merchant = await this.merchantModel.findByPk(merchantId);
    if (!merchant) throw new HttpException(ErrorMessages.common.entityNotFound('Merchant'), HttpStatus.NOT_FOUND);

    try {
      const url = `${process.env[EnvKeysEnum.FAST_PAYMENT_SERVICE_URL]}/merchants/${merchantId}/status`;
      const { data } = await this.httpService.post<FastPaymentMerchantStatusResponse>(url, fastPaymentMerchantStatusDto, {
        headers: {
          'Authorization': headers?.authorization,
          'x-device-id': headers?.deviceId,
        },
      });
      if (data?.data === true) {
        await merchant.update({ fastPaymentStatus: status, updatedBy });
        this.logger.info(`MerchantCrmService.updateCircleMerchant - updated merchant status; merchantId: ${merchantId} `, {
          fastPaymentMerchantStatusDto,
        });
        return true;
      }
      return false;
    } catch (error) {
      this.logger.error(`MerchantCrmService.updateCircleMerchant - exception `, { error });
    }
  }
}
