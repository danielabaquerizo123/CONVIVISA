import React, { useEffect, useState } from 'react';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { Table } from '../components/Table';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Drawer } from '../components/Drawer';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { SkeletonTable } from '../components/SkeletonTable';
import { 
  Plus, 
  Edit3, 
  Trash2, 
  ShoppingBag, 
  Truck, 
  FileText, 
  Mail, 
  Phone, 
  Star,
  Users,
  CheckCircle,
  XCircle,
  ListPlus,
  Briefcase,
  Send,
  Archive,
  MapPin,
  AlertTriangle,
  Package
} from 'lucide-react';

interface Supplier {
  id: string;
  name: string;
  taxId: string;
  email: string;
  phone: string;
  address: string;
  paymentTerms: string;
  rating: number;
  createdAt: string;
}

interface Project {
  id: string;
  name: string;
  location: string;
  status: string;
}

interface Material {
  id: string;
  name: string;
  unit: string;
  sku?: string;
  unitPrice?: number;
}

interface RequisitionItem {
  id: string;
  materialId: string;
  quantity: number;
  material: Material;
}

interface Requisition {
  id: string;
  projectId: string;
  project: Project;
  requestedById: string;
  requestedBy: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ORDERED';
  items: RequisitionItem[];
  createdAt: string;
}

interface PurchaseOrderItem {
  id: string;
  materialId: string;
  quantity: number;
  unitPrice: number;
  material: Material;
}

interface PurchaseOrder {
  id: string;
  requisitionId: string | null;
  requisition: Requisition | null;
  supplierId: string;
  supplier: Supplier;
  status: 'DRAFT' | 'SENT' | 'PARTIALLY_RECEIVED' | 'COMPLETED' | 'CANCELLED';
  totalAmount: number;
  items: PurchaseOrderItem[];
  createdAt: string;
}

interface ReceptionItem {
  id: string;
  materialId: string;
  quantityReceived: number;
  status: 'CONFORM' | 'DEFECTIVE' | 'DISCREPANCY';
  material: Material;
}

interface Reception {
  id: string;
  purchaseOrderId: string;
  purchaseOrder: PurchaseOrder;
  userId: string;
  receivedBy: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  items: ReceptionItem[];
  receivedAt: string;
}

