import { Test, TestingModule } from '@nestjs/testing';
import { Category } from 'src/category/models/category.model';
import { CategoryService } from 'src/category/services/category.service';
import { PaginationDto } from 'src/common/dtos/pagenation.dto';
import { SortDto } from 'src/common/dtos/sort.dto';
import { CategoriesController } from '../categories.controller';

jest.mock('src/helpers/base-response.helper', () => ({
  baseResponseHelper: jest.fn(data => data),
}));

describe('CategoriesController', () => {
  let controller: CategoriesController;
  let categoryService: CategoryService;

  const mockCategoryService = {
    findAll: jest.fn(),
    getSubCategories: jest.fn(),
    getOverridableSubCategories: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoriesController],
      providers: [
        {
          provide: CategoryService,
          useValue: mockCategoryService,
        },
      ],
    }).compile();

    controller = module.get<CategoriesController>(CategoriesController);
    categoryService = module.get<CategoryService>(CategoryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getCategories', () => {
    it('should return categories with pagination and sort', async () => {
      const mockReq = { headers: { language: 'en' } };
      const sortDto: SortDto = { sort: ['name,asc'] };
      const paginationDto: PaginationDto = { page: 1, limit: 10 };
      const mockResult = {
        data: [{ id: '1', name: 'Category 1' } as Category],
        pagination: { total: 1, page: 1, limit: 10 },
      };

      mockCategoryService.findAll.mockResolvedValue(mockResult);

      const result = await controller.getCategories(mockReq as any, sortDto, paginationDto, 'searchTerm');

      expect(categoryService.findAll).toHaveBeenCalledWith('en', sortDto, paginationDto, 'searchTerm', undefined);
      expect(result).toEqual(mockResult);
    });

    it('should use default values when optional query params are missing', async () => {
      const mockReq = { headers: { language: 'en' } };
      const mockResult = {
        data: [],
        pagination: { total: 0, page: 1, limit: 10 },
      };

      mockCategoryService.findAll.mockResolvedValue(mockResult);

      const result = await controller.getCategories(mockReq as any);

      expect(categoryService.findAll).toHaveBeenCalledWith('en', undefined, undefined, undefined, undefined);
      expect(result).toEqual(mockResult);
    });
  });

  describe('getSubCategories', () => {
    it('should return subcategories for given categoryId', async () => {
      const categoryId = 'uuid-category-id';
      const mockData = [{ id: '1', name: 'SubCat' }];

      mockCategoryService.getSubCategories.mockResolvedValue(mockData);

      const result = await controller.getSubCategories(categoryId);

      expect(categoryService.getSubCategories).toHaveBeenCalledWith(categoryId, false);
      expect(result).toEqual(mockData);
    });
  });

  describe('getMpSubCategories', () => {
    it('should return MP subcategories for given categoryId', async () => {
      const categoryId = 'uuid-category-id';
      const mockData = [{ id: '1', name: 'MpSubCat' }];

      mockCategoryService.getSubCategories.mockResolvedValue(mockData);

      const result = await controller.getMpSubCategories(categoryId);

      expect(categoryService.getSubCategories).toHaveBeenCalledWith(categoryId, false);
      expect(result).toEqual(mockData);
    });
  });

  describe('getOverridableSubCategories', () => {
    it('should return overridable subcategories for given merchantId', async () => {
      const merchantId = 'uuid-merchant-id';
      const mockData = [{ id: '1', name: 'OverrideCat' }];

      mockCategoryService.getOverridableSubCategories.mockResolvedValue(mockData);

      const result = await controller.getOverridableSubCategories(merchantId);

      expect(categoryService.getOverridableSubCategories).toHaveBeenCalledWith(merchantId);
      expect(result).toEqual(mockData);
    });
  });
});
