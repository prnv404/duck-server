import { Module } from '@nestjs/common';
import { GamificationService } from './gamification.service';
import { GamificationResolver } from './gamification.resolver';

@Module({
  providers: [GamificationService, GamificationResolver]
})
export class GamificationModule {}
