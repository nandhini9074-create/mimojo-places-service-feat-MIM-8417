import { getModelToken } from '@nestjs/sequelize';
import { TestingModule, Test } from '@nestjs/testing';
import { Outlet } from 'src/outlet/models/outlet.model';
import { OutletHelperService } from '../outlet-helper.service';
import { CreateCustomOutletDto } from 'src/outlet/dtos/create-custom-outlet-dto';
import { CategoryDto } from 'src/category/dtos/category-dto';
import { SubCategoryDto } from 'src/sub-category/dtos/sub-category-dto';
import { AddOutletConfigDto, SaveOutletPriceConfigDto } from 'src/outlet/dtos/add-outlet-dto';
import { CreateManualOutletAddressDto } from 'src/outlet/dtos/create-manual-outlet-address-dto';
import { CreateOutletTimingDto } from 'src/outlet/dtos/create-outlet-timing-dto';
import { SaveOutletPOSConfigDto } from 'src/outlet/dtos/create-pos-config-dto';
import { CustomOutletFiltersDto } from 'src/outlet/dtos/custom-outlet-filter-dto';
import { MerchantMetadataUpdatedDto } from 'src/outlet/dtos/merchant-metadata-dto';

describe('OutletHelperService', () => {
  let service: OutletHelperService;
  let outletModel: any;

  beforeEach(async () => {
    outletModel = {
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OutletHelperService,
        {
          provide: getModelToken(Outlet),
          useValue: outletModel,
        },
      ],
    }).compile();

    service = module.get<OutletHelperService>(OutletHelperService);
  });

  describe('handlePreferencesFilter', () => {
    it('should merge preferences filter correctly', () => {
      const data: CreateCustomOutletDto = {
        outletFilters: [
          {
            filter: {
              name: 'Preferences',
              id: '',
              categoryId: 0,
              subCategoryId: 0,
              category: new CategoryDto(),
              subCategory: new SubCategoryDto(),
            },
            id: '',
            isCustomized: false,
            included: false,
          },
        ],
        id: '',
        merchantId: '',
        merchantName: '',
        merchantLogoUrl: '',
        rating: 0,
        priceLevel: 0,
        website: '',
        websiteAr: '',
        formattedPhoneNumber: '',
        businessStatus: '',
        userRatingsTotal: 0,
        outletTiming: new CreateOutletTimingDto(),
        photos: [],
        merchantIdsManual: [],
        posIds: [],
        description: '',
        menuUrl: '',
        menuUrlAr: '',
        bookingUrl: '',
        bookingUrlAr: '',
        outletAddress: new CreateManualOutletAddressDto(),
        midPidRelation: [],
        checkTerminal: false,
        tabs: [],
        config: new AddOutletConfigDto(),
        priceConfig: new SaveOutletPriceConfigDto(),
        posConfig: new SaveOutletPOSConfigDto(),
        messageDescription: [],
      };

      const merchantPreferencesFilter: CustomOutletFiltersDto[] = [
        {
          filter: {
            name: 'Category',
            id: '',
            categoryId: 0,
            subCategoryId: 0,
            category: new CategoryDto(),
            subCategory: new SubCategoryDto(),
          },
          id: '',
          isCustomized: false,
          included: false,
        },
        {
          filter: {
            name: 'Preferences',
            id: '',
            categoryId: 0,
            subCategoryId: 0,
            category: new CategoryDto(),
            subCategory: new SubCategoryDto(),
          },
          id: '',
          isCustomized: false,
          included: false,
        },
      ];

      const result = service.handlePreferencesFilter(data, merchantPreferencesFilter);

      expect(result.length).toBe(2);
      expect(result.filter(f => f.filter.name === 'Preferences').length).toBe(1);
    });

    it('should return original merchantPreferencesFilter when no preferences in outletFilters', () => {
      const data: CreateCustomOutletDto = {
        outletFilters: [
          {
            filter: {
              name: 'Category',
              id: '',
              categoryId: 0,
              subCategoryId: 0,
              category: new CategoryDto(),
              subCategory: new SubCategoryDto(),
            },
            id: '',
            isCustomized: false,
            included: false,
          },
        ],
        id: '',
        merchantId: '',
        merchantName: '',
        merchantLogoUrl: '',
        rating: 0,
        priceLevel: 0,
        website: '',
        websiteAr: '',
        formattedPhoneNumber: '',
        businessStatus: '',
        userRatingsTotal: 0,
        outletTiming: new CreateOutletTimingDto(),
        photos: [],
        merchantIdsManual: [],
        posIds: [],
        description: '',
        menuUrl: '',
        menuUrlAr: '',
        bookingUrl: '',
        bookingUrlAr: '',
        outletAddress: new CreateManualOutletAddressDto(),
        midPidRelation: [],
        checkTerminal: false,
        tabs: [],
        config: new AddOutletConfigDto(),
        priceConfig: new SaveOutletPriceConfigDto(),
        posConfig: new SaveOutletPOSConfigDto(),
        messageDescription: [],
      };

      const merchantPreferencesFilter: CustomOutletFiltersDto[] = [
        {
          filter: {
            name: 'Preferences',
            id: '',
            categoryId: 0,
            subCategoryId: 0,
            category: new CategoryDto(),
            subCategory: new SubCategoryDto(),
          },
          id: '',
          isCustomized: false,
          included: false,
        },
      ];

      const result = service.handlePreferencesFilter(data, merchantPreferencesFilter);
      expect(result.length).toBe(1);
      expect(result[0].filter.name).toBe('Preferences');
    });
  });

  describe('updateOutletMerchantLogo', () => {
    it('should update merchant logo', async () => {
      const data: MerchantMetadataUpdatedDto = {
        merchantId: '123',
        merchantLogoUrl: 'logo.url/logo.png',
        merchantName: '',
        desc: '',
        filters: [],
        artDesc: ['artDesc1', 'artDesc2'],
        competitorDesc: ['competitorDesc1', 'competitorDesc2'],
      };
      const transaction = jest.fn() as any;
      const userId = 'user-1';

      await service.updateOutletMerchantLogo(data, transaction, userId);

      expect(outletModel.update).toHaveBeenCalledWith(
        {
          merchantLogoUrl: data.merchantLogoUrl,
          updatedBy: userId,
        },
        {
          where: { merchantId: data.merchantId },
          transaction: transaction,
        }
      );
    });
  });

  describe('updateOutletMerchantDesc', () => {
    it('should update merchant description', async () => {
      const data: MerchantMetadataUpdatedDto = {
        merchantId: '456',
        desc: 'New Description',
        merchantName: '',
        merchantLogoUrl: '',
        filters: [],
        artDesc: ['artDesc1', 'artDesc2'],
        competitorDesc: ['competitorDesc1', 'competitorDesc2'],
      };
      const transaction = jest.fn() as any;
      const userId = 'user-2';

      await service.updateOutletMerchantDesc(data, transaction, userId);

      expect(outletModel.update).toHaveBeenCalledWith(
        {
          description: data.desc,
          updatedBy: userId,
        },
        {
          where: { merchantId: data.merchantId },
          transaction: transaction,
        }
      );
    });
  });

  describe('updateOutletMerchantName', () => {
    it('should update merchant name', async () => {
      const data: MerchantMetadataUpdatedDto = {
        merchantId: '789',
        merchantName: 'New Name',
        desc: '',
        merchantLogoUrl: '',
        filters: [],
        artDesc: ['artDesc1', 'artDesc2'],
        competitorDesc: ['competitorDesc1', 'competitorDesc2'],
      };
      const transaction = jest.fn() as any;
      const userId = 'user-3';

      await service.updateOutletMerchantName(data, transaction, userId);

      expect(outletModel.update).toHaveBeenCalledWith(
        {
          merchantName: data.merchantName,
          updatedBy: userId,
        },
        {
          where: { merchantId: data.merchantId },
          transaction: transaction,
        }
      );
    });
  });

  describe('mapFilterDto', () => {
    it('should map merchant filters correctly', () => {
      const merchantMetadata = {
        filters: [
          {
            id: 'f1',
            name: 'Spicy',
            category: 'Taste',
            category_id: 'cat1',
            subCategory: 'Level',
            subCategoryId: 'sub1',
            MerchantFilter: {
              included: true,
            },
          },
        ],
      };

      const result = service.mapFilterDto([], merchantMetadata as any);

      expect(result).toEqual([
        {
          filter: {
            category: 'Taste',
            categoryId: undefined,
            id: 'f1',
            name: 'Spicy',
            subCategory: 'Level',
            subCategoryId: 'sub1',
          },
          included: true,
          isCustomized: false,
        },
      ]);
    });
  });

  describe('updateOutletArtDesc', () => {
    const mockDto: MerchantMetadataUpdatedDto = {
      merchantId: 'merchant123',
      artDesc: ['Updated Art Description'],
      competitorDesc: ['Updated Competitor Description'],
      filters: [],
      merchantName: '',
      desc: '',
      merchantLogoUrl: '',
    };

    const userId = 'user123';
    const transaction = jest.fn() as any;

    it('should update artDesc and updatedBy', async () => {
      outletModel.update.mockResolvedValue([1]);

      await service.updateOutletArtDesc(mockDto, transaction, userId);

      expect(outletModel.update).toHaveBeenCalledWith(
        {
          artDesc: mockDto.artDesc,
          updatedBy: userId,
        },
        {
          where: { merchantId: mockDto.merchantId },
          transaction,
        }
      );
    });
  });

  describe('updateOutletCompetitorDesc', () => {
    const mockDto: MerchantMetadataUpdatedDto = {
      merchantId: 'merchant123',
      artDesc: ['Updated Art Description'],
      competitorDesc: ['Updated Competitor Description'],
      filters: [],
      merchantName: '',
      desc: '',
      merchantLogoUrl: '',
    };

    const userId = 'user123';
    const transaction = jest.fn() as any;
    it('should update competitorDesc and updatedBy', async () => {
      outletModel.update.mockResolvedValue([1]);

      await service.updateOutletCompetitorDesc(mockDto, transaction, userId);

      expect(outletModel.update).toHaveBeenCalledWith(
        {
          competitorDesc: mockDto.competitorDesc,
          updatedBy: userId,
        },
        {
          where: { merchantId: mockDto.merchantId },
          transaction,
        }
      );
    });
  });
});
