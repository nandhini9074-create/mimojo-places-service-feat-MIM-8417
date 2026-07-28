import { Test, TestingModule } from '@nestjs/testing';
import { CountryService } from 'src/countries/services/country.service';

import { baseResponseHelper } from 'src/helpers/base-response.helper';
import { CountryController } from '../country.controller';

// Mock implementation for baseResponseHelper
jest.mock('src/helpers/base-response.helper', () => ({
  baseResponseHelper: jest.fn((res) => ({ success: true, data: res })),
}));

describe('CountryController', () => {
  let controller: CountryController;
  let service: CountryService;

  const mockCountryService = {
    getCountries: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CountryController],
      providers: [
        {
          provide: CountryService,
          useValue: mockCountryService,
        },
      ],
    }).compile();

    controller = module.get<CountryController>(CountryController);
    service = module.get<CountryService>(CountryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getCountries', () => {
    it('should return response from baseResponseHelper with countries list', async () => {
      const mockCountries = [{ code: 'DK', name: 'Denmark' }];
      mockCountryService.getCountries.mockResolvedValue(mockCountries);

      const result = await controller.getCountries();

      expect(service.getCountries).toHaveBeenCalled();
      expect(baseResponseHelper).toHaveBeenCalledWith(mockCountries);
      expect(result).toEqual({ success: true, data: mockCountries });
    });

    it('should handle empty country list', async () => {
      mockCountryService.getCountries.mockResolvedValue([]);

      const result = await controller.getCountries();

      expect(service.getCountries).toHaveBeenCalled();
      expect(baseResponseHelper).toHaveBeenCalledWith([]);
      expect(result).toEqual({ success: true, data: [] });
    });

    it('should propagate errors thrown by countryService', async () => {
      mockCountryService.getCountries.mockRejectedValue(new Error('Service failed'));

      await expect(controller.getCountries()).rejects.toThrow('Service failed');
    });
  });
});
