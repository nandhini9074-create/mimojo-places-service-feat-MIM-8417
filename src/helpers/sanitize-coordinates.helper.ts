import { ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';
import { LocationCoordinate } from 'src/discovery/dtos/location-coordinate-dto';

@ValidatorConstraint({ name: 'sanitizeCoordinate', async: false })
export class SanitizeCoordinate implements ValidatorConstraintInterface {

    validate(value: LocationCoordinate): boolean {
        // Check if the value is a number or a string that can be parsed as a number
        if (isNaN(Number(value?.lat)) && isNaN(Number(value?.lng))) {
            return false;
        }

        // Convert the value to a string and remove any non-numeric characters
        const sanitizedValuelat = String(value.lat).replace(/[^0-9\.\-]/g, '');
        const sanitizedValuelng = String(value.lng).replace(/[^0-9\.\-]/g, '');

        // Check if the sanitized value matches the original value
        return sanitizedValuelat === String(value.lat) && sanitizedValuelng === String(value.lng);
    }

    defaultMessage(): string {
        return 'Invalid coordinate value';
    }
}

