import { getModelToken } from '@nestjs/sequelize';
import { TestingModule, Test } from '@nestjs/testing';
import { Transaction } from 'sequelize';
import { CreateOutletAddressDto } from 'src/outlet/dtos/create-outlet-address-dto';
import { OutletAddressService } from '../outlet-address.service';
import { OutletAddress } from 'src/outlet/models/outlet-address.model';
import { CustomPinoLogger } from 'src/logger/custom-logger.service';

describe('OutletAddressService', () => {
  let service: OutletAddressService;
  let outletAddressModel: any;
  let transactionMock: Transaction;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OutletAddressService,
        {
          provide: getModelToken(OutletAddress),
          useValue: {
            create: jest.fn(),
            update: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: CustomPinoLogger,
          useValue: { info: jest.fn(), error: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<OutletAddressService>(OutletAddressService);
    outletAddressModel = module.get<typeof OutletAddress>(getModelToken(OutletAddress));
    transactionMock = {} as Transaction;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('insert', () => {
    it('should insert a new address', async () => {
      const outlet_id = 'test-outlet-id';
      const addressDto: CreateOutletAddressDto = {
        googlePlaceId: 'googlePlaceId',
        mapUrl: 'mapUrl',
        latitude: 12.3456,
        longitude: 78.91011,
        formattedAddress: 'Test Address',
        formattedAddressAr: 'عنوان الاختبار',
        cityId: 'city-id',
        neighbourhoodId: 'neighbourhood-id',
        location: 'Test Location',
        locationAr: 'موقع الاختبار',
      };
      const userId = 'test-user-id';

      const updateInactiveSpy = jest.spyOn(service, 'update_inactive').mockResolvedValue(undefined);

      const createdAddress = {
        ...addressDto,
        outletId: outlet_id,
        isActive: true,
        updatedBy: userId,
      };
      jest.spyOn(outletAddressModel, 'create').mockResolvedValue(createdAddress as any);

      const result = await service.insert(outlet_id, addressDto, transactionMock, userId);

      expect(result).toEqual(createdAddress);
      expect(updateInactiveSpy).toHaveBeenCalledWith(outlet_id, transactionMock, userId);
      expect(outletAddressModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          outletId: outlet_id,
          googlePlaceId: addressDto.googlePlaceId,
          mapUrl: addressDto.mapUrl,
          latitude: addressDto.latitude,
          longitude: addressDto.longitude,
          formattedAddress: addressDto.formattedAddress,
          formattedAddressAr: addressDto.formattedAddressAr,
          areaId: addressDto.cityId,
          neighbourhoodId: addressDto.neighbourhoodId,
          location: addressDto.location,
          locationAr: addressDto.locationAr,
          isActive: true,
          updatedBy: userId,
        }),
        { transaction: transactionMock }
      );
    });
  });

  describe('cloneAddress', () => {
    it('should clone address from existing outlet and insert new active address', async () => {
      const outlet_id = 'new-outlet-id';
      const existingOutletId = 'existing-outlet-id';
      const userId = 'test-user-id';

      const existingAddress = {
        googlePlaceId: 'googlePlaceId',
        mapUrl: 'mapUrl',
        latitude: 12.3456,
        longitude: 78.91011,
        formattedAddress: 'Test Address',
        formattedAddressAr: null, // to test fallback
        areaId: 'area-id',
        neighbourhoodId: 'neighbourhood-id',
        location: 'Test Location',
        locationAr: null, // to test fallback
        isActive: true,
      };

      const createdAddress = {
        ...existingAddress,
        latitude: null,
        longitude: null,
        outletId: outlet_id,
        formattedAddress: null,
        formattedAddressAr: null,
        locationAr: 'Test Location copy (1)',
        location: 'Test Location copy (1)',
        isActive: true,
        updatedBy: userId,
      };

      const updateInactiveSpy = jest.spyOn(service, 'update_inactive').mockResolvedValue(undefined);

      jest.spyOn(outletAddressModel, 'findOne').mockResolvedValue(existingAddress as any);
      jest.spyOn(outletAddressModel, 'create').mockResolvedValue(createdAddress as any);

      const result = await service.cloneAddress(outlet_id, transactionMock, userId, existingOutletId);

      expect(updateInactiveSpy).toHaveBeenCalledWith(outlet_id, transactionMock, userId);

      expect(outletAddressModel.findOne).toHaveBeenCalledWith({
        where: { outletId: existingOutletId, isActive: true },
        raw: true,
      });

      expect(outletAddressModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          outletId: outlet_id,
          googlePlaceId: existingAddress.googlePlaceId,
          mapUrl: existingAddress.mapUrl,
          latitude: null,
          longitude: null,
          formattedAddress: null,
          formattedAddressAr: null,
          areaId: existingAddress.areaId,
          neighbourhoodId: existingAddress.neighbourhoodId,
          location: 'Test Location copy (1)',
          locationAr: 'Test Location copy (1)',
          isActive: true,
          updatedBy: userId,
        }),
        { transaction: transactionMock }
      );

      expect(result).toEqual(createdAddress);
    });

    it('should use copy (2) when cloning from address that already has " copy (1)"', async () => {
      const outlet_id = 'new-outlet-id';
      const existingOutletId = 'existing-outlet-id';
      const userId = 'test-user-id';

      const existingAddress = {
        googlePlaceId: null,
        mapUrl: null,
        latitude: null,
        longitude: null,
        formattedAddress: null,
        formattedAddressAr: null,
        areaId: 'area-id',
        neighbourhoodId: 'neighbourhood-id',
        location: 'Riyadh Branch copy (1)',
        locationAr: 'فرع الرياض copy (1)',
        isActive: true,
      };

      const updateInactiveSpy = jest.spyOn(service, 'update_inactive').mockResolvedValue(undefined);
      jest.spyOn(outletAddressModel, 'findOne').mockResolvedValue(existingAddress as any);
      jest.spyOn(outletAddressModel, 'create').mockImplementation((args: any) => Promise.resolve({ ...args } as any));

      await service.cloneAddress(outlet_id, transactionMock, userId, existingOutletId);

      expect(outletAddressModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          location: 'Riyadh Branch copy (2)',
          locationAr: 'فرع الرياض copy (2)',
        }),
        { transaction: transactionMock }
      );
    });
  });

  describe('update_inactive', () => {
    it('should update inactive status for a given outlet', async () => {
      const outlet_id = 'test-outlet-id';
      const userId = 'test-user-id';
      const updatedAddress = { outletId: outlet_id, isActive: false, updatedBy: userId };

      jest
        .spyOn(outletAddressModel, 'update')
        .mockResolvedValue([1, [{ outletId: outlet_id, isActive: false, updatedBy: userId }]]);
      const result = await service.update_inactive(outlet_id, transactionMock, userId);

      expect(result).toEqual(updatedAddress);
      expect(outletAddressModel.update).toHaveBeenCalledWith(
        { isActive: false, updatedBy: userId },
        {
          where: { outletId: outlet_id },
          returning: true,
          transaction: transactionMock,
        }
      );
    });
  });

  describe('find', () => {
    it('should find an active outlet address', async () => {
      const outlet_id = 'test-outlet-id';
      const mockAddress = {
        outletId: outlet_id,
        isActive: true,
        googlePlaceId: 'googlePlaceId',
        formattedAddress: 'Test Address',
      };

      jest.spyOn(outletAddressModel, 'findOne').mockResolvedValue(mockAddress as any);

      const result = await service.find(outlet_id);

      expect(result).toEqual(mockAddress);
      expect(outletAddressModel.findOne).toHaveBeenCalledWith({
        where: { outletId: outlet_id, isActive: true },
        include: expect.any(Array),
      });
    });
  });

  describe('getOutletLocation', () => {
    it('should return active outlet location only', async () => {
      const outletId = 'o1';
      const location = { location: 'Loc', outletId: 'o1' };
      jest.spyOn(outletAddressModel, 'findOne').mockResolvedValue(location as any);
      const result = await service.getOutletLocation(outletId);
      expect(result).toEqual(location);
      expect(outletAddressModel.findOne).toHaveBeenCalledWith({
        where: { outletId: 'o1', isActive: true },
        attributes: ['location', 'outletId'],
      });
    });
  });
});
