
import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import config from '../../config';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  use(req: any, _res: any, next: () => void) {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) throw new UnauthorizedException('Missing token');
    try {
      req.user = jwt.verify(token, config().jwtSecret);
      next();
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
