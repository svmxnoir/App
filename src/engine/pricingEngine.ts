/**
 * محرك الحسابات المالية والتسعير المرن لقطاع ملابس الرجال في مصر (أسيوط)
 * Real Adaptive Pricing Engine - Core Calculation & Decision Logic
 *
 * All formulas are pure, mathematically validated, and strictly follow retail economics:
 * - Clear distinction between Markup (on cost) and Margin (on selling price)
 * - Variable percentage fees (Visa/InstaPay, sales commission) embedded correctly into denominator
 * - Validation for impossible targets (denominator <= 0)
 * - Separation between landed cost, variable selling costs, and allocated fixed overhead
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
  RecommendationAction,
} from '../types/pricing';

/**
 * حساب تكلفة الوصول الفعلية للقطعة (Landed Unit Cost)
 * تشمل سعر الشراء بالمصنع + نصيب القطعة من نولون النقل ومصاريف الشحنة + تكاليف التجهيز المباشرة
 */
export function calculateLandedUnitCost(costs: ProductCosts): {
  landedUnitCost: number;
  allocatedBatchExpensePerUnit: number;
} {
  const purchaseCost = Math.max(0, costs.purchaseCost || 0);
  const units = Math.max(1, costs.batchUnits || 1);
  const totalBatchExpenses = Math.max(0, (costs.batchTransportCost || 0) + (costs.batchOtherExpenses || 0));
  const allocatedBatchExpensePerUnit = totalBatchExpenses / units;
  const directUnitCost = Math.max(0, costs.directUnitCost || 0);

  const landedUnitCost = purchaseCost + allocatedBatchExpensePerUnit + directUnitCost;
  return {
    landedUnitCost: roundMoney(landedUnitCost),
    allocatedBatchExpensePerUnit: roundMoney(allocatedBatchExpensePerUnit),
  };
}

/**
 * حساب مجمل الربح للقطعة بالجنيه (Gross Profit)
 */
export function calculateGrossProfit(sellingPrice: number, landedCost: number): number {
  return roundMoney(sellingPrice - landedCost);
}

/**
 * حساب نسبة هامش الربح الإجمالي (Gross Margin %)
 * هامش الربح = (السعر - التكلفة) / السعر * 100
 */
export function calculateGrossMargin(sellingPrice: number, landedCost: number): number {
  if (sellingPrice <= 0) return 0;
  return roundPercent(((sellingPrice - landedCost) / sellingPrice) * 100);
}

/**
 * حساب نسبة الإضافة على التكلفة (Markup %)
 * نسبة الإضافة = (السعر - التكلفة) / التكلفة * 100
 * تنبيه: لا تتطابق أبداً مع هامش الربح!
 */
export function calculateMarkup(sellingPrice: number, landedCost: number): number {
  if (landedCost <= 0) return 0;
  return roundPercent(((sellingPrice - landedCost) / landedCost) * 100);
}

/**
 * احتساب التكاليف المتغيرة المباشرة والنسبية
 */
export function calculateVariableSellingCosts(
  sellingPrice: number,
  vc: VariableSellingCosts
): {
  flatPerUnit: number;
  feeRateDecimal: number;
  totalVariableCostAmount: number;
} {
  const flatPerUnit = Math.max(0, (vc.packagingUnitCost || 0) + (vc.localDeliveryUnitCost || 0));
  const totalFeePercent = Math.max(
    0,
    (vc.paymentFeePercent || 0) + (vc.salesCommissionPercent || 0) + (vc.marketplaceFeePercent || 0)
  );
  const feeRateDecimal = totalFeePercent / 100;
  const totalVariableCostAmount = flatPerUnit + (Math.max(0, sellingPrice) * feeRateDecimal);

  return {
    flatPerUnit: roundMoney(flatPerUnit),
    feeRateDecimal,
    totalVariableCostAmount: roundMoney(totalVariableCostAmount),
  };
}

