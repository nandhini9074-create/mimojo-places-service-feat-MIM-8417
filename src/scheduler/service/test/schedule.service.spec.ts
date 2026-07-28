import { Test, TestingModule } from '@nestjs/testing';
import { CustomPinoLogger } from 'src/logger/custom-logger.service';
import { OutletProfileMappingService } from 'src/outlet/services/outlet-profile-mapping.service';
import { OutletService } from 'src/outlet/services/outlet.service';
import { ScheduleService } from '../schedule.service';

describe('ScheduleService', () => {
  let service: ScheduleService;
  let outletProfileMappingService: OutletProfileMappingService;
  let outletService: OutletService;
  let logger: CustomPinoLogger;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScheduleService,
        {
          provide: OutletProfileMappingService,
          useValue: {
            getExpiredOutlets: jest.fn(),
            mapOutletToProfile: jest.fn(),
          },
        },
        {
          provide: OutletService,
          useValue: {
            findOutletsByIds: jest.fn(),
          },
        },
        {
          provide: CustomPinoLogger,
          useValue: {
            info: jest.fn(),
            error: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ScheduleService>(ScheduleService);
    outletProfileMappingService = module.get<OutletProfileMappingService>(OutletProfileMappingService);
    outletService = module.get<OutletService>(OutletService);
    logger = module.get<CustomPinoLogger>(CustomPinoLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should unmap expiring outlets from profile when there are expired outlets', async () => {
    const fakeExpiredOutlets = [
      { outletId: 'outlet-1', profileId: 'profile-1' },
      { outletId: 'outlet-2', profileId: 'profile-2' },
    ];

    const fakeOutletsWithMerchant = [
      { outletId: 'outlet-1', merchantId: 'merchant-1' },
      { outletId: 'outlet-2', merchantId: 'merchant-2' },
    ];

    (outletProfileMappingService.getExpiredOutlets as jest.Mock).mockResolvedValue(fakeExpiredOutlets);
    (outletService.findOutletsByIds as jest.Mock).mockResolvedValue(fakeOutletsWithMerchant);
    (outletProfileMappingService.mapOutletToProfile as jest.Mock).mockResolvedValue(undefined);

    await service.unMapExpiringOutletsFromProfile();

    expect(outletProfileMappingService.getExpiredOutlets).toHaveBeenCalledTimes(1);
    expect(outletService.findOutletsByIds).toHaveBeenCalledWith(['outlet-1', 'outlet-2']);
    expect(outletProfileMappingService.mapOutletToProfile).toHaveBeenCalledTimes(2);

    expect(outletProfileMappingService.mapOutletToProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        outletId: 'outlet-1',
        profileId: 'profile-1',
        merchantId: 'merchant-1',
        mapToProfile: false,
      }),
      null
    );

    expect(outletProfileMappingService.mapOutletToProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        outletId: 'outlet-2',
        profileId: 'profile-2',
        merchantId: 'merchant-2',
        mapToProfile: false,
      }),
      null
    );

    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Unmap job finished. Succeeded: 2, Failed: 0'));
  });

  it('should skip outlets without merchantId and log the skip', async () => {
    const fakeExpiredOutlets = [
      { outletId: 'outlet-1', profileId: 'profile-1' },
      { outletId: 'outlet-2', profileId: 'profile-2' },
    ];

    const fakeOutletsWithMerchant = [{ outletId: 'outlet-1', merchantId: 'merchant-1' }];

    (outletProfileMappingService.getExpiredOutlets as jest.Mock).mockResolvedValue(fakeExpiredOutlets);
    (outletService.findOutletsByIds as jest.Mock).mockResolvedValue(fakeOutletsWithMerchant);
    (outletProfileMappingService.mapOutletToProfile as jest.Mock).mockResolvedValue(undefined);

    await service.unMapExpiringOutletsFromProfile();

    expect(outletProfileMappingService.mapOutletToProfile).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith('Skipping outlet outlet-2: missing merchantId');
  });

  it('should return early if there are no expired outlets', async () => {
    (outletProfileMappingService.getExpiredOutlets as jest.Mock).mockResolvedValue([]);

    await service.unMapExpiringOutletsFromProfile();

    expect(outletService.findOutletsByIds).not.toHaveBeenCalled();
    expect(outletProfileMappingService.mapOutletToProfile).not.toHaveBeenCalled();
  });

  it('should handle partial failures and log metrics', async () => {
    const fakeExpiredOutlets = [
      { outletId: 'outlet-1', profileId: 'profile-1' },
      { outletId: 'outlet-2', profileId: 'profile-2' },
      { outletId: 'outlet-3', profileId: 'profile-3' },
    ];

    const fakeOutletsWithMerchant = [
      { outletId: 'outlet-1', merchantId: 'merchant-1' },
      { outletId: 'outlet-2', merchantId: 'merchant-2' },
      { outletId: 'outlet-3', merchantId: 'merchant-3' },
    ];

    (outletProfileMappingService.getExpiredOutlets as jest.Mock).mockResolvedValue(fakeExpiredOutlets);
    (outletService.findOutletsByIds as jest.Mock).mockResolvedValue(fakeOutletsWithMerchant);

    (outletProfileMappingService.mapOutletToProfile as jest.Mock)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('Map failed'));

    await service.unMapExpiringOutletsFromProfile();

    expect(outletProfileMappingService.mapOutletToProfile).toHaveBeenCalledTimes(3);
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Unmap job finished. Succeeded: 2, Failed: 1'));
  });

  it('should log error when getExpiredOutlets throws', async () => {
    const mockError = new Error('Critical failure');
    (outletProfileMappingService.getExpiredOutlets as jest.Mock).mockRejectedValue(mockError);

    await service.unMapExpiringOutletsFromProfile();

    expect(logger.error).toHaveBeenCalledWith('ScheduleService.unMapExpiringOutletsFromProfile - exception', {
      error: mockError,
    });
  });
});
