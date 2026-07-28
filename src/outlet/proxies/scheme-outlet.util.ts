import { Outlet } from '../models/outlet.model';

export const buildSchemeHeaders = (token: Record<string, string>) => ({
  headers: {
    'Authorization': token.authorization,
    'x-device-id': token['x-device-id'],
  },
});

type TerminalFlagKey = 'disableTerminalsOnly' | 'enableTerminalsOnly';

export const buildOutletTerminalPayload = async (outletId: string, flagKey: TerminalFlagKey) => {
  const outlet = await Outlet.findOne({
    where: { outletId },
  });

  const hasPosIds = outlet?.posIds?.length > 0;
  const terminals = outlet?.posIds ? outlet.posIds : [];

  return {
    outletId,
    [flagKey]: hasPosIds,
    terminals,
  };
};
