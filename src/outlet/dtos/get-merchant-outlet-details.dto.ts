import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray } from 'class-validator';

export class GetMerchantOutletDetailsDto {
  @ApiProperty({
    description: 'Array of outlet UUIDs',
    example: ['outlet-uuid-1', 'outlet-uuid-2'],
    type: [String],
    maxItems: 1000,
  })
  @IsArray()
  @ArrayMaxSize(1000)
  outletIds: string[];
}
