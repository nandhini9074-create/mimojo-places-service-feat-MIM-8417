import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsUUID } from "class-validator";

export class UpsertNeighbourhoodDto {
    @ApiPropertyOptional({
        description: 'Unique identifier of the neighbourhood (required only when updating).',
        example: '9f7c6f6a-3d2f-4b65-9e8e-123456789abc',
        format: 'uuid',
    })
    @IsUUID()
    @IsNotEmpty()
    @IsOptional()
    neighbourhoodId: string;

    @ApiProperty({
        description: 'English name of the neighbourhood.',
        example: 'Downtown',
    })
    @IsNotEmpty()
    neighbourhoodName: string;

    @ApiPropertyOptional({
        description: 'Arabic name of the neighbourhood (optional).',
        example: 'وسط المدينة',
    })
    @IsNotEmpty()
    @IsOptional()
    neighbourhoodNameAr: string;

    @ApiProperty({
        description: 'Unique identifier of the area this neighbourhood belongs to.',
        example: '2e9b48c7-7c04-4c15-93d7-4c9a6e1ef2c7',
        format: 'uuid',
    })
    @IsUUID()
    @IsNotEmpty()
    areaId: string;
}