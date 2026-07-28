import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { OutletProfileService } from '../services/outlet-profile.service';
import { baseResponseHelper } from 'src/helpers/base-response.helper';
import { GetOutletDto } from 'src/outlet/dtos/get-outlet-dto';
import { CreateOutletProfileDto } from '../dtos/create-outlet-profile-metadata.dto';
import { UserIdOptional } from 'src/auth/get-user-id.decorator';
import { UpdateOutletProfileStatusDto } from '../dtos/update-outlet-profile-status.dto';
import { OutletService } from 'src/outlet/services/outlet.service';
import { ResetOutletProfileDto } from '../dtos/reset-outlet-profile.dto';
import { ApiEndpoint } from 'src/common/decorators/api-swagger';

@Controller('outlet-profile')
export class OutletProfileController {
  constructor(
    private readonly outletProfileService: OutletProfileService,
    private readonly outletService: OutletService
  ) {}

  @Get('details/outlet/:outletId/profile/:profileId')
  @ApiEndpoint({
    summary: 'Get outlet profile metadata',
    description: 'Retrieve outlet profile metadata for a given outlet and profile.',
    pathParams: [
      { name: 'outletId', description: 'UUID of the outlet', type: 'string' },
      { name: 'profileId', description: 'UUID of the profile', type: 'string' },
    ],
  })
  async getOutletProfileMetadata(
    @Param('outletId') outletId: string,
    @Param('profileId') profileId: string,
    @Req() req: Request
  ) {
    const res = await this.outletProfileService.getOutletProfileMetadata(
      outletId,
      profileId,
      req?.headers as Record<string, string>
    );
    return baseResponseHelper(res);
  }
  @Get('details/outlet/reward-engine/:outletId/profile/:profileId')
  @ApiEndpoint({
    summary: 'Get outlet profile metadata',
    description: 'Retrieve outlet profile metadata for a given outlet and profile.',
    pathParams: [
      { name: 'outletId', description: 'UUID of the outlet', type: 'string' },
      { name: 'profileId', description: 'UUID of the profile', type: 'string' },
    ],
  })
  async getOutletProfileMetadataRewardEngine(
    @Param('outletId') outletId: string,
    @Param('profileId') profileId: string,
    @Req() req: Request
  ) {
    const res = await this.outletProfileService.getOutletProfileMetadataRewardEngine(
      outletId,
      profileId,
      req?.headers as Record<string, string>
    );
    return baseResponseHelper(res);
  }

  @Get(':outletId/:profileId')
  @ApiEndpoint({
    summary: 'Get outlet details metadata',
    description: 'Retrieve detailed outlet metadata for a given outlet and profile.',
    pathParams: [
      { name: 'outletId', description: 'UUID of the outlet', type: 'string' },
      { name: 'profileId', description: 'UUID of the profile', type: 'string' },
    ],
  })
  async getOutletDetailsMetadata(@Param('outletId') outletId: string, @Param('profileId') profileId: string) {
    const res = await this.outletProfileService.getOutletDetailsMetadata(outletId, profileId);
    return baseResponseHelper(res);
  }

  @HttpCode(HttpStatus.OK)
  @Post('get-profile-outlets/merchant/:merchantId/profile/:profileId')
  @ApiEndpoint({
    summary: 'Get profile outlets',
    description: 'Retrieve all outlets belonging to a merchant under a profile.',
    bodyType: GetOutletDto,
    pathParams: [
      { name: 'merchantId', description: 'UUID of the merchant', type: 'string' },
      { name: 'profileId', description: 'UUID of the profile', type: 'string' },
    ],
  })
  async getProfileOutlets(
    @Param('merchantId', ParseUUIDPipe) merchantId: string,
    @Param('profileId', ParseUUIDPipe) profileId: string,
    @Body() dto: GetOutletDto,
    @Req() req: Request
  ) {
    const res = await this.outletProfileService.getProfileOutlets(
      merchantId,
      profileId,
      dto,
      req.headers as Record<string, string>
    );
    return baseResponseHelper(res);
  }

  @Post()
  @ApiEndpoint({
    summary: 'Create or update outlet profile metadata',
    description: 'Creates or updates metadata for a given outlet profile.',
    bodyType: CreateOutletProfileDto,
  })
  async createOrUpdateOutletProfileMetadata(@Body() dto: CreateOutletProfileDto, @UserIdOptional() userId: string) {
    const res = await this.outletProfileService.createOrUpdateOutletProfileMetadata(dto, userId);
    await this.outletProfileService.updateOutletProfileCountByMerchant(dto.merchantId, dto.profileId);
    await this.outletService.createOutletProfileById(dto.outletId, dto.profileId, userId);
    return baseResponseHelper(res);
  }

  @HttpCode(HttpStatus.OK)
  @Post('update-status')
  @ApiEndpoint({
    summary: 'Update outlet profile status',
    description: 'Update the status of an outlet profile (e.g., active/inactive).',
    bodyType: UpdateOutletProfileStatusDto,
  })
  async updateOutletProfileStatus(
    @Body() statusDto: UpdateOutletProfileStatusDto,
    @Req() req: Request,
    @UserIdOptional() userId: string
  ) {
    const res = await this.outletProfileService.validateAndUpdateOutletProfileStatus(
      statusDto,
      req.headers as Record<string, string>,
      userId
    );
    return baseResponseHelper(res);
  }
  @HttpCode(HttpStatus.OK)
  @Post('update-status/reward-engine')
  @ApiEndpoint({
    summary: 'Update outlet profile status',
    description: 'Update the status of an outlet profile (e.g., active/inactive).',
    bodyType: UpdateOutletProfileStatusDto,
  })
  async updateOutletProfileStatusRewardEngine(
    @Body() statusDto: UpdateOutletProfileStatusDto,
    @Req() req: Request,
    @UserIdOptional() userId: string
  ) {
    const res = await this.outletProfileService.validateAndUpdateOutletProfileStatusRewardEngine(
      statusDto,
      req.headers as Record<string, string>,
      userId
    );
    return baseResponseHelper(res);
  }

  @HttpCode(HttpStatus.OK)
  @Post('reset')
  @ApiEndpoint({
    summary: 'Reset outlet profile details',
    description: 'Resets outlet profile details back to default values.',
    bodyType: ResetOutletProfileDto,
  })
  async resetOutletProfileDetails(
    @Body() dto: ResetOutletProfileDto,
    @UserIdOptional() userId: string,
    @Req() req: Request
  ) {
    const res = await this.outletProfileService.resetOutletProfileDetails(
      dto,
      userId,
      req?.headers as Record<string, string>
    );
    return baseResponseHelper(res);
  }

  @Get('outlet-status/outlet/:outletId/profile/:profileId')
  async getOutletStatusByProfileId(@Param('outletId') outletId: string, @Param('profileId') profileId: string) {
    const res = await this.outletProfileService.getOutletStatusByProfileId(outletId, profileId);
    return baseResponseHelper(res);
  }
}
