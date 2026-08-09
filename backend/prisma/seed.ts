import "dotenv/config";
import { PrismaClient, Prisma } from "@prisma/client";
import {
  UserStatus,
  EmployeeStatus,
  ProjectStatus,
  TaskStatus,
  AssetType,
  AssetStatus,
  MovementType,
  RequisitionStatus,
  OrderStatus,
  ReceptionStatus,
  CostCategory,
  PaymentStatus,
  TaxTransactionType,
} from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as bcrypt from "bcryptjs";

// ==========================================================
// CONFIGURACIÓN DE PRISMA 7 (misma estrategia que PrismaService)
// ==========================================================
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("❌ Error: La variable de entorno DATABASE_URL no está definida.");
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Credenciales de prueba (solo para entorno de desarrollo)
const DEFAULT_PASSWORD = "AdminPassword123";
const ADMIN_EMAIL = "admin@consvivisa.com";

const d = (iso: string) => new Date(iso);

// ==========================================================
// DATOS DE PRUEBA DETERMINÍSTICOS
// ==========================================================

// ---------- USUARIOS (10: el admin + 9 de prueba) ----------
type UserSeed = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roleId: string; // placeholder del rol (se resuelve a su ID real)
  status: UserStatus;
};
const usersToSeed: UserSeed[] = [
  {
    id: "seed-usr-01",
    email: "evelyn.salazar@consvivisa.com",
    firstName: "Evelyn",
    lastName: "Salazar",
    roleId: "seed-role-admin", // se resuelve al ID real del rol ADMIN
    status: UserStatus.ACTIVE,
  },
  {
    id: "seed-usr-02",
    email: "armando.quispe@consvivisa.com",
    firstName: "Armando",
    lastName: "Quispe",
    roleId: "seed-role-resident",
    status: UserStatus.ACTIVE,
  },
  {
    id: "seed-usr-03",
    email: "carmen.rojas@consvivisa.com",
    firstName: "Carmen",
    lastName: "Rojas",
    roleId: "seed-role-resident",
    status: UserStatus.ACTIVE,
  },
  {
    id: "seed-usr-04",
    email: "luisa.mendoza@consvivisa.com",
    firstName: "Luisa",
    lastName: "Mendoza",
    roleId: "seed-role-resident",
    status: UserStatus.ACTIVE,
  },
  {
    id: "seed-usr-05",
    email: "maria.fernandez@consvivisa.com",
    firstName: "María",
    lastName: "Fernández",
    roleId: "seed-role-finance",
    status: UserStatus.ACTIVE,
  },
  {
    id: "seed-usr-06",
    email: "raul.castillo@consvivisa.com",
    firstName: "Raúl",
    lastName: "Castillo",
    roleId: "seed-role-finance",
    status: UserStatus.ACTIVE,
  },
  {
    id: "seed-usr-07",
    email: "sofia.benitez@consvivisa.com",
    firstName: "Sofía",
    lastName: "Benítez",
    roleId: "seed-role-finance",
    status: UserStatus.ACTIVE,
  },
  {
    id: "seed-usr-08",
    email: "gabriela.medina@consvivisa.com",
    firstName: "Gabriela",
    lastName: "Medina",
    roleId: "seed-role-director",
    status: UserStatus.ACTIVE,
  },
  {
    id: "seed-usr-09",
    email: "jorge.villalba@consvivisa.com",
    firstName: "Jorge",
    lastName: "Villalba",
    roleId: "seed-role-director",
    status: UserStatus.ACTIVE,
  },
];

// ---------- EMPLEADOS (10) ----------
type EmployeeSeed = Prisma.EmployeeUncheckedCreateInput & { id?: string };
const employeesToSeed: EmployeeSeed[] = [
  { id: "seed-emp-01", firstName: "Armando", lastName: "Quispe", documentId: "0912345678", email: "armando.quispe@consvivisa.com", phone: "0987654321", status: EmployeeStatus.ACTIVE, userId: "seed-usr-02" },
  { id: "seed-emp-02", firstName: "Carmen", lastName: "Rojas", documentId: "0987654321", email: "carmen.rojas@consvivisa.com", phone: "0991234567", status: EmployeeStatus.ACTIVE, userId: "seed-usr-03" },
  { id: "seed-emp-03", firstName: "Luisa", lastName: "Mendoza", documentId: "1712345670", email: "luisa.mendoza@consvivisa.com", phone: "0992345678", status: EmployeeStatus.ACTIVE, userId: "seed-usr-04" },
  { id: "seed-emp-04", firstName: "María", lastName: "Fernández", documentId: "1723456789", email: "maria.fernandez@consvivisa.com", phone: "0983456789", status: EmployeeStatus.ACTIVE, userId: "seed-usr-05" },
  { id: "seed-emp-05", firstName: "Raúl", lastName: "Castillo", documentId: "1701234567", email: "raul.castillo@consvivisa.com", phone: "0984567890", status: EmployeeStatus.ACTIVE, userId: "seed-usr-06" },
  { id: "seed-emp-06", firstName: "Sofía", lastName: "Benítez", documentId: "0913456789", email: "sofia.benitez@consvivisa.com", phone: "0995678901", status: EmployeeStatus.ACTIVE, userId: "seed-usr-07" },
  { id: "seed-emp-07", firstName: "Diego", lastName: "Paredes", documentId: "1756789012", email: "diego.paredes@consvivisa.com", phone: "0986789012", status: EmployeeStatus.ON_LEAVE, userId: null },
  { id: "seed-emp-08", firstName: "Rosa", lastName: "Salinas", documentId: "1767890123", email: "rosa.salinas@consvivisa.com", phone: "0997890123", status: EmployeeStatus.ACTIVE, userId: null },
  { id: "seed-emp-09", firstName: "Luis", lastName: "Chávez", documentId: "1778901234", email: "luis.chavez@consvivisa.com", phone: "0988901234", status: EmployeeStatus.ACTIVE, userId: null },
  { id: "seed-emp-10", firstName: "Ana", lastName: "Gutiérrez", documentId: "1789012345", email: "ana.gutierrez@consvivisa.com", phone: "0999012345", status: EmployeeStatus.INACTIVE, userId: null },
];

// ---------- PROVEEDORES (10) ----------
type SupplierSeed = Prisma.SupplierUncheckedCreateInput & { id?: string };
const suppliersToSeed: SupplierSeed[] = [
  { id: "seed-sup-01", name: "Hormigones del Ecuador S.A.", taxId: "1792001234001", email: "ventas@hormigonesec.com", phone: "04-2500123", address: "Av. de las Industrias Km 4.5, Guayaquil", rating: 4.8, paymentTerms: "30 días" },
  { id: "seed-sup-02", name: "Acero Nacional Cía. Ltda.", taxId: "1790012345001", email: "compras@aceronacional.com", phone: "02-2400456", address: "Parque Industrial Quito, Calle B", rating: 4.5, paymentTerms: "15 días" },
  { id: "seed-sup-03", name: "Ferretería La Palma S.A.", taxId: "1791234567001", email: "la.palma@ferreterialapalma.com", phone: "02-2340567", address: "Av. América y Río Coca, Quito", rating: 4.2, paymentTerms: "contado" },
  { id: "seed-sup-04", name: "Cemento Andino S.A.", taxId: "1793456789001", email: "ventas@cementoandino.com", phone: "02-4009876", address: "Planta Cuenca, Panamericana Norte", rating: 4.7, paymentTerms: "30 días" },
  { id: "seed-sup-05", name: "Materiales de Construcción Ríos Cía. Ltda.", taxId: "1795678901001", email: "info@riosmateriales.com", phone: "04-6001122", address: "Av. Francisco de Orellana, Guayaquil", rating: 4.0, paymentTerms: "15 días" },
  { id: "seed-sup-06", name: "Tubacero S.A.", taxId: "1797890123001", email: "comercial@tubacero.com", phone: "02-2455667", address: "Av. Cóndor Ñan, Quito", rating: 4.6, paymentTerms: "45 días" },
  { id: "seed-sup-07", name: "Pinturas Andinas S.A.", taxId: "1799012345001", email: "ventas@pinturasandinas.com", phone: "02-2891234", address: "Panamericana Sur Km 12, Quito", rating: 4.3, paymentTerms: "30 días" },
  { id: "seed-sup-08", name: "Láminas y Cubiertas Plus", taxId: "0992345678001", email: "ventas@laminasplus.com", phone: "04-2156789", address: "Av. Juan Tanca Marengo, Guayaquil", rating: 4.1, paymentTerms: "60 días" },
  { id: "seed-sup-09", name: "Arenera del Pacífico", taxId: "0993456789001", email: "ventas@arenerapac.com", phone: "04-2334567", address: "Vía Daule Km 8, Guayaquil", rating: 3.9, paymentTerms: "contado" },
  { id: "seed-sup-10", name: "Equipos y Maquinaria CM S.A.", taxId: "0994567890001", email: "rentas@maquinariacm.com", phone: "04-2445678", address: "Vía Perimetral, Guayaquil", rating: 4.4, paymentTerms: "30 días" },
];

