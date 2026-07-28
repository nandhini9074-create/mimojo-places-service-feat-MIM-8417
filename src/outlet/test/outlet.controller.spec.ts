import { TestingModule, Test } from '@nestjs/testing';
import { HttpException } from '@nestjs/common';
import { OutletKafkaProducerService } from 'src/images/services/outlet-kafka-producer.service';
import { v4 as uuidv4 } from 'uuid';
import { AddOutletConfigDto, SaveOutletPriceConfigDto } from '../dtos/add-outlet-dto';
import { CreateCustomOutletDto } from '../dtos/create-custom-outlet-dto';
import { CreateOutletDto } from '../dtos/create-outlet-dto';
import { SaveOutletPOSConfigDto } from '../dtos/create-pos-config-dto';
import { OutletFastPaymentStatusDto } from '../dtos/fast-payment-status.dto';
import { GetOutletDto } from '../dtos/get-outlet-dto';
import { GetOutletSortDto } from '../dtos/get-outlet-sort-dto';
import { OutletsBasicDetailsDTO } from '../dtos/get-outlets-basic-details-dto';
import { MerchantMetadataUpdatedDto } from '../dtos/merchant-metadata-dto';
import { MerchantOfferUpdatedDto } from '../dtos/merchant-offer-updated-dto';
import { MerchantOutletProfilesDto } from '../dtos/merchant-outlet-profile-dto';
import { MerchantStatusUpdatedDto } from '../dtos/merchant-status-dto';
import { OutletOfferUpdatedDto } from '../dtos/outlet-offer-updated-dto';
import { UploadOutletStatusDto } from '../dtos/update-status-dto';
import { OutletSourceEnum } from '../enums/outlet-source-enum';
import { OutletStatusEnum, OutletFastPaymentStatusEnum } from '../enums/outlet-status-enum';
import { ProfileEnum } from '../enums/profile-enum';
import { OutletController } from '../outlet.controller';
import { OutletAddressService } from '../services/outlet-address.service';
import { OutletGetService } from '../services/outlet-get.service';
import { OutletMigrationService } from '../services/outlet-migration.service';
import { OutletProfileMappingService } from '../services/outlet-profile-mapping.service';
import { OutletTimingService } from '../services/outlet-timing.service';
import { OutletService } from '../services/outlet.service';
import { Sequelize } from 'sequelize-typescript';
describe('OutletController', () => {
  let controller: OutletController;
  let outletService: OutletService;
  let outletMigrationService: OutletMigrationService;
  let outletAddressService: OutletAddressService;
  let outletTimingService: OutletTimingService;
  let outletKafkaProducerService: OutletKafkaProducerService;
  let sequelize: Sequelize;
  let outletGetService: OutletGetService;
  let outletProfileMappingService: OutletProfileMappingService;

  const mockTransactionFn = jest.fn().mockImplementation(callback => callback({ commit: jest.fn() }));
  const mockHeaders = { 'x-api-key': 'test-api-key' };
  const mockUserId = uuidv4();
  const mockReq = { headers: mockHeaders } as any;

  const mockOutlet = {
    outletId: uuidv4(),
    name: 'Test Outlet',
    outletName: 'Test Outlet',
    merchantId: uuidv4(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OutletController],
      providers: [
        {
          provide: OutletService,
          useValue: {
            insertOutletFromPoi: jest.fn().mockResolvedValue(mockOutlet),
            financeServiceHelper: jest.fn(),
            addEditCustomOutlet: jest.fn().mockResolvedValue(mockOutlet),
            createOffer: jest.fn(),
            updateOutletCountByMerchant: jest.fn().mockResolvedValue(true),
            createOutletProfile: jest.fn().mockResolvedValue(true),
            syncPoiOutletToCore: jest.fn().mockResolvedValue(true),
            syncCustomOutletToCore: jest.fn().mockResolvedValue(true),
            pushOutletToAuditLog: jest.fn(),
            cloneOutlet: jest.fn().mockResolvedValue({ newOutlet: mockOutlet }),
            createOutletProfileClone: jest.fn().mockResolvedValue(true),
            cloneOffer: jest.fn().mockResolvedValue(true),
            markAsHasClone: jest.fn().mockResolvedValue(true),
            validateAndUpdateOutletStatus: jest.fn().mockResolvedValue({ success: true }),
            validateAndUpdateOutletStatusRewardEngine: jest.fn().mockResolvedValue({ success: true }),
            updateFastPaymentStatus: jest.fn().mockResolvedValue({ success: true }),
            updateMerchantMetadataToOutlet: jest.fn().mockResolvedValue(true),
            updateOutletsStatus: jest.fn().mockResolvedValue({ success: true }),
            updateMerchantOutletMaxOffer: jest.fn().mockResolvedValue({ success: true }),
            updateOutletMaxOffer: jest.fn().mockResolvedValue({ success: true }),
            getActiveOutletProfile: jest.fn().mockResolvedValue({ profile: 'MIMOJO' }),
            getAllOutletsProfiles: jest.fn().mockResolvedValue([{ profile: 'MIMOJO' }]),
            getMerchantOutletDetails: jest.fn().mockResolvedValue([{ merchantId: mockOutlet.merchantId }]),
            getActiveFabOutlets: jest.fn(),
          },
        },
        {
          provide: OutletMigrationService,
          useValue: {
            migrateOffer: jest.fn().mockResolvedValue({ success: true }),
          },
        },
        {
          provide: OutletAddressService,
          useValue: {
            insert: jest.fn().mockResolvedValue(true),
            cloneAddress: jest.fn().mockResolvedValue({
              googlePlaceId: 'g-place',
              location: 'Loc',
              areaId: 'a1',
            }),
          },
        },
        {
          provide: OutletTimingService,
          useValue: {
            insert: jest.fn().mockResolvedValue(true),
            cloneTiming: jest.fn().mockResolvedValue(true),
          },
        },
        {
          provide: OutletKafkaProducerService,
          useValue: {
            pushToOutletImageService: jest.fn().mockResolvedValue(true),
          },
        },
        {
          provide: Sequelize,
          useValue: {
            transaction: mockTransactionFn,
          },
        },
        {
          provide: OutletGetService,
          useValue: {
            getAllOutlets: jest.fn().mockResolvedValue([mockOutlet]),
            findAll: jest.fn().mockResolvedValue([mockOutlet]),
            fetchOutlets: jest.fn().mockResolvedValue([mockOutlet]),
            getOutlets: jest.fn().mockResolvedValue([mockOutlet]),
            getOutletDetails: jest.fn().mockResolvedValue(mockOutlet),
            getOutletDetailsRewardEngine: jest.fn().mockResolvedValue(mockOutlet),
            getMidTidMapping: jest.fn().mockResolvedValue({ mid: 'test-mid', tid: 'test-tid' }),
            getMerchantOutlets: jest.fn().mockResolvedValue([mockOutlet]),
            getMerchantLogo: jest.fn().mockResolvedValue({ logo: 'logo-url' }),
            getOutletDetailForCore: jest.fn().mockResolvedValue(mockOutlet),
            getOutletsByMid: jest.fn().mockResolvedValue([mockOutlet]),
            getOutletsBasicDetails: jest.fn().mockResolvedValue([{ outletId: mockOutlet.outletId, name: mockOutlet.name }]),
            getMerchantOutletDetails: jest
              .fn()
              .mockResolvedValue([
                { outletId: mockOutlet.outletId, merchant: { id: 'm1', profileIds: [] }, outlet: { name: 'Outlet' } },
              ]),
            getOutletName: jest.fn().mockResolvedValue({ name: mockOutlet.name }),
            getOutletStatus: jest.fn().mockResolvedValue({ status: 'ACTIVE' }),
            getMerchantId: jest.fn(),
          },
        },
        {
          provide: OutletProfileMappingService,
          useValue: {
            findByProfileId: jest.fn().mockResolvedValue([{ outletId: mockOutlet.outletId }]),
            saveMerchantOutletProfile: jest.fn().mockResolvedValue({ success: true }),
            fetchProfileMappingCount: jest.fn().mockResolvedValue({ MIMOJO: 10 }),
            mapOutletToProfile: jest.fn().mockResolvedValue(true),
          },
        },
      ],
    }).compile();

    controller = module.get<OutletController>(OutletController);
    outletService = module.get<OutletService>(OutletService);
    outletMigrationService = module.get<OutletMigrationService>(OutletMigrationService);
    outletAddressService = module.get<OutletAddressService>(OutletAddressService);
    outletTimingService = module.get<OutletTimingService>(OutletTimingService);
    outletKafkaProducerService = module.get<OutletKafkaProducerService>(OutletKafkaProducerService);
    sequelize = module.get<Sequelize>(Sequelize);
    outletGetService = module.get<OutletGetService>(OutletGetService);
    outletProfileMappingService = module.get<OutletProfileMappingService>(OutletProfileMappingService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('insertOutlet', () => {
    it('should insert a new outlet and related data', async () => {
      const createOutletDto: CreateOutletDto = {
        merchantId: uuidv4(),
        outletAddress: {
          googlePlaceId: '',
          formattedAddress: '',
          formattedAddressAr: '',
          mapUrl: '',
          latitude: 0,
          longitude: 0,
          cityId: '',
          neighbourhoodId: '',
          location: '',
          locationAr: '',
        },
        outletTiming: {
          weekdayText: [],
          weekdayTextAr: [],
        },
        photos: ['photo1.jpg'],
        name: '',
        nameAr: '',
        rating: 0,
        priceLevel: 0,
        website: '',
        websiteAr: '',
        formattedPhoneNumber: '',
        businessStatus: '',
        userRatingsTotal: 0,
        merchantIdsManual: [],
        posIds: [],
        description: '',
        menuUrl: '',
        menuUrlAr: '',
        bookingUrl: '',
        bookingUrlAr: '',
        midPidRelation: [],
        checkTerminal: false,
      };

      const result = await controller.insertOutlet(createOutletDto, mockReq, mockUserId);

      expect(outletService.insertOutletFromPoi).toHaveBeenCalledWith(
        createOutletDto,
        expect.anything(),
        mockHeaders,
        mockUserId
      );
      expect(outletAddressService.insert).toHaveBeenCalled();
      expect(outletTimingService.insert).toHaveBeenCalled();
      expect(outletKafkaProducerService.pushToOutletImageService).toHaveBeenCalledWith(
        mockOutlet.outletId,
        createOutletDto.photos,
        OutletSourceEnum.POI
      );
      expect(outletService.createOffer).toHaveBeenCalled();
      expect(outletService.updateOutletCountByMerchant).toHaveBeenCalled();
      expect(outletService.createOutletProfile).toHaveBeenCalledWith(
        mockOutlet.outletId,
        ProfileEnum.MIMOJO,
        mockUserId,
        createOutletDto.merchantId
      );
      expect(outletService.syncPoiOutletToCore).toHaveBeenCalled();
      expect(outletService.pushOutletToAuditLog).toHaveBeenCalledWith(mockOutlet, true, true);
      expect(result.data).toEqual(mockOutlet);
    });
  });

  describe('addEditCustomOutlet', () => {
    it('should add a new custom outlet', async () => {
      const createCustomOutletDto: CreateCustomOutletDto = {
        merchantId: uuidv4(),
        outletAddress: {
          street: 'Custom Street',
          city: 'Custom City',
          state: 'Custom State',
          pincode: '654321',
        } as any,
        outletTiming: [{ day: 'Monday', openTime: '10:00', closeTime: '20:00' }] as any,
        id: '',
        merchantName: '',
        merchantLogoUrl: '',
        rating: 0,
        priceLevel: 0,
        website: '',
        websiteAr: '',
        formattedPhoneNumber: '',
        businessStatus: '',
        userRatingsTotal: 0,
        photos: [],
        merchantIdsManual: [],
        posIds: [],
        description: '',
        menuUrl: '',
        menuUrlAr: '',
        bookingUrl: '',
        bookingUrlAr: '',
        outletFilters: [],
        midPidRelation: [],
        checkTerminal: false,
        tabs: [],
        config: new AddOutletConfigDto(),
        priceConfig: new SaveOutletPriceConfigDto(),
        posConfig: new SaveOutletPOSConfigDto(),
        messageDescription: [],
      };

      const result = await controller.addEditCustomOutlet(createCustomOutletDto, mockReq, mockUserId);

      expect(outletService.addEditCustomOutlet).toHaveBeenCalledWith(
        createCustomOutletDto,
        expect.anything(),
        mockHeaders,
        mockUserId
      );
      expect(outletAddressService.insert).toHaveBeenCalled();
      expect(outletTimingService.insert).toHaveBeenCalled();
      expect(outletService.createOffer).toHaveBeenCalled();
      expect(outletService.updateOutletCountByMerchant).toHaveBeenCalled();
      expect(outletService.createOutletProfile).toHaveBeenCalledWith(
        mockOutlet.outletId,
        ProfileEnum.MIMOJO,
        mockUserId,
        createCustomOutletDto.merchantId
      );
      expect(outletService.syncCustomOutletToCore).toHaveBeenCalled();
      expect(outletService.pushOutletToAuditLog).toHaveBeenCalledWith(mockOutlet, false, true);
      expect(result.data).toEqual(mockOutlet);
    });

    it('should edit an existing custom outlet', async () => {
      const editCustomOutletDto: CreateCustomOutletDto = {
        id: uuidv4(),
        merchantId: uuidv4(),
        outletAddress: {
          street: 'Updated Street',
          city: 'Updated City',
          state: 'Updated State',
          pincode: '999999',
        } as any,
        outletTiming: [{ day: 'Tuesday', openTime: '11:00', closeTime: '21:00' }] as any,
        merchantName: '',
        merchantLogoUrl: '',
        rating: 0,
        priceLevel: 0,
        website: '',
        websiteAr: '',
        formattedPhoneNumber: '',
        businessStatus: '',
        userRatingsTotal: 0,
        photos: [],
        merchantIdsManual: [],
        posIds: [],
        description: '',
        menuUrl: '',
        menuUrlAr: '',
        bookingUrl: '',
        bookingUrlAr: '',
        outletFilters: [],
        midPidRelation: [],
        checkTerminal: false,
        tabs: [],
        config: new AddOutletConfigDto(),
        priceConfig: new SaveOutletPriceConfigDto(),
        posConfig: new SaveOutletPOSConfigDto(),
        messageDescription: [],
      };

      const result = await controller.addEditCustomOutlet(editCustomOutletDto, mockReq, mockUserId);

      expect(outletService.addEditCustomOutlet).toHaveBeenCalledWith(
        editCustomOutletDto,
        expect.anything(),
        mockHeaders,
        mockUserId
      );
      expect(outletAddressService.insert).toHaveBeenCalled();
      expect(outletTimingService.insert).toHaveBeenCalled();
      expect(outletService.createOffer).not.toHaveBeenCalled();
      expect(outletService.updateOutletCountByMerchant).toHaveBeenCalled();
      expect(outletService.createOutletProfile).toHaveBeenCalledWith(
        mockOutlet.outletId,
        ProfileEnum.MIMOJO,
        mockUserId,
        editCustomOutletDto.merchantId
      );
      expect(outletService.syncCustomOutletToCore).toHaveBeenCalled();
      expect(outletService.pushOutletToAuditLog).toHaveBeenCalledWith(mockOutlet, false, false);
      expect(result.data).toEqual(mockOutlet);
    });
  });

  describe('updateStatus', () => {
    it('should update outlet status', async () => {
      const updateStatusDto: UploadOutletStatusDto = {
        outletId: mockOutlet.outletId,
        status: OutletStatusEnum.Active,
      };

      const result = await controller.updateStatus(updateStatusDto, mockReq, mockUserId);

      expect(outletService.validateAndUpdateOutletStatus).toHaveBeenCalledWith(updateStatusDto, mockHeaders, mockUserId);
      expect(result.data).toEqual({ success: true });
    });
  });

  describe('cloneOutlet', () => {
    it('throws bad request when outletId is missing', async () => {
      await expect(controller.cloneOutlet({ outletId: '' } as any, mockUserId, mockReq)).rejects.toThrow(HttpException);
    });

    it('clones outlet and syncs POI payload when google place exists', async () => {
      const result = await controller.cloneOutlet({ outletId: 'old-o1' } as any, mockUserId, mockReq);
      expect(outletService.cloneOutlet).toHaveBeenCalled();
      expect(outletAddressService.cloneAddress).toHaveBeenCalled();
      expect(outletTimingService.cloneTiming).toHaveBeenCalled();
      expect(outletService.createOutletProfileClone).toHaveBeenCalled();
      expect(outletService.cloneOffer).toHaveBeenCalled();
      expect(outletService.syncPoiOutletToCore).toHaveBeenCalled();
      expect(outletService.markAsHasClone).toHaveBeenCalledWith('old-o1');
      expect(result.data).toEqual(mockOutlet);
    });

    it('syncs custom payload when cloned address has no google place id', async () => {
      (outletAddressService.cloneAddress as jest.Mock).mockResolvedValueOnce({
        googlePlaceId: null,
        location: 'Loc',
        areaId: 'city-1',
      });
      await controller.cloneOutlet({ outletId: 'old-o1' } as any, mockUserId, mockReq);
      expect(outletService.syncCustomOutletToCore).toHaveBeenCalled();
    });
  });

  describe('updateStatusRewardEngine', () => {
    it('updates outlet status via reward engine flow', async () => {
      const request: UploadOutletStatusDto = {
        outletId: uuidv4(),
        status: OutletStatusEnum.Active,
      } as UploadOutletStatusDto;
      const result = await controller.updateStatusRewardEngine(request, mockReq, mockUserId);
      expect(outletService.validateAndUpdateOutletStatusRewardEngine).toHaveBeenCalledWith(
        request,
        mockReq.headers,
        mockUserId
      );
      expect(result.data).toEqual({ success: true });
    });
  });

  describe('getOutletDetailsRewardEngine', () => {
    it('gets outlet details from reward engine', async () => {
      const outletId = uuidv4();
      const result = await controller.getOutletDetailsRewardEngine(outletId, mockReq);
      expect(outletGetService.getOutletDetailsRewardEngine).toHaveBeenCalledWith(outletId, mockReq.headers);
      expect(result.data).toEqual(mockOutlet);
    });
  });

  describe('getMerchantFilteredOutletDetails', () => {
    it('gets merchant and outlet important details', async () => {
      const payload = {
        outletIds: [mockOutlet.outletId],
      } as any;
      const result = await controller.getMerchantFilteredOutletDetails(payload);
      expect(outletGetService.getMerchantOutletDetails).toHaveBeenCalledWith([mockOutlet.outletId]);
      expect(result.data).toHaveLength(1);
    });
  });

  describe('updateFastPaymentStatus', () => {
    it('should update fast payment status', async () => {
      const fastPaymentStatusDto: OutletFastPaymentStatusDto = {
        outletId: mockOutlet.outletId,
        status: OutletFastPaymentStatusEnum.ACTIVE,
        merchantId: '',
        name: '',
      };

      const result = await controller.updateFastPaymentStatus(fastPaymentStatusDto, mockReq, mockUserId);

      expect(outletService.updateFastPaymentStatus).toHaveBeenCalledWith(fastPaymentStatusDto, mockHeaders, mockUserId);
      expect(result.data).toEqual({ success: true });
    });
  });

  describe('getAllOutlets', () => {
    it('should get all outlets for a merchant', async () => {
      const merchantId = uuidv4();

      const result = await controller.getAllOutlets(merchantId, mockReq);

      expect(outletGetService.getAllOutlets).toHaveBeenCalledWith(merchantId, mockHeaders);
      expect(result.data).toEqual([mockOutlet]);
    });
  });

  describe('getAllOutletDetails', () => {
    it('should get all outlet details', async () => {
      const result = await controller.getAllOutletDetails();

      expect(outletGetService.findAll).toHaveBeenCalled();
      expect(result.data).toEqual([mockOutlet]);
    });
  });

  describe('fetchOutlets', () => {
    it('should fetch outlets for a merchant with criteria', async () => {
      const merchantId = uuidv4();
      const getOutletDto: Partial<GetOutletDto> = {
        status: OutletStatusEnum.Active,
        pageIndex: 1,
        pageSize: 10,
        search: '',
        sort: new GetOutletSortDto(),
      };

      const result = await controller.fetchOutlets(merchantId, getOutletDto as any);

      expect(outletGetService.fetchOutlets).toHaveBeenCalledWith(merchantId, getOutletDto);
      expect(result.data).toEqual([mockOutlet]);
    });
  });

  describe('getOutlets', () => {
    it('should get outlets for a merchant with criteria and headers', async () => {
      const merchantId = uuidv4();
      const getOutletDto: Partial<GetOutletDto> = {
        status: OutletStatusEnum.Active,
        pageIndex: 1,
        pageSize: 10,
        search: '',
        sort: new GetOutletSortDto(),
      };

      const result = await controller.getOutlets(merchantId, getOutletDto as any, mockReq);

      expect(outletGetService.getOutlets).toHaveBeenCalledWith(merchantId, getOutletDto, mockHeaders);
      expect(result.data).toEqual([mockOutlet]);
    });
  });

  describe('getOutletDetails', () => {
    it('should get outlet details by outletId', async () => {
      const outletId = uuidv4();

      const result = await controller.getOutletDetails(outletId, mockReq);

      expect(outletGetService.getOutletDetails).toHaveBeenCalledWith(outletId, mockHeaders);
      expect(result.data).toEqual(mockOutlet);
    });
  });

  describe('getMidTidMapping', () => {
    it('should get MID TID mapping for an outlet', async () => {
      const outletId = uuidv4();

      const result = await controller.getMidTidMapping(outletId);

      expect(outletGetService.getMidTidMapping).toHaveBeenCalledWith(outletId);
      expect(result.data).toEqual({ mid: 'test-mid', tid: 'test-tid' });
    });
  });

  describe('merchantMetadataUpdated', () => {
    it('should update merchant metadata to outlets', async () => {
      const merchantMetadataDto: MerchantMetadataUpdatedDto = {
        merchantId: uuidv4(),
        merchantName: 'Updated Legal Name',
        merchantLogoUrl: 'Updated Trade Name',
        desc: '',
        filters: [],
        artDesc: ['art1'],
        competitorDesc: ['comp1'],
      };

      await controller.merchantMetadataUpdated(merchantMetadataDto, mockReq, mockUserId);

      expect(sequelize.transaction).toHaveBeenCalled();
      expect(outletService.updateMerchantMetadataToOutlet).toHaveBeenCalledWith(
        merchantMetadataDto,
        expect.anything(),
        mockUserId
      );
    });
  });

  describe('merchantStatusUpdated', () => {
    it('should update outlets status based on merchant status', async () => {
      const merchantStatusDto: MerchantStatusUpdatedDto = {
        merchantId: uuidv4(),
        cloMerchantStatus: true,
        circleMerchantStatus: false,
      };

      const result = await controller.merchantStatusUpdated(merchantStatusDto, mockReq, mockUserId);

      expect(sequelize.transaction).toHaveBeenCalled();
      expect(outletService.updateOutletsStatus).toHaveBeenCalledWith(
        merchantStatusDto,
        expect.anything(),
        mockHeaders,
        mockUserId
      );
      expect(result.data).toEqual({ success: true });
    });
  });

  describe('merchantOfferUpdated', () => {
    it('should update merchant outlet max offer', async () => {
      const merchantOfferDto: MerchantOfferUpdatedDto = {
        merchantId: uuidv4(),
        maxOffer: 500,
      };

      await controller.merchantOfferUpdated(merchantOfferDto, mockReq, mockUserId);

      expect(sequelize.transaction).toHaveBeenCalled();
      expect(outletService.updateMerchantOutletMaxOffer).toHaveBeenCalledWith(
        merchantOfferDto,
        expect.anything(),
        mockUserId
      );
    });
  });

  describe('outletOfferUpdated', () => {
    it('should update outlet max offer', async () => {
      const outletOfferDto: OutletOfferUpdatedDto = {
        outletIds: [uuidv4()],
        maxOffer: 500,
        hasCustomOffer: false,
        profileId: 'profile-123',
      };

      const result = await controller.outletOfferUpdated(outletOfferDto, mockUserId);

      expect(outletService.updateOutletMaxOffer).toHaveBeenCalledWith(outletOfferDto, mockUserId);
      expect(result.data).toEqual({ success: true });
    });
  });

  describe('getMerchantOutlets', () => {
    it('should get merchant outlets', async () => {
      const merchantId = uuidv4();

      const result = await controller.getMerchantOutlets(merchantId);

      expect(outletGetService.getMerchantOutlets).toHaveBeenCalledWith(merchantId);
      expect(result.data).toEqual([mockOutlet]);
    });
  });

  describe('getMerchantLogo', () => {
    it('should get merchant logo by outlet id', async () => {
      const outletId = uuidv4();

      const result = await controller.getMerchantLogo(outletId);

      expect(outletGetService.getMerchantLogo).toHaveBeenCalledWith(outletId);
      expect(result.data).toEqual({ logo: 'logo-url' });
    });
  });

  describe('getOutletDetailsForCore', () => {
    it('should get outlet details for core system', async () => {
      const outletId = uuidv4();

      const result = await controller.getOutletDetailsForCore(outletId);

      expect(outletGetService.getOutletDetailForCore).toHaveBeenCalledWith(outletId);
      expect(result.data).toEqual(mockOutlet);
    });
  });

  describe('migrateOutletTiming', () => {
    it('should migrate offer data', async () => {
      const result = await controller.migrateOutletTiming(mockReq, mockUserId);

      expect(outletMigrationService.migrateOffer).toHaveBeenCalledWith(mockHeaders, mockUserId);
      expect(result.data).toEqual({ success: true });
    });
  });

  describe('getOutletByMid', () => {
    it('should get outlets by MID', async () => {
      const mid = 'test-mid';

      const result = await controller.getOutletByMid(mid);

      expect(outletGetService.getOutletsByMid).toHaveBeenCalledWith(mid);
      expect(result.data).toEqual([mockOutlet]);
    });
  });

  describe('getOutletsBasicDetails', () => {
    it('should get basic details for outlets', async () => {
      const outletsBasicDto: OutletsBasicDetailsDTO = {
        outlets: [uuidv4(), uuidv4()],
      };

      const result = await controller.getOutletsBasicDetails(outletsBasicDto);

      expect(outletGetService.getOutletsBasicDetails).toHaveBeenCalledWith(outletsBasicDto.outlets);
      expect(result.data).toEqual([{ outletId: mockOutlet.outletId, name: mockOutlet.name }]);
    });
  });

  describe('getOutletName', () => {
    it('should get outlet name by outlet id', async () => {
      const outletId = uuidv4();

      const result = await controller.getOutletName(outletId);

      expect(outletGetService.getOutletName).toHaveBeenCalledWith(outletId);
      expect(result.data).toEqual({ name: mockOutlet.name });
    });
  });

  describe('getOutletStatus', () => {
    it('should get outlet status by outlet id', async () => {
      const outletId = uuidv4();

      const result = await controller.getOutletStatus(outletId);

      expect(outletGetService.getOutletStatus).toHaveBeenCalledWith(outletId);
      expect(result.data).toEqual({ status: 'ACTIVE' });
    });
  });

  describe('getActiveOutletProfileMapping', () => {
    it('should get active outlet profile mapping', async () => {
      const outletId = uuidv4();
      const profileId = uuidv4();
      const transactionDate = new Date();

      const result = await controller.getActiveOutletProfileMapping(outletId, profileId, {
        transactionDate: transactionDate.toISOString(),
        cardBin: '123',
      });

      expect(outletService.getActiveOutletProfile).toHaveBeenCalledWith(outletId, profileId, transactionDate, '123');
      expect(result.data).toEqual({ profile: 'MIMOJO' });
    });
  });

  describe('getAllOutletsProfiles', () => {
    it('should get all profiles for an outlet', async () => {
      const outletId = uuidv4();
      const transactionDate = '2023-01-01';

      const result = await controller.getAllOutletsProfiles(outletId, transactionDate);

      expect(outletService.getAllOutletsProfiles).toHaveBeenCalledWith(outletId, new Date(transactionDate));
      expect(result.data).toEqual([{ profile: 'MIMOJO' }]);
    });

    it('should handle null transaction date', async () => {
      const outletId = uuidv4();

      const result = await controller.getAllOutletsProfiles(outletId);

      expect(outletService.getAllOutletsProfiles).toHaveBeenCalledWith(outletId, null);
      expect(result.data).toEqual([{ profile: 'MIMOJO' }]);
    });
  });

  describe('getMerchantOutletDetails', () => {
    it('should get merchant outlet details', async () => {
      const result = await controller.getMerchantOutletDetails();

      expect(outletService.getMerchantOutletDetails).toHaveBeenCalled();
      expect(result.data).toEqual([{ merchantId: mockOutlet.merchantId }]);
    });
  });

  describe('getByProfile', () => {
    it('should get outlets by profile id', async () => {
      const profileId = uuidv4();

      const result = await controller.getByProfile(profileId);

      expect(outletProfileMappingService.findByProfileId).toHaveBeenCalledWith(profileId);
      expect(result.data).toEqual([{ outletId: mockOutlet.outletId }]);
    });
  });

  describe('mapMerchantOutletProfile', () => {
    it('should map merchant outlet profile', async () => {
      const profileDto: MerchantOutletProfilesDto = {
        profileId: uuidv4(),
        merchantOutletProfileDtos: [],
      };

      const result = await controller.mapMerchantOutletProfile(profileDto, mockUserId);

      expect(outletProfileMappingService.saveMerchantOutletProfile).toHaveBeenCalledWith(profileDto, mockUserId);
      expect(result.data).toEqual({ success: true });
    });
  });

  describe('getProfiles', () => {
    const mockHeaders = {
      authorization: 'mock-tock',
    };
    it('should get profile mapping count', async () => {
      const result = await controller.getProfiles(mockHeaders as any);

      expect(outletProfileMappingService.fetchProfileMappingCount).toHaveBeenCalled();
      expect(result.data).toEqual({ MIMOJO: 10 });
    });
  });
  describe('mapOutletToProfile', () => {
    const dto = {
      outletId: 'outlet-123',
      profileId: 'profile-456',
      mapToProfile: true,
      startDate: new Date(),
      endDate: new Date(),
      merchantId: 'merchant-id',
    };
    const userId = 'user-789';

    it('should return success response when mapping is successful', async () => {
      const serviceResult = true;
      (outletProfileMappingService.mapOutletToProfile as jest.Mock).mockResolvedValue(serviceResult);

      const result = await controller.mapOutletToProfile(dto, userId);

      expect(outletProfileMappingService.mapOutletToProfile).toHaveBeenCalledWith(dto, userId);
      expect(result.data).toEqual(serviceResult);
    });
  });

  describe('getMerchantIdByOutletId', () => {
    it('should return merchantId for valid outlet id', async () => {
      const outletId = 'outlet-123';
      outletGetService.getMerchantId = jest.fn().mockResolvedValue({ merchantId: mockOutlet.merchantId });
      const result = await controller.getMerchantIdByOutletId(outletId);
      expect(outletGetService.getMerchantId).toHaveBeenCalledWith(outletId);
      expect(result.data).toEqual({ merchantId: mockOutlet.merchantId });
    });
    it('should return null for merchant id  for invalid outlet id', async () => {
      const invalidOutletId = 'invalid-outlet-id';
      outletGetService.getMerchantId = jest.fn().mockResolvedValue(null);
      const result = await controller.getMerchantIdByOutletId(invalidOutletId);
      expect(outletGetService.getMerchantId).toHaveBeenCalledWith(invalidOutletId);
      expect(result.data).toEqual({ merchantId: null });
    });
  });

  it('should call outletService.getActiveFabOutlets and return response', async () => {
    const mockServiceResponse = [
      { outletId: 'O1', name: 'Outlet One' },
      { outletId: 'O2', name: 'Outlet Two' },
    ];

    // mock service return
    (outletService.getActiveFabOutlets as jest.Mock).mockResolvedValue(mockServiceResponse);

    const result = await controller.getActiveFabOutletDetails();

    expect(outletService.getActiveFabOutlets).toHaveBeenCalledTimes(1);
    expect(result.data).toEqual(mockServiceResponse);
  });
});
