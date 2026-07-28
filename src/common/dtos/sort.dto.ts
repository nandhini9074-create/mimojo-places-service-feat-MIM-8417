import { IsArray, IsOptional, IsString } from 'class-validator';

export class SortDto {
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  sort: string[];
}
