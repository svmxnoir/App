import React, { useState } from 'react';
import {
  ProductRecord,
  MarketObservation,
  StoreFixedSettings,
  PricingRecommendation,
} from '../types/pricing';
import {
  calculateProductFinancials,
  generatePricingRecommendations,
  calculateMarketBenchmark,
} from '../engine/pricingEngine';
import {
  formatEGP,
  formatPercent,
  CATEGORY_LABELS,
  QUALITY_TIER_LABELS,
  SEASON_LABELS,
} from '../utils/formatters';
import {
  X,
  TrendingUp,
  Tag,
  AlertTriangle,
  History,
  ShoppingCart,
  Plus,
  Scale,
  ShieldAlert,
  HelpCircle,
  CheckCircle2,
} from 'lucide-react';

interface ProductDetailModalProps {
  product: ProductRecord;
  allObservations: MarketObservation[];
  storeSettings: StoreFixedSettings;
  onClose: () => void;
  onUpdateProduct: (updated: ProductRecord) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  allObservations,
  storeSettings,
  onClose,
  onUpdateProduct,
}) => {
  const [activeTab, setActiveTab] = useState<'decision' | 'financials' | 'history' | 'sales'>('decision');
  const [newPrice, setNewPrice] = useState<number>(product.currentSellingPrice);
  const [priceChangeReason, setPriceChangeReason] = useState<string>('');
  const [priceFeedbackMessage, setPriceFeedbackMessage] = useState<string | null>(null);
  
  // نموذج إضافة حركة بيع جديدة
  const [saleUnits, setSaleUnits] = useState<number>(1);
  const [salePrice, setSalePrice] = useState<number>(product.currentSellingPrice);
  const [saleChannel, setSaleChannel] = useState<'in_store' | 'online' | 'wholesale'>('in_store');
  const [saleNotes, setSaleNotes] = useState<string>('');
  const [saleFeedbackMessage, setSaleFeedbackMessage] = useState<string | null>(null);

  const financials = calculateProductFinancials(product, storeSettings);
  const recommendations = generatePricingRecommendations(product, allObservations, storeSettings);
  const benchmark = calculateMarketBenchmark(product.category, product.qualityTier, allObservations);

  const remainingStock = Math.max(
    0,
    (product.quantityReceived || product.quantityPurchased) -
      (product.quantitySold || 0) -
      (product.quantityDamaged || 0)
  );

  const handleApplyNewPrice = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPrice <= 0 || newPrice === product.currentSellingPrice) return;

    const newHistoryEntry = {
      price: newPrice,
      date: new Date().toISOString().slice(0, 10),
      reason: priceChangeReason.trim() || 'تعديل السعر بواسطة إدارة المتجر',
    };

    const updated: ProductRecord = {
      ...product,
      currentSellingPrice: newPrice,
      priceHistory: [...product.priceHistory, newHistoryEntry],
    };

    onUpdateProduct(updated);
    setPriceChangeReason('');
    setPriceFeedbackMessage(`تم اعتماد السعر الجديد (${formatEGP(newPrice)}) بنجاح وإدراجه في السجل التاريخي.`);
    setTimeout(() => setPriceFeedbackMessage(null), 4000);
  };

  const handleAddSale = (e: React.FormEvent) => {
    e.preventDefault();
    if (saleUnits <= 0) return;

    const newTx = {
      id: `TX-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      units: Number(saleUnits),
      unitPrice: Number(salePrice),
      channel: saleChannel,
      notes: saleNotes.trim() || undefined,
    };

    // حفظ الحركة وتحديث إجمالي المباع دون تعديل أي سجلات سابقة!
    const updated: ProductRecord = {
      ...product,
      quantitySold: (product.quantitySold || 0) + Number(saleUnits),
      salesTransactions: [newTx, ...product.salesTransactions],
    };

    onUpdateProduct(updated);
    setSaleNotes('');
    setSaleFeedbackMessage(`تم تسجيل حركة بيع ${saleUnits} قطعة بقيمة ${formatEGP(saleUnits * salePrice)} وتحديث المخزون.`);
    setTimeout(() => setSaleFeedbackMessage(null), 4000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col border border-stone-200 text-stone-900 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-stone-200 bg-stone-50 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs text-stone-500 mb-1">
              <span className="font-mono font-medium text-stone-700">{product.id}</span>
              <span aria-hidden="true">·</span>
              <span>{CATEGORY_LABELS[product.category]}</span>
              <span aria-hidden="true">·</span>
              <span>{QUALITY_TIER_LABELS[product.qualityTier]?.label}</span>
              <span aria-hidden="true">·</span>
              <span>الموسم: {SEASON_LABELS[product.season]}</span>
            </div>
            <h2 className="text-xl font-bold text-stone-900">{product.name}</h2>
            <p className="text-xs text-stone-600 mt-0.5">
              المورد: {product.supplier} | الدفعة: {product.purchaseBatch} | تاريخ الشراء:{' '}
              {product.purchaseDate}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick KPI Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-amber-50/40 border-b border-stone-200 text-sm">
          <div>
            <span className="text-xs text-stone-500 block">تكلفة الوصول الفعلية (LC)</span>
            <span className="font-bold text-stone-900 text-base">{formatEGP(financials.landedUnitCost)}</span>
            <span className="text-[11px] text-stone-500 block">
              نولون النقل: {formatEGP(financials.allocatedBatchExpensePerUnit)}
            </span>
          </div>
          <div>
            <span className="text-xs text-stone-500 block">سعر البيع المعروض</span>
            <span className="font-bold text-stone-900 text-base">{formatEGP(product.currentSellingPrice)}</span>
            <span className="text-[11px] text-stone-500 block">
              هامش الربح: {formatPercent(financials.grossMarginPercent)}
            </span>
          </div>
          <div>
            <span className="text-xs text-stone-500 block">سعر التغطية النقدية (Cash Floor)</span>
            <span
              className={`font-bold text-base ${
                financials.isBelowCashCoverage ? 'text-rose-600' : 'text-emerald-700'
              }`}
            >
              {formatEGP(financials.cashCoveragePrice)}
            </span>
            <span className="text-[11px] text-stone-500 block">
              {financials.isBelowCashCoverage
                ? '⚠️ خطر: نزيف نقدي مباشر!'
                : financials.isBelowOperatingBreakEven
                ? '⚠️ تحت التعادل التشغيلي'
                : '✓ فوق التعادل التشغيلي'}
            </span>
          </div>
          <div>
            <span className="text-xs text-stone-500 block">المخزون المتبقي</span>
            <span className="font-bold text-stone-900 text-base">{remainingStock} قطعة</span>
            <span className="text-[11px] text-stone-500 block">
              التعادل التشغيلي: {formatEGP(financials.operatingBreakEvenPrice)}
            </span>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-stone-200 bg-white px-5 pt-2 gap-1 text-sm font-medium">
          <button
            onClick={() => setActiveTab('decision')}
            className={`pb-3 px-3 border-b-2 transition-colors ${
              activeTab === 'decision'
                ? 'border-amber-600 text-amber-900 font-semibold'
                : 'border-transparent text-stone-500 hover:text-stone-900'
            }`}
          >
            توصيات وسيناريوهات التسعير
          </button>
          <button
            onClick={() => setActiveTab('financials')}
            className={`pb-3 px-3 border-b-2 transition-colors ${
              activeTab === 'financials'
                ? 'border-amber-600 text-amber-900 font-semibold'
                : 'border-transparent text-stone-500 hover:text-stone-900'
            }`}
          >
            التشريح المالي والتكاليف
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-3 px-3 border-b-2 transition-colors ${
              activeTab === 'history'
                ? 'border-amber-600 text-amber-900 font-semibold'
                : 'border-transparent text-stone-500 hover:text-stone-900'
            }`}
          >
            تغيير السعر وسجل التعديلات ({product.priceHistory.length})
          </button>
          <button
            onClick={() => setActiveTab('sales')}
            className={`pb-3 px-3 border-b-2 transition-colors ${
              activeTab === 'sales'
                ? 'border-amber-600 text-amber-900 font-semibold'
                : 'border-transparent text-stone-500 hover:text-stone-900'
            }`}
          >
            سجل المبيعات التاريخية ({product.salesTransactions.length})
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: DECISION & SCENARIOS */}
          {activeTab === 'decision' && (
            <div className="space-y-6">
              {/* Market Reference Corridor Banner */}
              <div className="bg-stone-50 p-4 rounded-lg border border-stone-200 text-xs text-stone-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-stone-900 text-sm">
                    مرجع أسعار السوق لفئة: {CATEGORY_LABELS[product.category]} ({QUALITY_TIER_LABELS[product.qualityTier]?.label})
                  </span>
                  <span className="text-stone-500">
                    {benchmark.sampleSize} رصد تجزئة معتمد ومطابق
                  </span>
                </div>
                {benchmark.hasSufficientData ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-center">
                    <div className="bg-white p-2 rounded border border-stone-200">
                      <span className="text-stone-500 block">أدنى سعر رصد (Min)</span>
                      <span className="font-bold text-stone-900">{formatEGP(benchmark.minPrice)}</span>
                    </div>
                    <div className="bg-white p-2 rounded border border-stone-200">
                      <span className="text-stone-500 block">أرضية العروض (Promo Floor)</span>
                      <span className="font-bold text-amber-700">{formatEGP(benchmark.promoFloor)}</span>
                    </div>
                    <div className="bg-white p-2 rounded border border-stone-200">
                      <span className="text-stone-500 block">وسيط السوق (Median)</span>
                      <span className="font-bold text-stone-900">{formatEGP(benchmark.medianPrice)}</span>
                    </div>
                    <div className="bg-white p-2 rounded border border-stone-200">
                      <span className="text-stone-500 block">أعلى سعر معلن (Max)</span>
                      <span className="font-bold text-stone-900">{formatEGP(benchmark.maxPrice)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-lg text-amber-900">
                    <span className="font-bold block mb-0.5">بيانات سوقية موثقة غير كافية للمقارنة</span>
                    <p className="text-[11px] text-amber-800">
                      {benchmark.insufficientDataReason || 'لا تتوفر رصود تجزئة فردية معتمدة ومطابقة لنفس فئة الجودة. القرارات مبنية حصرياً على التكاليف الداخلية وحماية هامش المساهمة.'}
                    </p>
                  </div>
                )}
              </div>

              {/* Scenarios Grid */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-stone-900">
                  سيناريوهات القرار والبدائل المتاحة (Adaptive Decision Engine)
                </h3>
                <div className="space-y-3">
                  {recommendations.map((rec, idx) => (
                    <ScenarioCard
                      key={idx}
                      rec={rec}
                      currentPrice={product.currentSellingPrice}
                      onSelectPrice={(p) => {
                        setNewPrice(p);
                        setPriceChangeReason(`تطبيق سيناريو: ${rec.actionTitleArabic}`);
                        setActiveTab('history');
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: FINANCIALS */}
          {activeTab === 'financials' && (
            <div className="space-y-6 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Product Acquisition & Landed Cost */}
                <div className="bg-stone-50 p-4 rounded-lg border border-stone-200 space-y-3">
                  <h4 className="font-bold text-stone-900 border-b border-stone-200 pb-2">
                    أ. تكلفة الوصول الفعلية للقطعة (Landed Cost)
                  </h4>
                  <div className="flex justify-between text-xs">
                    <span className="text-stone-600">سعر الشراء من المصنع / المورد:</span>
                    <span className="font-medium text-stone-900">{formatEGP(product.costs.purchaseCost)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-stone-600">
                      نصيب القطعة من نولون الشحن لأسيوط ({product.costs.batchTransportCost} ج.م ÷ {product.costs.batchUnits} قطعة):
                    </span>
                    <span className="font-medium text-stone-900">
                      {formatEGP(financials.allocatedBatchExpensePerUnit)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-stone-600">تكاليف تجهيز وتيكت مباشرة:</span>
                    <span className="font-medium text-stone-900">{formatEGP(product.costs.directUnitCost)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-sm pt-2 border-t border-stone-200 text-stone-900">
                    <span>إجمالي تكلفة الوصول (LC):</span>
                    <span className="text-amber-900">{formatEGP(financials.landedUnitCost)}</span>
                  </div>
                </div>

                {/* Variable Selling Costs */}
                <div className="bg-stone-50 p-4 rounded-lg border border-stone-200 space-y-3">
                  <h4 className="font-bold text-stone-900 border-b border-stone-200 pb-2">
                    ب. تكاليف البيع المتغيرة (Variable Selling Costs)
                  </h4>
                  <div className="flex justify-between text-xs">
                    <span className="text-stone-600">تكلفة الكيس / التغليف:</span>
                    <span className="font-medium text-stone-900">
                      {formatEGP(product.variableCosts.packagingUnitCost)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-stone-600">عمولة الدفع الإلكتروني (فيزا / انستاباي):</span>
                    <span className="font-medium text-stone-900">
                      {formatPercent(product.variableCosts.paymentFeePercent)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-stone-600">عمولة مبيعات البائع / الكاشير:</span>
                    <span className="font-medium text-stone-900">
                      {formatPercent(product.variableCosts.salesCommissionPercent)}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold text-sm pt-2 border-t border-stone-200 text-stone-900">
                    <span>إجمالي التكلفة المتغيرة عند السعر الحالي:</span>
                    <span className="text-amber-900">{formatEGP(financials.variableCostAmount)}</span>
                  </div>
                </div>

                {/* Contribution & Margins */}
                <div className="bg-stone-50 p-4 rounded-lg border border-stone-200 space-y-3">
                  <h4 className="font-bold text-stone-900 border-b border-stone-200 pb-2">
                    ج. هوامش المساهمة والربحية الحقيقية
                  </h4>
                  <div className="flex justify-between text-xs">
                    <span className="text-stone-600">مجمل الربح (السعر - تكلفة الوصول):</span>
                    <span className="font-medium text-stone-900">{formatEGP(financials.grossProfit)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-stone-600">نسبة الربح من سعر البيع (هامش الربح Margin):</span>
                    <span className="font-medium text-stone-900">
                      {formatPercent(financials.grossMarginPercent)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-stone-600">نسبة الزيادة على تكلفة الشراء (Markup on Cost):</span>
                    <span className="font-medium text-stone-900">
                      {formatPercent(financials.markupPercent)}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold text-sm pt-2 border-t border-stone-200 text-stone-900">
                    <span>المبلغ المتبقي لدفع مصاريف المحل وأرباحك (هامش المساهمة):</span>
                    <span
                      className={financials.unitContribution > 0 ? 'text-emerald-700' : 'text-rose-600'}
                    >
                      {formatEGP(financials.unitContribution)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-stone-500">
                    <span>نسبة هامش المساهمة (CMR):</span>
                    <span>{formatPercent(financials.contributionMarginRatio * 100)}</span>
                  </div>
                </div>

                {/* Fixed Overhead & Break-Even */}
                <div className="bg-stone-50 p-4 rounded-lg border border-stone-200 space-y-3">
                  <h4 className="font-bold text-stone-900 border-b border-stone-200 pb-2 flex items-center justify-between">
                    <span>د. التكاليف الثابتة ونقطة التعادل</span>
                    <span className="text-[11px] font-normal text-amber-800 bg-amber-100/60 px-1.5 py-0.5 rounded">
                      تقدير تخطيطي للمحل
                    </span>
                  </h4>
                  <div className="flex justify-between text-xs">
                    <span className="text-stone-600">نصيب القطعة التقديري من إيجار ورواتب أسيوط (F):</span>
                    <span className="font-medium text-stone-900">
                      {formatEGP(financials.estimatedFixedOverheadPerUnit)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-stone-600">سعر التغطية النقدية (C + V) / (1 - r):</span>
                    <span className="font-bold text-stone-900">
                      {formatEGP(financials.cashCoveragePrice)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-stone-600">سعر التعادل التشغيلي التقديري (C + F + V) / (1 - r):</span>
                    <span className="font-bold text-amber-900">
                      {formatEGP(financials.operatingBreakEvenPrice)}
                    </span>
                  </div>
                  {financials.targetPriceWithFixedOverhead && (
                    <div className="flex justify-between text-xs">
                      <span className="text-stone-600">السعر المستهدف لهامش ربح بعد الثابتة (C + F + V) / (1 - r - m):</span>
                      <span className="font-bold text-emerald-800">
                        {formatEGP(financials.targetPriceWithFixedOverhead)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs">
                    <span className="text-stone-600">صافي الربح التشغيلي التقديري للقطعة:</span>
                    <span
                      className={`font-medium ${
                        financials.netOperatingProfitPerUnit >= 0 ? 'text-emerald-700' : 'text-rose-600'
                      }`}
                    >
                      {formatEGP(financials.netOperatingProfitPerUnit)}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold text-sm pt-2 border-t border-stone-200 text-stone-900">
                    <span>قطع التعادل لتغطية حصة الدفعة:</span>
                    <span className="text-stone-900">
                      {financials.breakEvenQuantity ? `${financials.breakEvenQuantity} قطعة` : 'غير متاح'}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-500 leading-tight bg-stone-100/70 p-2 rounded">
                    {financials.fixedOverheadDisclosure}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PRICE CHANGE & HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-6">
              {/* Change Price Form */}
              <div className="bg-stone-50 p-4 rounded-lg border border-stone-200">
                <h4 className="text-sm font-bold text-stone-900 mb-3 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-amber-700" />
                  تحديث سعر البيع المعروض في المحل
                </h4>
                <form onSubmit={handleApplyNewPrice} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-stone-600 block mb-1">السعر الجديد المقترح (ج.م):</label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={newPrice}
                      onChange={(e) => setNewPrice(Number(e.target.value))}
                      className="w-full bg-white border border-stone-300 rounded-lg px-3 py-2 text-stone-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs text-stone-600 block mb-1">سبب أو مبرر التعديل:</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="مثال: تخفيض لمواكبة عروض نهاية الأسبوع بأسيوط"
                        value={priceChangeReason}
                        onChange={(e) => setPriceChangeReason(e.target.value)}
                        className="flex-1 bg-white border border-stone-300 rounded-lg px-3 py-2 text-stone-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                      />
                      <button
                        type="submit"
                        disabled={newPrice <= 0 || newPrice === product.currentSellingPrice}
                        className="px-4 py-2 bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        اعتماد السعر
                      </button>
                    </div>
                  </div>
                </form>
                {priceFeedbackMessage && (
                  <div className="mt-3 p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{priceFeedbackMessage}</span>
                  </div>
                )}
              </div>

              {/* Price Log */}
              <div>
                <h4 className="text-sm font-bold text-stone-900 mb-2 flex items-center gap-2">
                  <History className="w-4 h-4 text-stone-500" />
                  سجل التعديلات السعرية التاريخية
                </h4>
                <div className="border border-stone-200 rounded-lg overflow-hidden">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-stone-100 text-stone-600 border-b border-stone-200">
                      <tr>
                        <th className="py-2.5 px-3">التاريخ</th>
                        <th className="py-2.5 px-3">السعر المسجل</th>
                        <th className="py-2.5 px-3">السبب والملاحظات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200 text-stone-700">
                      {product.priceHistory.map((entry, idx) => (
                        <tr key={idx} className="hover:bg-stone-50">
                          <td className="py-2.5 px-3 font-mono">{entry.date}</td>
                          <td className="py-2.5 px-3 font-bold text-stone-900">{formatEGP(entry.price)}</td>
                          <td className="py-2.5 px-3">{entry.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SALES TRANSACTIONS */}
          {activeTab === 'sales' && (
            <div className="space-y-6">
              {/* Record Sale Form */}
              <div className="bg-stone-50 p-4 rounded-lg border border-stone-200">
                <h4 className="text-sm font-bold text-stone-900 mb-3 flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-amber-700" />
                  تسجيل حركة بيع جديدة (إضافة لسجل المعاملات)
                </h4>
                <form onSubmit={handleAddSale} className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="text-stone-600 block mb-1">الكمية المباعة (قطعة):</label>
                    <input
                      type="number"
                      min="1"
                      max={remainingStock}
                      value={saleUnits}
                      onChange={(e) => setSaleUnits(Number(e.target.value))}
                      className="w-full bg-white border border-stone-300 rounded-lg px-3 py-2 text-stone-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-stone-600 block mb-1">سعر البيع الفعلي (ج.م):</label>
                    <input
                      type="number"
                      min="1"
                      value={salePrice}
                      onChange={(e) => setSalePrice(Number(e.target.value))}
                      className="w-full bg-white border border-stone-300 rounded-lg px-3 py-2 text-stone-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-stone-600 block mb-1">قناة البيع:</label>
                    <select
                      value={saleChannel}
                      onChange={(e) => setSaleChannel(e.target.value as 'in_store' | 'online' | 'wholesale')}
                      className="w-full bg-white border border-stone-300 rounded-lg px-3 py-2 text-stone-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="in_store">المحل بأسيوط (كاش/فيزا)</option>
                      <option value="online">أونلاين / شحن</option>
                      <option value="wholesale">جملة / باقة خاصة</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button
                      type="submit"
                      disabled={remainingStock <= 0}
                      className="w-full py-2 bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      تسجيل البيع
                    </button>
                  </div>
                  <div className="sm:col-span-4">
                    <input
                      type="text"
                      placeholder="ملاحظات اختيارية (مثال: خصم خاص لزبون دائم أو بيع طقم)"
                      value={saleNotes}
                      onChange={(e) => setSaleNotes(e.target.value)}
                      className="w-full bg-white border border-stone-300 rounded-lg px-3 py-1.5 text-stone-900 text-xs focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </form>
                {saleFeedbackMessage && (
                  <div className="mt-3 p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{saleFeedbackMessage}</span>
                  </div>
                )}
              </div>

              {/* Transactions Ledger */}
              <div>
                <h4 className="text-sm font-bold text-stone-900 mb-2 flex items-center justify-between">
                  <span>دفتر حركات المبيعات التاريخية</span>
                  <span className="text-xs text-stone-500 font-normal">
                    * الحركات التاريخية تظل ثابتة ولا تتأثر بتعديل سعر الصنف الحالي
                  </span>
                </h4>
                <div className="border border-stone-200 rounded-lg overflow-hidden">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-stone-100 text-stone-600 border-b border-stone-200">
                      <tr>
                        <th className="py-2.5 px-3">رقم الحركة</th>
                        <th className="py-2.5 px-3">التاريخ</th>
                        <th className="py-2.5 px-3">الكمية</th>
                        <th className="py-2.5 px-3">سعر البيع التاريخي</th>
                        <th className="py-2.5 px-3">الإجمالي</th>
                        <th className="py-2.5 px-3">القناة</th>
                        <th className="py-2.5 px-3">ملاحظات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200 text-stone-700">
                      {product.salesTransactions.length > 0 ? (
                        product.salesTransactions.map((tx) => (
                          <tr key={tx.id} className="hover:bg-stone-50">
                            <td className="py-2.5 px-3 font-mono text-stone-500">{tx.id}</td>
                            <td className="py-2.5 px-3 font-mono">{tx.date}</td>
                            <td className="py-2.5 px-3 font-semibold text-stone-900">{tx.units} قطعة</td>
                            <td className="py-2.5 px-3 font-bold text-stone-900">{formatEGP(tx.unitPrice)}</td>
                            <td className="py-2.5 px-3 font-bold text-emerald-800">
                              {formatEGP(tx.units * tx.unitPrice)}
                            </td>
                            <td className="py-2.5 px-3">
                              {tx.channel === 'in_store'
                                ? 'المحل بأسيوط'
                                : tx.channel === 'online'
                                ? 'أونلاين'
                                : 'جملة'}
                            </td>
                            <td className="py-2.5 px-3 text-stone-500">{tx.notes || '-'}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="py-4 text-center text-stone-400">
                            لا توجد حركات بيع مسجلة لهذا الصنف حتى الآن.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Scenario Card Component
interface ScenarioCardProps {
  rec: PricingRecommendation;
  currentPrice: number;
  onSelectPrice: (price: number) => void;
}

const ScenarioCard: React.FC<ScenarioCardProps> = ({ rec, currentPrice, onSelectPrice }) => {
  const [expanded, setExpanded] = useState(false);

  const getActionColor = () => {
    switch (rec.action) {
      case 'HOLD':
        return 'border-stone-300 bg-white';
      case 'INCREASE':
        return 'border-emerald-200 bg-emerald-50/20';
      case 'PROMOTE':
        return 'border-amber-200 bg-amber-50/20';
      case 'MARKDOWN':
        return 'border-orange-200 bg-orange-50/20';
      case 'LIQUIDATE':
        return 'border-rose-200 bg-rose-50/20';
    }
  };

  const getConfidenceBadge = () => {
    switch (rec.confidenceLevel) {
      case 'High':
        return <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">ثقة مرتفعة</span>;
      case 'Medium':
        return <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded">ثقة متوسطة</span>;
      case 'Low':
        return <span className="text-[11px] text-rose-700 bg-rose-50 px-2 py-0.5 rounded">ثقة منخفضة (بيانات ناقصة)</span>;
    }
  };

  const priceDiff = rec.recommendedPrice - currentPrice;

  return (
    <div className={`p-4 rounded-lg border transition-shadow hover:shadow-xs ${getActionColor()}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="font-bold text-stone-900 text-sm">{rec.actionTitleArabic}</span>
          {getConfidenceBadge()}
        </div>
        <div className="flex items-center gap-3">
          <div className="text-left">
            <span className="text-xs text-stone-500 block">السعر المقترح</span>
            <span className="font-bold text-stone-900 text-base">{formatEGP(rec.recommendedPrice)}</span>
            {priceDiff !== 0 && (
              <span
                className={`text-[11px] block ${
                  priceDiff > 0 ? 'text-emerald-700' : 'text-rose-600'
                }`}
              >
                {priceDiff > 0 ? `+${priceDiff} ج.م` : `${priceDiff} ج.م`}
              </span>
            )}
          </div>
          <button
            onClick={() => onSelectPrice(rec.recommendedPrice)}
            className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded text-xs font-medium transition-colors"
          >
            تطبيق
          </button>
        </div>
      </div>

      {/* Financial Consequence Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 my-2 py-2 border-y border-stone-200/70 text-xs">
        <div>
          <span className="text-stone-500 block">مساهمة القطعة (CM):</span>
          <span className="font-semibold text-stone-800">
            {formatEGP(rec.expectedFinancialConsequences.unitContribution)}
          </span>
        </div>
        <div>
          <span className="text-stone-500 block">نسبة هامش المساهمة:</span>
          <span className="font-semibold text-stone-800">
            {formatPercent(rec.expectedFinancialConsequences.contributionMarginRatio * 100)}
          </span>
        </div>
        <div>
          <span className="text-stone-500 block">السيولة المستردة المتوقعة:</span>
          <span className="font-semibold text-stone-800">
            {formatEGP(rec.expectedFinancialConsequences.cashRecoveryPotential)}
          </span>
        </div>
      </div>

      {/* Main argument */}
      <p className="text-xs text-stone-700 mb-2">
        <strong className="text-stone-900">لماذا هذا الخيار؟ </strong>
        {rec.whyPreferredOverAlternatives}
      </p>

      {/* Toggle Details */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-[11px] text-stone-500 hover:text-stone-900 underline mt-1 block"
      >
        {expanded ? 'إخفاء التفاصيل والمخاطر والبيانات الناقصة' : 'عرض الأدلة الداعمة والمخاطر والبيانات الناقصة'}
      </button>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-stone-200/60 space-y-2 text-xs text-stone-700">
          <div>
            <strong className="text-stone-900 block mb-1">الأدلة والمعطيات الداعمة:</strong>
            <ul className="list-disc list-inside space-y-0.5 text-stone-600">
              {rec.supportingEvidence.map((ev, i) => (
                <li key={i}>{ev}</li>
              ))}
            </ul>
          </div>

          <div>
            <strong className="text-stone-900 block mb-1">المخاطر والمفاضلات (Risks & Trade-offs):</strong>
            <ul className="list-disc list-inside space-y-0.5 text-rose-700">
              {rec.risksAndTradeoffs.map((rk, i) => (
                <li key={i}>{rk}</li>
              ))}
            </ul>
          </div>

          {rec.missingInformation.length > 0 && (
            <div>
              <strong className="text-stone-900 block mb-1 text-amber-800">
                بيانات ناقصة قبل اتخاذ قرار حاسم:
              </strong>
              <ul className="list-disc list-inside space-y-0.5 text-amber-800">
                {rec.missingInformation.map((mi, i) => (
                  <li key={i}>{mi}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