// ---------- MATERIALES (10) ----------
type MaterialSeed = Prisma.MaterialUncheckedCreateInput & { id?: string };
const materialsToSeed: MaterialSeed[] = [
  { id: "seed-mat-01", name: "Cemento Portland Tipo I", unit: "sacos", sku: "MAT-0001", unitPrice: 7.5 },
  { id: "seed-mat-02", name: "Arena lavada", unit: "m3", sku: "MAT-0002", unitPrice: 22.0 },
  { id: "seed-mat-03", name: "Ripio triturado 3/4\"", unit: "m3", sku: "MAT-0003", unitPrice: 18.5 },
  { id: "seed-mat-04", name: "Acero corrugado 12mm", unit: "quintal", sku: "MAT-0004", unitPrice: 58.0 },
  { id: "seed-mat-05", name: "Bloque de hormigón 15x20x40", unit: "unidad", sku: "MAT-0005", unitPrice: 0.85 },
  { id: "seed-mat-06", name: "Varilla 8mm", unit: "quintal", sku: "MAT-0006", unitPrice: 42.0 },
  { id: "seed-mat-07", name: "Malla electrosoldada 6mm", unit: "m2", sku: "MAT-0007", unitPrice: 3.25 },
  { id: "seed-mat-08", name: "Pintura látex interior blanca", unit: "galón", sku: "MAT-0008", unitPrice: 12.9 },
  { id: "seed-mat-09", name: "Tubería PVC 110mm", unit: "unidad", sku: "MAT-0009", unitPrice: 6.75 },
  { id: "seed-mat-10", name: "Alambre galvanizado #18", unit: "kg", sku: "MAT-0010", unitPrice: 2.4 },
];

// ---------- ACTIVOS (10) ----------
type AssetSeed = Prisma.AssetUncheckedCreateInput & { id?: string };
const assetsToSeed: AssetSeed[] = [
  { id: "seed-asset-01", name: "Excavadora Caterpillar 320D", code: "EQ-001", type: AssetType.MACHINERY, status: AssetStatus.IN_USE, lastMaintenance: d("2026-05-20T00:00:00Z") },
  { id: "seed-asset-02", name: "Retroexcavadora JCB 3CX", code: "EQ-002", type: AssetType.MACHINERY, status: AssetStatus.IN_USE, lastMaintenance: d("2026-04-10T00:00:00Z") },
  { id: "seed-asset-03", name: "Camión volquete Hino 8m3", code: "VH-001", type: AssetType.VEHICLE, status: AssetStatus.AVAILABLE, lastMaintenance: d("2026-06-01T00:00:00Z") },
  { id: "seed-asset-04", name: "Camioneta Toyota Hilux 4x4", code: "VH-002", type: AssetType.VEHICLE, status: AssetStatus.IN_USE, lastMaintenance: d("2026-05-15T00:00:00Z") },
  { id: "seed-asset-05", name: "Mezcladora de concreto 9p3", code: "EQ-003", type: AssetType.MACHINERY, status: AssetStatus.MAINTENANCE, lastMaintenance: d("2026-03-01T00:00:00Z") },
  { id: "seed-asset-06", name: "Vibrador de concreto", code: "TL-001", type: AssetType.TOOL, status: AssetStatus.AVAILABLE, lastMaintenance: d("2026-02-20T00:00:00Z") },
  { id: "seed-asset-07", name: "Cortadora de pavimento", code: "TL-002", type: AssetType.TOOL, status: AssetStatus.IN_USE, lastMaintenance: d("2025-12-05T00:00:00Z") },
  { id: "seed-asset-08", name: "Compresor Atlas Copco", code: "EQ-004", type: AssetType.MACHINERY, status: AssetStatus.AVAILABLE, lastMaintenance: d("2026-04-25T00:00:00Z") },
  { id: "seed-asset-09", name: "Grúa pluma 5TN", code: "EQ-005", type: AssetType.MACHINERY, status: AssetStatus.IN_USE, lastMaintenance: d("2026-03-30T00:00:00Z") },
  { id: "seed-asset-10", name: "Andamio modular (juego)", code: "TL-003", type: AssetType.TOOL, status: AssetStatus.AVAILABLE, lastMaintenance: d("2026-01-10T00:00:00Z") },
];

// ---------- PROYECTOS (10) ----------
type ProjectSeed = {
  id: string;
  name: string;
  location: string;
  startDate: Date;
  endDate: Date | null;
  estimatedBudget: number;
  status: ProjectStatus;
  residentEngineerId: string;
  employeeIds: string[];
};
const projectsToSeed: ProjectSeed[] = [
  { id: "seed-proj-01", name: "Edificio Residencial Altamar", location: "Guayaquil, Samborondón", startDate: d("2026-01-15T00:00:00Z"), endDate: d("2027-06-30T00:00:00Z"), estimatedBudget: 1850000.0, status: ProjectStatus.IN_PROGRESS, residentEngineerId: "seed-emp-01", employeeIds: ["seed-emp-01", "seed-emp-07", "seed-emp-10"] },
  { id: "seed-proj-02", name: "Condominio Los Pinos", location: "Quito, Cumbayá", startDate: d("2025-11-01T00:00:00Z"), endDate: d("2026-12-15T00:00:00Z"), estimatedBudget: 2400000.0, status: ProjectStatus.IN_PROGRESS, residentEngineerId: "seed-emp-02", employeeIds: ["seed-emp-02", "seed-emp-08"] },
  { id: "seed-proj-03", name: "Centro Comercial Plaza Norte", location: "Quito, Calderón", startDate: d("2026-03-01T00:00:00Z"), endDate: d("2027-09-30T00:00:00Z"), estimatedBudget: 3200000.0, status: ProjectStatus.IN_PROGRESS, residentEngineerId: "seed-emp-01", employeeIds: ["seed-emp-01", "seed-emp-09"] },
  { id: "seed-proj-04", name: "Urbanización El Vergel", location: "Guayaquil, Vía a la Costa", startDate: d("2025-08-10T00:00:00Z"), endDate: d("2026-05-20T00:00:00Z"), estimatedBudget: 980000.0, status: ProjectStatus.COMPLETED, residentEngineerId: "seed-emp-02", employeeIds: ["seed-emp-02", "seed-emp-07"] },
  { id: "seed-proj-05", name: "Hospital del Sur", location: "Cuenca, Av. del Paraíso", startDate: d("2026-05-15T00:00:00Z"), endDate: d("2028-03-31T00:00:00Z"), estimatedBudget: 5600000.0, status: ProjectStatus.PLANNING, residentEngineerId: "seed-emp-08", employeeIds: ["seed-emp-08", "seed-emp-03"] },
  { id: "seed-proj-06", name: "Torre Empresarial Horizonte", location: "Quito, La Carolina", startDate: d("2026-02-01T00:00:00Z"), endDate: d("2027-10-30T00:00:00Z"), estimatedBudget: 4150000.0, status: ProjectStatus.IN_PROGRESS, residentEngineerId: "seed-emp-01", employeeIds: ["seed-emp-01", "seed-emp-04"] },
  { id: "seed-proj-07", name: "Colegio San Martín", location: "Ambato, Av. de los Guaytambos", startDate: d("2026-04-01T00:00:00Z"), endDate: d("2027-02-28T00:00:00Z"), estimatedBudget: 1250000.0, status: ProjectStatus.PLANNING, residentEngineerId: "seed-emp-08", employeeIds: ["seed-emp-08"] },
  { id: "seed-proj-08", name: "Parque Industrial Oeste", location: "Guayaquil, Vía Perimetral", startDate: d("2025-06-15T00:00:00Z"), endDate: d("2026-01-10T00:00:00Z"), estimatedBudget: 2100000.0, status: ProjectStatus.COMPLETED, residentEngineerId: "seed-emp-02", employeeIds: ["seed-emp-02", "seed-emp-09"] },
  { id: "seed-proj-09", name: "Remodelación Hotel Mar Azul", location: "Manta, Malecón", startDate: d("2026-07-01T00:00:00Z"), endDate: d("2026-11-30T00:00:00Z"), estimatedBudget: 640000.0, status: ProjectStatus.ON_HOLD, residentEngineerId: "seed-emp-01", employeeIds: ["seed-emp-01"] },
  { id: "seed-proj-10", name: "Villa Residencial La Colina", location: "Cuenca, El Cajas", startDate: d("2026-09-01T00:00:00Z"), endDate: d("2027-03-31T00:00:00Z"), estimatedBudget: 1020000.0, status: ProjectStatus.PLANNING, residentEngineerId: "seed-emp-08", employeeIds: ["seed-emp-08", "seed-emp-03"] },
];

