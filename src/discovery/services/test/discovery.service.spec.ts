import { DiscoveryService } from '../discovery.service';

describe('DiscoveryService', () => {
  const listingService = {
    getOutletV2: jest.fn(),
    getOutletV3: jest.fn(),
    getSpecificOutlet: jest.fn(),
    getTabCount: jest.fn(),
    getProfileTabCount: jest.fn(),
  } as any;

  const detailsService = {
    getOutletDetailsForDiscovery: jest.fn(),
    getOutletDetailsForDiscoveryRewardEngine: jest.fn(),
    getOutletReview: jest.fn(),
    getLanguageBasedData: jest.fn((outlet, language) => (language === 'ar' ? outlet.nameAr : outlet.name)),
  } as any;

  let service: DiscoveryService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DiscoveryService(listingService, detailsService);
  });

  it('delegates getOutletV2 to listingService', async () => {
    listingService.getOutletV2.mockResolvedValue({ data: ['x'] });
    const dto = { pageIndex: 1 } as any;

    const result = await service.getOutletV2('user-1', dto, 'en');

    expect(listingService.getOutletV2).toHaveBeenCalledWith('user-1', dto, 'en');
    expect(result).toEqual({ data: ['x'] });
  });

  it('delegates getOutletV3 to listingService', async () => {
    listingService.getOutletV3.mockResolvedValue({ data: ['y'] });
    const dto = { pageIndex: 2 } as any;

    const result = await service.getOutletV3(dto, 'ar');

    expect(listingService.getOutletV3).toHaveBeenCalledWith(dto, 'ar');
    expect(result).toEqual({ data: ['y'] });
  });

  it('delegates getSpecificOutlet to listingService', async () => {
    listingService.getSpecificOutlet.mockResolvedValue({ rows: [] });
    const dto = { outletIds: ['o1'] } as any;

    const result = await service.getSpecificOutlet('user-2', dto);

    expect(listingService.getSpecificOutlet).toHaveBeenCalledWith('user-2', dto);
    expect(result).toEqual({ rows: [] });
  });

  it('delegates getOutletDetailsForDiscovery to detailsService', async () => {
    detailsService.getOutletDetailsForDiscovery.mockResolvedValue({ id: 'o1' });
    const request = { outletId: 'o1' } as any;
    const token = { authorization: 'Bearer token' };

    const result = await service.getOutletDetailsForDiscovery('user-3', request, token);

    expect(detailsService.getOutletDetailsForDiscovery).toHaveBeenCalledWith('user-3', request, token);
    expect(result).toEqual({ id: 'o1' });
  });

  it('delegates reward-engine outlet details call', async () => {
    detailsService.getOutletDetailsForDiscoveryRewardEngine.mockResolvedValue({ id: 'o2' });
    const request = { outletId: 'o2' } as any;
    const token = { authorization: 'Bearer token' };

    const result = await service.getOutletDetailsForDiscoveryRewardEngine('user-4', request, token);

    expect(detailsService.getOutletDetailsForDiscoveryRewardEngine).toHaveBeenCalledWith('user-4', request, token);
    expect(result).toEqual({ id: 'o2' });
  });

  it('returns language-based names', () => {
    const outlet = { name: 'English Name', nameAr: 'Arabic Name' } as any;

    expect(service.getLanguageBasedData(outlet, 'ar')).toBe('Arabic Name');
    expect(service.getLanguageBasedData(outlet, 'en')).toBe('English Name');
  });

  it('delegates getOutletReview to detailsService', async () => {
    detailsService.getOutletReview.mockResolvedValue({ rating: 4.8 });

    const result = await service.getOutletReview('outlet-11', 'en');

    expect(detailsService.getOutletReview).toHaveBeenCalledWith('outlet-11', 'en');
    expect(result).toEqual({ rating: 4.8 });
  });

  it('delegates getTabCount and getProfileTabCount to listingService', async () => {
    listingService.getTabCount.mockResolvedValue([{ tab: 1 }]);
    listingService.getProfileTabCount.mockResolvedValue([{ tab: 2 }]);

    const tabCount = await service.getTabCount({ profileId: 'p1' } as any, {} as any, {});
    const profileTabCount = await service.getProfileTabCount({ profileId: 'p1' } as any, {} as any, {});

    expect(listingService.getTabCount).toHaveBeenCalled();
    expect(listingService.getProfileTabCount).toHaveBeenCalled();
    expect(tabCount).toEqual([{ tab: 1 }]);
    expect(profileTabCount).toEqual([{ tab: 2 }]);
  });
});
