import { getModelToken } from '@nestjs/sequelize';
import { Test, TestingModule } from '@nestjs/testing';
import { CategoryService } from 'src/category/services/category.service';
import { FilterService } from 'src/filters/services/filter.service';
import { SubCategoryService } from 'src/sub-category/services/sub-category.service';
import { OutletFilterService } from '../outlet-filters.service';
import { OutletFilters } from 'src/outlet/models/outlet-filters.model';
import { Transaction } from 'sequelize';
import { CustomOutletFiltersDto } from 'src/outlet/dtos/custom-outlet-filter-dto';
import { SubCategoryEnum } from 'src/outlet/enums/sub-category-enum';
import { CustomPinoLogger } from 'src/logger/custom-logger.service';

const mockOutletFiltersModel = {
  bulkCreate: jest.fn(),
  destroy: jest.fn(),
  findAll: jest.fn(),
  findAndCountAll: jest.fn(),
  findOne: jest.fn(),
  upsert: jest.fn(),
};

const mockCategoryService = { upsert: jest.fn() };
const mockSubCategoryService = { upsert: jest.fn() };
const mockFilterService = { upsert: jest.fn() };

const transaction = {} as any;
const mockOutletFilter = { outletId: '1', filterId: 'f1', isCustomized: false, included: true };
const mockUserId = 'user-1';
describe('OutletFilterService', () => {
  let service: OutletFilterService;
  let categoryService: CategoryService;
  let subCategoryService: SubCategoryService;
  let filterService: FilterService;
  let outletFiltersModel: typeof OutletFilters;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OutletFilterService,
        { provide: getModelToken(OutletFilters), useValue: mockOutletFiltersModel },
        { provide: CategoryService, useValue: mockCategoryService },
        { provide: SubCategoryService, useValue: mockSubCategoryService },
        { provide: FilterService, useValue: mockFilterService },
        { provide: CustomPinoLogger, useValue: { info: jest.fn(), error: jest.fn() } },
      ],
    }).compile();

    service = module.get<OutletFilterService>(OutletFilterService);
    categoryService = module.get<CategoryService>(CategoryService);
    subCategoryService = module.get<SubCategoryService>(SubCategoryService);
    filterService = module.get<FilterService>(FilterService);
    outletFiltersModel = module.get<typeof OutletFilters>(getModelToken(OutletFilters));
  });

  afterEach(() => jest.clearAllMocks());

  it('should insert outlet filters', async () => {
    jest.spyOn(service, 'deleteByOutletIds').mockResolvedValueOnce();
    mockOutletFiltersModel.bulkCreate.mockResolvedValue([mockOutletFilter]);
    const result = await service.insert([mockOutletFilter] as any, transaction);
    expect(service.deleteByOutletIds).toHaveBeenCalled();
    expect(result).toEqual([mockOutletFilter]);
  });

  it('should get outlet ids by filter ids', async () => {
    mockOutletFiltersModel.findAll.mockResolvedValue([{ outlet_id: '1' }]);
    const result = await service.getOutletIdsByFilterIds([1]);
    expect(result).toEqual([{ outlet_id: '1' }]);
  });

  it('should get outlet ids using AND logic', async () => {
    mockOutletFiltersModel.findAndCountAll.mockResolvedValue({ rows: [{ outlet_id: '1' }] });
    const result = await service.getOutletIdsUsingAndOperation(['1'], true);
    expect(result).toEqual([{ outlet_id: '1' }]);
  });

  it('should get outlet ids using OR logic', async () => {
    mockOutletFiltersModel.findAndCountAll.mockResolvedValue({ rows: [{ outlet_id: '1' }] });
    const result = await service.getOutletIdsUsingOrOperation(['1'], true);
    expect(result).toEqual([{ outlet_id: '1' }]);
  });

  it('should delete by outlet ids', async () => {
    await service.deleteByOutletIds(['1'], transaction);
    expect(mockOutletFiltersModel.destroy).toHaveBeenCalledWith({
      where: { outletId: ['1'] },
      transaction,
    });
  });

  it('should delete by single outlet id', async () => {
    await service.deleteByOutletId('1', transaction);
    expect(mockOutletFiltersModel.destroy).toHaveBeenCalledWith({
      where: { outletId: '1' },
      transaction,
    });
  });

  it('should find by filter id and outlet id', async () => {
    mockOutletFiltersModel.findOne.mockResolvedValue(mockOutletFilter);
    const result = await service.findByFilterIdAndOutletId('f1', '1');
    expect(result).toEqual(mockOutletFilter);
  });

  it('should insert only non-customized filters', async () => {
    mockOutletFiltersModel.upsert.mockResolvedValue([mockOutletFilter]);
    await service.insertOnlyNotCustomized([mockOutletFilter] as any, transaction);
    expect(mockOutletFiltersModel.upsert).toHaveBeenCalledTimes(1);
  });

  it('should delete non-customized filters by outlet id', async () => {
    await service.deleteNotCustomizedByOutletId(['1'], transaction);
    expect(mockOutletFiltersModel.destroy).toHaveBeenCalledWith({
      where: { outletId: ['1'], isCustomized: false },
      transaction,
    });
  });

  it('should detect override flag', async () => {
    mockOutletFiltersModel.findOne.mockResolvedValueOnce({});
    const result = await service.hasOverrideFlag('1');
    expect(result).toBe(true);
  });

  it('should handle filter change', async () => {
    await service.handleFilterChange(
      [{ id: 'f1', name: 'Test', category: {}, subCategory: {} }] as any,
      transaction,
      'user'
    );
    expect(mockFilterService.upsert).toHaveBeenCalled();
  });

  it('should handle subcategory change', async () => {
    mockSubCategoryService.upsert.mockResolvedValue({});
    const result = await service.handleSubCategoryChange({ id: '1', name: 'Sub', type: 'type' } as any, transaction, 'user');
    expect(result).toBeDefined();
  });

  it('should handle category change', async () => {
    mockCategoryService.upsert.mockResolvedValue({});
    const result = await service.handleCategoryChange(
      { id: '1', name: 'Cat', imageUrl: 'url', isVirtual: false } as any,
      transaction,
      'user'
    );
    expect(result).toBeDefined();
  });

  it('should delete and insert only not customized filters if override is not set', async () => {
    jest.spyOn(service, 'hasOverrideFlag').mockResolvedValue(false);
    jest.spyOn(service, 'deleteByOutletId').mockResolvedValue(undefined);
    jest.spyOn(service, 'insertOnlyNotCustomized').mockResolvedValue(undefined);

    const data = {
      filters: [{ filterId: 'f1', MerchantFilter: { included: false } }, { filterId: 'f2' }],
    };

    const outletIds = ['outletA'];
    const transaction = {} as Transaction;

    await service.handleOutletNotCustomizedFiltersChange(data as any, transaction, outletIds, 'userX');

    expect(service.hasOverrideFlag).toHaveBeenCalledWith('outletA');
    expect(service.deleteByOutletId).toHaveBeenCalledWith('outletA', transaction);
    expect(service.insertOnlyNotCustomized).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          outletId: 'outletA',
          filterId: 'f1',
          isCustomized: false,
          included: false,
          updatedBy: 'userX',
        }),
      ]),
      transaction
    );
  });

  it('should insert filters for multiple outlets with isCustomized=false', async () => {
    jest.spyOn(service, 'insert').mockResolvedValue(undefined);
    const data = {
      filters: [
        { filterId: 'f1', MerchantFilter: { included: true } },
        { filterId: 'f2', MerchantFilter: {} },
      ],
    };

    const outletIds = ['o1', 'o2'];

    await service.handleOutletFiltersChange(data as any, {} as Transaction, outletIds);

    expect(service.insert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ outletId: 'o1', filterId: 'f1', isCustomized: false }),
        expect.objectContaining({ outletId: 'o2', filterId: 'f2', isCustomized: false }),
      ]),
      expect.anything()
    );
  });

  describe('addOutletFilters', () => {
    it('should insert filters when customOutletFilters is provided', async () => {
      const outletId = 'outlet-1';
      const customOutletFilters: CustomOutletFiltersDto[] = [
        {
          isCustomized: true,
          included: true,
          filter: {
            id: 'filter-1',
            name: 'Filter One',
            category: {
              id: 'cat-1',
              name: 'Category One',
              imageUrl: 'cat-image',
              isVirtual: false,
            },
            subCategory: {
              id: 'sub-1',
              name: 'SubCategory One',
              type: SubCategoryEnum.GENERAL,
            },
            categoryId: 0,
            subCategoryId: 0,
          },
          id: '',
        },
      ];

      const insertSpy = jest.spyOn(service as any, 'insert').mockResolvedValue(undefined);

      await service.addOutletFilters(outletId, customOutletFilters, transaction, mockUserId);
      expect(insertSpy).toHaveBeenCalledWith(expect.any(Array), transaction);
    });

    it('should delete filters if customOutletFilters is empty', async () => {
      const outletId = 'outlet-2';
      const deleteSpy = jest.spyOn(service as any, 'deleteByOutletIds').mockResolvedValue(undefined);

      await service.addOutletFilters(outletId, [], transaction, mockUserId);

      expect(deleteSpy).toHaveBeenCalledWith([outletId], transaction);
    });
  });
});
