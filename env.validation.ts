import { IsEnum, IsNotEmpty, IsNumber, IsString, validateSync, IsBoolean, IsUrl, IsOptional } from 'class-validator';
import { plainToInstance, Transform } from 'class-transformer';
import { IAppConfig, IDatabaseConfig } from './config/interface';
import { Dialect } from 'sequelize/types';

export enum EnvironmentEnum {
  LOCAL = 'local',
  DEV = 'dev',
  STAGING = 'staging',
  PRELIVE = 'prelive',
  PRODUCTION = 'prod',
}

export class EnvironmentVariables implements IAppConfig, IDatabaseConfig {
  @IsNotEmpty()
  @IsEnum(EnvironmentEnum)
  NODE_ENV: EnvironmentEnum;

  @IsNotEmpty()
  @IsString()
  SERVER_HTTP_HOST: string;

  @IsNotEmpty()
  @IsNumber()
  SERVER_HTTP_PORT: number;

  @IsNotEmpty()
  @IsString()
  DB_DIALECT: Dialect;

  @IsNotEmpty()
  @IsNumber()
  DB_PORT: number;

  @IsNotEmpty()
  @IsString()
  DB_DATABASE: string;

  @IsNotEmpty()
  @Transform(({ obj }) => {
    const { DB_AUTO_LOAD_MODELS } = obj;
    return DB_AUTO_LOAD_MODELS === true || DB_AUTO_LOAD_MODELS == 'true';
  })
  @IsBoolean()
  DB_AUTO_LOAD_MODELS: boolean;

  @IsNotEmpty()
  @Transform(({ obj }) => {
    const { DB_SYNC } = obj;
    return DB_SYNC === true || DB_SYNC == 'true';
  })
  @IsBoolean()
  DB_SYNC: boolean;

  @IsNotEmpty()
  @IsBoolean()
  @Transform(({ obj }) => {
    const { DB_FORCE } = obj;
    return DB_FORCE === true || DB_FORCE == 'true';
  })
  DB_FORCE: boolean;

  @IsNotEmpty()
  @IsNumber()
  DB_POOL_MIN: number;

  @IsNotEmpty()
  @IsNumber()
  DB_POOL_MAX: number;

  @IsNotEmpty()
  @Transform(({ obj }) => {
    const { DB_LOGGING } = obj;
    return DB_LOGGING === true || DB_LOGGING === 'true';
  })
  @IsBoolean()
  DB_LOGGING: boolean;

  @IsNotEmpty()
  @Transform(({ obj }) => {
    const { DB_UNDERSCORED } = obj;
    return DB_UNDERSCORED === true || DB_UNDERSCORED === 'true';
  })
  @IsBoolean()
  DB_UNDERSCORED: boolean;

  @IsNotEmpty()
  @IsString()
  DB_HOST: string;

  @IsNotEmpty()
  @IsString()
  DB_USERNAME: string;

  @IsNotEmpty()
  @IsString()
  DB_PASSWORD: string;

  @IsNotEmpty()
  @IsBoolean()
  DB_SSL: boolean;

  @IsNotEmpty()
  @IsString()
  KAFKA_CONSUMER_BROKERS: string[];

  @IsNotEmpty()
  @IsString()
  KAFKA_PRODUCER_BROKERS: string[];

  @IsNotEmpty()
  @IsString()
  KAFKA_CLIENT_ID: string;

  @IsNotEmpty()
  @IsBoolean()
  KAFKA_ALLOW_AUTO_TOPIC_CREATION: boolean;

  @IsNotEmpty()
  @IsBoolean()
  KAFKA_AUTO_COMMIT: boolean;

  @IsNotEmpty()
  @IsString()
  KAFKA_TOPIC: string;

  @IsNotEmpty()
  @IsString()
  KAFKA_AUDIT_LOG_TOPIC: string;

  @IsNotEmpty()
  @IsString()
  CORE_UPDATE_OUTLET: string;

  @IsNotEmpty()
  @IsString()
  BLOB_CONNECTION_STRING: string;

  @IsNotEmpty()
  @IsString()
  BLOB_CONTAINER_NAME: string;

  @IsNotEmpty()
  @IsString()
  BLOB_SAS_TOKEN: string;

  @IsNotEmpty()
  @IsString()
  BLOB_URL: string;

  @IsNotEmpty()
  @IsString()
  GOOGLE_API_KEY: string;

  @IsNotEmpty()
  @IsString()
  GOOGLE_PLACES_FIELDS: string;

  @IsNotEmpty()
  @IsString()
  SCHEME_SERVICE_DISABLE_OUTLETS: string;

  @IsNotEmpty()
  @IsString()
  SCHEME_SERVICE_ENABLE_OUTLETS: string;

  @IsNotEmpty()
  @IsString()
  MOENGAGE_OUTLET_EVENT_URL: string;

  @IsNotEmpty()
  @IsString()
  MOENGAGE_OUTLET_EVENT: string;

  @IsNotEmpty()
  @IsString()
  E_COMMERCE_CATEGORY_ID: string;

  @IsNotEmpty()
  @IsString()
  FINANCE_SERVICE_URL: string;

  @IsUrl()
  @IsString()
  FAST_PAYMENT_SERVICE_URL: string;

  @IsNotEmpty()
  @IsString()
  POS_SERVICE_URL: string;

  @IsNotEmpty()
  @IsString()
  POS_AUTH_CODE: string;

