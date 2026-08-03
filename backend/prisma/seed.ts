import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as bcrypt from "bcrypt";

// Configurar el cliente de Prisma 7 con el adaptador de pg
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("❌ Error: La variable de entorno DATABASE_URL no está definida.");
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Iniciando semillado de datos (seeding)...");

  // 1. DEFINICIÓN DE PERMISOS POR MÓDULO
  const modules = ["ADMINISTRATIVO", "PROYECTOS", "COMPRAS", "FINANCIERO", "REPORTES"];
  const actions = ["CREATE", "READ", "UPDATE", "DELETE", "APPROVE", "ALL"];

  const permissionsToSeed = [];
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
  const seededPermissions = [];
  for (const perm of permissionsToSeed) {
    const dbPerm = await prisma.permission.upsert({
      where: {
        action_module: {
          action: perm.action,
          module: perm.module,
        },
      },
      update: { description: perm.description },
      create: {
        action: perm.action,
        module: perm.module,
        description: perm.description,
      },
    });
    seededPermissions.push(dbPerm);
  }

  // 2. CREACIÓN/ACTUALIZACIÓN DE ROLES
  console.log("Poblando roles base...");

  // Rol ADMIN - tiene acceso total a través del comodín ALL en cada módulo
  const adminPerms = seededPermissions.filter((p) => p.action === "ALL");
  const adminRole = await prisma.role.upsert({
    where: { name: "ADMIN" },
    update: {
      permissions: {
        set: adminPerms.map((p) => ({ id: p.id })),
      },
    },
    create: {
      name: "ADMIN",
      description: "Administrador del sistema con acceso total",
      permissions: {
        connect: adminPerms.map((p) => ({ id: p.id })),
      },
    },
  });

  // Rol INGENIERO RESIDENTE - permisos de Proyectos, Inventario (Lectura/Escritura), Compras (Requisiciones)
  const residentPerms = seededPermissions.filter(
    (p) =>
      p.module === "PROYECTOS" ||
      (p.module === "COMPRAS" && ["READ", "CREATE"].includes(p.action))
  );
  await prisma.role.upsert({
    where: { name: "INGENIERO_RESIDENTE" },
    update: {
      permissions: {
        set: residentPerms.map((p) => ({ id: p.id })),
      },
    },
    create: {
      name: "INGENIERO_RESIDENTE",
      description: "Ingeniero responsable de obra con acceso operativo",
      permissions: {
        connect: residentPerms.map((p) => ({ id: p.id })),
      },
    },
  });

  // Rol FINANCIERO - permisos de Finanzas (Todos), lectura y aprobación de Compras, y lectura de Proyectos
  const financePerms = seededPermissions.filter(
    (p) =>
      p.module === "FINANCIERO" ||
      (p.module === "COMPRAS" && ["READ", "APPROVE"].includes(p.action)) ||
      (p.module === "PROYECTOS" && p.action === "READ")
  );
  await prisma.role.upsert({
    where: { name: "FINANCIERO" },
    update: {
      permissions: {
        set: financePerms.map((p) => ({ id: p.id })),
      },
    },
    create: {
      name: "FINANCIERO",
      description: "Gestor financiero y contable del corporativo",
      permissions: {
        connect: financePerms.map((p) => ({ id: p.id })),
      },
    },
  });

  // Rol DIRECTIVO - lectura general en todos los módulos y acceso a Reportes
  const directorPerms = seededPermissions.filter(
    (p) => p.action === "READ" || p.module === "REPORTES"
  );
  await prisma.role.upsert({
    where: { name: "DIRECTIVO" },
    update: {
      permissions: {
        set: directorPerms.map((p) => ({ id: p.id })),
      },
    },
    create: {
      name: "DIRECTIVO",
      description: "Acceso ejecutivo y de consulta general",
      permissions: {
        connect: directorPerms.map((p) => ({ id: p.id })),
      },
    },
  });

  // 3. CREACIÓN DEL USUARIO ADMINISTRADOR INICIAL
  console.log("Poblando usuario administrador inicial...");
  const adminEmail = "admin@consvivisa.com";
  const defaultPassword = "AdminPassword123";
  const hashedPassword = await bcrypt.hash(defaultPassword, 10);

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      password: hashedPassword,
      roleId: adminRole.id,
    },
    create: {
      email: adminEmail,
      password: hashedPassword,
      firstName: "Admin",
      lastName: "ERP",
      roleId: adminRole.id,
      status: "ACTIVE",
    },
  });

  console.log("✅ Semillado completado con éxito!");
  console.log(`   Usuario Admin Creado: ${adminUser.email}`);
  console.log(`   Contraseña temporal: ${defaultPassword}`);
}

main()
  .catch((e) => {
    console.error("❌ Error durante el semillado:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end(); // Cerrar el pool de conexiones de pg
  });
