import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { BaseResponse } from 'src/dtos/base-response';
import { AreaService } from 'src/area/services/area.service';
import { CategoryService } from 'src/category/services/category.service';
import { GetCitiesDto } from './dtos/get-cities-dto';
import { baseResponseHelper } from 'src/helpers/base-response.helper';
import { ApiEndpoint } from 'src/common/decorators/api-swagger';

@Controller({ version: '1', path: 'discovery' })
export class DiscoveryCityController {
  constructor(
    private readonly areaService: AreaService,
    private readonly categoryService: CategoryService
  ) {}

  @HttpCode(HttpStatus.OK)
  @Post('get-cities')
  @ApiEndpoint({
    summary: 'Get all cities',
    bodyType: GetCitiesDto,
    headers: [{ name: 'language', description: 'Language code', required: false, example: 'en' }],
  })
  async getAllCities(@Body() request: GetCitiesDto, @Req() req: Request): Promise<BaseResponse<unknown>> {
    return baseResponseHelper(
      await this.areaService.findCitiesWithCoordicatesDefault(request?.lat, request?.lng, req.headers.language as string)
    );
  }

  @HttpCode(HttpStatus.OK)
  @Post('get-cities-including-qatar')
  @ApiEndpoint({
    summary: 'Get all cities including Qatar',
    bodyType: GetCitiesDto,
    headers: [{ name: 'language', description: 'Language code', required: false, example: 'en' }],
  })
  async getAllCitiesV2(@Body() request: GetCitiesDto, @Req() req: Request): Promise<BaseResponse<unknown>> {
    return baseResponseHelper(
      await this.areaService.findCitiesWithCoordicatesDefaultIncludingQatar(
        request?.lat,
        request?.lng,
        req.headers.language as string
      )
    );
  }

  @HttpCode(HttpStatus.OK)
  @Post('get-all-cities')
  @ApiEndpoint({
    summary: 'Get all cities',
    bodyType: GetCitiesDto,
  })
  async getCities(): Promise<BaseResponse<unknown>> {
    return baseResponseHelper(await this.areaService.findAllCities());
  }

  @HttpCode(HttpStatus.OK)
  @Get('cities-categories')
  @ApiEndpoint({
    summary: 'Get cities and categories',
  })
  async getCitiesAndCategories(): Promise<BaseResponse<unknown>> {
    const cities = await this.areaService.findAllCityNames();
    const categories = await this.categoryService.getAllCategories();
    return baseResponseHelper({ cities, categories });
  }
}
