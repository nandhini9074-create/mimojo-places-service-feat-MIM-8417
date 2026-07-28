import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { AreaService } from 'src/area/services/area.service';
import { MerchantService } from 'src/merchant/services/merchant.service';
import { CreateCustomOutletDto } from '../dtos/create-custom-outlet-dto';
import { CreateOutletDto } from '../dtos/create-outlet-dto';
import { Merchant } from 'src/merchant/entities/merchant.model';
import { Outlet } from '../models/outlet.model';
import { CoreMerchantOutletProxy } from '../proxies/core-merchant-outlet.proxy';
import { OutletGetService } from './outlet-get.service';

@Injectable()
export class OutletCoreSyncService {
  constructor(
    private readonly areaService: AreaService,
    @Inject(forwardRef(() => OutletGetService))
    private readonly outletGetService: OutletGetService,
    private readonly coreMerchantOutletProxy: CoreMerchantOutletProxy,
    @Inject(forwardRef(() => MerchantService))
    private readonly merchantService: MerchantService
  ) {}

  async getMerchantAndOutletNamesForCoreSync(
    merchantId: string,
    outlet: Outlet
  ): Promise<{
    merchantMetadata: Merchant;
    merchantName: string;
    merchantNameAr: string;
    merchantLogo: string;
    outletName: string;
    outletNameAr: string;
  }> {
    const merchantMetadata = await this.merchantService.getMerchantById(merchantId);
    const merchantName = merchantMetadata?.name;
    const merchantNameAr = merchantMetadata?.nameAr ?? merchantName;
    const merchantLogo = merchantMetadata?.imageUrl;
    const outletName = outlet.name;
    const outletNameAr = outlet.nameAr ?? outletName;
    return { merchantMetadata, merchantName, merchantNameAr, merchantLogo, outletName, outletNameAr };
  }

  async syncPoiOutletToCore(outlet: Outlet, data: CreateOutletDto, token: Record<string, string>): Promise<void> {
    const { merchantMetadata, merchantName, merchantNameAr, merchantLogo, outletName, outletNameAr } =
      await this.getMerchantAndOutletNamesForCoreSync(data.merchantId, outlet);
    await this.updateCoreMerchantOutlet(
      merchantMetadata,
      data.merchantId,
      outlet.outletId,
      merchantName,
      outletName,
      merchantLogo,
      null,
      null,
      token,
      data?.outletAddress?.location,
      merchantNameAr,
      outletNameAr
    );
  }

  async syncCustomOutletToCore(outlet: Outlet, data: CreateCustomOutletDto, token: Record<string, string>): Promise<void> {
    const { merchantMetadata, merchantName, merchantNameAr, merchantLogo, outletName, outletNameAr } =
      await this.getMerchantAndOutletNamesForCoreSync(data.merchantId, outlet);
    await this.updateCoreMerchantOutlet(
      merchantMetadata,
      data.merchantId,
      outlet.outletId,
      merchantName,
      outletName,
      merchantLogo,
      'UAE',
      data.outletAddress?.cityId,
      token,
      data?.outletAddress?.location,
      merchantNameAr,
      outletNameAr
    );
  }

  async updateCoreMerchantOutlet(
    merchantMetadata: Merchant,
    merchantId: string,
    outletId: string,
    merchantName: string,
    outletName: string,
    merchantLogo: string,
    country: string | null,
    city: string | null,
    token: Record<string, string>,
    location: string,
    merchantNameAr?: string,
    outletNameAr?: string
  ): Promise<unknown> {
    let category = null;
    if (merchantMetadata?.filters?.[0]?.category) category = merchantMetadata?.filters[0]?.category;

    const area = await this.areaService.findById(city);

    const merchantNo = merchantMetadata['merchantNo'];
    const outlet = await this.outletGetService.getOutletNo(outletId);

    return await this.coreMerchantOutletProxy.updateOutletInCore(
      outletId,
      merchantId,
      merchantName,
      outletName,
      merchantLogo,
      category?.imageUrl,
      category?.dataValues?.id,
      category?.name,
      country,
      area?.dataValues['city'],
      merchantNo,
      outlet?.outletNo,
      token,
      location,
      merchantNameAr,
      outletNameAr
    );
  }
}
