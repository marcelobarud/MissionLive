import { Body, Controller, Get, Param, Patch, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { AuthenticatedRequest } from '../auth/auth.types';
import { requirePlatformAdmin, requireSuperAdmin } from './platform-role';
import {
  AdminAdministratorCandidateQueryDto,
  AdminUserIdParamDto,
  ListAdminAdministratorsQueryDto,
  UpdateAdminPlatformRoleDto,
  UpdateAdminUserStatusDto,
} from './admin-users.dto';
import { AdminAdministratorsService } from './admin-administrators.service';

@Controller('admin/administrators')
@UseGuards(AuthGuard)
export class AdminAdministratorsController {
  constructor(private readonly administrators: AdminAdministratorsService) {}

  @Get()
  list(@Req() request: AuthenticatedRequest, @Query() query: ListAdminAdministratorsQueryDto) {
    requirePlatformAdmin(request.user);
    return this.administrators.list(query);
  }

  @Get('candidates')
  candidates(@Req() request: AuthenticatedRequest, @Query() query: AdminAdministratorCandidateQueryDto) {
    requireSuperAdmin(request.user);
    return this.administrators.candidates(query);
  }

  @Get(':userId')
  detail(@Req() request: AuthenticatedRequest, @Param() params: AdminUserIdParamDto) {
    requirePlatformAdmin(request.user);
    return this.administrators.detail(params.userId);
  }

  @Patch(':userId/role')
  updateRole(@Req() request: AuthenticatedRequest, @Param() params: AdminUserIdParamDto, @Body() body: UpdateAdminPlatformRoleDto) {
    return this.administrators.updateRole(request.user, params.userId, body.platformRole);
  }

  @Patch(':userId/status')
  updateStatus(@Req() request: AuthenticatedRequest, @Param() params: AdminUserIdParamDto, @Body() body: UpdateAdminUserStatusDto) {
    return this.administrators.updateStatus(request.user, params.userId, body.status);
  }
}
