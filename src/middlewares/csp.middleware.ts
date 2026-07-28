import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as helmet from 'helmet';


const configs = [
    '*.mimojo.io',
    '*.imagedelivery.net',
    '*.maps.googleapis',
    'https://maps.googleapis.com',
    '*.browser-intake-datadoghq.com',
    'https://browser-intake-datadoghq.com',
    '*.firebaseapp.com',
    '*.firebaseio.com',
  ];
@Injectable()
export class CspMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    helmet.contentSecurityPolicy({
      useDefaults: false,
      directives: {
        defaultSrc: ["'self'"],
        'script-src': ["'self'", 'https://maps.googleapis.com', ...configs],
        'connect-src': ["'self'", '*.mimojo.io', ...configs],
        'style-src': ["'self'", ...configs],
        'img-src': ["'self'", 'https:', ...configs, 'blob:'],
        'worker-src': ["'self'", 'blob:', ...configs],
      },
    })(req, res, next);
  }
}
