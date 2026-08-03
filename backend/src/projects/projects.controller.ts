import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { AssignAssetDto } from './dto/assign-asset.dto';
import { ReturnAssetDto } from './dto/return-asset.dto';
import { ProjectStatus, AssetStatus, AssetType } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { AuditLogAction } from '../auth/decorators/audit-action.decorator';

@Controller('projects')
@UseGuards(JwtAuthGuard, PermissionsGuard) // Resguardar todo el controlador con sesión y permisos
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  // =============================================================
  // MAQUINARIA Y HERRAMIENTAS (ACTIVOS)
  // Definidos primero para evitar colisión de ruta con /projects/:id
  // =============================================================

  @Post('assets')
  @RequirePermission('CREATE', 'PROYECTOS')
  @AuditLogAction('CREATE_ASSET')
  createAsset(@Body() createAssetDto: CreateAssetDto) {
    return this.projectsService.createAsset(createAssetDto);
  }

  @Get('assets')
  @RequirePermission('READ', 'PROYECTOS')
  findAllAssets(
    @Query('type') type?: AssetType,
    @Query('status') status?: AssetStatus,
  ) {
    return this.projectsService.findAllAssets(type, status);
  }

  @Post('assets/assign')
  @RequirePermission('UPDATE', 'PROYECTOS')
  @AuditLogAction('ASSIGN_PROJECT_ASSET')
  assignAsset(@Body() assignAssetDto: AssignAssetDto, @Req() req: any) {
    const userId = req.user.id;
    return this.projectsService.assignAsset(assignAssetDto, userId);
  }

  @Post('assets/return')
  @RequirePermission('UPDATE', 'PROYECTOS')
  @AuditLogAction('RETURN_PROJECT_ASSET')
  returnAsset(@Body() returnAssetDto: ReturnAssetDto) {
    return this.projectsService.returnAsset(returnAssetDto);
  }

  @Put('assets/:id')
  @RequirePermission('UPDATE', 'PROYECTOS')
  @AuditLogAction('UPDATE_ASSET')
  updateAsset(@Param('id') id: string, @Body() updateAssetDto: UpdateAssetDto) {
    return this.projectsService.updateAsset(id, updateAssetDto);
  }

  // =============================================================
  // CRONOGRAMA DE TAREAS (FASES)
  // =============================================================

  @Post(':projectId/tasks')
  @RequirePermission('CREATE', 'PROYECTOS')
  @AuditLogAction('CREATE_TASK')
  createTask(
    @Param('projectId') projectId: string,
    @Body() createTaskDto: CreateTaskDto,
  ) {
    return this.projectsService.createTask(projectId, createTaskDto);
  }

  @Get(':projectId/tasks')
  @RequirePermission('READ', 'PROYECTOS')
  findAllTasks(@Param('projectId') projectId: string) {
    return this.projectsService.findAllTasks(projectId);
  }

  @Put('tasks/:id')
  @RequirePermission('UPDATE', 'PROYECTOS')
  @AuditLogAction('UPDATE_TASK_PROGRESS')
  updateTask(@Param('id') id: string, @Body() updateTaskDto: UpdateTaskDto) {
    return this.projectsService.updateTask(id, updateTaskDto);
  }

  @Delete('tasks/:id')
  @RequirePermission('DELETE', 'PROYECTOS')
  @AuditLogAction('DELETE_TASK')
  removeTask(@Param('id') id: string) {
    return this.projectsService.removeTask(id);
  }

  // =============================================================
  // FICHAS TÉCNICAS DE PROYECTOS (CRUD)
  // =============================================================

  @Post()
  @RequirePermission('CREATE', 'PROYECTOS')
  @AuditLogAction('CREATE_PROJECT')
  create(@Body() createProjectDto: CreateProjectDto) {
    return this.projectsService.create(createProjectDto);
  }

  @Get()
  @RequirePermission('READ', 'PROYECTOS')
  findAll(@Query('status') status?: ProjectStatus) {
    return this.projectsService.findAll(status);
  }

  @Get(':id')
  @RequirePermission('READ', 'PROYECTOS')
  findOne(@Param('id') id: string) {
    return this.projectsService.findOne(id);
  }

  @Put(':id')
  @RequirePermission('UPDATE', 'PROYECTOS')
  @AuditLogAction('UPDATE_PROJECT')
  update(@Param('id') id: string, @Body() updateProjectDto: UpdateProjectDto) {
    return this.projectsService.update(id, updateProjectDto);
  }

  @Delete(':id')
  @RequirePermission('DELETE', 'PROYECTOS')
  @AuditLogAction('DELETE_PROJECT')
  remove(@Param('id') id: string) {
    return this.projectsService.remove(id);
  }
}
