import { getModelToken } from '@nestjs/sequelize';
import { TestingModule, Test } from '@nestjs/testing';
import { HttpException } from '@nestjs/common';
import { Op } from 'sequelize';
import { AreaService } from 'src/area/services/area.service';
import { GetOutletDto } from 'src/outlet/dtos/get-outlet-dto';
import { GetOutletSortDirectionEnum, GetOutletSortEnum } from 'src/outlet/enums/outlet-sort-enum';
import { OutletStatusEnum } from 'src/outlet/enums/outlet-status-enum';
import { Outlet } from 'src/outlet/models/outlet.model';
import { FastPaymentServiceProxy } from 'src/outlet/proxies/fast-payment-service.proxy';
import { MerchantGroupProxy } from 'src/outlet/proxies/merchant-group.proxy';
import { MerchantMetadataProxy } from 'src/outlet/proxies/merchant-metadata.proxy';
import { OutletOfferProxy } from 'src/outlet/proxies/outlet-offer.proxy';
import { PosServiceProxy } from 'src/outlet/proxies/pos-service.proxy';
import { OutletGetService } from '../outlet-get.service';
import { GetOutletSortDto } from 'src/outlet/dtos/get-outlet-sort-dto';
import { MerchantService } from 'src/merchant/services/merchant.service';
import { MerchantProfileMetadata } from 'src/merchant-profile/entities/merchant-profile-metadata.model';
import { CustomPinoLogger } from 'src/logger/custom-logger.service';
import { RewardEngineWrapperProxy } from 'src/outlet/proxies/reward-engine-wrapper.proxy';

