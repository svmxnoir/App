import React, { useState } from 'react';
import {
  ProductRecord,
  MarketObservation,
  StoreFixedSettings,
  ProductCategory,
  QualityTier,
} from '../types/pricing';
import {
  calculateLandedUnitCost,
  calculateGrossProfit,
  calculateGrossMargin,
  calculateMarkup,
  calculateVariableSellingCosts,
  calculateUnitContribution,
  calculateContributionMarginRatio,
  calculateCashCoveragePrice,
  calculateOperatingBreakEvenPrice,
  calculateTargetPriceWithFixedOverhead,
  calculateEconomicFloorPrice,
  calculateTargetPriceFromMargin,
  calculateTargetPriceFromMarkup,
  calculateDiscountSensitivity,
  calculateMarketBenchmark,
} from '../engine/pricingEngine';
import {
  formatEGP,
  formatPercent,
  CATEGORY_LABELS,
  QUALITY_TIER_LABELS,
} from '../utils/formatters';
import {
  Calculator,
  Sliders,
  DollarSign,
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  Info,
  ShieldCheck,
  CheckCircle,
} from 'lucide-react';

interface CalculatorViewProps {
  products: ProductRecord[];
  allObservations: MarketObservation[];
  storeSettings: StoreFixedSettings;
}

