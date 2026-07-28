import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { Transaction } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { UserIdOptional } from 'src/auth/get-user-id.decorator';
import { BaseResponse } from 'src/dtos/base-response';
import { baseResponseHelper } from 'src/helpers/base-response.helper';
import { OutletKafkaProducerService } from '../images/services/outlet-kafka-producer.service';
import { CreateCustomOutletDto } from './dtos/create-custom-outlet-dto';
import { CloneOutletDto, CreateOutletDto } from './dtos/create-outlet-dto';
import { OutletFastPaymentStatusDto } from './dtos/fast-payment-status.dto';
import { GetMerchantOutletDetailsDto } from './dtos/get-merchant-outlet-details.dto';
import { GetOutletDto } from './dtos/get-outlet-dto';
import { OutletsBasicDetailsDTO } from './dtos/get-outlets-basic-details-dto';
import { MerchantMetadataUpdatedDto } from './dtos/merchant-metadata-dto';
import { MerchantOfferUpdatedDto } from './dtos/merchant-offer-updated-dto';
import { MerchantOutletProfilesDto } from './dtos/merchant-outlet-profile-dto';
import { MerchantStatusUpdatedDto } from './dtos/merchant-status-dto';
import { OutletOfferUpdatedDto } from './dtos/outlet-offer-updated-dto';
import { GetOutletProfileQueryDto } from './dtos/profile-dto';
import { UploadOutletStatusDto } from './dtos/update-status-dto';
import { OutletSourceEnum } from './enums/outlet-source-enum';
import { ProfileEnum } from './enums/profile-enum';
import { Outlet } from './models/outlet.model';
import { OutletAddressService } from './services/outlet-address.service';
import { OutletGetService } from './services/outlet-get.service';
import { OutletMigrationService } from './services/outlet-migration.service';
import { OutletProfileMappingService } from './services/outlet-profile-mapping.service';
import { OutletTimingService } from './services/outlet-timing.service';
import { OutletService } from './services/outlet.service';
import { OutletProfileMappingDto } from './dtos/outlet-profile-mapping-dto';
import { ApiEndpoint } from 'src/common/decorators/api-swagger';
import { OutletAddress } from './models/outlet-address.model';

@Controller({ version: '1', path: 'outlet' })
export class OutletController {
  constructor(
    private readonly outletService: OutletService,
    private readonly outletMigrationService: OutletMigrationService,
    private readonly outletAddressService: OutletAddressService,
    private readonly outletTimingService: OutletTimingService,
    private readonly outletKafkaProducerService: OutletKafkaProducerService,
    private readonly sequelize: Sequelize,
    private readonly outletGetService: OutletGetService,
    private readonly outletProfileMappingService: OutletProfileMappingService
  ) {}

  @Post('insert-outlet')
  @ApiEndpoint({
    summary: 'Insert a new outlet',
    bodyType: CreateOutletDto,
  })
  async insertOutlet(
    @Body() request: CreateOutletDto,
    @Req() req: Request,
    @UserIdOptional() userId: string
  ): Promise<BaseResponse<Outlet>> {
    let response;
    await this.sequelize.transaction(async (transaction: Transaction) => {
      response = await this.outletService.insertOutletFromPoi(
        request,
        transaction,
        req.headers as Record<string, string>,
        userId
      );
      await this.outletAddressService.insert(response.outletId, request?.outletAddress, transaction, userId);
      await this.outletTimingService.insert(response.outletId, request?.outletTiming, transaction, userId);
      await this.outletKafkaProducerService.pushToOutletImageService(
        response.outletId,
        request.photos,
        OutletSourceEnum.POI
      );
    });
    this.outletService.createOffer(request.merchantId, response.outletId, response.name, userId);
    await this.outletService.updateOutletCountByMerchant(request.merchantId);
    await this.outletService.createOutletProfile(response.outletId, ProfileEnum.MIMOJO, userId, request.merchantId);
    await this.outletService.syncPoiOutletToCore(response, request, req.headers as Record<string, string>);
    this.outletService.pushOutletToAuditLog(response, true, true);
    return baseResponseHelper(response);
  }

