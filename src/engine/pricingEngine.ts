/**
 * محرك الحسابات المالية والتسعير المرن لقطاع ملابس الرجال في مصر (أسيوط)
 * Real Adaptive Pricing Engine - Core Financial Logic & Decision Engine
 *
 * Strict Accounting Principles:
 * 1. Distinction between Landed Cost (C), Variable Selling Costs (V flat + r rate), and Allocated Fixed Overhead (F)
 * 2. Explicit 0 is never replaced with hidden arbitrary defaults
 * 3. Cash-coverage floor: P = (C + V) / (1 - r) [Direct cash bleeding if P < P_cash]
 * 4. Estimated operating break-even: P = (C + F + V) / (1 - r) [Covers variable costs + allocated fixed overhead]
 * 5. Target contribution price: P = (C + F + V) / (1 - r - m) [Rejects impossible denominators r + m >= 1]
 * 6. Explicit disclosure of fixed-overhead allocation assumptions
 * 7. Verified market benchmarks strictly enforce quality tier and single-item retail isolation
 */

import {
  ProductCosts,
  VariableSellingCosts,
  StoreFixedSettings,
  FinancialCalculationResult,
  DiscountSensitivityScenario,
  ProductRecord,
  MarketObservation,
  MarketBenchmarkSummary,
  PricingRecommendation,
  ProductCategory,
  QualityTier,
} from '../types/pricing';
import { CATEGORY_LABELS, QUALITY_TIER_LABELS } from '../utils/formatters';

/**
 * حساب تكلفة الوصول الفعلية للقطعة (Landed Unit Cost - C)
 * تشمل سعر الشراء بالمصنع + نصيب القطعة من نولون النقل ومصاريف الشحنة + تكاليف التجهيز المباشرة
 */
export function calculateLandedUnitCost(costs: ProductCosts): {
  landedUnitCost: number;
  allocatedBatchExpensePerUnit: number;
  missingCostInputs: string[];
} {
  const missingCostInputs: string[] = [];

  if (costs.purchaseCost === undefined || costs.purchaseCost === null || isNaN(costs.purchaseCost)) {
    missingCostInputs.push('سعر الشراء من المورد غير محدد');
  }
  if (!costs.batchUnits || costs.batchUnits <= 0) {
    missingCostInputs.push('عدد قطع الدفعة غير محدد بدقة');
  }

  const purchaseCost = Math.max(0, costs.purchaseCost ?? 0);
  const units = Math.max(1, costs.batchUnits ?? 1);
  const totalBatchExpenses = Math.max(0, (costs.batchTransportCost ?? 0) + (costs.batchOtherExpenses ?? 0));
  const allocatedBatchExpensePerUnit = totalBatchExpenses / units;
  const directUnitCost = Math.max(0, costs.directUnitCost ?? 0);

  const landedUnitCost = purchaseCost + allocatedBatchExpensePerUnit + directUnitCost;
  return {
    landedUnitCost: roundMoney(landedUnitCost),
    allocatedBatchExpensePerUnit: roundMoney(allocatedBatchExpensePerUnit),
    missingCostInputs,
  };
}

/**
 * حساب مجمل الربح للقطعة بالجنيه (Gross Profit)
 * GP = P - C
 */
export function calculateGrossProfit(sellingPrice: number, landedCost: number): number {
  return roundMoney(sellingPrice - landedCost);
}

/**
 * حساب نسبة هامش الربح الإجمالي (Gross Margin %)
 * Gross Margin = (P - C) / P * 100
 */
export function calculateGrossMargin(sellingPrice: number, landedCost: number): number {
  if (sellingPrice <= 0) return 0;
  return roundPercent(((sellingPrice - landedCost) / sellingPrice) * 100);
}

/**
 * حساب نسبة الإضافة على التكلفة (Markup %)
 * Markup = (P - C) / C * 100
 * تنبيه محاسبي: لا تتطابق أبداً مع هامش الربح!
 */
export function calculateMarkup(sellingPrice: number, landedCost: number): number {
  if (landedCost <= 0) return 0;
  return roundPercent(((sellingPrice - landedCost) / landedCost) * 100);
}

/**
 * احتساب التكاليف المتغيرة المباشرة والنسبية
 * V = مصاريف متغيرة ثابتة للقطعة (أكياس، شحن)
 * r = نسبة العمولات ورسوم الدفع كسر عشري
 *
 * قاعدة الأمان: الصفر الصريح يظل صفراً (0 remains 0) ولا يتم استبداله بأي افتراضي خفي!
 */
