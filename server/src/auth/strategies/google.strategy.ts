import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, StrategyOptions } from 'passport-google-oauth20';
import type { VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(configService: ConfigService) {
    // Use type assertion to allow additional OAuth options
    const options: StrategyOptions & { accessType?: string; prompt?: string } = {
      clientID: configService.get<string>('google.clientId')!,
      clientSecret: configService.get<string>('google.clientSecret')!,
      callbackURL: configService.get<string>('google.callbackUrl')!,
      scope: [
        'email',
        'profile',
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/gmail.modify',
      ],
      // Required to get a refresh token
      accessType: 'offline',
      // Force consent to always get a refresh token (even if previously authorized)
      prompt: 'consent',
    };
    super(options as StrategyOptions);
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const { emails, displayName, photos } = profile;
    
    console.log('[GoogleStrategy] Got tokens:', { 
      accessToken: accessToken?.substring(0, 20) + '...', 
      refreshToken: refreshToken ? 'present' : 'missing' 
    });
    
    const user = {
      email: emails[0].value,
      name: displayName,
      picture: photos[0]?.value || '',
      accessToken,
      refreshToken,
    };
    
    done(null, user);
  }
}