  @Post('add-edit-custom-outlet')
  @ApiEndpoint({
    summary: 'Add or edit a custom outlet',
    bodyType: CreateCustomOutletDto,
  })
  async addEditCustomOutlet(
    @Body() request: CreateCustomOutletDto,
    @Req() req: Request,
    @UserIdOptional() userId: string
  ): Promise<BaseResponse<Outlet>> {
    let response;
    await this.sequelize.transaction(async (transaction: Transaction) => {
      response = await this.outletService.addEditCustomOutlet(
        request,
        transaction,
        req.headers as Record<string, string>,
        userId
      );
      await this.outletAddressService.insert(response.outletId, request?.outletAddress, transaction, userId);
      await this.outletTimingService.insert(response.outletId, request?.outletTiming, transaction, userId);
    });
    if (!request.id) {
      this.outletService.createOffer(request.merchantId, response.outletId, response.name, userId);
    }
    await this.outletService.updateOutletCountByMerchant(request.merchantId);
    await this.outletService.createOutletProfile(response.outletId, ProfileEnum.MIMOJO, userId, request.merchantId);
    await this.outletService.syncCustomOutletToCore(response, request, req.headers as Record<string, string>);
    this.outletService.pushOutletToAuditLog(response, false, !request.id);
    return baseResponseHelper(response);
  }

  @Post('clone-outlet')
  async cloneOutlet(@Body() body: CloneOutletDto, @UserIdOptional() userId: string, @Req() req: Request) {
    const { outletId } = body;
    if (!outletId) {
      throw new HttpException('Outlet required', HttpStatus.BAD_REQUEST);
    }

    let clonedOutlet, outletAddress: OutletAddress;

    await this.sequelize.transaction(async (transaction: Transaction) => {
      const { newOutlet } = await this.outletService.cloneOutlet(
        outletId,
        userId,
        req.headers as Record<string, string>,
        transaction
      );
      clonedOutlet = newOutlet;
      outletAddress = await this.outletAddressService.cloneAddress(clonedOutlet.outletId, transaction, userId, outletId);
      await this.outletTimingService.cloneTiming(clonedOutlet.outletId, transaction, userId, outletId);
    });

    await this.outletService.updateOutletCountByMerchant(clonedOutlet.merchantId);
    await this.outletService.createOutletProfileClone(clonedOutlet.outletId, userId, outletId, clonedOutlet.merchantId);

    //update to reward engine in future
    const payload = {
      existingOutletId: outletId,
      newOutletId: clonedOutlet.outletId,
      outletName: clonedOutlet.name,
      merchantId: clonedOutlet.merchantId,
      userId,
      token: req.headers as Record<string, string>,
    };
    this.outletService.cloneOffer(payload);

    if (outletAddress?.googlePlaceId) {
      const corePayload = {
        merchantId: clonedOutlet.merchantId,
        outletAddress: {
          location: outletAddress.location,
        },
      } as CreateOutletDto;
      await this.outletService.syncPoiOutletToCore(clonedOutlet, corePayload, req.headers as Record<string, string>);
    } else {
      const corePayload = {
        merchantId: clonedOutlet.merchantId,
        outletAddress: {
          cityId: outletAddress.areaId,
          location: outletAddress.location,
        },
      } as CreateCustomOutletDto;
      await this.outletService.syncCustomOutletToCore(clonedOutlet, corePayload, req.headers as Record<string, string>);
    }

    await this.outletService.markAsHasClone(body.outletId);

    this.outletService.pushOutletToAuditLog(clonedOutlet, !!outletAddress.googlePlaceId, true);
    return baseResponseHelper(clonedOutlet);
  }

  @HttpCode(HttpStatus.OK)
  @Post('update-status')
  @ApiEndpoint({
    summary: 'Update outlet status',
    bodyType: UploadOutletStatusDto,
  })
  async updateStatus(
    @Body() request: UploadOutletStatusDto,
    @Req() req: Request,
    @UserIdOptional() userId: string
  ): Promise<BaseResponse<unknown>> {
    const response = await this.outletService.validateAndUpdateOutletStatus(
      request,
      req.headers as Record<string, string>,
      userId
    );
    return baseResponseHelper(response);
  }
  @HttpCode(HttpStatus.OK)
  @Post('update-status/reward-engine')
  @ApiEndpoint({
    summary: 'Update outlet status',
    bodyType: UploadOutletStatusDto,
  })
  async updateStatusRewardEngine(
    @Body() request: UploadOutletStatusDto,
    @Req() req: Request,
    @UserIdOptional() userId: string
  ): Promise<BaseResponse<unknown>> {
    const response = await this.outletService.validateAndUpdateOutletStatusRewardEngine(
      request,
      req.headers as Record<string, string>,
      userId
    );
    return baseResponseHelper(response);
  }

