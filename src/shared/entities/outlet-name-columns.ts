import { DataType } from 'sequelize-typescript';

/** Shared column options for merchant/outlet name fields used in Outlet and OutletProfileMetadata */
export const MERCHANT_NAME_COLUMN = {
  type: DataType.STRING(150),
  allowNull: true,
} as const;

export const MERCHANT_NAME_AR_COLUMN = {
  type: DataType.STRING(150),
  allowNull: true,
} as const;

export const OUTLET_NAME_COLUMN = {
  type: DataType.STRING(2000),
  allowNull: true,
} as const;

export const OUTLET_NAME_AR_COLUMN = {
  type: DataType.STRING(2000),
  allowNull: true,
} as const;
