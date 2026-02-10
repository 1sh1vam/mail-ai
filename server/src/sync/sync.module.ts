import { Module } from '@nestjs/common';
import { SyncGateway } from './sync.gateway';
import { SyncService } from './sync.service';
import { MailModule } from '../mail';
import { AuthModule } from '../auth';

@Module({
  imports: [
    MailModule,
    AuthModule,
  ],
  providers: [SyncGateway, SyncService],
  exports: [SyncService, SyncGateway],
})
export class SyncModule {}