export const CalculatorView: React.FC<CalculatorViewProps> = ({
  products,
  allObservations,
  storeSettings,
}) => {
  // وضع الاختيار: اختيار منتج من المخزون أو إدخال مخصص
  const [selectedProductId, setSelectedProductId] = useState<string>('');

  // مدخلات التكلفة
  const [purchaseCost, setPurchaseCost] = useState<number>(180);
  const [batchUnits, setBatchUnits] = useState<number>(100);
  const [transportCost, setTransportCost] = useState<number>(400);
  const [otherExpenses, setOtherExpenses] = useState<number>(100);
  const [directUnitCost, setDirectUnitCost] = useState<number>(4);

  // مدخلات البيع المتغيرة
  const [packagingCost, setPackagingCost] = useState<number>(6);
  const [paymentFeePercent, setPaymentFeePercent] = useState<number>(1.5);
  const [salesCommissionPercent, setSalesCommissionPercent] = useState<number>(2.5);

  // أهداف وهوامش التاجر
  const [targetMarginPercent, setTargetMarginPercent] = useState<number>(35);
  const [targetMarkupPercent, setTargetMarkupPercent] = useState<number>(55);
  const [testSellingPrice, setTestSellingPrice] = useState<number>(350);

  // تصنيف المنتج للمقارنة مع السوق
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory>('casual_shirt');
  const [selectedQuality, setSelectedQuality] = useState<QualityTier>('mid_market');

  // محاكي الخصومات
  const [simulatorDiscountPercent, setSimulatorDiscountPercent] = useState<number>(10);

  // عند اختيار منتج موجود، يتم ملء المدخلات تلقائياً
  const handleSelectProduct = (productId: string) => {
    setSelectedProductId(productId);
    const p = products.find((x) => x.id === productId);
    if (p) {
      setPurchaseCost(p.costs.purchaseCost);
      setBatchUnits(p.costs.batchUnits);
      setTransportCost(p.costs.batchTransportCost);
      setOtherExpenses(p.costs.batchOtherExpenses);
      setDirectUnitCost(p.costs.directUnitCost);

      setPackagingCost(p.variableCosts.packagingUnitCost);
      setPaymentFeePercent(p.variableCosts.paymentFeePercent);
      setSalesCommissionPercent(p.variableCosts.salesCommissionPercent);

      setTargetMarginPercent(p.targetGrossMarginPercent);
      setTargetMarkupPercent(p.targetMarkupPercent);
      setTestSellingPrice(p.currentSellingPrice);
      setSelectedCategory(p.category);
      setSelectedQuality(p.qualityTier);
    }
  };

  // الحسابات المالية اللحظية
  const costsObj = {
    purchaseCost,
    batchUnits,
    batchTransportCost: transportCost,
    batchOtherExpenses: otherExpenses,
    directUnitCost,
  };

  const vcObj = {
    packagingUnitCost: packagingCost,
    localDeliveryUnitCost: 0,
    paymentFeePercent,
    salesCommissionPercent,
    marketplaceFeePercent: 0,
  };

  const { landedUnitCost, allocatedBatchExpensePerUnit } = calculateLandedUnitCost(costsObj);
  const { flatPerUnit, feeRateDecimal, totalVariableCostAmount } = calculateVariableSellingCosts(
    testSellingPrice,
    vcObj
  );

  const grossProfit = calculateGrossProfit(testSellingPrice, landedUnitCost);
  const grossMargin = calculateGrossMargin(testSellingPrice, landedUnitCost);
  const markup = calculateMarkup(testSellingPrice, landedUnitCost);

  const unitContribution = calculateUnitContribution(testSellingPrice, landedUnitCost, vcObj);
  const cmr = calculateContributionMarginRatio(testSellingPrice, landedUnitCost, vcObj);

  const minCMR = storeSettings.minAcceptableCMR || 0.12;
  const floorResult = calculateEconomicFloorPrice(landedUnitCost, vcObj, minCMR);

  // التكاليف الثابتة التقديرية للقطعة
  const expectedMonthlySales = Math.max(1, storeSettings.expectedMonthlyUnitSales || 450);
  const estimatedFixedPerUnit = Math.round(
    ((storeSettings.monthlyFixedExpenses || 0) / expectedMonthlySales) * 100
  ) / 100;
  const estimatedOperatingProfit = Math.round((unitContribution - estimatedFixedPerUnit) * 100) / 100;

  // مستويات الأسعار الصريحة الثلاثة
  const cashCoverageResult = calculateCashCoveragePrice(landedUnitCost, vcObj);
  const operatingBreakEvenResult = calculateOperatingBreakEvenPrice(
    landedUnitCost,
    estimatedFixedPerUnit,
    vcObj
  );
  const targetWithOverheadResult = calculateTargetPriceWithFixedOverhead(
    landedUnitCost,
    estimatedFixedPerUnit,
    vcObj,
    targetMarginPercent / 100
  );

  const targetMarginResult = calculateTargetPriceFromMargin(
    landedUnitCost,
    vcObj,
    targetMarginPercent
  );
  const targetMarkupResult = calculateTargetPriceFromMarkup(
    landedUnitCost,
    vcObj,
    targetMarkupPercent
  );

  // مقارنة السوق الموثقة
  const benchmark = calculateMarketBenchmark(selectedCategory, selectedQuality, allObservations);

  // حساسية الخصم
  const discountSensitivity = calculateDiscountSensitivity(
    testSellingPrice,
    landedUnitCost,
    vcObj,
    simulatorDiscountPercent
  );

  return (
    <div className="space-y-6">
      {/* Top Banner & Product Pre-filler */}
      <div className="bg-white p-5 rounded-xl border border-stone-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-amber-700" />
            الحاسبة الميدانية ومحاكي الأسعار التفاعلي
          </h2>
          <p className="text-xs text-stone-600 mt-1">
            اختبر أي سعر بيع واكتشف تكلفة الوصول الفعلية، أرضية السعر الاقتصادية، وهامش المساهمة الحقيقي.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-stone-600 font-medium whitespace-nowrap">
            تحميل بيانات صنف من المخزون:
          </label>
          <select
            value={selectedProductId}
            onChange={(e) => handleSelectProduct(e.target.value)}
            className="bg-stone-50 border border-stone-300 rounded-lg px-3 py-2 text-stone-900 text-xs focus:ring-2 focus:ring-amber-500"
          >
            <option value="">-- إدخال يدوي مخصص --</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({formatEGP(p.currentSellingPrice)})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Grid: Inputs on Right (RTL), Live Financial Outputs on Left */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* INPUTS COLUMN (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* 1. تكلفة الشراء والنولون */}
          <div className="bg-white p-5 rounded-xl border border-stone-200 space-y-4">
            <h3 className="text-sm font-bold text-stone-900 border-b border-stone-100 pb-2">
              1. تكاليف شراء الدفعة ونولون الشحن لأسيوط
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-stone-700 font-medium mb-1">
                  سعر شراء القطعة من المصنع / التاجر (ج.م) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={purchaseCost}
                  onChange={(e) => setPurchaseCost(Number(e.target.value))}
                  className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2.5 text-stone-900 font-semibold text-sm focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-600 mb-1">عدد قطع الدفعة / الشحنة:</label>
                  <input
                    type="number"
                    min="1"
                    value={batchUnits}
                    onChange={(e) => setBatchUnits(Number(e.target.value))}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2 text-stone-900 text-xs focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-stone-600 mb-1">نولون الشحن للدفعة (ج.م):</label>
                  <input
                    type="number"
                    min="0"
                    value={transportCost}
                    onChange={(e) => setTransportCost(Number(e.target.value))}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2 text-stone-900 text-xs focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-600 mb-1">مشال وتحميل للدفعة (ج.م):</label>
                  <input
                    type="number"
                    min="0"
                    value={otherExpenses}
                    onChange={(e) => setOtherExpenses(Number(e.target.value))}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2 text-stone-900 text-xs focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-stone-600 mb-1">تكلفة كارت تيكت للقطعة (ج.م):</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={directUnitCost}
                    onChange={(e) => setDirectUnitCost(Number(e.target.value))}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2 text-stone-900 text-xs focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 2. تكاليف البيع المتغيرة والعمولات */}
          <div className="bg-white p-5 rounded-xl border border-stone-200 space-y-4">
            <h3 className="text-sm font-bold text-stone-900 border-b border-stone-100 pb-2">
              2. تكاليف البيع المتغيرة وعمولات الكاشير
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-stone-600 mb-1">
                  تكلفة كيس المحل والتغليف للقطعة (ج.م):
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={packagingCost}
                  onChange={(e) => setPackagingCost(Number(e.target.value))}
                  className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2 text-stone-900 text-xs focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-600 mb-1">عمولة فيزا / انستاباي %:</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    step="0.1"
                    value={paymentFeePercent}
                    onChange={(e) => setPaymentFeePercent(Number(e.target.value))}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2 text-stone-900 text-xs focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-stone-600 mb-1">عمولة بائع / كاشير %:</label>
                  <input
                    type="number"
                    min="0"
                    max="15"
                    step="0.5"
                    value={salesCommissionPercent}
                    onChange={(e) => setSalesCommissionPercent(Number(e.target.value))}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2 text-stone-900 text-xs focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 3. سعر البيع تحت الاختبار وأهداف التاجر */}
          <div className="bg-white p-5 rounded-xl border border-stone-200 space-y-4">
            <h3 className="text-sm font-bold text-stone-900 border-b border-stone-100 pb-2 flex items-center justify-between">
              <span>3. سعر البيع تحت الاختبار والأهداف</span>
              <span className="text-xs text-amber-700 font-semibold">جرب أي سعر</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-stone-900 font-bold mb-1">
                  سعر البيع المقترح للاختبار (ج.م) *
                </label>
                <input
                  type="number"
                  min="1"
                  step="5"
                  value={testSellingPrice}
                  onChange={(e) => setTestSellingPrice(Number(e.target.value))}
                  className="w-full bg-amber-50/50 border-2 border-amber-500 rounded-lg p-3 text-stone-900 font-bold text-lg text-center focus:ring-2 focus:ring-amber-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-600 mb-1">هامش ربح مستهدف %:</label>
                  <input
                    type="number"
                    min="5"
                    max="80"
                    value={targetMarginPercent}
                    onChange={(e) => setTargetMarginPercent(Number(e.target.value))}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2 text-stone-900 text-xs focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-stone-600 mb-1">أو نسبة إضافة Markup %:</label>
                  <input
                    type="number"
                    min="5"
                    max="200"
                    value={targetMarkupPercent}
                    onChange={(e) => setTargetMarkupPercent(Number(e.target.value))}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2 text-stone-900 text-xs focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-stone-600 mb-1">فئة الصنف للمقارنة:</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value as ProductCategory)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2 text-stone-900 text-xs"
                  >
                    {Object.entries(CATEGORY_LABELS).map(([cat, label]) => (
                      <option key={cat} value={cat}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-stone-600 mb-1">مستوى الجودة:</label>
                  <select
                    value={selectedQuality}
                    onChange={(e) => setSelectedQuality(e.target.value as QualityTier)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2 text-stone-900 text-xs"
                  >
                    {Object.entries(QUALITY_TIER_LABELS).map(([q, data]) => (
                      <option key={q} value={q}>
                        {data.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* OUTPUTS COLUMN (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Primary Financial Verdict Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Landed Cost Card */}
            <div className="bg-white p-4 rounded-xl border border-stone-200">
              <span className="text-xs text-stone-500 block mb-1">تكلفة الوصول الفعلية (LC)</span>
              <div className="text-xl font-bold text-stone-900">{formatEGP(landedUnitCost)}</div>
              <p className="text-[11px] text-stone-500 mt-1">
                تشمل {formatEGP(allocatedBatchExpensePerUnit)} نصيب نولون النقل
              </p>
            </div>

            {/* Cash Floor & Break-Even Card */}
            <div
              className={`p-4 rounded-xl border ${
                cashCoverageResult.price !== null && testSellingPrice < cashCoverageResult.price
                  ? 'bg-rose-50/70 border-rose-300'
                  : operatingBreakEvenResult.price !== null && testSellingPrice < operatingBreakEvenResult.price
                  ? 'bg-amber-50/70 border-amber-300'
                  : 'bg-emerald-50/70 border-emerald-300'
              }`}
            >
              <span className="text-xs text-stone-600 block mb-1">تغطية الكاش والتعادل</span>
              <div
                className={`text-xl font-bold ${
                  cashCoverageResult.price !== null && testSellingPrice < cashCoverageResult.price
                    ? 'text-rose-700'
                    : 'text-stone-900'
                }`}
              >
                {formatEGP(cashCoverageResult.price)}
              </div>
              <p className="text-[11px] mt-1 font-medium">
                {cashCoverageResult.price !== null && testSellingPrice < cashCoverageResult.price ? (
                  <span className="text-rose-700 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    عجز نقدي فوري: أقل من التكلفة النقدية المباشرة!
                  </span>
                ) : operatingBreakEvenResult.price !== null && testSellingPrice < operatingBreakEvenResult.price ? (
                  <span className="text-amber-800 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    يغطي الكاش لكنه تحت التعادل التشغيلي ({formatEGP(operatingBreakEvenResult.price)})
                  </span>
                ) : (
                  <span className="text-emerald-700 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    آمن: فوق التعادل التشغيلي التقديري
                  </span>
                )}
              </p>
            </div>

            {/* Target Price Card */}
            <div className="bg-white p-4 rounded-xl border border-stone-200">
              <span className="text-xs text-stone-500 block mb-1">
                السعر المستهدف ({targetMarginPercent}% هامش بعد الثابتة)
              </span>
              <div className="text-xl font-bold text-amber-900">
                {formatEGP(targetWithOverheadResult.price ?? targetMarginResult.price)}
              </div>
              <p className="text-[11px] text-stone-500 mt-1">
                مباشر: {formatEGP(targetMarginResult.price)} | مع Markup {targetMarkupPercent}%: {formatEGP(targetMarkupResult.price)}
              </p>
            </div>
          </div>

          {/* Unit Profitability & Contribution Breakdown */}
          <div className="bg-white p-5 rounded-xl border border-stone-200 space-y-4">
            <h3 className="text-sm font-bold text-stone-900 border-b border-stone-100 pb-2">
              ربحية القطعة وهامش المساهمة الحقيقي عند السعر المختبر ({formatEGP(testSellingPrice)})
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="bg-stone-50 p-2.5 rounded-lg border border-stone-200">
                <span className="text-[11px] text-stone-500 block">مجمل الربح (GP)</span>
                <span className="text-base font-bold text-stone-900">{formatEGP(grossProfit)}</span>
              </div>
              <div className="bg-stone-50 p-2.5 rounded-lg border border-stone-200">
                <span className="text-[11px] text-stone-500 block">هامش الربح (Margin %)</span>
                <span className="text-base font-bold text-stone-900">{formatPercent(grossMargin)}</span>
              </div>
              <div className="bg-stone-50 p-2.5 rounded-lg border border-stone-200">
                <span className="text-[11px] text-stone-500 block">نسبة الإضافة (Markup %)</span>
                <span className="text-base font-bold text-stone-900">{formatPercent(markup)}</span>
              </div>
              <div className="bg-stone-50 p-2.5 rounded-lg border border-stone-200">
                <span className="text-[11px] text-stone-500 block">مساهمة القطعة (CM)</span>
                <span
                  className={`text-base font-bold ${
                    unitContribution > 0 ? 'text-emerald-700' : 'text-rose-600'
                  }`}
                >
                  {formatEGP(unitContribution)}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2 text-xs text-stone-600">
              <div>
                <span>نسبة هامش المساهمة (CMR): </span>
                <span className="font-bold text-stone-900">{formatPercent(cmr * 100)}</span>
              </div>
              <div>
                <span>تكاليف البيع المتغيرة الإجمالية: </span>
                <span className="font-bold text-stone-900">{formatEGP(totalVariableCostAmount)}</span>
              </div>
              <div>
                <span>صافي تشغيلي تقديري بعد إيجار أسيوط: </span>
                <span
                  className={`font-bold ${
                    estimatedOperatingProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'
                  }`}
                >
                  {formatEGP(estimatedOperatingProfit)}
                </span>
              </div>
            </div>
          </div>

          {/* Market Benchmark Spectrum Bar */}
          <div className="bg-white p-5 rounded-xl border border-stone-200 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-stone-900">
                موقع سعرك بالنسبة لسوق ملابس الرجال في مصر وأسيوط
              </h3>
              <span className="text-xs text-stone-500">
                {benchmark.sampleSize} ملاحظة معتمدة في {CATEGORY_LABELS[selectedCategory]}
              </span>
            </div>

            {benchmark.hasSufficientData ? (
              <div className="space-y-3 pt-2">
                {/* Horizontal scale */}
                <div className="bg-stone-100 p-3 rounded-lg border border-stone-200 text-xs">
                  <div className="flex justify-between items-center text-[11px] text-stone-600 mb-2">
                    <span>العتبة / الجملة: {formatEGP(benchmark.minPrice)}</span>
                    <span className="font-bold text-amber-800">
                      أرضية العروض: {formatEGP(benchmark.promoFloor)}
                    </span>
                    <span className="font-bold text-stone-900">
                      وسيط السوق: {formatEGP(benchmark.medianPrice)}
                    </span>
                    <span>أعلى سعر: {formatEGP(benchmark.maxPrice)}</span>
                  </div>

                  {/* Relative position bar */}
                  <div className="relative h-3 bg-stone-300 rounded-full overflow-hidden">
                    <div
                      className="absolute top-0 bottom-0 bg-amber-400 rounded-full"
                      style={{
                        right: `${Math.min(
                          100,
                          Math.max(
                            5,
                            benchmark.maxPrice > benchmark.minPrice
                              ? ((testSellingPrice - benchmark.minPrice) /
                                  (benchmark.maxPrice - benchmark.minPrice)) *
                                  100
                              : 50
                          )
                        )}%`,
                        width: '8px',
                        transform: 'translateX(50%)',
                      }}
                    />
                  </div>

                  <div className="mt-2 text-center text-xs font-semibold">
                    {testSellingPrice < benchmark.promoFloor ? (
                      <span className="text-amber-800">
                        ⚡ سعرك ({formatEGP(testSellingPrice)}) أقل من أرضية العروض الوطنية (فرصة لزيادة السعر أو الحفاظ على ميزة منافسة قوية).
                      </span>
                    ) : testSellingPrice <= benchmark.medianPrice ? (
                      <span className="text-emerald-700">
                        ✓ سعرك ({formatEGP(testSellingPrice)}) في النطاق التنافسي المتوازن (بين أرضية العروض ووسيط السوق).
                      </span>
                    ) : (
                      <span className="text-rose-700">
                        ⚠️ سعرك ({formatEGP(testSellingPrice)}) أعلى من وسيط السوق الوطني ({formatEGP(benchmark.medianPrice)}). تأكد من تميز الجودة لتبرير السعر لزبون أسيوط.
                      </span>
                    )}
                  </div>
                </div>

                {benchmark.strategicAnchors.length > 0 && (
                  <div className="text-[11px] text-stone-500 flex flex-wrap gap-2">
                    <span className="font-medium text-stone-700">أبرز مراجع السوق المرصودة:</span>
                    {benchmark.strategicAnchors.map((a, i) => (
                      <span key={i} className="bg-stone-100 px-2 py-0.5 rounded text-stone-700">
                        {a.brand}: {formatEGP(a.price)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-lg text-xs space-y-1">
                <span className="font-bold text-amber-950 block">بيانات سوقية موثقة غير كافية للمقارنة</span>
                <p className="text-amber-800 leading-relaxed">
                  {benchmark.insufficientDataReason || 'لا تتوفر رصود تجزئة فردية معتمدة ومطابقة لفئة الصنف ومستوى الجودة المحدد.'}
                  {benchmark.bundleOffersCount > 0 && (
                    <span className="block mt-1 text-stone-600 font-normal">
                      * يتوفر {benchmark.bundleOffersCount} عرض باقة مسجل في المرصد، ولكن تم عزلها محاسبياً لعدم خلط سعر الباقة بسعر القطعة الفردية.
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>

          {/* Interactive Discount & Markdown Sensitivity Simulator */}
          <div className="bg-amber-50/40 p-5 rounded-xl border border-amber-200/80 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-amber-800" />
                  محاكي حساسية الخصم ونموذج الزيادة المطلوبة في المبيعات (ΔQ%)
                </h3>
                <p className="text-xs text-stone-600 mt-0.5">
                  تطبيق المعادلة الرياضية من ورقة بحث السوق لمعرفة هل الخصم مفيد أم مدمر نقدياً.
                </p>
              </div>
              <div className="flex items-center gap-1">
                {[5, 10, 15, 20, 25].map((d) => (
                  <button
                    key={d}
                    onClick={() => setSimulatorDiscountPercent(d)}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      simulatorDiscountPercent === d
                        ? 'bg-amber-800 text-white font-semibold'
                        : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-50'
                    }`}
                  >
                    %{d}
                  </button>
                ))}
              </div>
            </div>

            {/* Slider */}
            <div>
              <div className="flex justify-between text-xs text-stone-600 mb-1">
                <span>نسبة التخفيض المختبرة:</span>
                <span className="font-bold text-stone-900">%{simulatorDiscountPercent}</span>
              </div>
              <input
                type="range"
                min="1"
                max="40"
                step="1"
                value={simulatorDiscountPercent}
                onChange={(e) => setSimulatorDiscountPercent(Number(e.target.value))}
                className="w-full accent-amber-700"
              />
            </div>

            {/* Sensitivity Analysis Results */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-white p-3 rounded-lg border border-amber-200">
                <span className="text-stone-500 block">السعر بعد التخفيض</span>
                <span className="text-base font-bold text-stone-900">
                  {formatEGP(discountSensitivity.discountedPrice)}
                </span>
                <span className="text-[11px] text-stone-500 block">
                  خصم {formatEGP(testSellingPrice - discountSensitivity.discountedPrice)}
                </span>
              </div>

              <div className="bg-white p-3 rounded-lg border border-amber-200">
                <span className="text-stone-500 block">مساهمة القطعة الجديدة</span>
                <span
                  className={`text-base font-bold ${
                    discountSensitivity.newUnitContribution > 0 ? 'text-emerald-700' : 'text-rose-600'
                  }`}
                >
                  {formatEGP(discountSensitivity.newUnitContribution)}
                </span>
                <span className="text-[11px] text-stone-500 block">
                  نسبة المساهمة: {formatPercent(discountSensitivity.newCMR)}
                </span>
              </div>

              <div className="bg-white p-3 rounded-lg border border-amber-200">
                <span className="text-stone-500 block">الزيادة المطلوبة بالمبيعات (ΔQ%)</span>
                <span
                  className={`text-base font-bold ${
                    discountSensitivity.isDestructive ? 'text-rose-600' : 'text-amber-900'
                  }`}
                >
                  {discountSensitivity.isDestructive
                    ? 'مستحيل التعويض'
                    : `+${discountSensitivity.requiredVolumeUpliftPercent}%`}
                </span>
                <span className="text-[11px] text-stone-500 block">
                  للحفاظ على نفس إجمالي الكاش
                </span>
              </div>
            </div>

            {/* Verdict Explanation */}
            <div className="p-3 bg-white rounded-lg border border-amber-200 text-xs text-stone-800">
              {discountSensitivity.isDestructive ? (
                <p className="text-rose-700 font-medium">
                  ⚠️ هذا الخصم (%{simulatorDiscountPercent}) مدمر نقدياً! إنه يلتهم كامل هامش المساهمة للقطعة، ولن يعوضه أي زيادة في عدد القطع المباعة. ينصح بتجنبه أو الاكتفاء به كحل تصفية أخير فقط.
                </p>
              ) : (
                <p>
                  💡 <strong>القرار المحاسبي:</strong> لتقديم خصم %{simulatorDiscountPercent}، يجب أن يتضاعف إقبال الزبائن بنسبة لا تقل عن{' '}
                  <span className="font-bold text-amber-900">+{discountSensitivity.requiredVolumeUpliftPercent}%</span>{' '}
                  (مثلاً: إذا كنت تبيع 10 قطع أسبوعياً، يجب أن تبيع{' '}
                  {Math.round(10 * (1 + discountSensitivity.requiredVolumeUpliftPercent / 100))} قطعة). إن لم تكن متأكداً من وجود هذا الطلب بأسيوط، فتجنب الخصم وفضّل نظام الباقات المجمعة.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
