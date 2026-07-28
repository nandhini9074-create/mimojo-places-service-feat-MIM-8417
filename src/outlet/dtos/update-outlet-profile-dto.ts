import { IsBoolean, IsDate, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class UpdateOutletProfileDto {
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