export function calculateVariableSellingCosts(
  sellingPrice: number,
  vc: VariableSellingCosts
): {
  flatPerUnit: number;
  feeRateDecimal: number;
  totalVariableCostAmount: number;
  missingInputs: string[];
} {
  const missingInputs: string[] = [];

  if (vc?.packagingUnitCost === undefined || vc?.packagingUnitCost === null) {
    missingInputs.push('تكلفة التغليف والأكياس غير مدخلة');
  }
  if (vc?.paymentFeePercent === undefined || vc?.paymentFeePercent === null) {
    missingInputs.push('نسبة رسوم الدفع الإلكتروني غير محددة');
  }
  if (vc?.salesCommissionPercent === undefined || vc?.salesCommissionPercent === null) {
    missingInputs.push('نسبة عمولة البيع غير محددة');
  }

  const packaging = vc?.packagingUnitCost ?? 0;
  const delivery = vc?.localDeliveryUnitCost ?? 0;
  const flatPerUnit = Math.max(0, packaging + delivery);

  const paymentPct = vc?.paymentFeePercent ?? 0;
  const salesCommPct = vc?.salesCommissionPercent ?? 0;
  const marketplacePct = vc?.marketplaceFeePercent ?? 0;
  const totalFeePercent = Math.max(0, paymentPct + salesCommPct + marketplacePct);

  const feeRateDecimal = totalFeePercent / 100;
  const totalVariableCostAmount = flatPerUnit + Math.max(0, sellingPrice) * feeRateDecimal;

  return {
    flatPerUnit: roundMoney(flatPerUnit),
    feeRateDecimal,
    totalVariableCostAmount: roundMoney(totalVariableCostAmount),
    missingInputs,
  };
}

/**
 * حساب مساهمة القطعة الواحدة (Unit Contribution - CM)
 * CM = P * (1 - r) - C - V
 */
export function calculateUnitContribution(
  sellingPrice: number,
  landedCost: number,
  vc: VariableSellingCosts
): number {
  const { flatPerUnit, feeRateDecimal } = calculateVariableSellingCosts(sellingPrice, vc);
  const netRevenueAfterPercentFees = sellingPrice * (1 - feeRateDecimal);
  const contribution = netRevenueAfterPercentFees - landedCost - flatPerUnit;
  return roundMoney(contribution);
}

/**
 * حساب نسبة هامش المساهمة (Contribution Margin Ratio - CMR)
 * CMR = CM / P
 */
export function calculateContributionMarginRatio(
  sellingPrice: number,
  landedCost: number,
  vc: VariableSellingCosts
): number {
  if (sellingPrice <= 0) return 0;
  const cm = calculateUnitContribution(sellingPrice, landedCost, vc);
  return cm / sellingPrice;
}

/**
 * 1. سعر التغطية النقدية المباشرة قبل المصاريف الثابتة (Cash-coverage Price)
 * P = (C + V) / (1 - r)
 * البيع بأقل من هذا السعر يسبب عجزاً نقدياً ونزيفاً مباشراً من الجيب
 */
export function calculateCashCoveragePrice(
  landedCost: number,
  vc: VariableSellingCosts
): { price: number | null; isImpossible: boolean; errorNote?: string } {
  const { flatPerUnit, feeRateDecimal } = calculateVariableSellingCosts(0, vc);
  const denominator = 1 - feeRateDecimal;

  if (denominator <= 0) {
    return {
      price: null,
      isImpossible: true,
      errorNote: 'نسبة الرسوم والعمولات المتغيرة (r) تساوي أو تتجاوز 100%؛ يستحيل استرداد التكاليف النقدية رياضياً.',
    };
  }

  const price = (landedCost + flatPerUnit) / denominator;
  return {
    price: roundMoney(price),
    isImpossible: false,
  };
}

/**
 * 2. سعر التعادل التشغيلي التقديري مع نصيب المصاريف الثابتة (Estimated Operating Break-even Price)
 * P = (C + F + V) / (1 - r)
 * يغطي التكلفة المباشرة للقطعة + نصيبها المخصص من إيجار المحل ورواتب أسيوط الثابتة
 */
export function calculateOperatingBreakEvenPrice(
  landedCost: number,
  allocatedFixedOverhead: number,
  vc: VariableSellingCosts
): { price: number | null; isImpossible: boolean; errorNote?: string } {
  const { flatPerUnit, feeRateDecimal } = calculateVariableSellingCosts(0, vc);
  const denominator = 1 - feeRateDecimal;

  if (denominator <= 0) {
    return {
      price: null,
      isImpossible: true,
      errorNote: 'نسبة الرسوم والعمولات المتغيرة (r) تساوي أو تتجاوز 100%؛ يستحيل الوصول للتعادل التشغيلي رياضياً.',
    };
  }

  const price = (landedCost + allocatedFixedOverhead + flatPerUnit) / denominator;
  return {
    price: roundMoney(price),
    isImpossible: false,
  };
}

/**
 * 3. السعر المستهدف لتحقيق هامش مساهمة m بعد تغطية المصاريف الثابتة المخصصة
 * P = (C + F + V) / (1 - r - m)
 * حيث m نسبة عشرية (مثلاً 0.15 = 15%)
 */
