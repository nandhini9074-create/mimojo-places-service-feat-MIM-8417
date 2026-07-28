import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { MerchantConfiguration } from '../entities/merchant-configuration.model';
import { ErrorMessages } from 'src/errors/error-messages';

@Injectable()
export class MerchantConfigurationService {
  constructor(
    @InjectModel(MerchantConfiguration)
    private readonly merchantConfiguration: MerchantConfiguration & typeof MerchantConfiguration
  ) {}

  async addMerchantConfiguration(merchantConfig: MerchantConfiguration): Promise<[MerchantConfiguration, boolean]> {
    return await this.merchantConfiguration.upsert(merchantConfig, {
      returning: true,
    });
  }

  async getMerchantConfigurationByMerchantId(merchantId: string): Promise<MerchantConfiguration> {
    const merchantConfiguration = await this.merchantConfiguration.findOne({
      attributes: ['timezoneInfo', 'currencyId'],
      where: {
        merchantId: merchantId,
      },
    });
    if (!merchantConfiguration) throw new HttpException(ErrorMessages.merchantConfiguration.notFound, HttpStatus.NOT_FOUND);
    return merchantConfiguration;
  }
}
