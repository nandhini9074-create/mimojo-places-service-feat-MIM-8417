import { IsBoolean, IsDate, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class CreateOutletProfileDto {
  @IsUUID()
  @IsNotEmpty()
  outletId: string;

  @IsUUID()
  @IsNotEmpty()
  profileId: string;

  @IsDate()
  @IsOptional()
  startDate: Date;

  @IsDate()
  @IsOptional()
  endDate: Date;

  @IsBoolean()
  isActive: boolean;

  @IsUUID()
  @IsOptional()
  updatedBy: string;
}

export class CloneOutletMappingDto {
  @IsUUID()
  @IsNotEmpty()
  outletId: string;

  @IsUUID()
  @IsNotEmpty()
  profileId: string;

  @IsUUID()
  @IsNotEmpty()
  existingOutletId: string;

  @IsUUID()
  @IsOptional()
  updatedBy: string;
}
