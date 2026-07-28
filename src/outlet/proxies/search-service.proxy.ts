import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { internalApisConfig } from 'config/server.config';
import { CustomPinoLogger } from 'src/logger/custom-logger.service';

@Injectable()
export class SearchServiceProxy {
  private readonly updatePayloadUrl: string;
  constructor(private readonly logger: CustomPinoLogger,) {
    const { SEARCH_SERVICE_UPDATE_PAYLOAD_URL } = internalApisConfig();
    this.updatePayloadUrl = SEARCH_SERVICE_UPDATE_PAYLOAD_URL;
  }

  async updateOutletStatus(outletId: string, profileId: string, status?: string) {
    this.logger.info('SearchServiceProxy.updateOutletStatus - starts', { outletId, status, profileId });
    try {
      const payload = {
        updates: [
          {
            outletId,
            status,
            profileId
          }
        ]
      }

      const response = await axios.put(this.updatePayloadUrl, payload, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      this.logger.info('SearchServiceProxy.updateOutletStatus - ends', { response });
    } catch (error) {
      this.logger.error('SearchServiceProxy.updateOutletStatus - exception;', { error, outletId, status, profileId });
    }
  }
}
