import { ApiProperty } from "@nestjs/swagger";
import { IsUUID, IsNotEmpty } from "class-validator";

export class ResetOutletProfileDto {
    @ApiProperty({
        description: 'Unique identifier of the merchant',
        example: '9f7c6f6a-3d2f-4b65-9e8e-123456789abc',
        format: 'uuid',
    })
    @IsUUID()
    @IsNotEmpty()
    merchantId: string;

    @ApiProperty({
        description: 'Unique identifier of the profile',
        example: '5f7c6f6a-3d2f-4b65-9e8e-abcdef987654',
        format: 'uuid',
    })
    @IsUUID()
    @IsNotEmpty()
    profileId: string

    @ApiProperty({
        description: 'Unique identifier of the outlet profile record to reset',
        example: '6f7c6f6a-3d2f-4b65-9e8e-112233445566',
        format: 'uuid',
    })
    @IsUUID()
    @IsNotEmpty()
    id: string

    @ApiProperty({
        description: 'Unique identifier of the outlet',
        example: '7f7c6f6a-3d2f-4b65-9e8e-778899001122',
        format: 'uuid',
    })
    @IsUUID()
    @IsNotEmpty()
    outletId: string
}