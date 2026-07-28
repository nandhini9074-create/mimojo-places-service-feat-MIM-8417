import { Category } from 'src/category/models/category.model';
import { CategoryService } from '../category.service';
import { getModelToken, getConnectionToken } from '@nestjs/sequelize';
import { TestingModule, Test } from '@nestjs/testing';
import { Filter } from 'src/filters/models/filter.model';
import { MerchantFilter } from 'src/merchant-filters/entities/merchant-filters.model';
import { Merchant } from 'src/merchant/entities/merchant.model';
import { SubCategory } from 'src/sub-category/models/sub-category.model';
import { HttpException, HttpStatus, NotFoundException } from '@nestjs/common';
import { CmsUpdateCategoryDto } from 'src/category/dtos/cms-update-category.dto';
import { CustomPinoLogger } from 'src/logger/custom-logger.service';

describe('CategoryService', () => {
  let service: CategoryService;
  let categoryModel: any;
  let filterModel: any;
  let merchantFilterModel: any;
  let subCategoryModel: any;
  let mockTransaction: any;
  const mockCategoryModel = {
    rawAttributes: {
      id: {},
      name: {},
      createdAt: {},
      updatedAt: {},
    },
    associations: {},
    options: {
      name: {
        singular: 'category',
        plural: 'categories',
      },
    },
    findAll: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
    bulkCreate: jest.fn().mockResolvedValue([]),
    upsert: jest.fn().mockResolvedValue([{}, true]),
    findByPk: jest.fn().mockResolvedValue({}),
  };
  const mockFilterModel = {
    rawAttributes: {
      id: {},
      name: {},
      createdAt: {},
      updatedAt: {},
    },
    associations: {},
    options: {
      name: {
        singular: 'filter',
        plural: 'filters',
      },
    },
    findAll: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findByPk: jest.fn(),
    destroy: jest.fn(),
  };
  const mockMerchantFilterModel = {
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
        plural: 'merchantFilters',
      },
    },
    findAll: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };
  const mockSequelize = {
    transaction: jest.fn(callback => callback(mockTransaction)),
  };

  const mockSubCategoryModel = {
    rawAttributes: {
      id: {},
      name: {},
      createdAt: {},
      updatedAt: {},
    },
    associations: {},
    options: {
      name: {
        singular: 'filter',
        plural: 'filters',
      },
    },
    findAll: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn(),
    create: jest.fn().mockImplementation(data =>
      Promise.resolve({
        subCategoryId: 'new-subcategory-id',
        ...data,
      })
    ),
    update: jest.fn(),
    findByPk: jest.fn().mockResolvedValue({ subCategoryId: 'subcategory-id', filters: [] }),
    destroy: jest.fn(),
  };

  const mockLogger = {
    error: jest.fn(),
  };
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryService,
        {
          provide: getModelToken(Category),
          useValue: mockCategoryModel,
        },
        {
          provide: getModelToken(Filter),
          useValue: mockFilterModel,
        },
        {
          provide: getModelToken(MerchantFilter),
          useValue: mockMerchantFilterModel,
        },
        {
          provide: getConnectionToken('default'),
          useValue: mockSequelize,
        },
        {
          provide: getModelToken(SubCategory),
          useValue: mockSubCategoryModel,
        },
        {
          provide: CustomPinoLogger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<CategoryService>(CategoryService);
    categoryModel = module.get(getModelToken(Category));
    filterModel = module.get(getModelToken(Filter));
    merchantFilterModel = module.get(getModelToken(MerchantFilter));
    subCategoryModel = module.get(getModelToken(SubCategory));
  });
  afterEach(() => {
    jest.clearAllMocks();
  });
  it('should insert a category', async () => {
    const category = { id: '1', name: 'Test Category' } as Category;
    categoryModel.create.mockResolvedValue(category);
    jest.spyOn(service, 'deleteByIds').mockResolvedValue(undefined);

    const result = await service.insert(category, {} as any);

    expect(service.deleteByIds).toHaveBeenCalledWith(category.id, expect.anything());
    expect(categoryModel.create).toHaveBeenCalledWith(category, { transaction: expect.anything() });
    expect(result).toEqual(category);
  });

  it('should insert multiple categories', async () => {
    const categories = [{ categoryId: '1', name: 'Cat1' } as Category, { categoryId: '2', name: 'Cat2' } as Category];
    categoryModel.bulkCreate.mockResolvedValue(categories);
    jest.spyOn(service, 'deleteByIds').mockResolvedValue(undefined);

    const result = await service.insertBulk(categories, {} as any);

    expect(service.deleteByIds).toHaveBeenCalledWith(['1', '2'], expect.anything());
    expect(categoryModel.bulkCreate).toHaveBeenCalledWith(categories, { transaction: expect.anything() });
    expect(result).toEqual(categories);
  });

  it('should upsert a category', async () => {
    const category = { id: '1', name: 'Test Category' } as Category;
    categoryModel.upsert.mockResolvedValue([category, true]);

    const result = await service.upsert(category, {} as any);

    expect(categoryModel.upsert).toHaveBeenCalledWith(category, { transaction: expect.anything() });
    expect(result).toEqual([category, true]);
  });

  it('should delete categories by IDs', async () => {
    categoryModel.destroy.mockResolvedValue(1);

    await service.deleteByIds(['1', '2'], {} as any);

    expect(categoryModel.destroy).toHaveBeenCalledWith({
      where: { categoryId: ['1', '2'] },
      transaction: expect.anything(),
    });
  });

  it('should get all categories', async () => {
    const categories = [
      { category_id: '1', name: 'Food' },
      { category_id: '2', name: 'Retail' },
    ];
    categoryModel.findAll.mockResolvedValue(categories);

    const result = await service.getAllCategories();

    expect(categoryModel.findAll).toHaveBeenCalledWith({
      attributes: [['category_id', 'id'], 'name'],
    });
    expect(result).toEqual(categories);
  });

  it('should get category by ID', async () => {
    const category = { categoryId: '1', name: 'Test Category' } as Category;
    categoryModel.findOne.mockResolvedValue(category);

    const result = await service.getCategoryById('1');

    expect(categoryModel.findOne).toHaveBeenCalledWith({ where: { categoryId: '1' } });
    expect(result).toEqual(category);
  });

  it('should get subcategories based on categoryId and cityId', async () => {
    const mockResponse = {
      dataValues: {
        filters: [
          {
            dataValues: {
              filter: 'Filter 1',
              filterNameAr: 'فلتر ١',
              subCategoryName: 'Sub 1',
              subCategoryNameAr: 'تصنيف فرعي ١',
            },
          },
        ],
      },
    };
    categoryModel.findByPk.mockResolvedValue(mockResponse);

    const result = await service.getSubCategoriesHasOutlet('1', '2', 'ar');

    expect(categoryModel.findByPk).toHaveBeenCalled();
    expect(result.dataValues.filters[0].dataValues['filter']).toBe('فلتر ١');
    expect(result.dataValues.filters[0].dataValues['subCategoryName']).toBe('تصنيف فرعي ١');
  });

  it('should return null if no subcategories found', async () => {
    categoryModel.findByPk.mockResolvedValue(null);

    const result = await service.getSubCategoriesHasOutlet('1', '2', 'en');

    expect(categoryModel.findByPk).toHaveBeenCalled();
    expect(result).toBeNull();
  });
  describe('getSubCategories', () => {
    it('should call findByPk with correct filters for consumer app', async () => {
      mockCategoryModel.findByPk.mockResolvedValue({});
      await service.getSubCategories('cat123', true);
      expect(mockCategoryModel.findByPk).toHaveBeenCalledWith('cat123', expect.any(Object));
    });

    it('should call findByPk with correct filters for merchant app', async () => {
      mockCategoryModel.findByPk.mockResolvedValue({});
      await service.getSubCategories('cat123', false);
      expect(mockCategoryModel.findByPk).toHaveBeenCalledWith('cat123', expect.any(Object));
    });
  });

  describe('getSubCategoriesHasOutlet', () => {
    it('should call findByPk and format response values based on language', async () => {
      const mockResponse = {
        dataValues: {
          filters: [
            {
              dataValues: {
                id: 'filter123',
                filterId: 'English', // Using filterId instead of filter
                filterNameAr: 'Arabic',
                subCategory: 'English SC', // Using subCategory instead of subCategoryName
                subCategoryNameAr: 'Arabic SC',
                type: 'someType',
                subCategoryId: 'subCat123',
                categoryId: 'cat123',
              },
            },
          ],
        },
      };

      mockCategoryModel.findByPk.mockResolvedValue(mockResponse);

      const result = await service.getSubCategoriesHasOutlet('cat123', 'city123', 'ar');
      const filterData = result.dataValues.filters[0].dataValues as unknown as {
        filter: string;
        filterNameAr: string;
        subCategoryName: string;
        subCategoryNameAr: string;
      };

      expect(filterData.filter).toBe('Arabic');
      expect(filterData.subCategoryName).toBe('Arabic SC');
    });
  });

  describe('findAll', () => {
    const mockSort = { sort: ['createdAt', 'desc'] };
    const mockPagination = { page: 1, limit: 10 };

    it('should return paginated result with transformed data', async () => {
      process.env['SHOW_ME_EVERYTHING_CATEGORY_ID'] = 'showAll';

      const mockCategories = [
        {
          id: 'cat1',
          imageUrl: 'img1',
          darkImageUrl: 'dark1',
          isAnimated: true,
          dataValues: { id: 'cat1', name: 'English1', nameAr: 'Arabic1' },
        },
        {
          id: 'showAll',
          imageUrl: 'img2',
          darkImageUrl: 'dark2',
          isAnimated: false,
          dataValues: { id: 'showAll', name: 'English2', nameAr: 'Arabic2' },
        },
      ];

      mockCategoryModel.findAll.mockResolvedValue(mockCategories);
      mockCategoryModel.count.mockResolvedValue(2);

      const result = await service.findAll('ar', mockSort, mockPagination);

      expect(result.data).toHaveLength(2);

      expect(result.data[0].dataValues.name).toBe('Arabic1');
      expect(result.data[0].dataValues.nameAr).toBeUndefined();
      expect(result.data[0].dataValues['isShowMeEverything']).toBe(false);

      expect(result.data[1].dataValues.name).toBe('Arabic2');
      expect(result.data[1].dataValues.nameAr).toBeUndefined();
      expect(result.data[1].dataValues['isShowMeEverything']).toBe(true);
      expect(result.data[1].dataValues['imageUrls']).toEqual([
        { imageUrl: 'img2', darkImageUrl: 'dark2', isAnimated: false },
        { imageUrl: 'img1', darkImageUrl: 'dark1', isAnimated: true },
      ]);

      expect(result.pagination.total).toBe(2);
      expect(result.pagination.page).toBe(1);
      expect(result.data.length).toBeLessThanOrEqual(mockPagination.limit);
    });

    it('should throw HttpException and log error on failure', async () => {
      const mockError = {
        response: { data: { message: 'Something went wrong' } },
        status: HttpStatus.BAD_REQUEST,
      };

      mockCategoryModel.findAll.mockRejectedValue(mockError);

      await expect(service.findAll('en', mockSort, mockPagination, 'testSearch')).rejects.toThrow(
        new HttpException('Something went wrong', HttpStatus.BAD_REQUEST)
      );

      expect(mockLogger.error).toHaveBeenCalledWith('CategoryService.findAll - exception', {
        error: mockError,
        searchQuery: 'testSearch',
        sortDto: mockSort,
        paginationDto: mockPagination,
      });
    });
  });

  describe('getOverridableSubCategories', () => {
    it('should return preferences filters if merchant and filters exist', async () => {
      Merchant.findByPk = jest.fn().mockResolvedValue({});
      mockFilterModel.findAll.mockResolvedValue(['mockFilter']);
      const result = await service.getOverridableSubCategories('merchant123');
      expect(result).toEqual(['mockFilter']);
    });

    it('should return empty array if merchant not found', async () => {
      Merchant.findByPk = jest.fn().mockResolvedValue(null);
      const result = await service.getOverridableSubCategories('merchant123');
      expect(result).toEqual([]);
    });
  });

  describe('cmsFindAllCategories', () => {
    const mockSort = { sort: ['createdAt', 'desc'] };
    const mockPagination = { page: 1, limit: 10 };
    const search = 'search';
    it('should call findAll and count and return paginated categories', async () => {
      mockCategoryModel.count.mockResolvedValue(2);
      mockCategoryModel.findAll.mockResolvedValueOnce([{ id: '1' }, { id: '2' }]);
      mockCategoryModel.findAll.mockResolvedValueOnce(['categoryResult']);
      const result = await service.cmsFindAllCategories(mockSort, mockPagination, search);
      expect(result.data).toEqual(['categoryResult']);
    });
  });

  describe('cmsFindOneCategory', () => {
    it('should call findByPk with correct id', async () => {
      mockCategoryModel.findByPk.mockResolvedValue('mockCategory');
      const result = await service.cmsFindOneCategory('id1');
      expect(result).toEqual('mockCategory');
    });
  });
  describe('cmsUpdateCategory', () => {
    it('should set nameAr equal to name when nameAr is not provided', async () => {
      // Arrange
      const categoryId = '123';
      const updateDto: CmsUpdateCategoryDto = {
        name: 'Updated Category',
        filters: [],
      } as any;
      const updatedBy = 'test-user';

      // Act
      await service.cmsUpdateCategory(categoryId, updateDto, updatedBy);

      // Assert
      expect(categoryModel.update).toHaveBeenCalledWith(
        {
          name: updateDto.name,
          nameAr: updateDto.name,
          updatedBy,
        },
        {
          where: { categoryId },
          transaction: mockTransaction,
        }
      );
    });

    it('should create a new subcategory and filter when action is CREATE', async () => {
      // Arrange
      const categoryId = '123';
      const filterId = 'filter-123';
      const updateDto: CmsUpdateCategoryDto = {
        name: 'Updated Category',
        filters: [
          {
            id: filterId,
            subCategory: {
              name: 'New SubCategory',
              nameAr: 'تصنيف فرعي جديد',
              type: 'type1',
              action: 'CREATE',
            },
          },
        ],
      } as any;
      const updatedBy = 'test-user';

      filterModel.findByPk.mockResolvedValue({
        id: filterId,
        name: 'Test Filter',
        nameAr: 'اختبار المرشح',
      });

      // Act
      await service.cmsUpdateCategory(categoryId, updateDto, updatedBy);

      // Assert
      expect(filterModel.findByPk).toHaveBeenCalledWith(filterId, { transaction: mockTransaction });
      expect(subCategoryModel.create).toHaveBeenCalledWith(
        {
          name: 'New SubCategory',
          nameAr: 'تصنيف فرعي جديد',
          type: 'type1',
          updatedBy,
        },
        { transaction: mockTransaction }
      );
      expect(filterModel.create).toHaveBeenCalledWith(
        {
          subCategoryId: 'new-subcategory-id',
          categoryId: categoryId,
          name: 'Test Filter',
          nameAr: 'اختبار المرشح',
          updatedBy,
        },
        { transaction: mockTransaction }
      );
    });

    it('should set nameAr equal to name for subcategory when nameAr is not provided during CREATE', async () => {
      // Arrange
      const categoryId = '123';
      const filterId = 'filter-123';
      const updateDto: CmsUpdateCategoryDto = {
        name: 'Updated Category',
        filters: [
          {
            id: filterId,
            subCategory: {
              name: 'New SubCategory',
              type: 'type1',
              action: 'CREATE',
            },
          },
        ],
      } as any;
      const updatedBy = 'test-user';

      filterModel.findByPk.mockResolvedValue({
        id: filterId,
        name: 'Test Filter',
        nameAr: 'اختبار المرشح',
      });

      // Act
      await service.cmsUpdateCategory(categoryId, updateDto, updatedBy);

      // Assert
      expect(subCategoryModel.create).toHaveBeenCalledWith(
        {
          name: 'New SubCategory',
          nameAr: 'New SubCategory', // nameAr should default to the name
          type: 'type1',
          updatedBy,
        },
        { transaction: mockTransaction }
      );
    });

    it('should update an existing subcategory when action is UPDATE', async () => {
      // Arrange
      const categoryId = '123';
      const filterId = 'filter-123';
      const subCategoryId = 'subcategory-123';
      const updateDto: CmsUpdateCategoryDto = {
        name: 'Updated Category',
        filters: [
          {
            id: filterId,
            subCategory: {
              id: subCategoryId,
              name: 'Updated SubCategory',
              nameAr: 'تصنيف فرعي محدث',
              action: 'UPDATE',
            },
          },
        ],
      } as any;
      const updatedBy = 'test-user';

      filterModel.findByPk.mockResolvedValue({
        id: filterId,
        name: 'Test Filter',
        nameAr: 'اختبار المرشح',
      });

      // Act
      await service.cmsUpdateCategory(categoryId, updateDto, updatedBy);

      // Assert
      expect(filterModel.findByPk).toHaveBeenCalledWith(filterId, { transaction: mockTransaction });
      expect(subCategoryModel.update).toHaveBeenCalledWith(
        {
          name: 'Updated SubCategory',
          nameAr: 'تصنيف فرعي محدث',
          updatedBy,
        },
        {
          where: { subCategoryId },
          transaction: mockTransaction,
        }
      );
    });

    it('should set nameAr equal to name for subcategory when nameAr is not provided during UPDATE', async () => {
      // Arrange
      const categoryId = '123';
      const filterId = 'filter-123';
      const subCategoryId = 'subcategory-123';
      const updateDto: CmsUpdateCategoryDto = {
        name: 'Updated Category',
        filters: [
          {
            id: filterId,
            subCategory: {
              id: subCategoryId,
              name: 'Updated SubCategory',
              action: 'UPDATE',
            },
          },
        ],
      } as any;
      const updatedBy = 'test-user';

      filterModel.findByPk.mockResolvedValue({
        id: filterId,
        name: 'Test Filter',
        nameAr: 'اختبار المرشح',
      });

      // Act
      await service.cmsUpdateCategory(categoryId, updateDto, updatedBy);

      // Assert
      expect(subCategoryModel.update).toHaveBeenCalledWith(
        {
          name: 'Updated SubCategory',
          nameAr: 'Updated SubCategory', // nameAr should default to the name
          updatedBy,
        },
        {
          where: { subCategoryId },
          transaction: mockTransaction,
        }
      );
    });

    it('should delete filter and subcategory when action is DELETE and no other uses', async () => {
      // Arrange
      const categoryId = '123';
      const filterId = 'filter-123';
      const subCategoryId = 'subcategory-123';
      const updateDto: CmsUpdateCategoryDto = {
        name: 'Updated Category',
        filters: [
          {
            id: filterId,
            subCategory: {
              id: subCategoryId,
              action: 'DELETE',
            },
          },
        ],
      } as any;
      const updatedBy = 'test-user';

      filterModel.findByPk.mockResolvedValue({
        id: filterId,
        name: 'Test Filter',
        nameAr: 'اختبار المرشح',
        subCategoryId,
      });

      // Mock Filter.count for checking if subcategory is in use
      jest.spyOn(Filter, 'count').mockResolvedValue(0);

      // Mock merchantFilter.count
      merchantFilterModel.count = jest.fn().mockResolvedValue(0);

      // Act
      await service.cmsUpdateCategory(categoryId, updateDto, updatedBy);

      // Assert
      expect(filterModel.findByPk).toHaveBeenCalledWith(filterId, { transaction: mockTransaction });
      expect(merchantFilterModel.count).toHaveBeenCalledWith({
        where: { filterId },
      });
      expect(filterModel.destroy).toHaveBeenCalledWith({
        where: { filterId },
        transaction: mockTransaction,
      });
      expect(Filter.count).toHaveBeenCalledWith({
        where: { subCategoryId },
      });
      expect(subCategoryModel.destroy).toHaveBeenCalledWith({
        where: { subCategoryId },
        transaction: mockTransaction,
      });
    });

    it('should not delete subcategory when it is still in use by other filters', async () => {
      // Arrange
      const categoryId = '123';
      const filterId = 'filter-123';
      const subCategoryId = 'subcategory-123';
      const updateDto: CmsUpdateCategoryDto = {
        name: 'Updated Category',
        filters: [
          {
            id: filterId,
            subCategory: {
              id: subCategoryId,
              action: 'DELETE',
            },
          },
        ],
      } as any;
      const updatedBy = 'test-user';

      filterModel.findByPk.mockResolvedValue({
        id: filterId,
        name: 'Test Filter',
        nameAr: 'اختبار المرشح',
        subCategoryId,
      });

      // Mock Filter.count to indicate the subcategory is still in use
      jest.spyOn(Filter, 'count').mockResolvedValue(1);

      // Mock merchantFilter.count
      merchantFilterModel.count = jest.fn().mockResolvedValue(0);

      // Act
      await service.cmsUpdateCategory(categoryId, updateDto, updatedBy);

      // Assert
      expect(filterModel.destroy).toHaveBeenCalledWith({
        where: { filterId },
        transaction: mockTransaction,
      });
      expect(Filter.count).toHaveBeenCalledWith({
        where: { subCategoryId },
      });
      expect(subCategoryModel.destroy).not.toHaveBeenCalled();
    });

    it('should throw error if filter is in use by merchants when trying to delete', async () => {
      // Arrange
      const categoryId = '123';
      const filterId = 'filter-123';
      const subCategoryId = 'subcategory-123';
      const updateDto: CmsUpdateCategoryDto = {
        name: 'Updated Category',
        filters: [
          {
            id: filterId,
            subCategory: {
              id: subCategoryId,
              action: 'DELETE',
            },
          },
        ],
      } as any;
      const updatedBy = 'test-user';

      filterModel.findByPk.mockResolvedValue({
        id: filterId,
        name: 'Test Filter',
        nameAr: 'اختبار المرشح',
        subCategoryId,
      });

      // Mock merchantFilter.count to indicate the filter is in use
      merchantFilterModel.count = jest.fn().mockResolvedValue(2);

      // Act & Assert
      await expect(service.cmsUpdateCategory(categoryId, updateDto, updatedBy)).rejects.toThrow(
        new HttpException('This value is used by other merchants and cannot be deleted', 400)
      );

      expect(filterModel.destroy).not.toHaveBeenCalled();
      expect(subCategoryModel.destroy).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if filter is not found', async () => {
      // Arrange
      const categoryId = '123';
      const filterId = 'nonexistent-filter';
      const updateDto: CmsUpdateCategoryDto = {
        name: 'Updated Category',
        filters: [
          {
            id: filterId,
            subCategory: {
              name: 'New SubCategory',
              action: 'CREATE',
            },
          },
        ],
      } as any;
      const updatedBy = 'test-user';

      filterModel.findByPk.mockResolvedValue(null);

      // Act & Assert
      await expect(service.cmsUpdateCategory(categoryId, updateDto, updatedBy)).rejects.toThrow(
        new NotFoundException('Filter is not Found')
      );
    });

    it('should handle multiple filter operations in a single update', async () => {
      // Arrange
      const categoryId = '123';
      const updateDto: CmsUpdateCategoryDto = {
        name: 'Updated Category',
        filters: [
          {
            id: 'filter-1',
            subCategory: {
              name: 'New SubCategory',
              type: 'type1',
              action: 'CREATE',
            },
          },
          {
            id: 'filter-2',
            subCategory: {
              id: 'subcategory-2',
              name: 'Updated SubCategory',
              action: 'UPDATE',
            },
          },
          {
            id: 'filter-3',
            subCategory: {
              id: 'subcategory-3',
              action: 'DELETE',
            },
          },
        ],
      } as any;
      const updatedBy = 'test-user';

      filterModel.findByPk.mockImplementation(id => {
        const mockFilters = {
          'filter-1': { id: 'filter-1', name: 'Test Filter 1', nameAr: 'اختبار المرشح 1' },
          'filter-2': { id: 'filter-2', name: 'Test Filter 2', nameAr: 'اختبار المرشح 2' },
          'filter-3': { id: 'filter-3', name: 'Test Filter 3', nameAr: 'اختبار المرشح 3', subCategoryId: 'subcategory-3' },
        };
        return Promise.resolve(mockFilters[id] || null);
      });

      // Mock for other necessary functions
      jest.spyOn(Filter, 'count').mockResolvedValue(0);
      merchantFilterModel.count = jest.fn().mockResolvedValue(0);

      // Act
      await service.cmsUpdateCategory(categoryId, updateDto, updatedBy);

      // Assert
      expect(filterModel.findByPk).toHaveBeenCalledTimes(3);
      expect(subCategoryModel.create).toHaveBeenCalledTimes(1);
      expect(subCategoryModel.update).toHaveBeenCalledTimes(1);
      expect(filterModel.destroy).toHaveBeenCalledTimes(1);
      expect(subCategoryModel.destroy).toHaveBeenCalledTimes(1);
    });
  });
});
