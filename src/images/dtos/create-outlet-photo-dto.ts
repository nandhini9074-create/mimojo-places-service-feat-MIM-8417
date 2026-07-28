import {
    IsNotEmpty,
    IsNumber,
    MaxLength,
    IsUrl,
    IsOptional,
    IsUUID
} from 'class-validator';

export class CreateOutletPhotoDto {
    @IsUUID()
    @IsNotEmpty()
    outlet_id: string;

    @MaxLength(50)
    @IsUrl()
    @IsNotEmpty()
    cdn_url: string;

    @IsOptional()
    @IsNumber()
    height: number;

    @IsOptional()
    @IsNumber()
    width: number;
}