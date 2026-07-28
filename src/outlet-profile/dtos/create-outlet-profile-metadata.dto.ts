import { Type } from "class-transformer";
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  MaxLength,
  ValidateNested,
} from "class-validator";
import { IsNotBlank } from "src/outlet/decorator/isNotBlank.validator";
import { OutletProfileFiltersDto } from "./outlet-profile-filter.dto";
import { CreateManualOutletAddressDto } from "src/outlet/dtos/create-manual-outlet-address-dto";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";


export class CreateOutletProfileDto {
  @ApiPropertyOptional({
    description: 'Outlet profile unique identifier (for updates)',
    example: '9f7c6f6a-3d2f-4b65-9e8e-123456789abc',
    format: 'uuid',
  })
  @IsUUID()
  @IsOptional()
  id: string;

  @ApiProperty({
    description: 'Merchant UUID associated with this outlet',
    example: '6f9c6f6a-3d2f-4b65-9e8e-abcdef987654',
    format: 'uuid',
  })
  @IsUUID()
  @IsNotEmpty()
  merchantId: string;

  @ApiProperty({
    description: 'Profile UUID associated with this outlet',
    example: '5f6d6f6a-3d2f-4b65-9e8e-abcdef123456',
    format: 'uuid',
  })
  @IsUUID()
  @IsNotEmpty()
  profileId: string

  @ApiProperty({
    description: 'Outlet UUID associated with this profile',
    example: '8f7c6f6a-3d2f-4b65-9e8e-987654321abc',
    format: 'uuid',
  })
  @IsUUID()
  @IsNotEmpty()
  outletId: string

  @ApiPropertyOptional({
    description: 'Name of the outlet in English',
    example: 'Starbucks Downtown',
    maxLength: 2000,
  })
  @IsString()
  @MaxLength(2000)
  @IsOptional()
  @IsNotBlank()
  name: string;

  @ApiPropertyOptional({
    description: 'Name of the outlet in Arabic',
    example: 'ستاربكس وسط المدينة',
    maxLength: 2000,
  })
  @IsString()
  @MaxLength(2000)
  @IsOptional()
  @IsNotBlank()
  @IsOptional()
  nameAr: string;

  @ApiPropertyOptional({
    description: 'Array of photo URLs for the outlet',
    example: ['https://example.com/photo1.jpg', 'https://example.com/photo2.jpg'],
    type: [String],
    format: 'url',
  })
  @IsUrl(undefined, { each: true })
  @IsOptional()
  photos: string[];

  @ApiPropertyOptional({
    description: 'Description of the outlet in English',
    example: 'A cozy coffee shop in downtown.',
  })
  @IsString()
  @IsOptional()
  description: string;

  @ApiPropertyOptional({
    description: 'Description of the outlet in Arabic',
    example: 'مقهى دافئ في وسط المدينة.',
  })
  @IsString()
  @IsOptional()
  descriptionAr: string;


  @ApiPropertyOptional({
    description: 'Filters applied to this outlet profile',
    type: [OutletProfileFiltersDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OutletProfileFiltersDto)
  @IsOptional()
  outletFilters: OutletProfileFiltersDto[];

  @ApiPropertyOptional({
    description: 'Manual address details for this outlet',
    type: CreateManualOutletAddressDto,
  })
  @IsOptional()
  @Type(() => CreateManualOutletAddressDto)
  @ValidateNested({ each: true })
  outletAddress: CreateManualOutletAddressDto;


}
