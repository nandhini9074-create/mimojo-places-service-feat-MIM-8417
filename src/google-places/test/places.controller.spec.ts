import { Test, TestingModule } from '@nestjs/testing';
import { Response } from 'express';
import { GooglePlacesDto } from '../dtos/google-places-dto';
import { GooglePlacesController } from '../places.controller';
import { GooglePlacesService } from '../services/google-places.service';

describe('GooglePlacesController', () => {
    let controller: GooglePlacesController;
    let service: GooglePlacesService;

    const mockGooglePlacesService = {
        getPlaces: jest.fn(),
        getPlacesFormatted: jest.fn(),
        getPlacesActualPhotoUrl: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [GooglePlacesController],
            providers: [
                {
                    provide: GooglePlacesService,
                    useValue: mockGooglePlacesService,
                },
            ],
        }).compile();

        controller = module.get<GooglePlacesController>(GooglePlacesController);
        service = module.get<GooglePlacesService>(GooglePlacesService);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('GetPlaceDetails', () => {
        it('should return place details from the service', async () => {
            const dto: GooglePlacesDto = { placeId: '12345', searchPhrase: 'cafe' };
            const mockResponse = { name: 'Test Cafe', rating: 4.5 };

            mockGooglePlacesService.getPlaces.mockResolvedValue(mockResponse);

            const result = await controller.GetPlaceDetails(dto);
            expect(result).toEqual(mockResponse);
            expect(service.getPlaces).toHaveBeenCalledWith(dto.placeId, dto.searchPhrase);
        });
    });

    describe('GetPlacesByTextSearch', () => {
        it('should return places formatted from the service', async () => {
            const query = 'coffee shop';
            const mockResponse = [{ name: 'Starbucks' }, { name: 'Local Coffee' }];

            mockGooglePlacesService.getPlacesFormatted.mockResolvedValue(mockResponse);

            const result = await controller.GetPlacesByTextSearch(query);
            expect(result).toEqual(mockResponse);
            expect(service.getPlacesFormatted).toHaveBeenCalledWith(query);
        });
    });

    describe('GetPlacesActualUrl', () => {
        it('should call getPlacesActualPhotoUrl and pipe response', async () => {
            const query = 'photo-reference';
            const mockStream = { data: { pipe: jest.fn() } };
            const mockRes = {
                set: jest.fn(),
                status: jest.fn().mockReturnThis(),
                send: jest.fn(),
                pipe: jest.fn(),
            } as any;

            mockGooglePlacesService.getPlacesActualPhotoUrl.mockResolvedValue(mockStream);
            await controller.GetPlacesActualUrl(query, mockRes);
            expect(service.getPlacesActualPhotoUrl).toHaveBeenCalledWith(query);
            expect(mockStream.data.pipe).toHaveBeenCalledWith(mockRes);
        });
    });

});
