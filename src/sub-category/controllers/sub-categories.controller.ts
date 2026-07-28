import { Controller, Get, Query } from '@nestjs/common';
import { SubCategoryService } from '../services/sub-category.service';
import { PaginationDto } from 'src/common/dtos/pagenation.dto';
import { SortDto } from 'src/common/dtos/sort.dto';
import { ApiEndpoint } from 'src/common/decorators/api-swagger';
import { sortExampleDto, paginationExampleDto } from 'src/common/dtos/swagger-example.dto';
@Controller('sub-categories')
export class SubCategoriesController {
  constructor(private readonly subCategoryService: SubCategoryService) {}

  @Get()
  @ApiEndpoint({
    summary: 'Get all sub categories',
    queries: [
      { name: 'search', description: 'Search keyword for category name', required: false },
      sortExampleDto(),
      ...paginationExampleDto()
    ]
  })
  async findAll(@Query() sortDto?: SortDto, @Query() paginationDto?: PaginationDto, @Query('search') search?: string) {
    return this.subCategoryService.findAll(sortDto, paginationDto, search);
  }
}
