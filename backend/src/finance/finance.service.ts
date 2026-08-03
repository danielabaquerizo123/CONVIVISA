import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { RegisterPayrollPaymentDto } from './dto/register-payroll-payment.dto';
import { CreateReceivableDto } from './dto/create-receivable.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { CostCategory, PaymentStatus, TaxTransactionType } from '@prisma/client';

const getIvaRate = (): number => {
  const envRate = process.env.IVA_RATE;
  if (envRate) {
    const rate = parseFloat(envRate);
    if (!isNaN(rate)) {
      return rate;
    }
  }
  return 0.15; // Tasa por defecto corregida al 15%
};

@Injectable()
export class FinanceService {
  constructor(private readonly prisma: PrismaService) {}

  // =============================================================
  // GESTIÓN DE PRESUPUESTOS (ProjectBudget)
  // =============================================================

  async createBudget(dto: CreateBudgetDto) {
    const { projectId, materialsPlanned, laborPlanned, subcontractsPlanned, equipmentPlanned } = dto;

    // Verificar si el proyecto existe
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      throw new NotFoundException(`El proyecto con ID ${projectId} no existe.`);
    }

    // Verificar si ya existe un presupuesto para el proyecto
    const existing = await this.prisma.projectBudget.findUnique({ where: { projectId } });
    if (existing) {
      throw new ConflictException(`El proyecto con ID ${projectId} ya tiene un presupuesto asignado.`);
    }

    const totalPlanned = materialsPlanned + laborPlanned + subcontractsPlanned + equipmentPlanned;

