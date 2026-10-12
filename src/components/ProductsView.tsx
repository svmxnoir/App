import React, { useState } from 'react';
import {
  ProductRecord,
  ProductCategory,
  QualityTier,
  Season,
  StoreFixedSettings,
} from '../types/pricing';
import { calculateProductFinancials } from '../engine/pricingEngine';
import {
  formatEGP,
  formatPercent,
  CATEGORY_LABELS,
  QUALITY_TIER_LABELS,
  SEASON_LABELS,
} from '../utils/formatters';
import {
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  Tag,
  AlertCircle,
  Eye,
  Trash2,
  Package,
  Edit,
} from 'lucide-react';

interface ProductsViewProps {
  products: ProductRecord[];
  storeSettings: StoreFixedSettings;
  onSelectProduct: (product: ProductRecord) => void;
  onAddProduct: (product: ProductRecord) => void;
  onUpdateProduct: (product: ProductRecord) => void;
  onDeleteProduct: (productId: string) => void;
}

export const ProductsView: React.FC<ProductsViewProps> = ({
  products,
  storeSettings,
  onSelectProduct,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [qualityFilter, setQualityFilter] = useState<string>('all');
  const [seasonFilter, setSeasonFilter] = useState<string>('all');
  const [isNewModalOpen, setIsNewModalOpen] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<ProductRecord | null>(null);

  // حقول إضافة صنف جديد
  const [newSku, setNewSku] = useState<string>(`SKU-ASU-${Date.now().toString().slice(-4)}`);
  const [newName, setNewName] = useState<string>('');
  const [newCategory, setNewCategory] = useState<ProductCategory>('basic_tshirt');
  const [newQuality, setNewQuality] = useState<QualityTier>('commercial');
  const [newSeason, setNewSeason] = useState<Season>('summer');
  const [newVariant, setNewVariant] = useState<string>('Regular Fit');
  const [newSize, setNewSize] = useState<string>('M, L, XL');
  const [newColor, setNewColor] = useState<string>('أسود / أبيض');
  const [newSupplier, setNewSupplier] = useState<string>('مكتب جملة العتبة - القاهرة');
  const [newPurchaseCost, setNewPurchaseCost] = useState<number>(120);
  const [newBatchUnits, setNewBatchUnits] = useState<number>(50);
  const [newTransportCost, setNewTransportCost] = useState<number>(200);
  const [newDirectUnitCost, setNewDirectUnitCost] = useState<number>(3);
  const [newPackagingCost, setNewPackagingCost] = useState<number>(5);
  const [newSellingPrice, setNewSellingPrice] = useState<number>(240);
  const [newTargetMargin, setNewTargetMargin] = useState<number>(35);
  const [newNotes, setNewNotes] = useState<string>('');

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || newPurchaseCost <= 0 || newSellingPrice <= 0) {
      alert('يرجى ملء الحقول الإجبارية المطلوبة (اسم الصنف، سعر الشراء، سعر البيع).');
      return;
    }

    const newProd: ProductRecord = {
      id: newSku.trim() || `SKU-ASU-${Date.now()}`,
      name: newName.trim(),
      category: newCategory,
      variant: newVariant.trim() || 'عادي',
      size: newSize.trim() || 'حر',
      color: newColor.trim() || 'متعدد',
      qualityTier: newQuality,
      supplier: newSupplier.trim() || 'مورد محلي',
      purchaseBatch: `BATCH-${new Date().getFullYear()}-${Date.now().toString().slice(-3)}`,
      purchaseDate: new Date().toISOString().slice(0, 10),
      season: newSeason,
      quantityPurchased: Number(newBatchUnits),
      quantityReceived: Number(newBatchUnits),
      quantitySold: 0,
      quantityDamaged: 0,
      quantityReturned: 0,
      costs: {
        purchaseCost: Number(newPurchaseCost),
        batchUnits: Number(newBatchUnits),
        batchTransportCost: Number(newTransportCost),
        batchOtherExpenses: 0,
        directUnitCost: Number(newDirectUnitCost),
      },
      variableCosts: {
        packagingUnitCost: Number(newPackagingCost),
        localDeliveryUnitCost: 0,
        paymentFeePercent: 1.5,
        salesCommissionPercent: 2.0,
        marketplaceFeePercent: 0,
      },
      targetGrossMarginPercent: Number(newTargetMargin),
      targetMarkupPercent: 50,
      currentSellingPrice: Number(newSellingPrice),
      priceHistory: [
        {
          price: Number(newSellingPrice),
          date: new Date().toISOString().slice(0, 10),
          reason: 'السعر الافتتاحي لتسجيل الصنف',
        },
      ],
      salesTransactions: [],
      notes: newNotes.trim(),
    };

    onAddProduct(newProd);
    setIsNewModalOpen(false);
    // إعادة تعيين النموذج
    setNewName('');
    setNewSku(`SKU-ASU-${Date.now().toString().slice(-4)}`);
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.color.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
    const matchesQuality = qualityFilter === 'all' || p.qualityTier === qualityFilter;
    const matchesSeason = seasonFilter === 'all' || p.season === seasonFilter;

    return matchesSearch && matchesCategory && matchesQuality && matchesSeason;
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-stone-900">
            سجل المنتجات ودورة حياة المخزون ({products.length} صنف)
          </h2>
          <p className="text-xs text-stone-600 mt-0.5">
            تتبع تكاليف الوصول، كميات المخزون المتبقية، وهوامش المساهمة الفردية لكل قطعة.
          </p>
        </div>

        <button
          onClick={() => setIsNewModalOpen(true)}
          className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-semibold flex items-center gap-2 self-start transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>تسجيل صنف جديد في المحل</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-stone-200 flex flex-wrap items-center gap-3 text-xs">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-stone-400 absolute right-3 top-2.5" />
          <input
            type="text"
            placeholder="بحث بالاسم، الكود SKU، المورد، اللون..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-9 pl-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
          />
        </div>

        {/* Category Filter */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-stone-700"
        >
          <option value="all">كافة الفئات</option>
          {Object.entries(CATEGORY_LABELS).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>

        {/* Quality Tier Filter */}
        <select
          value={qualityFilter}
          onChange={(e) => setQualityFilter(e.target.value)}
          className="bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-stone-700"
        >
          <option value="all">كافة مستويات الجودة</option>
          {Object.entries(QUALITY_TIER_LABELS).map(([k, data]) => (
            <option key={k} value={k}>
              {data.label}
            </option>
          ))}
        </select>

        {/* Season Filter */}
        <select
          value={seasonFilter}
          onChange={(e) => setSeasonFilter(e.target.value)}
          className="bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-stone-700"
        >
          <option value="all">كافة المواسم</option>
          {Object.entries(SEASON_LABELS).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-stone-100 text-stone-700 border-b border-stone-200">
              <tr>
                <th className="py-3 px-3">المنتج والكود</th>
                <th className="py-3 px-3">الفئة والجودة</th>
                <th className="py-3 px-3">سعر الشراء / نولون</th>
                <th className="py-3 px-3">تكلفة الوصول (LC)</th>
                <th className="py-3 px-3">سعر البيع (P)</th>
                <th className="py-3 px-3">مجمل الربح / الهامش</th>
                <th className="py-3 px-3">مساهمة القطعة (CM)</th>
                <th className="py-3 px-3">المخزون المتبقي</th>
                <th className="py-3 px-3 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200 text-stone-800">
              {filteredProducts.length > 0 ? (
                filteredProducts.map((p) => {
                  const fin = calculateProductFinancials(p, storeSettings);
                  const remaining = Math.max(
                    0,
                    (p.quantityReceived || p.quantityPurchased) -
                      (p.quantitySold || 0) -
                      (p.quantityDamaged || 0)
                  );

                  return (
                    <tr key={p.id} className="hover:bg-stone-50 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-bold text-stone-900 text-sm">{p.name}</div>
                        <div className="font-mono text-[11px] text-stone-500">{p.id}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div>{CATEGORY_LABELS[p.category]}</div>
                        <div className="text-[11px] text-stone-500">
                          {QUALITY_TIER_LABELS[p.qualityTier]?.label}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div>{formatEGP(p.costs.purchaseCost)}</div>
                        <div className="text-[11px] text-stone-500">
                          نقل: {formatEGP(fin.allocatedBatchExpensePerUnit)}
                        </div>
                      </td>
                      <td className="py-3 px-3 font-semibold text-stone-900">
                        {formatEGP(fin.landedUnitCost)}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-stone-900 text-sm">
                          {formatEGP(p.currentSellingPrice)}
                        </div>
                        {fin.isBelowCashCoverage ? (
                          <div className="text-[10px] text-rose-600 font-semibold">
                            ⚠️ نزيف كاش ({formatEGP(fin.cashCoveragePrice)})
                          </div>
                        ) : fin.isBelowOperatingBreakEven ? (
                          <div className="text-[10px] text-amber-700 font-medium">
                            تحت التعادل ({formatEGP(fin.operatingBreakEvenPrice)})
                          </div>
                        ) : null}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-emerald-800">{formatEGP(fin.grossProfit)}</div>
                        <div className="text-[11px] text-stone-500">
                          هامش: {formatPercent(fin.grossMarginPercent)} | إضافة:{' '}
                          {formatPercent(fin.markupPercent)}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div
                          className={`font-bold ${
                            fin.unitContribution > 0 ? 'text-emerald-700' : 'text-rose-600'
                          }`}
                        >
                          {formatEGP(fin.unitContribution)}
                        </div>
                        <div className="text-[11px] text-stone-500">
                          CMR: {formatPercent(fin.contributionMarginRatio * 100)}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-stone-900">{remaining} قطعة</div>
                        <div className="text-[11px] text-stone-500">
                          بيع: {p.quantitySold || 0} من {p.quantityReceived || p.quantityPurchased}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => onSelectProduct(p)}
                            className="p-1.5 text-stone-700 hover:text-stone-900 hover:bg-stone-200 rounded transition-colors"
                            title="فحص الصنف والتسعير ودورة المخزون"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingProduct(p)}
                            className="p-1.5 text-amber-700 hover:text-amber-900 hover:bg-amber-100/60 rounded transition-colors"
                            title="تعديل بيانات الصنف والتكاليف"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`هل أنت متأكد من حذف الصنف (${p.name}) من النظام؟`)) {
                                onDeleteProduct(p.id);
                              }
                            }}
                            className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                            title="حذف الصنف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-stone-400">
                    لا توجد منتجات مطابقة لشروط البحث والفلترة.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Fast Product Registration */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-stone-200 text-stone-900 overflow-hidden">
            <div className="p-4 border-b border-stone-200 bg-stone-50 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-stone-900 text-base">تسجيل صنف ملابس جديد في المحل</h3>
                <p className="text-xs text-stone-500">
                  الحقول التي تحمل علامة (*) إجبارية لبدء التسعير، وباقي الحقول اختيارية ويمكن إكمالها لاحقاً.
                </p>
              </div>
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="text-stone-400 hover:text-stone-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* قسم 1: الحقول الإجبارية */}
              <div className="bg-amber-50/50 p-3.5 rounded-lg border border-amber-200 space-y-3">
                <span className="font-bold text-amber-950 block">الحقول الأساسية الإجبارية *</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-stone-800 mb-1">اسم الصنف أو الموديل *</label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: قميص جينز كتان صيفي"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="w-full bg-white border border-stone-300 rounded-lg p-2 text-stone-900"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-stone-800 mb-1">كود الصنف الفريد (SKU) *</label>
                    <input
                      type="text"
                      required
                      value={newSku}
                      onChange={(e) => setNewSku(e.target.value)}
                      className="w-full bg-white border border-stone-300 rounded-lg p-2 text-stone-900 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-medium text-stone-800 mb-1">فئة المنتج *</label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value as ProductCategory)}
                      className="w-full bg-white border border-stone-300 rounded-lg p-2 text-stone-900"
                    >
                      {Object.entries(CATEGORY_LABELS).map(([k, label]) => (
                        <option key={k} value={k}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-medium text-stone-800 mb-1">سعر الشراء من المورد (ج.م) *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={newPurchaseCost}
                      onChange={(e) => setNewPurchaseCost(Number(e.target.value))}
                      className="w-full bg-white border border-stone-300 rounded-lg p-2 text-stone-900 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-stone-800 mb-1">سعر البيع المقترح بالمحل (ج.م) *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={newSellingPrice}
                      onChange={(e) => setNewSellingPrice(Number(e.target.value))}
                      className="w-full bg-white border border-amber-500 rounded-lg p-2 text-stone-900 font-bold text-amber-950"
                    />
                  </div>
                </div>
              </div>

              {/* قسم 2: تفاصيل الشحنة والتكاليف اللوجستية (اختياري) */}
              <div className="bg-stone-50 p-3.5 rounded-lg border border-stone-200 space-y-3">
                <span className="font-bold text-stone-800 block">
                  تفاصيل الدفعة ونولون النقل لأسيوط (اختياري)
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-stone-600 mb-1">قطع الدفعة:</label>
                    <input
                      type="number"
                      min="1"
                      value={newBatchUnits}
                      onChange={(e) => setNewBatchUnits(Number(e.target.value))}
                      className="w-full bg-white border border-stone-300 rounded-lg p-2 text-stone-900"
                    />
                  </div>
                  <div>
                    <label className="block text-stone-600 mb-1">شحن الدفعة (ج.م):</label>
                    <input
                      type="number"
                      min="0"
                      value={newTransportCost}
                      onChange={(e) => setNewTransportCost(Number(e.target.value))}
                      className="w-full bg-white border border-stone-300 rounded-lg p-2 text-stone-900"
                    />
                  </div>
                  <div>
                    <label className="block text-stone-600 mb-1">تيكت للقطعة (ج.م):</label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={newDirectUnitCost}
                      onChange={(e) => setNewDirectUnitCost(Number(e.target.value))}
                      className="w-full bg-white border border-stone-300 rounded-lg p-2 text-stone-900"
                    />
                  </div>
                  <div>
                    <label className="block text-stone-600 mb-1">كيس المحل (ج.م):</label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={newPackagingCost}
                      onChange={(e) => setNewPackagingCost(Number(e.target.value))}
                      className="w-full bg-white border border-stone-300 rounded-lg p-2 text-stone-900"
                    />
                  </div>
                </div>
              </div>

              {/* قسم 3: مواصفات القطعة والمورد (اختياري) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-stone-600 mb-1">المورد / المصنع:</label>
                  <input
                    type="text"
                    value={newSupplier}
                    onChange={(e) => setNewSupplier(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2 text-stone-900"
                  />
                </div>
                <div>
                  <label className="block text-stone-600 mb-1">مستوى الجودة:</label>
                  <select
                    value={newQuality}
                    onChange={(e) => setNewQuality(e.target.value as QualityTier)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2 text-stone-900"
                  >
                    {Object.entries(QUALITY_TIER_LABELS).map(([k, data]) => (
                      <option key={k} value={k}>
                        {data.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-stone-600 mb-1">الموسم:</label>
                  <select
                    value={newSeason}
                    onChange={(e) => setNewSeason(e.target.value as Season)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2 text-stone-900"
                  >
                    {Object.entries(SEASON_LABELS).map(([k, label]) => (
                      <option key={k} value={k}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-stone-600 mb-1">المقاسات المتاحة:</label>
                  <input
                    type="text"
                    value={newSize}
                    onChange={(e) => setNewSize(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2 text-stone-900"
                  />
                </div>
                <div>
                  <label className="block text-stone-600 mb-1">الألوان:</label>
                  <input
                    type="text"
                    value={newColor}
                    onChange={(e) => setNewColor(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2 text-stone-900"
                  />
                </div>
                <div>
                  <label className="block text-stone-600 mb-1">القصة / الموديل:</label>
                  <input
                    type="text"
                    value={newVariant}
                    onChange={(e) => setNewVariant(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2 text-stone-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-stone-600 mb-1">ملاحظات إضافية:</label>
                <textarea
                  rows={2}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="ملاحظات حول الخامة أو إقبال الزبائن بأسيوط..."
                  className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2 text-stone-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 border border-stone-300 rounded-lg text-stone-700 hover:bg-stone-100"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-lg font-bold"
                >
                  حفظ وتسجيل الصنف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Existing Product */}
      {editingProduct && (
        <EditProductModal
          product={editingProduct}
          onClose={() => setEditingProduct(null)}
          onSave={(updated) => {
            onUpdateProduct(updated);
            setEditingProduct(null);
          }}
        />
      )}
    </div>
  );
};

interface EditProductModalProps {
  product: ProductRecord;
  onClose: () => void;
  onSave: (updated: ProductRecord) => void;
}

const EditProductModal: React.FC<EditProductModalProps> = ({ product, onClose, onSave }) => {
  const [name, setName] = useState(product.name);
  const [category, setCategory] = useState(product.category);
  const [qualityTier, setQualityTier] = useState(product.qualityTier);
  const [season, setSeason] = useState(product.season);
  const [variant, setVariant] = useState(product.variant);
  const [size, setSize] = useState(product.size);
  const [color, setColor] = useState(product.color);
  const [supplier, setSupplier] = useState(product.supplier);
  const [purchaseCost, setPurchaseCost] = useState(product.costs.purchaseCost);
  const [batchUnits, setBatchUnits] = useState(product.costs.batchUnits);
  const [batchTransportCost, setBatchTransportCost] = useState(product.costs.batchTransportCost);
  const [directUnitCost, setDirectUnitCost] = useState(product.costs.directUnitCost);
  const [packagingUnitCost, setPackagingUnitCost] = useState(product.variableCosts.packagingUnitCost);
  const [currentSellingPrice, setCurrentSellingPrice] = useState(product.currentSellingPrice);
  const [targetGrossMarginPercent, setTargetGrossMarginPercent] = useState(product.targetGrossMarginPercent);
  const [quantityReceived, setQuantityReceived] = useState(product.quantityReceived);
  const [quantityDamaged, setQuantityDamaged] = useState(product.quantityDamaged || 0);
  const [notes, setNotes] = useState(product.notes);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: ProductRecord = {
      ...product,
      name,
      category,
      qualityTier,
      season,
      variant,
      size,
      color,
      supplier,
      quantityReceived: Number(quantityReceived),
      quantityDamaged: Number(quantityDamaged),
      costs: {
        ...product.costs,
        purchaseCost: Number(purchaseCost),
        batchUnits: Number(batchUnits),
        batchTransportCost: Number(batchTransportCost),
        directUnitCost: Number(directUnitCost),
      },
      variableCosts: {
        ...product.variableCosts,
        packagingUnitCost: Number(packagingUnitCost),
      },
      currentSellingPrice: Number(currentSellingPrice),
      targetGrossMarginPercent: Number(targetGrossMarginPercent),
      notes,
    };
    onSave(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-stone-200 text-stone-900 overflow-hidden">
        <div className="p-4 border-b border-stone-200 bg-stone-50 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-stone-900 text-base">تعديل بيانات الصنف: {product.name}</h3>
            <span className="font-mono text-stone-500 text-xs">{product.id}</span>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-stone-800 mb-1">اسم الصنف:</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2"
              />
            </div>
            <div>
              <label className="block font-medium text-stone-800 mb-1">المورد:</label>
              <input
                type="text"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-medium text-stone-800 mb-1">سعر الشراء من المصنع (ج.م):</label>
              <input
                type="number"
                min="1"
                required
                value={purchaseCost}
                onChange={(e) => setPurchaseCost(Number(e.target.value))}
                className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2 font-bold"
              />
            </div>
            <div>
              <label className="block font-medium text-stone-800 mb-1">سعر البيع المعروض (ج.م):</label>
              <input
                type="number"
                min="1"
                required
                value={currentSellingPrice}
                onChange={(e) => setCurrentSellingPrice(Number(e.target.value))}
                className="w-full bg-stone-50 border border-amber-400 rounded-lg p-2 font-bold text-amber-950"
              />
            </div>
            <div>
              <label className="block font-medium text-stone-800 mb-1">هامش الربح المستهدف %:</label>
              <input
                type="number"
                value={targetGrossMarginPercent}
                onChange={(e) => setTargetGrossMarginPercent(Number(e.target.value))}
                className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-stone-50 p-3 rounded-lg border border-stone-200">
            <div>
              <label className="block text-stone-600 mb-1">قطع الدفعة:</label>
              <input
                type="number"
                min="1"
                value={batchUnits}
                onChange={(e) => setBatchUnits(Number(e.target.value))}
                className="w-full bg-white border border-stone-300 rounded p-1.5"
              />
            </div>
            <div>
              <label className="block text-stone-600 mb-1">نولون الشحن لأسيوط (ج.م):</label>
              <input
                type="number"
                min="0"
                value={batchTransportCost}
                onChange={(e) => setBatchTransportCost(Number(e.target.value))}
                className="w-full bg-white border border-stone-300 rounded p-1.5"
              />
            </div>
            <div>
              <label className="block text-stone-600 mb-1">الكمية المستلمة:</label>
              <input
                type="number"
                min="1"
                value={quantityReceived}
                onChange={(e) => setQuantityReceived(Number(e.target.value))}
                className="w-full bg-white border border-stone-300 rounded p-1.5"
              />
            </div>
            <div>
              <label className="block text-stone-600 mb-1">الكمية التالفة:</label>
              <input
                type="number"
                min="0"
                value={quantityDamaged}
                onChange={(e) => setQuantityDamaged(Number(e.target.value))}
                className="w-full bg-white border border-stone-300 rounded p-1.5"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-stone-600 mb-1">المقاسات:</label>
              <input
                type="text"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                className="w-full bg-stone-50 border border-stone-300 rounded p-2"
              />
            </div>
            <div>
              <label className="block text-stone-600 mb-1">اللون:</label>
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-full bg-stone-50 border border-stone-300 rounded p-2"
              />
            </div>
            <div>
              <label className="block text-stone-600 mb-1">القصة / الموديل:</label>
              <input
                type="text"
                value={variant}
                onChange={(e) => setVariant(e.target.value)}
                className="w-full bg-stone-50 border border-stone-300 rounded p-2"
              />
            </div>
          </div>

          <div>
            <label className="block text-stone-600 mb-1">ملاحظات الصنف:</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-stone-50 border border-stone-300 rounded p-2"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-stone-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-stone-300 rounded-lg text-stone-700"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-lg font-bold"
            >
              حفظ التعديلات
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
