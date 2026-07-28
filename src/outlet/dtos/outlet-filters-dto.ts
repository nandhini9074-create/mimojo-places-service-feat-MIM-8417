import { IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class OutletFiltersDto {
  @IsUUID()
  @IsOptional()
  outletFilterId: string;

  @IsUUID()
  @IsNotEmpty()
  outletId: string;

  @IsUUID()
  @IsNotEmpty()
  filterId: string;
}