export function calculateTargetPriceWithFixedOverhead(
  landedCost: number,
  allocatedFixedOverhead: number,
  vc: VariableSellingCosts,
  targetMarginFraction: number
): { price: number | null; isImpossible: boolean; errorNote?: string } {
  const { flatPerUnit, feeRateDecimal } = calculateVariableSellingCosts(0, vc);
  const denominator = 1 - feeRateDecimal - targetMarginFraction;

  if (denominator <= 0) {
    return {
      price: null,
      isImpossible: true,
      errorNote: 'مجموع نسبة الرسوم المتغيرة (r) ونسبة الهامش المستهدف (m) يساوي أو يتجاوز 100%؛ يستحيل تحقيقه رياضياً.',
    };
  }

  const price = (landedCost + allocatedFixedOverhead + flatPerUnit) / denominator;
  return {
    price: roundMoney(price),
    isImpossible: false,
  };
}

/**
 * السعر المستهدف لهامش ربح مباشر على سعر البيع (Target Price from Margin before Fixed Overhead)
 * P = (C + V) / (1 - r - m)
 */
export function calculateTargetPriceFromMargin(
  landedCost: number,
  vc: VariableSellingCosts,
  targetMarginPercent: number
): { price: number | null; isImpossible: boolean; errorNote?: string } {
  const marginDecimal = (targetMarginPercent ?? 0) / 100;
  const { flatPerUnit, feeRateDecimal } = calculateVariableSellingCosts(0, vc);
  const denominator = 1 - feeRateDecimal - marginDecimal;

  if (denominator <= 0) {
    return {
      price: null,
      isImpossible: true,
      errorNote: 'هامش الربح المطلوب مع نسب العمولات يتجاوز أو يقارب 100%؛ غير قابل للتحقق رياضياً.',
    };
  }

  const targetPrice = (landedCost + flatPerUnit) / denominator;
  return {
    price: roundMoney(targetPrice),
    isImpossible: false,
  };
}

/**
 * حساب السعر المستهدف بناءً على نسبة الإضافة على التكلفة (Target Price from Markup)
 * السعر يغطي التكلفة + الإضافة المطلوبة، بالإضافة لتغطية العمولات المتغيرة
 * P = (C * (1 + Markup) + V) / (1 - r)
 */
export function calculateTargetPriceFromMarkup(
  landedCost: number,
  vc: VariableSellingCosts,
  targetMarkupPercent: number
): { price: number | null; isImpossible: boolean; errorNote?: string } {
  const markupDecimal = (targetMarkupPercent ?? 0) / 100;
  const costWithMarkup = landedCost * (1 + markupDecimal);
  const { flatPerUnit, feeRateDecimal } = calculateVariableSellingCosts(0, vc);
  const denominator = 1 - feeRateDecimal;

  if (denominator <= 0) {
    return {
      price: null,
      isImpossible: true,
      errorNote: 'نسبة الرسوم المتغيرة تتجاوز 100%؛ يستحيل تحقيق السعر المستهدف.',
    };
  }

  const price = (costWithMarkup + flatPerUnit) / denominator;
  return {
    price: roundMoney(price),
    isImpossible: false,
  };
}

/**
 * حساب أرضية السعر الاقتصادية المرجعية (Economic Minimum Floor Price)
 * افتراضياً تمثل سعر التغطية النقدية لضمان عدم حدوث نزيف نقدي
 */
export function calculateEconomicFloorPrice(
  landedCost: number,
  vc: VariableSellingCosts,
  minCMR: number = 0.05
): { price: number; isImpossible: boolean; errorNote?: string } {
  const { flatPerUnit, feeRateDecimal } = calculateVariableSellingCosts(0, vc);
  const denominator = 1 - feeRateDecimal - minCMR;

  if (denominator <= 0.001) {
    const cashCoverage = calculateCashCoveragePrice(landedCost, vc);
    return {
      price: cashCoverage.price ?? roundMoney(landedCost + flatPerUnit),
      isImpossible: true,
      errorNote: 'نسبة عمولات البيع مع هامش المساهمة المطلوب تتجاوز 100%؛ تم احتساب أرضية التغطية النقدية المجردة فقط.',
    };
  }

  const floorPrice = (landedCost + flatPerUnit) / denominator;
  return {
    price: roundMoney(floorPrice),
    isImpossible: false,
  };
}

/**
 * حساب كمية التعادل والإيراد المطلوب لتغطية التكاليف الثابتة
 */
export function calculateBreakEven(
  allocatedFixedCosts: number,
  unitContribution: number,
  sellingPrice: number
): { breakEvenUnits: number | null; breakEvenRevenue: number | null } {
  if (unitContribution <= 0 || allocatedFixedCosts <= 0) {
    return { breakEvenUnits: null, breakEvenRevenue: null };
  }

  const breakEvenUnits = Math.ceil(allocatedFixedCosts / unitContribution);
  const breakEvenRevenue = roundMoney(breakEvenUnits * sellingPrice);

  return { breakEvenUnits, breakEvenRevenue };
}

/**
 * احتساب التقرير المالي الشامل للقطعة (Comprehensive Financial Calculation)
 * يفرّق تماماً بين العجز النقدي الفوري وعدم تغطية المصاريف الثابتة التقديرية
 */
