import { getModelToken } from '@nestjs/sequelize';
import { Test, TestingModule } from '@nestjs/testing';
import { Country } from 'src/countries/entities/country.model';
import { CountryService } from '../country.service';


describe('CountryService', () => {
  let service: CountryService;
  let model: typeof Country;

  const mockCountryModel = {
    findAll: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CountryService,
        {
          provide: getModelToken(Country),
          useValue: mockCountryModel,
        },
      ],
    }).compile();

    service = module.get<CountryService>(CountryService);
    model = module.get<typeof Country>(getModelToken(Country));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getCountries', () => {
    it('should return all countries', async () => {
      const mockCountries = [
        { id: 1, code: 'DK', name: 'Denmark' },
        { id: 2, code: 'IN', name: 'India' },
      ];
      mockCountryModel.findAll.mockResolvedValue(mockCountries);

      const result = await service.getCountries();

      expect(mockCountryModel.findAll).toHaveBeenCalled();
      expect(result).toEqual(mockCountries);
    });

    it('should return an empty array if no countries found', async () => {
      mockCountryModel.findAll.mockResolvedValue([]);

      const result = await service.getCountries();

      expect(mockCountryModel.findAll).toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('should propagate error from model', async () => {
      const error = new Error('Database error');
      mockCountryModel.findAll.mockRejectedValue(error);

      await expect(service.getCountries()).rejects.toThrow('Database error');
    });
  });
});
