import { registerAs } from '@nestjs/config';
import { EnvironmentEnum } from 'env.validation';
import { EnvKeysEnum } from './env.enum';
import {
  IAppConfig,
  IBlobConfig,
  IDatabaseConfig,
  IGrafanaConfig,
  IGooglePlacesConfiguration,
  IInternalApiConfig,
  IKafkaConsumerConfig,
  IKafkaProducerConfig,
} from './interface';
import { Dialect } from 'sequelize/types';

export const appConfig = registerAs(
  'app',
  (): IAppConfig => ({
    NODE_ENV: process.env[EnvKeysEnum.NODE_ENV] as EnvironmentEnum,
    SERVER_HTTP_PORT: parseInt(process.env[EnvKeysEnum.SERVER_HTTP_PORT], 10),
    SERVER_HTTP_HOST: process.env[EnvKeysEnum.SERVER_HTTP_HOST],
    IS_SWAGGER_ENABLED: JSON.parse(process.env[EnvKeysEnum.IS_SWAGGER_ENABLED]),
    DOMAIN_URL: process.env[EnvKeysEnum.DOMAIN_URL],
    IS_REWARD_ENGINE_ENABLED: JSON.parse(process.env[EnvKeysEnum.IS_REWARD_ENGINE_ENABLED]),
  })
);

export const databaseConfig = registerAs(
  'database',
  (): IDatabaseConfig => ({
    DB_DIALECT: process.env[EnvKeysEnum.DB_DIALECT] as Dialect,
    DB_PORT: parseInt(process.env[EnvKeysEnum.DB_PORT]),
    DB_DATABASE: process.env[EnvKeysEnum.DB_DATABASE],
    DB_HOST: process.env[EnvKeysEnum.DB_HOST],
    DB_USERNAME: process.env[EnvKeysEnum.DB_USERNAME],
    DB_PASSWORD: process.env[EnvKeysEnum.DB_PASSWORD] as string,
    DB_AUTO_LOAD_MODELS: JSON.parse(process.env[EnvKeysEnum.DB_AUTO_LOAD_MODELS]),
    DB_SYNC: JSON.parse(process.env[EnvKeysEnum.DB_SYNC]),
    DB_FORCE: JSON.parse(process.env[EnvKeysEnum.DB_FORCE]),
    DB_POOL_MIN: parseInt(process.env[EnvKeysEnum.DB_POOL_MIN]),
    DB_POOL_MAX: parseInt(process.env[EnvKeysEnum.DB_POOL_MAX]),
    DB_LOGGING: JSON.parse(process.env[EnvKeysEnum.DB_LOGGING]),
    DB_UNDERSCORED: JSON.parse(process.env[EnvKeysEnum.DB_UNDERSCORED]),
    DB_SSL: true,
  })
);

export const kafkaConsumerConfig = registerAs(
  'kafka-producer',
  (): IKafkaProducerConfig => ({
    KAFKA_ALLOW_AUTO_TOPIC_CREATION: JSON.parse(process.env[EnvKeysEnum.KAFKA_ALLOW_AUTO_TOPIC_CREATION]),
    KAFKA_AUTO_COMMIT: JSON.parse(process.env[EnvKeysEnum.KAFKA_AUTO_COMMIT]),
    KAFKA_PRODUCER_BROKERS: process.env[EnvKeysEnum.KAFKA_PRODUCER_BROKERS],
    KAFKA_CLIENT_ID: process.env[EnvKeysEnum.KAFKA_CLIENT_ID],
    KAFKA_TOPIC: process.env[EnvKeysEnum.KAFKA_TOPIC],
    KAFKA_AUDIT_LOG_TOPIC: process.env[EnvKeysEnum.KAFKA_AUDIT_LOG_TOPIC],
    KAFKA_OUTLET_OFFER_TOPIC: process.env[EnvKeysEnum.KAFKA_OUTLET_OFFER_TOPIC],
    KAFKA_MAX_OFFER_TOPIC: process.env[EnvKeysEnum.KAFKA_MAX_OFFER_TOPIC],
    KAFKA_NOTIFICATION_TOPIC: process.env[EnvKeysEnum.KAFKA_NOTIFICATION_TOPIC],
    KAFKA_POS_TOPIC: process.env[EnvKeysEnum.KAFKA_POS_TOPIC],
    KAFKA_MERCHANT_OFFER_TOPIC: process.env[EnvKeysEnum.KAFKA_MERCHANT_OFFER_TOPIC],
    KAFKA_MERCHANT_PAYMENT_TERMS_TOPIC: process.env[EnvKeysEnum.KAFKA_MERCHANT_PAYMENT_TERMS_TOPIC],
    KAFKA_OUTLET_ACTIVE_STATUS_TOPIC: process.env[EnvKeysEnum.KAFKA_OUTLET_ACTIVE_STATUS_TOPIC],
  })
);

