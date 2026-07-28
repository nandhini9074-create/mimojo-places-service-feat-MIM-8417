import { ValidateBy } from 'class-validator';

const validateImageType = (value: Express.Multer.File[]) => {
    for (const file of value) {
      if (!file.mimetype.startsWith('image/')) {
        return false;
      }
    }
    return true;
  };

  ValidateBy({
    name: 'IsValidImageType',
    validator: {
      validate: validateImageType,
      defaultMessage: () => 'Invalid image type',
    },
  })
  export class IsValidImageType {
    // Empty class, used only for validation
  }