import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from '../auth.service';

@Injectable()
export class OAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const user = await this.authService.findByAccessToken(token);

    if (!user) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    // Attach user info to request (same shape as before)
    request.user = {
      email: user.email,
      name: user.name,
      picture: user.picture,
    };

    return true;
  }
}
