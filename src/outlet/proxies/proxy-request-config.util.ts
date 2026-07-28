import { AxiosRequestConfig } from 'axios';
import * as moment from 'moment';

export type DeviceAuthToken = Record<string, string>;

export function buildDeviceAuthHeaders(token: DeviceAuthToken): Record<string, string> {
  return {
    'Authorization': token.authorization,
    'x-device-id': token['x-device-id'],
  };
}

export function buildTransactionDateParams(): Record<string, string> {
  return {
    transactionDate: moment().utc().format('YYYY-MM-DDTHH:mm:ss[Z]'),
  };
}

export function buildDeviceAuthConfig(token: DeviceAuthToken): AxiosRequestConfig {
  return {
    headers: buildDeviceAuthHeaders(token),
  };
}

export function buildDeviceAuthConfigWithTransactionDate(token: DeviceAuthToken): AxiosRequestConfig {
  return {
    headers: buildDeviceAuthHeaders(token),
    params: buildTransactionDateParams(),
  };
}
