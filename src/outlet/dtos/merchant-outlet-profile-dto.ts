import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    IsArray,
    IsDate,
    IsNotEmpty,
    IsOptional,
    IsUUID,
    ValidateNested
} from 'class-validator';

export class MerchantOutletProfileDto {
    @ApiProperty({
        description: 'Merchant UUID',
        type: 'string',
        format: 'uuid'
    })
    @IsNotEmpty()
    @IsUUID()
    merchantId: string;

    @ApiPropertyOptional({
        description: 'Start date of the profile',
        type: 'string',
        format: 'date-time',
        example: '2023-10-01T00:00:00Z'
    })
    @IsOptional()
    @IsDate()
    @Type(() => Date)
    startDate: Date;

    @ApiPropertyOptional({
        description: 'End date of the profile',
        type: 'string',
        format: 'date-time',
        example: '2023-10-01T00:00:00Z'
    })
    @IsOptional()
    @IsDate()
    @Type(() => Date)
    endDate: Date;

    @ApiPropertyOptional({
        description: 'List of included outlets',
        type: [String],
        format: 'uuid'
    })
    @IsArray()
    @IsUUID('all', { each: true })
    @IsOptional()
    includedOutlets: string[];

    @ApiPropertyOptional({
        description: 'List of excluded outlets',
        type: [String],
        format: 'uuid'
    })
    @IsArray()
    @IsUUID('all', { each: true })
    @IsOptional()
    excludedOutlets: string[];
}
export class MerchantOutletProfilesDto {
    @ApiProperty({
        description: 'Profile UUID',
        type: 'string',
        format: 'uuid'
    })
    @IsNotEmpty()
    @IsUUID()
    profileId: string;

    @ApiPropertyOptional({
        description: 'List of outlet profiles',
        type: [MerchantOutletProfileDto]
    })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => MerchantOutletProfileDto)
    @IsOptional()
    merchantOutletProfileDtos: MerchantOutletProfileDto[];
}