// ---------- PRESUPUESTOS (10, uno por proyecto) ----------
type BudgetSeed = Prisma.ProjectBudgetUncheckedCreateInput & { id?: string };
const budgetsToSeed: BudgetSeed[] = [
  { id: "seed-budget-01", projectId: "seed-proj-01", totalPlanned: 1850000.0, materialsPlanned: 740000.0, laborPlanned: 610000.0, subcontractsPlanned: 250000.0, equipmentPlanned: 250000.0 },
  { id: "seed-budget-02", projectId: "seed-proj-02", totalPlanned: 2400000.0, materialsPlanned: 1100000.0, laborPlanned: 750000.0, subcontractsPlanned: 300000.0, equipmentPlanned: 250000.0 },
  { id: "seed-budget-03", projectId: "seed-proj-03", totalPlanned: 3200000.0, materialsPlanned: 1500000.0, laborPlanned: 950000.0, subcontractsPlanned: 450000.0, equipmentPlanned: 300000.0 },
  { id: "seed-budget-04", projectId: "seed-proj-04", totalPlanned: 980000.0, materialsPlanned: 460000.0, laborPlanned: 320000.0, subcontractsPlanned: 120000.0, equipmentPlanned: 80000.0 },
  { id: "seed-budget-05", projectId: "seed-proj-05", totalPlanned: 5600000.0, materialsPlanned: 2400000.0, laborPlanned: 1800000.0, subcontractsPlanned: 900000.0, equipmentPlanned: 500000.0 },
  { id: "seed-budget-06", projectId: "seed-proj-06", totalPlanned: 4150000.0, materialsPlanned: 1900000.0, laborPlanned: 1250000.0, subcontractsPlanned: 600000.0, equipmentPlanned: 400000.0 },
  { id: "seed-budget-07", projectId: "seed-proj-07", totalPlanned: 1250000.0, materialsPlanned: 600000.0, laborPlanned: 400000.0, subcontractsPlanned: 150000.0, equipmentPlanned: 100000.0 },
  { id: "seed-budget-08", projectId: "seed-proj-08", totalPlanned: 2100000.0, materialsPlanned: 950000.0, laborPlanned: 700000.0, subcontractsPlanned: 250000.0, equipmentPlanned: 200000.0 },
  { id: "seed-budget-09", projectId: "seed-proj-09", totalPlanned: 640000.0, materialsPlanned: 290000.0, laborPlanned: 220000.0, subcontractsPlanned: 80000.0, equipmentPlanned: 50000.0 },
  { id: "seed-budget-10", projectId: "seed-proj-10", totalPlanned: 1020000.0, materialsPlanned: 480000.0, laborPlanned: 340000.0, subcontractsPlanned: 120000.0, equipmentPlanned: 80000.0 },
];

// ---------- TAREAS (10) ----------
type TaskSeed = Prisma.TaskUncheckedCreateInput & { id?: string };
const tasksToSeed: TaskSeed[] = [
  { id: "seed-task-01", projectId: "seed-proj-01", name: "Cimentación del bloque A", phase: "Cimentación", startDate: d("2026-01-20T00:00:00Z"), endDate: d("2026-03-15T00:00:00Z"), progress: 60, status: TaskStatus.IN_PROGRESS },
  { id: "seed-task-02", projectId: "seed-proj-01", name: "Obra negra niveles 1-4", phase: "Obra Negra", startDate: d("2026-04-01T00:00:00Z"), endDate: null, progress: 0, status: TaskStatus.PENDING },
  { id: "seed-task-03", projectId: "seed-proj-02", name: "Estructura del parqueadero", phase: "Estructura", startDate: d("2025-12-01T00:00:00Z"), endDate: d("2026-04-30T00:00:00Z"), progress: 40, status: TaskStatus.IN_PROGRESS },
  { id: "seed-task-04", projectId: "seed-proj-02", name: "Instalaciones hidrosanitarias", phase: "Instalaciones", startDate: d("2026-06-01T00:00:00Z"), endDate: null, progress: 0, status: TaskStatus.PENDING },
  { id: "seed-task-05", projectId: "seed-proj-03", name: "Excavación y movimientos de tierra", phase: "Preparación", startDate: d("2026-03-01T00:00:00Z"), endDate: d("2026-05-30T00:00:00Z"), progress: 100, status: TaskStatus.COMPLETED },
  { id: "seed-task-06", projectId: "seed-proj-04", name: "Acabados exteriores", phase: "Acabados", startDate: d("2025-12-10T00:00:00Z"), endDate: d("2026-03-20T00:00:00Z"), progress: 100, status: TaskStatus.COMPLETED },
  { id: "seed-task-07", projectId: "seed-proj-05", name: "Estudios y permisos", phase: "Gestión", startDate: d("2026-05-15T00:00:00Z"), endDate: null, progress: 25, status: TaskStatus.IN_PROGRESS },
  { id: "seed-task-08", projectId: "seed-proj-06", name: "Estructura torre niveles 5-8", phase: "Estructura", startDate: d("2026-03-10T00:00:00Z"), endDate: d("2026-09-30T00:00:00Z"), progress: 35, status: TaskStatus.IN_PROGRESS },
  { id: "seed-task-09", projectId: "seed-proj-08", name: "Pavimentación de patios", phase: "Urbanización", startDate: d("2025-09-01T00:00:00Z"), endDate: d("2025-11-30T00:00:00Z"), progress: 100, status: TaskStatus.COMPLETED },
  { id: "seed-task-10", projectId: "seed-proj-09", name: "Demolición y vaciado", phase: "Preparación", startDate: d("2026-07-01T00:00:00Z"), endDate: d("2026-08-31T00:00:00Z"), progress: 50, status: TaskStatus.IN_PROGRESS },
];

// ---------- ASISTENCIAS (10) ----------
type AttendanceSeed = Prisma.AttendanceUncheckedCreateInput & { id?: string };
const attendancesToSeed: AttendanceSeed[] = [
  { id: "seed-att-01", employeeId: "seed-emp-01", projectId: "seed-proj-01", checkIn: d("2026-07-06T12:45:00Z"), checkOut: d("2026-07-06T22:00:00Z"), date: d("2026-07-06T00:00:00Z") },
  { id: "seed-att-02", employeeId: "seed-emp-07", projectId: "seed-proj-01", checkIn: d("2026-07-06T13:00:00Z"), checkOut: d("2026-07-06T21:30:00Z"), date: d("2026-07-06T00:00:00Z") },
  { id: "seed-att-03", employeeId: "seed-emp-08", projectId: "seed-proj-02", checkIn: d("2026-07-06T12:50:00Z"), checkOut: d("2026-07-06T22:10:00Z"), date: d("2026-07-06T00:00:00Z") },
  { id: "seed-att-04", employeeId: "seed-emp-09", projectId: "seed-proj-03", checkIn: d("2026-07-07T12:30:00Z"), checkOut: d("2026-07-07T21:45:00Z"), date: d("2026-07-07T00:00:00Z") },
  { id: "seed-att-05", employeeId: "seed-emp-10", projectId: "seed-proj-01", checkIn: d("2026-07-07T13:10:00Z"), checkOut: d("2026-07-07T22:00:00Z"), date: d("2026-07-07T00:00:00Z") },
  { id: "seed-att-06", employeeId: "seed-emp-01", projectId: "seed-proj-01", checkIn: d("2026-07-07T12:40:00Z"), checkOut: d("2026-07-07T21:50:00Z"), date: d("2026-07-07T00:00:00Z") },
  { id: "seed-att-07", employeeId: "seed-emp-08", projectId: "seed-proj-02", checkIn: d("2026-07-07T13:00:00Z"), checkOut: d("2026-07-07T22:00:00Z"), date: d("2026-07-07T00:00:00Z") },
  { id: "seed-att-08", employeeId: "seed-emp-07", projectId: "seed-proj-01", checkIn: d("2026-07-08T13:05:00Z"), checkOut: d("2026-07-08T21:40:00Z"), date: d("2026-07-08T00:00:00Z") },
  { id: "seed-att-09", employeeId: "seed-emp-09", projectId: "seed-proj-03", checkIn: d("2026-07-08T12:45:00Z"), checkOut: d("2026-07-08T22:05:00Z"), date: d("2026-07-08T00:00:00Z") },
  { id: "seed-att-10", employeeId: "seed-emp-02", projectId: "seed-proj-02", checkIn: d("2026-07-08T12:55:00Z"), checkOut: d("2026-07-08T21:30:00Z"), date: d("2026-07-08T00:00:00Z") },
];

// ---------- ASIGNACIONES DE ACTIVOS (10) ----------
type AssetAssignmentSeed = Prisma.AssetAssignmentUncheckedCreateInput & { id?: string };
const assetAssignmentsToSeed: AssetAssignmentSeed[] = [
  { id: "seed-aa-01", assetId: "seed-asset-01", projectId: "seed-proj-01", assignedById: "seed-usr-01", assignedAt: d("2026-01-20T00:00:00Z"), returnedAt: null, notes: "Uso continuo en excavaciones" },
  { id: "seed-aa-02", assetId: "seed-asset-02", projectId: "seed-proj-03", assignedById: "seed-usr-02", assignedAt: d("2026-03-05T00:00:00Z"), returnedAt: null, notes: null },
  { id: "seed-aa-03", assetId: "seed-asset-04", projectId: "seed-proj-02", assignedById: "seed-usr-03", assignedAt: d("2026-01-10T00:00:00Z"), returnedAt: null, notes: "Movilización del residente" },
  { id: "seed-aa-04", assetId: "seed-asset-03", projectId: "seed-proj-08", assignedById: "seed-usr-02", assignedAt: d("2025-07-01T00:00:00Z"), returnedAt: d("2026-01-10T00:00:00Z"), notes: "Devuelto al concluir obra" },
  { id: "seed-aa-05", assetId: "seed-asset-05", projectId: "seed-proj-02", assignedById: "seed-usr-03", assignedAt: d("2025-12-10T00:00:00Z"), returnedAt: d("2026-03-01T00:00:00Z"), notes: "Enviado a mantenimiento" },
  { id: "seed-aa-06", assetId: "seed-asset-09", projectId: "seed-proj-06", assignedById: "seed-usr-02", assignedAt: d("2026-04-01T00:00:00Z"), returnedAt: null, notes: null },
  { id: "seed-aa-07", assetId: "seed-asset-07", projectId: "seed-proj-08", assignedById: "seed-usr-03", assignedAt: d("2025-09-15T00:00:00Z"), returnedAt: d("2025-12-20T00:00:00Z"), notes: null },
  { id: "seed-aa-08", assetId: "seed-asset-08", projectId: "seed-proj-03", assignedById: "seed-usr-01", assignedAt: d("2026-03-15T00:00:00Z"), returnedAt: null, notes: null },
  { id: "seed-aa-09", assetId: "seed-asset-06", projectId: "seed-proj-04", assignedById: "seed-usr-02", assignedAt: d("2025-10-01T00:00:00Z"), returnedAt: d("2026-05-20T00:00:00Z"), notes: null },
  { id: "seed-aa-10", assetId: "seed-asset-10", projectId: "seed-proj-01", assignedById: "seed-usr-03", assignedAt: d("2026-02-10T00:00:00Z"), returnedAt: null, notes: null },
];