describe('OutletGetService', () => {
  let service: OutletGetService;
  let outletModelMock: any;
  let outletOfferProxyMock: any;
  let merchantMetadataProxyMock: any;
  let areaServiceMock: any;
  let merchantGroupProxyMock: any;
  let fastPaymentServiceProxyMock: any;
  let posServiceProxyMock: any;
  let loggerMock: any;
  let merchantService: any;

  const mockToken = 'mock-token';
  const mockMerchantId = 'merchant-123';
  const mockOutletId = 'outlet-123';

  const mockOutlet = {
    outletId: mockOutletId,
    merchantId: mockMerchantId,
    name: 'Test Outlet',
    nameAr: 'اختبار',
    rating: 4.5,
    priceLevel: 2,
    website: 'test.com',
    websiteAr: 'test.com/ar',
    formattedPhoneNumber: '+971 12 345 6789',
    businessStatus: 'OPERATIONAL',
    userRatingsTotal: 100,
    status: OutletStatusEnum.Active,
    merchantIdsManual: ['mid-123'],
    posIds: ['pos-123'],
    description: 'Test description',
    descriptionAr: 'وصف الاختبار',
    source: 'manual',
    menuUrl: 'menu.com',
    menuUrlAr: 'menu.com/ar',
    bookingUrl: 'booking.com',
    bookingUrlAr: 'booking.com/ar',
    outletNo: 'OUT123',
    midPidRelation: '123:456',
    checkTerminal: true,
    artDesc: 'Art description',
    competitorDesc: 'Competitor description',
    merchantName: 'Test Merchant',
    merchantLogoUrl: 'merchantlogoimage.png',
    maxOffer: 20,
    hasCustomOffer: true,
    fastPaymentStatus: 'ACTIVE',
    dataValues: {
      id: mockOutletId,
      merchantId: mockMerchantId,
      name: 'Test Outlet',
      rating: 4.5,
      priceLevel: 2,
      status: OutletStatusEnum.Active,
      outletAddress: {
        location: 'Dubai Mall',
        areaId: 'area-123',
      },
      outletPhotos: [{ cdnUrl: 'cdnimage', isDefault: true }],
    },
  };

  const mockOutletModel = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    findAndCountAll: jest.fn(),
    count: jest.fn(),
  };
  const mockMerchantService = {
    getMerchantById: jest.fn().mockResolvedValue({
      merchantNo: 'M123',
      imageUrl: 'image.com/logo.png',
      filters: [
        {
          category: {
            id: 'cat-123',
            name: 'Restaurants',
            imageUrl: 'image.com/category.png',
          },
        },
      ],
    }),
    getGroupIdsByMerchantIds: jest.fn().mockResolvedValue([
      {
        merchantId: mockMerchantId,
        groupId: 'group-123',
      },
    ]),
  };
  beforeEach(async () => {
    outletModelMock = {
      findAll: jest.fn().mockResolvedValue([mockOutlet]),
      findOne: jest.fn().mockResolvedValue(mockOutlet),
      findAndCountAll: jest.fn().mockResolvedValue({
        rows: [mockOutlet],
        count: 1,
      }),
      count: jest.fn().mockResolvedValue(1),
    };

    outletOfferProxyMock = {
      getAllOutletOffersByMerchantId: jest.fn().mockResolvedValue({
        data: {
          data: {
            outletBlackOutdays: [{ merchantOutletProfile: { outletId: mockOutletId } }],
            outletCustomHours: [{ merchantOutletProfile: { outletId: mockOutletId } }],
            outletNormalOffer: [{ merchantOutletProfile: { outletId: mockOutletId } }],
            outletTieredOffers: [{ merchantOutletProfile: { outletId: mockOutletId } }],
          },
        },
      }),
      getOutletAllOffers: jest.fn().mockResolvedValue({
        data: {
          data: {
            offers: [
              {
                id: 'offer-123',
                name: 'Test Offer',
              },
            ],
          },
        },
      }),
    };

    merchantMetadataProxyMock = {
      getMerchantMetadata: jest.fn().mockResolvedValue({
        data: {
          data: {
            merchantNo: 'M123',
            imageUrl: 'image.com/logo.png',
            filters: [
              {
                category: {
                  id: 'cat-123',
                  name: 'Restaurants',
                  imageUrl: 'image.com/category.png',
                },
              },
            ],
          },
        },
      }),
    };

    areaServiceMock = {
      findById: jest.fn().mockResolvedValue({
        dataValues: {
          city: 'Dubai',
        },
      }),
    };

    merchantGroupProxyMock = {
      getMerchantGroups: jest.fn().mockResolvedValue({
        data: {
          data: [
            {
              merchantId: mockMerchantId,
              groupId: 'group-123',
            },
          ],
        },
      }),
    };

    fastPaymentServiceProxyMock = {
      getOutletTabs: jest.fn().mockResolvedValue({
        data: {
          data: [{ id: 'tab-123', name: 'Food' }],
        },
      }),
      getOutletPriceConfig: jest.fn().mockResolvedValue({
        data: {
          data: { configType: 'price' },
        },
      }),
      getOutlet: jest.fn().mockResolvedValue({
        data: {
          data: { description: 'Fast payment description' },
        },
      }),
      getOutletConfig: jest.fn().mockResolvedValue({
        data: {
          data: { configEnabled: true },
        },
      }),
    };

    posServiceProxyMock = {
      getPosConfig: jest.fn().mockResolvedValue({
        data: {
          data: { posEnabled: true },
        },
      }),
    };

    loggerMock = {
      info: jest.fn(),
      error: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OutletGetService,
        {
          provide: getModelToken(Outlet),
          useValue: outletModelMock,
        },
        {
          provide: getModelToken(MerchantProfileMetadata),
          useValue: { findAll: jest.fn().mockResolvedValue([]) },
        },
        {
          provide: OutletOfferProxy,
          useValue: outletOfferProxyMock,
        },
        {
          provide: MerchantMetadataProxy,
          useValue: merchantMetadataProxyMock,
        },
        {
          provide: AreaService,
          useValue: areaServiceMock,
        },
        {
          provide: MerchantGroupProxy,
          useValue: merchantGroupProxyMock,
        },
        {
          provide: FastPaymentServiceProxy,
          useValue: fastPaymentServiceProxyMock,
        },
        {
          provide: PosServiceProxy,
          useValue: posServiceProxyMock,
        },
        {
          provide: CustomPinoLogger,
          useValue: loggerMock,
        },
        {
          provide: MerchantService,
          useValue: mockMerchantService,
        },
        {
          provide: RewardEngineWrapperProxy,
          useValue: {
            getOutletAllRewards: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<OutletGetService>(OutletGetService);
    merchantService = module.get<MerchantService>(MerchantService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all outlets', async () => {
      const result = await service.findAll();
      expect(outletModelMock.findAll).toHaveBeenCalled();
      expect(result).toEqual([mockOutlet]);
    });
  });

  describe('getAllOutlets', () => {
    it('should return all outlets with offers for a merchant', async () => {
      const result = await service.getAllOutlets(mockMerchantId, mockToken as any);

      expect(outletModelMock.findAll).toHaveBeenCalledWith({
        where: { merchantId: mockMerchantId },
        attributes: expect.any(Array),
        include: expect.any(Array),
        order: [['name', 'ASC']],
      });

      expect(outletOfferProxyMock.getAllOutletOffersByMerchantId).toHaveBeenCalledWith(mockMerchantId, mockToken);

      expect(result).toBeInstanceOf(Array);
      expect(result[0]).toHaveProperty('id', mockOutlet.dataValues.id);
      expect(result[0]).toHaveProperty('offers');
    });
  });

  describe('fetchOutlets', () => {
    it('should fetch outlets with pagination and filtering', async () => {
      const request: Partial<GetOutletDto> = {
        pageIndex: 0,
        pageSize: 10,
        search: 'test',
        status: OutletStatusEnum.Active,
        sort: {
          sortBy: GetOutletSortEnum.status,
          sortDirection: GetOutletSortDirectionEnum.ASC,
          sortOn: GetOutletSortEnum.outletNo,
        },
      };

      const result = (await service.fetchOutlets(mockMerchantId, request as any)) as any;

      expect(outletModelMock.findAndCountAll).toHaveBeenCalled();
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('pagination');
      expect(result.pagination).toHaveProperty('page', 0);
    });
  });

  describe('getOutlets', () => {
    it('should get outlets with offers', async () => {
      const request: Partial<GetOutletDto> = {
        pageIndex: 0,
        pageSize: 10,
        search: '',
        sort: new GetOutletSortDto(),
        status: OutletStatusEnum.Pending,
      };

      const result = await service.getOutlets(mockMerchantId, request as any, mockToken as any);

      expect(outletModelMock.findAndCountAll).toHaveBeenCalled();
      expect(outletOfferProxyMock.getAllOutletOffersByMerchantId).toHaveBeenCalledWith(mockMerchantId, mockToken);

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('pagination');
    });
  });

  describe('getMerchantOutlets', () => {
    it('should get all outlets for a merchant', async () => {
      const result = await service.getMerchantOutlets(mockMerchantId);

      expect(outletModelMock.findAll).toHaveBeenCalledWith({
        where: { merchantId: mockMerchantId },
        attributes: expect.any(Array),
        include: expect.any(Array),
      });

      expect(result).toEqual([mockOutlet]);
    });
  });

  describe('getMerchantLogo', () => {
    it('should get merchant logo for an outlet', async () => {
      const result = await service.getMerchantLogo(mockOutletId);

      expect(outletModelMock.findOne).toHaveBeenCalledWith({
        where: { outletId: mockOutletId },
        attributes: ['merchantLogoUrl'],
      });

      expect(result).toEqual(mockOutlet);
    });
  });

  describe('getOutletDetails', () => {
    it('should get detailed outlet information with offers', async () => {
      const result = await service.getOutletDetails(mockOutletId, mockToken as any);

      expect(outletModelMock.findOne).toHaveBeenCalled();
      expect(outletOfferProxyMock.getOutletAllOffers).toHaveBeenCalledWith(mockOutletId, mockToken);

      expect(fastPaymentServiceProxyMock.getOutletTabs).toHaveBeenCalledWith(mockOutletId, mockToken);

      expect(result).toHaveProperty('tabs');
      expect(result).toHaveProperty('priceConfig');
    });
    it('should catch and log error when Promise.all throws unexpectedly', async () => {
      const errorMessage = 'Unexpected error';
      fastPaymentServiceProxyMock.getOutletTabs.mockImplementation(() => {
        throw new Error(errorMessage);
      });

      const loggerSpy = jest.spyOn(service['logger'], 'error');

      await service.getOutletDetails(mockOutletId, mockToken as any);

      expect(loggerSpy).toHaveBeenCalledWith(
        'FastPaymentServiceProxy.getOutlet error',
        expect.objectContaining({
          err: expect.any(Error),
        })
      );
    });

    it('should handle circular references gracefully in output JSON', async () => {
      const circularObj = {};
      circularObj['self'] = circularObj;

      outletModelMock.findOne.mockResolvedValue({
        dataValues: {
          ...circularObj,
          rating: 3,
          priceLevel: 2,
        },
      });

      outletOfferProxyMock.getOutletAllOffers.mockResolvedValue({ data: { data: {} } });
      fastPaymentServiceProxyMock.getOutletTabs.mockResolvedValue({ data: { data: [] } });
      posServiceProxyMock.getPosConfig.mockResolvedValue({ data: { data: {} } });
      fastPaymentServiceProxyMock.getOutletPriceConfig.mockResolvedValue({ data: { data: {} } });
      fastPaymentServiceProxyMock.getOutlet.mockResolvedValue({
        data: { data: { description: 'desc' } },
      });
      fastPaymentServiceProxyMock.getOutletConfig.mockResolvedValue({ data: { data: {} } });

      const result = await service.getOutletDetails(mockOutletId, mockToken as any);

      expect(result).toBeDefined();
    });
    it('should handle error in getOutletTabs and return null tab data', async () => {
      fastPaymentServiceProxyMock.getOutletTabs.mockRejectedValue(new Error('Failed getOutletTabs'));
      outletOfferProxyMock.getOutletAllOffers.mockResolvedValue({ data: { data: {} } });
      outletModelMock.findOne.mockResolvedValue({
        dataValues: { rating: 4, priceLevel: 2 },
      });
      const result = await service.getOutletDetails(mockOutletId, mockToken as any);
      expect(result.tabs).toBeNull();
    });

    it('should handle error in getOutletPriceConfig and return null priceConfig', async () => {
      fastPaymentServiceProxyMock.getOutletPriceConfig.mockRejectedValue(new Error('Failed getOutletPriceConfig'));

      const result = await service.getOutletDetails(mockOutletId, mockToken as any);

      expect(result.priceConfig).toBeNull();
    });

    it('should handle error in getOutlet and return null messageDescription', async () => {
      fastPaymentServiceProxyMock.getOutlet.mockRejectedValue(new Error('Failed getOutlet'));

      const result = await service.getOutletDetails(mockOutletId, mockToken as any);

      expect(result.messageDescription).toBeNull();
    });

    it('should handle error in getOutletConfig and return null config', async () => {
      fastPaymentServiceProxyMock.getOutletConfig.mockRejectedValue(new Error('Failed getOutletConfig'));

      const result = await service.getOutletDetails(mockOutletId, mockToken as any);

      expect(result.config).toBeNull();
    });

    it('should get reward engine outlet details', async () => {
      const rewardProxy = (service as any).rewardEngineWrapperProxy;
      rewardProxy.getOutletAllRewards.mockResolvedValue({
        data: { data: [{ id: 'r1' }] },
      });

      const result = await service.getOutletDetailsRewardEngine(mockOutletId, mockToken as any);

      expect(rewardProxy.getOutletAllRewards).toHaveBeenCalledWith(mockOutletId, mockToken);
      expect(result).toHaveProperty('offer');
    });
  });

  describe('getMidTidMapping', () => {
    it('should get mid-tid mapping for an outlet', async () => {
      const result = await service.getMidTidMapping(mockOutletId);

      expect(outletModelMock.findOne).toHaveBeenCalledWith({
        attributes: [['outlet_id', 'id'], 'name', 'midPidRelation', 'checkTerminal'],
        where: { outletId: mockOutletId },
      });

      expect(result).toEqual(mockOutlet);
    });
  });

  describe('getOutletDetailForCore', () => {
    it('should get outlet details for core service', async () => {
      const result = await service.getOutletDetailForCore(mockOutletId);

      expect(outletModelMock.findOne).toHaveBeenCalled();
      expect(areaServiceMock.findById).toHaveBeenCalled();
      expect(merchantService.getMerchantById).toHaveBeenCalledWith(mockMerchantId);

      expect(result).toHaveProperty('country', 'UAE');
      expect(result).toHaveProperty('city', 'Dubai');
      expect(result).toHaveProperty('merchantLogo');
      expect(result).toHaveProperty('categoryName');
    });

    it('should return undefined if outlet is not found', async () => {
      outletModelMock.findOne.mockResolvedValueOnce(null);

      const result = await service.getOutletDetailForCore(mockOutletId);

      expect(result).toBeUndefined();
    });
  });

  describe('getMerchantId', () => {
    it('should get merchant id for an outlet', async () => {
      const result = await service.getMerchantId(mockOutletId);

      expect(outletModelMock.findOne).toHaveBeenCalledWith({
        attributes: ['merchantId', 'merchantName'],
        where: { outletId: mockOutletId },
      });

      expect(result).toEqual(mockOutlet);
    });
  });

  describe('getOutletNo', () => {
    it('should get outlet number for an outlet', async () => {
      const result = await service.getOutletNo(mockOutletId);

      expect(outletModelMock.findOne).toHaveBeenCalledWith({
        attributes: ['outletNo'],
        where: { outletId: mockOutletId },
      });

      expect(result).toEqual(mockOutlet);
    });
  });

  describe('getAllOutletIds', () => {
    it('should get all outlet ids for a merchant', async () => {
      outletModelMock.findAll.mockResolvedValueOnce([
        { dataValues: { id: 'outlet-1' } },
        { dataValues: { id: 'outlet-2' } },
      ]);

      const result = await service.getAllOutletIds(mockMerchantId);

      expect(outletModelMock.findAll).toHaveBeenCalledWith({
        where: { merchantId: mockMerchantId },
        attributes: [['outlet_id', 'id']],
      });

      expect(result).toEqual(['outlet-1', 'outlet-2']);
    });
  });

  describe('getOutletActiveInactiveCount', () => {
    it('should get active and inactive outlet counts', async () => {
      outletModelMock.count.mockResolvedValueOnce(5).mockResolvedValueOnce(3);

      const result = await service.getOutletActiveInactiveCount(mockMerchantId);

      expect(outletModelMock.count).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        activeOutletsNum: 5,
        inActiveOutletNum: 3,
      });
    });
  });

  describe('getOutlet', () => {
    it('should get a single outlet by id', async () => {
      const result = await service.getOutlet(mockOutletId);

      expect(outletModelMock.findOne).toHaveBeenCalledWith({
        where: { outletId: mockOutletId },
      });

      expect(result).toEqual(mockOutlet);
    });

    it('should get outlet with raw response', async () => {
      await service.getOutletWithIdRaw(mockOutletId);
      expect(outletModelMock.findOne).toHaveBeenCalledWith({
        where: { outletId: mockOutletId },
        raw: true,
      });
    });
  });

  describe('getAllOutletsByMerchantId', () => {
    it('returns outlets when found', async () => {
      outletModelMock.findAll.mockResolvedValueOnce([mockOutlet]);
      const result = await service.getAllOutletsByMerchantId(mockMerchantId);
      expect(result).toEqual([mockOutlet]);
    });

    it('returns empty array when no outlets exist', async () => {
      outletModelMock.findAll.mockResolvedValueOnce([]);
      const result = await service.getAllOutletsByMerchantId(mockMerchantId);
      expect(result).toEqual([]);
    });
  });

  describe('getMerchantOutletDetails', () => {
    it('returns empty array when outlet ids are empty', async () => {
      const result = await service.getMerchantOutletDetails([]);
      expect(result).toEqual([]);
    });

    it('returns merchant and outlet details in requested order', async () => {
      outletModelMock.findAll.mockResolvedValueOnce([
        {
          outletId: 'o1',
          merchantId: 'm1',
          name: 'Outlet 1',
          nameAr: '',
          merchantName: 'Merchant 1',
          merchantNameAr: 'متجر 1',
        },
      ]);
      const merchantProfileModel = (service as any).merchantProfileMetadataModel;
      merchantProfileModel.findAll.mockResolvedValueOnce([{ merchantId: 'm1', profileId: 'p1' }]);

      const result = await service.getMerchantOutletDetails(['o1', 'missing']);

      expect(result).toEqual([
        {
          outletId: 'o1',
          merchant: { id: 'm1', name: 'Merchant 1', ar: 'متجر 1', profileIds: ['p1'] },
          outlet: { name: 'Outlet 1' },
        },
        {
          outletId: 'missing',
          merchant: { id: '', profileIds: [] },
          outlet: {},
        },
      ]);
    });

    it('throws HttpException when fetching merchant outlet details fails', async () => {
      outletModelMock.findAll.mockRejectedValueOnce(new Error('db failed'));
      await expect(service.getMerchantOutletDetails(['o1'])).rejects.toThrow(HttpException);
      expect(loggerMock.error).toHaveBeenCalledWith('OutletGetService.getMerchantOutletDetails failed', {
        err: expect.any(Error),
      });
    });
  });

  describe('getOutletsByMid', () => {
    it('should return outlets with group info', async () => {
      const mId = 'mid123';
      const outlets = [
        { merchantId: 'm1', outletId: 'o1' },
        { merchantId: 'm2', outletId: 'o2' },
      ];
      const groupIds = [
        { dataValues: { merchantId: 'm1' }, groupId: 'g1' },
        { dataValues: { merchantId: 'm2' }, groupId: 'g2' },
      ];

      outletModelMock.findAll.mockResolvedValue(outlets);
      mockMerchantService.getGroupIdsByMerchantIds.mockResolvedValue(groupIds);

      const result = await service.getOutletsByMid(mId);

      expect(outletModelMock.findAll).toHaveBeenCalledWith({
        where: { merchantIdsManual: { [Op.contains]: [mId] } },
      });
      expect(mockMerchantService.getGroupIdsByMerchantIds).toHaveBeenCalledWith(['m1', 'm2']);
      expect(result).toEqual([
        { groupId: 'g1', merchantId: 'm1', outletId: 'o1' },
        { groupId: 'g2', merchantId: 'm2', outletId: 'o2' },
      ]);
    });

    it('should return empty array if no outlets found', async () => {
      outletModelMock.findAll.mockResolvedValueOnce([]);
      const result = await service.getOutletsByMid('mid123');
      expect(result).toEqual([]);
    });
  });

  describe('getOutletsBasicDetails', () => {
    it('should get basic details for multiple outlets', async () => {
      outletModelMock.findAll.mockResolvedValueOnce([
        { outletId: 'outlet-1', name: 'Outlet 1', outletNo: 'OUT1' },
        { outletId: 'outlet-2', name: 'Outlet 2', outletNo: 'OUT2' },
      ]);

      const result = await service.getOutletsBasicDetails(['outlet-1', 'outlet-2']);

      expect(outletModelMock.findAll).toHaveBeenCalledWith({
        where: {
          outletId: {
            [Op.in]: ['outlet-1', 'outlet-2'],
          },
        },
        attributes: ['outletId', 'name', 'outletNo'],
      });

      expect(result).toEqual([
        { id: 'outlet-1', name: 'Outlet 1', outletNo: 'OUT1' },
        { id: 'outlet-2', name: 'Outlet 2', outletNo: 'OUT2' },
      ]);
    });

    it('should return empty array for empty input', async () => {
      const result = await service.getOutletsBasicDetails([]);

      expect(result).toEqual([]);
      expect(outletModelMock.findAll).not.toHaveBeenCalled();
    });
  });

  describe('getOutletName', () => {
    it('should get outlet name by id', async () => {
      outletModelMock.findOne.mockResolvedValueOnce({ name: 'Test Outlet' });

      const result = await service.getOutletName(mockOutletId);

      expect(outletModelMock.findOne).toHaveBeenCalledWith({
        where: { outletId: mockOutletId },
        attributes: ['name'],
      });

      expect(result).toEqual('Test Outlet');
    });

    it('should return undefined if outlet not found', async () => {
      outletModelMock.findOne.mockResolvedValueOnce(null);

      const result = await service.getOutletName('non-existent-id');

      expect(result).toBeUndefined();
    });
  });

  describe('getOutletStatus', () => {
    it('should get outlet status by id', async () => {
      const result = await service.getOutletStatus(mockOutletId);

      expect(outletModelMock.findOne).toHaveBeenCalledWith({
        where: { outletId: mockOutletId },
        attributes: ['status'],
      });

      expect(result).toEqual(mockOutlet);
    });
  });

  describe('Private methods', () => {
    describe('applySorting', () => {
      it('should apply status sorting', () => {
        const request: Partial<GetOutletDto> = {
          sort: {
            sortBy: GetOutletSortEnum.status,
            sortDirection: GetOutletSortDirectionEnum.ASC,
            sortOn: GetOutletSortEnum.outletNo,
          },
          pageIndex: 0,
          pageSize: 10,
          search: '',
          status: OutletStatusEnum.Pending,
        };

        const order: any[] = [];
        service['applySorting'](request as any, order);

        expect(order).toEqual([['status', 'ASC']]);
      });

      it('should apply fastPaymentStatus sorting', () => {
        const request: Partial<GetOutletDto> = {
          sort: {
            sortBy: GetOutletSortEnum.fastPaymentStatus,
            sortDirection: GetOutletSortDirectionEnum.DESC,
            sortOn: GetOutletSortEnum.outletNo,
          },
          pageIndex: 0,
          pageSize: 10,
          search: '',
          status: OutletStatusEnum.Pending,
        };

        const order: any[] = [];
        service['applySorting'](request as any, order);

        expect(order).toEqual([['fastPaymentStatus', 'DESC']]);
      });

      it('should apply default sorting when sortBy is not recognized', () => {
        const request: Partial<GetOutletDto> = {
          sort: {
            sortBy: 'unknown' as any,
            sortDirection: GetOutletSortDirectionEnum.ASC,
            sortOn: null,
          },
          pageIndex: 0,
          pageSize: 10,
          search: '',
          status: OutletStatusEnum.Pending,
        };

        const order: any[] = [];
        service['applySorting'](request as any, order);

        expect(order).toEqual([['created_at', 'DESC']]);
      });
    });

    describe('applyFilter', () => {
      it('should apply search filter', () => {
        const request: Partial<GetOutletDto> = {
          search: 'test',
          pageIndex: 0,
          pageSize: 10,
          sort: new GetOutletSortDto(),
          status: OutletStatusEnum.Pending,
        };

        const where: any = { merchantId: mockMerchantId };
        service['applyFilter'](request as any, where);

        expect(where[Op.or]).toEqual([{ name: { [Op.iLike]: '%test%' } }, { outletNo: { [Op.iLike]: '%test%' } }]);
      });

      it('should apply status filter', () => {
        const request: Partial<GetOutletDto> = {
          status: OutletStatusEnum.Active,
          pageIndex: 0,
          pageSize: 10,
          search: '',
          sort: new GetOutletSortDto(),
        };

        const where: any = { merchantId: mockMerchantId };
        service['applyFilter'](request as any, where);

        expect(where[Op.and]).toEqual([{ status: { [Op.eq]: OutletStatusEnum.Active.toString() } }]);
      });

      it('should apply both search and status filters', () => {
        const request: Partial<GetOutletDto> = {
          search: 'test',
          status: OutletStatusEnum.Active,
          pageIndex: 0,
          pageSize: 10,
          sort: new GetOutletSortDto(),
        };

        const where: any = { merchantId: mockMerchantId };
        service['applyFilter'](request as any, where);

        expect(where[Op.or]).toEqual([{ name: { [Op.iLike]: '%test%' } }, { outletNo: { [Op.iLike]: '%test%' } }]);
        expect(where[Op.and]).toEqual([{ status: { [Op.eq]: OutletStatusEnum.Active.toString() } }]);
      });
    });
  });
});
