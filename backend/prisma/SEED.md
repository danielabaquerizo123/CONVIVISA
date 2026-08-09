# SEED de datos de prueba — CONVIVISA

Este documento describe el sistema de semillado de datos (`backend/prisma/seed.ts`) de la base de datos de CONVIVISA.

---

## 1. ¿Qué hace el seed?

Puebla la base de datos PostgreSQL con **datos de prueba coherentes y relacionados** para todos los modelos del esquema de Prisma. Es **idempotente**: puede ejecutarse varias veces sin crear duplicados (usa `upsert` con identificadores determinísticos `seed-*`).

El seed **no borra ni trunca** ninguna tabla. Solo crea o actualiza los registros de prueba. Si la base ya contiene información (por ejemplo, el usuario administrador, roles o permisos), esos datos se **conservan**.

## 2. Modelos poblados y cantidades

| Modelo | Registros | Tipo |
|---|---|---|
| Permission | 30 | catálogo determinístico (5 módulos × 6 acciones) |
| Role | 4 | roles funcionales del sistema |
| User | 10 | 1 admin + 9 de prueba |
| Employee | 10 | |
| Project | 10 | |
| ProjectBudget | 10 | uno por proyecto (1:1) |
| Task | 10 | |
| Attendance | 10 | |
| Asset | 10 | |
| AssetAssignment | 10 | |
| Supplier | 10 | |
| Material | 10 | |
| WarehouseStock | 10 | |
| StockMovement | 10 | |
| PurchaseRequisition | 10 | |
| RequisitionItem | 10 | |
| PurchaseOrder | 10 | |
| PurchaseOrderItem | 10 | |
| Reception | 10 | |
| ReceptionItem | 10 | |
| CostTransaction | 10 | |
| AccountReceivable | 10 | |
| AccountPayable | 10 | |
| TaxRecord | 10 | |
| AuditLog | 10 | (los registros previos se conservan) |
| SystemConfig | 5 | ver excepciones |

## 3. Excepciones (tablas que NO reciben 10 registros)

1. **Permission (30)** — Es un catálogo que se genera de forma determinística a partir de 5 módulos × 6 acciones. Insertar 10 permisos arbitrarios no tiene sentido funcional; además, ya estaba poblado con la misma lógica.
2. **Role (4)** — El sistema funciona con exactamente 4 roles (ADMIN, INGENIERO_RESIDENTE, FINANCIERO, DIRECTIVO). Los usuarios y la lógica de permisos dependen de ellos. Se conservan los 4 existentes.
3. **SystemConfig (5)** — Es una tabla clave-valor (clave primaria = `key`). Solo se crean las claves necesarias: `COMPANY_NAME`, `COMPANY_RUC`, `IVA_RATE`, `LOW_STOCK_ALERT`, `DEFAULT_PAYMENT_TERMS`.
4. **Tablas de unión N:N (`_ProjectEmployees`, `_RolePermissions`)** — Tablas puramente relacionales. Se pueblan como subproducto de las relaciones (`Project.employees`, `Role.permissions`) y no tienen objetivo de cantidad propio.
5. **AuditLog** — El seed agrega 10 registros de auditoría de prueba, pero **no borra** los logs generados por el uso real del sistema. Por eso el conteo puede ser mayor a 10 en ambientes usados.

## 4. Cómo se relacionan los datos

El orden de inserción sigue las dependencias de claves foráneas:

1. **Permisos** y **Roles** (sin dependencias) → 2. **Usuarios** (dependen de roles) → 3. **Empleados** (pueden depender de usuarios) → 4. **Proveedores**, **Materiales** y **Activos** (catálogos) → 5. **Proyectos** (dependen de empleados como residente) → 6. **Presupuestos** (1:1 con proyectos) → 7. **Tareas**, **Asistencias**, **Asignaciones de activos** → 8. **Requisiciones** (proyecto + usuario) → 9. **Ítems de requisición** → 10. **Órdenes de compra** (proveedor + requisición opcional) → 11. **Ítems de OC** → 12. **Recepciones** e **Ítems de recepción** → 13. **Movimientos de stock** → 14. **Transacciones de costo** → 15. **CxC / CxP** → 16. **Registros fiscales** (ligados a CxC/CxP) → 17. **Auditoría** → 18. **Configuración**.

