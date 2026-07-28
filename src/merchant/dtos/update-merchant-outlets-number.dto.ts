import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class UpdateMerchantOutletsNumberDto {
  @ApiProperty({
    description: 'Number of active outlets',
    example: 5,
    format: 'int32',
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  activeOutletsNum: number;

  @ApiProperty({
    description: 'Number of inactive outlets',
    example: 2,
    format: 'int32',
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  inActiveOutletsNum: number;
}
