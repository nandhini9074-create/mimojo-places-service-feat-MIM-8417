import { Test, TestingModule } from '@nestjs/testing';
import { PaginationDto } from 'src/common/dtos/pagenation.dto';

import { SortDto } from 'src/common/dtos/sort.dto';
import { SubCategoryService } from 'src/sub-category/services/sub-category.service';
import { SubCategoriesController } from '../sub-categories.controller';


describe('SubCategoriesController', () => {
  let controller: SubCategoriesController;
  let subCategoryService: SubCategoryService;

  const mockSubCategoryService = {
    findAll: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SubCategoriesController],
      providers: [
        {
          provide: SubCategoryService,
          useValue: mockSubCategoryService,
        },
      ],
    }).compile();

    controller = module.get<SubCategoriesController>(SubCategoriesController);
    subCategoryService = module.get<SubCategoryService>(SubCategoryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should call findAll without any parameters', async () => {
      const mockResult = [{ id: 1, name: 'Test Subcategory' }];
      mockSubCategoryService.findAll.mockResolvedValue(mockResult);

      const result = await controller.findAll();

      expect(subCategoryService.findAll).toHaveBeenCalledWith(undefined, undefined, undefined);
      expect(result).toEqual(mockResult);
    });

    it('should call findAll with pagination parameters', async () => {
      const paginationDto: PaginationDto = { page: 1, limit: 10 };
      const mockResult = [{ id: 1, name: 'Test Subcategory' }];
      mockSubCategoryService.findAll.mockResolvedValue(mockResult);

      const result = await controller.findAll(undefined, paginationDto);

      expect(subCategoryService.findAll).toHaveBeenCalledWith(undefined, paginationDto, undefined);
      expect(result).toEqual(mockResult);
    });

    it('should call findAll with sort parameters', async () => {
      const sortDto: SortDto = {sort:['createdAt','desc']}
      const mockResult = [{ id: 1, name: 'Test Subcategory' }];
      mockSubCategoryService.findAll.mockResolvedValue(mockResult);

      const result = await controller.findAll(sortDto);

      expect(subCategoryService.findAll).toHaveBeenCalledWith(sortDto, undefined, undefined);
      expect(result).toEqual(mockResult);
    });

    it('should call findAll with search parameter', async () => {
      const search = 'test';
      const mockResult = [{ id: 1, name: 'Test Subcategory' }];
      mockSubCategoryService.findAll.mockResolvedValue(mockResult);

      const result = await controller.findAll(undefined, undefined, search);

      expect(subCategoryService.findAll).toHaveBeenCalledWith(undefined, undefined, search);
      expect(result).toEqual(mockResult);
    });

    it('should call findAll with all parameters combined', async () => {
      const sortDto: SortDto = {sort:['createdAt','desc']}
      const paginationDto: PaginationDto = { page: 1, limit: 10 };
      const search = 'test';
      const mockResult = [{ id: 1, name: 'Test Subcategory' }];
      mockSubCategoryService.findAll.mockResolvedValue(mockResult);

      const result = await controller.findAll(sortDto, paginationDto, search);

      expect(subCategoryService.findAll).toHaveBeenCalledWith(sortDto, paginationDto, search);
      expect(result).toEqual(mockResult);
    });

    it('should handle service errors gracefully', async () => {
      const error = new Error('Service error');
      mockSubCategoryService.findAll.mockRejectedValue(error);

      await expect(controller.findAll()).rejects.toThrow('Service error');
      expect(subCategoryService.findAll).toHaveBeenCalledWith(undefined, undefined, undefined);
    });

    it('should handle empty results', async () => {
      const mockResult = [];
      mockSubCategoryService.findAll.mockResolvedValue(mockResult);

      const result = await controller.findAll();

      expect(subCategoryService.findAll).toHaveBeenCalledWith(undefined, undefined, undefined);
      expect(result).toEqual([]);
    });

    it('should handle undefined parameters correctly', async () => {
      const mockResult = [{ id: 1, name: 'Test Subcategory' }];
      mockSubCategoryService.findAll.mockResolvedValue(mockResult);

      const result = await controller.findAll(undefined, undefined, undefined);

      expect(subCategoryService.findAll).toHaveBeenCalledWith(undefined, undefined, undefined);
      expect(result).toEqual(mockResult);
    });
  });
});