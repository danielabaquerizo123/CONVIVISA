import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { CreateRequisitionDto } from './dto/create-requisition.dto';
import { UpdateRequisitionStatusDto } from './dto/update-requisition-status.dto';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { CreateReceptionDto } from './dto/create-reception.dto';
import { RequisitionStatus, OrderStatus, MovementType, ReceptionStatus } from '@prisma/client';
import { FinanceService } from '../finance/finance.service';

@Injectable()
export class PurchasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly financeService: FinanceService,
  ) {}

  // -------------------------------------------------------------
  // CATÁLOGO DE PROVEEDORES (CRUD)
  // -------------------------------------------------------------

  async createSupplier(createSupplierDto: CreateSupplierDto) {
    const { name, taxId, email, phone, address, paymentTerms, rating } = createSupplierDto;

    // RUC/RFC/NIT único
    const existing = await this.prisma.supplier.findUnique({ where: { taxId } });
    if (existing) {
      throw new ConflictException(`El proveedor con ID tributario '${taxId}' ya está registrado.`);
    }

    return this.prisma.supplier.create({
      data: {
        name,
        taxId,
        email,
        phone,
        address,
        paymentTerms,
        rating: rating || 5.0,
      },
    });
  }

  async findAllSuppliers() {
    return this.prisma.supplier.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findOneSupplier(id: string) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id },
      include: {
        orders: true,
      },
    });

    if (!supplier) {
      throw new NotFoundException(`Proveedor con ID ${id} no encontrado.`);
    }

    return supplier;
  }

  async updateSupplier(id: string, updateSupplierDto: UpdateSupplierDto) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id } });
    if (!supplier) {
      throw new NotFoundException(`Proveedor con ID ${id} no encontrado.`);
    }

    const { taxId, ...rest } = updateSupplierDto;
    const updateData: any = { ...rest };

    if (taxId && taxId !== supplier.taxId) {
      const existing = await this.prisma.supplier.findUnique({ where: { taxId } });
      if (existing) {
        throw new ConflictException(`El proveedor con ID tributario '${taxId}' ya está registrado.`);
      }
      updateData.taxId = taxId;
    }

    return this.prisma.supplier.update({
      where: { id },
      data: updateData,
    });
  }

  async removeSupplier(id: string) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id } });
    if (!supplier) {
      throw new NotFoundException(`Proveedor con ID ${id} no encontrado.`);
    }

    return this.prisma.supplier.delete({ where: { id } });
  }

  // -------------------------------------------------------------
  // REQUISICIONES DESDE OBRA
  // -------------------------------------------------------------

  async createRequisition(dto: CreateRequisitionDto, userId: string) {
    const { projectId, items } = dto;

    // Validar proyecto
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      throw new NotFoundException(`El proyecto con ID ${projectId} no existe.`);
    }

    // Validar materiales
    for (const item of items) {
      const material = await this.prisma.material.findUnique({ where: { id: item.materialId } });
      if (!material) {
        throw new NotFoundException(`El material con ID ${item.materialId} no existe.`);
      }
    }

    return this.prisma.purchaseRequisition.create({
      data: {
        projectId,
        requestedById: userId,
        status: RequisitionStatus.PENDING,
        items: {
          create: items.map(item => ({
            materialId: item.materialId,
            quantity: item.quantity,
          })),
        },
      },
      include: {
        items: { include: { material: true } },
        project: true,
        requestedBy: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });
  }

  async findAllRequisitions() {
    return this.prisma.purchaseRequisition.findMany({
      include: {
        project: true,
        requestedBy: { select: { id: true, email: true, firstName: true, lastName: true } },
        items: { include: { material: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneRequisition(id: string) {
    const req = await this.prisma.purchaseRequisition.findUnique({
      where: { id },
      include: {
        project: true,
        requestedBy: { select: { id: true, email: true, firstName: true, lastName: true } },
        approvedBy: { select: { id: true, email: true, firstName: true, lastName: true } },
        items: { include: { material: true } },
        orders: true,
      },
    });

    if (!req) {
      throw new NotFoundException(`Requisición con ID ${id} no encontrada.`);
    }

    return req;
  }

  async updateRequisitionStatus(id: string, dto: UpdateRequisitionStatusDto, userId: string) {
    const req = await this.prisma.purchaseRequisition.findUnique({ where: { id } });
    if (!req) {
      throw new NotFoundException(`Requisición con ID ${id} no encontrada.`);
    }

    if (req.status !== RequisitionStatus.PENDING) {
      throw new BadRequestException(`No se puede modificar el estado de una requisición que ya está ${req.status}.`);
    }

    // Segregación de funciones: impedir auto-aprobación
    if (req.requestedById === userId) {
      throw new BadRequestException(
        'Segregación de funciones: El creador de la requisición no puede ser quien la apruebe o rechace.',
      );
    }

    return this.prisma.purchaseRequisition.update({
      where: { id },
      data: {
        status: dto.status,
        approvedById: userId,
      },
      include: {
        project: true,
        approvedBy: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });
  }

  // -------------------------------------------------------------
  // ÓRDENES DE COMPRA
  // -------------------------------------------------------------

  async createPurchaseOrder(dto: CreatePurchaseOrderDto) {
    const { supplierId, requisitionId, items } = dto;

    // Validar proveedor
    const supplier = await this.prisma.supplier.findUnique({ where: { id: supplierId } });
    if (!supplier) {
      throw new NotFoundException(`Proveedor con ID ${supplierId} no existe.`);
    }

    // Validar requisición si existe
    if (requisitionId) {
      const req = await this.prisma.purchaseRequisition.findUnique({ where: { id: requisitionId } });
      if (!req) {
        throw new NotFoundException(`Requisición con ID ${requisitionId} no existe.`);
      }
      if (req.status !== RequisitionStatus.APPROVED) {
        throw new BadRequestException(`Solo se pueden generar órdenes de compra para requisiciones en estado APPROVED. Estado actual: ${req.status}`);
      }
    }

    // Validar e ingresar artículos, calculando el totalAmount
    let total = 0;
    for (const item of items) {
      const material = await this.prisma.material.findUnique({ where: { id: item.materialId } });
      if (!material) {
        throw new NotFoundException(`El material con ID ${item.materialId} no existe en catálogo.`);
      }
      total += item.quantity * item.unitPrice;
    }

    // Transacción interactiva para crear la PO y transicionar la requisición
    return this.prisma.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.create({
        data: {
          supplierId,
          requisitionId,
          status: OrderStatus.DRAFT,
          totalAmount: total,
          items: {
            create: items.map(item => ({
              materialId: item.materialId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
            })),
          },
        },
        include: {
          items: { include: { material: true } },
          supplier: true,
        },
      });

      if (requisitionId) {
        // Transicionar la requisición a ORDERED
        await tx.purchaseRequisition.update({
          where: { id: requisitionId },
          data: { status: RequisitionStatus.ORDERED },
        });
      }

      return po;
    });
  }

  async findAllPurchaseOrders() {
    return this.prisma.purchaseOrder.findMany({
      include: {
        supplier: true,
        requisition: { include: { project: true } },
        items: { include: { material: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOnePurchaseOrder(id: string) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: true,
        requisition: { include: { project: true } },
        items: { include: { material: true } },
        receptions: { include: { items: { include: { material: true } } } },
      },
    });

    if (!po) {
      throw new NotFoundException(`Orden de compra con ID ${id} no encontrada.`);
    }

    return po;
  }

  async updateOrderStatus(id: string, dto: UpdateOrderStatusDto) {
    const po = await this.prisma.purchaseOrder.findUnique({ where: { id } });
    if (!po) {
      throw new NotFoundException(`Orden de compra con ID ${id} no encontrada.`);
    }

    if (po.status !== OrderStatus.DRAFT && dto.status === OrderStatus.CANCELLED) {
      throw new BadRequestException(`No se puede cancelar una orden de compra que ya está en estado ${po.status}.`);
    }

    return this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: dto.status },
      include: { supplier: true },
    });
  }

  // -------------------------------------------------------------
  // RECEPCIONES DE ALMACÉN
  // -------------------------------------------------------------

  async registerReception(dto: CreateReceptionDto, userId: string) {
    const { purchaseOrderId, items } = dto;

    // 1. Validar existencia y estado de la orden de compra
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id: purchaseOrderId },
      include: {
        requisition: true,
        items: true,
      },
    });

    if (!po) {
      throw new NotFoundException(`La orden de compra con ID ${purchaseOrderId} no existe.`);
    }

    if (po.status !== OrderStatus.SENT && po.status !== OrderStatus.PARTIALLY_RECEIVED) {
      throw new BadRequestException(
        `No se pueden recibir materiales en una orden con estado ${po.status}. Debe estar SENT o PARTIALLY_RECEIVED.`,
      );
    }

    // 2. Determinar el proyecto destino a partir de la requisición original
    if (!po.requisitionId || !po.requisition) {
      throw new BadRequestException(
        `La orden de compra no cuenta con una requisición vinculada válida para determinar la obra destino.`,
      );
    }
    const projectId = po.requisition.projectId;

    // 3. Ejecutar transacción interactiva en base de datos
    return this.prisma.$transaction(async (tx) => {
      
      // A. Validar sobre-recepción antes de aplicar cambios
      // Consolidar cantidades conformes ya recibidas previamente para esta orden
      const priorReceptions = await tx.reception.findMany({
        where: { purchaseOrderId },
        include: { items: true },
      });

      const previousConforms: { [materialId: string]: number } = {};
      for (const rec of priorReceptions) {
        for (const recItem of rec.items) {
          if (recItem.status === ReceptionStatus.CONFORM) {
            previousConforms[recItem.materialId] =
              (previousConforms[recItem.materialId] || 0) + recItem.quantityReceived;
          }
        }
      }

      // Validar cada ítem que ingresa
      for (const item of items) {
        if (item.status === ReceptionStatus.CONFORM) {
          const orderedItem = po.items.find(poItem => poItem.materialId === item.materialId);
          if (!orderedItem) {
            throw new BadRequestException(`El material con ID ${item.materialId} no forma parte de la orden de compra.`);
          }
          const alreadyReceived = previousConforms[item.materialId] || 0;
          const newTotal = alreadyReceived + item.quantityReceived;
          
          if (newTotal > orderedItem.quantity) {
            throw new BadRequestException(
              `Sobre-recepción detectada para el material: Se ordenaron ${orderedItem.quantity} unidades, ya se recibieron ${alreadyReceived} conformes, e intentas recibir ${item.quantityReceived} más (Total: ${newTotal}). Operación denegada.`,
            );
          }
        }
      }

      // B. Crear registro principal de recepción
      const reception = await tx.reception.create({
        data: {
          purchaseOrderId,
          receivedById: userId,
          items: {
            create: items.map(item => ({
              materialId: item.materialId,
              quantityReceived: item.quantityReceived,
              status: item.status,
            })),
          },
        },
        include: {
          items: true,
        },
      });

      // C. Incrementar el stock en obra y registrar movimiento de inventario SOLO para ítems recibidos conformes (CONFORM)
      let totalConformAmount = 0;
      for (const item of items) {
        // Validar material
        const material = await tx.material.findUnique({ where: { id: item.materialId } });
        if (!material) {
          throw new NotFoundException(`El material con ID ${item.materialId} no existe en catálogo.`);
        }

        if (item.status === ReceptionStatus.CONFORM) {
          // Obtener el precio unitario pactado para el cálculo de costo real
          const poItem = po.items.find(pi => pi.materialId === item.materialId);
          const unitPrice = poItem ? Number(poItem.unitPrice) : 0;
          totalConformAmount += item.quantityReceived * unitPrice;

          // Incremento atómico (utilizando upsert atómico de base de datos)
          await tx.warehouseStock.upsert({
            where: {
              projectId_materialId: { projectId, materialId: item.materialId },
            },
            update: {
              quantity: { increment: item.quantityReceived },
            },
            create: {
              projectId,
              materialId: item.materialId,
              quantity: item.quantityReceived,
            },
          });

          // Registrar movimiento de stock del tipo RECEIPT con trazabilidad (enlace a la PO)
          await tx.stockMovement.create({
            data: {
              projectId,
              materialId: item.materialId,
              quantity: item.quantityReceived,
              type: MovementType.RECEIPT,
              performedById: userId,
              purchaseOrderId: purchaseOrderId,
            },
          });
        }
      }

      // D. Verificar si la orden de compra ya se completó o quedó parcialmente recibida
      const allReceptions = await tx.reception.findMany({
        where: { purchaseOrderId },
        include: { items: true },
      });

      // Consolidar cantidades recibidas conformes (CONFORM) por material
      const receivedTotals: { [materialId: string]: number } = {};
      let totalConformReceived = 0;
      for (const rec of allReceptions) {
        for (const recItem of rec.items) {
          if (recItem.status === ReceptionStatus.CONFORM) {
            receivedTotals[recItem.materialId] =
              (receivedTotals[recItem.materialId] || 0) + recItem.quantityReceived;
            totalConformReceived += recItem.quantityReceived;
          }
        }
      }

      // Comparar lo recibido conforme contra lo ordenado
      let allCompleted = true;
      for (const orderItem of po.items) {
        const received = receivedTotals[orderItem.materialId] || 0;
        if (received < orderItem.quantity) {
          allCompleted = false;
        }
      }

      // Determinar nuevo estado de la Orden
      let newStatus = po.status;
      if (allCompleted) {
        newStatus = OrderStatus.COMPLETED;
      } else if (totalConformReceived > 0) {
        newStatus = OrderStatus.PARTIALLY_RECEIVED;
      }

      let updatedPo = po;
      if (newStatus !== po.status) {
        updatedPo = await tx.purchaseOrder.update({
          where: { id: purchaseOrderId },
          data: { status: newStatus },
          include: { requisition: true, items: true },
        });
      }

      // E. Si hay entrega conforme, registrar Cuenta por Pagar, IVA y Costo de Materiales atómicamente (Three-Way Matching)
      if (totalConformAmount > 0) {
        await this.financeService.createPayableFromReception(
          tx,
          reception.id,
          purchaseOrderId,
          po.supplierId,
          projectId,
          totalConformAmount,
          reception.receivedAt,
        );
      }

      return { reception, purchaseOrder: updatedPo };
    });
  }

  async findAllReceptions() {
    return this.prisma.reception.findMany({
      include: {
        purchaseOrder: { include: { supplier: true } },
        receivedBy: { select: { id: true, email: true, firstName: true, lastName: true } },
        items: { include: { material: true } },
      },
      orderBy: { receivedAt: 'desc' },
    });
  }
}