export const Purchases: React.FC = () => {
  const { request } = useApi();
  const { hasPermission } = useAuth();

  // Navegación interna entre pestañas del módulo de Compras
  const [activeTab, setActiveTab] = useState<'suppliers' | 'requisitions' | 'orders' | 'receptions' | 'materials'>('suppliers');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // =============================================================
  // ESTADOS: PESTAÑA 5 - MATERIALES
  // =============================================================
  const [isMaterialDrawerOpen, setIsMaterialDrawerOpen] = useState(false);
  const [materialFormData, setMaterialFormData] = useState({
    name: '',
    unit: '',
    sku: '',
    unitPrice: '',
  });
  const [materialErrors, setMaterialErrors] = useState<Record<string, string>>({});
  const [isMaterialSaving, setIsMaterialSaving] = useState(false);

  // Datos de apoyo (Precargados para formularios)
  const [projects, setProjects] = useState<Project[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [suppliersList, setSuppliersList] = useState<Supplier[]>([]);

  // =============================================================
  // ESTADOS: PESTAÑA 1 - PROVEEDORES
  // =============================================================
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isSupplierDrawerOpen, setIsSupplierDrawerOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierFormData, setSupplierFormData] = useState({
    name: '',
    taxId: '',
    email: '',
    phone: '',
    address: '',
    paymentTerms: '',
    rating: '5.0',
  });
  const [supplierErrors, setSupplierErrors] = useState<Record<string, string>>({});
  const [isSupplierSaving, setIsSupplierSaving] = useState(false);

  // Confirmación de bajas lógicas para proveedores
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);

  // =============================================================
  // ESTADOS: PESTAÑA 2 - REQUISICIONES
  // =============================================================
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [requisitionFilter, setRequisitionFilter] = useState<string>('');
  const [isReqDrawerOpen, setIsReqDrawerOpen] = useState(false);
  
  // Formulario Requisición
  const [reqProjectId, setReqProjectId] = useState('');
  const [reqItems, setReqItems] = useState<{ materialId: string; quantity: string }[]>([
    { materialId: '', quantity: '1' }
  ]);
  const [reqErrors, setReqErrors] = useState<Record<string, string>>({});
  const [isReqSaving, setIsReqSaving] = useState(false);

  // =============================================================
  // ESTADOS: PESTAÑA 3 - ÓRDENES DE COMPRA
  // =============================================================
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [orderFilter, setOrderFilter] = useState<string>('');
  const [isOrderDrawerOpen, setIsOrderDrawerOpen] = useState(false);

  // Formulario Orden de Compra (Vinculada a Requisición aprobada)
  const [orderSupplierId, setOrderSupplierId] = useState('');
  const [linkedRequisition, setLinkedRequisition] = useState<Requisition | null>(null);
  const [orderItems, setOrderItems] = useState<{ materialId: string; quantity: number; unitPrice: string }[]>([]);
  const [orderErrors, setOrderErrors] = useState<Record<string, string>>({});
  const [isOrderSaving, setIsOrderSaving] = useState(false);

  // =============================================================
  // ESTADOS: PESTAÑA 4 - RECEPCIONES
  // =============================================================
  const [receptions, setReceptions] = useState<Reception[]>([]);
  const [isReceptionDrawerOpen, setIsReceptionDrawerOpen] = useState(false);
  
  // Formulario Recepción
  const [receptionOrderId, setReceptionOrderId] = useState('');
  const [receptionItems, setReceptionItems] = useState<{ materialId: string; quantityReceived: string; status: 'CONFORM' | 'DEFECTIVE' | 'DISCREPANCY' }[]>([]);
  const [receptionErrors, setReceptionErrors] = useState<Record<string, string>>({});
  const [isReceptionSaving, setIsReceptionSaving] = useState(false);

  // Cargar datos según la pestaña activa
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (activeTab === 'suppliers') {
        const res = await request('/api/purchases/suppliers');
        setSuppliers(res);
      } else if (activeTab === 'requisitions') {
        const res = await request('/api/purchases/requisitions');
        setRequisitions(res);
      } else if (activeTab === 'orders') {
        const res = await request('/api/purchases/orders');
        setPurchaseOrders(res);
      } else if (activeTab === 'receptions') {
        const res = await request('/api/purchases/receptions');
        setReceptions(res);
      } else if (activeTab === 'materials') {
        const res = await request('/api/inventory/materials');
        setMaterials(res);
      }
    } catch (err: any) {
      setError(err.message || 'Error al obtener datos de compras.');
    } finally {
      setLoading(false);
    }
  };

  // Cargar catálogos auxiliares (proyectos y materiales)
  const loadAuxiliaryData = async () => {
    try {
      const [projRes, matRes, supRes, poRes] = await Promise.all([
        request('/api/projects'),
        request('/api/inventory/materials'),
        request('/api/purchases/suppliers'),
        request('/api/purchases/orders')
      ]);
      setProjects(projRes);
      setMaterials(matRes);
      setSuppliersList(supRes);
      setPurchaseOrders(poRes);
    } catch (err) {
      console.log('Error al cargar datos auxiliares:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  useEffect(() => {
    if (isReqDrawerOpen || isOrderDrawerOpen || isReceptionDrawerOpen) {
      loadAuxiliaryData();
    }
  }, [isReqDrawerOpen, isOrderDrawerOpen, isReceptionDrawerOpen]);

  // Sincronizar materiales de la orden de compra seleccionada en la recepción
  useEffect(() => {
    if (receptionOrderId) {
      const selectedPo = purchaseOrders.find(po => po.id === receptionOrderId);
      if (selectedPo) {
        setReceptionItems(selectedPo.items.map(it => ({
          materialId: it.materialId,
          quantityReceived: it.quantity.toString(),
          status: 'CONFORM'
        })));
      }
    } else {
      setReceptionItems([]);
    }
  }, [receptionOrderId, purchaseOrders]);

  // =============================================================
  // ACCIONES: PROVEEDORES (CRUD)
  // =============================================================
  const handleOpenSupplierDrawer = (supplier?: Supplier) => {
    setSupplierErrors({});
    if (supplier) {
      setEditingSupplier(supplier);
      setSupplierFormData({
        name: supplier.name,
        taxId: supplier.taxId,
        email: supplier.email,
        phone: supplier.phone,
        address: supplier.address,
        paymentTerms: supplier.paymentTerms,
        rating: supplier.rating.toString(),
      });
    } else {
      setEditingSupplier(null);
      setSupplierFormData({
        name: '',
        taxId: '',
        email: '',
        phone: '',
        address: '',
        paymentTerms: '',
        rating: '5.0',
      });
    }
    setIsSupplierDrawerOpen(true);
  };

  const validateSupplierForm = () => {
    const errors: Record<string, string> = {};
    if (!supplierFormData.name.trim()) errors.name = 'El nombre del proveedor es requerido.';
    if (!supplierFormData.taxId.trim()) errors.taxId = 'El ID tributario (RUT/RUC) es requerido.';
    if (!supplierFormData.phone.trim()) errors.phone = 'El teléfono es requerido.';
    if (!supplierFormData.address.trim()) errors.address = 'La dirección es requerida.';
    if (!supplierFormData.paymentTerms.trim()) errors.paymentTerms = 'Los términos de pago son requeridos.';

    if (!supplierFormData.email.trim()) {
      errors.email = 'El correo electrónico es requerido.';
    } else if (!/\S+@\S+\.\S+/.test(supplierFormData.email)) {
      errors.email = 'El formato de correo no es válido.';
    }

    const ratingVal = parseFloat(supplierFormData.rating);
    if (isNaN(ratingVal) || ratingVal < 1.0 || ratingVal > 5.0) {
      errors.rating = 'La calificación debe ser un número entre 1.0 y 5.0.';
    }

    setSupplierErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateSupplierForm()) return;

    try {
      setIsSupplierSaving(true);
      const payload = {
        name: supplierFormData.name,
        taxId: supplierFormData.taxId,
        email: supplierFormData.email,
        phone: supplierFormData.phone,
        address: supplierFormData.address,
        paymentTerms: supplierFormData.paymentTerms,
        rating: parseFloat(supplierFormData.rating),
      };

      if (editingSupplier) {
        await request(`/api/purchases/suppliers/${editingSupplier.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await request('/api/purchases/suppliers', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      setIsSupplierDrawerOpen(false);
      loadData();
    } catch (err: any) {
      setSupplierErrors({ api: err.message || 'Error al guardar proveedor.' });
    } finally {
      setIsSupplierSaving(false);
    }
  };

  const handleDeleteClick = (supplier: Supplier) => {
    setSupplierToDelete(supplier);
    setIsDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!supplierToDelete) return;
    try {
      await request(`/api/purchases/suppliers/${supplierToDelete.id}`, {
        method: 'DELETE',
      });
      setIsDeleteConfirmOpen(false);
      setSupplierToDelete(null);
      loadData();
    } catch (err: any) {
      alert(`Error al desactivar el proveedor: ${err.message}`);
    }
  };

  // =============================================================
  // ACCIONES: REQUISICIONES (CREACIÓN / APROBACIÓN)
  // =============================================================
  const handleOpenReqDrawer = () => {
    setReqErrors({});
    setReqProjectId('');
    setReqItems([{ materialId: '', quantity: '1' }]);
    setIsReqDrawerOpen(true);
  };

  const handleAddReqItem = () => {
    setReqItems([...reqItems, { materialId: '', quantity: '1' }]);
  };

  const handleRemoveReqItem = (index: number) => {
    if (reqItems.length === 1) return;
    setReqItems(reqItems.filter((_, idx) => idx !== index));
  };

  const handleReqItemChange = (index: number, field: 'materialId' | 'quantity', value: string) => {
    const updated = [...reqItems];
    updated[index][field] = value;
    setReqItems(updated);
  };

  const validateReqForm = () => {
    const errors: Record<string, string> = {};
    if (!reqProjectId) errors.projectId = 'Debe seleccionar un proyecto de destino.';
    
    // Validar ítems
    const itemsErrors: string[] = [];
    reqItems.forEach((item, idx) => {
      if (!item.materialId) {
        itemsErrors.push(`Fila ${idx + 1}: Debe seleccionar un material.`);
      }
      const qty = parseFloat(item.quantity);
      if (isNaN(qty) || qty <= 0) {
        itemsErrors.push(`Fila ${idx + 1}: La cantidad debe ser un número positivo.`);
      }
    });

    if (itemsErrors.length > 0) {
      errors.items = itemsErrors.join(' | ');
    }

    setReqErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveRequisition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateReqForm()) return;

    try {
      setIsReqSaving(true);
      const payload = {
        projectId: reqProjectId,
        items: reqItems.map(it => ({
          materialId: it.materialId,
          quantity: parseFloat(it.quantity)
        }))
      };

      await request('/api/purchases/requisitions', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      setIsReqDrawerOpen(false);
      loadData();
    } catch (err: any) {
      setReqErrors({ api: err.message || 'Error al enviar la requisición.' });
    } finally {
      setIsReqSaving(false);
    }
  };

  const handleUpdateRequisitionStatus = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    const actionLabel = status === 'APPROVED' ? 'aprobar' : 'rechazar';
    if (!confirm(`¿Está seguro de que desea ${actionLabel} esta requisición de materiales?`)) return;

    try {
      await request(`/api/purchases/requisitions/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status })
      });
      loadData();
    } catch (err: any) {
      alert(`❌ Error al procesar requisición: ${err.message || 'Error desconocido'}`);
    }
  };

  // =============================================================
  // ACCIONES: ÓRDENES DE COMPRA (CREACIÓN / TRANSICIÓN ESTADO)
  // =============================================================
  const handleGenerateOC = (req: Requisition) => {
    setOrderErrors({});
    setOrderSupplierId('');
    setLinkedRequisition(req);
    setOrderItems(req.items.map(it => ({
      materialId: it.materialId,
      quantity: it.quantity,
      unitPrice: it.material?.unitPrice !== undefined ? it.material.unitPrice.toString() : '0'
    })));
    
    setActiveTab('orders');
    setIsOrderDrawerOpen(true);
  };

  const handleOrderItemChange = (index: number, value: string) => {
    const updated = [...orderItems];
    updated[index].unitPrice = value;
    setOrderItems(updated);
  };

  const validateOrderForm = () => {
    const errors: Record<string, string> = {};
    if (!orderSupplierId) errors.supplierId = 'Debe seleccionar un proveedor.';
    
    const itemsErrors: string[] = [];
    orderItems.forEach((item, idx) => {
      const price = parseFloat(item.unitPrice);
      if (isNaN(price) || price < 0) {
        itemsErrors.push(`Fila ${idx + 1}: El precio unitario no puede ser negativo.`);
      }
    });

    if (itemsErrors.length > 0) {
      errors.items = itemsErrors.join(' | ');
    }

    setOrderErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSavePurchaseOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateOrderForm()) return;

    try {
      setIsOrderSaving(true);
      const payload = {
        supplierId: orderSupplierId,
        requisitionId: linkedRequisition?.id || undefined,
        items: orderItems.map(it => ({
          materialId: it.materialId,
          quantity: it.quantity,
          unitPrice: parseFloat(it.unitPrice)
        }))
      };

      await request('/api/purchases/orders', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      setIsOrderDrawerOpen(false);
      loadData();
    } catch (err: any) {
      setOrderErrors({ api: err.message || 'Error al crear la orden de compra.' });
    } finally {
      setIsOrderSaving(false);
    }
  };

  const handleUpdateOrderStatus = async (id: string, status: 'SENT' | 'CANCELLED' | 'COMPLETED') => {
    const statusLabels = {
      SENT: 'emitir',
      CANCELLED: 'cancelar',
      COMPLETED: 'cerrar con faltante'
    };
    
    if (!confirm(`¿Está seguro de que desea ${statusLabels[status]} esta orden de compra?`)) return;

    try {
      await request(`/api/purchases/orders/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status })
      });
      loadData();
    } catch (err: any) {
      alert(`❌ Error al actualizar estado de la orden: ${err.message || 'Error desconocido'}`);
    }
  };

  // =============================================================
  // ACCIONES: RECEPCIONES DE ALMACÉN (REGISTRO)
  // =============================================================
  const handleOpenReceptionDrawer = () => {
    setReceptionErrors({});
    setReceptionOrderId('');
    setReceptionItems([]);
    setIsReceptionDrawerOpen(true);
  };

  const handleReceptionItemChange = (index: number, field: 'quantityReceived' | 'status', value: string) => {
    const updated = [...receptionItems];
    if (field === 'quantityReceived') {
      updated[index].quantityReceived = value;
    } else {
      updated[index].status = value as any;
    }
    setReceptionItems(updated);
  };

  const validateReceptionForm = () => {
    const errors: Record<string, string> = {};
    if (!receptionOrderId) errors.purchaseOrderId = 'Debe seleccionar una orden de compra activa.';
    
    const itemsErrors: string[] = [];
    receptionItems.forEach((item, idx) => {
      const qty = parseFloat(item.quantityReceived);
      if (isNaN(qty) || qty <= 0) {
        itemsErrors.push(`Fila ${idx + 1}: La cantidad recibida debe ser mayor a cero.`);
      }
    });

    if (itemsErrors.length > 0) {
      errors.items = itemsErrors.join(' | ');
    }

    setReceptionErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveReception = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateReceptionForm()) return;

    try {
      setIsReceptionSaving(true);
      const payload = {
        purchaseOrderId: receptionOrderId,
        items: receptionItems.map(it => ({
          materialId: it.materialId,
          quantityReceived: parseFloat(it.quantityReceived),
          status: it.status
        }))
      };

      await request('/api/purchases/receptions', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      setIsReceptionDrawerOpen(false);
      loadData();
    } catch (err: any) {
      // Capturar y mostrar el mensaje de error real del backend (como sobre-recepción)
      setReceptionErrors({ api: err.message || 'Error al registrar la recepción.' });
    } finally {
      setIsReceptionSaving(false);
    }
  };

  // =============================================================
  // ACCIONES: CATÁLOGO DE MATERIALES (CREACIÓN)
  // =============================================================
  const handleOpenMaterialDrawer = () => {
    setMaterialErrors({});
    setMaterialFormData({
      name: '',
      unit: '',
      sku: '',
      unitPrice: '',
    });
    setIsMaterialDrawerOpen(true);
  };

  const validateMaterialForm = () => {
    const errors: Record<string, string> = {};
    if (!materialFormData.name.trim()) errors.name = 'El nombre del material es requerido.';
    if (!materialFormData.unit.trim()) errors.unit = 'La unidad de medida es requerida.';
    if (!materialFormData.sku.trim()) errors.sku = 'El código SKU es requerido.';
    
    const priceVal = parseFloat(materialFormData.unitPrice);
    if (!materialFormData.unitPrice) {
      errors.unitPrice = 'El precio unitario es requerido.';
    } else if (isNaN(priceVal) || priceVal < 0) {
      errors.unitPrice = 'El precio unitario no puede ser negativo.';
    }

    setMaterialErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateMaterialForm()) return;

    try {
      setIsMaterialSaving(true);
      const payload = {
        name: materialFormData.name,
        unit: materialFormData.unit,
        sku: materialFormData.sku,
        unitPrice: parseFloat(materialFormData.unitPrice),
      };

      await request('/api/inventory/materials', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setIsMaterialDrawerOpen(false);
      // Recargar catálogo
      const updatedMaterials = await request('/api/inventory/materials');
      setMaterials(updatedMaterials);
      loadData();
    } catch (err: any) {
      setMaterialErrors({ api: err.message || 'Error al registrar el material.' });
    } finally {
      setIsMaterialSaving(false);
    }
  };

  // Filtrado de listas
  const filteredRequisitions = requisitions.filter(req => {
    if (!requisitionFilter) return true;
    return req.status === requisitionFilter;
  });

  const filteredOrders = purchaseOrders.filter(po => {
    if (!orderFilter) return true;
    return po.status === orderFilter;
  });

  // Órdenes elegibles para recepción (SENT o PARTIALLY_RECEIVED)
  const activeOrdersForReception = purchaseOrders.filter(po => 
    po.status === 'SENT' || po.status === 'PARTIALLY_RECEIVED'
  );

  return (
    <div className="space-y-6 font-sans text-left">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-brand-text font-serif">Compras y Abastecimiento</h1>
          <p className="text-sm text-brand-secondary">Proveedores, requisiciones de obra, órdenes de compra y recepciones</p>
        </div>
      </div>

      {/* Tabs de Navegación del Módulo */}
      <div className="flex border-b border-brand-secondary/20">
        <button
          onClick={() => setActiveTab('suppliers')}
          className={`px-5 py-3 text-xs font-semibold uppercase tracking-wider border-b-2 flex items-center gap-2 transition-all ${
            activeTab === 'suppliers'
              ? 'border-brand-primary text-brand-primary font-bold'
              : 'border-transparent text-brand-secondary hover:text-brand-text'
          }`}
        >
          <Users className="w-4 h-4" />
          Proveedores
        </button>
        <button
          onClick={() => setActiveTab('requisitions')}
          className={`px-5 py-3 text-xs font-semibold uppercase tracking-wider border-b-2 flex items-center gap-2 transition-all ${
            activeTab === 'requisitions'
              ? 'border-brand-primary text-brand-primary font-bold'
              : 'border-transparent text-brand-secondary hover:text-brand-text'
          }`}
        >
          <FileText className="w-4 h-4" />
          Requisiciones
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-5 py-3 text-xs font-semibold uppercase tracking-wider border-b-2 flex items-center gap-2 transition-all ${
            activeTab === 'orders'
              ? 'border-brand-primary text-brand-primary font-bold'
              : 'border-transparent text-brand-secondary hover:text-brand-text'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          Órdenes de Compra
        </button>
        <button
          onClick={() => setActiveTab('receptions')}
          className={`px-5 py-3 text-xs font-semibold uppercase tracking-wider border-b-2 flex items-center gap-2 transition-all ${
            activeTab === 'receptions'
              ? 'border-brand-primary text-brand-primary font-bold'
              : 'border-transparent text-brand-secondary hover:text-brand-text'
          }`}
        >
          <Truck className="w-4 h-4" />
          Recepciones
        </button>
        <button
          onClick={() => setActiveTab('materials')}
          className={`px-5 py-3 text-xs font-semibold uppercase tracking-wider border-b-2 flex items-center gap-2 transition-all ${
            activeTab === 'materials'
              ? 'border-brand-primary text-brand-primary font-bold'
              : 'border-transparent text-brand-secondary hover:text-brand-text'
          }`}
        >
          <Package className="w-4 h-4" />
          Catálogo Materiales
        </button>
      </div>

      {/* Vista de Tablas */}
      {loading ? (
        <SkeletonTable cols={5} rows={4} />
      ) : error ? (
        <div className="p-4 bg-brand-negative/10 border border-brand-negative/30 rounded text-brand-negative text-sm">
          {error}
        </div>
      ) : (
        <>
          {/* TAB 5: MATERIALES */}
          {activeTab === 'materials' && (
            <div className="space-y-4">
              <div className="flex justify-end">
                {hasPermission('CREATE', 'COMPRAS') && (
                  <Button variant="primary" size="sm" onClick={handleOpenMaterialDrawer} className="flex items-center gap-1.5">
                    <Plus className="w-4 h-4" /> Nuevo Insumo
                  </Button>
                )}
              </div>

              {materials.length === 0 ? (
                <div className="bg-white/60 border border-brand-secondary/20 p-8 rounded-lg text-center text-brand-secondary">
                  <Package className="w-12 h-12 mx-auto text-brand-secondary/40 mb-3" />
                  <p className="font-medium">No hay insumos registrados en el catálogo.</p>
                </div>
              ) : (
                <Card className="bg-white/70 border border-brand-secondary/20 shadow-sm p-0 overflow-hidden">
                  <Table headers={['Nombre Insumo', 'Unidad de Medida', 'Código SKU / ID', 'Precio Referencial']}>
                    {materials.map((mat) => (
                      <tr key={mat.id} className="hover:bg-brand-bg/50 border-b border-brand-secondary/15 text-xs text-left">
                        <td className="px-6 py-4 font-semibold text-brand-text font-serif">
                          {mat.name}
                        </td>
                        <td className="px-6 py-4 text-brand-secondary">
                          {mat.unit}
                        </td>
                        <td className="px-6 py-4 font-mono text-brand-secondary">
                          {mat.sku}
                        </td>
                        <td className="px-6 py-4 font-mono text-brand-text font-semibold">
                          ${Number(mat.unitPrice ?? 0).toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </Table>
                </Card>
              )}
            </div>
          )}

          {/* TAB 1: PROVEEDORES */}
          {activeTab === 'suppliers' && (
            <div className="space-y-4">
              <div className="flex justify-end">
                {hasPermission('CREATE', 'COMPRAS') && (
                  <Button variant="primary" size="sm" onClick={() => handleOpenSupplierDrawer()} className="flex items-center gap-1.5">
                    <Plus className="w-4 h-4" /> Nuevo Proveedor
                  </Button>
                )}
              </div>

              {suppliers.length === 0 ? (
                <div className="bg-white/60 border border-brand-secondary/20 p-8 rounded-lg text-center text-brand-secondary">
                  <Users className="w-12 h-12 mx-auto text-brand-secondary/40 mb-3" />
                  <p className="font-medium">No hay proveedores registrados.</p>
                </div>
              ) : (
                <Card className="bg-white/70 border border-brand-secondary/20 shadow-sm p-0 overflow-hidden">
                  <Table headers={['Proveedor / Tax ID', 'Contacto', 'Condición Pago', 'Calificación', 'Acciones']}>
                    {suppliers.map((sup) => (
                      <tr key={sup.id} className="hover:bg-brand-bg/50 border-b border-brand-secondary/15">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-brand-text text-sm font-serif">{sup.name}</div>
                          <div className="text-[10px] text-brand-secondary font-mono mt-0.5">ID: {sup.taxId}</div>
                        </td>
                        <td className="px-6 py-4 text-xs text-brand-secondary">
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1"><Mail className="w-3.5 h-3.5 text-brand-secondary/60" /> {sup.email}</div>
                            <div className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-brand-secondary/60" /> {sup.phone}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs text-brand-text font-medium">
                          {sup.paymentTerms}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1 text-brand-primary font-bold text-xs">
                            <Star className="w-4 h-4 fill-brand-primary text-brand-primary" />
                            <span>{sup.rating.toFixed(1)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {hasPermission('UPDATE', 'COMPRAS') && (
                              <button
                                onClick={() => handleOpenSupplierDrawer(sup)}
                                title="Editar"
                                className="text-brand-primary hover:text-brand-text hover:bg-brand-primary/10 rounded p-1 transition-colors"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                            )}
                            {hasPermission('DELETE', 'COMPRAS') && (
                              <button
                                onClick={() => handleDeleteClick(sup)}
                                title="Dar de baja"
                                className="text-brand-negative hover:text-brand-text hover:bg-brand-negative/10 rounded p-1 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </Table>
                </Card>
              )}
            </div>
          )}

          {/* TAB 2: REQUISICIONES */}
          {activeTab === 'requisitions' && (
            <div className="space-y-4">
              <div className="flex flex-wrap justify-between items-center gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-brand-text">Filtrar por Estado</label>
                  <select
                    value={requisitionFilter}
                    onChange={(e) => setRequisitionFilter(e.target.value)}
                    className="bg-brand-bg border border-brand-secondary/30 rounded text-brand-text px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-primary w-48"
                  >
                    <option value="">Todas las Requisiciones</option>
                    <option value="PENDING">Pendientes</option>
                    <option value="APPROVED">Aprobadas</option>
                    <option value="REJECTED">Rechazadas</option>
                    <option value="ORDERED">Ordenadas (OC creada)</option>
                  </select>
                </div>
                {hasPermission('CREATE', 'COMPRAS') && (
                  <Button variant="primary" size="sm" onClick={handleOpenReqDrawer} className="flex items-center gap-1.5">
                    <Plus className="w-4 h-4" /> Nueva Requisición
                  </Button>
                )}
              </div>

              {filteredRequisitions.length === 0 ? (
                <div className="bg-white/60 border border-brand-secondary/20 p-8 rounded-lg text-center text-brand-secondary">
                  <FileText className="w-12 h-12 mx-auto text-brand-secondary/40 mb-3" />
                  <p className="font-medium">No se encontraron requisiciones.</p>
                </div>
              ) : (
                <Card className="bg-white/70 border border-brand-secondary/20 shadow-sm p-0 overflow-hidden">
                  <Table headers={['Proyecto', 'Solicitado Por', 'Artículos Requeridos', 'Estado', 'Acciones']}>
                    {filteredRequisitions.map((req) => (
                      <tr key={req.id} className="hover:bg-brand-bg/50 border-b border-brand-secondary/15">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-brand-text text-sm font-serif">{req.project?.name}</div>
                          <div className="text-[10px] text-brand-secondary flex items-center gap-1 mt-0.5">
                            <Briefcase className="w-3.5 h-3.5" />
                            {req.project?.location}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs text-brand-text">
                          <div>{req.requestedBy?.firstName} {req.requestedBy?.lastName}</div>
                          <div className="text-[10px] text-brand-secondary font-mono mt-0.5">{req.requestedBy?.email}</div>
                        </td>
                        <td className="px-6 py-4">
                          <ul className="list-disc list-inside text-xs text-brand-secondary space-y-1">
                            {req.items?.map((item) => (
                              <li key={item.id}>
                                <span className="font-medium text-brand-text">{item.quantity} {item.material?.unit}</span> de {item.material?.name}
                              </li>
                            ))}
                          </ul>
                        </td>
                        <td className="px-6 py-4">
                          {req.status === 'PENDING' && (
                            <span className="px-2 py-0.5 text-[9px] font-bold rounded bg-brand-primary/10 text-brand-primary border border-brand-primary/20">PENDIENTE</span>
                          )}
                          {req.status === 'APPROVED' && (
                            <span className="px-2 py-0.5 text-[9px] font-bold rounded bg-brand-positive/10 text-brand-positive border border-brand-positive/20">APROBADA</span>
                          )}
                          {req.status === 'REJECTED' && (
                            <span className="px-2 py-0.5 text-[9px] font-bold rounded bg-brand-negative/10 text-brand-negative border border-brand-negative/20">RECHAZADA</span>
                          )}
                          {req.status === 'ORDERED' && (
                            <span className="px-2 py-0.5 text-[9px] font-bold rounded bg-brand-forest/15 text-brand-forest border border-brand-forest/20">ORDENADA</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap items-center gap-2">
                            {req.status === 'PENDING' && hasPermission('APPROVE', 'COMPRAS') && (
                              <>
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() => handleUpdateRequisitionStatus(req.id, 'APPROVED')}
                                  className="flex items-center gap-1 text-[11px]"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" /> Aprobar
                                </Button>
                                <Button
                                  variant="danger"
                                  size="sm"
                                  onClick={() => handleUpdateRequisitionStatus(req.id, 'REJECTED')}
                                  className="flex items-center gap-1 text-[11px]"
                                >
                                  <XCircle className="w-3.5 h-3.5" /> Rechazar
                                </Button>
                              </>
                            )}
                            {req.status === 'APPROVED' && hasPermission('CREATE', 'COMPRAS') && (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleGenerateOC(req)}
                                className="flex items-center gap-1 text-[11px] font-semibold text-brand-forest hover:bg-brand-forest/10"
                              >
                                <ShoppingBag className="w-3.5 h-3.5" /> Generar OC
                              </Button>
                            )}
                            {req.status === 'REJECTED' && <span className="text-xs text-brand-secondary/60 italic">Rechazada</span>}
                            {req.status === 'ORDERED' && <span className="text-xs text-brand-forest/70 font-semibold flex items-center gap-1">✓ Orden Compra</span>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </Table>
                </Card>
              )}
            </div>
          )}

          {/* TAB 3: ÓRDENES DE COMPRA */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              <div className="flex flex-wrap justify-between items-center gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-brand-text">Filtrar por Estado</label>
                  <select
                    value={orderFilter}
                    onChange={(e) => setOrderFilter(e.target.value)}
                    className="bg-brand-bg border border-brand-secondary/30 rounded text-brand-text px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-primary w-48"
                  >
                    <option value="">Todas las Órdenes</option>
                    <option value="DRAFT">Borrador (DRAFT)</option>
                    <option value="SENT">Emitida (SENT)</option>
                    <option value="PARTIALLY_RECEIVED">Recepción Parcial</option>
                    <option value="COMPLETED">Completada</option>
                    <option value="CANCELLED">Cancelada</option>
                  </select>
                </div>
              </div>

              {filteredOrders.length === 0 ? (
                <div className="bg-white/60 border border-brand-secondary/20 p-8 rounded-lg text-center text-brand-secondary">
                  <ShoppingBag className="w-12 h-12 mx-auto text-brand-secondary/40 mb-3" />
                  <p className="font-medium">No se encontraron órdenes de compra.</p>
                </div>
              ) : (
                <Card className="bg-white/70 border border-brand-secondary/20 shadow-sm p-0 overflow-hidden">
                  <Table headers={['Código OC', 'Proveedor', 'Proyecto Asoc.', 'Monto Total', 'Estado', 'Acciones']}>
                    {filteredOrders.map((po) => (
                      <tr key={po.id} className="hover:bg-brand-bg/50 border-b border-brand-secondary/15">
                        <td className="px-6 py-4 font-mono text-xs font-semibold text-brand-text">
                          OC-{po.id.substring(0, 8).toUpperCase()}
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-brand-text text-xs">{po.supplier?.name}</div>
                          <div className="text-[10px] text-brand-secondary font-mono mt-0.5">RUC: {po.supplier?.taxId}</div>
                        </td>
                        <td className="px-6 py-4 text-xs text-brand-text">
                          {po.requisition?.project?.name || <span className="italic text-brand-secondary">Sin requisición</span>}
                          {po.requisition?.project?.location && (
                            <div className="text-[10px] text-brand-secondary flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3" /> {po.requisition.project.location}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 font-mono text-xs font-bold text-brand-text">
                          ${po.totalAmount.toLocaleString('es-CL')}
                        </td>
                        <td className="px-6 py-4">
                          {po.status === 'DRAFT' && (
                            <span className="px-2 py-0.5 text-[9px] font-bold rounded bg-brand-secondary/15 text-brand-secondary border border-brand-secondary/25">BORRADOR</span>
                          )}
                          {po.status === 'SENT' && (
                            <span className="px-2 py-0.5 text-[9px] font-bold rounded bg-brand-primary/10 text-brand-primary border border-brand-primary/20">EMITIDA</span>
                          )}
                          {po.status === 'PARTIALLY_RECEIVED' && (
                            <span className="px-2 py-0.5 text-[9px] font-bold rounded bg-brand-positive/10 text-brand-positive border border-brand-positive/20">RC. PARCIAL</span>
                          )}
                          {po.status === 'COMPLETED' && (
                            <span className="px-2 py-0.5 text-[9px] font-bold rounded bg-brand-forest/15 text-brand-forest border border-brand-forest/20">COMPLETADA</span>
                          )}
                          {po.status === 'CANCELLED' && (
                            <span className="px-2 py-0.5 text-[9px] font-bold rounded bg-brand-negative/10 text-brand-negative border border-brand-negative/20">CANCELADA</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap items-center gap-2">
                            {po.status === 'DRAFT' && hasPermission('APPROVE', 'COMPRAS') && (
                              <>
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() => handleUpdateOrderStatus(po.id, 'SENT')}
                                  className="flex items-center gap-1 text-[11px]"
                                >
                                  <Send className="w-3.5 h-3.5" /> Emitir (SENT)
                                </Button>
                                <Button
                                  variant="danger"
                                  size="sm"
                                  onClick={() => handleUpdateOrderStatus(po.id, 'CANCELLED')}
                                  className="flex items-center gap-1 text-[11px]"
                                >
                                  <XCircle className="w-3.5 h-3.5" /> Cancelar
                                </Button>
                              </>
                            )}
                            {(po.status === 'SENT' || po.status === 'PARTIALLY_RECEIVED') && hasPermission('APPROVE', 'COMPRAS') && (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleUpdateOrderStatus(po.id, 'COMPLETED')}
                                className="flex items-center gap-1 text-[11px] font-semibold text-brand-primary hover:bg-brand-primary/10"
                              >
                                <Archive className="w-3.5 h-3.5" /> Cerrar Faltante
                              </Button>
                            )}
                            {po.status === 'COMPLETED' && <span className="text-xs text-brand-forest/70 font-semibold">✓ Completada</span>}
                            {po.status === 'CANCELLED' && <span className="text-xs text-brand-negative/70 italic">Cancelada</span>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </Table>
                </Card>
              )}
            </div>
          )}

          {/* TAB 4: RECEPCIONES */}
          {activeTab === 'receptions' && (
            <div className="space-y-4">
              <div className="flex justify-end">
                {hasPermission('CREATE', 'COMPRAS') && (
                  <Button variant="primary" size="sm" onClick={handleOpenReceptionDrawer} className="flex items-center gap-1.5">
                    <Plus className="w-4 h-4" /> Registrar Recepción
                  </Button>
                )}
              </div>

              {receptions.length === 0 ? (
                <div className="bg-white/60 border border-brand-secondary/20 p-8 rounded-lg text-center text-brand-secondary">
                  <Truck className="w-12 h-12 mx-auto text-brand-secondary/40 mb-3" />
                  <p className="font-medium">No se encontraron recepciones de stock registradas.</p>
                </div>
              ) : (
                <Card className="bg-white/70 border border-brand-secondary/20 shadow-sm p-0 overflow-hidden">
                  <Table headers={['Código Recep.', 'Orden de Compra', 'Proveedor', 'Materiales Recibidos', 'Recibido Por', 'Fecha']}>
                    {receptions.map((rec) => (
                      <tr key={rec.id} className="hover:bg-brand-bg/50 border-b border-brand-secondary/15">
                        <td className="px-6 py-4 font-mono text-xs font-semibold text-brand-text">
                          REC-{rec.id.substring(0, 8).toUpperCase()}
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-brand-secondary">
                          OC-{rec.purchaseOrder?.id?.substring(0, 8).toUpperCase() || 'S/N'}
                        </td>
                        <td className="px-6 py-4 text-xs text-brand-text">
                          {rec.purchaseOrder?.supplier?.name || <span className="italic text-brand-secondary">Sin proveedor</span>}
                        </td>
                        <td className="px-6 py-4">
                          <ul className="text-xs text-brand-secondary space-y-1">
                            {rec.items?.map((item) => (
                              <li key={item.id} className="flex items-center gap-2">
                                <span className="font-semibold text-brand-text">{item.quantityReceived} {item.material?.unit}</span> de {item.material?.name}
                                {item.status === 'CONFORM' && (
                                  <span className="px-1 text-[8.5px] font-bold bg-brand-positive/10 text-brand-positive border border-brand-positive/20 rounded">CONFORME</span>
                                )}
                                {item.status === 'DEFECTIVE' && (
                                  <span className="px-1 text-[8.5px] font-bold bg-brand-negative/10 text-brand-negative border border-brand-negative/20 rounded flex items-center gap-0.5"><AlertTriangle className="w-2.5 h-2.5" /> DEFECTUOSO</span>
                                )}
                                {item.status === 'DISCREPANCY' && (
                                  <span className="px-1 text-[8.5px] font-bold bg-brand-primary/10 text-brand-primary border border-brand-primary/20 rounded">DISCREPANCIA</span>
                                )}
                              </li>
                            ))}
                          </ul>
                        </td>
                        <td className="px-6 py-4 text-xs text-brand-text">
                          {rec.receivedBy?.firstName} {rec.receivedBy?.lastName}
                        </td>
                        <td className="px-6 py-4 text-xs text-brand-secondary">
                          {new Date(rec.receivedAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </Table>
                </Card>
              )}
            </div>
          )}
        </>
      )}

      {/* DRAWER: Crear/Editar Proveedor */}
      <Drawer
        isOpen={isSupplierDrawerOpen}
        onClose={() => setIsSupplierDrawerOpen(false)}
        title={editingSupplier ? 'Editar Ficha de Proveedor' : 'Registrar Nuevo Proveedor'}
      >
        <form onSubmit={handleSaveSupplier} className="space-y-4">
          {supplierErrors.api && (
            <div className="p-3 bg-brand-negative/10 border border-brand-negative/20 rounded text-brand-negative text-xs">
              {supplierErrors.api}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-brand-text mb-1.5">Razón Social / Nombre</label>
            <input
              type="text"
              required
              value={supplierFormData.name}
              onChange={(e) => setSupplierFormData({ ...supplierFormData, name: e.target.value })}
              className="block w-full px-3 py-2 bg-brand-bg border border-brand-secondary/30 rounded text-brand-text text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
              placeholder="Ferretería Industrial S.A."
            />
            {supplierErrors.name && <p className="text-[10px] text-brand-negative mt-1">{supplierErrors.name}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-brand-text mb-1.5">ID Tributario (RUT / RUC)</label>
            <input
              type="text"
              required
              value={supplierFormData.taxId}
              onChange={(e) => setSupplierFormData({ ...supplierFormData, taxId: e.target.value })}
              className="block w-full px-3 py-2 bg-brand-bg border border-brand-secondary/30 rounded text-brand-text text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
              placeholder="76.543.210-K"
            />
            {supplierErrors.taxId && <p className="text-[10px] text-brand-negative mt-1">{supplierErrors.taxId}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-brand-text mb-1.5">Correo Electrónico</label>
            <input
              type="email"
              required
              value={supplierFormData.email}
              onChange={(e) => setSupplierFormData({ ...supplierFormData, email: e.target.value })}
              className="block w-full px-3 py-2 bg-brand-bg border border-brand-secondary/30 rounded text-brand-text text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
              placeholder="contacto@ferreteria.com"
            />
            {supplierErrors.email && <p className="text-[10px] text-brand-negative mt-1">{supplierErrors.email}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-brand-text mb-1.5">Teléfono</label>
            <input
              type="text"
              required
              value={supplierFormData.phone}
              onChange={(e) => setSupplierFormData({ ...supplierFormData, phone: e.target.value })}
              className="block w-full px-3 py-2 bg-brand-bg border border-brand-secondary/30 rounded text-brand-text text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
              placeholder="+5622345678"
            />
            {supplierErrors.phone && <p className="text-[10px] text-brand-negative mt-1">{supplierErrors.phone}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-brand-text mb-1.5">Dirección Comercial</label>
            <input
              type="text"
              required
              value={supplierFormData.address}
              onChange={(e) => setSupplierFormData({ ...supplierFormData, address: e.target.value })}
              className="block w-full px-3 py-2 bg-brand-bg border border-brand-secondary/30 rounded text-brand-text text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
              placeholder="Av. Industrial 450, Santiago"
            />
            {supplierErrors.address && <p className="text-[10px] text-brand-negative mt-1">{supplierErrors.address}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-brand-text mb-1.5">Términos de Pago</label>
            <input
              type="text"
              required
              value={supplierFormData.paymentTerms}
              onChange={(e) => setSupplierFormData({ ...supplierFormData, paymentTerms: e.target.value })}
              className="block w-full px-3 py-2 bg-brand-bg border border-brand-secondary/30 rounded text-brand-text text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
              placeholder="30 días, Contado, etc."
            />
            {supplierErrors.paymentTerms && <p className="text-[10px] text-brand-negative mt-1">{supplierErrors.paymentTerms}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-brand-text mb-1.5 flex justify-between">
              <span>Calificación del Proveedor</span>
              <span className="font-bold text-brand-primary">{supplierFormData.rating} / 5.0</span>
            </label>
            <input
              type="range"
              min="1.0"
              max="5.0"
              step="0.5"
              value={supplierFormData.rating}
              onChange={(e) => setSupplierFormData({ ...supplierFormData, rating: e.target.value })}
              className="w-full accent-brand-primary bg-brand-bg rounded-lg h-2 cursor-pointer mt-1"
            />
            {supplierErrors.rating && <p className="text-[10px] text-brand-negative mt-1">{supplierErrors.rating}</p>}
          </div>

          <div className="pt-3 border-t border-brand-secondary/15 flex justify-end gap-3">
            <Button variant="secondary" size="sm" type="button" onClick={() => setIsSupplierDrawerOpen(false)} disabled={isSupplierSaving}>
              Cancelar
            </Button>
            <Button variant="primary" size="sm" type="submit" disabled={isSupplierSaving}>
              {isSupplierSaving ? 'Guardando...' : editingSupplier ? 'Guardar Cambios' : 'Registrar'}
            </Button>
          </div>
        </form>
      </Drawer>

      {/* DRAWER: Crear Requisición */}
      <Drawer
        isOpen={isReqDrawerOpen}
        onClose={() => setIsReqDrawerOpen(false)}
        title="Crear Requisición de Materiales"
      >
        <form onSubmit={handleSaveRequisition} className="space-y-4">
          {reqErrors.api && (
            <div className="p-3 bg-brand-negative/10 border border-brand-negative/20 rounded text-brand-negative text-xs">
              {reqErrors.api}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-brand-text mb-1.5">Proyecto de Destino</label>
            <select
              required
              value={reqProjectId}
              onChange={(e) => setReqProjectId(e.target.value)}
              className="block w-full px-3 py-2 bg-brand-bg border border-brand-secondary/30 rounded text-brand-text text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
            >
              <option value="">Seleccione obra de destino...</option>
              {projects.map((proj) => (
                <option key={proj.id} value={proj.id}>
                  {proj.name} ({proj.location})
                </option>
              ))}
            </select>
            {reqErrors.projectId && <p className="text-[10px] text-brand-negative mt-1">{reqErrors.projectId}</p>}
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-brand-text flex justify-between items-center">
              <span>Artículos Requeridos</span>
              <Button type="button" variant="secondary" size="sm" onClick={handleAddReqItem} className="flex items-center gap-1 py-0.5 text-[10px]">
                <ListPlus className="w-3.5 h-3.5" /> Fila
              </Button>
            </label>

            {reqItems.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 border-b border-brand-secondary/10 pb-2">
                <div className="flex-1">
                  <select
                    required
                    value={item.materialId}
                    onChange={(e) => handleReqItemChange(idx, 'materialId', e.target.value)}
                    className="block w-full px-2 py-1.5 bg-brand-bg border border-brand-secondary/30 rounded text-brand-text text-xs focus:outline-none focus:ring-1 focus:ring-brand-primary"
                  >
                    <option value="">Seleccione material...</option>
                    {materials.map((mat) => (
                      <option key={mat.id} value={mat.id}>
                        {mat.name} ({mat.unit})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-24">
                  <input
                    type="number"
                    required
                    min="0.01"
                    step="any"
                    value={item.quantity}
                    onChange={(e) => handleReqItemChange(idx, 'quantity', e.target.value)}
                    className="block w-full px-2 py-1.5 bg-brand-bg border border-brand-secondary/30 rounded text-brand-text text-xs text-center focus:outline-none focus:ring-1 focus:ring-brand-primary"
                    placeholder="Cantidad"
                  />
                </div>
                {reqItems.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveReqItem(idx)}
                    className="text-brand-negative hover:bg-brand-negative/10 rounded p-1 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            {reqErrors.items && <p className="text-[10px] text-brand-negative mt-1">{reqErrors.items}</p>}
          </div>

          <div className="pt-3 border-t border-brand-secondary/15 flex justify-end gap-3">
            <Button variant="secondary" size="sm" type="button" onClick={() => setIsReqDrawerOpen(false)} disabled={isReqSaving}>
              Cancelar
            </Button>
            <Button variant="primary" size="sm" type="submit" disabled={isReqSaving || materials.length === 0}>
              {isReqSaving ? 'Enviando...' : 'Enviar Requisición'}
            </Button>
          </div>
        </form>
      </Drawer>

      {/* DRAWER: Crear Orden de Compra (desde Requisición) */}
      <Drawer
        isOpen={isOrderDrawerOpen}
        onClose={() => setIsOrderDrawerOpen(false)}
        title="Generar Orden de Compra"
      >
        <form onSubmit={handleSavePurchaseOrder} className="space-y-4">
          {orderErrors.api && (
            <div className="p-3 bg-brand-negative/10 border border-brand-negative/20 rounded text-brand-negative text-xs">
              {orderErrors.api}
            </div>
          )}

          <div className="p-3 bg-brand-forest/10 border border-brand-forest/20 rounded text-xs text-brand-text">
            <strong>Requisición Origen:</strong> RQ-{linkedRequisition?.id.substring(0,8).toUpperCase()} <br />
            <strong>Destino Obra:</strong> {linkedRequisition?.project?.name}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-brand-text mb-1.5">Proveedor Asignado</label>
            <select
              required
              value={orderSupplierId}
              onChange={(e) => setOrderSupplierId(e.target.value)}
              className="block w-full px-3 py-2 bg-brand-bg border border-brand-secondary/30 rounded text-brand-text text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
            >
              <option value="">Seleccione proveedor...</option>
              {suppliersList.map((sup) => (
                <option key={sup.id} value={sup.id}>
                  {sup.name} (Términos: {sup.paymentTerms})
                </option>
              ))}
            </select>
            {orderErrors.supplierId && <p className="text-[10px] text-brand-negative mt-1">{orderErrors.supplierId}</p>}
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-brand-text">Precios Unitarios de Compra</label>
            {orderItems.map((item, idx) => {
              const mat = materials.find(m => m.id === item.materialId);
              return (
                <div key={idx} className="flex items-center justify-between gap-3 border-b border-brand-secondary/10 pb-2 text-xs">
                  <div className="flex-1 font-medium text-brand-text">
                    {mat?.name} ({item.quantity} {mat?.unit})
                  </div>
                  <div className="w-32 relative">
                    <span className="absolute inset-y-0 left-0 pl-2 flex items-center text-brand-secondary text-xs">$</span>
                    <input
                      type="number"
                      required
                      min="0"
                      step="any"
                      value={item.unitPrice}
                      onChange={(e) => handleOrderItemChange(idx, e.target.value)}
                      className="block w-full pl-6 pr-2 py-1 bg-brand-bg border border-brand-secondary/30 rounded text-brand-text text-xs text-center focus:outline-none focus:ring-1 focus:ring-brand-primary"
                      placeholder="Precio Unit."
                    />
                  </div>
                </div>
              );
            })}
            {orderErrors.items && <p className="text-[10px] text-brand-negative mt-1">{orderErrors.items}</p>}
          </div>

          <div className="pt-3 border-t border-brand-secondary/15 flex justify-end gap-3">
            <Button variant="secondary" size="sm" type="button" onClick={() => setIsOrderDrawerOpen(false)} disabled={isOrderSaving}>
              Cancelar
            </Button>
            <Button variant="primary" size="sm" type="submit" disabled={isOrderSaving || suppliersList.length === 0}>
              {isOrderSaving ? 'Generando...' : 'Generar Orden'}
            </Button>
          </div>
        </form>
      </Drawer>

      {/* DRAWER: Registrar Recepción (Warehouse Reception) */}
      <Drawer
        isOpen={isReceptionDrawerOpen}
        onClose={() => setIsReceptionDrawerOpen(false)}
        title="Registrar Recepción de Materiales"
      >
        <form onSubmit={handleSaveReception} className="space-y-4">
          {receptionErrors.api && (
            <div className="p-3 bg-brand-negative/10 border border-brand-negative/20 rounded text-brand-negative text-xs">
              {receptionErrors.api}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-brand-text mb-1.5">Orden de Compra Activa</label>
            <select
              required
              value={receptionOrderId}
              onChange={(e) => setReceptionOrderId(e.target.value)}
              className="block w-full px-3 py-2 bg-brand-bg border border-brand-secondary/30 rounded text-brand-text text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
            >
              <option value="">Seleccione OC despachada...</option>
              {activeOrdersForReception.map((po) => (
                <option key={po.id} value={po.id}>
                  OC-{po.id.substring(0, 8).toUpperCase()} − {po.supplier?.name}
                </option>
              ))}
            </select>
            {receptionErrors.purchaseOrderId && <p className="text-[10px] text-brand-negative mt-1">{receptionErrors.purchaseOrderId}</p>}
            {activeOrdersForReception.length === 0 && (
              <p className="text-[10px] text-brand-secondary/80 mt-1.5 italic">
                * No hay órdenes de compra activas en tránsito (SENT / PARTIALLY_RECEIVED) para recibir.
              </p>
            )}
          </div>

          <div className="space-y-4">
            {receptionItems.map((item, idx) => {
              const mat = materials.find(m => m.id === item.materialId);
              const selectedPo = purchaseOrders.find(po => po.id === receptionOrderId);
              const orderedItem = selectedPo?.items.find(it => it.materialId === item.materialId);
              
              return (
                <div key={idx} className="bg-brand-bg/50 border border-brand-secondary/15 p-3 rounded-lg space-y-3">
                  <div className="text-xs font-semibold text-brand-text flex justify-between">
                    <span>{mat?.name}</span>
                    <span className="text-[10.5px] text-brand-secondary">Pedido: {orderedItem?.quantity} {mat?.unit}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9.5px] font-bold uppercase tracking-wider text-brand-secondary mb-1">Cant. Recibida</label>
                      <input
                        type="number"
                        required
                        min="0.01"
                        step="any"
                        value={item.quantityReceived}
                        onChange={(e) => handleReceptionItemChange(idx, 'quantityReceived', e.target.value)}
                        className="block w-full px-2 py-1 bg-white border border-brand-secondary/30 rounded text-brand-text text-xs focus:outline-none focus:ring-1 focus:ring-brand-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-[9.5px] font-bold uppercase tracking-wider text-brand-secondary mb-1">Estado de Ítem</label>
                      <select
                        value={item.status}
                        onChange={(e) => handleReceptionItemChange(idx, 'status', e.target.value)}
                        className="block w-full px-2 py-1 bg-white border border-brand-secondary/30 rounded text-brand-text text-xs focus:outline-none focus:ring-1 focus:ring-brand-primary"
                      >
                        <option value="CONFORM">Conforme</option>
                        <option value="DEFECTIVE">Defectuoso</option>
                        <option value="DISCREPANCY">Discrepancia</option>
                      </select>
                    </div>
                  </div>
                </div>
              );
            })}
            {receptionErrors.items && <p className="text-[10px] text-brand-negative mt-1">{receptionErrors.items}</p>}
          </div>

          <div className="pt-3 border-t border-brand-secondary/15 flex justify-end gap-3">
            <Button variant="secondary" size="sm" type="button" onClick={() => setIsReceptionDrawerOpen(false)} disabled={isReceptionSaving}>
              Cancelar
            </Button>
            <Button variant="primary" size="sm" type="submit" disabled={isReceptionSaving || receptionItems.length === 0}>
              {isReceptionSaving ? 'Registrando...' : 'Registrar Recepción'}
            </Button>
          </div>
        </form>
      </Drawer>

      {/* DRAWER: Registrar Nuevo Material */}
      <Drawer
        isOpen={isMaterialDrawerOpen}
        onClose={() => setIsMaterialDrawerOpen(false)}
        title="Registrar Nuevo Insumo al Catálogo"
      >
        <form onSubmit={handleSaveMaterial} className="space-y-4">
          {materialErrors.api && (
            <div className="p-3 bg-brand-negative/10 border border-brand-negative/20 rounded text-brand-negative text-xs">
              {materialErrors.api}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-brand-text mb-1.5">Nombre del Insumo</label>
            <input
              type="text"
              required
              value={materialFormData.name}
              onChange={(e) => setMaterialFormData({ ...materialFormData, name: e.target.value })}
              className="block w-full px-3 py-2 bg-brand-bg border border-brand-secondary/30 rounded text-brand-text text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
              placeholder="Cemento Melón Extra"
            />
            {materialErrors.name && <p className="text-[10px] text-brand-negative mt-1">{materialErrors.name}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-brand-text mb-1.5">Unidad de Medida</label>
            <input
              type="text"
              required
              value={materialFormData.unit}
              onChange={(e) => setMaterialFormData({ ...materialFormData, unit: e.target.value })}
              className="block w-full px-3 py-2 bg-brand-bg border border-brand-secondary/30 rounded text-brand-text text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
              placeholder="Sacos, Kg, m3, un., etc."
            />
            {materialErrors.unit && <p className="text-[10px] text-brand-negative mt-1">{materialErrors.unit}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-brand-text mb-1.5">Código SKU / Identificador</label>
            <input
              type="text"
              required
              value={materialFormData.sku}
              onChange={(e) => setMaterialFormData({ ...materialFormData, sku: e.target.value })}
              className="block w-full px-3 py-2 bg-brand-bg border border-brand-secondary/30 rounded text-brand-text text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
              placeholder="CEM-MELON-X"
            />
            {materialErrors.sku && <p className="text-[10px] text-brand-negative mt-1">{materialErrors.sku}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-brand-text mb-1.5">Precio de Referencia Unitario</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-brand-secondary text-sm">$</span>
              <input
                type="number"
                required
                min="0"
                step="any"
                value={materialFormData.unitPrice}
                onChange={(e) => setMaterialFormData({ ...materialFormData, unitPrice: e.target.value })}
                className="block w-full pl-7 pr-3 py-2 bg-brand-bg border border-brand-secondary/30 rounded text-brand-text text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
                placeholder="0"
              />
            </div>
            {materialErrors.unitPrice && <p className="text-[10px] text-brand-negative mt-1">{materialErrors.unitPrice}</p>}
          </div>

          <div className="pt-3 border-t border-brand-secondary/15 flex justify-end gap-3">
            <Button variant="secondary" size="sm" type="button" onClick={() => setIsMaterialDrawerOpen(false)} disabled={isMaterialSaving}>
              Cancelar
            </Button>
            <Button variant="primary" size="sm" type="submit" disabled={isMaterialSaving}>
              {isMaterialSaving ? 'Registrando...' : 'Registrar Insumo'}
            </Button>
          </div>
        </form>
      </Drawer>

      {/* CONFIRMACIÓN: Dar de baja proveedor */}
      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Dar de baja proveedor"
        description={`¿Está seguro de que desea dar de baja al proveedor "${supplierToDelete?.name}"? Esta acción desactivará al proveedor y suspenderá nuevas adquisiciones de forma lógica, conservando todos los registros históricos en la base de datos.`}
        confirmText="Desactivar Proveedor"
        cancelText="Volver"
        type="danger"
      />
    </div>
  );
};