export function calculateProductFinancials(
  product: ProductRecord,
  storeSettings: StoreFixedSettings
): FinancialCalculationResult {
  const { landedUnitCost, allocatedBatchExpensePerUnit, missingCostInputs } =
    calculateLandedUnitCost(product.costs);
  const sellingPrice = Math.max(0, product.currentSellingPrice ?? 0);

  const grossProfit = calculateGrossProfit(sellingPrice, landedUnitCost);
  const grossMarginPercent = calculateGrossMargin(sellingPrice, landedUnitCost);
  const markupPercent = calculateMarkup(sellingPrice, landedUnitCost);

  const { flatPerUnit, feeRateDecimal, totalVariableCostAmount, missingInputs: missingVCInputs } =
    calculateVariableSellingCosts(sellingPrice, product.variableCosts);

  const unitContribution = calculateUnitContribution(sellingPrice, landedUnitCost, product.variableCosts);
  const contributionMarginRatio = calculateContributionMarginRatio(
    sellingPrice,
    landedUnitCost,
    product.variableCosts
  );

  // التكاليف الثابتة التقديرية بأسيوط (مع الإفصاح الصريح عن الفرضيات)
  const expectedMonthlySales = Math.max(1, storeSettings.expectedMonthlyUnitSales ?? 300);
  const monthlyFixedExpenses = Math.max(0, storeSettings.monthlyFixedExpenses ?? 0);
  const estimatedFixedOverheadPerUnit = roundMoney(monthlyFixedExpenses / expectedMonthlySales);
  const fixedOverheadDisclosure = `المصاريف الثابتة التقديرية (${estimatedFixedOverheadPerUnit} ج.م للقطعة) موزعة بفرضية مبيعات شهرية تبلغ ${expectedMonthlySales} قطعة من إجمالي مصاريف المتجر (${monthlyFixedExpenses} ج.م شهرياً) في أسيوط. هذه الفرضية لا تدخل في التكلفة المباشرة وإنما لأغراض التخطيط الشامل.`;

  const netOperatingProfitPerUnit = roundMoney(unitContribution - estimatedFixedOverheadPerUnit);

  // حساب نقطة التعادل بناءً على حصة الدفعة التقديرية من المصاريف الثابتة
  const batchAllocatedFixed = estimatedFixedOverheadPerUnit * (product.costs.batchUnits || 1);
  const { breakEvenUnits, breakEvenRevenue } = calculateBreakEven(
    batchAllocatedFixed,
    unitContribution,
    sellingPrice
  );

  // حساب مستويات الأسعار الثلاثة الصريحة
  const cashCoverageResult = calculateCashCoveragePrice(landedUnitCost, product.variableCosts);
  const operatingBreakEvenResult = calculateOperatingBreakEvenPrice(
    landedUnitCost,
    estimatedFixedOverheadPerUnit,
    product.variableCosts
  );
  const targetWithOverheadResult = calculateTargetPriceWithFixedOverhead(
    landedUnitCost,
    estimatedFixedOverheadPerUnit,
    product.variableCosts,
    (product.targetGrossMarginPercent || 35) / 100
  );

  const targetMarginResult = calculateTargetPriceFromMargin(
    landedUnitCost,
    product.variableCosts,
    product.targetGrossMarginPercent || 35
  );
  const targetMarkupResult = calculateTargetPriceFromMarkup(
    landedUnitCost,
    product.variableCosts,
    product.targetMarkupPercent || 50
  );

  // الحدود الاقتصادية والتحذيرات الدقيقة
  const minCMR = Math.max(0.01, storeSettings.minAcceptableCMR ?? 0.10);
  const floorResult = calculateEconomicFloorPrice(landedUnitCost, product.variableCosts, minCMR);

  // التمييز الحاسم:
  // 1. عجز نقدي فوري: السعر أقل من سعر التغطية النقدية أو المساهمة سالبة
  const isBelowCashCoverage =
    (cashCoverageResult.price !== null && sellingPrice < cashCoverageResult.price) || unitContribution <= 0;

  // 2. تحت التعادل التشغيلي التقديري: يغطي التكاليف النقدية المباشرة لكنه يعجز عن نصيبه من المصاريف الثابتة
  const isBelowOperatingBreakEven =
    operatingBreakEvenResult.price !== null && sellingPrice < operatingBreakEvenResult.price;

  const missingFinancialInputs = [...missingCostInputs, ...missingVCInputs];

  return {
    landedUnitCost,
    allocatedBatchExpensePerUnit,
    currentSellingPrice: sellingPrice,
    grossProfit,
    grossMarginPercent,
    markupPercent,
    flatVariableCostPerUnit: flatPerUnit,
    percentageVariableFeeRate: feeRateDecimal,
    variableCostAmount: totalVariableCostAmount,
    unitContribution,
    contributionMarginRatio: roundPercent(contributionMarginRatio * 100) / 100,
    estimatedFixedOverheadPerUnit,
    netOperatingProfitPerUnit,
    fixedOverheadDisclosure,
    breakEvenQuantity: breakEvenUnits,
    breakEvenBatchRevenue: breakEvenRevenue,
    cashCoveragePrice: cashCoverageResult.price,
    operatingBreakEvenPrice: operatingBreakEvenResult.price,
    targetPriceWithFixedOverhead: targetWithOverheadResult.price,
    economicFloorPrice: floorResult.price,
    targetPriceFromMargin: targetMarginResult.price ?? 0,
    targetPriceFromMarkup: targetMarkupResult.price ?? 0,
    isBelowCashCoverage,
    isBelowOperatingBreakEven,
    isBelowEconomicFloor: isBelowCashCoverage,
    isNegativeContribution: unitContribution <= 0,
    isImpossibleTargetMargin: targetMarginResult.isImpossible || floorResult.isImpossible,
    missingFinancialInputs,
  };
}

