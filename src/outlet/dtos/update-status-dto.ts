import {
    IsEnum,
    IsNotEmpty, IsUUID,
  } from 'class-validator';
import { OutletStatusEnum } from '../enums/outlet-status-enum';
import { ApiProperty } from '@nestjs/swagger';
  
  export class UploadOutletStatusDto {
    @ApiProperty({
      description: 'Unique identifier of the outlet',
      format: 'uuid',
    })
    @IsNotEmpty()
    @IsUUID()
    outletId: string;

    @ApiProperty({
      description: 'Status of the outlet',
      enum: OutletStatusEnum,
      enumName: 'OutletStatusEnum'
    })
    @IsNotEmpty()
    @IsEnum(OutletStatusEnum)
    status: OutletStatusEnum;
  }