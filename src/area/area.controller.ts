import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AreaService } from './services/area.service';
import { baseResponseHelper } from 'src/helpers/base-response.helper';
import { UpsertNeighbourhoodDto } from '../neighbourhood/dtos/upsert-neighbourhood-dto';
import { BaseResponse } from 'src/dtos/base-response';
import { Sequelize } from 'sequelize-typescript';
import { Transaction } from 'sequelize';
import { ApiEndpoint } from 'src/common/decorators/api-swagger';

@Controller({ version: '1', path: 'area' })
export class AreaController {
  constructor(
    private readonly areaService: AreaService,
    private readonly sequelize: Sequelize
  ) {}

  @HttpCode(HttpStatus.OK)
  @Get('get-all-area-neighbourhood')
  @ApiEndpoint({
    summary: 'Get all areas with neighbourhood details',
  })
  async GetAreaNeighbourhood(): Promise<BaseResponse<unknown>> {
    return baseResponseHelper(await this.areaService.findAllAreas());
  }

  @HttpCode(HttpStatus.OK)
  @Get()
  @ApiEndpoint({
    summary: 'Get all areas with neighbourhood details',
  })
  async GetAllAreaNeighbourhood(): Promise<BaseResponse<unknown>> {
    return baseResponseHelper(await this.areaService.findAreas());
  }

  @HttpCode(HttpStatus.OK)
  @Post('neighbourhood')
  @ApiEndpoint({
    summary: 'Upsert area neighbourhood',
    bodyType: UpsertNeighbourhoodDto,
  })
  async UpsertAreaNeighbourhood(@Body() request: UpsertNeighbourhoodDto): Promise<BaseResponse<unknown>> {
    return this.sequelize.transaction(async (transaction: Transaction) => {
      return baseResponseHelper(await this.areaService.upsertNeighbourhood(request, transaction));
    });
  }
}
