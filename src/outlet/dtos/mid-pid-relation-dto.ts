import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsAlphanumeric, IsNotEmpty, IsOptional } from "class-validator";

export class MidPidRelationDto {
    
    @ApiProperty({
        description: 'Unique identifier of the merchant',
        format: 'uuid',
    })
    @IsAlphanumeric()
    @IsNotEmpty()
    merchantId: string;

    @ApiPropertyOptional({
        description: 'List of POS IDs associated with the merchant',
        type: [String],
    })
    @IsOptional()
    posIds: string[];
}