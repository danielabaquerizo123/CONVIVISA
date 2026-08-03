import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { AssignPermissionsDto } from './dto/assign-permissions.dto';
import { UserStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { AuditLogAction } from '../auth/decorators/audit-action.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard) // Proteger todos los endpoints del controlador con sesión y permisos
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // -------------------------------------------------------------
  // ENDPOINTS DE ROLES Y PERMISOS (Definidos antes de /:id)
  // -------------------------------------------------------------

  @Get('roles')
  @RequirePermission('READ', 'ADMINISTRATIVO')
  findAllRoles() {
    return this.usersService.findAllRoles();
  }

  @Get('permissions')
  @RequirePermission('READ', 'ADMINISTRATIVO')
  findAllPermissions() {
    return this.usersService.findAllPermissions();
  }

  @Put('roles/:id/permissions')
  @RequirePermission('UPDATE', 'ADMINISTRATIVO')
  @AuditLogAction('ASSIGN_ROLE_PERMISSIONS') // Auditar asignación de permisos a roles
  assignPermissionsToRole(
    @Param('id') roleId: string,
    @Body() assignPermissionsDto: AssignPermissionsDto,
  ) {
    return this.usersService.assignPermissionsToRole(roleId, assignPermissionsDto.permissionIds);
  }

  // -------------------------------------------------------------
  // ENDPOINTS DE USUARIOS (CRUD)
  // -------------------------------------------------------------

  @Post()
  @RequirePermission('CREATE', 'ADMINISTRATIVO')
  @AuditLogAction('CREATE_USER') // Auditar creación de usuarios
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @RequirePermission('READ', 'ADMINISTRATIVO')
  findAll(
    @Query('status') status?: UserStatus,
    @Query('roleId') roleId?: string,
  ) {
    return this.usersService.findAll(status, roleId);
  }

  @Get(':id')
  @RequirePermission('READ', 'ADMINISTRATIVO')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Put(':id')
  @RequirePermission('UPDATE', 'ADMINISTRATIVO')
  @AuditLogAction('UPDATE_USER') // Auditar edición de usuarios
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Patch(':id/status')
  @RequirePermission('UPDATE', 'ADMINISTRATIVO')
  @AuditLogAction('UPDATE_USER_STATUS') // Auditar cambio manual de estado
  updateStatus(
    @Param('id') id: string,
    @Body() updateUserStatusDto: UpdateUserStatusDto,
  ) {
    return this.usersService.updateStatus(id, updateUserStatusDto.status);
  }

  @Delete(':id')
  @RequirePermission('DELETE', 'ADMINISTRATIVO')
  @AuditLogAction('SOFT_DELETE_USER') // Auditar baja lógica de usuarios
  softDelete(@Param('id') id: string) {
    return this.usersService.softDelete(id);
  }
}