export const kafkaMessageConsumerConfig = registerAs(
  'kafka-consumer',
  (): IKafkaConsumerConfig => ({
    KAFKA_FROM_BEGINING: JSON.parse(process.env[EnvKeysEnum.KAFKA_FROM_BEGINING]),
    KAFKA_MAX_OFFER_TOPIC: process.env[EnvKeysEnum.KAFKA_MAX_OFFER_TOPIC],
    KAFKA_AUTO_COMMIT: JSON.parse(process.env[EnvKeysEnum.KAFKA_AUTO_COMMIT]),
    KAFKA_OFFER_MAX_VALUE_GROUP: process.env[EnvKeysEnum.KAFKA_OFFER_MAX_VALUE_GROUP],
    KAFKA_CONSUMER_BROKERS: process.env[EnvKeysEnum.KAFKA_CONSUMER_BROKERS],
    KAFKA_CLIENT_ID: process.env[EnvKeysEnum.KAFKA_CLIENT_ID],
  })
);

export const internalApisConfig = registerAs(
  'internal-apis',
  (): IInternalApiConfig => ({
    MERCHANT_CATEGORIES: process.env[EnvKeysEnum.MERCHANT_CATEGORIES] as string,
    MERCHANT_GET_BY_ID_URL: process.env[EnvKeysEnum.MERCHANT_GET_BY_ID_URL] as string,
    ALL_OFFERS_OF_OUTLET: process.env[EnvKeysEnum.ALL_OFFERS_OF_OUTLET] as string,
    MIMOJO_PROFILE_ID: process.env[EnvKeysEnum.MIMOJO_PROFILE_ID] as string,
    EIB_PROFILE_ID: process.env[EnvKeysEnum.EIB_PROFILE_ID],
    ADIB_PROFILE_ID: process.env[EnvKeysEnum.ADIB_PROFILE_ID],
    LLM_MASTER_PROFILE_ID: process.env[EnvKeysEnum.LLM_MASTER_PROFILE_ID],
    ALL_OUTLETS_OFFERS_OF_MERCHANT: process.env[EnvKeysEnum.ALL_OUTLETS_OFFERS_OF_MERCHANT] as string,
    CREATE_OUTLET_DEFAULT_OFFER: process.env[EnvKeysEnum.CREATE_OUTLET_DEFAULT_OFFER] as string,
    UPDATE_ACTIVE_INACTIVE_OUTLET_COUNT: process.env[EnvKeysEnum.UPDATE_ACTIVE_INACTIVE_OUTLET_COUNT] as string,
    UPLOAD_OUTLET_IMAGE: process.env[EnvKeysEnum.UPLOAD_OUTLET_IMAGE] as string,
    CORE_UPDATE_OUTLET: process.env[EnvKeysEnum.CORE_UPDATE_OUTLET] as string,
    MERCHANT_ACQUIRER: process.env[EnvKeysEnum.MERCHANT_ACQUIRER] as string,
    SCHEME_SERVICE_OUTLET_STATUS: process.env[EnvKeysEnum.SCHEME_SERVICE_OUTLET_STATUS] as string,
    SCHEME_SERVICE_DISABLE_OUTLETS: process.env[EnvKeysEnum.SCHEME_SERVICE_DISABLE_OUTLETS] as string,
    SCHEME_SERVICE_ENABLE_OUTLETS: process.env[EnvKeysEnum.SCHEME_SERVICE_ENABLE_OUTLETS] as string,
    MOENGAGE_OUTLET_EVENT: process.env[EnvKeysEnum.MOENGAGE_OUTLET_EVENT] as string,
    MOENGAGE_OUTLET_EVENT_URL: process.env[EnvKeysEnum.MOENGAGE_OUTLET_EVENT_URL] as string,
    FINANCE_SERVICE_URL: process.env[EnvKeysEnum.FINANCE_SERVICE_URL] as string,
    E_COMMERCE_CATEGORY_ID: process.env[EnvKeysEnum.E_COMMERCE_CATEGORY_ID] as string,
    USE_MERCHANT_ACQUIRER: JSON.parse(process.env[EnvKeysEnum.USE_MERCHANT_ACQUIRER]),
    FB_CATEGORY_ID: process.env[EnvKeysEnum.FB_CATEGORY_ID] as string,
    CATEGORY_TYPES: process.env[EnvKeysEnum.CATEGORY_TYPES] as string,
    MANAGEMENT_REPORTING_OUTLET_URL: process.env[EnvKeysEnum.MANAGEMENT_REPORTING_OUTLET_URL] as string,
    OUTLET_SCHEDULED_OFFER: process.env[EnvKeysEnum.OUTLET_SCHEDULED_OFFER] as string,
    GET_MERCHANT_GROUPS_URL: process.env[EnvKeysEnum.GET_MERCHANT_GROUPS_URL] as string,
    MC_SCHEME_SERVICE_DISABLE_OUTLETS: process.env[EnvKeysEnum.MC_SCHEME_SERVICE_DISABLE_OUTLETS] as string,
    MC_SCHEME_SERVICE_ENABLE_OUTLETS: process.env[EnvKeysEnum.MC_SCHEME_SERVICE_ENABLE_OUTLETS] as string,
    MC_SCHEME_SERVICE_OUTLET_STATUS: process.env[EnvKeysEnum.MC_SCHEME_SERVICE_OUTLET_STATUS] as string,
    OUTLET_OFFER: process.env[EnvKeysEnum.OUTLET_OFFER] as string,
    FAST_PAYMENT_SERVICE_URL: process.env[EnvKeysEnum.FAST_PAYMENT_SERVICE_URL],
    POS_SERVICE_URL: process.env[EnvKeysEnum.POS_SERVICE_URL],
    SHOW_ME_EVERYTHING_CATEGORY_ID: process.env[EnvKeysEnum.SHOW_ME_EVERYTHING_CATEGORY_ID] as string,
    QATAR_CITY_ID: process.env[EnvKeysEnum.QATAR_CITY_ID] as string,
    CORE_PAYOUT_URL: process.env[EnvKeysEnum.CORE_PAYOUT_URL] as string,
    ALL_OUTLETS_OFFERS_OF_MERCHANT_PROFILE: process.env[EnvKeysEnum.ALL_OUTLETS_OFFERS_OF_MERCHANT_PROFILE] as string,
    SEARCH_SERVICE_UPDATE_PAYLOAD_URL: process.env[EnvKeysEnum.SEARCH_SERVICE_UPDATE_PAYLOAD_URL],
    GRAVITEE_URL: process.env[EnvKeysEnum.GRAVITEE_URL],
    GRAVITEE_API_KEY: process.env[EnvKeysEnum.GRAVITEE_API_KEY],
    OFFER_URL: process.env[EnvKeysEnum.OFFER_URL],
    ALL_REWARDS_OF_OUTLET: process.env[EnvKeysEnum.ALL_REWARDS_OF_OUTLET],
    CHECK_ACTIVE_OFFER_MERCHANT_URL: process.env[EnvKeysEnum.CHECK_ACTIVE_OFFER_MERCHANT_URL],
    REWARD_ENGINE_SERVICE_URL: process.env[EnvKeysEnum.REWARD_ENGINE_SERVICE_URL],
    REWARD_ENGINE_WRAPPER_SERVICE_URL: process.env[EnvKeysEnum.REWARD_ENGINE_WRAPPER_SERVICE_URL],
    PAYOUT_CONFIG_RE_MERCHANT_URL: process.env[EnvKeysEnum.PAYOUT_CONFIG_RE_MERCHANT_URL],
  })
);

