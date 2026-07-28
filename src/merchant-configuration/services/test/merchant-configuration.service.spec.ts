import { Test, TestingModule } from '@nestjs/testing';
import { MerchantConfigurationService } from '../merchant-configuration.service';
import { getModelToken } from '@nestjs/sequelize';
import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorMessages } from 'src/errors/error-messages';
import { MerchantConfiguration } from 'src/merchant-configuration/entities/merchant-configuration.model';

describe('MerchantConfigurationService', () => {
  let service: MerchantConfigurationService;
  let model: typeof MerchantConfiguration;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MerchantConfigurationService,
        {
          provide: getModelToken(MerchantConfiguration),
          useValue: {
            upsert: jest.fn(),
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<MerchantConfigurationService>(MerchantConfigurationService);
    model = module.get<typeof MerchantConfiguration>(getModelToken(MerchantConfiguration));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('addMerchantConfiguration', () => {
    it('should call upsert and return the result', async () => {
      const merchantConfig = { merchantId: '123', timezoneInfo: 'UTC', currencyId: 'USD' } as MerchantConfiguration;
      const upsertResult = [merchantConfig, true];

      (model.upsert as jest.Mock).mockResolvedValue(upsertResult);

      const result = await service.addMerchantConfiguration(merchantConfig);

      expect(model.upsert).toHaveBeenCalledWith(merchantConfig, { returning: true });
      expect(result).toEqual(upsertResult);
    });
  });

  describe('getMerchantConfigurationByMerchantId', () => {
    it('should return merchant configuration if found', async () => {
      const merchantId = '123';
      const merchantConfig = { timezoneInfo: 'UTC', currencyId: 'USD' } as MerchantConfiguration;

      (model.findOne as jest.Mock).mockResolvedValue(merchantConfig);

      const result = await service.getMerchantConfigurationByMerchantId(merchantId);

      expect(model.findOne).toHaveBeenCalledWith({
        attributes: ['timezoneInfo', 'currencyId'],
        where: { merchantId },
      });
      expect(result).toEqual(merchantConfig);
    });

    it('should throw HttpException if merchant configuration not found', async () => {
      const merchantId = '123';

      (model.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.getMerchantConfigurationByMerchantId(merchantId)).rejects.toThrow(
        new HttpException(ErrorMessages.merchantConfiguration.notFound, HttpStatus.NOT_FOUND),
      );

      expect(model.findOne).toHaveBeenCalledWith({
        attributes: ['timezoneInfo', 'currencyId'],
        where: { merchantId },
      });
    });
  });
});
