import { Body, Controller, Delete, Get, Headers, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { PaginationDto } from 'src/common/dtos/pagenation.dto';
import { SortDto } from 'src/common/dtos/sort.dto';
import { GetAllMerchantsDto } from 'src/merchant/dtos/get-all-merchants.dto';
import { baseResponseHelper } from 'src/helpers/base-response.helper';

import { CreateGroupDto } from '../dtos/create-group.dto';
import { UpdateGroupLogoDto } from '../dtos/update-group-logo.dto';
import { UpdateGroupDto } from '../dtos/update-group.dto';
import { GroupService } from '../services/group.service';
import { AuthHeaderService } from 'src/auth/services/auth.validator.service';
import { ApiEndpoint } from 'src/common/decorators/api-swagger';
import { sortExampleDto, getAllMerchantsExampleDto, paginationExampleDto } from 'src/common/dtos/swagger-example.dto';

@Controller('groups')
export class GroupsController {
  constructor(
    public readonly groupService: GroupService,
    private readonly authHeaderService: AuthHeaderService
  ) {}

  @Get()
  @ApiEndpoint({
    summary: 'Get all groups',
    queries: [
      { name: 'search', description: 'Search keyword for category name', required: false },
      sortExampleDto(),
      ...paginationExampleDto(),
    ],
  })
  async getGroups(
    @Query() sortDto?: SortDto,
    @Query() paginationDto?: PaginationDto,
    @Query('search') searchQuery?: string
  ) {
    const res = await this.groupService.findAll(sortDto, paginationDto, searchQuery);
    return baseResponseHelper(res);
  }

  @Post()
  @ApiEndpoint({
    summary: 'Create a new group',
    bodyType: CreateGroupDto,
  })
  async create(@Body() createGroupDto: CreateGroupDto, @Headers() headers: Record<string, string>) {
    const updatedBy = await this.authHeaderService.getUserId(headers.authorization);
    await this.groupService.create(createGroupDto, updatedBy);
  }

  @Get('list')
  @ApiEndpoint({
    summary: 'Get all groups with merchants',
    queries: [
      { name: 'search', description: 'Search keyword for category name', required: false },
      sortExampleDto(),
      ...paginationExampleDto(),
    ],
  })
  async getGroupsWithMerchants(
    @Query() sortDto?: SortDto,
    @Query() paginationDto?: PaginationDto,
    @Query('search') searchQuery?: string
  ) {
    const res = await this.groupService.findAllGroupWithMerchants(searchQuery, paginationDto, sortDto);
    return baseResponseHelper(res);
  }

  @Get('details')
  @ApiEndpoint({
    summary: 'Get group details',
    queries: [
      { name: 'groupId', description: 'ID of the group', required: true, example: 'group-uuid' },
      sortExampleDto(),
      ...getAllMerchantsExampleDto(),
      ...paginationExampleDto(),
    ],
  })
  async getGroupDetails(
    @Query('groupId', ParseUUIDPipe) groupId: string,
    @Query() customFilters?: GetAllMerchantsDto,
    @Query() sortDto?: SortDto,
    @Query() paginationDto?: PaginationDto
  ) {
    const res = await this.groupService.getGroupDetails(customFilters, groupId, sortDto, paginationDto);
    return baseResponseHelper(res);
  }

  @Post('add')
  @ApiEndpoint({
    summary: 'Add merchants to a group',
    bodyType: CreateGroupDto,
  })
  async insert(@Body() createGroupDto: CreateGroupDto, @Headers() headers: Record<string, string>) {
    const updatedBy = await this.authHeaderService.getUserId(headers.authorization);
    return baseResponseHelper(await this.groupService.insert(createGroupDto, updatedBy));
  }

  @Patch('logo')
  @ApiEndpoint({
    summary: 'Update group logo',
    bodyType: UpdateGroupLogoDto,
  })
  async updateLogo(@Body() updateGroupLogoDto: UpdateGroupLogoDto, @Headers() headers: Record<string, string>) {
    const updatedBy = await this.authHeaderService.getUserId(headers.authorization);
    return baseResponseHelper(await this.groupService.updateLogo(updateGroupLogoDto, updatedBy));
  }

  @Patch()
  @ApiEndpoint({
    summary: 'Update group details',
    bodyType: UpdateGroupDto,
  })
  async update(@Body() updateGroupDto: UpdateGroupDto, @Headers() headers: Record<string, string>) {
    const updatedBy = await this.authHeaderService.getUserId(headers.authorization);
    return baseResponseHelper(await this.groupService.update(updateGroupDto, updatedBy));
  }

  @Delete()
  @ApiEndpoint({
    summary: 'Delete a group',
    queries: [{ name: 'groupId', description: 'ID of the group', required: true, example: 'group-uuid' }],
  })
  async delete(@Query('groupId', ParseUUIDPipe) groupId: string, @Headers() headers: Record<string, string>) {
    const updatedBy = await this.authHeaderService.getUserId(headers.authorization);
    return baseResponseHelper(await this.groupService.delete(groupId, updatedBy));
  }
}
