import { IsBoolean, IsDateString, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class ProfileDto {
  @IsUUID()
  @IsNotEmpty()
  name: string;

  @IsUUID()
  @IsNotEmpty()
  profileId: string;

  @IsBoolean()
  @IsOptional()
  isActive: boolean;

  @IsUUID()
  @IsOptional()
  description: string;
}

export class GetOutletProfileQueryDto {
  @IsOptional()
  @IsDateString()
  transactionDate?: string;

  @IsOptional()
  @IsString()
  cardBin?: string;
}