// ---------- STOCK EN BODEGA (10) ----------
type StockSeed = Prisma.WarehouseStockUncheckedCreateInput & { id?: string };
const stocksToSeed: StockSeed[] = [
  { id: "seed-stock-01", projectId: "seed-proj-01", materialId: "seed-mat-01", quantity: 170, minStock: 100 },
  { id: "seed-stock-02", projectId: "seed-proj-01", materialId: "seed-mat-04", quantity: 150, minStock: 50 },
  { id: "seed-stock-03", projectId: "seed-proj-02", materialId: "seed-mat-01", quantity: 200, minStock: 100 },
  { id: "seed-stock-04", projectId: "seed-proj-02", materialId: "seed-mat-02", quantity: 120, minStock: 40 },
  { id: "seed-stock-05", projectId: "seed-proj-03", materialId: "seed-mat-01", quantity: 350, minStock: 150 },
  { id: "seed-stock-06", projectId: "seed-proj-03", materialId: "seed-mat-05", quantity: 8000, minStock: 2000 },
  { id: "seed-stock-07", projectId: "seed-proj-06", materialId: "seed-mat-04", quantity: 90, minStock: 40 },
  { id: "seed-stock-08", projectId: "seed-proj-06", materialId: "seed-mat-07", quantity: 600, minStock: 200 },
  { id: "seed-stock-09", projectId: "seed-proj-08", materialId: "seed-mat-03", quantity: 45, minStock: 60 },
  { id: "seed-stock-10", projectId: "seed-proj-01", materialId: "seed-mat-02", quantity: 30, minStock: 15 },
];

// ---------- REQUISICIONES DE COMPRA (10) ----------
type RequisitionSeed = Prisma.PurchaseRequisitionUncheckedCreateInput & { id?: string };
const requisitionsToSeed: RequisitionSeed[] = [
  { id: "seed-req-01", projectId: "seed-proj-01", requestedById: "seed-usr-02", status: RequisitionStatus.ORDERED, approvedById: "seed-usr-06", createdAt: d("2026-01-10T00:00:00Z") },
  { id: "seed-req-02", projectId: "seed-proj-02", requestedById: "seed-usr-03", status: RequisitionStatus.ORDERED, approvedById: "seed-usr-06", createdAt: d("2025-11-20T00:00:00Z") },
  { id: "seed-req-03", projectId: "seed-proj-02", requestedById: "seed-usr-03", status: RequisitionStatus.ORDERED, approvedById: "seed-usr-06", createdAt: d("2026-01-05T00:00:00Z") },
  { id: "seed-req-04", projectId: "seed-proj-03", requestedById: "seed-usr-02", status: RequisitionStatus.ORDERED, approvedById: "seed-usr-06", createdAt: d("2026-03-01T00:00:00Z") },
  { id: "seed-req-05", projectId: "seed-proj-03", requestedById: "seed-usr-02", status: RequisitionStatus.APPROVED, approvedById: "seed-usr-06", createdAt: d("2026-03-08T00:00:00Z") },
  { id: "seed-req-06", projectId: "seed-proj-06", requestedById: "seed-usr-04", status: RequisitionStatus.ORDERED, approvedById: "seed-usr-06", createdAt: d("2026-03-25T00:00:00Z") },
  { id: "seed-req-07", projectId: "seed-proj-01", requestedById: "seed-usr-02", status: RequisitionStatus.PENDING, approvedById: null, createdAt: d("2026-07-05T00:00:00Z") },
  { id: "seed-req-08", projectId: "seed-proj-05", requestedById: "seed-usr-04", status: RequisitionStatus.PENDING, approvedById: null, createdAt: d("2026-07-02T00:00:00Z") },
  { id: "seed-req-09", projectId: "seed-proj-09", requestedById: "seed-usr-02", status: RequisitionStatus.REJECTED, approvedById: "seed-usr-01", createdAt: d("2026-06-30T00:00:00Z") },
  { id: "seed-req-10", projectId: "seed-proj-10", requestedById: "seed-usr-04", status: RequisitionStatus.PENDING, approvedById: null, createdAt: d("2026-07-06T00:00:00Z") },
];

// ---------- ITEMS DE REQUISICIÓN (10) ----------
type RequisitionItemSeed = Prisma.RequisitionItemUncheckedCreateInput & { id?: string };
const requisitionItemsToSeed: RequisitionItemSeed[] = [
  { id: "seed-reqitem-01", requisitionId: "seed-req-01", materialId: "seed-mat-01", quantity: 200 },
  { id: "seed-reqitem-02", requisitionId: "seed-req-02", materialId: "seed-mat-01", quantity: 150 },
  { id: "seed-reqitem-03", requisitionId: "seed-req-03", materialId: "seed-mat-02", quantity: 120 },
  { id: "seed-reqitem-04", requisitionId: "seed-req-04", materialId: "seed-mat-01", quantity: 350 },
  { id: "seed-reqitem-05", requisitionId: "seed-req-05", materialId: "seed-mat-05", quantity: 8000 },
  { id: "seed-reqitem-06", requisitionId: "seed-req-06", materialId: "seed-mat-04", quantity: 90 },
  { id: "seed-reqitem-07", requisitionId: "seed-req-07", materialId: "seed-mat-02", quantity: 60 },
  { id: "seed-reqitem-08", requisitionId: "seed-req-08", materialId: "seed-mat-07", quantity: 400 },
  { id: "seed-reqitem-09", requisitionId: "seed-req-09", materialId: "seed-mat-09", quantity: 80 },
  { id: "seed-reqitem-10", requisitionId: "seed-req-10", materialId: "seed-mat-08", quantity: 50 },
];

// ---------- ÓRDENES DE COMPRA (10) ----------
type PurchaseOrderSeed = Prisma.PurchaseOrderUncheckedCreateInput & { id?: string };
const purchaseOrdersToSeed: PurchaseOrderSeed[] = [
  { id: "seed-po-01", requisitionId: "seed-req-01", supplierId: "seed-sup-01", status: OrderStatus.COMPLETED, totalAmount: 1500.0 },
  { id: "seed-po-02", requisitionId: "seed-req-02", supplierId: "seed-sup-02", status: OrderStatus.COMPLETED, totalAmount: 1125.0 },
  { id: "seed-po-03", requisitionId: "seed-req-03", supplierId: "seed-sup-09", status: OrderStatus.COMPLETED, totalAmount: 2640.0 },
  { id: "seed-po-04", requisitionId: "seed-req-04", supplierId: "seed-sup-04", status: OrderStatus.COMPLETED, totalAmount: 2625.0 },
  { id: "seed-po-05", requisitionId: "seed-req-05", supplierId: "seed-sup-05", status: OrderStatus.SENT, totalAmount: 6800.0 },
  { id: "seed-po-06", requisitionId: "seed-req-06", supplierId: "seed-sup-02", status: OrderStatus.COMPLETED, totalAmount: 5220.0 },
  { id: "seed-po-07", requisitionId: null, supplierId: "seed-sup-06", status: OrderStatus.COMPLETED, totalAmount: 740.0 },
  { id: "seed-po-08", requisitionId: null, supplierId: "seed-sup-07", status: OrderStatus.DRAFT, totalAmount: 774.0 },
  { id: "seed-po-09", requisitionId: null, supplierId: "seed-sup-03", status: OrderStatus.PARTIALLY_RECEIVED, totalAmount: 675.0 },
  { id: "seed-po-10", requisitionId: null, supplierId: "seed-sup-10", status: OrderStatus.COMPLETED, totalAmount: 5040.0 },
];

