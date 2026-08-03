import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMaterialDto } from './dto/create-material.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';
import { MovementType } from '@prisma/client';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  // -------------------------------------------------------------
  // CATÁLOGO DE MATERIALES (CRUD)
  // -------------------------------------------------------------

  async createMaterial(createMaterialDto: CreateMaterialDto) {
    const { name, unit, sku, unitPrice } = createMaterialDto;

    // Validar SKU único
    const existing = await this.prisma.material.findUnique({ where: { sku } });
    if (existing) {
      throw new ConflictException(`El código SKU '${sku}' ya está registrado.`);
    }

    return this.prisma.material.create({
      data: {
        name,
        unit,
        sku,
        unitPrice,
      },
    });
  }

  async findAllMaterials() {
    return this.prisma.material.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findOneMaterial(id: string) {
    const material = await this.prisma.material.findUnique({
      where: { id },
      include: {
        stocks: {
          include: {
            project: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!material) {
      throw new NotFoundException(`Material con ID ${id} no encontrado.`);
    }

    return material;
  }

  async updateMaterial(id: string, updateMaterialDto: UpdateMaterialDto) {
    const material = await this.prisma.material.findUnique({ where: { id } });
    if (!material) {
      throw new NotFoundException(`Material con ID ${id} no encontrado.`);
    }

    const { sku, ...rest } = updateMaterialDto;
    const updateData: any = { ...rest };

    if (sku && sku !== material.sku) {
      const existing = await this.prisma.material.findUnique({ where: { sku } });
      if (existing) {
        throw new ConflictException(`El código SKU '${sku}' ya está en uso.`);
      }
      updateData.sku = sku;
    }

    return this.prisma.material.update({
      where: { id },
      data: updateData,
    });
  }

  // -------------------------------------------------------------
  // CONSULTA DE STOCK POR PROYECTO
  // -------------------------------------------------------------

  async findAllStock(projectId?: string, materialId?: string) {
    const where: any = {};
    if (projectId) where.projectId = projectId;
    if (materialId) where.materialId = materialId;

    return this.prisma.warehouseStock.findMany({
      where,
      include: {
        project: { select: { id: true, name: true } },
        material: { select: { id: true, name: true, unit: true, sku: true } },
      },
      orderBy: [
        { project: { name: 'asc' } },
        { material: { name: 'asc' } },
      ],
    });
  }

  // -------------------------------------------------------------
  // ALERTAS DE STOCK BAJO EL UMBRAL MÍNIMO
  // -------------------------------------------------------------

  async getLowStockAlerts(projectId?: string) {
    const where: any = {};
    if (projectId) where.projectId = projectId;

    const stocks = await this.prisma.warehouseStock.findMany({
      where,
      include: {
        project: { select: { id: true, name: true } },
        material: { select: { id: true, name: true, unit: true, sku: true } },
      },
    });

    // Filtrado en memoria: stock actual menor al umbral mínimo
    return stocks.filter(stock => stock.quantity < stock.minStock);
  }

  // -------------------------------------------------------------
  // REGISTRO DE MOVIMIENTOS DE STOCK CON CONTROL DE CONCURRENCIA
  // -------------------------------------------------------------

  async registerMovement(dto: CreateStockMovementDto, userId: string) {
    const { projectId, materialId, quantity, type, toProjectId, taskId, purchaseOrderId } = dto;

    // 1. Validar existencia del material
    const material = await this.prisma.material.findUnique({ where: { id: materialId } });
    if (!material) {
      throw new NotFoundException(`El material con ID ${materialId} no existe.`);
    }

    // 2. Validar existencia del proyecto origen
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      throw new NotFoundException(`El proyecto origen con ID ${projectId} no existe.`);
    }

    // 3. Si se proporciona una tarea, validar que exista
    if (taskId) {
      const task = await this.prisma.task.findUnique({ where: { id: taskId } });
      if (!task) {
        throw new NotFoundException(`La tarea con ID ${taskId} no existe.`);
      }
    }

    // 4. Si se proporciona una orden de compra, validar que exista
    if (purchaseOrderId) {
      const po = await this.prisma.purchaseOrder.findUnique({ where: { id: purchaseOrderId } });
      if (!po) {
        throw new NotFoundException(`La orden de compra con ID ${purchaseOrderId} no existe.`);
      }
    }

    // 5. Ejecutar transacción interactiva en la base de datos
    return this.prisma.$transaction(async (tx) => {
      
      // CASO 1: INGRESO (RECEIPT)
      if (type === MovementType.RECEIPT) {
        // Incrementar o crear el stock en la obra correspondiente
        const stock = await tx.warehouseStock.upsert({
          where: {
            projectId_materialId: { projectId, materialId },
          },
          update: {
            quantity: { increment: quantity },
          },
          create: {
            projectId,
            materialId,
            quantity,
          },
        });

        // Registrar el movimiento de entrada
        const movement = await tx.stockMovement.create({
          data: {
            projectId,
            materialId,
            quantity,
            type,
            performedById: userId,
            taskId,
            purchaseOrderId,
          },
          include: { material: true, project: true },
        });

        return { stock, movement };
      }

      // CASO 2: CONSUMO / SALIDA (CONSUMPTION)
      if (type === MovementType.CONSUMPTION) {
        // Primero verificamos de forma convencional para dar un mensaje amigable
        const existingStock = await tx.warehouseStock.findUnique({
          where: {
            projectId_materialId: { projectId, materialId },
          },
        });

        if (!existingStock || existingStock.quantity < quantity) {
          throw new BadRequestException(
            `Stock insuficiente. Cantidad actual disponible: ${existingStock ? existingStock.quantity : 0} ${material.unit}.`,
          );
        }

        // Decremento atómico del stock
        const stock = await tx.warehouseStock.update({
          where: {
            projectId_materialId: { projectId, materialId },
          },
          data: {
            quantity: { decrement: quantity },
          },
        });

        // Si por condiciones extremas de carrera el stock resultante queda en negativo,
        // lanzamos excepción para forzar el ROLLBACK automático de la transacción.
        if (stock.quantity < 0) {
          throw new BadRequestException(
            `Stock insuficiente. La operación concurrente redujo el stock por debajo del límite permitido.`,
          );
        }

        // Registrar movimiento de consumo
        const movement = await tx.stockMovement.create({
          data: {
            projectId,
            materialId,
            quantity,
            type,
            performedById: userId,
            taskId,
            purchaseOrderId,
          },
          include: { material: true, project: true },
        });

        return { stock, movement };
      }

      // CASO 3: TRASLADO ENTRE OBRAS (TRANSFER)
      if (type === MovementType.TRANSFER) {
        if (!toProjectId) {
          throw new BadRequestException('El ID del proyecto destino (toProjectId) es requerido para traslados.');
        }

        if (projectId === toProjectId) {
          throw new BadRequestException('El proyecto de origen y destino no pueden ser el mismo.');
        }

        // Validar proyecto destino
        const destProject = await tx.project.findUnique({ where: { id: toProjectId } });
        if (!destProject) {
          throw new NotFoundException(`El proyecto destino con ID ${toProjectId} no existe.`);
        }

        // A. Decrementar el origen
        const existingStock = await tx.warehouseStock.findUnique({
          where: {
            projectId_materialId: { projectId, materialId },
          },
        });

        if (!existingStock || existingStock.quantity < quantity) {
          throw new BadRequestException(
            `Stock insuficiente en el proyecto origen. Disponible: ${existingStock ? existingStock.quantity : 0} ${material.unit}.`,
          );
        }

        const sourceStock = await tx.warehouseStock.update({
          where: {
            projectId_materialId: { projectId, materialId },
          },
          data: {
            quantity: { decrement: quantity },
          },
        });

        // Rollback si la concurrencia lo deja en negativo
        if (sourceStock.quantity < 0) {
          throw new BadRequestException(
            `Stock insuficiente en el origen debido a un decremento de inventario concurrente.`,
          );
        }

        // B. Incrementar el destino (usar upsert por si no existía el registro de stock en la otra obra)
        const destStock = await tx.warehouseStock.upsert({
          where: {
            projectId_materialId: { projectId: toProjectId, materialId },
          },
          update: {
            quantity: { increment: quantity },
          },
          create: {
            projectId: toProjectId,
            materialId,
            quantity,
          },
        });

        // C. Registrar dos movimientos correspondientes
        // Egreso del origen (cantidad negativa)
        const sourceMovement = await tx.stockMovement.create({
          data: {
            projectId,
            materialId,
            quantity: -quantity, // Egreso
            type,
            performedById: userId,
            taskId,
            purchaseOrderId,
          },
        });

        // Ingreso al destino (cantidad positiva)
        const destMovement = await tx.stockMovement.create({
          data: {
            projectId: toProjectId,
            materialId,
            quantity, // Ingreso
            type,
            performedById: userId,
            taskId,
            purchaseOrderId,
          },
          include: { material: true, project: true },
        });

        return { sourceStock, destStock, sourceMovement, destMovement };
      }

      throw new BadRequestException(`Tipo de movimiento '${type}' no soportado.`);
    });
  }
}
