import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('Compras Module E2E Flow (supertest)', () => {
  let app: INestApplication<App>;
  let adminToken: string;
  let residentToken: string;
  
  // IDs guardados a lo largo del flujo
  let residentRoleId: string;
  let createPurchasesPermissionId: string;
  let approvePurchasesPermissionId: string;
  let residentEngineerId: string;
  let projectId: string;
  let materialId: string;
  let supplierId: string;
  let requisitionId: string;
  let purchaseOrderId: string;

  const uniqueSuffix = Date.now();
  const residentEmail = `residente.e2e_${uniqueSuffix}@consvivisa.com`;
  const employeeEmail = `residente.emp_${uniqueSuffix}@consvivisa.com`;
  const supplierTaxId = `TAX-${uniqueSuffix}`;
  const materialSku = `SKU-E2E-${uniqueSuffix}`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  // =============================================================
  // 1. LOGIN ADMIN Y CONFIGURACIÓN DE ROLES/PERMISOS
  // =============================================================
  it('1. Debe iniciar sesión como administrador', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'admin@consvivisa.com',
        password: 'AdminPassword123',
      })
      .expect(201);

    expect(res.body).toHaveProperty('token');
    adminToken = res.body.token;
  });

  it('2. Debe obtener el rol de Ingeniero Residente y asignarle los permisos CREATE y APPROVE de compras', async () => {
    // A. Obtener roles
    const rolesRes = await request(app.getHttpServer())
      .get('/users/roles')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const residentRole = rolesRes.body.find((r: any) => r.name === 'INGENIERO_RESIDENTE');
    expect(residentRole).toBeDefined();
    residentRoleId = residentRole.id;

    // B. Obtener permisos
    const permsRes = await request(app.getHttpServer())
      .get('/users/permissions')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const createPurchasesPerm = permsRes.body.find(
      (p: any) => p.module === 'COMPRAS' && p.action === 'CREATE',
    );
    const approvePurchasesPerm = permsRes.body.find(
      (p: any) => p.module === 'COMPRAS' && p.action === 'APPROVE',
    );
    expect(createPurchasesPerm).toBeDefined();
    expect(approvePurchasesPerm).toBeDefined();
    
    createPurchasesPermissionId = createPurchasesPerm.id;
    approvePurchasesPermissionId = approvePurchasesPerm.id;

    // C. Asignar los permisos
    const existingPermIds = residentRole.permissions?.map((p: any) => p.permissionId || p.id) || [];
    const newPermIds = Array.from(new Set([
      ...existingPermIds, 
      createPurchasesPermissionId,
      approvePurchasesPermissionId
    ]));

    await request(app.getHttpServer())
      .put(`/users/roles/${residentRoleId}/permissions`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ permissionIds: newPermIds })
      .expect(200);
  });

  it('3. Debe crear un usuario Ingeniero Residente nuevo e iniciar sesión con él', async () => {
    // A. Registrar usuario residente
    await request(app.getHttpServer())
      .post('/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: residentEmail,
        password: 'ResidentPassword123',
        firstName: 'Residente',
        lastName: 'E2E',
        roleId: residentRoleId,
      })
      .expect(201);

    // B. Autenticarse como residente
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: residentEmail,
        password: 'ResidentPassword123',
      })
      .expect(201);

    expect(res.body).toHaveProperty('token');
    residentToken = res.body.token;
  });

  // =============================================================
  // 2. CREACIÓN DE REQUISITOS PREVIOS (PROYECTO, MATERIAL, PROVEEDOR)
  // =============================================================
  it('4. Debe crear un empleado, un proyecto y un material de prueba (con token Admin)', async () => {
    // A. Crear empleado para ser Ingeniero Residente
    const empRes = await request(app.getHttpServer())
      .post('/employees')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        firstName: 'Ingeniero',
        lastName: 'Residente E2E',
        documentId: `DOC-${uniqueSuffix}`,
        email: employeeEmail,
        phone: '+56911112222',
      })
      .expect(201);

    expect(empRes.body).toHaveProperty('id');
    residentEngineerId = empRes.body.id;

    // B. Crear proyecto
    const projRes = await request(app.getHttpServer())
      .post('/projects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Obra Compras E2E',
        location: 'Valparaíso',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // +30 días
        estimatedBudget: 750000,
        residentEngineerId,
      })
      .expect(201);

    expect(projRes.body).toHaveProperty('id');
    projectId = projRes.body.id;

    // C. Crear material
    const matRes = await request(app.getHttpServer())
      .post('/inventory/materials')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Cemento Melón E2E',
        unit: 'Sacos',
        sku: materialSku,
        unitPrice: 10.0,
      })
      .expect(201);

    expect(matRes.body).toHaveProperty('id');
    materialId = matRes.body.id;
  });

  it('5. Debe registrar un nuevo proveedor (con token Admin)', async () => {
    const res = await request(app.getHttpServer())
      .post('/purchases/suppliers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Ferretería Central E2E',
        taxId: supplierTaxId,
        email: 'ventas@ferrecentral.cl',
        phone: '+56322234567',
        address: 'Av. Brasil 1020, Valparaíso',
        paymentTerms: '30 días',
        rating: 4.8,
      })
      .expect(201);

    expect(res.body).toHaveProperty('id');
    supplierId = res.body.id;
  });

  // =============================================================
  // 3. FLUJO DE COMPRAS (REQUISICIÓN -> OC -> EMISIÓN -> RECEPCIONES)
  // =============================================================
  it('6. Debe permitir al Ingeniero Residente enviar una Requisición de 100 sacos de cemento', async () => {
    const res = await request(app.getHttpServer())
      .post('/purchases/requisitions')
      .set('Authorization', `Bearer ${residentToken}`)
      .send({
        projectId,
        items: [
          {
            materialId,
            quantity: 100,
          },
        ],
      })
      .expect(201);

    expect(res.body).toHaveProperty('id');
    expect(res.body.status).toBe('PENDING');
    requisitionId = res.body.id;
  });

  it('7. Debe impedir que el residente apruebe su propia requisición por la regla de segregación de funciones', async () => {
    const errRes = await request(app.getHttpServer())
      .put(`/purchases/requisitions/${requisitionId}/status`)
      .set('Authorization', `Bearer ${residentToken}`)
      .send({ status: 'APPROVED' })
      .expect(400);

    expect(errRes.body.message).toContain('Segregación de funciones');
  });

  it('8. Debe permitir que el Administrador apruebe la requisición', async () => {
    const appRes = await request(app.getHttpServer())
      .put(`/purchases/requisitions/${requisitionId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'APPROVED' })
      .expect(200);

    expect(appRes.body.status).toBe('APPROVED');
  });

  it('9. Debe generar una Orden de Compra (DRAFT) a partir de la requisición aprobada', async () => {
    const res = await request(app.getHttpServer())
      .post('/purchases/orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        supplierId,
        requisitionId,
        items: [
          {
            materialId,
            quantity: 100,
            unitPrice: 12.5,
          },
        ],
      })
      .expect(201);

    expect(res.body).toHaveProperty('id');
    expect(res.body.status).toBe('DRAFT');
    expect(Number(res.body.totalAmount)).toBe(1250);
    purchaseOrderId = res.body.id;

    // Verificar que la requisición original pasó a estado ORDERED
    const reqRes = await request(app.getHttpServer())
      .get(`/purchases/requisitions/${requisitionId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(reqRes.body.status).toBe('ORDERED');
  });

  it('10. Debe emitir la Orden de Compra (SENT) para habilitar recepciones de mercadería', async () => {
    const res = await request(app.getHttpServer())
      .put(`/purchases/orders/${purchaseOrderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'SENT' })
      .expect(200);

    expect(res.body.status).toBe('SENT');
  });

  it('11. Debe registrar una recepción parcial de 40 sacos conformes (actualizando stock a 40)', async () => {
    // A. Enviar recepción parcial
    const recRes = await request(app.getHttpServer())
      .post('/purchases/receptions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        purchaseOrderId,
        items: [
          {
            materialId,
            quantityReceived: 40,
            status: 'CONFORM',
          },
        ],
      })
      .expect(201);

    // Verificar que el estado de la orden pasó a PARTIALLY_RECEIVED
    expect(recRes.body.purchaseOrder.status).toBe('PARTIALLY_RECEIVED');

    // B. Validar existencias en el inventario
    const stockRes = await request(app.getHttpServer())
      .get(`/inventory/stock?projectId=${projectId}&materialId=${materialId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    // Debe haber un registro para este material y proyecto con stock 40
    expect(stockRes.body).toHaveLength(1);
    expect(Number(stockRes.body[0].quantity)).toBe(40);
  });

  it('12. Debe impedir sobre-recepción de stock y registrar la recepción final de 60 sacos completando la orden', async () => {
    // A. Intentar sobre-recepción (recibir 70 sacos cuando restan 60)
    const overRes = await request(app.getHttpServer())
      .post('/purchases/receptions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        purchaseOrderId,
        items: [
          {
            materialId,
            quantityReceived: 70,
            status: 'CONFORM',
          },
        ],
      })
      .expect(400);

    expect(overRes.body.message).toContain('Sobre-recepción');

    // B. Registrar la cantidad remanente exacta (60 sacos)
    const finalRecRes = await request(app.getHttpServer())
      .post('/purchases/receptions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        purchaseOrderId,
        items: [
          {
            materialId,
            quantityReceived: 60,
            status: 'CONFORM',
          },
        ],
      })
      .expect(201);

    // La orden de compra debe pasar automáticamente a COMPLETED al recibirse la totalidad
    expect(finalRecRes.body.purchaseOrder.status).toBe('COMPLETED');

    // C. Validar existencias acumuladas finales en el almacén de la obra
    const finalStockRes = await request(app.getHttpServer())
      .get(`/inventory/stock?projectId=${projectId}&materialId=${materialId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(finalStockRes.body).toHaveLength(1);
    expect(Number(finalStockRes.body[0].quantity)).toBe(100);
  });
});