// ---------- ITEMS DE ÓRDENES DE COMPRA (10) ----------
type PurchaseOrderItemSeed = Prisma.PurchaseOrderItemUncheckedCreateInput & { id?: string };
const purchaseOrderItemsToSeed: PurchaseOrderItemSeed[] = [
  { id: "seed-poitem-01", purchaseOrderId: "seed-po-01", materialId: "seed-mat-01", quantity: 200, unitPrice: 7.5 },
  { id: "seed-poitem-02", purchaseOrderId: "seed-po-02", materialId: "seed-mat-01", quantity: 150, unitPrice: 7.5 },
  { id: "seed-poitem-03", purchaseOrderId: "seed-po-03", materialId: "seed-mat-02", quantity: 120, unitPrice: 22.0 },
  { id: "seed-poitem-04", purchaseOrderId: "seed-po-04", materialId: "seed-mat-01", quantity: 350, unitPrice: 7.5 },
  { id: "seed-poitem-05", purchaseOrderId: "seed-po-05", materialId: "seed-mat-05", quantity: 8000, unitPrice: 0.85 },
  { id: "seed-poitem-06", purchaseOrderId: "seed-po-06", materialId: "seed-mat-04", quantity: 90, unitPrice: 58.0 },
  { id: "seed-poitem-07", purchaseOrderId: "seed-po-07", materialId: "seed-mat-03", quantity: 40, unitPrice: 18.5 },
  { id: "seed-poitem-08", purchaseOrderId: "seed-po-08", materialId: "seed-mat-08", quantity: 60, unitPrice: 12.9 },
  { id: "seed-poitem-09", purchaseOrderId: "seed-po-09", materialId: "seed-mat-09", quantity: 100, unitPrice: 6.75 },
  { id: "seed-poitem-10", purchaseOrderId: "seed-po-10", materialId: "seed-mat-06", quantity: 120, unitPrice: 42.0 },
];

// ---------- RECEPCIONES (10) ----------
type ReceptionSeed = Prisma.ReceptionUncheckedCreateInput & { id?: string };
const receptionsToSeed: ReceptionSeed[] = [
  { id: "seed-rec-01", purchaseOrderId: "seed-po-01", receivedById: "seed-usr-02", receivedAt: d("2026-01-22T00:00:00Z") },
  { id: "seed-rec-02", purchaseOrderId: "seed-po-02", receivedById: "seed-usr-03", receivedAt: d("2025-12-05T00:00:00Z") },
  { id: "seed-rec-03", purchaseOrderId: "seed-po-03", receivedById: "seed-usr-03", receivedAt: d("2026-01-15T00:00:00Z") },
  { id: "seed-rec-04", purchaseOrderId: "seed-po-04", receivedById: "seed-usr-02", receivedAt: d("2026-03-10T00:00:00Z") },
  { id: "seed-rec-05", purchaseOrderId: "seed-po-06", receivedById: "seed-usr-04", receivedAt: d("2026-04-05T00:00:00Z") },
  { id: "seed-rec-06", purchaseOrderId: "seed-po-07", receivedById: "seed-usr-04", receivedAt: d("2026-05-20T00:00:00Z") },
  { id: "seed-rec-07", purchaseOrderId: "seed-po-10", receivedById: "seed-usr-04", receivedAt: d("2026-06-01T00:00:00Z") },
  { id: "seed-rec-08", purchaseOrderId: "seed-po-04", receivedById: "seed-usr-02", receivedAt: d("2026-03-22T00:00:00Z") },
  { id: "seed-rec-09", purchaseOrderId: "seed-po-02", receivedById: "seed-usr-03", receivedAt: d("2026-01-10T00:00:00Z") },
  { id: "seed-rec-10", purchaseOrderId: "seed-po-09", receivedById: "seed-usr-02", receivedAt: d("2026-06-15T00:00:00Z") },
];

// ---------- ITEMS DE RECEPCIÓN (10) ----------
type ReceptionItemSeed = Prisma.ReceptionItemUncheckedCreateInput & { id?: string };
const receptionItemsToSeed: ReceptionItemSeed[] = [
  { id: "seed-recitem-01", receptionId: "seed-rec-01", materialId: "seed-mat-01", quantityReceived: 200, status: ReceptionStatus.CONFORM },
  { id: "seed-recitem-02", receptionId: "seed-rec-02", materialId: "seed-mat-01", quantityReceived: 100, status: ReceptionStatus.CONFORM },
  { id: "seed-recitem-03", receptionId: "seed-rec-03", materialId: "seed-mat-02", quantityReceived: 120, status: ReceptionStatus.CONFORM },
  { id: "seed-recitem-04", receptionId: "seed-rec-04", materialId: "seed-mat-01", quantityReceived: 200, status: ReceptionStatus.CONFORM },
  { id: "seed-recitem-05", receptionId: "seed-rec-05", materialId: "seed-mat-04", quantityReceived: 90, status: ReceptionStatus.CONFORM },
  { id: "seed-recitem-06", receptionId: "seed-rec-06", materialId: "seed-mat-03", quantityReceived: 40, status: ReceptionStatus.CONFORM },
  { id: "seed-recitem-07", receptionId: "seed-rec-07", materialId: "seed-mat-06", quantityReceived: 120, status: ReceptionStatus.CONFORM },
  { id: "seed-recitem-08", receptionId: "seed-rec-08", materialId: "seed-mat-01", quantityReceived: 150, status: ReceptionStatus.CONFORM },
  { id: "seed-recitem-09", receptionId: "seed-rec-09", materialId: "seed-mat-01", quantityReceived: 50, status: ReceptionStatus.DISCREPANCY },
  { id: "seed-recitem-10", receptionId: "seed-rec-10", materialId: "seed-mat-09", quantityReceived: 60, status: ReceptionStatus.DEFECTIVE },
];

// ---------- MOVIMIENTOS DE STOCK (10) ----------
type StockMovementSeed = Prisma.StockMovementUncheckedCreateInput & { id?: string };
const stockMovementsToSeed: StockMovementSeed[] = [
  { id: "seed-mov-01", projectId: "seed-proj-01", materialId: "seed-mat-01", quantity: 250, type: MovementType.RECEIPT, performedById: "seed-usr-02", taskId: null, purchaseOrderId: "seed-po-01", createdAt: d("2026-01-22T00:00:00Z") },
  { id: "seed-mov-02", projectId: "seed-proj-01", materialId: "seed-mat-01", quantity: 80, type: MovementType.CONSUMPTION, performedById: "seed-usr-02", taskId: "seed-task-01", purchaseOrderId: null, createdAt: d("2026-02-10T00:00:00Z") },
  { id: "seed-mov-03", projectId: "seed-proj-02", materialId: "seed-mat-01", quantity: 200, type: MovementType.RECEIPT, performedById: "seed-usr-03", taskId: null, purchaseOrderId: "seed-po-02", createdAt: d("2025-12-05T00:00:00Z") },
  { id: "seed-mov-04", projectId: "seed-proj-02", materialId: "seed-mat-02", quantity: 120, type: MovementType.RECEIPT, performedById: "seed-usr-03", taskId: null, purchaseOrderId: "seed-po-03", createdAt: d("2026-01-15T00:00:00Z") },
  { id: "seed-mov-05", projectId: "seed-proj-03", materialId: "seed-mat-01", quantity: 350, type: MovementType.RECEIPT, performedById: "seed-usr-02", taskId: null, purchaseOrderId: "seed-po-04", createdAt: d("2026-03-10T00:00:00Z") },
  { id: "seed-mov-06", projectId: "seed-proj-03", materialId: "seed-mat-05", quantity: 8000, type: MovementType.RECEIPT, performedById: "seed-usr-02", taskId: null, purchaseOrderId: "seed-po-05", createdAt: d("2026-03-18T00:00:00Z") },
  { id: "seed-mov-07", projectId: "seed-proj-06", materialId: "seed-mat-04", quantity: 90, type: MovementType.RECEIPT, performedById: "seed-usr-04", taskId: null, purchaseOrderId: "seed-po-06", createdAt: d("2026-04-05T00:00:00Z") },
  { id: "seed-mov-08", projectId: "seed-proj-08", materialId: "seed-mat-03", quantity: 30, type: MovementType.CONSUMPTION, performedById: "seed-usr-04", taskId: "seed-task-09", purchaseOrderId: null, createdAt: d("2025-10-12T00:00:00Z") },
  { id: "seed-mov-09", projectId: "seed-proj-01", materialId: "seed-mat-02", quantity: -30, type: MovementType.TRANSFER, performedById: "seed-usr-02", taskId: null, purchaseOrderId: null, createdAt: d("2026-03-20T00:00:00Z") },
  { id: "seed-mov-10", projectId: "seed-proj-03", materialId: "seed-mat-02", quantity: 30, type: MovementType.TRANSFER, performedById: "seed-usr-02", taskId: null, purchaseOrderId: null, createdAt: d("2026-03-20T00:00:00Z") },
];