  @HttpCode(HttpStatus.OK)
  @Post('update-fast-payment-status')
  @ApiEndpoint({
    summary: 'Update fast payment status',
    bodyType: OutletFastPaymentStatusDto,
  })
  async updateFastPaymentStatus(
    @Body() request: OutletFastPaymentStatusDto,
    @Req() req: Request,
    @UserIdOptional() userId: string
  ): Promise<BaseResponse<unknown>> {
    return baseResponseHelper(
      await this.outletService.updateFastPaymentStatus(request, req.headers as Record<string, string>, userId)
    );
  }

  @HttpCode(HttpStatus.OK)
  @Get('get-all-outlets/:id')
  @ApiEndpoint({
    summary: 'Get all outlets for a merchant',
    pathParams: [{ name: 'id', description: 'Merchant UUID', type: 'string' }],
  })
  async getAllOutlets(
    @Param('id', ParseUUIDPipe) merchant_id: string,
    @Req() req: Request
  ): Promise<BaseResponse<unknown[]>> {
    return baseResponseHelper(await this.outletGetService.getAllOutlets(merchant_id, req.headers as Record<string, string>));
  }

  @HttpCode(HttpStatus.OK)
  @Get('get-all-outlet-details')
  @ApiEndpoint({
    summary: 'Get all outlet details',
  })
  async getAllOutletDetails(): Promise<BaseResponse<unknown[]>> {
    return baseResponseHelper(await this.outletGetService.findAll());
  }

  @HttpCode(HttpStatus.OK)
  @Post('outlets/:id')
  @ApiEndpoint({
    summary: 'Fetch outlets for a merchant',
    pathParams: [{ name: 'id', description: 'Merchant UUID', type: 'string' }],
    bodyType: GetOutletDto,
  })
  async fetchOutlets(
    @Param('id', ParseUUIDPipe) merchant_id: string,
    @Body() request: GetOutletDto
  ): Promise<BaseResponse<unknown>> {
    return baseResponseHelper(await this.outletGetService.fetchOutlets(merchant_id, request));
  }

  @HttpCode(HttpStatus.OK)
  @Post('get-outlets/:id')
  @ApiEndpoint({
    summary: 'Get outlets with filters for a merchant',
    pathParams: [{ name: 'id', description: 'Merchant UUID', type: 'string' }],
    bodyType: GetOutletDto,
  })
  async getOutlets(
    @Param('id', ParseUUIDPipe) merchant_id: string,
    @Body() request: GetOutletDto,
    @Req() req: Request
  ): Promise<BaseResponse<unknown>> {
    return baseResponseHelper(
      await this.outletGetService.getOutlets(merchant_id, request, req.headers as Record<string, string>)
    );
  }

  @HttpCode(HttpStatus.OK)
  @Get('get-outlet-details/:outletId')
  @ApiEndpoint({
    summary: 'Get outlet details',
    pathParams: [{ name: 'outletId', description: 'Outlet UUID', type: 'string' }],
  })
  async getOutletDetails(
    @Param('outletId', ParseUUIDPipe) outlet_id: string,
    @Req() req: Request
  ): Promise<BaseResponse<unknown>> {
    return baseResponseHelper(
      await this.outletGetService.getOutletDetails(outlet_id, req.headers as Record<string, string>)
    );
  }
  @HttpCode(HttpStatus.OK)
  @Get('get-outlet-details/reward-engine/:outletId')
  @ApiEndpoint({
    summary: 'Get outlet details',
    pathParams: [{ name: 'outletId', description: 'Outlet UUID', type: 'string' }],
  })
  async getOutletDetailsRewardEngine(
    @Param('outletId', ParseUUIDPipe) outlet_id: string,
    @Req() req: Request
  ): Promise<BaseResponse<unknown>> {
    return baseResponseHelper(
      await this.outletGetService.getOutletDetailsRewardEngine(outlet_id, req.headers as Record<string, string>)
    );
  }

