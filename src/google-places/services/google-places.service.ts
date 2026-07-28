import { Injectable } from '@nestjs/common';
import { baseResponseHelper } from 'src/helpers/base-response.helper';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { IGooglePlacesConfiguration } from 'config/interface';
import { CustomPinoLogger } from 'src/logger/custom-logger.service';

interface GooglePlace {
  place_id: string;
  formatted_address?: string;
  geometry?: { location?: { lat: number; lng: number } };
  name?: string;
  price_level?: number;
  rating?: number;
  user_ratings_total?: number;
  [key: string]: unknown;
}

interface WeekdayEntry {
  day: string;
  time: string;
}

@Injectable()
export class GooglePlacesService {
  private googleApiKey: string;
  private googlePlacesField: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: CustomPinoLogger
  ) {
    const { GOOGLE_API_KEY, GOOGLE_PLACES_FIELDS } = this.configService.get<IGooglePlacesConfiguration>('google-places');

    this.googleApiKey = GOOGLE_API_KEY;
    this.googlePlacesField = GOOGLE_PLACES_FIELDS;
  }

  async getPlaces(place_id: string, searchPhrase: string) {
    const outletArabicResult: GooglePlace[] = await this.getPlacesByTextSearch(searchPhrase, null, 'ar');
    const matchedPlace = outletArabicResult?.find(outlet => outlet?.place_id === place_id);
    const url = `https://maps.googleapis.com/maps/api/place/details/json?language=en&key=${this.googleApiKey}&fields=${this.googlePlacesField}&place_id=${place_id}`;
    const englishResponse = await axios.get(url);
    const arabicResponse = await axios.get(url.replace('language=en', 'language=ar'));

    const photoList: string[] = [];
    if (englishResponse?.data?.result?.photos?.length > 0)
      for (const photo of englishResponse?.data?.result?.photos) {
        photoList.push(photo.photo_reference);
      }

    return baseResponseHelper({
      placeId: englishResponse?.data?.result?.place_id,
      outletTiming: {
        weekdayText: this.convertWeekdayText2(englishResponse?.data?.result?.current_opening_hours?.weekday_text),
        weekdayTextAr: this.convertWeekdayText2(arabicResponse?.data?.result?.current_opening_hours?.weekday_text),
        //weekdayText: response?.data?.result?.current_opening_hours?.weekday_text
      },
      //week2: response?.data?.result?.current_opening_hours?.weekday_text,
      formattedPhoneNumber: englishResponse?.data?.result?.formatted_phone_number,
      photos: photoList,
      wheelchairAccessibleEntrance: englishResponse?.data?.result?.wheelchair_accessible_entrance,
      website: englishResponse?.data?.result?.website,
      websiteAr: arabicResponse?.data?.result?.website,
      formattedAddressAr: matchedPlace?.formatted_address,
      nameAr: matchedPlace?.name,
    });
  }

  async getCityNameFromCoordinates(latitude, longitude): Promise<string> {
    try {
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${this.googleApiKey}`
      );

      if (response?.data?.results?.length > 0) {
        // Find the city component in address components
        const addressComponents = response?.data?.results?.map(r =>
          r.address_components?.find(
            component => component?.types?.includes('locality') || component?.types?.includes('country')
          )
        );

        const cityAndCountry = addressComponents?.map(component => component?.long_name);

        if (cityAndCountry) {
          return cityAndCountry;
        }
      } else {
        this.logger.info(
          'GooglePlacesService.getCityNameFromCoordinates method: No results found for the given coordinates.'
        );
      }
    } catch (error) {
      this.logger.error('GooglePlacesService.getCityNameFromCoordinates method error', { error });
    }
  }

  private convertWeekdayText2(weekdayText: string[]): WeekdayEntry[] {
    try {
      const formattedSchedule = weekdayText.map(entry => {
        const [day, time] = entry.split(': ');
        return { day: day, time: time };
      });

      return formattedSchedule;
    } catch {
      return [];
    }
  }

  async getPlacesPhotoUrl(photoReference: string): Promise<string> {
    const url = `https://maps.googleapis.com/maps/api/place/photo?photo_reference=${photoReference}`;
    return url;
  }

  async getPlacesActualPhotoUrl(photoReference: string): Promise<{ data: NodeJS.ReadableStream }> {
    const url =
      `https://maps.googleapis.com/maps/api/place/photo?photo_reference=${photoReference}` +
      `&key=${this.googleApiKey}&maxwidth=300`;
    const response = await axios.get(url, {
      url: url,
      method: 'GET',
      responseType: 'stream',
    });
    const imageStream = await axios.get(response?.data?.responseUrl, { responseType: 'stream' });
    return imageStream;
  }

  async getPlacesFormatted(phrase: string) {
    const results = [];
    const outlets = await this.getPlacesByTextSearch(phrase);
    if (outlets?.length > 0) {
      for (const outlet of outlets) {
        const formatted_outlet = {
          placeId: outlet?.place_id,
          formattedAddress: outlet?.formatted_address,
          location: outlet?.geometry?.location,
          name: outlet?.name,
          priceLevel: outlet?.price_level,
          rating: outlet?.rating,
          userRatingsTotal: outlet?.user_ratings_total,
        };
        // check if all required properties are defined
        // if (Object.values(formatted_outlet).every(prop => prop !== undefined && prop !== null)) {
        results.push(formatted_outlet);
        // }
      }
    }
    return baseResponseHelper(results);
  }

  async getPlacesByTextSearch(phrase: string, nextPageToken: string | null = null, language = 'en'): Promise<GooglePlace[]> {
    let url = `https://maps.googleapis.com/maps/api/place/textsearch/json?language=${language}&key=${this.googleApiKey}&query=${phrase}`;
    if (nextPageToken) url = `${url}&pagetoken=${nextPageToken}`;

    const response = await axios.get(url);
    const results = response?.data?.results || [];
    if (response?.data?.next_page_token) {
      const nextResults = await this.getPlacesByTextSearch(phrase, response?.data?.next_page_token);
      results.push(...nextResults);
    }

    return response?.data?.results;
  }

  async getGoogleReview(place_id: string, language = 'en'): Promise<unknown> {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?key=${this.googleApiKey}&fields=rating,reviews&place_id=${place_id}&language=${language}`;
    const response = await axios.get(url);

    return response?.data?.result;
  }
}
