import { Test, TestingModule } from '@nestjs/testing';

import { getModelToken } from '@nestjs/sequelize';
import { Transaction } from 'sequelize';
import { MerchantFilter } from 'src/merchant-filters/entities/merchant-filters.model';
import { MerchantFiltersService } from 'src/merchant-filters/services/merchant-filters.service';

describe('MerchantFiltersService', () => {
  let service: MerchantFiltersService;
  let model: typeof MerchantFilter;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MerchantFiltersService,
        {
          provide: getModelToken(MerchantFilter),
          useValue: {
            rawAttributes: {
              id: {},
              name: {},
              createdAt: {},
              updatedAt: {},
            },
            associations: {},
            options: {
              name: {
                singular: 'merchantFilter',
                plural: 'merchantFilters'
              }
            },
            findAll: jest.fn(),
            findOne: jest.fn(),
            count: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            destroy: jest.fn(),
            findByPk: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<MerchantFiltersService>(MerchantFiltersService);
    model = module.get<typeof MerchantFilter>(getModelToken(MerchantFilter));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a merchant filter without transaction', async () => {
      const data = { filterName: 'New Filter' } as Partial<MerchantFilter>;
      const createdResult = { id: 'filter-id', ...data };

      (model.create as jest.Mock).mockResolvedValue(createdResult);

      const result = await service.create(data);

      expect(model.create).toHaveBeenCalledWith(data, {
        transaction: null,
        returning: true,
      });
      expect(result).toEqual(createdResult);
    });

    it('should create a merchant filter with transaction', async () => {
      const data = { filterName: 'New Filter' } as Partial<MerchantFilter>;
      const transaction = {} as Transaction;
      const createdResult = { id: 'filter-id', ...data };

      (model.create as jest.Mock).mockResolvedValue(createdResult);

      const result = await service.create(data, transaction);

      expect(model.create).toHaveBeenCalledWith(data, {
        transaction,
        returning: true,
      });
      expect(result).toEqual(createdResult);
    });
  });

  describe('updateMerchantFiltersStatus', () => {
    it('should update merchant filters status', async () => {
      const merchantId = 'merchant-123';
      const filterIds = ['filter-1', 'filter-2'];
      const included = true;
      const transaction = {} as Transaction;
      const updatedBy = 'admin-user';

      (model.update as jest.Mock).mockResolvedValue([1]); // 1 row updated

      await service.updateMerchantFiltersStatus(
        merchantId,
        filterIds,
        included,
        transaction,
        updatedBy,
      );

      expect(model.update).toHaveBeenCalledWith(
        { included, updatedBy },
        {
          where: {
            merchantId: merchantId,
            filterId: filterIds,
          },
          transaction,
        },
      );
    });
  });
});
