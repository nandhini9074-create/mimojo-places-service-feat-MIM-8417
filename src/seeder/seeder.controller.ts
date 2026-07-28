import { Body, Controller, Post } from '@nestjs/common';
import { baseResponseHelper } from 'src/helpers/base-response.helper';
import { SeederService } from './seeder.service';
import { ApiExcludeController } from '@nestjs/swagger';

@ApiExcludeController()
@Controller({ version: '1', path: 'seeder' })
export class SeederController {
  constructor(private readonly seederService: SeederService) {}

  @Post('neighbourhood')
  async seedAllData() {
    await this.seederService.createNeighbourhoodSeeder();
    return baseResponseHelper({});
  }

  @Post('migrate-outlet-profile')
  async migrateProfile() {
    await this.seederService.migrateOutletProfile();
    return baseResponseHelper({});
  }

  @Post('cloudflare-image-upload')
  async imageUpload(@Body('folderPath') folderPath: string, @Body('fileName') fileName: string) {
    const res = await this.seederService.uploadAllImages(folderPath, fileName);
    return baseResponseHelper(res);
  }
  @Post('sync-categories')
  async syncCategory(){
    await this.seederService.syncCategory()
  }
  @Post('migrate-merchant')
  async migrateMerchant(){
  const res =   await this.seederService.migrateMerchant()
  return baseResponseHelper(res)
  }
  @Post('migrate-merchant-filter')
  async migrateMerchantFilter(){
   const response = await this.seederService.migrateMerchantFilters()
   return baseResponseHelper(response)
  }
  @Post('migrate-merchant-configuration')
  async migrateMerchantConfiguration(){
  const res =  await this.seederService.migrateMerchantConfigurations();
  return baseResponseHelper(res)
  }
  @Post('migrate-groups')
  async migrateGroups(){
    const res  = await this.seederService.migrateGroups()
    return baseResponseHelper(res)
  }
  @Post('migrate-countries')
  async migrateCountries(){
    const res = await this.seederService.migrateCountries()
    return baseResponseHelper(res)
  }
  @Post('migrate-merchant-profile-metadatas')
  async migrateMerchantProfileMetdata(){
    const res = await this.seederService.migrateMerchantProfileMetaDataUpdate()
    return baseResponseHelper(res)
  }
  @Post('migrate-merchant-profile-filters')
  async migrateMerchantProfileFilters(){
    const res = await this.seederService.migrateMerchantProfileFiltersUpdate()
    return baseResponseHelper(res)
  }

  @Post('migrate-oultet-profile-metadata')
  async migrateOutletProfileMetadata(){
    const res = await this.seederService.migrateOutletProfileMetadataUpdate()
    return baseResponseHelper(res)
  }

  @Post('migrate-oultet-profile-mapping')
  async migrateOutletProfileMapping(){
    const res = await this.seederService.migrateOutletProfileMapping()
    return baseResponseHelper(res)
  }
  @Post('migrate-outlet-profile-filters')
  async migrateOutletProfileFilters(){
    const res = await this.seederService.migrateOutletProfileFiltersUpdate()
    return baseResponseHelper(res)
  }
  @Post('migrate-outlet-profile-photos')
  async migrateOutletProfilePhotos() {
    const res = await this.seederService.migrateOutletProfilePhotosUpdate()
    return baseResponseHelper(res)
  }

  //no need for prod
  @Post('migrate-merchant-profile-photos')
  async migrateMerchantProfilePhotos() {
  const res = await this.seederService.migrateMerchantProfilePhotosUpdate();
  return baseResponseHelper(res)
  }

  @Post('migrate-sub-categories')
  async migrateSubCategories() {
    const res = await this.seederService.migrateSubCategories()
    return baseResponseHelper(res)
  }

  @Post('migrate-filters')
  async migrateFilters() {
    const res = await this.seederService.migrateFilters()
    return baseResponseHelper(res)
  }

  @Post('update-has-custom-offer')
  async updateHasCustomOffer(){
    const res = await this.seederService.updateHasCustomOffer();
    return baseResponseHelper(res)
  }
}
