import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { AssignAssetDto } from './dto/assign-asset.dto';
import { ReturnAssetDto } from './dto/return-asset.dto';
import { ProjectStatus, TaskStatus, AssetStatus, AssetType } from '@prisma/client';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  // -------------------------------------------------------------
  // CONTROL DE PROYECTOS (CRUD)
  // -------------------------------------------------------------

  async create(createProjectDto: CreateProjectDto) {
    const { name, location, startDate, endDate, estimatedBudget, residentEngineerId } = createProjectDto;

    // 1. Validar que el ingeniero residente exista
    const engineer = await this.prisma.employee.findUnique({ where: { id: residentEngineerId } });
    if (!engineer) {
      throw new NotFoundException(`El ingeniero residente con ID ${residentEngineerId} no existe.`);
    }

    return this.prisma.project.create({
      data: {
        name,
        location,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        estimatedBudget,
        residentEngineerId,
        status: ProjectStatus.PLANNING,
      },
      include: {
        residentEngineer: true,
      },
    });
  }

  async findAll(status?: ProjectStatus) {
    const where: any = {};
    if (status) where.status = status;

    return this.prisma.project.findMany({
      where,
      include: {
        residentEngineer: true,
        _count: {
          select: {
            employees: true,
            tasks: true,
            assetAssignments: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        residentEngineer: true,
        employees: true,
        tasks: {
          orderBy: { startDate: 'asc' },
        },
        assetAssignments: {
          include: {
            asset: true,
            assignedBy: {
              select: { id: true, email: true, firstName: true, lastName: true },
            },
          },
          orderBy: { assignedAt: 'desc' },
        },
        warehouseStock: {
          include: {
            material: true,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException(`Proyecto con ID ${id} no encontrado.`);
    }

    return project;
  }

  async update(id: string, updateProjectDto: UpdateProjectDto) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) {
      throw new NotFoundException(`Proyecto con ID ${id} no encontrado.`);
    }

    const { residentEngineerId, startDate, endDate, ...rest } = updateProjectDto;
    const updateData: any = { ...rest };

    if (residentEngineerId) {
      const engineer = await this.prisma.employee.findUnique({ where: { id: residentEngineerId } });
      if (!engineer) {
        throw new NotFoundException(`El ingeniero residente con ID ${residentEngineerId} no existe.`);
      }
      updateData.residentEngineerId = residentEngineerId;
    }

    if (startDate) updateData.startDate = new Date(startDate);
    if (endDate) updateData.endDate = new Date(endDate);

    return this.prisma.project.update({
      where: { id },
      data: updateData,
      include: {
        residentEngineer: true,
      },
    });
  }

  async remove(id: string) {
    // Baja lógica: transición a estado CANCELLED en lugar de borrado físico
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) {
      throw new NotFoundException(`Proyecto con ID ${id} no encontrado.`);
    }

    return this.prisma.project.update({
      where: { id },
      data: { status: ProjectStatus.CANCELLED },
    });
  }

  // -------------------------------------------------------------
  // CRONOGRAMA DE TAREAS (FASES)
  // -------------------------------------------------------------

  async createTask(projectId: string, createTaskDto: CreateTaskDto) {
    // 1. Validar existencia del proyecto
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      throw new NotFoundException(`Proyecto con ID ${projectId} no encontrado.`);
    }

    const { name, description, phase, startDate, endDate, progress } = createTaskDto;

    return this.prisma.task.create({
      data: {
        projectId,
        name,
        description,
        phase,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        progress: progress || 0.0,
        status: TaskStatus.PENDING,
      },
    });
  }

  async findAllTasks(projectId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      throw new NotFoundException(`Proyecto con ID ${projectId} no encontrado.`);
    }

    return this.prisma.task.findMany({
      where: { projectId },
      orderBy: { startDate: 'asc' },
    });
  }

  async updateTask(taskId: string, updateTaskDto: UpdateTaskDto) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
      throw new NotFoundException(`Tarea con ID ${taskId} no encontrada.`);
    }

    const { startDate, endDate, ...rest } = updateTaskDto;
    const updateData: any = { ...rest };

    if (startDate) updateData.startDate = new Date(startDate);
    if (endDate) updateData.endDate = new Date(endDate);

    // Ajustar estado automáticamente según el progreso si no se envía explícitamente
    if (updateTaskDto.progress !== undefined && !updateTaskDto.status) {
      if (updateTaskDto.progress === 100) {
        updateData.status = TaskStatus.COMPLETED;
      } else if (updateTaskDto.progress > 0) {
        updateData.status = TaskStatus.IN_PROGRESS;
      } else {
        updateData.status = TaskStatus.PENDING;
      }
    }

    return this.prisma.task.update({
      where: { id: taskId },
      data: updateData,
    });
  }

  async removeTask(taskId: string) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
      throw new NotFoundException(`Tarea con ID ${taskId} no encontrada.`);
    }

    return this.prisma.task.delete({ where: { id: taskId } });
  }

  // -------------------------------------------------------------
  // MAQUINARIA Y HERRAMIENTAS (ACTIVOS)
  // -------------------------------------------------------------

  async createAsset(createAssetDto: CreateAssetDto) {
    const { name, code, type } = createAssetDto;

    // Validar código único
    const existingAsset = await this.prisma.asset.findUnique({ where: { code } });
    if (existingAsset) {
      throw new ConflictException(`El código de activo '${code}' ya está registrado.`);
    }

    return this.prisma.asset.create({
      data: {
        name,
        code,
        type,
        status: AssetStatus.AVAILABLE,
      },
    });
  }

  async findAllAssets(type?: AssetType, status?: AssetStatus) {
    const where: any = {};
    if (type) where.type = type;
    if (status) where.status = status;

    return this.prisma.asset.findMany({
      where,
      include: {
        assignments: {
          where: { returnedAt: null },
          include: {
            project: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateAsset(id: string, updateAssetDto: UpdateAssetDto) {
    const asset = await this.prisma.asset.findUnique({ where: { id } });
    if (!asset) {
      throw new NotFoundException(`Activo con ID ${id} no encontrado.`);
    }

    const { code, lastMaintenance, ...rest } = updateAssetDto;
    const updateData: any = { ...rest };

    if (code && code !== asset.code) {
      const existing = await this.prisma.asset.findUnique({ where: { code } });
      if (existing) {
        throw new ConflictException(`El código de activo '${code}' ya está en uso.`);
      }
      updateData.code = code;
    }

    if (lastMaintenance) {
      updateData.lastMaintenance = new Date(lastMaintenance);
    }

    return this.prisma.asset.update({
      where: { id },
      data: updateData,
    });
  }

  async assignAsset(assignAssetDto: AssignAssetDto, userId: string) {
    const { assetId, projectId, notes } = assignAssetDto;

    // 1. Validar que el activo exista y esté AVAILABLE
    const asset = await this.prisma.asset.findUnique({ where: { id: assetId } });
    if (!asset) {
      throw new NotFoundException(`Activo con ID ${assetId} no encontrado.`);
    }
    if (asset.status !== AssetStatus.AVAILABLE) {
      throw new BadRequestException(`El activo '${asset.name}' no está disponible para asignación. Estado actual: ${asset.status}`);
    }

    // 2. Validar que el proyecto exista
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      throw new NotFoundException(`Proyecto con ID ${projectId} no encontrado.`);
    }

    // 3. Crear asignación y cambiar estado del activo a IN_USE en una transacción
    return this.prisma.$transaction(async (tx) => {
      // Registrar asignación
      const assignment = await tx.assetAssignment.create({
        data: {
          assetId,
          projectId,
          assignedById: userId,
          notes,
        },
        include: {
          asset: true,
          project: true,
        },
      });

      // Actualizar estado del activo
      await tx.asset.update({
        where: { id: assetId },
        data: { status: AssetStatus.IN_USE },
      });

      return assignment;
    });
  }

  async returnAsset(returnAssetDto: ReturnAssetDto) {
    const { assetId, notes } = returnAssetDto;

    // 1. Validar activo y que esté IN_USE
    const asset = await this.prisma.asset.findUnique({ where: { id: assetId } });
    if (!asset) {
      throw new NotFoundException(`Activo con ID ${assetId} no encontrado.`);
    }
    if (asset.status !== AssetStatus.IN_USE) {
      throw new BadRequestException(`El activo '${asset.name}' no registra una asignación activa (no está IN_USE).`);
    }

    // 2. Encontrar asignación activa (sin returnedAt)
    const activeAssignment = await this.prisma.assetAssignment.findFirst({
      where: {
        assetId,
        returnedAt: null,
      },
    });

    if (!activeAssignment) {
      throw new NotFoundException(`No se encontró una asignación activa para el activo '${asset.name}'.`);
    }

    // 3. Marcar el retorno y liberar el activo en una transacción
    return this.prisma.$transaction(async (tx) => {
      // Cerrar asignación
      const assignment = await tx.assetAssignment.update({
        where: { id: activeAssignment.id },
        data: {
          returnedAt: new Date(),
          notes: notes ? `${activeAssignment.notes || ''} | Retorno: ${notes}` : activeAssignment.notes,
        },
        include: {
          asset: true,
          project: true,
        },
      });

      // Actualizar estado del activo
      await tx.asset.update({
        where: { id: assetId },
        data: { status: AssetStatus.AVAILABLE },
      });

      return assignment;
    });
  }
}
