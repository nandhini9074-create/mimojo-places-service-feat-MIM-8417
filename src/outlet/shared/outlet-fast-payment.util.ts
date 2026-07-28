/** Axios-style response shape for fast payment API responses */
interface FastPaymentApiResponse {
  data?: {
    data?: unknown;
    description?: string;
    hasInroomDining?: boolean;
    disabledPaymentMethods?: unknown;
  };
}

function getResponseData(source: unknown): FastPaymentApiResponse['data'] {
  return (source as FastPaymentApiResponse)?.data;
}

export interface OutletFastPaymentConfigSources {
  tabs?: unknown;
  posConfig?: unknown;
  priceConfig?: unknown;
  config?: unknown;
  outletConfig?: unknown;
}

export function buildOutletFastPaymentConfig({ tabs, priceConfig, config, outletConfig }: OutletFastPaymentConfigSources) {
  const tabsData = getResponseData(tabs)?.data;
  const priceData = getResponseData(priceConfig)?.data;
  const configData = getResponseData(config)?.data as FastPaymentApiResponse['data'] | undefined;
  const outletConfigData = getResponseData(outletConfig)?.data;

  return {
    tabs: Array.isArray(tabsData) && tabsData.length ? tabsData : null,
    priceConfig: priceData ?? null,
    messageDescription: configData?.description ?? null,
    hasInroomDining: configData?.hasInroomDining ?? null,
    disabledPaymentMethods: configData?.disabledPaymentMethods ?? null,
    config: outletConfigData ?? null,
  };
}

export function removeCircularReferences<T>(obj: T): T {
  const seen = new WeakSet();
  return JSON.parse(
    JSON.stringify(obj, (_, value) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) return;
        seen.add(value);
      }
      return value;
    })
  );
}
