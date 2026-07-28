import { Test, TestingModule } from '@nestjs/testing';
import { CmsUpdateCategoryDto } from 'src/category/dtos/cms-update-category.dto';
import { Category } from 'src/category/models/category.model';
import { CategoryService } from 'src/category/services/category.service';
import { CMSCategoriesController } from '../cms-categories.controller';


describe('CMSCategoriesController', () => {
  let controller: CMSCategoriesController;
  let service: jest.Mocked<CategoryService>;

  const mockCategory: Category = {
    id: 'uuid-1',
    name: 'Electronics',
    parentId: null,
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CMSCategoriesController],
      providers: [
        {
          provide: CategoryService,
          useValue: {
            cmsFindAllCategories: jest.fn(),
            cmsFindOneCategory: jest.fn(),
            cmsUpdateCategory: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<CMSCategoriesController>(CMSCategoriesController);
    service = module.get(CategoryService);
  });

  describe('findAllCategories', () => {
    it('should return all CMS categories', async () => {
      service.cmsFindAllCategories.mockResolvedValue([mockCategory] as any);

      const response = await controller.findAllCategories();

      expect(service.cmsFindAllCategories).toHaveBeenCalled();
      expect(response.data).toEqual([mockCategory]);
    });
  });

  describe('findOneCategory', () => {
    it('should return a single category by id', async () => {
      service.cmsFindOneCategory.mockResolvedValue(mockCategory);

      const response = await controller.findOneCategory('uuid-1');

      expect(service.cmsFindOneCategory).toHaveBeenCalledWith('uuid-1');
      expect(response.data).toEqual(mockCategory);
    });

    it('should handle category not found', async () => {
      service.cmsFindOneCategory.mockResolvedValue(null);

      const response = await controller.findOneCategory('non-existing-uuid');

      expect(service.cmsFindOneCategory).toHaveBeenCalledWith('non-existing-uuid');
      expect(response.data).toBeNull();
    });
  });

  describe('updateCategory', () => {
    const dto: CmsUpdateCategoryDto = {
      name: 'Updated Name',
      isActive: true,
    } as any;

    it('should update a category successfully', async () => {
      const updatedCategory = { ...mockCategory, ...dto };
      service.cmsUpdateCategory.mockResolvedValue(updatedCategory as any);

      const userId = 'admin-user-id';

      const response = await controller.updateCategory('uuid-1', dto, userId);

      expect(service.cmsUpdateCategory).toHaveBeenCalledWith('uuid-1', dto, userId);
      expect(response.data).toEqual(updatedCategory);
    });

    it('should handle update with missing user gracefully', async () => {
      const updatedCategory = { ...mockCategory, ...dto };
      service.cmsUpdateCategory.mockResolvedValue(updatedCategory as any);

      const response = await controller.updateCategory('uuid-1', dto, null);

      expect(service.cmsUpdateCategory).toHaveBeenCalledWith('uuid-1', dto, null);
      expect(response.data).toEqual(updatedCategory);
    });
  });
});
