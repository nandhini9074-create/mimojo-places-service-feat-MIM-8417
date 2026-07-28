import { Controller, Get, Query } from "@nestjs/common";
import { ProfileService } from "./services/profile.service";
import { baseResponseHelper } from "src/helpers/base-response.helper";
import { PaginationDto } from "src/common/dtos/pagenation.dto";
import { SortDto } from "src/common/dtos/sort.dto";
import { ApiEndpoint } from "src/common/decorators/api-swagger";
import { sortExampleDto, paginationExampleDto } from "src/common/dtos/swagger-example.dto";


@Controller('profile')
export class ProfileController {
  constructor(
    private readonly profileService: ProfileService
  ) { }

  @Get('payday-profiles')
  @ApiEndpoint({
    summary: 'Get all payday profiles'
  })
  async getPaydayProfiles() {
    const res = await this.profileService.getPaydayProfiles();
    return baseResponseHelper(res);
  }

  @Get()
  @ApiEndpoint({
    summary: 'Get all profiles with sorting, pagination, and search',
    queries: [
      { name: 'search', description: 'Search keyword for category name', required: false },
      sortExampleDto(),
      ...paginationExampleDto()
    ],
  })
  async getAllProfiles(
    @Query() sortDto?: SortDto,
    @Query() paginationDto?: PaginationDto,
    @Query('search') searchQuery?: string
  ) {
    const res = await this.profileService.getAllProfiles(sortDto, paginationDto, searchQuery);
    return baseResponseHelper(res);
  }
}