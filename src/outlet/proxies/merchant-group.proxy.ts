import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import { IInternalApiConfig } from "config/interface";
import { CustomPinoLogger } from "src/logger/custom-logger.service";

@Injectable()
export class MerchantGroupProxy {
    private getMerchantGroupsUrl: string;

    constructor(
        private readonly configService: ConfigService,
        private readonly logger: CustomPinoLogger,
    ) {
        const {
            GET_MERCHANT_GROUPS_URL
        } =
            this.configService.get<IInternalApiConfig>('internal-apis');
        this.getMerchantGroupsUrl = GET_MERCHANT_GROUPS_URL;
    }

    async getMerchantGroups(merchantIds: string[]) {
        try {
            return await axios.post(this.getMerchantGroupsUrl, merchantIds);
        } catch (error) {
            this.logger.error('MerchantGroupProxy.getMerchantGroups method error', { error });
            throw new HttpException(
                    error?.response?.data?.message || error?.response?.data || 'Error in get merchant groups',
                    error?.response?.status || HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }
    
}