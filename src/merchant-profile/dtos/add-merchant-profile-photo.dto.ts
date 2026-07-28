import { IsUUID, IsOptional, IsInt, IsBoolean, IsUrl } from 'class-validator';

export class MerchantProfilePhotoDto {
  @IsUrl()
  url?: string;

  @IsInt()
  @IsOptional()
  sortOrder?: number;

  @IsInt()
  @IsOptional()
  height?: number;

  @IsInt()
  @IsOptional()
  width?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @IsUUID()
  merchantProfileMetadataId: string;
}