// ---------- TRANSACCIONES DE COSTO (10) ----------
type CostTransactionSeed = Prisma.CostTransactionUncheckedCreateInput & { id?: string };
const costTransactionsToSeed: CostTransactionSeed[] = [
  { id: "seed-cost-01", projectId: "seed-proj-01", category: CostCategory.MATERIAL, amount: 1500.0, description: "Compra de cemento OC seed-po-01", date: d("2026-01-22T00:00:00Z"), referenceId: "seed-po-01" },
  { id: "seed-cost-02", projectId: "seed-proj-01", category: CostCategory.LABOR, amount: 24000.0, description: "Nómina semana 3 obra Edificio Altamar", date: d("2026-01-30T00:00:00Z"), referenceId: "seed-emp-07" },
  { id: "seed-cost-03", projectId: "seed-proj-02", category: CostCategory.LABOR, amount: 18500.0, description: "Nómina mensual Condominio Los Pinos", date: d("2025-12-31T00:00:00Z"), referenceId: "seed-emp-08" },
  { id: "seed-cost-04", projectId: "seed-proj-02", category: CostCategory.MATERIAL, amount: 2640.0, description: "Compra de arena OC seed-po-03", date: d("2026-01-15T00:00:00Z"), referenceId: "seed-po-03" },
  { id: "seed-cost-05", projectId: "seed-proj-03", category: CostCategory.SUBCONTRACT, amount: 45000.0, description: "Subcontrato obra gris Plaza Norte", date: d("2026-03-20T00:00:00Z"), referenceId: null },
  { id: "seed-cost-06", projectId: "seed-proj-06", category: CostCategory.EQUIPMENT, amount: 12500.0, description: "Alquiler grúa pluma torre Horizonte", date: d("2026-04-10T00:00:00Z"), referenceId: "seed-asset-09" },
  { id: "seed-cost-07", projectId: "seed-proj-08", category: CostCategory.MATERIAL, amount: 740.0, description: "Compra de ripio OC seed-po-07", date: d("2026-05-20T00:00:00Z"), referenceId: "seed-po-07" },
  { id: "seed-cost-08", projectId: "seed-proj-04", category: CostCategory.LABOR, amount: 9200.0, description: "Liquidación de mano de obra Urbanización El Vergel", date: d("2026-05-15T00:00:00Z"), referenceId: null },
  { id: "seed-cost-09", projectId: "seed-proj-09", category: CostCategory.EQUIPMENT, amount: 3800.0, description: "Mantenimiento de maquinaria Hotel Mar Azul", date: d("2026-07-05T00:00:00Z"), referenceId: "seed-asset-05" },
  { id: "seed-cost-10", projectId: "seed-proj-01", category: CostCategory.SUBCONTRACT, amount: 20000.0, description: "Subcontrato instalaciones eléctricas Altamar", date: d("2026-06-15T00:00:00Z"), referenceId: null },
];

// ---------- CUENTAS POR COBRAR (10) ----------
type ReceivableSeed = Prisma.AccountReceivableUncheckedCreateInput & { id?: string };
const receivablesToSeed: ReceivableSeed[] = [
  { id: "seed-recv-01", projectId: "seed-proj-01", invoiceNumber: "FAC-CLI-000001", amount: 250000.0, description: "Anticipo cliente Edificio Altamar", dueDate: d("2026-02-15T00:00:00Z"), status: PaymentStatus.PAID, paidAt: d("2026-02-10T00:00:00Z") },
  { id: "seed-recv-02", projectId: "seed-proj-02", invoiceNumber: "FAC-CLI-000002", amount: 180000.0, description: "Avance de obra Condominio Los Pinos", dueDate: d("2026-04-30T00:00:00Z"), status: PaymentStatus.PENDING, paidAt: null },
  { id: "seed-recv-03", projectId: "seed-proj-03", invoiceNumber: "FAC-CLI-000003", amount: 320000.0, description: "Anticipo Centro Comercial Plaza Norte", dueDate: d("2026-05-15T00:00:00Z"), status: PaymentStatus.PENDING, paidAt: null },
  { id: "seed-recv-04", projectId: "seed-proj-04", invoiceNumber: "FAC-CLI-000004", amount: 98000.0, description: "Liquidación final Urbanización El Vergel", dueDate: d("2026-06-30T00:00:00Z"), status: PaymentStatus.PAID, paidAt: d("2026-06-25T00:00:00Z") },
  { id: "seed-recv-05", projectId: "seed-proj-05", invoiceNumber: "FAC-CLI-000005", amount: 150000.0, description: "Anticipo Hospital del Sur", dueDate: d("2026-08-01T00:00:00Z"), status: PaymentStatus.PENDING, paidAt: null },
  { id: "seed-recv-06", projectId: "seed-proj-06", invoiceNumber: "FAC-CLI-000006", amount: 210000.0, description: "Avance de obra Torre Horizonte", dueDate: d("2026-06-30T00:00:00Z"), status: PaymentStatus.OVERDUE, paidAt: null },
  { id: "seed-recv-07", projectId: "seed-proj-07", invoiceNumber: "FAC-CLI-000007", amount: 125000.0, description: "Anticipo Colegio San Martín", dueDate: d("2026-07-15T00:00:00Z"), status: PaymentStatus.PENDING, paidAt: null },
  { id: "seed-recv-08", projectId: "seed-proj-08", invoiceNumber: "FAC-CLI-000008", amount: 105000.0, description: "Liquidación Parque Industrial Oeste", dueDate: d("2026-03-31T00:00:00Z"), status: PaymentStatus.PAID, paidAt: d("2026-03-28T00:00:00Z") },
  { id: "seed-recv-09", projectId: "seed-proj-09", invoiceNumber: "FAC-CLI-000009", amount: 64000.0, description: "Avance de obra Hotel Mar Azul", dueDate: d("2026-08-31T00:00:00Z"), status: PaymentStatus.PENDING, paidAt: null },
  { id: "seed-recv-10", projectId: "seed-proj-10", invoiceNumber: "FAC-CLI-000010", amount: 51000.0, description: "Anticipo Villa Residencial La Colina", dueDate: d("2026-10-15T00:00:00Z"), status: PaymentStatus.PENDING, paidAt: null },
];

// ---------- CUENTAS POR PAGAR (10) ----------
type PayableSeed = Prisma.AccountPayableUncheckedCreateInput & { id?: string };
const payablesToSeed: PayableSeed[] = [
  { id: "seed-pay-01", purchaseOrderId: "seed-po-01", supplierId: "seed-sup-01", invoiceNumber: "001-001-000001234", amount: 1500.0, dueDate: d("2026-02-21T00:00:00Z"), status: PaymentStatus.PAID, paidAt: d("2026-02-18T00:00:00Z") },
  { id: "seed-pay-02", purchaseOrderId: "seed-po-02", supplierId: "seed-sup-02", invoiceNumber: "002-001-000000876", amount: 1125.0, dueDate: d("2026-01-04T00:00:00Z"), status: PaymentStatus.PAID, paidAt: d("2026-01-02T00:00:00Z") },
  { id: "seed-pay-03", purchaseOrderId: "seed-po-03", supplierId: "seed-sup-09", invoiceNumber: "003-001-000000112", amount: 2640.0, dueDate: d("2026-02-14T00:00:00Z"), status: PaymentStatus.PAID, paidAt: d("2026-02-10T00:00:00Z") },
  { id: "seed-pay-04", purchaseOrderId: "seed-po-04", supplierId: "seed-sup-04", invoiceNumber: "004-001-000000543", amount: 2625.0, dueDate: d("2026-04-09T00:00:00Z"), status: PaymentStatus.PENDING, paidAt: null },
  { id: "seed-pay-05", purchaseOrderId: "seed-po-06", supplierId: "seed-sup-02", invoiceNumber: "002-001-000000988", amount: 5220.0, dueDate: d("2026-05-05T00:00:00Z"), status: PaymentStatus.PENDING, paidAt: null },
  { id: "seed-pay-06", purchaseOrderId: "seed-po-07", supplierId: "seed-sup-06", invoiceNumber: "005-001-000000321", amount: 740.0, dueDate: d("2026-06-19T00:00:00Z"), status: PaymentStatus.OVERDUE, paidAt: null },
  { id: "seed-pay-07", purchaseOrderId: "seed-po-10", supplierId: "seed-sup-10", invoiceNumber: "006-001-000000777", amount: 5040.0, dueDate: d("2026-07-01T00:00:00Z"), status: PaymentStatus.PENDING, paidAt: null },
  { id: "seed-pay-08", purchaseOrderId: null, supplierId: "seed-sup-03", invoiceNumber: "007-001-000000444", amount: 1230.0, dueDate: d("2026-07-15T00:00:00Z"), status: PaymentStatus.PENDING, paidAt: null },
  { id: "seed-pay-09", purchaseOrderId: null, supplierId: "seed-sup-05", invoiceNumber: "008-001-000000555", amount: 3400.0, dueDate: d("2026-06-10T00:00:00Z"), status: PaymentStatus.PAID, paidAt: d("2026-06-01T00:00:00Z") },
  { id: "seed-pay-10", purchaseOrderId: null, supplierId: "seed-sup-08", invoiceNumber: "009-001-000000666", amount: 890.0, dueDate: d("2026-07-20T00:00:00Z"), status: PaymentStatus.PENDING, paidAt: null },
];

