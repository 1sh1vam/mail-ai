import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { google } from 'googleapis';
import { User } from './entities/user.entity';

export interface UserPayload {
  email: string;
  name: string;
  picture: string;
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Called after Google OAuth callback. Stores tokens and returns the Google access token.
   */
  async login(user: UserPayload) {
    // Google access tokens expire in ~1 hour
    const expiresAt = new Date(Date.now() + 3600 * 1000);

    await this.userRepository.upsert(
      {
        email: user.email,
        name: user.name,
        picture: user.picture,
        accessToken: user.accessToken,
        refreshToken: user.refreshToken,
        googleTokenExpiresAt: expiresAt,
      },
      ['email'],
    );

    this.logger.log(`User logged in: ${user.email}`);

    return {
      accessToken: user.accessToken,
      expiresAt: expiresAt.toISOString(),
      user: {
        email: user.email,
        name: user.name,
        picture: user.picture,
      },
    };
  }

  /**
   * Look up a user by their Google access token (used by OAuthGuard).
   */
  async findByAccessToken(accessToken: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { accessToken } });
  }

  /**
   * Refresh the user's Google tokens using the stored refresh token.
   * Returns a new access token and updates the DB.
   */
  async refreshSession(email: string): Promise<{
    accessToken: string;
    expiresAt: string;
    user: { email: string; name: string; picture: string };
  }> {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user || !user.refreshToken) {
      throw new Error('No refresh token available. User must re-login.');
    }

    const oauth2Client = new google.auth.OAuth2(
      this.configService.get('google.clientId'),
      this.configService.get('google.clientSecret'),
    );

    oauth2Client.setCredentials({
      refresh_token: user.refreshToken,
    });

    try {
      const { credentials } = await oauth2Client.refreshAccessToken();

      if (!credentials.access_token) {
        throw new Error('No access token returned from Google');
      }

      const expiresAt = credentials.expiry_date
        ? new Date(credentials.expiry_date)
        : new Date(Date.now() + 3600 * 1000);

      // Update tokens in DB — rotate refresh token if Google issued a new one
      const updates: Partial<User> = {
        accessToken: credentials.access_token,
        googleTokenExpiresAt: expiresAt,
      };

      if (credentials.refresh_token) {
        updates.refreshToken = credentials.refresh_token;
        this.logger.log(`Google issued new refresh token for ${email}`);
      }

      await this.userRepository.update({ email }, updates);

      this.logger.log(`Refreshed Google tokens for ${email}, expires at ${expiresAt.toISOString()}`);

      return {
        accessToken: credentials.access_token,
        expiresAt: expiresAt.toISOString(),
        user: {
          email: user.email,
          name: user.name,
          picture: user.picture,
        },
      };
    } catch (error: any) {
      this.logger.error(`Token refresh failed for ${email}: ${error.message}`);
      throw new Error(`Token refresh failed: ${error.message}. User must re-login.`);
    }
  }

  /**
   * Get stored Google tokens + expiry for a user.
   */
  async getGoogleTokens(email: string): Promise<{
    accessToken: string;
    refreshToken: string;
    googleTokenExpiresAt: Date | null;
  } | null> {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      return null;
    }
    return {
      accessToken: user.accessToken,
      refreshToken: user.refreshToken,
      googleTokenExpiresAt: user.googleTokenExpiresAt,
    };
  }

  /**
   * Update Google tokens in DB (called after a token refresh in mail service).
   */
  async updateGoogleTokens(
    email: string,
    accessToken: string,
    refreshToken?: string,
    expiresAt?: Date,
  ) {
    const updates: Partial<User> = { accessToken };
    if (refreshToken) {
      updates.refreshToken = refreshToken;
    }
    if (expiresAt) {
      updates.googleTokenExpiresAt = expiresAt;
    }
    await this.userRepository.update({ email }, updates);
    this.logger.debug(`Updated tokens for: ${email}`);
  }

  /**
   * Revoke tokens on logout.
   */
  async revokeTokens(email: string) {
    await this.userRepository.update(
      { email },
      {
        accessToken: '',
        refreshToken: '',
        googleTokenExpiresAt: null as any,
      },
    );
    this.logger.log(`Revoked tokens for ${email}`);
  }
}
