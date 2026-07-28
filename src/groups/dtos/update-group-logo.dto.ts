import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmptyString } from '../../common/decorators/IsNotEmptyString';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class UpdateGroupLogoDto {
  @ApiProperty({
    description: 'Unique identifier of the group',
    example: '9f7c6f6a-3d2f-4b65-9e8e-123456789abc',
  })
  @IsUUID()
  @IsNotEmpty()
  id: string;

  @ApiProperty({
    description: 'URL of the new logo for the group',
    example: 'https://example.com/logo.png',
  })
  @IsString()
  @IsNotEmptyString()
  url: string;
}
