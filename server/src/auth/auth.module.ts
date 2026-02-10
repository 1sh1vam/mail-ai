import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GoogleStrategy } from './strategies/google.strategy';
import { OAuthGuard } from './guards/oauth.guard';
import { User } from './entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    PassportModule.register({ defaultStrategy: 'google' }),
    ConfigModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, GoogleStrategy, OAuthGuard],
  exports: [AuthService, OAuthGuard],
})
export class AuthModule {}
