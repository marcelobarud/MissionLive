import { Body, Controller, Get, Param, Patch, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { AuthenticatedRequest } from '../auth/auth.types';
import { requirePlatformAdmin } from './platform-role';
import { AdminUserIdParamDto, ListAdminUsersQueryDto, UpdateAdminUserStatusDto } from './admin-users.dto';
import { AdminUsersService } from './admin-users.service';

@Controller('admin/users')
@UseGuards(AuthGuard)
export class AdminUsersController {
  constructor(private readonly users: AdminUsersService) {}

  @Get()
  list(@Req() request: AuthenticatedRequest, @Query() query: ListAdminUsersQueryDto) {
    requirePlatformAdmin(request.user);
    return this.users.list(query);
  }

  @Get(':userId')
  detail(@Req() request: AuthenticatedRequest, @Param() params: AdminUserIdParamDto) {
    requirePlatformAdmin(request.user);
    return this.users.detail(params.userId);
  }

  @Patch(':userId/status')
  updateStatus(@Req() request: AuthenticatedRequest, @Param() params: AdminUserIdParamDto, @Body() body: UpdateAdminUserStatusDto) {
    requirePlatformAdmin(request.user);
    return this.users.updateStatus(request.user, params.userId, body.status);
  }
}
