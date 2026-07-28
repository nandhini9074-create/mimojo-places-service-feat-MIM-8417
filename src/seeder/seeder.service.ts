import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { EnvKeysEnum } from 'config/env.enum';
import { Merchant } from 'src/merchant/entities/merchant.model';
import { InjectModel } from '@nestjs/sequelize';
import { MerchantFilter, MerchantProfileMetadata } from './seeder-models';
import { Outlet } from 'src/outlet/models/outlet.model';
import { OutletProfileMappingService } from 'src/outlet/services/outlet-profile-mapping.service';
import { Profile } from 'src/outlet/models/profile.model';
import { MerchantProfileFilter } from 'src/merchant-profile-filters/entities/merchant-profile-filters.model';
import { Filter } from 'src/filters/models/filter.model';
import { OutletProfileMetadata } from 'src/outlet-profile/entities/outlet-profile.model';
import { OutletFilters } from 'src/outlet/models/outlet-filters.model';
import { Op, QueryTypes, Transaction } from 'sequelize';
import { OutletProfileFilters } from 'src/outlet-profile/entities/outlet-profile-filters';
import { OutletPhoto } from 'src/outlet/models/outlet-photo.model';
import { OutletProfilePhotos } from 'src/outlet-profile/entities/outlet-profile-photos';
import { MerchantProfileStatusEnum } from 'src/merchant-profile/enums/merchant-profile-status-enum';
import { OutletProfileStatusEnum } from 'src/outlet-profile/enums/outlet-profile-enum';
import { OutletStatusEnum } from 'src/outlet/enums/outlet-status-enum';
import { CustomPinoLogger } from 'src/logger/custom-logger.service';
import { Sequelize } from 'sequelize-typescript';
import { OutletProfileMapping } from 'src/outlet/models/outlet-profile-mapping.model';
import { MerchantPhoto } from 'src/merchant/entities/merchant-photo.model';
import { MerchantProfilePhoto } from 'src/merchant-profile/entities/merchant-profile-photo.entity';
import { MerchantStatusEnum } from 'src/merchant/enums/merchant-status.enum';
import { SeederImageService } from './services/seeder-image.service';
import { SeederNeighbourhoodService } from './services/seeder-neighbourhood.service';
import { SeederCategoryService } from './services/seeder-category.service';
import { SeederIdentityMigrationService } from './services/seeder-identity-migration.service';

@Injectable()
export class SeederService {
  constructor(
    private readonly outletProfileMappingService: OutletProfileMappingService,
    @InjectModel(Merchant) private readonly merchantModel: typeof Merchant,
    @InjectModel(MerchantFilter) private readonly merchantFilterModel: typeof MerchantFilter,
    @InjectModel(MerchantProfileMetadata) private readonly merchantProfileMetadata: typeof MerchantProfileMetadata,
    @InjectModel(Profile) private readonly ProfileModel: typeof Profile,
    @InjectModel(MerchantProfileFilter) private readonly merchantProfileFilterModel: typeof MerchantProfileFilter,
    @InjectModel(Filter) private readonly filterModel: typeof Filter,
    @InjectModel(OutletProfileMetadata) private readonly outletProfileMetadataModel: typeof OutletProfileMetadata,
    @InjectModel(Outlet) private readonly outletModel: typeof Outlet,
    @InjectModel(OutletFilters) private readonly outletFilterModel: typeof OutletFilters,
    @InjectModel(OutletProfileFilters) private readonly outletProfileFilterModel: typeof OutletProfileFilters,
    @InjectModel(OutletPhoto) private readonly outletPhotoModel: typeof OutletPhoto,
    @InjectModel(OutletProfilePhotos) private readonly outletProfilePhotos: typeof OutletProfilePhotos,
    private readonly logger: CustomPinoLogger,
    private readonly sequelize: Sequelize,
    private readonly seederImageService: SeederImageService,
    private readonly seederNeighbourhoodService: SeederNeighbourhoodService,
    private readonly seederCategoryService: SeederCategoryService,
    private readonly seederIdentityMigrationService: SeederIdentityMigrationService
  ) {}

  async createNeighbourhoodSeeder(): Promise<void> {
    await this.seederNeighbourhoodService.createNeighbourhoodSeeder();
  }

  async migrateOutletProfile(): Promise<void> {
    const outlets = await Outlet.findAll();
    for (const outlet of outlets) {
      await this.outletProfileMappingService.create({
        outletId: outlet.outletId,
        profileId: '217e7db1-2f3e-4efd-b5e4-32e06e32ac54',
        isActive: true,
        startDate: null,
        endDate: null,
        updatedBy: null,
      });
    }
  }

  async uploadImage(imagePath: string): Promise<{ filename: string; url: string; date: string }> {
    return this.seederImageService.uploadImage(imagePath);
  }

  async uploadAllImages(folderPath: string, fileName: string): Promise<void> {
    await this.seederImageService.uploadAllImages(folderPath, fileName);
  }

  async saveToExcel(data: { filename: string; url: string; date: string }[], fileName: string): Promise<void> {
    await this.seederImageService.saveToExcel(data, fileName);
  }

  async uploadReceiptTransaction(receiptUri: string): Promise<string> {
    return this.seederImageService.uploadReceiptTransaction(receiptUri);
  }

  async syncCategory(): Promise<{ updatedCount: number }> {
    return this.seederCategoryService.syncCategory();
  }

  async migrateMerchant(): Promise<{ totalInserted: number }> {
    return this.seederIdentityMigrationService.migrateMerchant();
  }

  async migrateMerchantFilters(): Promise<{ totalInserted: number }> {
    return this.seederIdentityMigrationService.migrateMerchantFilters();
  }

  async migrateMerchantConfigurations(): Promise<{ totalInserted: number }> {
    return this.seederIdentityMigrationService.migrateMerchantConfigurations();
  }

  async migrateGroups(): Promise<{ totalInserted: number }> {
    return this.seederIdentityMigrationService.migrateGroups();
  }

  async migrateCountries(): Promise<{ totalInserted: number }> {
    return this.seederIdentityMigrationService.migrateCountries();
  }