Coherencia de datos de ejemplo:
- Las **órdenes de compra** tienen `totalAmount = Σ (cantidad × precio) de sus ítems`.
- Los **presupuestos** cumplen `totalPlanned = materials + labor + subcontracts + equipment`.
- Los **registros fiscales** cumplen `taxAmount = amount × taxRate` (IVA 15%).
- Los **movimientos de stock** usan cantidad positiva para `RECEIPT`/`CONSUMPTION` y signo negativo en la salida de `TRANSFER`, igual que `InventoryService`.
- Los **estados** de OC, recepciones, requisiciones y pagos son coherentes entre sí (una OC `COMPLETED` tiene recepciones que cubren sus ítems, etc.).

## 5. Usuario de prueba y credenciales

Todas las contraseñas se almacenan con **bcryptjs (10 rounds)**, el mismo mecanismo que usa el backend (`AuthService`).

| Usuario | Rol |
|---|---|
| `admin@consvivisa.com` | ADMIN (administrador funcional, se conserva del seed original) |
| `evelyn.salazar@consvivisa.com` | ADMIN |
| `armando.quispe@consvivisa.com` | INGENIERO_RESIDENTE |
| `carmen.rojas@consvivisa.com` | INGENIERO_RESIDENTE |
| `luisa.mendoza@consvivisa.com` | INGENIERO_RESIDENTE |
| `maria.fernandez@consvivisa.com` | FINANCIERO |
| `raul.castillo@consvivisa.com` | FINANCIERO |
| `sofia.benitez@consvivisa.com` | FINANCIERO |
| `gabriela.medina@consvivisa.com` | DIRECTIVO |
| `jorge.villalba@consvivisa.com` | DIRECTIVO |

> **Contraseña de prueba para todos: `AdminPassword123`** (solo para entornos de desarrollo/pruebas).

## 6. Cómo ejecutarlo

### Localmente

```bash
cd backend
npx prisma db seed          # o: npm run db:seed
```

Requiere `DATABASE_URL` definida. El seed carga `backend/.env` automáticamente (vía `dotenv/config` y `prisma.config.ts`).

### Contra Railway

No ejecutes el seed automáticamente contra producción. Si es necesario (por ejemplo, una base de pruebas en Railway), la `DATABASE_URL` debe estar configurada **solo como variable de entorno** del servicio Backend en Railway:

```bash
cd backend
# con DATABASE_URL apuntando a la base de Railway
npx prisma db seed
```

El código **no contiene** ninguna `DATABASE_URL`, contraseña ni secreto real. Nunca subas `.env` a Git.

## 7. Cómo verificar los datos

```bash
cd backend
npx ts-node prisma/verify-seed.ts   # o: npm run db:verify
```

El script muestra una tabla con la cantidad de registros por modelo y verifica automáticamente:

- Usuario administrador presente y funcional.
- Los 4 roles esperados.
- Sin duplicados de email, RUC ni SKU.
- Todos los proyectos con residente válido.
- Órdenes de compra cuadradas contra sus ítems.
- Presupuestos cuadrados (`total = Σ partidas`).
- Registros fiscales coherentes (`taxAmount = amount × taxRate`).
- Facturas de CxC/CxP sin duplicados.

## 8. Idempotencia (re-ejecutar sin duplicados)

Todos los registros de prueba usan **identificadores determinísticos** (`seed-proj-01`, `seed-sup-01`, `seed-usr-02`, …) y se insertan con `upsert`. Al volver a ejecutar el seed:

- No se crean usuarios, correos, RUC, SKU, facturas ni documentos duplicados.
- Los valores de los registros existentes se actualizan (se "resetean" a los valores de prueba definidos).
- Los datos que NO son del seed (usuarios manuales, logs reales, etc.) **no se tocan**.
- Los campos con `@unique`/restricciones compuestas (`projectId_materialId`, `requisitionId_materialId`, `purchaseOrderId_materialId`) nunca se violan porque las combinaciones son determinísticas.

## 9. Seguridad

- No se suben `.env`, `DATABASE_URL` reales, `JWT_SECRET` ni credenciales (ver `.gitignore`).
- Las contraseñas de prueba se documentan aquí pero son de uso exclusivo en desarrollo.
- El seed no usa `TRUNCATE`, `DROP` ni `deleteMany`.
