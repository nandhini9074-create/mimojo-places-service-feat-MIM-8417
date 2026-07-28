import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { EnvKeysEnum } from 'config/env.enum';
import { IInternalApiConfig } from 'config/interface';
import { OutletProducer } from 'src/kafka-services/outlet.producer';
import { CloneOfferDto } from '../dtos/outlet-offer-updated-dto';
import { buildDeviceAuthConfig, buildDeviceAuthConfigWithTransactionDate } from './proxy-request-config.util';

@Injectable()
export class OutletOfferProxy {
  private allOutletOfferUrl: string;
  private allOffersOfOutletUrl: string;
  private outletScheduledOffer: string;
  private mimojoProfileId: string;
  private allOutletOffersOfMerchantProfileUrl: string;
  private readonly offerServiceUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly outletProducer: OutletProducer
  ) {
    const {
      ALL_OUTLETS_OFFERS_OF_MERCHANT,
      ALL_OFFERS_OF_OUTLET,
      OUTLET_SCHEDULED_OFFER,
      MIMOJO_PROFILE_ID,
      ALL_OUTLETS_OFFERS_OF_MERCHANT_PROFILE,
      OFFER_URL,
    } = this.configService.get<IInternalApiConfig>('internal-apis');

    this.allOutletOfferUrl = ALL_OUTLETS_OFFERS_OF_MERCHANT;
    this.allOffersOfOutletUrl = ALL_OFFERS_OF_OUTLET;
    this.outletScheduledOffer = OUTLET_SCHEDULED_OFFER;
    this.mimojoProfileId = MIMOJO_PROFILE_ID;
    this.allOutletOffersOfMerchantProfileUrl = ALL_OUTLETS_OFFERS_OF_MERCHANT_PROFILE;
    this.offerServiceUrl = OFFER_URL;
  }

  public async getAllOutletOffersByMerchantId(merchantId: string, token: Record<string, string>) {
    try {
      const config = buildDeviceAuthConfig(token);
      return await axios.get(this.allOutletOfferUrl.replace(':merchantId', String(merchantId)), config);
    } catch {
      throw new NotFoundException('Merchant not found for default outlet offer');
    }
  }

  public async getAllOutletOffersByMerchantIdAndProfileId(
    merchantId: string,
    profileId: string,
    token: Record<string, string>
  ) {
    try {
      const config = buildDeviceAuthConfig(token);
      const safeMerchantId = encodeURIComponent(merchantId);
      const safeProfileId = encodeURIComponent(profileId);
      return await axios.get(
        this.allOutletOffersOfMerchantProfileUrl
          .replace(':merchantId', String(safeMerchantId))
          .replace(':profileId', encodeURIComponent(safeProfileId)),
        config
      );
    } catch {
      throw new NotFoundException('Merchant profile not found for default outlet offer');
    }
  }

  public async getOutletAllOffers(outletId: string, token: Record<string, string>, profileId?: string) {
    try {
      const config = buildDeviceAuthConfigWithTransactionDate(token);
      const finalProfileId = profileId ?? this.mimojoProfileId;
      return await axios.get(
        this.allOffersOfOutletUrl
          .replace(':id', encodeURIComponent(outletId))
          .replace(':profileid', encodeURIComponent(finalProfileId)),
        config
      );
    } catch {
      // Intentionally swallow errors - caller handles absence of data
    }
  }

  public async getOutletScheduledOffer(outletId: string) {
    return await axios.get(this.outletScheduledOffer.replace(':id', outletId));
  }

  public createOutletDefaultOffers(merchantId: string, outletId: string, outletName: string, userId: string) {
    // axios
    //   .post(
    //     this.createOutletDefaultOfferUrl,
    //     {
    //       merchantId,
    //       outletId
    //     },
    //     {
    //       headers: {
    //         Authorization: headers.authorization,
    //         'x-device-id': headers['x-device-id']
    //       }
    //     }
    //   )
    //   .catch((error) => {
    //     throw new NotFoundException(error);
    //   });

    this.outletProducer.pushToKafka(
      outletId,
      {
        merchantId,
        outletId,
        outletName,
        updatedBy: userId,
      },
      process.env[EnvKeysEnum.KAFKA_OUTLET_OFFER_TOPIC],
      'false'
    );
  }

  async cloneDefaultOffer(payload: CloneOfferDto) {
    this.outletProducer.pushToKafka(payload.newOutletId, payload, process.env[EnvKeysEnum.KAFKA_OUTLET_OFFER_TOPIC], 'true');
  }

  async getOutletCurrentOfferForProfile(outletId: string, profileId: string) {
    const safeOutletId = encodeURIComponent(outletId);
    const safeProfileId = encodeURIComponent(profileId);
    await axios.post(`${this.offerServiceUrl}/offersv2/current/outlet/${safeOutletId}/${safeProfileId}`);
  }
}