  @IsNotEmpty()
  @IsString()
  FB_CATEGORY_ID: string;

  @IsNotEmpty()
  @IsString()
  CATEGORY_TYPES: string;

  @IsNotEmpty()
  @IsString()
  MANAGEMENT_REPORTING_OUTLET_URL: string;

  @IsNotEmpty()
  @IsString()
  GET_MERCHANT_GROUPS_URL: string;

  @IsNotEmpty()
  @IsBoolean()
  USE_MERCHANT_ACQUIRER: boolean;

  @IsNotEmpty()
  @IsString()
  OUTLET_SCHEDULED_OFFER: string;

  @IsNotEmpty()
  @IsString()
  MERCHANT_GET_BY_ID_URL: string;

  @IsNotEmpty()
  @IsString()
  AUDIT_LOG_NODE_STATUS: string;

  @IsNotEmpty()
  @IsString()
  AUDIT_LOG_NODE_NEW_OUTLET_MANUAL: string;

  @IsNotEmpty()
  @IsString()
  AUDIT_LOG_NODE_NEW_OUTLET_GOOGLE: string;

  @IsNotEmpty()
  @IsString()
  AUDIT_LOG_NODE_HERO_IMAGE: string;

  @IsNotEmpty()
  @IsString()
  AUDIT_LOG_NODE_CONFIGURATION: string;

  @IsNotEmpty()
  @IsString()
  AUDIT_LOG_NODE_OFFER: string;

  @IsNotEmpty()
  @IsString()
  AUDIT_LOG_MERCHANT_NODE_NEW_OUTLET: string;

  @IsNotEmpty()
  @IsString()
  KAFKA_OUTLET_OFFER_TOPIC: string;

  @IsNotEmpty()
  @IsString()
  KAFKA_MAX_OFFER_TOPIC: string;

  @IsNotEmpty()
  @IsString()
  KAFKA_OFFER_MAX_VALUE_GROUP: string;

  @IsNotEmpty()
  @IsString()
  KAFKA_NOTIFICATION_TOPIC: string;

  @IsNotEmpty()
  @IsString()
  SHOW_ME_EVERYTHING_CATEGORY_ID: string;

  @IsNotEmpty()
  @IsString()
  KAFKA_POS_TOPIC: string;

  @IsNotEmpty()
  @IsString()
  QATAR_CITY_ID: string;

  @IsNotEmpty()
  @IsString()
  E_COMMERCE_AREA_ID: string;

  @IsNotEmpty()
  @IsString()
  @IsUrl()
  MERCHANT_OFFER_URL: string;

  @IsNotEmpty()
  @IsString()
  FNB_CATEGORY_ID: string;

  @IsNotEmpty()
  @IsString()
  FNB_CATEGORY_NAME: string;

  @IsNotEmpty()
  @IsString()
  FNB_CATEGORY_LOGO: string;

  @IsNotEmpty()
  @IsString()
  @IsUrl()
  MERCHANT_IDENTITY_URL: string;

  @IsNotEmpty()
  @IsString()
  @IsUrl()
  ALL_OUTLETS_OFFERS_OF_MERCHANT_PROFILE: string;

  @IsNotEmpty()
  @IsString()
  @IsUrl()
  CORE_PAYOUT_URL: string;

  @IsNotEmpty()
  @Transform(({ obj }) => {
    const { IS_SWAGGER_ENABLED } = obj;
    return IS_SWAGGER_ENABLED === true || IS_SWAGGER_ENABLED == 'true';
  })
  @IsBoolean()
  IS_SWAGGER_ENABLED: boolean;

  @IsOptional()
  @IsString()
  @IsUrl()
  DOMAIN_URL: string;

  @IsNotEmpty()
  @IsString()
  SEARCH_SERVICE_UPDATE_PAYLOAD_URL: string;

  @IsNotEmpty()
  @IsString()
  GRAVITEE_URL: string;

  @IsNotEmpty()
  @IsString()
  OFFER_URL: string;

  @IsNotEmpty()
  @IsString()
  MIMOJO_PROFILE_ID: string;

  @IsNotEmpty()
  @IsString()
  EIB_PROFILE_ID: string;

  @IsNotEmpty()
  @IsString()
  ADIB_PROFILE_ID: string;

  @IsNotEmpty()
  @IsString()
  OTEL_EXPORTER_OTLP_ENDPOINT: string;

  @IsNotEmpty()
  @IsString()
  SERVICE_NAME: string;

  @IsNotEmpty()
  @IsString()
  KAFKA_OUTLET_ACTIVE_STATUS_TOPIC: string;

  @IsNotEmpty()
  @IsString()
  ALL_REWARDS_OF_OUTLET: string;

  @IsNotEmpty()
  @IsString()
  CHECK_ACTIVE_OFFER_MERCHANT_URL: string;

  @IsNotEmpty()
  @IsBoolean()
  IS_REWARD_ENGINE_ENABLED: boolean;

  @IsNotEmpty()
  @IsString()
  REWARD_ENGINE_SERVICE_URL: string;

  @IsNotEmpty()
  @IsString()
  REWARD_ENGINE_WRAPPER_SERVICE_URL: string;

  @IsUrl()
  @IsNotEmpty()
  PAYOUT_CONFIG_RE_MERCHANT_URL: string;

  @IsString()
  GRAVITEE_API_KEY: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  console.log(validatedConfig);
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  return validatedConfig;
}
