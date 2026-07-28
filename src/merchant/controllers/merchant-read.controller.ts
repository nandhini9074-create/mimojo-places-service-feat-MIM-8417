import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { AuthHeaderService } from 'src/auth/services/auth.validator.service';
import { Pagination } from 'src/common/helpers/utils';
import { baseResponseHelper } from 'src/helpers/base-response.helper';
import { MERCHANT_DETAILS_FILTER_INCLUDE } from '../constants/merchant-details-filter-include';
import { GetAllMerchantsDto } from '../dtos/get-all-merchants.dto';
import { MerchantService } from '../services/merchant.service';
import { SortDto } from 'src/common/dtos/sort.dto';
import { PaginationDto } from 'src/common/dtos/pagenation.dto';
import { User } from 'src/auth/get-user-id.decorator';
import { MerchantPhotoService } from '../services/merchant-photo.service';
import { GroupMerchantService } from '../shared/group-merchant.service';
import { ApiEndpoint } from 'src/common/decorators/api-swagger';
import { getAllMerchantsExampleDto, paginationExampleDto, sortExampleDto } from 'src/common/dtos/swagger-example.dto';

/** Handles read-only merchant endpoints (GET and read-like POST). */
@Controller('merchants')
export class MerchantReadController {
  constructor(
    private readonly merchantService: MerchantService,
    private readonly authHeaderService: AuthHeaderService,
    private readonly merchantPhotoService: MerchantPhotoService,
    private readonly groupMerchantService: GroupMerchantService
  ) {}

  @Get('/sales-owners')
  @ApiEndpoint({
    summary: 'Get Sales Owners',
    queries: [
      { name: 'page', description: 'Page number', required: true, example: 1 },
      { name: 'limit', description: 'Number of items per page', required: true, example: 10 },
      { name: 'country', description: 'Country code', required: true, example: 'US' },
    ],
  })
  async getSalesOwners(
    @Query('page', ParseIntPipe) page: number,
    @Query('limit', ParseIntPipe) limit: number,
    @Query('country') country: string
  ) {
    const res = await this.merchantService.getSalesOwners({ page: +page, limit: +limit }, country);
    return baseResponseHelper(res);
  }

  @HttpCode(HttpStatus.OK)
  @Get()
  @ApiEndpoint({
    summary: 'Get All Merchants',
    queries: [sortExampleDto(), ...getAllMerchantsExampleDto(), ...paginationExampleDto()],
  })
  async getAllMerchants(
    @Query() customFilters?: GetAllMerchantsDto,
    @Query() sortDto?: SortDto,
    @Query() paginationDto?: PaginationDto
  ): Promise<{ data: unknown[]; pagination: Pagination }> {
    return this.merchantService.getAllMerchants(customFilters, sortDto, paginationDto);
  }

  @Get('mp-merchant-users')
  @ApiEndpoint({
    summary: 'Get Merchant User Merchants',
    authRequired: true,
    queries: [sortExampleDto(), ...getAllMerchantsExampleDto(), ...paginationExampleDto()],
  })
  async getMerchantUserMerchant(
    @User() user,
    @Query() customFilters?: GetAllMerchantsDto,
    @Query() sortDto?: SortDto,
    @Query() paginationDto?: PaginationDto
  ): Promise<{ data: unknown[]; pagination: Pagination }> {
    return await this.groupMerchantService.getAllMerchants(customFilters, sortDto, paginationDto, null, user);
  }

  @Get('/outlet-links/list')
  async getOutletLinksByMerchantId(@Headers() headers: Record<string, string>) {
    const userId = await this.authHeaderService.getUserId(headers.authorization);
    const res = await this.merchantService.getOutletLinksByUserId(userId);
    return baseResponseHelper(res);
  }

  @Get('/photos/:merchantId')
  @ApiEndpoint({
    summary: 'Get Merchant Photos by ID',
    pathParams: [{ name: 'merchantId', description: 'Merchant UUID', type: 'string' }],
  })
  async getMerchantPhotos(@Param('merchantId', ParseUUIDPipe) merchantId: string) {
    const res = await this.merchantPhotoService.getMerchantPhotos(merchantId);
    return baseResponseHelper(res);
  }

  @Get(':id/data')
  @ApiEndpoint({
    summary: 'Get Merchant Data by ID',
    pathParams: [{ name: 'id', description: 'Merchant UUID', type: 'string' }],
  })
  async getMerchantDataById(@Param('id', ParseUUIDPipe) id: string) {
    const res = await this.merchantService.getMerchantDataById(id);
    return baseResponseHelper(res);
  }

  @HttpCode(HttpStatus.OK)
  @Get('/:id')
  @ApiEndpoint({
    summary: 'Get Merchant by ID',
    pathParams: [{ name: 'id', description: 'Merchant UUID', type: 'string' }],
  })
  async getMerchant(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.merchantService.getMerchant(id);
    return baseResponseHelper(data);
  }

  @Get('/:id/categories')
  @ApiEndpoint({
    summary: 'Get Merchant Categories',
    pathParams: [{ name: 'id', description: 'Merchant UUID', type: 'string' }],
  })
  async getMerchantCategories(@Param('id', ParseUUIDPipe) id: string) {
    const res = await this.merchantService.getMerchantById(id);
    return baseResponseHelper(res);
  }

  @Get('/:id/details')
  @ApiEndpoint({
    summary: 'Get Merchant Details',
    pathParams: [{ name: 'id', description: 'Merchant UUID', type: 'string' }],
  })
  async getMerchantDetails(@Param('id', ParseUUIDPipe) id: string) {
    const res = await this.merchantService.getMerchantDetailsById(id, {
      include: [MERCHANT_DETAILS_FILTER_INCLUDE],
    });
    return baseResponseHelper(res);
  }

  @HttpCode(HttpStatus.OK)
  @Post('get-group-by-merchants')
  @ApiEndpoint({
    summary: 'Get Group IDs by Merchant IDs',
    bodyType: Array<string>,
    exampleBody: ['merchant-id-1', 'merchant-id-2'],
  })
  async getGroupByMerchantIds(@Body() merchantIds: string[]) {
    return baseResponseHelper(await this.merchantService.getGroupIdsByMerchantIds(merchantIds));
  }

  @HttpCode(HttpStatus.OK)
  @Post('get-merchant-names')
  @ApiEndpoint({
    summary: 'Get Merchant Names by IDs',
    bodyType: Object,
    exampleBody: { merchantIds: ['merchant-id-1', 'merchant-id-2'] },
  })
  async getMerchantNames(@Body() data: { merchantIds: string[] }) {
    const res = await this.merchantService.getMerchantNames(data?.merchantIds);
    return baseResponseHelper(res);
  }
}