  @HttpCode(HttpStatus.OK)
  @Get('mid-tid-mapping/:outletId')
  @ApiEndpoint({
    summary: 'Get MID-TID mapping for an outlet',
    pathParams: [{ name: 'outletId', description: 'Outlet UUID', type: 'string' }],
  })
  async getMidTidMapping(@Param('outletId', ParseUUIDPipe) outlet_id: string): Promise<BaseResponse<unknown>> {
    return baseResponseHelper(await this.outletGetService.getMidTidMapping(outlet_id));
  }

  @Post('merchant_metadata_updated')
  @ApiEndpoint({
    summary: 'Update merchant metadata',
    bodyType: MerchantMetadataUpdatedDto,
  })
  async merchantMetadataUpdated(
    @Body() request: MerchantMetadataUpdatedDto,
    @Req() req: Request,
    @UserIdOptional() userId: string
  ): Promise<BaseResponse<unknown>> {
    this.sequelize.transaction(async (transaction: Transaction) => {
      // Perform the necessary operations within the transaction
      await this.outletService.updateMerchantMetadataToOutlet(request, transaction, userId);
    });

    return baseResponseHelper(null);
  }

  @Post('merchant_status_updated')
  @ApiEndpoint({
    summary: 'Update merchant status',
    bodyType: MerchantStatusUpdatedDto,
  })
  async merchantStatusUpdated(
    @Body() request: MerchantStatusUpdatedDto,
    @Req() req: Request,
    @UserIdOptional() userId: string
  ): Promise<BaseResponse<unknown>> {
    let response;
    await this.sequelize.transaction(async (transaction: Transaction) => {
      response = await this.outletService.updateOutletsStatus(
        request,
        transaction,
        req.headers as Record<string, string>,
        userId
      );
    });
    return baseResponseHelper(response);
  }

  @Post('merchant_offer_updated')
  @ApiEndpoint({
    summary: 'Update merchant outlet max offer',
    bodyType: MerchantOfferUpdatedDto,
  })
  async merchantOfferUpdated(
    @Body() request: MerchantOfferUpdatedDto,
    @Req() req: Request,
    @UserIdOptional() userId: string
  ): Promise<BaseResponse<unknown>> {
    let response;
    await this.sequelize.transaction(async (transaction: Transaction) => {
      response = await this.outletService.updateMerchantOutletMaxOffer(request, transaction, userId);
    });
    return response;
  }

  @Post('outlet_offer_updated')
  @ApiEndpoint({
    summary: 'Update outlet max offer',
    bodyType: OutletOfferUpdatedDto,
  })
  async outletOfferUpdated(
    @Body() request: OutletOfferUpdatedDto,
    @UserIdOptional() userId: string
  ): Promise<BaseResponse<unknown>> {
    return baseResponseHelper(await this.outletService.updateOutletMaxOffer(request, userId));
  }

  @HttpCode(HttpStatus.OK)
  @Get('get-merchant-outlets/:id')
  @ApiEndpoint({
    summary: 'Get all outlets for a merchant',
    pathParams: [{ name: 'id', description: 'Merchant UUID', type: 'string' }],
  })
  async getMerchantOutlets(@Param('id', ParseUUIDPipe) merchant_id: string): Promise<BaseResponse<unknown[]>> {
    return baseResponseHelper(await this.outletGetService.getMerchantOutlets(merchant_id));
  }

  @HttpCode(HttpStatus.OK)
  @Get('get-merchant-logo/:outletId')
  @ApiEndpoint({
    summary: 'Get merchant logo for an outlet',
    pathParams: [{ name: 'outletId', description: 'Outlet UUID', type: 'string' }],
  })
  async getMerchantLogo(@Param('outletId', ParseUUIDPipe) outlet_id: string): Promise<BaseResponse<unknown>> {
    return baseResponseHelper(await this.outletGetService.getMerchantLogo(outlet_id));
  }

