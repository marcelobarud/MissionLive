import { Injectable } from '@nestjs/common';
import { DashboardReadService } from './dashboard-read.service';

@Injectable()
export class DashboardService {
  constructor(private readonly readModel: DashboardReadService) {}

  summary(userId: string) { return this.readModel.summary(userId); }
}
