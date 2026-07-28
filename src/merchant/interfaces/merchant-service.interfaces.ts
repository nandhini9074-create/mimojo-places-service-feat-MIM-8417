import { FindOptions } from 'sequelize/types/model';
import { Merchant } from '../entities/merchant.model';
import { CreateMerchantCRM } from '../dtos/create-merchant-crm.dto';
import { GetAllMerchantsDto } from '../dtos/get-all-merchants.dto';
import { UpdateMerchantOutletsNumberDto } from '../dtos/update-merchant-outlets-number.dto';
import { UpdateMerchantDto } from '../dtos/update-merchant.dto';
import { UpdateMerchantStatusDto } from '../dtos/update-merchant-status.dto';
import { MerchantPaymentPlanEnum } from '../enums/merchant-payment-plan.enum';
import { Pagination } from 'src/common/helpers/utils';
import { SortDto } from 'src/common/dtos/sort.dto';
import { PaginationDto } from 'src/common/dtos/pagenation.dto';

/** Read operations for merchant data */
export interface IMerchantReadService {
  getMerchantById(id: string): Promise<Merchant>;
  getCoreMerchantAccountConfiguration(id: string): Promise<Record<string, unknown>>;
  getMerchantDetailsById(id: string, options?: FindOptions): Promise<Record<string, unknown>>;
  getMerchant(id: string): Promise<unknown>;
  getAllMerchants(
    customFilters: GetAllMerchantsDto,
    sortDto: SortDto,
    paginationDto: PaginationDto
  ): Promise<{ data: Record<string, unknown>[]; pagination: Pagination }>;
  getSalesOwners(paginationRequest: { page: number; limit: number }, country: string): Promise<unknown>;
  getMerchantNames(merchantIds: string[]): Promise<unknown>;
  getGroupIdsByMerchantIds(merchantIds: string[]): Promise<Merchant[]>;
  getMerchantDataById(merchantId: string): Promise<unknown>;
  getOutletLinksByUserId(userId: string): Promise<unknown>;
  getActiveFabMerchants(ids: string[], profileId: string): Promise<unknown>;
}

/** Write operations for merchant data */
export interface IMerchantWriteService {
  createMerchantWithUserFromCRM(data: CreateMerchantCRM): Promise<void>;
  updateMerchant(id: string, data: UpdateMerchantDto, headers: Record<string, string>, updatedBy: string): Promise<Merchant>;
  updateMerchantOutletsNumber(id: string, body: UpdateMerchantOutletsNumberDto): Promise<void>;
  updateMerchantPaymentType(merchantId: string, paymentPlan: MerchantPaymentPlanEnum, updatedBy: string): Promise<unknown>;
  updateMaxOffer(offers: { merchantId: string; maxOfferValue: number }[]): Promise<void>;
  updateMerchantStatusById(merchantData: UpdateMerchantStatusDto): Promise<boolean>;
}

/** Status and activation operations */
export interface IMerchantStatusService {
  updateMerchantStatus(id: string, status: boolean, token: string, updatedBy: string): Promise<void>;
  updateMerchantStatusRewardEngine(id: string, status: boolean, token: string, updatedBy: string): Promise<void>;
  updateMerchantFastPaymentStatus(
    id: string,
    status: boolean,
    headers: Record<string, string>,
    updatedBy: string
  ): Promise<void>;
  sendFirstActivationEmail(merchant: Merchant): Promise<boolean | void>;
  markFirstActivationEmailSent(merchant: Merchant): Promise<void>;
}

/** Validation and activation checks */
export interface IMerchantValidationService {
  validateMerchant(merchant: Merchant): void;
  canActivateMerchant(merchant: Merchant, throwError?: boolean, merchantAdmin?: unknown): boolean;
}
