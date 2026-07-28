import { HttpException, NotFoundException } from '@nestjs/common';
import { OutletCustomCrudService } from '../outlet-custom-crud.service';
import { OutletStatusEnum, OutletFastPaymentStatusEnum } from 'src/outlet/enums/outlet-status-enum';
import { CreateCustomOutletDto } from 'src/outlet/dtos/create-custom-outlet-dto';

describe('OutletCustomCrudService', () => {
  const outletModel = {
    sequelize: { query: jest.fn() },
    create: jest.fn(),
    update: jest.fn(),
    findOne: jest.fn(),
  } as any;
  const outletFilterService = { addOutletFilters: jest.fn() } as any;
  const outletHelperService = { mapFilterDto: jest.fn() } as any;
  const fastPaymentServiceProxy = {
    updateOutlet: jest.fn(),
    upsertFastPaymentStatus: jest.fn(),
    addOutletTab: jest.fn(),
    addOutletConfig: jest.fn(),
    addOutletPriceConfig: jest.fn(),
  } as any;
  const outletProducer = { pushToKafka: jest.fn() } as any;
  const merchantService = { getMerchantById: jest.fn() } as any;
  const logger = { info: jest.fn(), error: jest.fn() } as any;

  let service: OutletCustomCrudService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new OutletCustomCrudService(
      outletModel,
      outletFilterService,
      outletHelperService,
      fastPaymentServiceProxy,
      outletProducer,
      merchantService,
      logger
    );
  });

  describe('buildMerchantOutletData', () => {
    it('returns merchant and outlet data from metadata', () => {
      const data = {
        merchantId: 'm1',
        outletAddress: { location: ' Downtown', locationAr: ' وسط المدينة' },
      } as any;
      const merchantMetadata = {
        name: ' Merchant ',
        nameAr: ' التاجر ',
        imageUrl: 'logo.png',
        desc: 'desc',
        descAr: 'descAr',
        status: 'PENDING',
        fastPaymentStatus: 'PENDING',
      } as any;

      const result = service.buildMerchantOutletData(data, merchantMetadata);

      expect(result).toEqual({
        merchantName: 'Merchant',
        merchantNameAr: 'التاجر',
        merchantLogo: 'logo.png',
        merchantDesc: 'desc',
        merchantDescAr: 'descAr',
        outletName: 'Merchant - Downtown',
        outletNameAr: 'التاجر - وسط المدينة',
        outletStatus: OutletStatusEnum.Pending,
        fastPaymentStatus: OutletFastPaymentStatusEnum.PENDING,
      });
    });

    it('returns Not Enrolled when merchant status is NOT ENROLLED', () => {
      const data = { outletAddress: {} } as CreateCustomOutletDto;
      const merchantMetadata = {
        name: 'M',
        nameAr: null,
        imageUrl: null,
        desc: null,
        descAr: null,
        status: 'NOT ENROLLED',
        fastPaymentStatus: 'NOT ENROLLED',
      } as any;

      const result = service.buildMerchantOutletData(data, merchantMetadata);

      expect(result.outletStatus).toBe(OutletStatusEnum['Not Enrolled']);
      expect(result.fastPaymentStatus).toBe(OutletFastPaymentStatusEnum['NOT ENROLLED']);
    });

    it('returns null outletName when location is missing', () => {
      const data = { outletAddress: { location: '' } } as CreateCustomOutletDto;
      const merchantMetadata = {
        name: 'M',
        nameAr: null,
        imageUrl: null,
        desc: null,
        descAr: null,
        status: 'PENDING',
        fastPaymentStatus: 'PENDING',
      } as any;

      const result = service.buildMerchantOutletData(data, merchantMetadata);

      expect(result.outletName).toBeNull();
      expect(result.outletNameAr).toBeNull();
    });
  });

  describe('mergeMerchantDescriptions', () => {
    it('merges artDesc from merchant when data.artDesc is empty', () => {
      const data = { artDesc: [], competitorDesc: [] } as CreateCustomOutletDto;
      const merchantMetadata = { artDesc: ['a1'], competitorDesc: ['c1'] } as any;

      service.mergeMerchantDescriptions(data, merchantMetadata);

      expect(data.artDesc).toEqual(['a1']);
      expect(data.competitorDesc).toEqual(['c1']);
    });

    it('appends merchant artDesc when data.id is missing', () => {
      const data = { artDesc: ['a0'], competitorDesc: ['c0'], id: undefined } as CreateCustomOutletDto;
      const merchantMetadata = { artDesc: ['a1'], competitorDesc: ['c1'] } as any;

      service.mergeMerchantDescriptions(data, merchantMetadata);

      expect(data.artDesc).toEqual(['a0', 'a1']);
      expect(data.competitorDesc).toEqual(['c0', 'c1']);
    });
  });

  describe('validateMidPidRelations', () => {
    it('returns empty array when jsonArray is empty', async () => {
      const data = {} as CreateCustomOutletDto;
      const midMatch: string[] = [];

      const result = await service.validateMidPidRelations(data, [], midMatch);

      expect(result).toEqual([]);
      expect(outletModel.sequelize.query).not.toHaveBeenCalled();
    });

    it('returns empty array when tidResponse is empty', async () => {
      const data = { midPidRelation: [{ merchantId: 'm1', posIds: ['p1'] }] } as CreateCustomOutletDto;
      const jsonArray = [{ merchantId: 'm1', posIds: ['p1'] }];
      const midMatch: string[] = [];

      outletModel.sequelize.query.mockResolvedValue([]);

      const result = await service.validateMidPidRelations(data, jsonArray, midMatch);

      expect(result).toEqual([]);
    });

    it('returns midMatch when matching merchant found without posIds overlap', async () => {
      const data = { id: 'o1', midPidRelation: [{ merchantId: 'm1', posIds: ['p1'] }] } as CreateCustomOutletDto;
      const jsonArray = [{ merchantId: 'm1', posIds: ['p2'] }];
      const midMatch: string[] = [];

      outletModel.sequelize.query.mockResolvedValue([
        {
          dataValues: {
            outletId: 'o2',
            name: 'Other Outlet',
            midPidRelation: [{ merchantId: 'm1', posIds: ['p2'] }],
          },
        },
      ]);

      const result = await service.validateMidPidRelations(data, jsonArray, midMatch);

      expect(midMatch).toContain('The merchant id m1 is already used in outlet Other Outlet');
      expect(result.length).toBeGreaterThan(0);
    });

    it('throws when matching posIds found', async () => {
      const data = { id: 'o1', midPidRelation: [{ merchantId: 'm1', posIds: ['p1'] }] } as CreateCustomOutletDto;
      const jsonArray = [{ merchantId: 'm1', posIds: ['p1'] }];
      const midMatch: string[] = [];

      outletModel.sequelize.query.mockResolvedValue([
        {
          dataValues: {
            outletId: 'o2',
            name: 'Other Outlet',
            midPidRelation: [{ merchantId: 'm1', posIds: ['p1', 'p2'] }],
          },
        },
      ]);

      await expect(service.validateMidPidRelations(data, jsonArray, midMatch)).rejects.toThrow(HttpException);
    });
  });

  describe('mergeMerchantDescriptions', () => {
    it('keeps data.artDesc when data has id', () => {
      const data = { id: 'o1', artDesc: ['a0'], competitorDesc: ['c0'] } as CreateCustomOutletDto;
      const merchantMetadata = { artDesc: ['a1'], competitorDesc: ['c1'] } as any;

      service.mergeMerchantDescriptions(data, merchantMetadata);

      expect(data.artDesc).toEqual(['a0']);
      expect(data.competitorDesc).toEqual(['c0']);
    });
  });

  describe('addEditCustomOutlet', () => {
    const makeMerchant = () =>
      ({
        name: 'Merchant',
        nameAr: 'MerchantAr',
        imageUrl: 'logo.png',
        desc: 'desc',
        descAr: 'descAr',
        status: 'PENDING',
        fastPaymentStatus: 'PENDING',
        artDesc: [],
        competitorDesc: [],
      }) as any;

    it('creates new custom outlet', async () => {
      const data = {
        merchantId: 'm1',
        outletAddress: { location: ' Downtown', locationAr: ' وسط المدينة' },
        outletFilters: [],
      } as any;
      const createdOutlet = {
        outletId: 'o1',
        dataValues: { outletId: 'o1' },
      } as any;
      merchantService.getMerchantById.mockResolvedValue(makeMerchant());
      outletModel.sequelize.query.mockResolvedValue([]);
      outletModel.create.mockResolvedValue(createdOutlet);
      outletHelperService.mapFilterDto.mockReturnValue([]);
      fastPaymentServiceProxy.upsertFastPaymentStatus.mockResolvedValue({});

      const result = await service.addEditCustomOutlet(data, {} as any, {}, 'u1');

      expect(outletModel.create).toHaveBeenCalled();
      expect(outletFilterService.addOutletFilters).toHaveBeenCalled();
      expect(fastPaymentServiceProxy.upsertFastPaymentStatus).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('updates existing custom outlet', async () => {
      const data = {
        id: 'o1',
        merchantId: 'm1',
        outletAddress: { location: ' Downtown', locationAr: ' وسط المدينة' },
        outletFilters: [],
        messageDescription: 'msg',
      } as any;
      const updatedOutlet = {
        outletId: 'o1',
        dataValues: { outletId: 'o1' },
      } as any;
      merchantService.getMerchantById.mockResolvedValue(makeMerchant());
      outletModel.sequelize.query.mockResolvedValue([]);
      outletModel.update.mockResolvedValue([1, [updatedOutlet]]);
      fastPaymentServiceProxy.updateOutlet.mockResolvedValue({ data: { description: 'fp-desc' } });

      const result = await service.addEditCustomOutlet(data, {} as any, {}, 'u1');

      expect(outletModel.update).toHaveBeenCalled();
      expect(fastPaymentServiceProxy.updateOutlet).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('attaches tabs and config when present', async () => {
      const data = {
        merchantId: 'm1',
        outletAddress: { location: 'Loc', locationAr: 'LocAr' },
        outletFilters: [],
        tabs: [{ id: 't1' }],
        config: { countryName: 'UAE', cityName: 'Dubai' },
        priceConfig: { currencyId: 'aed' },
      } as any;
      const createdOutlet = { outletId: 'o1', dataValues: { outletId: 'o1' } } as any;
      merchantService.getMerchantById.mockResolvedValue(makeMerchant());
      outletModel.sequelize.query.mockResolvedValue([]);
      outletModel.create.mockResolvedValue(createdOutlet);
      outletHelperService.mapFilterDto.mockReturnValue([]);
      fastPaymentServiceProxy.upsertFastPaymentStatus.mockResolvedValue({});
      fastPaymentServiceProxy.addOutletTab.mockResolvedValue({ data: { data: { tabs: [] } } });
      fastPaymentServiceProxy.addOutletConfig.mockResolvedValue({ data: { data: {} } });
      fastPaymentServiceProxy.addOutletPriceConfig.mockResolvedValue({ data: { data: {} } });

      const result = await service.addEditCustomOutlet(data, {} as any, {}, 'u1');

      expect(fastPaymentServiceProxy.addOutletTab).toHaveBeenCalled();
      expect(fastPaymentServiceProxy.addOutletConfig).toHaveBeenCalled();
      expect(fastPaymentServiceProxy.addOutletPriceConfig).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('pushes posConfig to kafka when present', async () => {
      process.env.KAFKA_POS_TOPIC = 'pos-topic';
      const data = {
        merchantId: 'm1',
        outletAddress: { location: 'Loc', locationAr: 'LocAr' },
        outletFilters: [],
        posConfig: { terminalId: 't1' },
      } as any;
      const createdOutlet = { outletId: 'o1', dataValues: { outletId: 'o1' } } as any;
      merchantService.getMerchantById.mockResolvedValue(makeMerchant());
      outletModel.sequelize.query.mockResolvedValue([]);
      outletModel.create.mockResolvedValue(createdOutlet);
      outletHelperService.mapFilterDto.mockReturnValue([]);
      fastPaymentServiceProxy.upsertFastPaymentStatus.mockResolvedValue({});

      await service.addEditCustomOutlet(data, {} as any, {}, 'u1');

      expect(outletProducer.pushToKafka).toHaveBeenCalledWith(
        'pos-config',
        expect.objectContaining({ outletId: 'o1', terminalId: 't1' }),
        'pos-topic'
      );
    });

    it('adds warning to response when midMatch has items', async () => {
      const data = {
        merchantId: 'm1',
        outletAddress: { location: 'Loc', locationAr: 'LocAr' },
        midPidRelation: [{ merchantId: 'm1', posIds: ['p1'] }],
        outletFilters: [],
      } as any;
      const createdOutlet = { outletId: 'o1', dataValues: { outletId: 'o1' } } as any;
      merchantService.getMerchantById.mockResolvedValue(makeMerchant());
      outletModel.sequelize.query.mockResolvedValue([
        {
          dataValues: {
            outletId: 'o2',
            name: 'Other',
            midPidRelation: [{ merchantId: 'm1', posIds: ['p2', 'p3'] }],
          },
        },
      ]);
      outletModel.create.mockResolvedValue(createdOutlet);
      outletHelperService.mapFilterDto.mockReturnValue([]);
      fastPaymentServiceProxy.upsertFastPaymentStatus.mockResolvedValue({});

      const result = await service.addEditCustomOutlet(data, {} as any, {}, 'u1');

      expect((result as any).dataValues.warning).toBeDefined();
      expect((result as any).dataValues.warning).toContain('The merchant id m1 is already used in outlet Other');
    });
  });

  describe('insertCustomOutlet', () => {
    it('creates outlet with correct payload', async () => {
      const data = {
        merchantId: 'm1',
        rating: 4,
        priceLevel: 2,
        website: 'https://example.com',
        outletAddress: { location: 'Loc' },
      } as any;
      const createdOutlet = { outletId: 'o1' } as any;
      outletModel.create.mockResolvedValue(createdOutlet);

      const result = await service.insertCustomOutlet(
        data,
        {} as any,
        'Merchant',
        'logo',
        'Outlet Name',
        'Outlet Name Ar',
        'desc',
        'descAr',
        [],
        'u1',
        'MerchantAr',
        OutletStatusEnum.Pending,
        OutletFastPaymentStatusEnum.PENDING
      );

      expect(outletModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          merchantId: 'm1',
          merchantName: 'Merchant',
          merchantNameAr: 'MerchantAr',
          status: OutletStatusEnum.Pending,
          fastPaymentStatus: OutletFastPaymentStatusEnum.PENDING,
        }),
        expect.any(Object)
      );
      expect(result).toEqual(createdOutlet);
    });
  });

  describe('updateCustomOutlet', () => {
    it('updates outlet and returns updated row', async () => {
      const data = {
        id: 'o1',
        merchantId: 'm1',
        bookingUrl: 'https://book.com',
        menuUrl: 'https://menu.com',
      } as any;
      const updatedOutlet = { outletId: 'o1' } as any;
      outletModel.update.mockResolvedValue([1, [updatedOutlet]]);

      const result = await service.updateCustomOutlet(
        data,
        {} as any,
        'Merchant',
        'logo',
        'Name',
        'NameAr',
        'desc',
        'descAr',
        [],
        'u1',
        'MerchantAr'
      );

      expect(outletModel.update).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ where: { outletId: 'o1' } })
      );
      expect(result).toEqual(updatedOutlet);
    });

    it('throws NotFoundException when no rows affected', async () => {
      const data = { id: 'o1', merchantId: 'm1' } as CreateCustomOutletDto;
      outletModel.update.mockResolvedValue([0, []]);

      await expect(
        service.updateCustomOutlet(data, {} as any, 'M', '', 'N', 'NAr', 'd', 'dAr', [], 'u1', 'MAr')
      ).rejects.toThrow(NotFoundException);
    });
  });
});
