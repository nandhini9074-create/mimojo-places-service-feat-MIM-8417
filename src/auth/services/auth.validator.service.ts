import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { ErrorMessages } from 'src/errors/error-messages';
import { JwtPayload } from '../dtos/auth.interface';

@Injectable()
export class AuthHeaderService {
  async getUserId(authHeader: string): Promise<string> {
    if (authHeader) {
      const [bearer, token] = authHeader.split(' ');
      if (bearer !== 'Bearer' || !token) {
        throw new HttpException(ErrorMessages.auth.invalidToken, HttpStatus.UNAUTHORIZED);
      }
      const payload = (await jwt.decode(token)) as JwtPayload;
      if (payload?.user) {
        return payload.user.id;
      } else {
        throw new HttpException(ErrorMessages.auth.invalidToken, HttpStatus.UNAUTHORIZED);
      }
    }
  }
}
