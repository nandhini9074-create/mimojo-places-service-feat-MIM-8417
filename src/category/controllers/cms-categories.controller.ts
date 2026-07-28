import { Body, Controller, Get, Param, ParseUUIDPipe, Put, Query } from '@nestjs/common';
import { CategoryService } from '../services/category.service';
import { baseResponseHelper } from 'src/helpers/base-response.helper';
import { CmsUpdateCategoryDto } from '../dtos/cms-update-category.dto';
import { PaginationDto } from 'src/common/dtos/pagenation.dto';
import { SortDto } from 'src/common/dtos/sort.dto';
import { UserIdOptional } from 'src/auth/get-user-id.decorator';
import { ApiEndpoint } from 'src/common/decorators/api-swagger';
import { sortExampleDto, paginationExampleDto } from 'src/common/dtos/swagger-example.dto';

@Controller('cms/categories')
export class CMSCategoriesController {
  constructor(private readonly categoriesService: CategoryService) {}

  @Get()
  @ApiEndpoint({
    summary: 'Get all CMS categories',
    description: 'Fetch a paginated list of categories for CMS with sorting and search.',
    queries: [
      { name: 'search', description: 'Search keyword for category name', required: false },
      sortExampleDto(),
      ...paginationExampleDto()
    ]
  })
  async findAllCategories( @Query() sortDto?: SortDto,
  @Query() paginationDto?: PaginationDto,
  @Query('search') searchQuery?: string) {
    const res = await this.categoriesService.cmsFindAllCategories(sortDto,paginationDto,searchQuery);
    return baseResponseHelper(res);
  }

  @Get(':id')
  @ApiEndpoint({
    summary: 'Get one CMS category',
    description: 'Retrieve details for a specific category in CMS by ID.',
    pathParams: [{ name: 'id', description: 'UUID of the category', type: 'string' }]
  })
  async findOneCategory(@Param('id', ParseUUIDPipe) id: string) {
    const res = await this.categoriesService.cmsFindOneCategory(id);
    return baseResponseHelper(res);
  }

  @Put(':id')
  @ApiEndpoint({
    summary: 'Update CMS category',
    description: 'Update details of a CMS category by ID.',
    bodyType: CmsUpdateCategoryDto,
    pathParams: [{ name: 'id', description: 'UUID of the category', type: 'string' }]
  })
  async updateCategory(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: CmsUpdateCategoryDto,
    @UserIdOptional() userId
  ) {
    const res = await this.categoriesService.cmsUpdateCategory(id, body, userId);
    return baseResponseHelper(res);
  }
}
