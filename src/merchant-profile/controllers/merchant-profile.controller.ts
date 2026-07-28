import { Body, Controller, Delete, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { MerchantProfileService } from '../services/merchant-profile.service';
import { MerchantProfileMetadataDto } from '../dtos/create-merchant-profile-data.dto';
import { baseResponseHelper } from 'src/helpers/base-response.helper';
import { UpdateMerchantProfileStatusDto } from '../dtos/update-merchant-profile-status.dto';
import { GetMerchantsDto } from '../dtos/get-merchants-profile.dto';
import { CoordinateDto } from '../dtos/coordinate.dto';
import { UserIdOptional } from 'src/auth/get-user-id.decorator';
import { OutletProfileService } from 'src/outlet-profile/services/outlet-profile.service';
import { ApiEndpoint } from 'src/common/decorators/api-swagger';

@Controller('merchant-profile')
export class MerchantProfileController {
  constructor(
    private readonly merchantProfileService: MerchantProfileService,
    private readonly outletProfileService: OutletProfileService
  ) {}

  @Post('merchant/:merchantId/:profileId')
  @ApiEndpoint({
    summary: 'Get merchant profile details',
    bodyType: CoordinateDto,
    pathParams: [
      { name: 'merchantId', description: 'Merchant UUID' },
      { name: 'profileId', description: 'Profile UUID' },
    ],
  })
  async getMerchantProfileData(
    @Param('merchantId') merchantId: string,
    @Param('profileId') profileId: string,
    @Body('coordinate') coordinate: CoordinateDto
  ) {
    const res = await this.merchantProfileService.getMerchantDetails(merchantId, profileId, coordinate);
    return baseResponseHelper(res);
  }

  @Post('merchants/:profileId')
  @ApiEndpoint({
    summary: 'Get merchants profile data',
    bodyType: GetMerchantsDto,
    pathParams: [{ name: 'profileId', description: 'Profile UUID' }],
  })
  async getMerchantsProfileData(@Param('profileId') profileId: string, @Body() merchantFilters: GetMerchantsDto) {
    const res = await this.merchantProfileService.getMerchants(profileId, merchantFilters);
    return baseResponseHelper(res);
  }

  @Post()
  @ApiEndpoint({
    summary: 'Create or update merchant profile data',
    bodyType: MerchantProfileMetadataDto,
  })
  async createOrUpdateMerchantProfileData(
    @Body() merchantProfileMetadataDto: MerchantProfileMetadataDto,
    @UserIdOptional() userId: string
  ) {
    const res = await this.merchantProfileService.createOrUpdateMerchantProfileData(merchantProfileMetadataDto, userId);
    return baseResponseHelper(res);
  }

  @Patch(':merchantId/:profileId/update-status')
  @ApiEndpoint({
    summary: 'Update merchant profile status',
    bodyType: UpdateMerchantProfileStatusDto,
    pathParams: [
      { name: 'merchantId', description: 'Merchant UUID' },
      { name: 'profileId', description: 'Profile UUID' },
    ],
  })
  async updateMerchantProfileMetaDataStatus(
    @Param('merchantId') merchantId: string,
    @Param('profileId') profileId: string,
    @Body() dto: UpdateMerchantProfileStatusDto,
    @UserIdOptional() userId: string
  ) {
    const res = await this.merchantProfileService.updateMerchantProfileMetaDataStatus(
      merchantId,
      profileId,
      dto.status,
      userId
    );
    return baseResponseHelper(res);
  }

  @Delete(':photoId/photo')
  @ApiEndpoint({
    summary: 'Delete merchant profile photo',
    pathParams: [{ name: 'photoId', description: 'Photo ID' }],
  })
  async deleteMerchantProfilePhotoById(@Param('photoId') photoId: string) {
    const res = await this.merchantProfileService.deleteMerchantProfilePhotoById(photoId);
    return baseResponseHelper(res);
  }

  @Get('outlets/:merchantId/:profileId')
  @ApiEndpoint({
    summary: 'Get merchant profile outlets',
    pathParams: [
      { name: 'merchantId', description: 'Merchant UUID' },
      { name: 'profileId', description: 'Profile UUID' },
    ],
  })
  async getMerchantProfileOutlets(
    @Param('merchantId') merchantId: string,
    @Param('profileId') profileId: string,
    @Req() req: Request
  ) {
    const res = await this.outletProfileService.getMerchantProfileOutlets(
      merchantId,
      profileId,
      req.headers as Record<string, string>
    );
    return baseResponseHelper(res);
  }

  @Get('photos/:merchantProfileId')
  @ApiEndpoint({
    summary: 'Get merchant profile photos',
    pathParams: [{ name: 'merchantProfileId', description: 'Merchant Profile UUID' }],
  })
  async getMerchantProfilePhotos(@Param('merchantProfileId') merchantProfileId: string) {
    const res = await this.merchantProfileService.getMerchantProfilePhotos(merchantProfileId);
    return baseResponseHelper(res);
  }

  @Get(':merchantId/:profileId')
  @ApiEndpoint({
    summary: 'Get merchant profile metadata',
    pathParams: [
      { name: 'merchantId', description: 'Merchant UUID' },
      { name: 'profileId', description: 'Profile UUID' },
    ],
  })
  async getMerchantProfileMetaData(@Param('merchantId') merchantId: string, @Param('profileId') profileId: string) {
    const res = await this.merchantProfileService.getMerchantProfileMetaData(merchantId, profileId);
    return baseResponseHelper(res);
  }

  @Get('merchant-status/merchant/:merchantId/profile/:profileId')
  async getMerchantStatusByProfileId(@Param('merchantId') merchantId: string, @Param('profileId') profileId: string) {
    const res = await this.merchantProfileService.getMerchantStatusByProfileId(merchantId, profileId);
    return baseResponseHelper(res);
  }

  @Post('merchant-mop-max-offers/custom-offer-updated')
  @ApiEndpoint({
    summary: 'Update merchant profile hasCustomOffer and maxOfferValue',
  })
  async receiveMerchantMopMaxOffers(@Body() body: { updates: Array<any> }): Promise<{
    successCount: number;
    failedCount: number;
    failedItems: Array<{ merchantId: string; profileId: string }>;
  }> {
    const updates = body?.updates ?? [];
    return this.merchantProfileService.updateMerchantMopMaxOffersCustomOffer(updates);
  }
}
