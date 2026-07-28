import { Controller, Get, Param, ParseUUIDPipe, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { Pagination } from 'src/common/helpers/utils';
import { BaseResponse } from 'src/dtos/base-response';
import { baseResponseHelper } from 'src/helpers/base-response.helper';
import { CategoryService } from '../services/category.service';
import { Category } from '../models/category.model';
import { PaginationDto } from 'src/common/dtos/pagenation.dto';
import { SortDto } from 'src/common/dtos/sort.dto';
import { ApiEndpoint } from 'src/common/decorators/api-swagger';
import { sortExampleDto, paginationExampleDto } from 'src/common/dtos/swagger-example.dto';
import { User } from 'src/auth/get-user-id.decorator';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoryService) {}

  @Get()
  @ApiEndpoint({
    summary: 'Get all categories',
    description: 'Fetches all categories with optional pagination, sorting, and search.',
    queries: [
      { name: 'search', description: 'Search keyword for category name', required: false },
      sortExampleDto(),
      ...paginationExampleDto(),
    ],
    headers: [{ name: 'language', required: false, description: 'Language code for localization', example: 'en' }],
    exampleResponse: {
      data: [
        { id: 'uuid-1', name: 'Electronics' },
        { id: 'uuid-2', name: 'Clothing' },
      ],
      pagination: { page: 1, limit: 10, total: 2 },
    },
  })
  async getCategories(
    @Req() req: Request,
    @Query() sortDto?: SortDto,
    @Query() paginationDto?: PaginationDto,
    @Query('search') searchQuery?: string,
    @User() user?: any
  ): Promise<BaseResponse<{ data: Category[]; pagination: Pagination }>> {
    const res = await this.categoriesService.findAll(
      req.headers.language as string,
      sortDto,
      paginationDto,
      searchQuery,
      user
    );
    return baseResponseHelper(res);
  }

  @Get(':id/sub-categories')
  @ApiEndpoint({
    summary: 'Get sub-categories',
    description: 'Fetch sub-categories for a given category.',
    pathParams: [{ name: 'id', description: 'UUID of the category', type: 'string', example: 'category-uuid' }],
  })
  async getSubCategories(@Param('id', ParseUUIDPipe) categoryId: string) {
    const res = await this.categoriesService.getSubCategories(categoryId, false);
    return baseResponseHelper(res);
  }

  @Get(':id/mp-sub-categories')
  @ApiEndpoint({
    summary: 'Get MP sub-categories',
    description: 'Fetch marketplace sub-categories for a given category.',
    pathParams: [{ name: 'id', description: 'UUID of the category', type: 'string' }],
  })
  async getMpSubCategories(@Param('id', ParseUUIDPipe) categoryId: string) {
    const res = await this.categoriesService.getSubCategories(categoryId, false);
    return baseResponseHelper(res);
  }

  @Get('overridable-sub-categories/:id')
  @ApiEndpoint({
    summary: 'Get overridable sub-categories',
    description: 'Fetch sub-categories that can be overridden for a merchant.',
    pathParams: [{ name: 'id', description: 'UUID of the merchant', type: 'string' }],
  })
  async getOverridableSubCategories(@Param('id', ParseUUIDPipe) merchantId: string) {
    const result = await this.categoriesService.getOverridableSubCategories(merchantId);
    return baseResponseHelper(result);
  }
}