// ---------- REGISTROS FISCALES (10: 5 INGRESOS + 5 GASTOS, IVA 15%) ----------
type TaxRecordSeed = Prisma.TaxRecordUncheckedCreateInput & { id?: string };
const taxRecordsToSeed: TaxRecordSeed[] = [
  { id: "seed-tax-01", transactionType: TaxTransactionType.INCOME, amount: 250000.0, taxAmount: 37500.0, taxRate: 0.15, date: d("2026-02-10T00:00:00Z"), receivableId: "seed-recv-01", payableId: null },
  { id: "seed-tax-02", transactionType: TaxTransactionType.INCOME, amount: 180000.0, taxAmount: 27000.0, taxRate: 0.15, date: d("2026-04-30T00:00:00Z"), receivableId: "seed-recv-02", payableId: null },
  { id: "seed-tax-03", transactionType: TaxTransactionType.INCOME, amount: 320000.0, taxAmount: 48000.0, taxRate: 0.15, date: d("2026-05-15T00:00:00Z"), receivableId: "seed-recv-03", payableId: null },
  { id: "seed-tax-04", transactionType: TaxTransactionType.INCOME, amount: 150000.0, taxAmount: 22500.0, taxRate: 0.15, date: d("2026-08-01T00:00:00Z"), receivableId: "seed-recv-05", payableId: null },
  { id: "seed-tax-05", transactionType: TaxTransactionType.INCOME, amount: 105000.0, taxAmount: 15750.0, taxRate: 0.15, date: d("2026-03-28T00:00:00Z"), receivableId: "seed-recv-08", payableId: null },
  { id: "seed-tax-06", transactionType: TaxTransactionType.EXPENSE, amount: 1500.0, taxAmount: 225.0, taxRate: 0.15, date: d("2026-01-22T00:00:00Z"), receivableId: null, payableId: "seed-pay-01" },
  { id: "seed-tax-07", transactionType: TaxTransactionType.EXPENSE, amount: 1125.0, taxAmount: 168.75, taxRate: 0.15, date: d("2025-12-05T00:00:00Z"), receivableId: null, payableId: "seed-pay-02" },
  { id: "seed-tax-08", transactionType: TaxTransactionType.EXPENSE, amount: 2640.0, taxAmount: 396.0, taxRate: 0.15, date: d("2026-01-15T00:00:00Z"), receivableId: null, payableId: "seed-pay-03" },
  { id: "seed-tax-09", transactionType: TaxTransactionType.EXPENSE, amount: 5220.0, taxAmount: 783.0, taxRate: 0.15, date: d("2026-04-05T00:00:00Z"), receivableId: null, payableId: "seed-pay-05" },
  { id: "seed-tax-10", transactionType: TaxTransactionType.EXPENSE, amount: 740.0, taxAmount: 111.0, taxRate: 0.15, date: d("2026-05-20T00:00:00Z"), receivableId: null, payableId: "seed-pay-06" },
];

// ---------- REGISTROS DE AUDITORÍA (10) ----------
type AuditLogSeed = Prisma.AuditLogUncheckedCreateInput & { id?: string };
const auditLogsToSeed: AuditLogSeed[] = [
  { id: "seed-log-01", userId: "seed-usr-01", action: "CREATE_PROJECT", details: "Proyecto Edificio Altamar creado desde seed", ipAddress: "190.15.20.3" },
  { id: "seed-log-02", userId: "seed-usr-02", action: "UPDATE_INVENTORY", details: "Movimiento de stock RECEIPT (cemento)", ipAddress: "190.15.20.14" },
  { id: "seed-log-03", userId: "seed-usr-03", action: "UPDATE_INVENTORY", details: "Movimiento de stock RECEIPT (arena)", ipAddress: "190.15.20.21" },
  { id: "seed-log-04", userId: "seed-usr-06", action: "APPROVE_REQUISITION", details: "Requisición seed-req-01 aprobada", ipAddress: "190.15.20.30" },
  { id: "seed-log-05", userId: "seed-usr-01", action: "CREATE_USER", details: "Usuario evelyn.salazar creado", ipAddress: "190.15.20.3" },
  { id: "seed-log-06", userId: "seed-usr-04", action: "RECEIVE_ORDER", details: "Recepción OC seed-po-01 registrada", ipAddress: "190.15.20.40" },
  { id: "seed-log-07", userId: "seed-usr-06", action: "RECORD_PAYMENT", details: "Pago de CxP seed-pay-01", ipAddress: "190.15.20.30" },
  { id: "seed-log-08", userId: "seed-usr-08", action: "READ_REPORT", details: "Consulta de comparativa de presupuestos", ipAddress: "190.15.20.50" },
  { id: "seed-log-09", userId: "seed-usr-01", action: "UPDATE_PROJECT", details: "Estado del proyecto seed-proj-01 actualizado", ipAddress: "190.15.20.3" },
  { id: "seed-log-10", userId: "seed-usr-02", action: "ASSIGN_ASSET", details: "Asignación de equipo EQ-001 al proyecto Altamar", ipAddress: "190.15.20.14" },
];

// ---------- CONFIGURACIÓN DEL SISTEMA (claves necesarias, no 10) ----------
const systemConfigsToSeed: { key: string; value: string }[] = [
  { key: "COMPANY_NAME", value: "Consvivisa S.A." },
  { key: "COMPANY_RUC", value: "1790123456001" },
  { key: "IVA_RATE", value: "0.15" },
  { key: "LOW_STOCK_ALERT", value: "true" },
  { key: "DEFAULT_PAYMENT_TERMS", value: "30 días" },
];

