import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { Sequelize } from 'sequelize-typescript';
import { Transaction } from 'sequelize';
import { BaseResponse } from 'src/dtos/base-response';
import { FavoriteOutletService } from 'src/favorite-outlet/services/favorite-outlet.service';
import { baseResponseHelper } from 'src/helpers/base-response.helper';
import { UserId, UserIdOptional } from 'src/auth/get-user-id.decorator';
import { GetOutletDetailsDto } from './dtos/get-outlet-details-dto';
import { GetOutletRequestDto } from './dtos/get-outlet-dto';
import { DiscoveryService } from './services/discovery.service';
import { CategoryService } from 'src/category/services/category.service';
import { ApiEndpoint } from 'src/common/decorators/api-swagger';

@Controller({ version: '1', path: 'discovery' })
export class DiscoveryOutletController {
  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly favoriteOutletService: FavoriteOutletService,
    private readonly sequelize: Sequelize,
    private readonly categoryService: CategoryService
  ) {}

  @HttpCode(HttpStatus.OK)
  @Post('mark-favorite-outlet')
  @ApiEndpoint({
    summary: 'Mark outlet as favorite',
    bodyType: GetOutletDetailsDto,
    authRequired: true,
  })
  async markFavoriteOutlet(
    @UserId() userId: string,
    @Body() request: { outletId: string; isFavorite: boolean }
  ): Promise<BaseResponse<unknown>> {
    await this.sequelize.transaction(async (transaction: Transaction) => {
      await this.favoriteOutletService.markFavorite(userId, request.outletId, request.isFavorite, transaction);
    });
    return baseResponseHelper(null);
  }

  @HttpCode(HttpStatus.OK)
  @Post('get-outlet-details')
  @ApiEndpoint({
    summary: 'Get outlet details',
    bodyType: GetOutletDetailsDto,
  })
  async getOutletDetails(
    @UserIdOptional() userId: string,
    @Body() request: GetOutletDetailsDto,
    @Req() req: Request
  ): Promise<BaseResponse<unknown>> {
    return baseResponseHelper(
      await this.discoveryService.getOutletDetailsForDiscovery(userId, request, req.headers as Record<string, string>)
    );
  }

  @HttpCode(HttpStatus.OK)
  @Post('get-outlet-details/reward-engine')
  @ApiEndpoint({
    summary: 'Get outlet details',
    bodyType: GetOutletDetailsDto,
  })
  async getOutletDetailsRewardEngine(
    @UserIdOptional() userId: string,
    @Body() request: GetOutletDetailsDto,
    @Req() req: Request
  ): Promise<BaseResponse<unknown>> {
    return baseResponseHelper(
      await this.discoveryService.getOutletDetailsForDiscoveryRewardEngine(
        userId,
        request,
        req.headers as Record<string, string>
      )
    );
  }

  /**
   * @deprecated This endpoint is deprecated and will be removed in future versions.
   */
  @HttpCode(HttpStatus.OK)
  @Post('get-outlet')
  @ApiEndpoint({
    summary: 'Get outlet',
    bodyType: GetOutletRequestDto,
  })
  async getOutlet(
    @UserIdOptional() userId: string,
    @Body() request: GetOutletRequestDto,
    @Req() req: Request
  ): Promise<BaseResponse<unknown>> {
    return baseResponseHelper(await this.discoveryService.getOutletV2(userId, request, req.headers.language as string));
  }

  @HttpCode(HttpStatus.OK)
  @Post('get-specific-outlet')
  @ApiEndpoint({
    summary: 'Get specific outlet',
    bodyType: GetOutletRequestDto,
  })
  async getSpecificOutlet(
    @UserIdOptional() userId: string,
    @Body() request: GetOutletRequestDto
  ): Promise<BaseResponse<unknown>> {
    return baseResponseHelper(await this.discoveryService.getSpecificOutlet(userId, request));
  }

  @HttpCode(HttpStatus.OK)
  @Get('get-outlet-review/:outletId')
  @ApiEndpoint({
    summary: 'Get outlet review',
    pathParams: [
      {
        name: 'outletId',
        description: 'Outlet ID',
        type: 'string',
        example: 'uuid-outlet',
      },
    ],
    headers: [{ name: 'language', description: 'Bearer token for user authentication', required: false, example: 'en' }],
  })
  async getOutletReview(@Param('outletId') outletId: string, @Req() req: Request): Promise<BaseResponse<unknown>> {
    return baseResponseHelper(await this.discoveryService.getOutletReview(outletId, req?.headers?.language as string));
  }

  @Get('sub-categories/:id')
  @ApiEndpoint({
    summary: 'Get sub-categories',
    pathParams: [
      {
        name: 'id',
        description: 'Category ID',
        type: 'string',
        example: 'category-uuid',
      },
    ],
    queries: [
      {
        name: 'cityId',
        description: 'City ID',
        required: true,
        example: 'city-uuid',
      },
    ],
    headers: [{ name: 'language', description: 'Bearer token for user authentication', required: false, example: 'en' }],
  })
  async getSubCategoriesHasOutlet(
    @Param('id', ParseUUIDPipe) categoryId: string,
    @Query('cityId') cityId: string,
    @Req() req: Request
  ): Promise<BaseResponse<unknown>> {
    const res = await this.categoryService.getSubCategoriesHasOutlet(categoryId, cityId, req.headers.language as string);
    return baseResponseHelper(res);
  }

  @HttpCode(HttpStatus.OK)
  @Post('outlets')
  @ApiEndpoint({
    summary: 'Get outlets',
    bodyType: GetOutletRequestDto,
    headers: [{ name: 'language', description: 'Bearer token for user authentication', required: true, example: 'en' }],
  })
  async outlets(@Body() request: GetOutletRequestDto, @Req() req: Request): Promise<BaseResponse<unknown>> {
    return baseResponseHelper(await this.discoveryService.getOutletV3(request, req.headers.language as string));
  }
}
