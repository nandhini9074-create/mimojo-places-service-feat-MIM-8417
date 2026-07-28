import { IsEnum } from "class-validator";
import { MerchantProfileStatusEnum } from "../enums/merchant-profile-status-enum";
import { ApiPropertyOptional } from "@nestjs/swagger";


export class UpdateMerchantProfileStatusDto{
    @ApiPropertyOptional({
        description: 'Status of the merchant profile',
        enum: MerchantProfileStatusEnum,
        enumName: 'MerchantProfileStatusEnum',
    })
    @IsEnum(MerchantProfileStatusEnum)
    status?: MerchantProfileStatusEnum;
}