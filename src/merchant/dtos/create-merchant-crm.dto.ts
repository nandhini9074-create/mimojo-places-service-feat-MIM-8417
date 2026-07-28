import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDefined,
  IsEmail,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { IsPaymentPlan } from 'src/common/decorators/IsPaymentPlan';
import { IsMobileNumber } from 'src/common/helpers/utils';
import { IsNotEmptyString } from '../../common/decorators/IsNotEmptyString';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMerchantCRM {
  @ApiProperty({ description: 'Company contact name', example: 'Acme Corp', minLength: 2, maxLength: 50 })
  @IsNotEmptyString()
  @Length(2, 50)
  declare contactCompanyName: string;

  @ApiProperty({ description: 'Contact first name', example: 'John', minLength: 1, maxLength: 50 })
  @Length(1, 50)
  @IsNotEmptyString()
  declare contactFirstName: string;

  @ApiProperty({ description: 'Contact last name', example: 'Doe', minLength: 1, maxLength: 50 })
  @Length(1, 50)
  @IsNotEmptyString()
  declare contactLastName: string;

  @ApiProperty({ description: 'Contact job title', example: 'Manager', minLength: 2, maxLength: 50 })
  @Length(2, 50)
  @IsNotEmptyString()
  declare contactJobTitle: string;

  @ApiProperty({ description: 'Contact email', example: 'john.doe@example.com', format: 'email' })
  @IsNotEmptyString()
  @IsEmail()
  @Transform(({ value }) => value.trim().toLowerCase())
  declare contactEmail: string;

  @ApiProperty({ description: 'Contact mobile number', example: '+971501234567', maxLength: 15 })
  @MaxLength(15)
  @IsNotEmptyString()
  @IsMobileNumber()
  declare contactMobileNumber: string;

  @ApiProperty({ description: 'Merchant name', example: 'Acme Store', minLength: 2, maxLength: 50 })
  @IsNotEmptyString()
  @Length(2, 50)
  declare merchantName: string;

  @ApiPropertyOptional({ description: 'Opportunity country', example: 'UAE', minLength: 2, maxLength: 50 })
  @ValidateIf(o => {
    if (o.opportunityCountry !== undefined) return true;
    return false;
  })
  @IsOptional()
  @Length(2, 50)
  @IsNotEmptyString()
  declare opportunityCountry: string;

  @ApiPropertyOptional({ description: 'Opportunity city', example: 'Dubai', minLength: 2, maxLength: 50 })
  @ValidateIf(o => {
    if (o.opportunityCity !== undefined) return true;
    return false;
  })
  @IsOptional()
  @Length(2, 50)
  @IsNotEmptyString()
  declare opportunityCity: string;

  @ApiPropertyOptional({ description: 'Group name', example: 'Premium Group', minLength: 2, maxLength: 50 })
  @ValidateIf(o => {
    if (o.groupName !== undefined) return true;
    return false;
  })
  @IsOptional()
  @IsString()
  declare groupName: string;

  @ApiPropertyOptional({ description: 'Category name', example: 'Retail', minLength: 2, maxLength: 50 })
  @ValidateIf(o => {
    if (o.category !== undefined) return true;
    return false;
  })
  @Length(2, 50)
  @IsOptional()
  @IsString()
  declare category: string;

  @ApiPropertyOptional({ description: 'Subcategory name', example: 'Coffee Shops', minLength: 2, maxLength: 50 })
  @ValidateIf(o => {
    if (o.subCategory !== undefined) return true;
    return false;
  })
  @Length(2, 50)
  @IsOptional()
  @IsString()
  declare subCategory: string;

  @ApiProperty({ description: 'Merchant classification', example: 'Gold', minLength: 1, maxLength: 50 })
  @IsNotEmptyString()
  @Length(1, 50)
  declare classification: string;

  @ApiProperty({ description: 'Sales person name', example: 'Alice', minLength: 2, maxLength: 50 })
  @IsNotEmptyString()
  @Length(2, 50)
  declare salesPerson: string;

  @ApiProperty({
    description: 'Current date-time in ISO format',
    example: '2025-08-28T12:00:00Z',
    format: 'date-time',
    minLength: 2,
    maxLength: 50,
  })
  @IsNotEmptyString()
  @Length(2, 50)
  @IsISO8601()
  declare currentDateTime: string;

  @ApiProperty({ description: 'Maximum offer value if not a circle', example: 50 })
  @IsNotEmpty()
  @IsNumber()
  @ValidateIf(object => object.isCircle === false)
  @Min(1, { message: 'maxOfferValue must be greater than 0 if isCircle is false' })
  @Max(100)
  maxOfferValue: number;

  @ApiPropertyOptional({ description: 'Consumer split percentage', example: 30 })
  @IsOptional()
  @IsNumber()
  consumerSplit: number;

  @ApiProperty({ description: 'Finance contact first name', example: 'Robert', minLength: 2, maxLength: 50 })
  @IsNotEmptyString()
  @Length(2, 50)
  declare financeContactFirstName: string;

  @ApiProperty({ description: 'Finance contact last name', example: 'Smith', minLength: 2, maxLength: 50 })
  @IsNotEmptyString()
  @Length(2, 50)
  declare financeContactLastName: string;

  @ApiProperty({ description: 'Finance contact job title', example: 'CFO', minLength: 2, maxLength: 50 })
  @IsNotEmptyString()
  @Length(2, 50)
  declare financeContactJobTitle: string;

  @ApiProperty({ description: 'Finance contact email', example: 'robert.smith@example.com', format: 'email' })
  @IsNotEmptyString()
  @IsEmail()
  @Transform(({ value }) => value.trim().toLowerCase())
  declare financeContactEmail: string;

  @ApiProperty({ description: 'Finance contact mobile', example: '+971501234567', maxLength: 15 })
  @MaxLength(15)
  @IsNotEmptyString()
  @IsMobileNumber()
  declare financeContactMobile: string;

  @ApiPropertyOptional({ description: 'Trade license number', example: 'TL-12345', minLength: 2, maxLength: 50 })
  @IsNotEmptyString()
  @Length(2, 50)
  @IsOptional()
  declare tradeLicenseNumber: string;

  @ApiPropertyOptional({ description: 'Tax registration number', example: 'TR-67890', minLength: 2, maxLength: 50 })
  @IsNotEmptyString()
  @Length(2, 50)
  @IsOptional()
  declare taxRegistrationNumber: string;

  @ApiProperty({ description: 'Payment plan', example: 'PRE-PAY' })
  @IsDefined()
  @IsPaymentPlan({ message: 'Payment plan should be either Pre-pay or Post-pay' })
  @Transform(({ value }) => ('' + value).toUpperCase())
  declare paymentPlan: string;

  @ApiPropertyOptional({ description: 'Amount required for prepaid payments', example: 100 })
  @IsNumber()
  @Min(2)
  @Max(30000)
  @ValidateIf(object => object.paymentPlan === 'PRE-PAY')
  @IsDefined({ message: 'Amount is required for prepaid payments' })
  declare prepayAmount: number;

  @ApiPropertyOptional({ description: 'Initial MIDs for the opportunity', example: 'MID123,MID456' })
  @IsString()
  @IsOptional()
  declare opportunityInitialMIDs: string;

  @ApiProperty({ description: 'Is merchant part of a circle', example: false })
  @IsBoolean()
  declare isCircle: boolean;
}