  @HttpCode(HttpStatus.OK)
  @Get('get-outlet-details-for-core/:outletId')
  @ApiEndpoint({
    summary: 'Get outlet details for core',
    pathParams: [{ name: 'outletId', description: 'Outlet UUID', type: 'string' }],
  })
  async getOutletDetailsForCore(@Param('outletId', ParseUUIDPipe) outlet_id: string): Promise<BaseResponse<unknown>> {
    return baseResponseHelper(await this.outletGetService.getOutletDetailForCore(outlet_id));
  }

  @HttpCode(HttpStatus.OK)
  @Post('migrate-offer')
  @ApiEndpoint({
    summary: 'Migrate outlet offer',
    bodyType: GetOutletDto,
  })
  async migrateOutletTiming(@Req() req: Request, @UserIdOptional() userId: string): Promise<BaseResponse<unknown>> {
    return baseResponseHelper(await this.outletMigrationService.migrateOffer(req.headers as Record<string, string>, userId));
  }

  @HttpCode(HttpStatus.OK)
  @Get('get-outlet-by-mid/:mId')
  @ApiEndpoint({
    summary: 'Get outlets by merchant ID',
    pathParams: [{ name: 'mId', description: 'Merchant UUID', type: 'string' }],
  })
  async getOutletByMid(@Param('mId') mId: string): Promise<BaseResponse<unknown>> {
    return baseResponseHelper(await this.outletGetService.getOutletsByMid(mId));
  }

  @HttpCode(HttpStatus.OK)
  @Post('get-outlets-basic-details')
  @ApiEndpoint({
    summary: 'Get basic details of outlets',
    bodyType: OutletsBasicDetailsDTO,
  })
  async getOutletsBasicDetails(@Body() body: OutletsBasicDetailsDTO): Promise<BaseResponse<unknown>> {
    return baseResponseHelper(await this.outletGetService.getOutletsBasicDetails(body?.outlets));
  }

  @HttpCode(HttpStatus.OK)
  @Post('get-merchant-outlet-details')
  @ApiEndpoint({
    summary: 'Get merchant and outlet important details for a list of outlet IDs',
    bodyType: GetMerchantOutletDetailsDto,
  })
  async getMerchantFilteredOutletDetails(@Body() body: GetMerchantOutletDetailsDto): Promise<
    BaseResponse<
      Array<{
        outletId: string;
        merchant: { id: string; name?: string; ar?: string; profileIds: string[] };
        outlet: { name?: string; ar?: string };
      }>
    >
  > {
    const data = await this.outletGetService.getMerchantOutletDetails(body.outletIds);
    return baseResponseHelper(data);
  }

  @HttpCode(HttpStatus.OK)
  @Get('get-outlet-name/:outletId')
  @ApiEndpoint({
    summary: 'Get outlet name by ID',
    pathParams: [{ name: 'outletId', description: 'Outlet UUID', type: 'string' }],
  })
  async getOutletName(@Param('outletId', ParseUUIDPipe) outlet_id: string): Promise<BaseResponse<unknown>> {
    return baseResponseHelper(await this.outletGetService.getOutletName(outlet_id));
  }

  @HttpCode(HttpStatus.OK)
  @Get('get-outlet-status/:outletId')
  @ApiEndpoint({
    summary: 'Get outlet status by ID',
    pathParams: [{ name: 'outletId', description: 'Outlet UUID', type: 'string' }],
  })
  async getOutletStatus(@Param('outletId', ParseUUIDPipe) outlet_id: string): Promise<BaseResponse<unknown>> {
    return baseResponseHelper(await this.outletGetService.getOutletStatus(outlet_id));
  }

