import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { AssignProjectDto } from './dto/assign-project.dto';
import { CheckInDto } from './dto/check-in.dto';
import { EmployeeStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { AuditLogAction } from '../auth/decorators/audit-action.decorator';

@Controller('employees')
@UseGuards(JwtAuthGuard, PermissionsGuard) // Resguardar todo el controlador con sesión y permisos
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  // -------------------------------------------------------------
  // ENDPOINTS DE ASISTENCIA (Definidos antes de rutas paramétricas /:id)
  // -------------------------------------------------------------

  @Post('attendance/check-in')
  @RequirePermission('CREATE', 'PROYECTOS')
  @AuditLogAction('EMPLOYEE_CHECK_IN') // Auditar entrada del empleado
  checkIn(@Body() checkInDto: CheckInDto) {
    return this.employeesService.checkIn(checkInDto);
  }

  @Post('attendance/check-out')
  @RequirePermission('CREATE', 'PROYECTOS')
  @AuditLogAction('EMPLOYEE_CHECK_OUT') // Auditar salida del empleado
  checkOut(@Body() checkOutDto: CheckInDto) {
    return this.employeesService.checkOut(checkOutDto);
  }

  @Get('attendance')
  @RequirePermission('READ', 'PROYECTOS')
  findAttendance(
    @Query('employeeId') employeeId?: string,
    @Query('projectId') projectId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.employeesService.findAttendance(employeeId, projectId, startDate, endDate);
  }

  // -------------------------------------------------------------
  // ENDPOINTS DE EMPLEADOS (CRUD)
  // -------------------------------------------------------------

  @Post()
  @RequirePermission('CREATE', 'ADMINISTRATIVO')
  @AuditLogAction('CREATE_EMPLOYEE') // Auditar creación de empleados
  create(@Body() createEmployeeDto: CreateEmployeeDto) {
    return this.employeesService.create(createEmployeeDto);
  }

  @Get()
  @RequirePermission('READ', 'ADMINISTRATIVO')
  findAll(
    @Query('projectId') projectId?: string,
    @Query('status') status?: EmployeeStatus,
  ) {
    return this.employeesService.findAll(projectId, status);
  }

  @Get(':id')
  @RequirePermission('READ', 'ADMINISTRATIVO')
  findOne(@Param('id') id: string) {
    return this.employeesService.findOne(id);
  }

  @Put(':id')
  @RequirePermission('UPDATE', 'ADMINISTRATIVO')
  @AuditLogAction('UPDATE_EMPLOYEE') // Auditar actualización de empleados
  update(
    @Param('id') id: string,
    @Body() updateEmployeeDto: UpdateEmployeeDto,
  ) {
    return this.employeesService.update(id, updateEmployeeDto);
  }

  @Delete(':id')
  @RequirePermission('DELETE', 'ADMINISTRATIVO')
  @AuditLogAction('DEACTIVATE_EMPLOYEE') // Auditar baja de nómina
  deactivate(@Param('id') id: string) {
    return this.employeesService.deactivate(id);
  }

  @Post(':id/assign-project')
  @RequirePermission('UPDATE', 'ADMINISTRATIVO')
  @AuditLogAction('ASSIGN_EMPLOYEE_PROJECT') // Auditar asignación a obra
  assignProject(
    @Param('id') employeeId: string,
    @Body() assignProjectDto: AssignProjectDto,
  ) {
    return this.employeesService.assignProject(employeeId, assignProjectDto.projectId);
  }

  @Post(':id/unassign-project')
  @RequirePermission('UPDATE', 'ADMINISTRATIVO')
  @AuditLogAction('UNASSIGN_EMPLOYEE_PROJECT') // Auditar desasignación de obra
  unassignProject(
    @Param('id') employeeId: string,
    @Body() assignProjectDto: AssignProjectDto,
  ) {
    return this.employeesService.unassignProject(employeeId, assignProjectDto.projectId);
  }
}