export const googlePlacesConfig = registerAs(
  'google-places',
  (): IGooglePlacesConfiguration => ({
    GOOGLE_API_KEY: process.env[EnvKeysEnum.GOOGLE_API_KEY] as string,
    GOOGLE_PLACES_FIELDS: process.env[EnvKeysEnum.GOOGLE_PLACES_FIELDS] as string,
  })
);

export const blobConfig = registerAs(
  'blob',
  (): IBlobConfig => ({
    BLOB_URL: process.env[EnvKeysEnum.BLOB_URL] as string,
    BLOB_SAS_TOKEN: process.env[EnvKeysEnum.BLOB_SAS_TOKEN] as string,
    BLOB_CONNECTION_STRING: process.env[EnvKeysEnum.BLOB_CONNECTION_STRING] as string,
    BLOB_CONTAINER_NAME: process.env[EnvKeysEnum.BLOB_CONTAINER_NAME] as string,
  })
);

export const grafanaCredentials = registerAs(
  'grafanaCredentials',
  (): IGrafanaConfig => ({
    OTEL_EXPORTER_OTLP_ENDPOINT: process.env[EnvKeysEnum.OTEL_EXPORTER_OTLP_ENDPOINT] ?? '',
    SERVICE_NAME: process.env[EnvKeysEnum.SERVICE_NAME] ?? '',
  })
);