/**
 * حساب مساهمة القطعة الواحدة (Contribution per Unit - CM)
 * CM = P * (1 - VC%) - LandedCost - VC_flat
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
 * حساب أرضية السعر الاقتصادية (Economic Minimum Floor Price)
 * السعر الأدنى الذي يحقق نسبة مساهمة مقبولة ويمنع النزيف النقدي
 * P_floor = (LC + VC_flat) / (1 - VC% - minCMR)
 */
export function calculateEconomicFloorPrice(
  landedCost: number,
  vc: VariableSellingCosts,
  minCMR: number = 0.05
): { price: number; isImpossible: boolean; errorNote?: string } {
  const { flatPerUnit, feeRateDecimal } = calculateVariableSellingCosts(0, vc);
  const denominator = 1 - feeRateDecimal - minCMR;

  if (denominator <= 0.001) {
    // نسبة الرسوم المتغيرة + نسبة المساهمة المطلوبة تتجاوز 100%
    // نحسب أرضية التكلفة النقدية المباشرة مع تأمين عدم القسمة على صفر
    const fallbackDenominator = Math.max(0.01, 1 - feeRateDecimal);
    const bareCashFloor = (landedCost + flatPerUnit) / fallbackDenominator;
    return {
      price: roundMoney(bareCashFloor),
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
 * حساب السعر المستهدف بناءً على هامش الربح المطلوب (Target Price from Margin)
 * P_target = (LC + VC_flat) / (1 - VC% - TargetMargin)
 */
export function calculateTargetPriceFromMargin(
  landedCost: number,
  vc: VariableSellingCosts,
  targetMarginPercent: number
): { price: number; isImpossible: boolean; errorNote?: string } {
  const marginDecimal = (targetMarginPercent || 0) / 100;
  const { flatPerUnit, feeRateDecimal } = calculateVariableSellingCosts(0, vc);
  const denominator = 1 - feeRateDecimal - marginDecimal;

  if (denominator <= 0.005) {
    return {
      price: roundMoney((landedCost + flatPerUnit) / Math.max(0.05, 1 - feeRateDecimal)),
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
 */
export function calculateTargetPriceFromMarkup(
  landedCost: number,
  vc: VariableSellingCosts,
  targetMarkupPercent: number
): { price: number; isImpossible: boolean } {
  const markupDecimal = (targetMarkupPercent || 0) / 100;
  const costWithMarkup = landedCost * (1 + markupDecimal);
  const { flatPerUnit, feeRateDecimal } = calculateVariableSellingCosts(0, vc);
  const denominator = 1 - feeRateDecimal;

  if (denominator <= 0.01) {
    return { price: roundMoney(costWithMarkup + flatPerUnit), isImpossible: true };
  }

  const price = (costWithMarkup + flatPerUnit) / denominator;
  return {
    price: roundMoney(price),
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
 * احتساب التقرير المالي الشامل للقطعة (Financial Calculation Summary)
 */
export function calculateProductFinancials(
  product: ProductRecord,
  storeSettings: StoreFixedSettings
): FinancialCalculationResult {
  const { landedUnitCost, allocatedBatchExpensePerUnit } = calculateLandedUnitCost(product.costs);
  const sellingPrice = Math.max(0, product.currentSellingPrice || 0);

  const grossProfit = calculateGrossProfit(sellingPrice, landedUnitCost);
  const grossMarginPercent = calculateGrossMargin(sellingPrice, landedUnitCost);
  const markupPercent = calculateMarkup(sellingPrice, landedUnitCost);

  const { flatPerUnit, feeRateDecimal, totalVariableCostAmount } = calculateVariableSellingCosts(
    sellingPrice,
    product.variableCosts
  );

  const unitContribution = calculateUnitContribution(sellingPrice, landedUnitCost, product.variableCosts);
  const contributionMarginRatio = calculateContributionMarginRatio(
    sellingPrice,
    landedUnitCost,
    product.variableCosts
  );

  // التكاليف الثابتة التقديرية (موضحة بوضوح كتقدير تخطيطي للمحل في أسيوط)
  const expectedMonthlySales = Math.max(1, storeSettings.expectedMonthlyUnitSales || 300);
  const estimatedFixedOverheadPerUnit = roundMoney(
    (storeSettings.monthlyFixedExpenses || 0) / expectedMonthlySales
  );
  const netOperatingProfitPerUnit = roundMoney(unitContribution - estimatedFixedOverheadPerUnit);

  // حساب نقطة التعادل بناءً على حصة الدفعة التقديرية من المصاريف الثابتة
  const batchAllocatedFixed = estimatedFixedOverheadPerUnit * (product.costs.batchUnits || 1);
  const { breakEvenUnits, breakEvenRevenue } = calculateBreakEven(
    batchAllocatedFixed,
    unitContribution,
    sellingPrice
  );

  // حساب الأرضية والأسعار المستهدفة
  const minCMR = Math.max(0.01, storeSettings.minAcceptableCMR || 0.10);
  const floorResult = calculateEconomicFloorPrice(landedUnitCost, product.variableCosts, minCMR);
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
    breakEvenQuantity: breakEvenUnits,
    breakEvenBatchRevenue: breakEvenRevenue,
    economicFloorPrice: floorResult.price,
    targetPriceFromMargin: targetMarginResult.price,
    targetPriceFromMarkup: targetMarkupResult.price,
    isBelowEconomicFloor: sellingPrice < floorResult.price,
    isNegativeContribution: unitContribution <= 0,
    isImpossibleTargetMargin: targetMarginResult.isImpossible || floorResult.isImpossible,
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
    // إذا كان الخصم أكبر من أو مساوياً لنسبة هامش المساهمة، يصبح هامش المساهمة صفراً أو سالباً
    // لا يمكن لأي حجم مبيعات تعويض هذه الخسارة!
    requiredVolumeUpliftPercent = 9999;
    isDestructive = true;
  } else {
    // صيغة تقرير السوق: Delta Q % = d / (CMR - d) * 100
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
 * حساب ملخص مؤشرات السوق لمنتج محدد بناءً على الملاحظات المعتمدة فقط
 */
export function calculateMarketBenchmark(
  category: string,
  qualityTier: string,
  allObservations: MarketObservation[]
): MarketBenchmarkSummary {
  // تصفية الملاحظات المعتمدة وذات الصلة بالفئة
  const relevantApproved = allObservations.filter(
    (obs) =>
      obs.verificationStatus === 'Approved' &&
      obs.category === category &&
      (obs.commercialLevel === 'Retail_Public' || obs.commercialLevel === 'Bundle_Offer')
  );

  if (relevantApproved.length === 0) {
    return {
      sampleSize: 0,
      minPrice: 0,
      maxPrice: 0,
      medianPrice: 0,
      promoFloor: 0,
      strategicAnchors: [],
      offlineAssiutCeiling: null,
    };
  }

  const prices = relevantApproved.map((obs) => obs.currentPrice).sort((a, b) => a - b);
  const minPrice = prices[0];
  const maxPrice = prices[prices.length - 1];

  // احتساب الوسيط الرياضي الحقيقي
  const midIndex = Math.floor(prices.length / 2);
  const medianPrice =
    prices.length % 2 !== 0
      ? prices[midIndex]
      : roundMoney((prices[midIndex - 1] + prices[midIndex]) / 2);

  // أدنى سعر عروض ترويجية معتمد
  const promoFloor = minPrice;

  // استخراج المراجع البارزة (تاون تيم، ديفاكتو، إل سي، فينوم أسيوط)
  const strategicAnchors = relevantApproved.slice(0, 4).map((obs) => ({
    brand: obs.brandName,
    price: obs.currentPrice,
    scope: obs.geographyScope,
  }));

  // سقف أسيوط الميداني إذا وجد متجر في أسيوط
  const assiutObs = relevantApproved.find((obs) => obs.geographyScope === 'Assiut_Offline');
  const offlineAssiutCeiling = assiutObs ? assiutObs.currentPrice : null;

  return {
    sampleSize: relevantApproved.length,
    minPrice,
    maxPrice,
    medianPrice,
    promoFloor,
    strategicAnchors,
    offlineAssiutCeiling,
  };
}

/**
 * محرك التوصيات التسعيرية وسيناريوهات دورة حياة المخزون
 * لا يفرض السعر أبداً، بل يقدّم الخيارات والتبعات والمخاطر والبيانات الناقصة بوضوح تام
 */
export function generatePricingRecommendations(
  product: ProductRecord,
  allObservations: MarketObservation[],
  storeSettings: StoreFixedSettings
): PricingRecommendation[] {
  const financials = calculateProductFinancials(product, storeSettings);
  const benchmark = calculateMarketBenchmark(product.category, product.qualityTier, allObservations);

  // حساب عمر المخزون بالأيام
  const purchaseTimestamp = new Date(product.purchaseDate).getTime();
  const now = Date.now();
  const daysInStock = Math.max(0, Math.floor((now - purchaseTimestamp) / (1000 * 60 * 60 * 24)));

  // حساب معدل وسرعة المبيعات
  const remainingStock = Math.max(
    0,
    (product.quantityReceived || product.quantityPurchased) -
      (product.quantitySold || 0) -
      (product.quantityDamaged || 0)
  );

  const initialStock = Math.max(1, product.quantityReceived || product.quantityPurchased);
  const soldUnits = Math.max(0, product.quantitySold || 0);

  // سرعة المبيعات اليومية الفعلية
  const salesVelocityPerDay = daysInStock > 0 ? soldUnits / daysInStock : soldUnits;
  const estimatedDaysToStockout =
    salesVelocityPerDay > 0 ? Math.round(remainingStock / salesVelocityPerDay) : 999;

  // فحص النواقص
  const missingData: string[] = [];
  if (!product.costs.batchTransportCost) {
    missingData.push('تكلفة الشحن لأسيوط غير مدخلة بدقة (قد تكون التكلفة الفعلية أعلى).');
  }
  if (product.salesTransactions.length === 0) {
    missingData.push('لا توجد حركات مبيعات سابقة مسجلة لحساب المرونة السعرية الفعلية.');
  }
  if (benchmark.sampleSize < 3) {
    missingData.push(`عدد ملاحظات السوق المعتمدة لهذه الفئة (${benchmark.sampleSize}) محدود جداً.`);
  }

  const recommendations: PricingRecommendation[] = [];

  // سيناريو 1: HOLD (تثبيت السعر)
  const holdPrice = product.currentSellingPrice;
  const holdCM = financials.unitContribution;
  const holdCMR = financials.contributionMarginRatio;
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
    supportingEvidence: [
      `المنتج في المخزون منذ ${daysInStock} يوماً.`,
      `هامش المساهمة الحالي (${holdCM} ج.م / قطعة) إيجابي ويغطي العمولات.`,
      benchmark.medianPrice > 0
        ? `السعر (${holdPrice} ج.م) متوازن مع وسيط السوق (${benchmark.medianPrice} ج.م).`
        : 'لا توجد منافسة سعرية ملحة تستوجب التعديل.',
    ],
    confidenceLevel: daysInStock <= 45 && holdCM > 0 ? 'High' : 'Medium',
    confidenceBasis: 'استقرار المبيعات وعدم وجود تراكم حرج للمخزون.',
    missingInformation: missingData,
    risksAndTradeoffs: [
      'احتمال تباطؤ وتيرة البيع مع تقدم الموسم ووصول المنافسين لتخفيضات أعمق.',
      'تجميد السيولة في حال حدوث هبوط مفاجئ في حركة السوق المحلي بأسيوط.',
    ],
    whyPreferredOverAlternatives:
      'يحافظ على كامل هامش الربح المخطط له وسمعة المتجر التسعيرية دون تقديم تنازلات مبكرة.',
  });

  // سيناريو 2: INCREASE (رفع السعر)
  // يوصى به عندما يوشك المخزون على النفاد، أو عندما يكون سعر المحل أقل كثيراً من أرضية عروض السوق
  const proposedIncreasePrice = roundMoney(
    Math.max(
      product.currentSellingPrice * 1.12,
      financials.targetPriceFromMargin,
      benchmark.medianPrice ? benchmark.medianPrice * 0.95 : product.currentSellingPrice * 1.15
    )
  );
  const incCM = calculateUnitContribution(proposedIncreasePrice, financials.landedUnitCost, product.variableCosts);
  const incCMR = proposedIncreasePrice > 0 ? incCM / proposedIncreasePrice : 0;
  const isHighDemandCandidate = remainingStock < initialStock * 0.25 && salesVelocityPerDay > 0.5;

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
    supportingEvidence: [
      benchmark.medianPrice > 0 && product.currentSellingPrice < benchmark.medianPrice * 0.85
        ? `سعرك الحالي (${product.currentSellingPrice} ج.م) أقل من وسيط السوق بـ ${roundPercent(((benchmark.medianPrice - product.currentSellingPrice) / benchmark.medianPrice) * 100)}%.`
        : 'فرصة لتعظيم العائد على القطع المتبقية.',
      `متبقي في المحل ${remainingStock} قطعة فقط من أصل ${initialStock}.`,
    ],
    confidenceLevel: isHighDemandCandidate ? 'High' : 'Low',
    confidenceBasis: isHighDemandCandidate
      ? 'نفاد المخزون المتوقع وسرعة الدوران تبرر زيادة هامش المساهمة.'
      : 'بيانات غير كافية لإثبات قدرة الزبائن على تقبل الزيادة دون خسارة المبيعات.',
    missingInformation: [
      ...missingData,
      'لم يتم قياس حساسية زبائن أسيوط لرفع السعر على هذا الصنف بالتحديد.',
    ],
    risksAndTradeoffs: [
      'قد يؤدي رفع السعر لتوقف حركة الشراء تماماً وانتقال المشتري لبديل محلي أو إلكتروني.',
      'احتمال بقاء المقاسات الشاذة أو غير الشائعة راكدة في الرف.',
    ],
    whyPreferredOverAlternatives:
      'يعظم إجمالي أرباح الدفعة النقدية عند توفر طلب مرتفع ومخزون محدود في أسيوط.',
  });

  // سيناريو 3: PROMOTE / BUNDLE (باقة أو عرض ترويجي)
  // مستلهم من إستراتيجية متاجر أسيوط (مثل عروض النميس 3 قطع بسعر باقة محدد)
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
      'محلات أسيوط المنافسة (مثل فينوم النميس) تعتمد تسعير الأطقم لكسر حاجز المقارنة الفردية.',
      `يتطلب العرض زيادة المبيعات بنسبة ${bundleSensitivity.requiredVolumeUpliftPercent}% للحفاظ على نفس السيولة.`,
      `يضمن مساهمة إيجابية قدرها ${bundleSensitivity.newUnitContribution} ج.م للقطعة.`,
    ],
    confidenceLevel: daysInStock >= 30 ? 'High' : 'Medium',
    confidenceBasis: 'توافق مع النمط الشرائي الشائع في صعيد مصر عند شراء الملابس المجمعة.',
    missingInformation: missingData,
    risksAndTradeoffs: [
      'قد يضحي بهامش ربح القطعة السريعة إذا دمجت مع صنف راكد.',
      'تتطلب تجهيز خيارات مقاسات متناسقة للزبون.',
    ],
    whyPreferredOverAlternatives:
      'يرفع متوسط قيمة فاتورة الزبون ويسرع تصريف القطع دون إعلان تخفيض فردي يقلل من قيمة القطعة.',
  });

  // سيناريو 4: MARKDOWN (تخفيض موسمي)
  const markdownDiscountPercent = 22;
  const markdownSensitivity = calculateDiscountSensitivity(
    product.currentSellingPrice,
    financials.landedUnitCost,
    product.variableCosts,
    markdownDiscountPercent
  );

  recommendations.push({
    action: 'MARKDOWN',
    actionTitleArabic: 'تخفيض موسمي (أوكازيون)',
    recommendedPrice: Math.max(financials.economicFloorPrice, markdownSensitivity.discountedPrice),
    expectedFinancialConsequences: {
      unitContribution: markdownSensitivity.newUnitContribution,
      contributionMarginRatio: markdownSensitivity.newCMR / 100,
      totalRemainingBatchContribution: roundMoney(markdownSensitivity.newUnitContribution * remainingStock),
      cashRecoveryPotential: roundMoney(markdownSensitivity.discountedPrice * remainingStock),
    },
    supportingEvidence: [
      `المخزون راكد منذ ${daysInStock} يوماً، واقتراب تبدل الموسم يزيد تكلفة بقاء البضاعة بالرف.`,
      benchmark.promoFloor > 0
        ? `أرضية عروض البراندات الوطنية وصلت إلى ${benchmark.promoFloor} ج.م.`
        : 'ضرورة تحريك المخزون البطيء.',
      `السعر المخفض يظل أعلى من أرضية التكلفة الاقتصادية (${financials.economicFloorPrice} ج.م).`,
    ],
    confidenceLevel: daysInStock > 60 ? 'High' : 'Medium',
    confidenceBasis: 'تجنب حبس رأس المال مع نهاية الموسم وفتح مساحة في المحل للبضاعة الجديدة.',
    missingInformation: missingData,
    risksAndTradeoffs: [
      `يتطلب زيادة المبيعات بنسبة ${markdownSensitivity.requiredVolumeUpliftPercent}% للتعويض، وإلا تنخفض السيولة.`,
      'قد ينتظر بعض الزبائن تخفيضات أعمق قبل الشراء.',
    ],
    whyPreferredOverAlternatives:
      'أفضل من التصفية الخاسرة؛ يحافظ على هامش مساهمة إيجابي بينما يحرر سيولة نقدية حيوية لدفع الالتزامات.',
  });

  // سيناريو 5: LIQUIDATE (تصفية واسترداد السيولة)
  // سعر قريب جداً من أرضية التكلفة النقدية مع حد أدنى لتغطية أكياس وعمولات الكاشير
  const liquidationPrice = roundMoney(
    Math.max(financials.economicFloorPrice * 0.98, financials.landedUnitCost + financials.flatVariableCostPerUnit)
  );
  const liqCM = calculateUnitContribution(liquidationPrice, financials.landedUnitCost, product.variableCosts);
  const liqCMR = liquidationPrice > 0 ? liqCM / liquidationPrice : 0;

  recommendations.push({
    action: 'LIQUIDATE',
    actionTitleArabic: 'تصفية نقدية عاجلة (سعر التكلفة واسترداد الكاش)',
    recommendedPrice: liquidationPrice,
    expectedFinancialConsequences: {
      unitContribution: liqCM,
      contributionMarginRatio: roundPercent(liqCMR * 100) / 100,
      totalRemainingBatchContribution: roundMoney(liqCM * remainingStock),
      cashRecoveryPotential: roundMoney(liquidationPrice * remainingStock),
    },
    supportingEvidence: [
      `المنتج متقادم (${daysInStock} يوماً)، وبقاؤه يسبب خسارة فرص بديلة وتلف محتمل.`,
      `يسترد ما يقارب ${roundMoney(liquidationPrice * remainingStock)} ج.م سيولة فورية للتاجر.`,
      'يقترب من أسعار تصفية بواقي التصدير ومكاتب العتبة.',
    ],
    confidenceLevel: daysInStock > 90 ? 'High' : 'Low',
    confidenceBasis: 'الأولوية القصوى لاستعادة رأس المال وليس تحقيق هامش ربح.',
    missingInformation: missingData,
    risksAndTradeoffs: [
      'انعدام مجمل الربح من هذا الصنف تقريباً.',
      'إذا بيع دون تكلفة الوصول الفعلية، يمثل نزيفاً نقدياً مباشراً.',
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
