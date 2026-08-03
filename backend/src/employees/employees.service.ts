import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { CheckInDto } from './dto/check-in.dto';
import { EmployeeStatus } from '@prisma/client';

@Injectable()
export class EmployeesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createEmployeeDto: CreateEmployeeDto) {
    const { firstName, lastName, documentId, email, phone, status, userId } = createEmployeeDto;

    // 1. Validar unicidad del documentId (DNI/RUT/etc.)
    const existingDoc = await this.prisma.employee.findUnique({
      where: { documentId },
    });
    if (existingDoc) {
      throw new ConflictException('El documento de identidad ya está registrado para otro empleado.');
    }

    // 2. Si se asocia a un usuario, validar que exista y no esté vinculado
    if (userId) {
      const userExists = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!userExists) {
        throw new BadRequestException('El usuario especificado no existe.');
      }

      const userLinked = await this.prisma.employee.findUnique({ where: { userId } });
      if (userLinked) {
        throw new ConflictException('El usuario ya está vinculado a otro expediente de empleado.');
      }
    }

    // 3. Crear el empleado
    return this.prisma.employee.create({
      data: {
        firstName,
        lastName,
        documentId,
        email,
        phone,
        status: status || EmployeeStatus.ACTIVE,
        userId: userId || null,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            status: true,
          },
        },
      },
    });
  }

  async findAll(projectId?: string, status?: EmployeeStatus) {
    const where: any = {};
    if (status) where.status = status;
    if (projectId) {
      where.projects = {
        some: { id: projectId },
      };
    }

    return this.prisma.employee.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            status: true,
          },
        },
        projects: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            status: true,
          },
        },
        projects: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
    });

    if (!employee) {
      throw new NotFoundException(`Expediente de empleado con ID ${id} no encontrado.`);
    }

    return employee;
  }

  async update(id: string, updateEmployeeDto: UpdateEmployeeDto) {
    // 1. Verificar existencia del empleado
    const employee = await this.prisma.employee.findUnique({ where: { id } });
    if (!employee) {
      throw new NotFoundException(`Expediente de empleado con ID ${id} no encontrado.`);
    }

    const updateData: any = { ...updateEmployeeDto };

    // 2. Validar unicidad del documento si cambia
    if (updateEmployeeDto.documentId && updateEmployeeDto.documentId !== employee.documentId) {
      const existingDoc = await this.prisma.employee.findUnique({
        where: { documentId: updateEmployeeDto.documentId },
      });
      if (existingDoc) {
        throw new ConflictException('El nuevo documento de identidad ya está registrado.');
      }
    }

    // 3. Validar vinculación del usuario si cambia
    if (updateEmployeeDto.userId && updateEmployeeDto.userId !== employee.userId) {
      const userExists = await this.prisma.user.findUnique({ where: { id: updateEmployeeDto.userId } });
      if (!userExists) {
        throw new BadRequestException('El usuario especificado no existe.');
      }

      const userLinked = await this.prisma.employee.findUnique({ where: { userId: updateEmployeeDto.userId } });
      if (userLinked) {
        throw new ConflictException('El usuario ya está vinculado a otro expediente de empleado.');
      }
    }

    return this.prisma.employee.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            status: true,
          },
        },
      },
    });
  }

  async deactivate(id: string) {
    // Soft delete (baja de nómina) del empleado estableciendo estado en INACTIVE
    const employee = await this.prisma.employee.findUnique({ where: { id } });
    if (!employee) {
      throw new NotFoundException(`Expediente de empleado con ID ${id} no encontrado.`);
    }

    return this.prisma.employee.update({
      where: { id },
      data: { status: EmployeeStatus.INACTIVE },
    });
  }

  async assignProject(employeeId: string, projectId: string) {
    // 1. Validar empleado
    const employee = await this.prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) {
      throw new NotFoundException(`Empleado con ID ${employeeId} no encontrado.`);
    }

    // 2. Validar proyecto
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      throw new NotFoundException(`Proyecto con ID ${projectId} no encontrado.`);
    }

    // 3. Asociar en la relación muchos a muchos
    return this.prisma.employee.update({
      where: { id: employeeId },
      data: {
        projects: {
          connect: { id: projectId },
        },
      },
      include: {
        projects: true,
      },
    });
  }

  async unassignProject(employeeId: string, projectId: string) {
    // 1. Validar empleado
    const employee = await this.prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) {
      throw new NotFoundException(`Empleado con ID ${employeeId} no encontrado.`);
    }

    // 2. Desasociar de la relación
    return this.prisma.employee.update({
      where: { id: employeeId },
      data: {
        projects: {
          disconnect: { id: projectId },
        },
      },
      include: {
        projects: true,
      },
    });
  }

  // -------------------------------------------------------------
  // CONTROL DE ASISTENCIA (CHECK-IN / CHECK-OUT)
  // -------------------------------------------------------------

  async checkIn(checkInDto: CheckInDto) {
    const { employeeId, projectId } = checkInDto;

    // 1. Validar empleado
    const employee = await this.prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) {
      throw new NotFoundException(`Empleado con ID ${employeeId} no encontrado.`);
    }

    // 2. Validar proyecto
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      throw new NotFoundException(`Proyecto con ID ${projectId} no encontrado.`);
    }

    // 3. Obtener fecha de hoy sin horas (00:00:00)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 4. Validar que no exista un check-in activo (sin check-out) hoy
    const activeCheckIn = await this.prisma.attendance.findFirst({
      where: {
        employeeId,
        projectId,
        checkOut: null,
        date: today,
      },
    });

    if (activeCheckIn) {
      throw new BadRequestException('El empleado ya posee un registro de Check-In activo para este proyecto el día de hoy.');
    }

    // 5. Registrar entrada
    return this.prisma.attendance.create({
      data: {
        employeeId,
        projectId,
        checkIn: new Date(),
        date: today,
      },
      include: {
        employee: true,
        project: true,
      },
    });
  }

  async checkOut(checkOutDto: CheckInDto) {
    const { employeeId, projectId } = checkOutDto;

    // 1. Obtener fecha de hoy sin horas (00:00:00)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 2. Encontrar el check-in activo
    const activeCheckIn = await this.prisma.attendance.findFirst({
      where: {
        employeeId,
        projectId,
        checkOut: null,
        date: today,
      },
    });

    if (!activeCheckIn) {
      throw new NotFoundException('No se encontró un registro de Check-In activo (sin salida) para este empleado en esta obra hoy.');
    }

    // 3. Registrar salida actualizando checkOut
    return this.prisma.attendance.update({
      where: { id: activeCheckIn.id },
      data: {
        checkOut: new Date(),
      },
      include: {
        employee: true,
        project: true,
      },
    });
  }

  async findAttendance(employeeId?: string, projectId?: string, startDate?: string, endDate?: string) {
    const where: any = {};
    if (employeeId) where.employeeId = employeeId;
    if (projectId) where.projectId = projectId;
    
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    return this.prisma.attendance.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            documentId: true,
            email: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        checkIn: 'desc',
      },
    });
  }
}