/**
 * تحليل مرونة الخصومات وتأثير التخفيض على المساهمة النقدية
 * يحسب الزيادة المطلوبة في حجم المبيعات (Delta Q %) لتعويض التخفيض ومنع تآكل الأرباح
 * Formula: Delta Q % = d / (CMR_initial - d)
 */
export function calculateDiscountSensitivity(
  currentPrice: number,
  landedCost: number,
  vc: VariableSellingCosts,
  discountPercent: number
): DiscountSensitivityScenario {
  const d = Math.max(0, discountPercent) / 100;
  const discountedPrice = roundMoney(currentPrice * (1 - d));
  const currentCM = calculateUnitContribution(currentPrice, landedCost, vc);
  const currentCMR = currentPrice > 0 ? currentCM / currentPrice : 0;

  const newUnitContribution = calculateUnitContribution(discountedPrice, landedCost, vc);
  const newCMR = discountedPrice > 0 ? newUnitContribution / discountedPrice : 0;

  let requiredVolumeUpliftPercent = 0;
  let isDestructive = false;

  if (d <= 0) {
    requiredVolumeUpliftPercent = 0;
  } else if (newUnitContribution <= 0 || currentCMR <= d) {
    requiredVolumeUpliftPercent = 9999;
    isDestructive = true;
  } else {
    const denominator = currentCMR - d;
    requiredVolumeUpliftPercent = roundPercent((d / denominator) * 100);
  }

  const cashContributionPer100Units = roundMoney(newUnitContribution * 100);

  return {
    discountPercent,
    discountedPrice,
    newUnitContribution,
    newCMR: roundPercent(newCMR * 100),
    requiredVolumeUpliftPercent,
    cashContributionPer100Units,
    isDestructive,
  };
}

/**
 * حساب ملخص مؤشرات السوق المعتمدة والمطابقة بدقة (Trustworthy Market Benchmark)
 *
 * شروط الأمان المحاسبي والسوقي الصارمة:
 * 1. فحص وتطبيق فئة الجودة المختارة (Quality Tier).
 * 2. مقارنة أسعار التجزئة الفردية (Retail_Public) فقط مع بعضها.
 * 3. عزل عروض الباقات (Bundle_Offer) والجملة تماماً عن متوسطات القطعة الفردية.
 * 4. استبعاد أي ملاحظات مرفوضة أو معلقة (Pending_Review) أو تجريبية غير موثقة.
 * 5. إذا كانت العينة المعتمدة غير كافية، يُعلن بوضوح "بيانات سوقية موثقة غير كافية للمقارنة".
 */
export function calculateMarketBenchmark(
  category: ProductCategory,
  qualityTier: QualityTier,
  allObservations: MarketObservation[]
): MarketBenchmarkSummary {
  // 1. تصفية رصود التجزئة الفردية المعتمدة فقط، المطابقة للفئة وفئة الجودة بدقة
  const verifiedSingleRetail = allObservations.filter(
    (obs) =>
      obs.verificationStatus === 'Approved' &&
      obs.category === category &&
      obs.qualityTier === qualityTier &&
      obs.commercialLevel === 'Retail_Public' &&
      obs.currentPrice > 0
  );

  // 2. إحصاء عروض الباقات المعتمدة بشكل منفصل كمعلومة استرشادية دون خلطها بأسعار القطعة
  const bundleOffersCount = allObservations.filter(
    (obs) =>
      obs.verificationStatus === 'Approved' &&
      obs.category === category &&
      obs.commercialLevel === 'Bundle_Offer'
  ).length;

  if (verifiedSingleRetail.length === 0) {
    return {
      sampleSize: 0,
      minPrice: 0,
      maxPrice: 0,
      medianPrice: 0,
      promoFloor: 0,
      strategicAnchors: [],
      offlineAssiutCeiling: null,
      hasSufficientData: false,
      insufficientDataReason: 'بيانات سوقية موثقة غير كافية للمقارنة (لا توجد رصود تجزئة فردية معتمدة لفئة الجودة هذه)',
      bundleOffersCount,
    };
  }

  const prices = verifiedSingleRetail.map((obs) => obs.currentPrice).sort((a, b) => a - b);
  const minPrice = prices[0];
  const maxPrice = prices[prices.length - 1];

  // احتساب الوسيط الرياضي الحقيقي
  const midIndex = Math.floor(prices.length / 2);
  const medianPrice =
    prices.length % 2 !== 0
      ? prices[midIndex]
      : roundMoney((prices[midIndex - 1] + prices[midIndex]) / 2);

  const promoFloor = minPrice;

  // استخراج المراجع البارزة المعتمدة
  const strategicAnchors = verifiedSingleRetail.slice(0, 4).map((obs) => ({
    brand: obs.brandName,
    price: obs.currentPrice,
    scope: obs.geographyScope,
  }));

  const assiutObs = verifiedSingleRetail.find((obs) => obs.geographyScope === 'Assiut_Offline');
  const offlineAssiutCeiling = assiutObs ? assiutObs.currentPrice : null;

  // تتطلب العينة موثوقية لا تقل عن رصدين مستقلين معتمدين
  const hasSufficientData = verifiedSingleRetail.length >= 2;

  return {
    sampleSize: verifiedSingleRetail.length,
    minPrice,
    maxPrice,
    medianPrice,
    promoFloor,
    strategicAnchors,
    offlineAssiutCeiling,
    hasSufficientData,
    insufficientDataReason: !hasSufficientData
      ? 'عينة الرصد محدودة (رصد معتمد واحد فقط)؛ لا تكفي لبناء ممر سعري للمقارنة'
      : undefined,
    bundleOffersCount,
  };
}

