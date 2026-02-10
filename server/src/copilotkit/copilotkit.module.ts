import { Module } from '@nestjs/common';
import { CopilotKitController } from './copilotkit.controller';

@Module({
  controllers: [CopilotKitController],
})
export class CopilotKitModule {}
