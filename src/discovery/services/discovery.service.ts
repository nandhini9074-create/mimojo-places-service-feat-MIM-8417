import { Injectable } from '@nestjs/common';
import { Outlet } from 'src/outlet/models/outlet.model';
import { GetOutletDetailsDto } from '../dtos/get-outlet-details-dto';
import { GetOutletRequestDto } from '../dtos/get-outlet-dto';
import { DiscoveryDetailsService } from './discovery-details.service';
import { DiscoveryListingService } from './discovery-listing.service';

@Injectable()
export class DiscoveryService {
  constructor(
    private readonly listingService: DiscoveryListingService,
    private readonly detailsService: DiscoveryDetailsService
  ) {}

  /*
   * @deprecated This endpoint is deprecated and will be removed in future versions.
   */
  async getOutletV2(userId: string, getOutletRequestDto: GetOutletRequestDto, preferredLanguage: string): Promise<unknown> {
    return this.listingService.getOutletV2(userId, getOutletRequestDto, preferredLanguage);
  }

  async getOutletV3(getOutletRequestDto: GetOutletRequestDto, preferredLanguage: string): Promise<unknown> {
    return this.listingService.getOutletV3(getOutletRequestDto, preferredLanguage);
  }

  async getSpecificOutlet(userId: string, getOutletRequestDto: GetOutletRequestDto): Promise<unknown> {
    return this.listingService.getSpecificOutlet(userId, getOutletRequestDto);
  }

  async getOutletDetailsForDiscovery(userId: string, request: GetOutletDetailsDto, token: Record<string, string>) {
    return this.detailsService.getOutletDetailsForDiscovery(userId, request, token);
  }

  async getOutletDetailsForDiscoveryRewardEngine(
    userId: string,
    request: GetOutletDetailsDto,
    token: Record<string, string>
  ) {
    return this.detailsService.getOutletDetailsForDiscoveryRewardEngine(userId, request, token);
  }

  getLanguageBasedData(outlet: Outlet, language: string) {
    return this.detailsService.getLanguageBasedData(outlet, language);
  }

  async getOutletReview(outletId: string, language: string) {
    return this.detailsService.getOutletReview(outletId, language);
  }

  /** @internal Used by listing flow and tests */
  async getTabCount(
    outlets: { rows: Outlet[]; count: number },
    getOutletRequestDto: GetOutletRequestDto,
    profileWhere: Record<string | symbol, unknown>
  ): Promise<unknown> {
    return this.listingService.getTabCount(outlets, getOutletRequestDto, profileWhere);
  }

  /** @internal Used by listing flow and tests */
  async getProfileTabCount(
    outletCount: number,
    getOutletRequestDto: GetOutletRequestDto,
    profileWhere: Record<string | symbol, unknown>
  ): Promise<unknown> {
    return this.listingService.getProfileTabCount(outletCount, getOutletRequestDto, profileWhere);
  }
}
