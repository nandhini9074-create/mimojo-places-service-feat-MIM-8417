import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { IInternalApiConfig } from 'config/interface';
import { CustomPinoLogger } from 'src/logger/custom-logger.service';
import { buildDeviceAuthConfigWithTransactionDate } from './proxy-request-config.util';

@Injectable()
export class RewardEngineWrapperProxy {
  private readonly serviceName = 'RewardEngineWrapperProxy';
  private allRewardsOfOutletUrl: string;
  private mimojoProfileId: string;
  private checkActiveMerchantOfferUrl: string;
  private readonly rewardEngineServiceUrl: string;
  private readonly rewardEngineWrapperServiceUrl: string;
  constructor(
    private readonly configService: ConfigService,
    private readonly logger: CustomPinoLogger
  ) {
    const {
      ALL_REWARDS_OF_OUTLET,
      MIMOJO_PROFILE_ID,
      CHECK_ACTIVE_OFFER_MERCHANT_URL,
      REWARD_ENGINE_SERVICE_URL,
      REWARD_ENGINE_WRAPPER_SERVICE_URL,
    } = this.configService.get<IInternalApiConfig>('internal-apis');
    this.mimojoProfileId = MIMOJO_PROFILE_ID;
    this.allRewardsOfOutletUrl = ALL_REWARDS_OF_OUTLET;
    this.checkActiveMerchantOfferUrl = CHECK_ACTIVE_OFFER_MERCHANT_URL;
    this.rewardEngineServiceUrl = REWARD_ENGINE_SERVICE_URL;
    this.rewardEngineWrapperServiceUrl = REWARD_ENGINE_WRAPPER_SERVICE_URL;
  }
  public async getOutletAllRewards(outletId: string, token: Record<string, string>, profileId?: string) {
    try {
      const config = buildDeviceAuthConfigWithTransactionDate(token);
      const finalProfileId = profileId ?? this.mimojoProfileId;
      return await axios.get(
        this.allRewardsOfOutletUrl
          .replace(':id', encodeURIComponent(outletId))
          .replace(':profileid', encodeURIComponent(finalProfileId)),
        config
      );
    } catch {
      // Intentionally swallow errors - caller handles absence of data
    }
  }

  async checkMerchantHasActiveOffer(merchantId: string, token: string): Promise<boolean> {
    const methodName = 'checkMerchantHasActiveOffer';
    const headers = {
      Authorization: token,
    };
    const url = this.checkActiveMerchantOfferUrl.replace(':merchantId', encodeURIComponent(merchantId));
    try {
      const { data } = await axios.get(url, { headers });
      const returnData = data?.data ?? false;
      this.logger.info(`${this.serviceName}.${methodName} - response; merchantId: ${merchantId}`, { returnData, url });
      return returnData;
    } catch (error: unknown) {
      this.logger.error(`${this.serviceName}.${methodName}  - exception; merchantId: ${merchantId}`, { url, error });
      return false;
    }
  }

  async UpdateOutletMaxOfferForProfile(outletId: string, profileId: string) {
    await axios.post(
      `${this.rewardEngineServiceUrl}/current/outlet/${encodeURIComponent(outletId)}/${encodeURIComponent(profileId)}`
    );
  }

  async getMerchantCurrentRewardByProfile(merchantId: string, profileId?: string): Promise<any> {
    const finalProfileId = profileId ?? this.mimojoProfileId;
    try {
      const response = await axios.get(
        `${this.rewardEngineWrapperServiceUrl}/merchant/current/${encodeURIComponent(merchantId)}/profile/${encodeURIComponent(finalProfileId)}`
      );
      return response?.data?.data;
    } catch (error: unknown) {
      this.logger.error(`RewardEngineWrapperProxy.getMerchantCurrentRewardByProfile error`, {
        error,
        merchantId,
        finalProfileId,
      });
      return undefined;
    }
  }
}