  // async migrateMerchantProfileMetaData() {
  //   try {
  //     const profiles = await this.ProfileModel.findAll({ attributes: ['id'] })
  //     const profileIds = profiles.map((profile) => profile.id);
  //     const limit = 500;
  //     let offset = 0;
  //     let totalInserted = 0;
  //     for (;;) {
  //       const allMerchants = await this.merchantModel.findAll({
  //         limit: limit,
  //         offset: offset
  //       });
  //       if (!allMerchants?.length) {
  //         break;
  //       }
  //       let merchantProfileMetadataArray = []
  //       this.formMerchantProfileData(profileIds, allMerchants, merchantProfileMetadataArray)
  //       await this.merchantProfileMetadata.bulkCreate(merchantProfileMetadataArray)
  //       totalInserted += allMerchants.length;
  //       offset += limit;
  //     }
  //     return { totalInserted }
  //   } catch (error) {
  //     this.logger.error('migrateMerchantProfileMetaData failed', { error })
  //     throw new HttpException('migrateMerchantProfileMetaData failed', HttpStatus.INTERNAL_SERVER_ERROR)

  //   }
  // }

  async migrateMerchantProfileMetaDataUpdate() {
    const limit = 100;
    let offset = 0;
    let totalProcessed = 0;

    // Start outer try–catch for safety
    try {
      const profiles = await this.ProfileModel.findAll({ attributes: ['id'] });
      const profileIds = profiles.map(p => p.id);

      for (;;) {
        // Use a transaction per batch
        const transaction: Transaction = await this.sequelize.transaction();
        try {
          // Fetch merchants in batches
          const allMerchants = await this.merchantModel.findAll({
            limit,
            offset,
            transaction,
          });
          if (!allMerchants?.length) {
            await transaction.rollback();
            break;
          }

          // if(offset === 1){
          //   break;
          // }

          const merchantIds = allMerchants.map(m => m.id);

          // Fetch existing rows for this batch
          const existingRows = await this.merchantProfileMetadata.findAll({
            where: {
              merchantId: { [Op.in]: merchantIds },
              profileId: { [Op.in]: profileIds },
            },
            attributes: ['merchantId', 'profileId', 'status'],
            raw: true,
            transaction,
          });

          const existingMetadataMap = new Map(existingRows.map(r => [`${r.merchantId}_${r.profileId}`, r]));

          // Generate all merchant-profile combinations
          const merchantProfileMetadataArray: Record<string, unknown>[] = [];
          this.formMerchantProfileData(profileIds, allMerchants, merchantProfileMetadataArray, existingMetadataMap);

          // Build a set of existing pairs for quick lookup
          const existingSet = new Set(existingRows.map(r => `${r.merchantId}_${r.profileId}`));

          // Split into inserts vs updates
          const toInsert = merchantProfileMetadataArray.filter(m => !existingSet.has(`${m.merchantId}_${m.profileId}`));
          const toUpdate = merchantProfileMetadataArray.filter(m => existingSet.has(`${m.merchantId}_${m.profileId}`));

          // Insert new rows
          if (toInsert.length) {
            await this.merchantProfileMetadata.bulkCreate(toInsert, { transaction });
          }

          // Update existing rows
          // if(toUpdate.length)
          // await this.bulkUpdateMerchantProfileMetadata(toUpdate, this.sequelize, transaction);
          for (const row of toUpdate) {
            await this.merchantProfileMetadata.update(row, {
              where: { merchantId: row.merchantId, profileId: row.profileId },
              transaction,
              returning: true,
            });
          }

          totalProcessed += allMerchants.length;
          offset += limit;
          await transaction.commit();
          this.logger.info(`Processed batch: offset=${offset}, merchants=${allMerchants.length}`);
        } catch (batchError) {
          await transaction.rollback();
          this.logger.error('Batch failed, rolled back', { error: batchError, offset });
          throw batchError;
        }
      }

      return { totalProcessed };
    } catch (error) {
      this.logger.error('migrateMerchantProfileMetaData failed', {
        error,
        limit,
        offset,
      });
      throw new HttpException('migrateMerchantProfileMetaData failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // private async bulkUpdateMerchantProfileMetadata(
  //   toUpdate: any[],
  //   sequelize: Sequelize,
  //   transaction?: any,
  // ) {
  //   if (!toUpdate.length) return;

  //   // 🔍 Dynamically fetch enum type for `status` column
  //   const [rows] = await sequelize.query<{ udt_name: string }>(
  //     `
  //     SELECT udt_name
  //     FROM information_schema.columns
  //     WHERE table_name = 'merchant_profile_metadata'
  //       AND column_name = 'status'
  //     `,
  //     { type: QueryTypes.SELECT }
  //   );

  //   const enumType = rows?.udt_name;
  //   if (!enumType) {
  //     throw new Error(`Could not resolve enum type for status column`);
  //   }

  //   // 🧱 Build VALUES clause using your object structure
  //   const values = toUpdate
  //   .map(row => `(
  //     '${row.merchantId}'::uuid,
  //     '${row.profileId}'::uuid,
  //     ${row.name ? `'${row.name.replace(/'/g, "''")}'` : 'NULL'},
  //     ${row.nameAr ? `'${row.nameAr.replace(/'/g, "''")}'` : 'NULL'},
  //     ${row.status ? `'${row.status}'::${enumType}` : `'PENDING'::${enumType}`},
  //     ${row.activeOutletsNum ?? 0},
  //     ${row.inActiveOutletsNum ?? 0},
  //     ${row.imageUrl ? `'${row.imageUrl.replace(/'/g, "''")}'` : 'NULL'},
  //     ${row.desc ? `'${row.desc.replace(/'/g, "''").replace(/\n/g, '\\n').replace(/\r/g, '\\r')}'` : 'NULL'},
  //     ${row.descAr ? `'${row.descAr.replace(/'/g, "''").replace(/\n/g, '\\n').replace(/\r/g, '\\r')}'` : 'NULL'},
  //     ${row.isShariah ? 'true' : 'false'},
  //     ${row.maxOfferValue !== null && row.maxOfferValue !== undefined ? row.maxOfferValue : 'NULL'}
  //   )`)
  //   .join(',\n');

  //   const rawQuery = `
  //     UPDATE merchant_profile_metadata AS t
  //     SET
  //       name = u.name,
  //       name_ar = u.name_ar,
  //       status = u.status,
  //       active_outlets_num = u.active_outlets_num,
  //       inactive_outlets_num = u.inactive_outlets_num,
  //       image_url = u.image_url,
  //       description = u.description,
  //       description_ar = u.description_ar,
  //       is_shariah = u.is_shariah,
  //       max_offer_value = u.max_offer_value,
  //       updated_at = NOW()
  //     FROM (
  //       VALUES
  //       ${values}
  //     ) AS u(
  //       merchant_id,
  //       profile_id,
  //       name,
  //       name_ar,
  //       status,
  //       active_outlets_num,
  //       inactive_outlets_num,
  //       image_url,
  //       description,
  //       description_ar,
  //       is_shariah,
  //       max_offer_value
  //     )
  //     WHERE t.merchant_id = u.merchant_id AND t.profile_id = u.profile_id;
  //   `;

  //   await sequelize.query(rawQuery, { transaction });
  // }

  async migrateMerchantProfileFilters() {
    try {
      const validFilterIds = await this.getValidFilterIds();
      const profileIds = await this.getProfileIds();
      const limit = 500;
      let offset = 0;
      let totalInserted = 0;
      let totalInvalidFilters = 0;
      for (;;) {
        const merchantFilters = await this.merchantFilterModel.findAll({
          limit: limit,
          offset: offset,
        });
        if (!merchantFilters?.length) break;
        let merchantProfileFilters = [];
        const merchantIds = [...new Set(merchantFilters.map(mf => mf.merchantId))];
        //To insert only the merchant filter that has
        merchantProfileFilters = await this.formMerchantProfileFilters(profileIds, merchantIds, merchantFilters);
        const invalidFilterCount = merchantProfileFilters.filter(mpf => !validFilterIds.has(mpf.filterId)).length;
        totalInvalidFilters += invalidFilterCount;
        merchantProfileFilters = merchantProfileFilters.filter(mpf => validFilterIds.has(mpf.filterId));

        if (merchantProfileFilters.length > 0) {
          await this.merchantProfileFilterModel.bulkCreate(merchantProfileFilters);
          totalInserted += merchantProfileFilters.length;
        }
        offset += limit;
      }
      return { totalInserted, totalInvalidFilters };
    } catch (error) {
      this.logger.error('migrateMerchantProfileFilters failed', { error });
      throw new HttpException('migrateMerchantProfileFilters failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async migrateMerchantProfileFiltersUpdate() {
    const transaction = await this.sequelize.transaction();
    try {
      const validFilterIds = await this.getValidFilterIds();
      const profileIds = await this.getProfileIds();

      const limit = 500;
      let offset = 0;
      let totalInserted = 0;
      let totalUpdated = 0;
      let totalInvalidFilters = 0;

      for (;;) {
        const merchantFilters = await this.merchantFilterModel.findAll({ limit, offset, raw: true });
        if (!merchantFilters.length) break;

        const merchantIds = [...new Set(merchantFilters.map(mf => mf.merchantId))];
        const mpByMerchant = await this.getMerchantProfileMap(merchantIds, profileIds);

        const { merchantProfileFilters, invalidCount } = this.buildProfileFilters(
          merchantFilters,
          validFilterIds,
          mpByMerchant
        );
        totalInvalidFilters += invalidCount;

        const { inserted, updated } = await this.syncProfileFilters(merchantProfileFilters, transaction);

        totalInserted += inserted;
        totalUpdated += updated;

        offset += limit;
      }

      await transaction.commit();
      return { totalInserted, totalUpdated, totalInvalidFilters };
    } catch (error) {
      await transaction.rollback();
      this.logger.error('migrateMerchantProfileFilters failed', { error });
      throw new HttpException('migrateMerchantProfileFilters failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private async getValidFilterIds(): Promise<Set<string>> {
    const validFilters = await this.filterModel.findAll({ attributes: ['filterId'], raw: true });
    return new Set(validFilters.map(f => f.filterId));
  }

  private async getProfileIds(): Promise<string[]> {
    const profiles = await this.ProfileModel.findAll({ attributes: ['id'], raw: true });
    return profiles.map(p => p.id);
  }

  private async getMerchantProfileMap(
    merchantIds: string[],
    profileIds: string[]
  ): Promise<Map<string, { id: string; profileId: string }[]>> {
    const mpRecords = await this.merchantProfileMetadata.findAll({
      where: { merchantId: { [Op.in]: merchantIds }, profileId: { [Op.in]: profileIds } },
      attributes: ['id', 'merchantId', 'profileId'],
      raw: true,
    });

    const mpByMerchant = new Map<string, { id: string; profileId: string }[]>();
    for (const rec of mpRecords) {
      if (!mpByMerchant.has(rec.merchantId)) mpByMerchant.set(rec.merchantId, []);
      mpByMerchant.get(rec.merchantId).push(rec);
    }
    return mpByMerchant;
  }

  private buildProfileFilters(
    merchantFilters: MerchantFilter[],
    validFilterIds: Set<string>,
    mpByMerchant: Map<string, { id: string; profileId: string }[]>
  ): { merchantProfileFilters: Record<string, unknown>[]; invalidCount: number } {
    const merchantProfileFilters: Record<string, unknown>[] = [];
    let invalidCount = 0;

    for (const mf of merchantFilters) {
      if (!validFilterIds.has(mf.filterId)) {
        invalidCount++;
        continue;
      }
      const merchantProfiles = mpByMerchant.get(mf.merchantId) ?? [];
      for (const mp of merchantProfiles) {
        merchantProfileFilters.push({
          merchantProfileMetadataId: mp.id,
          filterId: mf.filterId,
          included: mf.included,
          updatedBy: mf.updatedBy,
        });
      }
    }

    return { merchantProfileFilters, invalidCount };
  }

  private async syncProfileFilters(
    merchantProfileFilters: Record<string, unknown>[],
    transaction: Transaction
  ): Promise<{ inserted: number; updated: number }> {
    if (!merchantProfileFilters.length) return { inserted: 0, updated: 0 };

    const existingRows = await this.merchantProfileFilterModel.findAll({
      where: {
        merchantProfileMetadataId: { [Op.in]: merchantProfileFilters.map(f => f.merchantProfileMetadataId as string) },
        filterId: { [Op.in]: merchantProfileFilters.map(f => f.filterId as string) },
      },
      attributes: ['id', 'merchantProfileMetadataId', 'filterId'],
      raw: true,
      transaction,
    });

    const existingSet = new Set(existingRows.map(r => `${r.merchantProfileMetadataId}-${r.filterId}`));
    const toInsert = merchantProfileFilters.filter(f => !existingSet.has(`${f.merchantProfileMetadataId}-${f.filterId}`));
    const toUpdate = merchantProfileFilters.filter(f => existingSet.has(`${f.merchantProfileMetadataId}-${f.filterId}`));

    if (toInsert.length) await this.merchantProfileFilterModel.bulkCreate(toInsert, { transaction });

    if (toUpdate.length) {
      const updatePromises = toUpdate.map(row =>
        this.sequelize.query(
          `
          UPDATE merchant_profile_filters
          SET included = :included, updated_by = :updatedBy, updated_at = NOW()
          WHERE merchant_profile_metadata_id = :mpmId
            AND filter_id = :filterId
          `,
          {
            replacements: {
              included: row.included,
              updatedBy: row.updatedBy,
              mpmId: row.merchantProfileMetadataId,
              filterId: row.filterId,
            },
            transaction,
          }
        )
      );
      await Promise.all(updatePromises);
    }

    return { inserted: toInsert.length, updated: toUpdate.length };
  }

  // async migrateOutletProfileMetadata() {
  //   try {
  //     const validMerchants = await this.merchantModel.findAll({ attributes: ['id'] })
  //     const validMerchantIds = new Set(validMerchants.map(m => m.id));

  //     const profiles = await this.ProfileModel.findAll({ attributes: ['id'] });
  //     const profileIds = profiles.map((profile) => profile.id);
  //     const limit = 500;
  //     let offset = 0;
  //     let totalInserted = 0;
  //     let totalInvalidMerchants = 0
  //     for (;;) {
  //       const allOutlets = await this.outletModel.findAll({
  //         limit: limit,
  //         offset: offset
  //       })
  //       if (!allOutlets?.length) break;
  //       let outletProfileMetadataArray = []
  //       this.formOutletProfileMetadata(profileIds, allOutlets, outletProfileMetadataArray)
  //       const invalidMerchantCount = outletProfileMetadataArray.filter(of => !validMerchantIds.has(of.merchantId)).length;
  //       totalInvalidMerchants += invalidMerchantCount;
  //       outletProfileMetadataArray = outletProfileMetadataArray.filter(of =>
  //         validMerchantIds.has(of.merchantId)
  //       );
  //       await this.outletProfileMetadataModel.bulkCreate(outletProfileMetadataArray)
  //       totalInserted += outletProfileMetadataArray.length;
  //       offset += limit
  //     }
  //     return { totalInserted, totalInvalidMerchants }
  //   } catch (error) {

  //     this.logger.error('migrateOutletProfileMetadata failed', { error })
  //     throw new HttpException('migrateOutletProfileMetadata failed', HttpStatus.INTERNAL_SERVER_ERROR)
  //   }

  // }

  async migrateOutletProfileMetadataUpdate() {
    const limit = 1000;
    let offset = 0;
    let totalInserted = 0;
    let totalUpdated = 0;
    let totalInvalidMerchants = 0;

    const transaction = await this.sequelize.transaction();

    try {
      // Fetch all valid merchants once
      const validMerchants = await this.merchantModel.findAll({
        attributes: ['id'],
        transaction,
      });
      const validMerchantIds = new Set(validMerchants.map(m => m.id));

      // Fetch all profiles once
      const profiles = await this.ProfileModel.findAll({
        attributes: ['id'],
        transaction,
      });
      const profileIds = profiles.map(p => p.id);

      for (;;) {
        // Fetch outlets in batches
        const allOutlets = await this.outletModel.findAll({
          limit,
          offset,
          transaction,
        });
        if (!allOutlets.length) break;

        // Generate outlet-profile combinations

        const outletIds = allOutlets.map(o => o.outletId);

        // Fetch existing rows for this batch
        const existingRows = await this.outletProfileMetadataModel.findAll({
          where: {
            outletId: { [Op.in]: outletIds },
            profileId: { [Op.in]: profileIds },
          },
          attributes: ['outletId', 'profileId', 'status'],
          raw: true,
          transaction,
        });

        const existingMetadataMap = new Map(existingRows.map(r => [`${r.outletId}_${r.profileId}`, r]));

        let outletProfileMetadataArray: Record<string, unknown>[] = [];
        this.formOutletProfileMetadata(profileIds, allOutlets, outletProfileMetadataArray, existingMetadataMap);

        // Count and filter invalid merchants
        const invalidMerchantCount = outletProfileMetadataArray.filter(
          of => !validMerchantIds.has(of.merchantId as string)
        ).length;
        totalInvalidMerchants += invalidMerchantCount;

        outletProfileMetadataArray = outletProfileMetadataArray.filter(of => validMerchantIds.has(of.merchantId as string));

        if (!outletProfileMetadataArray.length) {
          offset += limit;
          continue;
        }

        const existingSet = new Set(existingRows.map(r => `${r.outletId}_${r.profileId}`));

        const toInsert = outletProfileMetadataArray.filter(o => !existingSet.has(`${o.outletId}_${o.profileId}`));
        const toUpdate = outletProfileMetadataArray.filter(o => existingSet.has(`${o.outletId}_${o.profileId}`));

        if (toInsert.length) {
          await this.outletProfileMetadataModel.bulkCreate(toInsert, { transaction });
          totalInserted += toInsert.length;
        }

        await this.bulkUpdateOutletProfileMetadata(toUpdate, this.sequelize, transaction);
        totalUpdated += toUpdate.length;

        offset += limit;

        console.log(
          `Processed batch: offset=${offset}, outlets=${allOutlets.length}, inserted=${toInsert.length}, updated=${toUpdate.length}`
        );
        this.logger.info(
          `Processed batch: offset=${offset}, outlets=${allOutlets.length}, inserted=${toInsert.length}, updated=${toUpdate.length}`
        );
      }

      await transaction.commit();

      return { totalInserted, totalUpdated, totalInvalidMerchants };
    } catch (error) {
      await transaction.rollback();
      console.log('migrateOutletProfileMetadata failed', error, offset, limit);
      this.logger.error('migrateOutletProfileMetadata failed', { error, offset, limit });
      throw new HttpException('migrateOutletProfileMetadata failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async migrateOutletProfileMapping() {
    const transaction = await this.sequelize.transaction();
    try {
      const mimojoMappedOutlets = await OutletProfileMapping.findAll({
        where: { profileId: process.env[EnvKeysEnum.MIMOJO_PROFILE_ID] },
        raw: true,
        transaction,
      });

      if (!mimojoMappedOutlets.length) {
        await transaction.commit();
        return;
      }

      const eibMappedOutlets = mimojoMappedOutlets.map(outlet => {
        const { ...rest } = outlet;
        return {
          ...rest,
          profileId: process.env[EnvKeysEnum.EIB_PROFILE_ID],
        };
      });

      await OutletProfileMapping.bulkCreate(eibMappedOutlets, {
        ignoreDuplicates: true,
        transaction,
      });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      this.logger.error('migrateOutletProfileMapping failed', { error });
      throw new HttpException('migrateOutletProfileMapping failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private async bulkUpdateOutletProfileMetadata(
    toUpdate: Record<string, unknown>[],
    sequelize: Sequelize,
    transaction?: Transaction
  ) {
    if (!toUpdate.length) return;

    // 🔍 Dynamically fetch enum type for `status` column
    const [rows] = await sequelize.query<{ udt_name: string }>(
      `
      SELECT udt_name
      FROM information_schema.columns
      WHERE table_name = 'outlet_profile_metadata'
        AND column_name = 'status'
      `,
      { type: QueryTypes.SELECT }
    );

    // rows is typed, so we can safely access
    const enumType = rows?.udt_name;
    if (!enumType) {
      throw new Error(`Could not resolve enum type for status column`);
    }

    // Build the VALUES clause
    const values = toUpdate
      .map(
        row => `(
        '${row.outletId}'::uuid,
        '${row.profileId}'::uuid,
        '${row.merchantId}'::uuid,
        '${(row.merchantName as string)?.replace(/'/g, "''") ?? ''}',
        '${(row.merchantNameAr as string)?.replace(/'/g, "''") ?? ''}',
        '${(row.name as string)?.replace(/'/g, "''") ?? ''}',
        '${(row.nameAr as string)?.replace(/'/g, "''") ?? ''}',
        ${row.status ? `'${row.status}'::${enumType}` : 'NULL'},
        '${(row.merchantLogoUrl as string)?.replace(/'/g, "''") ?? ''}',
        '${(row.description as string)?.replace(/'/g, "''") ?? ''}',
        '${(row.descriptionAr as string)?.replace(/'/g, "''") ?? ''}',
        ${row.maxOffer ?? 'NULL'}
      )`
      )
      .join(',\n');

    const rawQuery = `
      UPDATE outlet_profile_metadata AS t
      SET
        merchant_id = u.merchant_id,
        merchant_name = u.merchant_name,
        merchant_name_ar = u.merchant_name_ar,
        name = u.name,
        name_ar = u.name_ar,
        status = u.status,
        merchant_logo_url = u.merchant_logo_url,
        description = u.description,
        description_ar = u.description_ar,
        max_offer = u.max_offer,
        updated_at = NOW()
      FROM (
        VALUES
        ${values}
      ) AS u(
        outlet_id, profile_id, merchant_id, merchant_name, merchant_name_ar,
        name, name_ar, status, merchant_logo_url, description, description_ar,
        max_offer
      )
      WHERE t.outlet_id = u.outlet_id AND t.profile_id = u.profile_id;
    `;

    await sequelize.query(rawQuery, { transaction });
  }

  async migrateOutletProfileFilters() {
    try {
      const validFilterIds = await this.getValidFilterIds();
      const profileIds = await this.getProfileIds();
      const limit = 500;
      let offset = 0;
      let totalInserted = 0;
      let totalInvalidFilters = 0;
      for (;;) {
        const outletFilters = await this.outletFilterModel.findAll({
          limit: limit,
          offset: offset,
        });
        if (!outletFilters?.length) break;
        let outletProfileFilters = [];
        const outletIds = [...new Set(outletFilters.map(of => of.outletId))];
        outletProfileFilters = await this.formOutletProfileFilters(profileIds, outletIds, outletFilters);
        const invalidFilterCount = outletProfileFilters.filter(opf => !validFilterIds.has(opf.filterId)).length;
        totalInvalidFilters += invalidFilterCount;
        outletProfileFilters = outletProfileFilters.filter(opf => validFilterIds.has(opf.filterId));
        if (outletProfileFilters.length > 0) {
          await this.outletProfileFilterModel.bulkCreate(outletProfileFilters);
        }
        offset += limit;
        totalInserted += outletProfileFilters.length;
      }
      return { totalInserted, totalInvalidFilters };
    } catch (error) {
      this.logger.error('migrateOutletProfileFilters failed', { error });
      throw new HttpException('migrateOutletProfileFilters failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async migrateOutletProfileFiltersUpdate() {
    const transaction = await this.sequelize.transaction();
    try {
      const validFilterIds = await this.getValidFilterIds();
      const profileIds = await this.getProfileIds();

      const limit = 500;
      let offset = 0;
      let totalInserted = 0;
      let totalUpdated = 0;
      let totalInvalidFilters = 0;

      for (;;) {
        const outletFilters = await this.outletFilterModel.findAll({ limit, offset, raw: true });
        if (!outletFilters.length) break;

        const outletIds = [...new Set(outletFilters.map(of => of.outletId))];
        const opByOutlet = await this.getOutletProfileMap(outletIds, profileIds);

        const { outletProfileFilters, invalidCount } = this.buildOutletProfileFilters(
          outletFilters,
          validFilterIds,
          opByOutlet
        );
        totalInvalidFilters += invalidCount;

        const { inserted, updated } = await this.syncOutletProfileFilters(outletProfileFilters, transaction);

        totalInserted += inserted;
        totalUpdated += updated;

        offset += limit;
      }

      await transaction.commit();
      return { totalInserted, totalUpdated, totalInvalidFilters };
    } catch (error) {
      await transaction.rollback();
      this.logger.error('migrateOutletProfileFilters failed', { error });
      throw new HttpException('migrateOutletProfileFilters failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private async getOutletProfileMap(
    outletIds: string[],
    profileIds: string[]
  ): Promise<Map<string, { id: string; profileId: string }[]>> {
    const opRecords = await this.outletProfileMetadataModel.findAll({
      where: { outletId: { [Op.in]: outletIds }, profileId: { [Op.in]: profileIds } },
      attributes: ['id', 'outletId', 'profileId'],
      raw: true,
    });

    const opByOutlet = new Map<string, { id: string; profileId: string }[]>();
    for (const rec of opRecords) {
      if (!opByOutlet.has(rec.outletId)) opByOutlet.set(rec.outletId, []);
      opByOutlet.get(rec.outletId).push(rec);
    }
    return opByOutlet;
  }

  private buildOutletProfileFilters(
    outletFilters: OutletFilters[],
    validFilterIds: Set<string>,
    opByOutlet: Map<string, { id: string; profileId: string }[]>
  ): { outletProfileFilters: Record<string, unknown>[]; invalidCount: number } {
    const outletProfileFilters: Record<string, unknown>[] = [];
    let invalidCount = 0;

    for (const ofilter of outletFilters) {
      if (!validFilterIds.has(ofilter.filterId)) {
        invalidCount++;
        continue;
      }
      const outletProfiles = opByOutlet.get(ofilter.outletId) ?? [];
      for (const op of outletProfiles) {
        outletProfileFilters.push({
          outletProfileMetadataId: op.id,
          filterId: ofilter.filterId,
          included: ofilter.included,
          updatedBy: ofilter.updatedBy,
        });
      }
    }

    return { outletProfileFilters, invalidCount };
  }

  private async syncOutletProfileFilters(
    outletProfileFilters: Record<string, unknown>[],
    transaction: Transaction
  ): Promise<{ inserted: number; updated: number }> {
    if (!outletProfileFilters.length) return { inserted: 0, updated: 0 };

    const existingRows = await this.outletProfileFilterModel.findAll({
      where: {
        outletProfileMetadataId: { [Op.in]: outletProfileFilters.map(f => f.outletProfileMetadataId as string) },
        filterId: { [Op.in]: outletProfileFilters.map(f => f.filterId as string) },
      },
      attributes: ['id', 'outletProfileMetadataId', 'filterId'],
      raw: true,
      transaction,
    });

    const existingSet = new Set(existingRows.map(r => `${r.outletProfileMetadataId}-${r.filterId}`));
    const toInsert = outletProfileFilters.filter(f => !existingSet.has(`${f.outletProfileMetadataId}-${f.filterId}`));
    const toUpdate = outletProfileFilters.filter(f => existingSet.has(`${f.outletProfileMetadataId}-${f.filterId}`));

    if (toInsert.length) await this.outletProfileFilterModel.bulkCreate(toInsert, { transaction });

    if (toUpdate.length) {
      const updatePromises = toUpdate.map(row =>
        this.sequelize.query(
          `
          UPDATE outlet_profile_filters
          SET included = :included, updated_by = :updatedBy, updated_at = NOW()
          WHERE outlet_profile_metadata_id = :opmId
            AND filter_id = :filterId
          `,
          {
            replacements: {
              included: row.included,
              updatedBy: row.updatedBy,
              opmId: row.outletProfileMetadataId,
              filterId: row.filterId,
            },
            transaction,
          }
        )
      );
      await Promise.all(updatePromises);
    }

    return { inserted: toInsert.length, updated: toUpdate.length };
  }

  async migrateOutletProfilePhotos() {
    try {
      const profiles = await this.ProfileModel.findAll({ attributes: ['id'] });
      const profileIds = profiles.map(profile => profile.id);
      const limit = 500;
      let offset = 0;
      let totalInserted = 0;
      for (;;) {
        const outletPhotos = await this.outletPhotoModel.findAll({
          limit: limit,
          offset: offset,
        });
        if (!outletPhotos?.length) break;
        let outletProfilePhotos = [];
        const outletIds = [...new Set(outletPhotos.map(of => of.outletId))];
        outletProfilePhotos = await this.formOutletProfilePhotos(profileIds, outletIds, outletPhotos);
        if (outletProfilePhotos.length > 0) {
          await this.outletProfilePhotos.bulkCreate(outletProfilePhotos);
        }
        offset += limit;
        totalInserted += outletProfilePhotos.length;
      }
      return { totalInserted };
    } catch (error) {
      this.logger.error('migrateOutletProfilePhotos failed', { error });
      throw new HttpException('migrateOutletProfilePhotos failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async migrateOutletProfilePhotosUpdate() {
    const transaction = await this.sequelize.transaction();
    try {
      const profiles = await this.ProfileModel.findAll({ attributes: ['id'], raw: true });
      const profileIds = profiles.map(profile => profile.id);

      const limit = 500;
      let offset = 0;
      let totalInserted = 0;
      let totalUpdated = 0;

      for (;;) {
        const outletPhotos = await this.outletPhotoModel.findAll({
          limit,
          offset,
          raw: true,
        });

        if (!outletPhotos?.length) break;

        const outletIds = [...new Set(outletPhotos.map(of => of.outletId))];
        const outletProfilePhotos = await this.formOutletProfilePhotos(profileIds, outletIds, outletPhotos);

        if (outletProfilePhotos.length > 0) {
          // Check for existing records
          const existingRows = await this.outletProfilePhotos.findAll({
            where: {
              outletProfileMetadataId: { [Op.in]: outletProfilePhotos.map(p => p.outletProfileMetadataId as string) },
              cdnUrl: { [Op.in]: outletProfilePhotos.map(p => p.cdnUrl as string) },
            },
            attributes: ['id', 'outletProfileMetadataId', 'cdnUrl'],
            raw: true,
            transaction,
          });

          const existingSet = new Set(existingRows.map(r => `${r.outletProfileMetadataId}-${r.cdnUrl}`));

          const toInsert = outletProfilePhotos.filter(p => !existingSet.has(`${p.outletProfileMetadataId}-${p.cdnUrl}`));
          const toUpdate = outletProfilePhotos.filter(p => existingSet.has(`${p.outletProfileMetadataId}-${p.cdnUrl}`));

          if (toInsert.length) {
            await this.outletProfilePhotos.bulkCreate(toInsert, { transaction });
            totalInserted += toInsert.length;
          }

          if (toUpdate.length) {
            const updatePromises = toUpdate.map(row =>
              this.sequelize.query(
                `
                UPDATE outlet_profile_photos
                SET sort_order = :sortOrder,
                    height = :height,
                    width = :width,
                    is_active = :isActive,
                    is_default = :isDefault,
                    updated_at = NOW()
                WHERE outlet_profile_metadata_id = :opmId
                  AND cdn_url = :cdnUrl
                `,
                {
                  replacements: {
                    sortOrder: row.sortOrder,
                    height: row.height,
                    width: row.width,
                    isActive: row.isActive,
                    isDefault: row.isDefault,
                    opmId: row.outletProfileMetadataId,
                    cdnUrl: row.cdnUrl,
                  },
                  transaction,
                }
              )
            );

            await Promise.all(updatePromises);
            totalUpdated += toUpdate.length;
          }
        }

        offset += limit;
      }

      await transaction.commit();
      return { totalInserted, totalUpdated };
    } catch (error) {
      await transaction.rollback();
      this.logger.error('migrateOutletProfilePhotos failed', { error });
      throw new HttpException('migrateOutletProfilePhotos failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async migrateMerchantProfilePhotosUpdate() {
    const transaction = await this.sequelize.transaction();
    try {
      const profiles = await this.ProfileModel.findAll({ attributes: ['id'], raw: true });
      const profileIds = profiles.map(p => p.id);

      const limit = 500;
      let offset = 0;
      let totalInserted = 0;
      let totalUpdated = 0;

      for (;;) {
        const merchantPhotos = await MerchantPhoto.findAll({
          limit,
          offset,
          raw: true,
        });

        if (!merchantPhotos?.length) break;

        const merchantIds = [...new Set(merchantPhotos.map(mp => mp.merchantId))];
        const merchantProfilePhotos = await this.formMerchantProfilePhotos(profileIds, merchantIds, merchantPhotos);

        if (merchantProfilePhotos.length > 0) {
          // fetch existing
          const existingRows = await MerchantProfilePhoto.findAll({
            where: {
              merchantProfileMetadataId: {
                [Op.in]: merchantProfilePhotos.map(p => p.merchantProfileMetadataId as string),
              },
              cdnUrl: { [Op.in]: merchantProfilePhotos.map(p => p.cdnUrl as string) },
            },
            attributes: ['id', 'merchantProfileMetadataId', 'cdnUrl'],
            raw: true,
            transaction,
          });

          const existingSet = new Set(existingRows.map(r => `${r.merchantProfileMetadataId}-${r.cdnUrl}`));

          const toInsert = merchantProfilePhotos.filter(p => !existingSet.has(`${p.merchantProfileMetadataId}-${p.cdnUrl}`));
          const toUpdate = merchantProfilePhotos.filter(p => existingSet.has(`${p.merchantProfileMetadataId}-${p.cdnUrl}`));

          if (toInsert.length) {
            await MerchantProfilePhoto.bulkCreate(toInsert, { transaction });
            totalInserted += toInsert.length;
          }

          if (toUpdate.length) {
            const updatePromises = toUpdate.map(row =>
              this.sequelize.query(
                `
                UPDATE merchant_profile_photos
                SET sort_order = :sortOrder,
                    height = :height,
                    width = :width,
                    is_active = :isActive,
                    is_default = :isDefault
                WHERE merchant_profile_metadata_id = :mpmId
                  AND cdn_url = :cdnUrl
                `,
                {
                  replacements: {
                    sortOrder: row.sortOrder,
                    height: row.height,
                    width: row.width,
                    isActive: row.isActive,
                    isDefault: row.isDefault,
                    mpmId: row.merchantProfileMetadataId,
                    cdnUrl: row.cdnUrl,
                  },
                  transaction,
                }
              )
            );

            await Promise.all(updatePromises);
            totalUpdated += toUpdate.length;
          }
        }

        offset += limit;
      }

      await transaction.commit();
      return { totalInserted, totalUpdated };
    } catch (error) {
      await transaction.rollback();
      this.logger.error('migrateMerchantProfilePhotos failed', { error });
      throw new HttpException('migrateMerchantProfilePhotos failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private async formMerchantProfilePhotos(profileIds: string[], merchantIds: string[], merchantPhotos: MerchantPhoto[]) {
    const merchantProfilePhotos: Record<string, unknown>[] = [];

    const merchantProfileMetadataRecords = await MerchantProfileMetadata.findAll({
      where: {
        merchantId: { [Op.in]: merchantIds },
        profileId: { [Op.in]: profileIds },
      },
      attributes: ['id', 'merchantId', 'profileId'],
      raw: true,
    });

    const merchantProfileMetadataMap = new Map();
    for (const record of merchantProfileMetadataRecords) {
      merchantProfileMetadataMap.set(`${record.merchantId}-${record.profileId}`, record.id);
    }

    for (const profileId of profileIds) {
      for (const merchantPhoto of merchantPhotos) {
        const key = `${merchantPhoto.merchantId}-${profileId}`;
        const merchantProfileId = merchantProfileMetadataMap.get(key);
        if (merchantProfileId) {
          merchantProfilePhotos.push({
            cdnUrl: merchantPhoto.cdnUrl,
            sortOrder: merchantPhoto.sortOrder,
            height: merchantPhoto.height,
            width: merchantPhoto.width,
            isActive: merchantPhoto.isActive,
            isDefault: merchantPhoto.isDefault,
            merchantProfileMetadataId: merchantProfileId,
          });
        }
      }
    }

    return merchantProfilePhotos;
  }

  async migrateFilters(): Promise<{ totalInserted: number }> {
    return this.seederCategoryService.migrateFilters();
  }

  async migrateSubCategories(): Promise<{ totalInserted: number }> {
    return this.seederCategoryService.migrateSubCategories();
  }

  private async formOutletProfilePhotos(profileIds: string[], outletIds: string[], outletPhotos: OutletPhoto[]) {
    const outletProfilePhotos: Record<string, unknown>[] = [];

    const outletProfileMetadataRecords = await this.outletProfileMetadataModel.findAll({
      where: {
        outletId: { [Op.in]: outletIds },
        profileId: { [Op.in]: profileIds },
      },
      attributes: ['id', 'outletId', 'profileId'],
      raw: true,
    });

    const outletProfileMetadataMap = new Map();
    for (const record of outletProfileMetadataRecords) {
      outletProfileMetadataMap.set(`${record.outletId}-${record.profileId}`, record.id);
    }

    for (const profileId of profileIds) {
      for (const outletPhoto of outletPhotos) {
        const key = `${outletPhoto.outletId}-${profileId}`;
        const outletProfileId = outletProfileMetadataMap.get(key);
        if (outletProfileId) {
          outletProfilePhotos.push({
            cdnUrl: outletPhoto.cdnUrl,
            sortOrder: outletPhoto.sortOrder,
            height: outletPhoto.height,
            width: outletPhoto.width,
            isActive: outletPhoto.isActive,
            isDefault: outletPhoto.isDefault,
            outletProfileMetadataId: outletProfileId,
          });
        }
      }
    }

    return outletProfilePhotos;
  }

  private async formOutletProfileFilters(profileIds: string[], outletIds: string[], outletFilters: OutletFilters[]) {
    let outletProfileFilters = [];
    const outletProfileMetadataRecords = await this.outletProfileMetadataModel.findAll({
      where: {
        outletId: { [Op.in]: outletIds },
        profileId: { [Op.in]: profileIds },
      },
      attributes: ['id', 'outletId', 'profileId'],
    });
    const outletProfileMetadataMap = new Map();
    for (const record of outletProfileMetadataRecords) {
      outletProfileMetadataMap.set(`${record.outletId}-${record.profileId}`, record.id);
    }
    for (const profileId of profileIds) {
      for (const outletFilter of outletFilters) {
        const key = `${outletFilter.outletId}-${profileId}`;
        const outletProfileId = outletProfileMetadataMap.get(key);
        if (outletProfileId) {
          let outletProfileFilter = {
            outletProfileMetadataId: outletProfileId,
            isCustomized: outletFilter.isCustomized,
            filterId: outletFilter.filterId,
            included: outletFilter.included,
            updatedBy: outletFilter.updatedBy,
          };
          outletProfileFilters.push(outletProfileFilter);
        }
      }
    }
    return outletProfileFilters;
  }
  private async formMerchantProfileFilters(profileIds, merchantIds, merchantFilters) {
    let merchantProfileFilters = [];
    const merchantProfileMetadataRecords = await this.merchantProfileMetadata.findAll({
      where: {
        merchantId: { [Op.in]: merchantIds },
        profileId: { [Op.in]: profileIds },
      },
      attributes: ['id', 'merchantId', 'profileId'],
    });
    const merchantProfileMetadataMap = new Map();
    for (const record of merchantProfileMetadataRecords) {
      merchantProfileMetadataMap.set(`${record.merchantId}-${record.profileId}`, record.id);
    }
    for (const profileId of profileIds) {
      for (const merchantFilter of merchantFilters) {
        const key = `${merchantFilter.merchantId}-${profileId}`;
        const merchantProfileMetadataId = merchantProfileMetadataMap.get(key);
        if (merchantProfileMetadataId) {
          let merchantProfileFilter = {
            merchantProfileMetadataId: merchantProfileMetadataId,
            filterId: merchantFilter.filterId,
            included: merchantFilter.included,
            updatedBy: merchantFilter.updatedBy,
          };
          merchantProfileFilters.push(merchantProfileFilter);
        }
      }
    }
    return merchantProfileFilters;
  }
  // private formMerchantProfileData(profileIds: string[], allMerchants: any[], merchantProfileMetadataArray: any[]) {
  //   for (const profileId of profileIds) {
  //     for (const merchant of allMerchants) {
  //       const merchantProfileMetadata = {
  //         merchantId: merchant.id,
  //         profileId: profileId,
  //         name: merchant.name,
  //         nameAr: merchant.nameAr,
  //         maxOfferValue: merchant.maxOfferValue,
  //         status: merchant.status != MerchantProfileStatusEnum.ACTIVE ? MerchantProfileStatusEnum.PENDING : merchant.status,
  //         activeOutletsNum: merchant.activeOutletsNum,
  //         inActiveOutletsNum: merchant.inActiveOutletsNum,
  //         imageUrl: merchant.imageUrl,
  //         desc: merchant.desc,
  //         descAr: merchant.descAr,
  //         isShariah: false
  //       }
  //       merchantProfileMetadataArray.push(merchantProfileMetadata)
  //     }
  //   }
  // }

  private mapOutletStatusToProfileStatus(outletStatus: OutletStatusEnum): OutletProfileStatusEnum {
    switch (outletStatus) {
      case OutletStatusEnum.Pending:
        return OutletProfileStatusEnum.Pending;
      case OutletStatusEnum.Ready:
        return OutletProfileStatusEnum.Ready;
      case OutletStatusEnum.Active:
        return OutletProfileStatusEnum.Active;
      default:
        return OutletProfileStatusEnum.Pending;
    }
  }

  private mapMerchantStatusToProfileStatus(merchantStatus: MerchantStatusEnum): MerchantProfileStatusEnum {
    switch (merchantStatus) {
      case MerchantStatusEnum.ACTIVE:
        return MerchantProfileStatusEnum.ACTIVE;
      default:
        return MerchantProfileStatusEnum.PENDING;
    }
  }

  private async formOutletProfileMetadata(
    profileIds: string[],
    allOutlets: Outlet[],
    outletProfileMetadataArray: Record<string, unknown>[],
    existingMetadataMap: Map<string, OutletProfileMetadata>
  ) {
    for (const profileId of profileIds) {
      for (const outlet of allOutlets) {
        const key = `${outlet.outletId}_${profileId}`;
        let status: OutletProfileStatusEnum;
        const existing = existingMetadataMap.get(key);
        // const isShariah = existing?.isShariah ?? false;

        if (
          profileId === process.env[EnvKeysEnum.MIMOJO_PROFILE_ID] ||
          profileId === process.env[EnvKeysEnum.EIB_PROFILE_ID]
        ) {
          status = this.mapOutletStatusToProfileStatus(outlet.status);
        } else {
          status = existing?.status ?? OutletProfileStatusEnum.Pending;
        }

        const outletProfileMetadata = {
          merchantId: outlet.merchantId,
          outletId: outlet.outletId,
          profileId: profileId,
          merchantName: outlet.merchantName,
          merchantNameAr: outlet.merchantName,
          name: outlet.name,
          nameAr: outlet.nameAr,
          status,
          description: outlet.description,
          descriptionAr: outlet.descriptionAr,
          merchantLogoUrl: outlet.merchantLogoUrl,
          maxOffer: outlet.maxOffer,
          hasCustomOffer: outlet.hasCustomOffer,
          // isShariah,
        };

        outletProfileMetadataArray.push(outletProfileMetadata);
      }
    }
    return outletProfileMetadataArray;
  }

  private formMerchantProfileData(
    profileIds: string[],
    allMerchants: Merchant[],
    merchantProfileMetadataArray: Record<string, unknown>[],
    existingMetadataMap: Map<string, MerchantProfileMetadata>
  ) {
    for (const profileId of profileIds) {
      for (const merchant of allMerchants) {
        const key = `${merchant.id}_${profileId}`;
        let status: MerchantProfileStatusEnum;
        const existing = existingMetadataMap.get(key);
        // const isShariah = existing?.isShariah ?? false;

        if (
          profileId === process.env[EnvKeysEnum.MIMOJO_PROFILE_ID] ||
          profileId === process.env[EnvKeysEnum.EIB_PROFILE_ID]
        ) {
          status = this.mapMerchantStatusToProfileStatus(merchant.status);
        } else {
          status = existing?.status ?? MerchantProfileStatusEnum.PENDING;
        }

        const merchantProfileMetadata = {
          merchantId: merchant.id,
          profileId: profileId,
          name: merchant.name,
          nameAr: merchant.nameAr,
          maxOfferValue: merchant.maxOfferValue,
          status,
          activeOutletsNum: merchant.activeOutletsNum,
          inActiveOutletsNum: merchant.inActiveOutletsNum,
          imageUrl: merchant.imageUrl,
          desc: merchant.desc,
          descAr: merchant.descAr,
          // isShariah
        };
        merchantProfileMetadataArray.push(merchantProfileMetadata);
      }
    }
  }

  async updateHasCustomOffer() {
    const transaction = await this.sequelize.transaction();
    try {
      await this.sequelize.query(
        `
        UPDATE outlet_profile_metadata opm
        SET has_custom_offer = o.has_custom_offer, updated_at = NOW()
        FROM outlets o
        WHERE opm.outlet_id = o.outlet_id
          AND opm.profile_id IN (:profileIds)
        `,
        {
          replacements: {
            profileIds: [process.env[EnvKeysEnum.MIMOJO_PROFILE_ID], process.env[EnvKeysEnum.EIB_PROFILE_ID]],
          },
          transaction,
        }
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      console.error('OutletService.updateHasCustomOffer - exception', error);
      throw error;
    }
  }
}