  @HttpCode(HttpStatus.OK)
  @Get('current-outlet-profile/:outletId/profile/:profileId')
  @ApiEndpoint({
    summary: 'Get active outlet profile mapping',
    pathParams: [
      { name: 'outletId', description: 'Outlet UUID', type: 'string' },
      { name: 'profileId', description: 'Profile UUID', type: 'string' },
    ],
    queries: [
      { name: 'cardBin', description: 'Card BIN', required: false },
      { name: 'transactionDate', description: 'Transaction Date', required: false },
    ],
  })
  async getActiveOutletProfileMapping(
    @Param('outletId', ParseUUIDPipe) outletId: string,
    @Param('profileId', ParseUUIDPipe) profileId: string,
    @Query() query: GetOutletProfileQueryDto
  ): Promise<BaseResponse<unknown>> {
    const binPrefix = query.cardBin ? query.cardBin.slice(0, 6) : undefined;
    const parsedTransactionDate = query.transactionDate ? new Date(query.transactionDate) : null;
    return baseResponseHelper(
      await this.outletService.getActiveOutletProfile(outletId, profileId, parsedTransactionDate, binPrefix)
    );
  }

  @HttpCode(HttpStatus.OK)
  @Get('get-outlet-profiles/:outletId')
  @ApiEndpoint({
    summary: 'Get all outlet profiles by outlet ID',
    pathParams: [{ name: 'outletId', description: 'Outlet UUID', type: 'string' }],
    queries: [{ name: 'transactionDate', description: 'Transaction Date as string', required: false }],
  })
  async getAllOutletsProfiles(
    @Param('outletId', ParseUUIDPipe) outletId: string,
    @Query('transactionDate') transactionDate?: string
  ): Promise<BaseResponse<unknown>> {
    const parsedTransactionDate = transactionDate ? new Date(transactionDate) : null;
    return baseResponseHelper(await this.outletService.getAllOutletsProfiles(outletId, parsedTransactionDate));
  }

  @Get('merchant-outlet-details')
  @ApiEndpoint({
    summary: 'Get merchant outlet details',
  })
  async getMerchantOutletDetails(): Promise<BaseResponse<unknown>> {
    return baseResponseHelper(await this.outletService.getMerchantOutletDetails());
  }

  @HttpCode(HttpStatus.OK)
  @Get('get-by-profile/:id')
  @ApiEndpoint({
    summary: 'Get outlets by profile ID',
    pathParams: [{ name: 'id', description: 'Profile UUID', type: 'string' }],
  })
  async getByProfile(@Param('id', ParseUUIDPipe) profileId: string): Promise<BaseResponse<unknown[]>> {
    return baseResponseHelper(await this.outletProfileMappingService.findByProfileId(profileId));
  }

  @HttpCode(HttpStatus.OK)
  @Post('merchant-outlet-profile')
  @ApiEndpoint({
    summary: 'Map merchant outlet profile',
    bodyType: MerchantOutletProfilesDto,
  })
  async mapMerchantOutletProfile(@Body() request: MerchantOutletProfilesDto, @UserIdOptional() userId: string) {
    return baseResponseHelper(await this.outletProfileMappingService.saveMerchantOutletProfile(request, userId));
  }

  @Get('profile-mapping-count')
  @ApiEndpoint({
    summary: 'Get profile mapping count',
  })
  async getProfiles(@Req() req: Request): Promise<BaseResponse<unknown>> {
    const profiles = await this.outletProfileMappingService.fetchProfileMappingCount(req.headers as Record<string, string>);
    return baseResponseHelper(profiles);
  }

  @Post('outlet-profile-mappings')
  @ApiEndpoint({
    summary: 'Map outlet to profile',
    bodyType: OutletProfileMappingDto,
  })
  async mapOutletToProfile(
    @Body() dto: OutletProfileMappingDto,
    @UserIdOptional() userId: string
  ): Promise<BaseResponse<unknown>> {
    const response = await this.outletProfileMappingService.mapOutletToProfile(dto, userId);
    return baseResponseHelper(response);
  }
  @Get('get-merchant-id/outlet/:outletId')
  async getMerchantIdByOutletId(
    @Param('outletId', ParseUUIDPipe) outletId: string
  ): Promise<BaseResponse<{ merchantId: string }>> {
    const outlet = await this.outletGetService.getMerchantId(outletId);
    const merchantId = outlet ? outlet.merchantId : null;
    return baseResponseHelper({ merchantId });
  }

  @Get('active-fab-outlets')
  async getActiveFabOutletDetails() {
    const response = await this.outletService.getActiveFabOutlets();
    return baseResponseHelper(response);
  }
}
