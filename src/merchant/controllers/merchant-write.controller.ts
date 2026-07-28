import {
  Body,
  Controller,
  Delete,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseBoolPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
} from '@nestjs/common';

import { AuthHeaderService } from 'src/auth/services/auth.validator.service';
import { baseResponseHelper } from 'src/helpers/base-response.helper';
import { CreateMerchantCRM } from '../dtos/create-merchant-crm.dto';
import { UpdateMerchantOutletsNumberDto } from '../dtos/update-merchant-outlets-number.dto';
import { UpdateMerchantPaymentPlanDto } from '../dtos/update-merchant-payment-plan.dto';
import { UpdateMerchantDto } from '../dtos/update-merchant.dto';
import { MerchantService } from '../services/merchant.service';
import { UpdateMerchantStatusDto } from '../dtos/update-merchant-status.dto';
import { UserIdOptional } from 'src/auth/get-user-id.decorator';
import { MerchantPhotoService } from '../services/merchant-photo.service';
import { ApiEndpoint } from 'src/common/decorators/api-swagger';

/** Handles write operations for merchants (create, update, patch, delete). */
@Controller('merchants')
export class MerchantWriteController {
  constructor(
    private readonly merchantService: MerchantService,
    private readonly authHeaderService: AuthHeaderService,
    private readonly merchantPhotoService: MerchantPhotoService
  ) {}

  @HttpCode(HttpStatus.CREATED)
  @Post('create-crm')
  @ApiEndpoint({
    summary: 'Create Merchant with User from CRM',
    bodyType: CreateMerchantCRM,
  })
  async createMerchantWithUserFromCRM(@Body() data: CreateMerchantCRM) {
    await this.merchantService.createMerchantWithUserFromCRM(data);
  }

  @Put(':id')
  @ApiEndpoint({
    summary: 'Update Merchant',
    pathParams: [{ name: 'id', description: 'Merchant UUID', type: 'string' }],
    bodyType: UpdateMerchantDto,
  })
  async updateMerchant(
    @Body() data: UpdateMerchantDto,
    @Headers() headers: Record<string, string>,
    @Param('id', ParseUUIDPipe) id: string,
    @UserIdOptional() userId: string
  ) {
    const res = await this.merchantService.updateMerchant(id, data, headers, userId);
    return baseResponseHelper(res);
  }

  @Patch('/:id/status')
  @ApiEndpoint({
    summary: 'Update Merchant Status',
    pathParams: [{ name: 'id', description: 'Merchant UUID', type: 'string' }],
    bodyType: Object,
    exampleBody: {
      status: true,
    },
  })
  async updateMerchantStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status', ParseBoolPipe) status: boolean,
    @Headers('Authorization') token: string,
    @UserIdOptional() userId: string
  ) {
    const res = await this.merchantService.updateMerchantStatus(id, status, token, userId);
    return baseResponseHelper(res);
  }

  @Patch('reward-engine/:id/status')
  @ApiEndpoint({
    summary: 'Update Merchant Status',
    pathParams: [{ name: 'id', description: 'Merchant UUID', type: 'string' }],
    bodyType: Object,
    exampleBody: {
      status: true,
    },
  })
  async updateMerchantStatusRewardEngine(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status', ParseBoolPipe) status: boolean,
    @Headers('Authorization') token: string,
    @UserIdOptional() userId: string
  ) {
    const res = await this.merchantService.updateMerchantStatusRewardEngine(id, status, token, userId);
    return baseResponseHelper(res);
  }

  @Post('/:id/fast-payment-status')
  @ApiEndpoint({
    summary: 'Update Merchant Fast Payment Status',
    pathParams: [{ name: 'id', description: 'Merchant UUID', type: 'string' }],
    bodyType: Object,
    includeDeviceIdHeader: true,
    exampleBody: {
      status: true,
    },
  })
  async updateMerchantFastPaymentStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status', ParseBoolPipe) status: boolean,
    @Headers() headers: Record<string, string>,
    @UserIdOptional() userId: string
  ) {
    const res = await this.merchantService.updateMerchantFastPaymentStatus(id, status, headers, userId);
    return baseResponseHelper(res);
  }

  @Patch('/:id/outlets')
  @ApiEndpoint({
    summary: 'Update Merchant Outlets Number',
    pathParams: [{ name: 'id', description: 'Merchant UUID', type: 'string' }],
    bodyType: UpdateMerchantOutletsNumberDto,
  })
  async updateMerchantOutletsNumber(@Param('id', ParseUUIDPipe) id: string, @Body() body: UpdateMerchantOutletsNumberDto) {
    return this.merchantService.updateMerchantOutletsNumber(id, body);
  }

  @Patch(':id/payment-plan')
  @ApiEndpoint({
    summary: 'Update Merchant Payment Type',
    pathParams: [{ name: 'id', description: 'Merchant ID', type: 'string' }],
    bodyType: UpdateMerchantPaymentPlanDto,
  })
  async updateMerchantPaymentType(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateMerchantPaymentPlanDto,
    @Headers() headers: Record<string, string>
  ) {
    const updatedBy = await this.authHeaderService.getUserId(headers.authorization);
    const res = await this.merchantService.updateMerchantPaymentType(id, body.paymentPlan, updatedBy);
    return baseResponseHelper(res);
  }

  @Patch('update-status')
  @ApiEndpoint({
    summary: 'Update Merchant Status by ID',
    bodyType: UpdateMerchantStatusDto,
  })
  async updateMerchantStatusById(@Body() updateMerchantStatusDto: UpdateMerchantStatusDto) {
    const res = await this.merchantService.updateMerchantStatusById(updateMerchantStatusDto);
    return baseResponseHelper(res);
  }

  @Delete('/photo/:id')
  @ApiEndpoint({
    summary: 'Delete Merchant Photo by ID',
    pathParams: [{ name: 'id', description: 'Photo ID', type: 'string' }],
  })
  async DeleteMerchantPhotoById(@Param('id', ParseUUIDPipe) id: string) {
    const res = await this.merchantPhotoService.deleteMerchantPhotoById(id);
    return baseResponseHelper(res);
  }
}
