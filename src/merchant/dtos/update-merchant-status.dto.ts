import { IsEnum, IsNotEmpty, IsString } from "class-validator";
import { MerchantStatusEnum } from "../enums/merchant-status.enum";
import { ApiProperty } from "@nestjs/swagger";



export class UpdateMerchantStatusDto{
    @ApiProperty({
        description: 'Merchant ID',
        example: '123e4567-e89b-12d3-a456-426614174000',
    })
    @IsString()
    @IsNotEmpty()
    merchantId:string

    @ApiProperty({
        description: 'Merchant status',
        enum: MerchantStatusEnum,
        enumName: 'MerchantStatusEnum'
    })
    @IsEnum(MerchantStatusEnum)
    status:MerchantStatusEnum

}