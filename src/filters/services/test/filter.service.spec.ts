import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/sequelize';
import { Transaction } from 'sequelize';
import { Op } from 'sequelize';
import { Filter } from 'src/filters/models/filter.model';
import { SubCategory } from 'src/sub-category/models/sub-category.model';
import { FilterService } from '../filter.service';

const mockFilterModel = {
  bulkCreate: jest.fn(),
  upsert: jest.fn(),
  destroy: jest.fn(),
  findAll: jest.fn(),
};

describe('FilterService', () => {
  let service: FilterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FilterService,
        {
          provide: getModelToken(Filter),
          useValue: mockFilterModel,
        },
      ],
    }).compile();

    service = module.get<FilterService>(FilterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should insert filters', async () => {
    const filters = [{ filterId: '1', name: 'Filter1' } as Filter];
    const transaction = {} as Transaction;
    mockFilterModel.bulkCreate.mockResolvedValue(filters);

    const result = await service.insert(filters, transaction);

    expect(mockFilterModel.bulkCreate).toHaveBeenCalledWith(filters, { transaction });
    expect(result).toEqual(filters);
  });

  it('should upsert a filter', async () => {
    const filter = { filterId: '1', name: 'Filter1' } as Filter;
    const transaction = {} as Transaction;
    mockFilterModel.upsert.mockResolvedValue([filter, true]);

    const result = await service.upsert(filter, transaction);

    expect(mockFilterModel.upsert).toHaveBeenCalledWith(filter, { transaction });
    expect(result).toEqual(filter);
  });

  it('should delete filters by IDs', async () => {
    const ids = ['1', '2'];
    const transaction = {} as Transaction;
    mockFilterModel.destroy.mockResolvedValue(1);

    await service.deleteByIds(ids, transaction);

    expect(mockFilterModel.destroy).toHaveBeenCalledWith({ where: { filterId: ids }, transaction });
  });

  it('should get filter IDs by category ID', async () => {
    const categoryId = '123';
    const filters = [{ filter_id: '1' }];
    mockFilterModel.findAll.mockResolvedValue(filters);

    const result = await service.getFilterIdsByCategoryId(categoryId);

    expect(mockFilterModel.findAll).toHaveBeenCalledWith({
      attributes: ['filter_id'],
      where: { categoryId },
    });
    expect(result).toEqual(filters);
  });

  it('should get filters by filter IDs', async () => {
    const filterIds = ['1', '2'];
    const filters = [
      { filterId: '1', name: 'Filter1', subCategory: { name: 'Sub1', type: 'Type1' } },
    ];
    mockFilterModel.findAll.mockResolvedValue(filters);

    const result = await service.getByFilterIds(filterIds);

    expect(mockFilterModel.findAll).toHaveBeenCalledWith({
      attributes: ['filterId', 'name'],
      include: [{ model: SubCategory, attributes: ['name', 'type'] }],
      where: { filterId: { [Op.in]: filterIds } },
    });
    expect(result).toEqual(filters);
  });
});
