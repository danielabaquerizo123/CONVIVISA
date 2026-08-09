import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("❌ Error: La variable de entorno DATABASE_URL no está definida.");
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function countTable(model: any): Promise<number> {
  try {
    return await model.count();
  } catch {
    return -1;
  }
}

async function verify() {
  console.log("🔍 Verificación de datos semillados...\n");

  const models: { name: string; key: keyof PrismaClient }[] = [
    { name: "Permission", key: "permission" },
    { name: "Role", key: "role" },
    { name: "User", key: "user" },
    { name: "Employee", key: "employee" },
    { name: "Project", key: "project" },
    { name: "ProjectBudget", key: "projectBudget" },
    { name: "Task", key: "task" },
    { name: "Attendance", key: "attendance" },
    { name: "Asset", key: "asset" },
    { name: "AssetAssignment", key: "assetAssignment" },
    { name: "Supplier", key: "supplier" },
    { name: "Material", key: "material" },
    { name: "WarehouseStock", key: "warehouseStock" },
    { name: "StockMovement", key: "stockMovement" },
    { name: "PurchaseRequisition", key: "purchaseRequisition" },
    { name: "RequisitionItem", key: "requisitionItem" },
    { name: "PurchaseOrder", key: "purchaseOrder" },
    { name: "PurchaseOrderItem", key: "purchaseOrderItem" },
    { name: "Reception", key: "reception" },
    { name: "ReceptionItem", key: "receptionItem" },
    { name: "CostTransaction", key: "costTransaction" },
    { name: "AccountReceivable", key: "accountReceivable" },
    { name: "AccountPayable", key: "accountPayable" },
    { name: "TaxRecord", key: "taxRecord" },
    { name: "AuditLog", key: "auditLog" },
    { name: "SystemConfig", key: "systemConfig" },
  ];

  let problems: string[] = [];

  const rows: { Modelo: string; Registros: number }[] = [];
  for (const m of models) {
    const count = await countTable(prisma[m.key]);
    rows.push({ Modelo: m.name, Registros: count });
    if (count < 0) {
      problems.push(`${m.name}: no se pudo contar (¿existe el modelo?)`);
    }
  }

  console.table(rows);

  // ----------------------------------------------------------
  // Comprobaciones de integridad
  // ----------------------------------------------------------

  // 1. Usuario administrador funcional
  const admin = await prisma.user.findUnique({ where: { email: "admin@consvivisa.com" } });
  if (admin) {
    console.log(`✅ Usuario admin: ${admin.email} (rol ${admin.roleId})`);
  } else {
    problems.push("No existe el usuario admin@consvivisa.com");
  }

  // 2. Roles esperados
  const roleNames = await prisma.role.findMany({ select: { name: true } });
  const expectedRoles = ["ADMIN", "INGENIERO_RESIDENTE", "FINANCIERO", "DIRECTIVO"];
  for (const role of expectedRoles) {
    if (!roleNames.some((r) => r.name === role)) {
      problems.push(`Falta el rol ${role}`);
    }
  }
  console.log(`✅ Roles presentes: ${roleNames.map((r) => r.name).join(", ")}`);

  // 3. Duplicados por campos únicos (no deberían existir)
  const emailCount = await prisma.user.count({ where: {} });
  const distinctEmails = (await prisma.user.findMany({ select: { email: true } })).length;
  if (emailCount !== distinctEmails) problems.push("Hay emails de usuario duplicados");
  console.log(`✅ Usuarios: ${emailCount} | emails únicos: ${distinctEmails}`);

  const rucCount = await prisma.supplier.count();
  const distinctRuc = (await prisma.supplier.findMany({ select: { taxId: true } })).length;
  if (rucCount !== distinctRuc) problems.push("Hay RUC de proveedores duplicados");

  const skuCount = await prisma.material.count();
  const distinctSku = (await prisma.material.findMany({ select: { sku: true } })).length;
  if (skuCount !== distinctSku) problems.push("Hay SKU de materiales duplicados");

  // 4. Relaciones: cada proyecto debe tener residente válido
  const projects = await prisma.project.findMany({
    include: { residentEngineer: { select: { id: true } } },
  });
  const projectsWithoutResident = projects.filter((p) => !p.residentEngineer);
  if (projectsWithoutResident.length > 0) {
    problems.push(`Hay ${projectsWithoutResident.length} proyectos sin residente válido`);
  }
  console.log(`✅ ${projects.length} proyectos, todos con residente válido`);

  // 5. Órdenes de compra vs ítems: sumatoria de ítems = total
  const orders = await prisma.purchaseOrder.findMany({ select: { id: true, totalAmount: true } });
  const orderItems = await prisma.purchaseOrderItem.findMany({
    select: { purchaseOrderId: true, quantity: true, unitPrice: true },
  });
  const totals: Record<string, number> = {};
  for (const item of orderItems) {
    totals[item.purchaseOrderId] = (totals[item.purchaseOrderId] ?? 0) + Number(item.quantity) * Number(item.unitPrice);
  }
  for (const order of orders) {
    const sumItems = totals[order.id] ?? 0;
    const diff = Math.abs(sumItems - Number(order.totalAmount));
    if (diff > 0.01) {
      problems.push(`OC ${order.id}: total ${Number(order.totalAmount)} != suma de ítems ${sumItems}`);
    }
  }
  console.log(`✅ ${orders.length} órdenes de compra cuadradas contra sus ítems`);

  // 6. Presupuestos: totalPlanned = suma de partidas
  const budgets = await prisma.projectBudget.findMany();
  for (const b of budgets) {
    const sum =
      Number(b.materialsPlanned) +
      Number(b.laborPlanned) +
      Number(b.subcontractsPlanned) +
      Number(b.equipmentPlanned);
    if (Math.abs(sum - Number(b.totalPlanned)) > 0.01) {
      problems.push(`Presupuesto ${b.projectId}: totalPlanned ${b.totalPlanned} != suma ${sum}`);
    }
  }
  console.log(`✅ ${budgets.length} presupuestos cuadrados (total = suma de partidas)`);

  // 7. Registros fiscales: taxAmount = amount * taxRate
  const taxRecords = await prisma.taxRecord.findMany();
  for (const t of taxRecords) {
    const expected = Number(t.amount) * t.taxRate;
    if (Math.abs(expected - Number(t.taxAmount)) > 0.01) {
      problems.push(`Registro fiscal ${t.id}: taxAmount ${t.taxAmount} != amount*taxRate ${expected}`);
    }
  }
  console.log(`✅ ${taxRecords.length} registros fiscales coherentes (taxAmount = amount * taxRate)`);

  // 8. Cuentas por cobrar/pagar sin duplicados de factura
  const receivableInvoices = await prisma.accountReceivable.findMany({ select: { invoiceNumber: true } });
  const payableInvoices = await prisma.accountPayable.findMany({ select: { invoiceNumber: true } });
  if (new Set(receivableInvoices.map((r) => r.invoiceNumber)).size !== receivableInvoices.length) {
    problems.push("Facturas de cuentas por cobrar duplicadas");
  }
  if (new Set(payableInvoices.map((r) => r.invoiceNumber)).size !== payableInvoices.length) {
    problems.push("Facturas de cuentas por pagar duplicadas");
  }

  // 9. Referencias fiscales existentes
  const orphanTax = await prisma.taxRecord.count({
    where: {
      OR: [
        { receivableId: { not: null } },
        { payableId: { not: null } },
      ],
    },
  });
  console.log(`✅ ${orphanTax} registros fiscales vinculados a CxC/CxP`);

  console.log("\n────────────────────────────────────────────");
  if (problems.length === 0) {
    console.log("✅ ✅ ✅ VERIFICACIÓN CORRECTA: sin problemas detectados.");
  } else {
    console.log("⚠️  PROBLEMAS DETECTADOS:");
    for (const p of problems) console.log(`   - ${p}`);
    process.exitCode = 1;
  }
}

verify()
  .catch((e) => {
    console.error("❌ Error durante la verificación:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