// ==========================================================
// LÓGICA PRINCIPAL DEL SEED
// ==========================================================
async function main() {
  console.log("🌱 Iniciando semillado de datos (seeding)...");

  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  // ------------------------------------------------------------------
  // 1. PERMISOS (catálogo determinístico: 5 módulos x 6 acciones = 30)
  // ------------------------------------------------------------------
  const modules = ["ADMINISTRATIVO", "PROYECTOS", "COMPRAS", "FINANCIERO", "REPORTES"];
  const actions = ["CREATE", "READ", "UPDATE", "DELETE", "APPROVE", "ALL"];

  const permissionsToSeed: Prisma.PermissionUncheckedCreateInput[] = [];
  for (const module of modules) {
    for (const action of actions) {
      permissionsToSeed.push({
        action,
        module,
        description: `Permiso para realizar la acción ${action} en el módulo ${module}`,
      });
    }
  }

  console.log(`Poblando ${permissionsToSeed.length} permisos...`);
  const seededPermissions: { id: string; action: string; module: string }[] = [];
  for (const perm of permissionsToSeed) {
    const dbPerm = await prisma.permission.upsert({
      where: { action_module: { action: perm.action, module: perm.module } },
      update: { description: perm.description },
      create: perm,
    });
    seededPermissions.push({ id: dbPerm.id, action: dbPerm.action, module: dbPerm.module });
  }

  // ------------------------------------------------------------------
  // 2. ROLES (4 roles funcionales; las tablas de unión se manejan con set)
  // ------------------------------------------------------------------
  console.log("Poblando roles base...");

  const adminPerms = seededPermissions.filter((p) => p.action === "ALL");
  const residentPerms = seededPermissions.filter(
    (p) => p.module === "PROYECTOS" || (p.module === "COMPRAS" && ["READ", "CREATE"].includes(p.action)),
  );
  const financePerms = seededPermissions.filter(
    (p) =>
      p.module === "FINANCIERO" ||
      (p.module === "COMPRAS" && ["READ", "APPROVE"].includes(p.action)) ||
      (p.module === "PROYECTOS" && p.action === "READ"),
  );
  const directorPerms = seededPermissions.filter((p) => p.action === "READ" || p.module === "REPORTES");

  const adminRole = await prisma.role.upsert({
    where: { name: "ADMIN" },
    update: { permissions: { set: adminPerms.map((p) => ({ id: p.id })) } },
    create: {
      name: "ADMIN",
      description: "Administrador del sistema con acceso total",
      permissions: { connect: adminPerms.map((p) => ({ id: p.id })) },
    },
  });

  await prisma.role.upsert({
    where: { name: "INGENIERO_RESIDENTE" },
    update: { permissions: { set: residentPerms.map((p) => ({ id: p.id })) } },
    create: {
      name: "INGENIERO_RESIDENTE",
      description: "Ingeniero responsable de obra con acceso operativo",
      permissions: { connect: residentPerms.map((p) => ({ id: p.id })) },
    },
  });

  await prisma.role.upsert({
    where: { name: "FINANCIERO" },
    update: { permissions: { set: financePerms.map((p) => ({ id: p.id })) } },
    create: {
      name: "FINANCIERO",
      description: "Gestor financiero y contable del corporativo",
      permissions: { connect: financePerms.map((p) => ({ id: p.id })) },
    },
  });

  await prisma.role.upsert({
    where: { name: "DIRECTIVO" },
    update: { permissions: { set: directorPerms.map((p) => ({ id: p.id })) } },
    create: {
      name: "DIRECTIVO",
      description: "Acceso ejecutivo y de consulta general",
      permissions: { connect: directorPerms.map((p) => ({ id: p.id })) },
    },
  });

  // Resolver los IDs reales de los roles para los usuarios de prueba
  const roleAdmin = await prisma.role.findUnique({ where: { name: "ADMIN" } });
  const roleResident = await prisma.role.findUnique({ where: { name: "INGENIERO_RESIDENTE" } });
  const roleFinance = await prisma.role.findUnique({ where: { name: "FINANCIERO" } });
  const roleDirector = await prisma.role.findUnique({ where: { name: "DIRECTIVO" } });
  if (!roleAdmin || !roleResident || !roleFinance || !roleDirector) {
    throw new Error("No fue posible resolver los roles base para los usuarios.");
  }
  const roleByPlaceholder: Record<string, string> = {
    "seed-role-admin": roleAdmin.id,
    "seed-role-resident": roleResident.id,
    "seed-role-finance": roleFinance.id,
    "seed-role-director": roleDirector.id,
  };

  // ------------------------------------------------------------------
  // 3. BLOQUE PRINCIPAL EN UNA TRANSACCIÓN (toda la data dependiente)
  // ------------------------------------------------------------------
  await prisma.$transaction(
    async (tx) => {
      // --- Usuario administrador (se conserva; se actualiza password y rol) ---
      const adminUser = await tx.user.upsert({
        where: { email: ADMIN_EMAIL },
        update: { password: hashedPassword, roleId: roleAdmin.id, status: UserStatus.ACTIVE },
        create: {
          email: ADMIN_EMAIL,
          password: hashedPassword,
          firstName: "Admin",
          lastName: "ERP",
          roleId: roleAdmin.id,
          status: UserStatus.ACTIVE,
        },
      });

      // --- Usuarios de prueba (9) + admin = 10 ---
      console.log("Poblando 10 usuarios (admin + 9 de prueba)...");
      for (const user of usersToSeed) {
        await tx.user.upsert({
          where: { email: user.email },
          update: {
            password: hashedPassword,
            firstName: user.firstName,
            lastName: user.lastName,
            roleId: roleByPlaceholder[user.roleId],
            status: user.status,
          },
          create: {
            id: user.id,
            email: user.email,
            password: hashedPassword,
            firstName: user.firstName,
            lastName: user.lastName,
            roleId: roleByPlaceholder[user.roleId],
            status: user.status,
          },
        });
      }

      // --- Empleados (10) ---
      console.log("Poblando 10 empleados...");
      for (const emp of employeesToSeed) {
        const { id, ...data } = emp;
        await tx.employee.upsert({
          where: { id },
          create: emp,
          update: data,
        });
      }

      // --- Proveedores (10) ---
      console.log("Poblando 10 proveedores...");
      for (const sup of suppliersToSeed) {
        await tx.supplier.upsert({ where: { id: sup.id }, create: sup, update: { ...sup, id: undefined } });
      }

      // --- Materiales (10) ---
      console.log("Poblando 10 materiales...");
      for (const mat of materialsToSeed) {
        await tx.material.upsert({ where: { id: mat.id }, create: mat, update: { ...mat, id: undefined } });
      }

      // --- Activos (10) ---
      console.log("Poblando 10 activos...");
      for (const asset of assetsToSeed) {
        await tx.asset.upsert({ where: { id: asset.id }, create: asset, update: { ...asset, id: undefined } });
      }

      // --- Proyectos (10) + asignación de empleados en creación ---
      console.log("Poblando 10 proyectos...");
      for (const proj of projectsToSeed) {
        await tx.project.upsert({
          where: { id: proj.id },
          create: {
            id: proj.id,
            name: proj.name,
            location: proj.location,
            startDate: proj.startDate,
            endDate: proj.endDate,
            estimatedBudget: proj.estimatedBudget,
            status: proj.status,
            residentEngineer: { connect: { id: proj.residentEngineerId } },
            employees: { connect: proj.employeeIds.map((id) => ({ id })) },
          },
          update: {
            name: proj.name,
            location: proj.location,
            startDate: proj.startDate,
            endDate: proj.endDate,
            estimatedBudget: proj.estimatedBudget,
            status: proj.status,
            residentEngineerId: proj.residentEngineerId,
          },
        });
      }

      // --- Presupuestos (10, uno por proyecto) ---
      console.log("Poblando 10 presupuestos...");
      for (const budget of budgetsToSeed) {
        await tx.projectBudget.upsert({
          where: { projectId: budget.projectId },
          create: budget,
          update: {
            totalPlanned: budget.totalPlanned,
            materialsPlanned: budget.materialsPlanned,
            laborPlanned: budget.laborPlanned,
            subcontractsPlanned: budget.subcontractsPlanned,
            equipmentPlanned: budget.equipmentPlanned,
          },
        });
      }

      // --- Tareas (10) ---
      console.log("Poblando 10 tareas...");
      for (const task of tasksToSeed) {
        await tx.task.upsert({ where: { id: task.id }, create: task, update: { ...task, id: undefined } });
      }

      // --- Asistencias (10) ---
      console.log("Poblando 10 asistencias...");
      for (const att of attendancesToSeed) {
        await tx.attendance.upsert({ where: { id: att.id }, create: att, update: { ...att, id: undefined } });
      }

      // --- Asignaciones de activos (10) ---
      console.log("Poblando 10 asignaciones de activos...");
      for (const aa of assetAssignmentsToSeed) {
        await tx.assetAssignment.upsert({ where: { id: aa.id }, create: aa, update: { ...aa, id: undefined } });
      }

      // --- Stock en bodega (10) ---
      console.log("Poblando 10 registros de stock...");
      for (const stock of stocksToSeed) {
        await tx.warehouseStock.upsert({ where: { id: stock.id }, create: stock, update: { ...stock, id: undefined } });
      }

      // --- Requisiciones de compra (10) ---
      console.log("Poblando 10 requisiciones...");
      for (const req of requisitionsToSeed) {
        await tx.purchaseRequisition.upsert({ where: { id: req.id }, create: req, update: { ...req, id: undefined } });
      }

      // --- Ítems de requisición (10) ---
      console.log("Poblando 10 ítems de requisición...");
      for (const item of requisitionItemsToSeed) {
        await tx.requisitionItem.upsert({ where: { id: item.id }, create: item, update: { ...item, id: undefined } });
      }

      // --- Órdenes de compra (10) ---
      console.log("Poblando 10 órdenes de compra...");
      for (const po of purchaseOrdersToSeed) {
        await tx.purchaseOrder.upsert({ where: { id: po.id }, create: po, update: { ...po, id: undefined } });
      }

      // --- Ítems de órdenes de compra (10) ---
      console.log("Poblando 10 ítems de órdenes de compra...");
      for (const item of purchaseOrderItemsToSeed) {
        await tx.purchaseOrderItem.upsert({ where: { id: item.id }, create: item, update: { ...item, id: undefined } });
      }

      // --- Recepciones (10) ---
      console.log("Poblando 10 recepciones...");
      for (const rec of receptionsToSeed) {
        await tx.reception.upsert({ where: { id: rec.id }, create: rec, update: { ...rec, id: undefined } });
      }

      // --- Ítems de recepción (10) ---
      console.log("Poblando 10 ítems de recepción...");
      for (const item of receptionItemsToSeed) {
        await tx.receptionItem.upsert({ where: { id: item.id }, create: item, update: { ...item, id: undefined } });
      }

      // --- Movimientos de stock (10) ---
      console.log("Poblando 10 movimientos de stock...");
      for (const mov of stockMovementsToSeed) {
        await tx.stockMovement.upsert({ where: { id: mov.id }, create: mov, update: { ...mov, id: undefined } });
      }

      // --- Transacciones de costo (10) ---
      console.log("Poblando 10 transacciones de costo...");
      for (const cost of costTransactionsToSeed) {
        await tx.costTransaction.upsert({ where: { id: cost.id }, create: cost, update: { ...cost, id: undefined } });
      }

      // --- Cuentas por cobrar (10) ---
      console.log("Poblando 10 cuentas por cobrar...");
      for (const recv of receivablesToSeed) {
        await tx.accountReceivable.upsert({ where: { id: recv.id }, create: recv, update: { ...recv, id: undefined } });
      }

      // --- Cuentas por pagar (10) ---
      console.log("Poblando 10 cuentas por pagar...");
      for (const pay of payablesToSeed) {
        await tx.accountPayable.upsert({ where: { id: pay.id }, create: pay, update: { ...pay, id: undefined } });
      }

      // --- Registros fiscales (10) ---
      console.log("Poblando 10 registros fiscales...");
      for (const tax of taxRecordsToSeed) {
        await tx.taxRecord.upsert({ where: { id: tax.id }, create: tax, update: { ...tax, id: undefined } });
      }

      // --- Auditoría (10) ---
      console.log("Poblando 10 registros de auditoría...");
      for (const log of auditLogsToSeed) {
        await tx.auditLog.upsert({ where: { id: log.id }, create: log, update: { action: log.action, details: log.details, ipAddress: log.ipAddress } });
      }

      // --- Configuración del sistema (claves necesarias) ---
      console.log(`Poblando ${systemConfigsToSeed.length} claves de configuración...`);
      for (const cfg of systemConfigsToSeed) {
        await tx.systemConfig.upsert({
          where: { key: cfg.key },
          create: cfg,
          update: { value: cfg.value },
        });
      }

      return { adminEmail: adminUser.email };
    },
    { timeout: 120000 },
  );

  console.log("✅ Semillado completado con éxito!");
  console.log(`   Usuario Admin: ${ADMIN_EMAIL}`);
  console.log(`   Contraseña de prueba: ${DEFAULT_PASSWORD}`);
  console.log(`   Total permisos: ${permissionsToSeed.length} | Roles: 4 | 10 registros en cada modelo principal`);
}

main()
  .catch((e) => {
    console.error("❌ Error durante el semillado:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