    return this.prisma.projectBudget.create({
      data: {
        projectId,
        materialsPlanned,
        laborPlanned,
        subcontractsPlanned,
        equipmentPlanned,
        totalPlanned,
      },
      include: {
        project: true,
      },
    });
  }

  async getBudgetByProject(projectId: string) {
    const budget = await this.prisma.projectBudget.findUnique({
      where: { projectId },
      include: { project: true },
    });

    if (!budget) {
      throw new NotFoundException(`No existe presupuesto registrado para el proyecto con ID ${projectId}.`);
    }

    return budget;
  }

  async updateBudget(projectId: string, dto: UpdateBudgetDto) {
    const budget = await this.prisma.projectBudget.findUnique({ where: { projectId } });
    if (!budget) {
      throw new NotFoundException(`No existe presupuesto registrado para el proyecto con ID ${projectId}.`);
    }

    const materialsPlanned = dto.materialsPlanned !== undefined ? dto.materialsPlanned : Number(budget.materialsPlanned);
    const laborPlanned = dto.laborPlanned !== undefined ? dto.laborPlanned : Number(budget.laborPlanned);
    const subcontractsPlanned = dto.subcontractsPlanned !== undefined ? dto.subcontractsPlanned : Number(budget.subcontractsPlanned);
    const equipmentPlanned = dto.equipmentPlanned !== undefined ? dto.equipmentPlanned : Number(budget.equipmentPlanned);

    const totalPlanned = materialsPlanned + laborPlanned + subcontractsPlanned + equipmentPlanned;

    return this.prisma.projectBudget.update({
      where: { projectId },
      data: {
        materialsPlanned,
        laborPlanned,
        subcontractsPlanned,
        equipmentPlanned,
        totalPlanned,
      },
      include: {
        project: true,
      },
    });
  }

  // =============================================================
  // TRANSACCIONES DE COSTO Y COMPARATIVA
  // =============================================================

  async registerPayrollPayment(dto: RegisterPayrollPaymentDto) {
    const { projectId, amount, description, date, employeeId } = dto;

    // Validar proyecto
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      throw new NotFoundException(`El proyecto con ID ${projectId} no existe.`);
    }

    // Si se especifica empleado, validar
    if (employeeId) {
      const employee = await this.prisma.employee.findUnique({ where: { id: employeeId } });
      if (!employee) {
        throw new NotFoundException(`El empleado con ID ${employeeId} no existe.`);
      }
    }

    return this.prisma.costTransaction.create({
      data: {
        projectId,
        category: CostCategory.LABOR,
        amount,
        description,
        date: new Date(date),
        referenceId: employeeId || null,
      },
      include: {
        project: true,
      },
    });
  }

  async getBudgetComparison(projectId: string) {
    // Validar proyecto
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      throw new NotFoundException(`El proyecto con ID ${projectId} no existe.`);
    }

    // Obtener presupuesto
    const budget = await this.prisma.projectBudget.findUnique({
      where: { projectId },
    });

    // Obtener transacciones de costo real
    const actualCosts = await this.prisma.costTransaction.findMany({
      where: { projectId },
    });

    // Consolidar costos reales por categoría
    let actualMaterials = 0;
    let actualLabor = 0;
    let actualSubcontracts = 0;
    let actualEquipment = 0;

    for (const cost of actualCosts) {
      const amt = Number(cost.amount);
      if (cost.category === CostCategory.MATERIAL) actualMaterials += amt;
      else if (cost.category === CostCategory.LABOR) actualLabor += amt;
      else if (cost.category === CostCategory.SUBCONTRACT) actualSubcontracts += amt;
      else if (cost.category === CostCategory.EQUIPMENT) actualEquipment += amt;
    }

    const totalActual = actualMaterials + actualLabor + actualSubcontracts + actualEquipment;

    const planned = budget ? {
      materials: Number(budget.materialsPlanned),
      labor: Number(budget.laborPlanned),
      subcontracts: Number(budget.subcontractsPlanned),
      equipment: Number(budget.equipmentPlanned),
      total: Number(budget.totalPlanned),
    } : {
      materials: 0,
      labor: 0,
      subcontracts: 0,
      equipment: 0,
      total: 0,
    };

    return {
      projectId,
      projectName: project.name,
      planned,
      actual: {
        materials: actualMaterials,
        labor: actualLabor,
        subcontracts: actualSubcontracts,
        equipment: actualEquipment,
        total: totalActual,
      },
      deviation: {
        materials: actualMaterials - planned.materials,
        labor: actualLabor - planned.labor,
        subcontracts: actualSubcontracts - planned.subcontracts,
        equipment: actualEquipment - planned.equipment,
        total: totalActual - planned.total,
      },
    };
  }

  // =============================================================
  // INTEGRADOR: GATILLO DE CUENTAS POR PAGAR (Three-Way Matching)
  // =============================================================

  async createPayableFromReception(
    tx: any,
    receptionId: string,
    purchaseOrderId: string,
    supplierId: string,
    projectId: string,
    totalConformAmount: number,
    receivedAt: Date,
  ) {
    // 1. Registrar Cuenta por Pagar (AccountPayable)
    // Usamos el cliente transaccional provisto 'tx' para enforzar atomicidad total
    const payable = await tx.accountPayable.create({
      data: {
        purchaseOrderId,
        supplierId,
        invoiceNumber: `FAC-REC-${receptionId.substring(0, 8).toUpperCase()}`,
        amount: totalConformAmount,
        dueDate: new Date(receivedAt.getTime() + 30 * 24 * 60 * 60 * 1000), // Vencimiento default: 30 días
        status: PaymentStatus.PENDING,
      },
    });

    // 2. Registrar el devengo de impuesto (IVA configurable, por defecto 15%)
    const taxRate = getIvaRate();
    const taxAmount = totalConformAmount * taxRate;
    await tx.taxRecord.create({
      data: {
        transactionType: TaxTransactionType.EXPENSE,
        amount: totalConformAmount,
        taxAmount,
        taxRate,
        date: receivedAt,
        payableId: payable.id,
      },
    });

    // 3. Registrar la transacción de costo real de MATERIAL asociada a la obra
    await tx.costTransaction.create({
      data: {
        projectId,
        category: CostCategory.MATERIAL,
        amount: totalConformAmount,
        description: `Costo de materiales conformes recibidos. OC: ${purchaseOrderId}, Recepción: ${receptionId}`,
        date: receivedAt,
        referenceId: receptionId,
      },
    });

    return payable;
  }

  // =============================================================
  // CUENTAS POR PAGAR (PAGOS A PROVEEDORES)
  // =============================================================

  async findAllPayables() {
    return this.prisma.accountPayable.findMany({
      include: {
        supplier: true,
        purchaseOrder: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOnePayable(id: string) {
    const payable = await this.prisma.accountPayable.findUnique({
      where: { id },
      include: {
        supplier: true,
        purchaseOrder: true,
        taxRecords: true,
      },
    });

    if (!payable) {
      throw new NotFoundException(`Cuenta por pagar con ID ${id} no encontrada.`);
    }

    return payable;
  }

  async recordPayablePayment(id: string, dto: RecordPaymentDto) {
    const payable = await this.prisma.accountPayable.findUnique({ where: { id } });
    if (!payable) {
      throw new NotFoundException(`Cuenta por pagar con ID ${id} no encontrada.`);
    }

    if (payable.status === PaymentStatus.PAID) {
      throw new BadRequestException('Esta cuenta por pagar ya fue liquidada.');
    }

    return this.prisma.accountPayable.update({
      where: { id },
      data: {
        status: PaymentStatus.PAID,
        paidAt: new Date(dto.paidAt),
      },
      include: {
        supplier: true,
      },
    });
  }

  // =============================================================
  // CUENTAS POR COBRAR (PLANILLAS DE COBRO DE CLIENTES)
  // =============================================================

  async createReceivable(dto: CreateReceivableDto) {
    const { projectId, invoiceNumber, amount, description, dueDate } = dto;

    // Validar proyecto
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      throw new NotFoundException(`El proyecto con ID ${projectId} no existe.`);
    }

    const defaultInvoiceNumber = invoiceNumber || `FAC-CLI-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    return this.prisma.$transaction(async (tx) => {
      const receivable = await tx.accountReceivable.create({
        data: {
          projectId,
          invoiceNumber: defaultInvoiceNumber,
          amount,
          description,
          dueDate: new Date(dueDate),
          status: PaymentStatus.PENDING,
        },
        include: {
          project: true,
        },
      });

      // Registrar IVA devengado por el ingreso (configurable, por defecto 15%)
      const taxRate = getIvaRate();
      const taxAmount = amount * taxRate;
      await tx.taxRecord.create({
        data: {
          transactionType: TaxTransactionType.INCOME,
          amount,
          taxAmount,
          taxRate,
          date: new Date(),
          receivableId: receivable.id,
        },
      });

      return receivable;
    });
  }

  async findAllReceivables() {
    return this.prisma.accountReceivable.findMany({
      include: {
        project: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneReceivable(id: string) {
    const receivable = await this.prisma.accountReceivable.findUnique({
      where: { id },
      include: {
        project: true,
        taxRecords: true,
      },
    });

    if (!receivable) {
      throw new NotFoundException(`Cuenta por cobrar con ID ${id} no encontrada.`);
    }

    return receivable;
  }

  async recordReceivableCollection(id: string, dto: RecordPaymentDto) {
    const receivable = await this.prisma.accountReceivable.findUnique({ where: { id } });
    if (!receivable) {
      throw new NotFoundException(`Cuenta por cobrar con ID ${id} no encontrada.`);
    }

    if (receivable.status === PaymentStatus.PAID) {
      throw new BadRequestException('Esta cuenta por cobrar ya fue pagada.');
    }

    return this.prisma.accountReceivable.update({
      where: { id },
      data: {
        status: PaymentStatus.PAID,
        paidAt: new Date(dto.paidAt),
      },
      include: {
        project: true,
      },
    });
  }
}
