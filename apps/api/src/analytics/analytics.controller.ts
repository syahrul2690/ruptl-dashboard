import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
@UseGuards(AuthGuard('access'))
export class AnalyticsController {
  constructor(private analytics: AnalyticsService) {}

  @Get('summary')
  getSummary() { return this.analytics.getSummary(); }
}
