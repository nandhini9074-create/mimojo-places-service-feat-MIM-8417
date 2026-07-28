import { ConfigService } from '@nestjs/config';
import { TestingModule, Test } from '@nestjs/testing';
import axios from 'axios';
import { GooglePlacesService } from '../google-places.service';
import { CustomPinoLogger } from 'src/logger/custom-logger.service';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('GooglePlacesService', () => {
  let service: GooglePlacesService;
  let mockLogger: any;
  beforeEach(async () => {
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GooglePlacesService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue({
              GOOGLE_API_KEY: 'test-key',
              GOOGLE_PLACES_FIELDS: 'place_id,name,formatted_address',
            }),
          },
        },
        {
          provide: CustomPinoLogger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<GooglePlacesService>(GooglePlacesService);
  });

  it('should fetch place details and extract photo references', async () => {
    const mockResponse = {
      data: {
        result: {
          place_id: '123',
          name: 'Test Place',
          photos: [{ photo_reference: 'photo1' }, { photo_reference: 'photo2' }],
          current_opening_hours: {
            weekday_text: ['Monday: 9:00 AM – 5:00 PM'],
          },
          formatted_phone_number: '123-456-7890',
          wheelchair_accessible_entrance: true,
          website: 'https://example.com',
        },
      },
    };

    const mockArabicResponse = {
      data: {
        result: {
          website: 'https://example-ar.com',
          current_opening_hours: {
            weekday_text: ['الاثنين: 9:00 ص – 5:00 م'],
          },
        },
      },
    };

    const mockMatchedPlace = {
      formatted_address: '123 Arabic Street',
      name: 'اختبار المكان',
    };

    jest.spyOn(service, 'getPlacesByTextSearch').mockResolvedValueOnce([mockMatchedPlace] as any);
    jest.spyOn(axios, 'get').mockResolvedValueOnce(mockResponse).mockResolvedValueOnce(mockArabicResponse);

    const result = await service.getPlaces('123', 'Test Place');

    expect(result.data).toBeDefined();
    expect(result.data.photos).toEqual(['photo1', 'photo2']);
    expect(result.data.outletTiming.weekdayText).toBeDefined();
    expect(result.data.outletTiming.weekdayTextAr).toBeDefined();
    expect(result.data.formattedPhoneNumber).toBe('123-456-7890');
    expect(result.data.wheelchairAccessibleEntrance).toBe(true);
    expect(result.data.website).toBe('https://example.com');
    expect(result.data.websiteAr).toBe('https://example-ar.com');
  });

  it('should fetch city name from coordinates', async () => {
    const mockResponse = {
      data: {
        results: [
          {
            address_components: [
              { long_name: 'New York', types: ['locality'] },
              { long_name: 'USA', types: ['country'] },
            ],
          },
        ],
      },
    };
    mockedAxios.get.mockResolvedValueOnce(mockResponse);

    const result = await service.getCityNameFromCoordinates(40.7128, -74.006);
    expect(result).toContain('New York');
  });

  it('should return undefined if no city is found', async () => {
    const mockResponse = { data: { results: [] } };
    mockedAxios.get.mockResolvedValue(mockResponse);

    const result = await service.getCityNameFromCoordinates(0, 0);
    expect(result).toBeUndefined();
  });

  it('should return Google review details', async () => {
    const mockResponse = { data: { result: { rating: 4.5, reviews: [] } } };
    mockedAxios.get.mockResolvedValueOnce(mockResponse);

    const result = (await service.getGoogleReview('123')) as any;
    expect(result.rating).toBe(4.5);
  });
  it('should fetch places by text search', async () => {
    const mockResponse = {
      data: {
        results: [{ place_id: '123', name: 'Test Place' }],
        next_page_token: 'nextPage123',
      },
    };
    const mockNextPageResponse = {
      data: {
        results: [{ place_id: '456', name: 'Another Place' }],
      },
    };

    mockedAxios.get.mockResolvedValueOnce(mockResponse).mockResolvedValueOnce(mockNextPageResponse);

    const result = await service.getPlacesByTextSearch('test place');

    expect(result).toHaveLength(2);
    expect(result[0].place_id).toBe('123');
    expect(result[1].place_id).toBe('456');
  });

  it('should correctly format weekday text (convertWeekdayText2)', () => {
    const input = ['Monday: 9:00 AM – 5:00 PM', 'Tuesday: Open 24 hours', 'Wednesday: 10:00 AM – 6:00 PM'];

    const expectedOutput = [
      { day: 'Monday', time: '9:00 AM – 5:00 PM' },
      { day: 'Tuesday', time: 'Open 24 hours' },
      { day: 'Wednesday', time: '10:00 AM – 6:00 PM' },
    ];

    const result = (service as any).convertWeekdayText2(input);

    expect(result).toEqual(expectedOutput);
  });

  it('should return empty array when convertWeekdayText2 receives invalid input', () => {
    const result = (service as any).convertWeekdayText2(undefined);
    expect(result).toEqual([]);
  });

  it('should return an empty array if no places are found', async () => {
    mockedAxios.get.mockResolvedValue({ data: { results: [] } });

    const result = await service.getPlacesByTextSearch('unknown place');
    expect(result).toEqual([]);
  });
  it('should return the correct photo URL for a given photo reference', async () => {
    const photoReference = 'sample-photo-ref';
    const expectedUrl = `https://maps.googleapis.com/maps/api/place/photo?photo_reference=${photoReference}`;

    const result = await service.getPlacesPhotoUrl(photoReference);

    expect(result).toBe(expectedUrl);
  });

  it('should fetch the actual photo stream for a given photo reference', async () => {
    const photoReference = 'sample-photo-ref';
    const mockResponse = { data: { responseUrl: 'https://sample-url.com/photo' } };
    const mockImageStream = { data: 'image-stream' };

    jest.spyOn(axios, 'get').mockResolvedValueOnce(mockResponse);
    jest.spyOn(axios, 'get').mockResolvedValueOnce(mockImageStream);

    const result = await service.getPlacesActualPhotoUrl(photoReference);

    expect(result).toBe(mockImageStream);
  });

  it('should correctly format places data from text search results', async () => {
    const mockOutlets = [
      {
        place_id: '123',
        formatted_address: '123 Test Street',
        geometry: { location: { lat: 40.7128, lng: -74.006 } },
        name: 'Test Place',
        price_level: 2,
        rating: 4.5,
        user_ratings_total: 100,
      },
    ] as any;

    jest.spyOn(service, 'getPlacesByTextSearch').mockResolvedValue(mockOutlets);

    const result = await service.getPlacesFormatted('Test Place');

    expect(result).toEqual(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({
            placeId: '123',
            formattedAddress: '123 Test Street',
            location: { lat: 40.7128, lng: -74.006 },
            name: 'Test Place',
            priceLevel: 2,
            rating: 4.5,
            userRatingsTotal: 100,
          }),
        ]),
      })
    );
  });

  it('should log an error if axios throws in getCityNameFromCoordinates', async () => {
    const mockError = new Error('API call failed');
    (axios.get as jest.Mock).mockRejectedValue(mockError);

    const result = await service.getCityNameFromCoordinates(1.23, 4.56);

    expect(result).toBeUndefined();
    expect(mockLogger.error).toHaveBeenCalledWith('GooglePlacesService.getCityNameFromCoordinates method error', {
      error: mockError,
    });
  });
});
