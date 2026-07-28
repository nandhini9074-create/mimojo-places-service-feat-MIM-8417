import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/sequelize';
import { Transaction } from 'sequelize';
import { SubCategory } from 'src/sub-category/models/sub-category.model';
import { SubCategoryService } from '../sub-category.service';
import { buildQueryOptions } from 'src/common/helpers/query-utils';
import { SortDto } from 'src/common/dtos/sort.dto';
import { PaginationDto } from 'src/common/dtos/pagenation.dto';

jest.mock('src/common/helpers/query-utils');
describe('SubCategoryService', () => {
  let service: SubCategoryService;
  let subCategoryModel: typeof SubCategory;

  const mockSubCategoryModel = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
    findByPk: jest.fn(),
    findOrCreate:jest.fn(),
    findAndCountAll:jest.fn(),
    bulkCreate: jest.fn(),
    upsert: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubCategoryService,
        {
          provide: getModelToken(SubCategory),
          useValue: mockSubCategoryModel
        }
      ]
    }).compile();

    service = module.get<SubCategoryService>(SubCategoryService);
    subCategoryModel = module.get<typeof SubCategory>(getModelToken(SubCategory));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should insert subcategories', async () => {
    const subCategories = [{ subCategoryId: '1' }, { subCategoryId: '2' }];
    const transaction = {} as Transaction;
    jest.spyOn(service, 'deleteByIds').mockResolvedValue();
    mockSubCategoryModel.bulkCreate.mockResolvedValue(subCategories);

    await service.insert(subCategories as SubCategory[], transaction);

    expect(service.deleteByIds).toHaveBeenCalledWith(['1', '2'], transaction);
    expect(mockSubCategoryModel.bulkCreate).toHaveBeenCalledWith(subCategories, { transaction });
  });

  it('should upsert a subcategory', async () => {
    const subCategory = { subCategoryId: '1' } as SubCategory;
    const transaction = {} as Transaction;
    mockSubCategoryModel.upsert.mockResolvedValue([subCategory, true]);

    await service.upsert(subCategory, transaction);

    expect(mockSubCategoryModel.upsert).toHaveBeenCalledWith(subCategory, { transaction });
  });

  it('should delete subcategories by IDs', async () => {
    const ids = ['1', '2'];
    const transaction = {} as Transaction;
    mockSubCategoryModel.destroy.mockResolvedValue(2);

    await service.deleteByIds(ids, transaction);

    expect(mockSubCategoryModel.destroy).toHaveBeenCalledWith({
      where: { subCategoryId: ids },
      transaction
    });
  });
  describe('findAll', () => {
    const mockSubCategory = {
      subCategoryId: '1',
      name: 'Test SubCategory',
      categoryId: 'cat1',
    };
    it('should find all subcategories with query options', async () => {
      const sortDto: SortDto ={sort:['createdAt,desc']};
      const paginationDto: PaginationDto = { page: 1, limit: 10 };
      const search = 'test';
      const mockQueryOptions = { where: { name: { [Symbol('Op.iLike')]: '%test%' } }, order: [['name', 'ASC']] };
      const subCategories = [mockSubCategory];

      (buildQueryOptions as jest.Mock).mockReturnValue(mockQueryOptions);
      mockSubCategoryModel.findAll.mockResolvedValue(subCategories);

      const result = await service.findAll(sortDto, paginationDto, search);

      expect(buildQueryOptions).toHaveBeenCalledWith({
        sortDto,
        paginationDto,
        searchQuery: search,
      });
      expect(subCategoryModel.findAll).toHaveBeenCalledWith(mockQueryOptions);
      expect(result).toEqual(subCategories);
    });

    it('should handle empty search query', async () => {
      const sortDto: SortDto ={sort:['createdAt,desc']};
      const paginationDto: PaginationDto = { page: 1, limit: 10 };
      const search = '';
      const mockQueryOptions = { order: [['name', 'ASC']] };
      const subCategories = [mockSubCategory];

      (buildQueryOptions as jest.Mock).mockReturnValue(mockQueryOptions);
      mockSubCategoryModel.findAll.mockResolvedValue(subCategories);

      const result = await service.findAll(sortDto, paginationDto, search);

      expect(buildQueryOptions).toHaveBeenCalledWith({
        sortDto,
        paginationDto,
        searchQuery: search,
      });
      expect(subCategoryModel.findAll).toHaveBeenCalledWith(mockQueryOptions);
      expect(result).toEqual(subCategories);
    });

    it('should handle findAll failure', async () => {
      const sortDto: SortDto ={sort:['createdAt,desc']};
      const paginationDto: PaginationDto = { page: 1, limit: 10 };
      const search = 'test';
      const mockQueryOptions = { where: { name: { [Symbol('Op.iLike')]: '%test%' } } };

      (buildQueryOptions as jest.Mock).mockReturnValue(mockQueryOptions);
      mockSubCategoryModel.findAll.mockRejectedValue(new Error('FindAll failed'));

      await expect(service.findAll(sortDto, paginationDto, search)).rejects.toThrow('FindAll failed');
      expect(buildQueryOptions).toHaveBeenCalled();
      expect(subCategoryModel.findAll).toHaveBeenCalled();
    });
  });
});
