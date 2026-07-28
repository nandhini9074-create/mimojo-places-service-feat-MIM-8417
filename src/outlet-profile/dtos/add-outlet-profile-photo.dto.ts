import { IsBoolean, IsInt, IsOptional, IsUrl, IsUUID } from "class-validator";

export class OutletProfilePhotoDto {

  @IsUrl()
  cdnUrl?: string;

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
  outletProfileMetadataId: string;
  
}