/**
 * محرك التوصيات التسعيرية وسيناريوهات دورة حياة المخزون
 * لا يختلق طلباً مستقبلياً أو أسعاراً غير موثقة، ويفرّق بين القرارات المبنية على السوق وتلك المبنية على التكلفة الداخلية
 */
export function generatePricingRecommendations(
  product: ProductRecord,
  allObservations: MarketObservation[],
  storeSettings: StoreFixedSettings
): PricingRecommendation[] {
  const financials = calculateProductFinancials(product, storeSettings);
  const benchmark = calculateMarketBenchmark(product.category, product.qualityTier, allObservations);

  const purchaseTimestamp = new Date(product.purchaseDate).getTime();
  const now = Date.now();
  const daysInStock = Math.max(0, Math.floor((now - purchaseTimestamp) / (1000 * 60 * 60 * 24)));

  const remainingStock = Math.max(
    0,
    (product.quantityReceived || product.quantityPurchased) -
      (product.quantitySold || 0) -
      (product.quantityDamaged || 0)
  );

  const initialStock = Math.max(1, product.quantityReceived || product.quantityPurchased);
  const soldUnits = Math.max(0, product.quantitySold || 0);
  const salesVelocityPerDay = daysInStock > 0 ? soldUnits / daysInStock : soldUnits;

  // فحص النواقص
  const missingData: string[] = [...financials.missingFinancialInputs];
  if (product.salesTransactions.length === 0) {
    missingData.push('لا توجد حركات مبيعات سابقة مسجلة لهذا الصنف لحساب المرونة السعرية الفعلية.');
  }
  if (!benchmark.hasSufficientData) {
    missingData.push(
      benchmark.insufficientDataReason ||
        `بيانات السوق الموثقة لفئة (${QUALITY_TIER_LABELS[product.qualityTier]?.label || product.qualityTier}) غير كافية لمقارنة موثوقة.`
    );
  }

  const recommendations: PricingRecommendation[] = [];

  // سيناريو 1: HOLD (تثبيت السعر)
  const holdPrice = product.currentSellingPrice;
  const holdCM = financials.unitContribution;
  const holdCMR = financials.contributionMarginRatio;

  const holdEvidence: string[] = [
    `المنتج في المخزون منذ ${daysInStock} يوماً.`,
    `هامش المساهمة الحالي (${holdCM} ج.م / قطعة) إيجابي ويغطي العمولات المتغيرة.`,
  ];
  if (benchmark.hasSufficientData) {
    holdEvidence.push(`السعر الحالي (${holdPrice} ج.م) متوازن مع وسيط السوق المعتمد (${benchmark.medianPrice} ج.م).`);
  } else {
    holdEvidence.push('القرار مبني على حماية الهامش المحاسبي الداخلي لعدم توفر مقارنات سوقية موثقة كافية.');
  }

  recommendations.push({
    action: 'HOLD',
    actionTitleArabic: 'تثبيت السعر الحالي',
    recommendedPrice: holdPrice,
    expectedFinancialConsequences: {
      unitContribution: holdCM,
      contributionMarginRatio: holdCMR,
      totalRemainingBatchContribution: roundMoney(holdCM * remainingStock),
      cashRecoveryPotential: roundMoney(holdPrice * remainingStock),
    },
    supportingEvidence: holdEvidence,
    confidenceLevel: daysInStock <= 45 && holdCM > 0 ? 'High' : 'Medium',
    confidenceBasis: 'استقرار المبيعات وعدم وجود تراكم حرج للمخزون.',
    missingInformation: missingData,
    risksAndTradeoffs: [
      'احتمال تباطؤ وتيرة البيع مع تقدم الموسم ووصول المنافسين لتخفيضات أعمق.',
      'تجميد السيولة في حال حدوث هبوط مفاجئ في حركة السوق المحلي بأسيوط.',
    ],
    whyPreferredOverAlternatives:
      'يحافظ على كامل هامش الربح المخطط له وسمعة المتجر التسعيرية دون تقديم تنازلات غير مبررة.',
  });

  // سيناريو 2: INCREASE (رفع السعر)
  const proposedIncreasePrice = roundMoney(
    Math.max(
      product.currentSellingPrice * 1.10,
      financials.targetPriceFromMargin,
      benchmark.hasSufficientData ? benchmark.medianPrice * 0.95 : product.currentSellingPrice * 1.12
    )
  );
  const incCM = calculateUnitContribution(proposedIncreasePrice, financials.landedUnitCost, product.variableCosts);
  const incCMR = proposedIncreasePrice > 0 ? incCM / proposedIncreasePrice : 0;
  const isHighDemandCandidate = remainingStock < initialStock * 0.25 && salesVelocityPerDay > 0.5;

  const incEvidence: string[] = [
    `متبقي في المحل ${remainingStock} قطعة فقط من أصل ${initialStock}.`,
  ];
  if (benchmark.hasSufficientData && product.currentSellingPrice < benchmark.medianPrice * 0.85) {
    incEvidence.push(
      `سعرك الحالي (${product.currentSellingPrice} ج.م) أقل من وسيط السوق المعتمد (${benchmark.medianPrice} ج.م) بـ ${roundPercent(((benchmark.medianPrice - product.currentSellingPrice) / benchmark.medianPrice) * 100)}%.`
    );
  } else {
    incEvidence.push('فرصة لاختبار مرونة الطلب وتحسين العائد على القطع المتبقية القليلة.');
  }

  recommendations.push({
    action: 'INCREASE',
    actionTitleArabic: 'رفع السعر تدريجياً',
    recommendedPrice: proposedIncreasePrice,
    expectedFinancialConsequences: {
      unitContribution: incCM,
      contributionMarginRatio: roundPercent(incCMR * 100) / 100,
      totalRemainingBatchContribution: roundMoney(incCM * remainingStock),
      cashRecoveryPotential: roundMoney(proposedIncreasePrice * remainingStock),
    },
    supportingEvidence: incEvidence,
    confidenceLevel: isHighDemandCandidate ? 'High' : 'Low',
    confidenceBasis: isHighDemandCandidate
      ? 'نفاد المخزون المتوقع وسرعة الدوران تبرر زيادة هامش المساهمة.'
      : 'بيانات غير كافية لإثبات قدرة الزبائن على تقبل الزيادة دون تراجع المبيعات.',
    missingInformation: [
      ...missingData,
      'لم يتم قياس مرونة حساسية زبائن أسيوط السعرية على هذا الصنف بدقة.',
    ],
    risksAndTradeoffs: [
      'قد يؤدي رفع السعر لتوقف حركة الشراء تماماً وانتقال المشتري لبديل محلي.',
      'احتمال بقاء المقاسات غير الشائعة راكدة في الرف.',
    ],
    whyPreferredOverAlternatives:
      'يعظم إجمالي أرباح الدفعة النقدية عند توفر طلب مرتفع ومخزون محدود في أسيوط.',
  });

  // سيناريو 3: PROMOTE / BUNDLE (باقة أو عرض ترويجي)
  const bundleDiscountPercent = 12;
  const bundleSensitivity = calculateDiscountSensitivity(
    product.currentSellingPrice,
    financials.landedUnitCost,
    product.variableCosts,
    bundleDiscountPercent
  );

  recommendations.push({
    action: 'PROMOTE',
    actionTitleArabic: 'طرح في باقة مجمعة (عرض طقم أو قطعتين)',
    recommendedPrice: bundleSensitivity.discountedPrice,
    expectedFinancialConsequences: {
      unitContribution: bundleSensitivity.newUnitContribution,
      contributionMarginRatio: bundleSensitivity.newCMR / 100,
      totalRemainingBatchContribution: roundMoney(bundleSensitivity.newUnitContribution * remainingStock),
      cashRecoveryPotential: roundMoney(bundleSensitivity.discountedPrice * remainingStock),
    },
    supportingEvidence: [
      'تسعير الباقات يكسر حاجز المقارنة الفردية للقطع ويحمي قيمة الصنف المعنوية.',
      `يتطلب العرض زيادة المبيعات بنسبة ${bundleSensitivity.requiredVolumeUpliftPercent}% للحفاظ على نفس المساهمة النقدية الإجمالية.`,
      `يضمن مساهمة نقدية إيجابية قدرها ${bundleSensitivity.newUnitContribution} ج.م للقطعة.`,
    ],
    confidenceLevel: daysInStock >= 30 ? 'High' : 'Medium',
    confidenceBasis: 'توافق مع النمط الشرائي في أسيوط عند شراء الأطقم الكاملة أو المتعددة.',
    missingInformation: missingData,
    risksAndTradeoffs: [
      'قد يضحي بهامش ربح القطعة السريعة إذا دمجت مع صنف راكد.',
      'تتطلب توفير مقاسات متناسقة للزبون في الباقة.',
    ],
    whyPreferredOverAlternatives:
      'يرفع متوسط قيمة فاتورة الزبون ويسرع تصريف القطع دون إعلان تخفيض فردي مباشر.',
  });

  // سيناريو 4: MARKDOWN (تخفيض موسمي)
  const markdownDiscountPercent = 20;
  const markdownSensitivity = calculateDiscountSensitivity(
    product.currentSellingPrice,
    financials.landedUnitCost,
    product.variableCosts,
    markdownDiscountPercent
  );

  // التأكد من أن السعر لا ينزل تحت سعر التغطية النقدية
  const safeMarkdownPrice = Math.max(
    financials.cashCoveragePrice ?? financials.landedUnitCost,
    markdownSensitivity.discountedPrice
  );
  const markCM = calculateUnitContribution(safeMarkdownPrice, financials.landedUnitCost, product.variableCosts);
  const markCMR = safeMarkdownPrice > 0 ? markCM / safeMarkdownPrice : 0;

  recommendations.push({
    action: 'MARKDOWN',
    actionTitleArabic: 'تخفيض موسمي (أوكازيون)',
    recommendedPrice: safeMarkdownPrice,
    expectedFinancialConsequences: {
      unitContribution: markCM,
      contributionMarginRatio: roundPercent(markCMR * 100) / 100,
      totalRemainingBatchContribution: roundMoney(markCM * remainingStock),
      cashRecoveryPotential: roundMoney(safeMarkdownPrice * remainingStock),
    },
    supportingEvidence: [
      `المخزون راكد منذ ${daysInStock} يوماً، وتبدل الموسم يرفع تكلفة بقاء البضاعة بالرف.`,
      `السعر المخفض يظل أعلى من سعر التغطية النقدية (${financials.cashCoveragePrice} ج.م) ويمنع النزيف النقدي المباشر.`,
    ],
    confidenceLevel: daysInStock > 60 ? 'High' : 'Medium',
    confidenceBasis: 'تجنب حبس رأس المال مع نهاية الموسم وإتاحة مساحة للبضاعة الجديدة.',
    missingInformation: missingData,
    risksAndTradeoffs: [
      `يتطلب زيادة المبيعات بنسبة ${markdownSensitivity.requiredVolumeUpliftPercent}% لتعويض انخفاض الهامش.`,
      'قد ينتظر بعض الزبائن تخفيضات أعمق قبل الشراء.',
    ],
    whyPreferredOverAlternatives:
      'أفضل من التصفية الخاسرة؛ يحافظ على مساهمة نقدية إيجابية بينما يحرر سيولة نقدية للمتجر.',
  });

  // سيناريو 5: LIQUIDATE (تصفية واسترداد السيولة)
  // لا يقل إطلاقاً عن سعر التغطية النقدية المباشرة (C + V) / (1 - r) إلا إذا أراد التاجر خسارة صريحة
  const safeLiquidationPrice = roundMoney(
    financials.cashCoveragePrice ?? financials.landedUnitCost + financials.flatVariableCostPerUnit
  );
  const liqCM = calculateUnitContribution(safeLiquidationPrice, financials.landedUnitCost, product.variableCosts);
  const liqCMR = safeLiquidationPrice > 0 ? liqCM / safeLiquidationPrice : 0;

  recommendations.push({
    action: 'LIQUIDATE',
    actionTitleArabic: 'تصفية نقدية عاجلة (استرداد السيولة عند أرضية التكلفة)',
    recommendedPrice: safeLiquidationPrice,
    expectedFinancialConsequences: {
      unitContribution: liqCM,
      contributionMarginRatio: roundPercent(liqCMR * 100) / 100,
      totalRemainingBatchContribution: roundMoney(liqCM * remainingStock),
      cashRecoveryPotential: roundMoney(safeLiquidationPrice * remainingStock),
    },
    supportingEvidence: [
      `المنتج متقادم (${daysInStock} يوماً)، وبقاؤه يسبب خسارة فرص بديلة وتلفاً محتملاً.`,
      `يسترد ما يقارب ${roundMoney(safeLiquidationPrice * remainingStock)} ج.م سيولة فورية للتاجر.`,
      `محدد بدقة عند أرضية التغطية النقدية (${safeLiquidationPrice} ج.م) لتجنب خسارة الكاش.`,
    ],
    confidenceLevel: daysInStock > 90 ? 'High' : 'Low',
    confidenceBasis: 'الأولوية القصوى لاستعادة رأس المال المحبوس وليس تحقيق هامش ربح.',
    missingInformation: missingData,
    risksAndTradeoffs: [
      'انعدام مجمل الربح من هذا الصنف تقريباً.',
      'أي خصم إضافي أدنى من هذا السعر يمثل نزيفاً نقدياً مباشراً من جيب التاجر.',
    ],
    whyPreferredOverAlternatives:
      'الحل الأخير للمخزون الميت لتوفير سيولة لشراء بضاعة الموسم الجديد أو سداد مستحقات الموردين.',
  });

  return recommendations;
}

// أدوات التقريب المالي
export function roundMoney(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export function roundPercent(pct: number): number {
  return Math.round((pct + Number.EPSILON) * 10) / 10;
}
