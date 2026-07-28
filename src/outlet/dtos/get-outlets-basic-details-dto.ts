import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty } from 'class-validator';

export class OutletsBasicDetailsDTO {
    @ApiProperty({
        description: 'List of outlet UUIDs',
        example: ['outlet-id-1', 'outlet-id-2'],
        type: [String]
    })
    @IsArray()
    @IsNotEmpty({ each: true })
    outlets: string[];
}
