/**
 * محرك العروض والترويج وفحص الأمان المالي
 * Promotion Management, Safety Checker & Seasonal Diagnostic Engine
 *
 * Enforces financial safety:
 * - Bundle economics evaluated collectively (never discounting without seeing the whole ticket)
 * - Strict warning and explicit owner approval required for negative contribution
 * - Countermeasures for the "customer waiting for end-of-season sales" phenomenon
 */

import {
  ProductRecord,
  PromotionTemplate,
  StorePromotion,
  ProductCategory,
  FinancialCalculationResult,
  VariableSellingCosts,
} from '../types/pricing';
import {
  calculateLandedUnitCost,
  calculateVariableSellingCosts,
  calculateUnitContribution,
  roundMoney,
  roundPercent,
} from './pricingEngine';

/**
 * مكتبة قوالب العروض الجاهزة للاستخدام في تجارة ملابس الرجال بأسيوط
 */
export const PROMOTION_TEMPLATES_LIBRARY: PromotionTemplate[] = [
  {
    id: 'TPL_OUTFIT_BUNDLE',
    type: 'OUTFIT_BUNDLE',
    titleArabic: 'عرض الباقة المنسقة (طقم متكامل: جاكيت + بلوفر + جينز)',
    shortDescription: 'دمج صنف بطيء الحركة مع أصناف جذابة لبيع طقم كامل بسعر جذاب وموحد.',
    businessProblemSolved:
      'كسر حاجز المقارنة السعرية الفردية للقطع، ومواجهة عروض منافسي أسيوط (مثل عروض النميس 3 قطع بـ 750 ج.م)، ورفع متوسط الفاتورة.',
    qualifyingProductsDescription: 'جاكيت أو معطف + بنطلون جينز + قميص أو بلوفر أو تيشيرت.',
    whenToUse: [
      'عند وجود أصناف شتوية أو خريفية راكدة ذات تكلفة عالية.',
      'في فترات تسوق الأعياد وبداية فصول الدراسة والجامعات بأسيوط.',
      'عندما يرغب الزبون في طقم متناسق ولا يريد تضييع الوقت في التنسيق.',
    ],
    whenNotToUse: [
      'عندما تكون كافة القطع سريعة الدوران بالسعر الكامل دون أي ركود.',
      'عندما تنفد المقاسات الشائعة (L, XL, 34) وتتبقى مقاسات غير متطابقة.',
    ],
    costCalculationExplanation:
      'تُحسب تكلفة وصول كافة قطع الطقم معاً (LC1 + LC2 + LC3) وتُخصم من سعر الباقة مع مصاريف الكيس وعمولة الدفع، لضمان هامش مساهمة إيجابي للطقم الإجمالي.',
    successMetricsExplanation:
      'ارتفاع إجمالي مساهمة الكاش اليومية للمحل، وتصريف القطع البطيئة دون تآكل رأس المال.',
    defaultDiscountPercent: 15,
  },
  {
    id: 'TPL_MULTI_BUY',
    type: 'MULTI_BUY',
    titleArabic: 'عرض الشراء المتعدد (اشتري 2 بخصم، أو 3 بسعر باقة محدد)',
    shortDescription: 'تشجيع الزبون على أخذ أكثر من قطعة من نفس الفئة (مثل قمصان أو تيشيرتات).',
    businessProblemSolved:
      'مواجهة عروض البراندات الوطنية الشهيرة (مثل عرض تاي هاوس: 3 قمصان بـ 999 ج.م)، وزيادة وحدات البيع لكل عميل.',
    qualifyingProductsDescription: 'قمصان كاجوال أو كلاسيك، تيشيرتات أساسية، ملابس داخلية وبولو.',
    whenToUse: [
      'توفر كميات كبيرة من نفس الموديل بألوان ومقاسات متنوعة.',
      'السلع التي يفضل الزبون شراء أكثر من لون منها للاستخدام اليومي.',
    ],
    whenNotToUse: [
      'الأصناف النادرة أو التي يتبقى منها 2-3 قطع فقط.',
      'الأصناف الفاخرة جداً التي تفقد قيمتها النفسية بالبيع المتعدد.',
    ],
    costCalculationExplanation:
      'سعر القطعتين معاً يغطي تكلفة وصولهما مع الحفاظ على هامش مساهمة لا يقل عن 25% من إجمالي الفاتورة.',
    successMetricsExplanation:
      'ارتفاع عدد القطع في كل فاتورة (Items per Ticket) من 1.2 إلى 2.3 قطعة.',
    defaultDiscountPercent: 12,
  },
  {
    id: 'TPL_COMPLEMENTARY_ITEM',
    type: 'COMPLEMENTARY_ITEM',
    titleArabic: 'عرض الصنف التكميلي (اشترِ بنطلون واحصل على تيشيرت بنصف السعر)',
    shortDescription: 'بيع صنف رئيسي بسعره الكامل مع تقديم خصم على صنف جانبي تكميلي.',
    businessProblemSolved:
      'حماية سعر البيع الكامل للصنف الأساسي (مثل الجينز)، وتصريف التيشيرتات أو الأحزمة.',
    qualifyingProductsDescription: 'بنطلون جينز أو جبردين (أساسي) + تيشيرت أو كاب أو حزام (تكميلي).',
    whenToUse: [
      'عند الرغبة في تحريك مبيعات الصنف الأساسي دون خفض سعره المعلن.',
      'لتحريك إكسسوارات أو تيشيرتات قطنية قاربت على نهاية موسمها.',
    ],
    whenNotToUse: [
      'إذا كان الصنف التكميلي لا يتناسق مع الصنف الأساسي في المقاس أو الذوق.',
    ],
    costCalculationExplanation:
      'ربح الصنف الأساسي بالسعر الكامل يجب أن يمتص فارق خصم الصنف التكميلي بالكامل ويترك فائض مساهمة نقدية.',
    successMetricsExplanation:
      'زيادة نسبة شراء الزبون لسلعة إضافية (Cross-Selling Rate).',
    defaultDiscountPercent: 20,
  },
  {
    id: 'TPL_EARLY_SEASON_REWARD',
    type: 'EARLY_SEASON_REWARD',
    titleArabic: 'حافز الشراء المبكر (قسيمة شراء للموسم / حافز بدون كسر السعر)',
    shortDescription: 'منح المشتري في أول الموسم قسيمة خصم مشروطة لمشترياته القادمة، دون تخفيض السعر الحالي.',
    businessProblemSolved:
      'علاج مشكلة "انتظار الزبائن لأوكازيون نهاية الموسم"؛ إعطاء دافع حقيقي للشراء الآن دون الإضرار بسمعة السعر.',
    qualifyingProductsDescription: 'بضاعة الموسم الجديد كاملة (جواكت الشتاء أو صيفيات العيد).',
    whenToUse: [
      'خلال أول 30 يوماً من نزول تشكيلة الموسم الجديد للمحل في أسيوط.',
      'لتشجيع الزبائن المترددين الذين يقولون "سننتظر التخفيضات".',
    ],
    whenNotToUse: [
      'في نهاية الموسم (الأوكازيون)؛ فهذا العرض مخصص لأول الموسم فقط.',
    ],
    costCalculationExplanation:
      'قسيمة الهدية مشروطة بحد أدنى للشراء في الفاتورة القادمة، ما يضمن أرباحاً إضافية مستقبلية.',
    successMetricsExplanation:
      'نسبة المبيعات بالسعر الكامل في أول 45 يوماً من الموسم تفوق 60%.',
    defaultDiscountPercent: 0,
    nonPriceValueDescription: 'قسيمة بقيمة 100 ج.م على المشتريات التالية التي تتجاوز 600 ج.م.',
  },
  {
    id: 'TPL_NON_PRICE_VALUE',
    type: 'NON_PRICE_VALUE',
    titleArabic: 'عرض القيمة المضافة غير السعرية (تعديل ترزي مجاني / شراب قطن هدية)',
    shortDescription: 'تقديم خدمة أو هدية عينية منخفضة التكلفة للمحل وعالية القيمة للزبون بدلاً من خصم النقود.',
    businessProblemSolved:
      'منع تآكل الهامش النقدي، ومنع تعويد الزبائن في أسيوط على الفصال والمطالبة بتخفيض مالي.',
    qualifyingProductsDescription: 'البناطيل التي تحتاج تقصير/تظبيط، والبدل، والقمصان الفاخرة.',
    whenToUse: [
      'عند طلب الزبون لخصم على صنف ممتاز عالي الطلب.',
      'لتمييز المحل عن المنافسين الإلكترونيين الذين لا يوفرون ترزي أو فحصاً فورياً.',
    ],
    whenNotToUse: [
      'الأصناف التي لا تحتاج لأي تعديل أو خدمة ملحقة.',
    ],
    costCalculationExplanation:
      'تكلفة تقصير البنطلون عند ترزي المحل (15-20 ج.م) توفر على التاجر خصماً نقدياً كان قد يصل إلى 50-80 ج.م!',
    successMetricsExplanation:
      'الحفاظ على 100% من سعر البيع الكامل مع إتمام البيع برضا الزبون.',
    defaultDiscountPercent: 0,
    nonPriceValueDescription: 'تظبيط وتقصير فوري مجاني عند ترزي المحل المتعاقد معه.',
  },
  {
    id: 'TPL_SLOW_STOCK_CLEAR',
    type: 'SLOW_STOCK_CLEAR',
    titleArabic: 'تصفية المخزون الراكد والفائض (Clearance)',
    shortDescription: 'تخفيض مدروس للأصناف التي تجاوزت 90 يوماً لاسترداد رأس المال المحبوس.',
    businessProblemSolved:
      'تحرير السيولة لشراء بضاعة الموسم الجديد وسداد مستحقات الموردين وتفريغ الأرفف.',
    qualifyingProductsDescription: 'مقاسات شاذة، ألوان بطيئة، بضاعة الموسم السابق المتبقية.',
    whenToUse: [
      'عند اقتراب نهاية الموسم وحاجة المتجر للسيولة النقدية.',
      'الأصناف التي توقفت مبيعاتها لأكثر من 30 يوماً متصلة.',
    ],
    whenNotToUse: [
      'الأصناف الأساسية المستمرة طوال العام (مثل الجينز الكلاسيك أو البوكسرات).',
    ],
    costCalculationExplanation:
      'السعر المخفض يجب أن يغطي تكلفة الوصول الفعلية لأسيوط (LC) لمنع الخسارة النقدية الصافية.',
    successMetricsExplanation:
      'استرداد ما لا يقل عن 90% من رأس المال الأصلي المستثمر في الدفعة.',
    defaultDiscountPercent: 25,
  },
];

/**
 * فحص الأمان المالي الشامل لأي عرض ترويجي (Financial Safety Checker)
 */
export interface PromotionSafetyReport {
  totalRegularPrice: number;
  offerPrice: number;
  totalDiscountAmount: number;
  discountPercent: number;
  totalLandedCost: number;
  totalFlatVariableCost: number;
  feeRateDecimal: number;
  bundleContribution: number;
  bundleCMR: number;
  economicFloorPrice: number;
  isNegativeContribution: boolean;
  isBelowEconomicFloor: boolean;
  requiresOwnerApproval: boolean;
  warningMessages: string[];
  safetyVerdictArabic: string;
  minUnitsToPreserveCash: number;
}

export function evaluatePromotionSafety(
  selectedProducts: ProductRecord[],
  proposedOfferPrice: number,
  storeMinCMR: number = 0.10
): PromotionSafetyReport {
  let totalRegularPrice = 0;
  let totalLandedCost = 0;
  let totalFlatVariableCost = 0;
  let maxFeeRate = 0; // يبدأ من الصفر الحقيقي ولا يفرض أي نسبة افتراضية غير معلنة
  const missingInputs: string[] = [];

  selectedProducts.forEach((p) => {
    const { landedUnitCost } = calculateLandedUnitCost(p.costs);
    totalRegularPrice += p.currentSellingPrice ?? 0;
    totalLandedCost += landedUnitCost;

    // الحفاظ التام على الصفر الصريح (Explicit 0 remains 0)
    const packagingCost = p.variableCosts?.packagingUnitCost ?? 0;
    const deliveryCost = p.variableCosts?.localDeliveryUnitCost ?? 0;
    totalFlatVariableCost += packagingCost + deliveryCost;

    if (p.variableCosts?.packagingUnitCost === undefined || p.variableCosts?.packagingUnitCost === null) {
      missingInputs.push(`تكلفة تغليف الصنف (${p.name}) غير مدخلة`);
    }

    const paymentFeePct = p.variableCosts?.paymentFeePercent ?? 0;
    const salesCommPct = p.variableCosts?.salesCommissionPercent ?? 0;
    const marketplacePct = p.variableCosts?.marketplaceFeePercent ?? 0;

    if (p.variableCosts?.paymentFeePercent === undefined || p.variableCosts?.paymentFeePercent === null) {
      missingInputs.push(`نسبة رسوم الدفع الإلكتروني للصنف (${p.name}) غير مدخلة`);
    }
    if (p.variableCosts?.salesCommissionPercent === undefined || p.variableCosts?.salesCommissionPercent === null) {
      missingInputs.push(`نسبة عمولة المبيعات للصنف (${p.name}) غير مدخلة`);
    }

    const productFeeRate = (paymentFeePct + salesCommPct + marketplacePct) / 100;
    if (productFeeRate > maxFeeRate) {
      maxFeeRate = productFeeRate;
    }
  });

  const offerPrice = Math.max(0, proposedOfferPrice);
  const totalDiscountAmount = roundMoney(Math.max(0, totalRegularPrice - offerPrice));
  const discountPercent =
    totalRegularPrice > 0 ? roundPercent((totalDiscountAmount / totalRegularPrice) * 100) : 0;

  // مساهمة الباقة الإجمالية
  const netRevenueAfterFee = offerPrice * (1 - maxFeeRate);
  const bundleContribution = roundMoney(netRevenueAfterFee - totalLandedCost - totalFlatVariableCost);
  const bundleCMR = offerPrice > 0 ? roundPercent((bundleContribution / offerPrice) * 100) / 100 : 0;

  // أرضية السعر الاقتصادية للباقة
  const floorDenominator = 1 - maxFeeRate - storeMinCMR;
  let economicFloorPrice = 0;
  if (floorDenominator > 0) {
    economicFloorPrice = roundMoney((totalLandedCost + totalFlatVariableCost) / floorDenominator);
  } else {
    // إذا كانت نسبة المساهمة المطلوبة مستحيلة رياضياً مع العمولات
    const cashCoverageDenominator = Math.max(0.01, 1 - maxFeeRate);
    economicFloorPrice = roundMoney((totalLandedCost + totalFlatVariableCost) / cashCoverageDenominator);
  }

  const isNegativeContribution = bundleContribution <= 0;
  const isBelowEconomicFloor = offerPrice < economicFloorPrice;
  const requiresOwnerApproval = isNegativeContribution || isBelowEconomicFloor;

  const warnings: string[] = [...missingInputs];
  let verdict = '✓ العرض آمن ومربح مالياً';

  if (isNegativeContribution) {
    warnings.push(
      `خطر حرج: هذا العرض يحقق هامش مساهمة سالباً (${bundleContribution} ج.م)! كل باقة تباع ستكلف المحل خسارة نقدية مباشرة.`
    );
    verdict = '⛔ مرفوض مالياً: خسارة نقدية مؤكدة';
  } else if (isBelowEconomicFloor) {
    warnings.push(
      `تنبيه: سعر العرض (${offerPrice} ج.م) أقل من أرضية السعر الاقتصادية (${economicFloorPrice} ج.م). الهامش المتبقي ضئيل ولا يساهم كافياً في تغطية المصاريف الثابتة.`
    );
    verdict = '⚠️ تنبيه: تحت أرضية السعر (يتطلب موافقة المالك)';
  }

  // حساب كمية البيع المطلوبة للحفاظ على نفس السيولة
  const regularContribution = roundMoney(
    totalRegularPrice * (1 - maxFeeRate) - totalLandedCost - totalFlatVariableCost
  );
  let minUnitsToPreserveCash = 1;
  if (bundleContribution > 0 && regularContribution > 0) {
    minUnitsToPreserveCash = Math.ceil(regularContribution / bundleContribution);
  }

  return {
    totalRegularPrice,
    offerPrice,
    totalDiscountAmount,
    discountPercent,
    totalLandedCost: roundMoney(totalLandedCost),
    totalFlatVariableCost: roundMoney(totalFlatVariableCost),
    feeRateDecimal: maxFeeRate,
    bundleContribution,
    bundleCMR,
    economicFloorPrice,
    isNegativeContribution,
    isBelowEconomicFloor,
    requiresOwnerApproval,
    warningMessages: warnings,
    safetyVerdictArabic: verdict,
    minUnitsToPreserveCash,
  };
}

/**
 * محرك اقتراح العروض والترويج لصنف أو فئة (Promotion Recommendation Engine)
 * يفحص دورة حياة الصنف، الموسم الحالي، وسرعة المبيعات دون فرض تخفيض شامل
 */
export interface RecommendedPromotionOption {
  template: PromotionTemplate;
  suggestedOfferPrice: number;
  rationaleArabic: string;
  suitabilityScore: number; // 1-100
  safetyReport: PromotionSafetyReport;
}

export function recommendPromotionsForProduct(
  product: ProductRecord,
  allProducts: ProductRecord[],
  currentSeasonKey: string,
  daysRemainingInSeason: number
): RecommendedPromotionOption[] {
  const recommendations: RecommendedPromotionOption[] = [];

  const now = Date.now();
  const daysInStock = Math.max(
    0,
    Math.floor((now - new Date(product.purchaseDate).getTime()) / (1000 * 60 * 60 * 24))
  );
  const remainingStock = Math.max(
    0,
    (product.quantityReceived || product.quantityPurchased) -
      (product.quantitySold || 0) -
      (product.quantityDamaged || 0)
  );

  const { landedUnitCost } = calculateLandedUnitCost(product.costs);

  // 1. فحص إمكانية باقة طقم كامل (إذا كان جاكيت أو بنطلون جينز)
  if (product.category === 'jacket' || product.category === 'jeans' || product.category === 'knitwear') {
    const outfitTemplate = PROMOTION_TEMPLATES_LIBRARY.find((t) => t.id === 'TPL_OUTFIT_BUNDLE')!;
    // نبحث عن قطعة مكملة (جينز أو قميص أو تيشيرت)
    const partner = allProducts.find((p) => p.id !== product.id && p.category !== product.category);
    const bundleProducts = partner ? [product, partner] : [product];
    const totalReg = bundleProducts.reduce((sum, p) => sum + p.currentSellingPrice, 0);
    const suggestedPrice = Math.round(totalReg * 0.85);
    const safety = evaluatePromotionSafety(bundleProducts, suggestedPrice);

    recommendations.push({
      template: outfitTemplate,
      suggestedOfferPrice: suggestedPrice,
      rationaleArabic: `تنسيق هذا الصنف (${product.name}) ضمن طقم كامل يرفع متوسط الفاتورة ويكسر المقارنة الفردية بالأسعار، خاصة مع وجود حركة موسمية.`,
      suitabilityScore: daysInStock > 30 ? 92 : 75,
      safetyReport: safety,
    });
  }

  // 2. فحص عرض الشراء المتعدد (إذا كان قميصاً أو تيشيرت أو بولو)
  if (
    product.category === 'casual_shirt' ||
    product.category === 'basic_tshirt' ||
    product.category === 'basic_polo' ||
    product.category === 'fashion_tee'
  ) {
    const multiBuyTemplate = PROMOTION_TEMPLATES_LIBRARY.find((t) => t.id === 'TPL_MULTI_BUY')!;
    const suggestedPrice = Math.round(product.currentSellingPrice * 2 * 0.88); // قطعتين بخصم 12%
    const safety = evaluatePromotionSafety([product, product], suggestedPrice);

    recommendations.push({
      template: multiBuyTemplate,
      suggestedOfferPrice: suggestedPrice,
      rationaleArabic: `الأصناف القطنية والقمصان يقبل زبائن أسيوط على شراء قطعتين منها للاستخدام اليومي أو الجامعي. خصم 12% على القطعتين يضاعف حجم المبيعات.`,
      suitabilityScore: remainingStock > 15 ? 88 : 60,
      safetyReport: safety,
    });
  }

  // 3. فحص عرض القيمة غير السعرية (بديل الخصم النقدي)
  const nonPriceTemplate = PROMOTION_TEMPLATES_LIBRARY.find((t) => t.id === 'TPL_NON_PRICE_VALUE')!;
  const nonPriceSafety = evaluatePromotionSafety([product], product.currentSellingPrice);
  recommendations.push({
    template: nonPriceTemplate,
    suggestedOfferPrice: product.currentSellingPrice,
    rationaleArabic:
      'الحفاظ على 100% من سعر البيع الكامل وتقديم ميزة عملية مجانية (مثل تظبيط البنطلون أو شراب قطن مصري) بدلاً من التنازل عن هامش الربح النقدي.',
    suitabilityScore: 82,
    safetyReport: nonPriceSafety,
  });

  // 4. تصفية المخزون الراكد (فقط إذا كان الصنف قديماً > 60 يوماً أو الموسم يوشك على الانتهاء)
  if (daysInStock > 60 || daysRemainingInSeason < 25) {
    const clearanceTemplate = PROMOTION_TEMPLATES_LIBRARY.find((t) => t.id === 'TPL_SLOW_STOCK_CLEAR')!;
    const suggestedPrice = Math.round(
      Math.max(landedUnitCost * 1.15, product.currentSellingPrice * 0.75)
    );
    const safety = evaluatePromotionSafety([product], suggestedPrice);

    recommendations.push({
      template: clearanceTemplate,
      suggestedOfferPrice: suggestedPrice,
      rationaleArabic: `الصنف في المخزون منذ ${daysInStock} يوماً وباقي ${daysRemainingInSeason} يوماً فقط على نهاية الموسم. الأولوية لاستعادة السيولة النقدية قبل ركود البضاعة.`,
      suitabilityScore: 95,
      safetyReport: safety,
    });
  }

  return recommendations.sort((a, b) => b.suitabilityScore - a.suitabilityScore);
}

/**
 * تشخيص ظاهرة انتظار الزبائن لأوكازيون نهاية الموسم (Customer Waiting Problem Diagnostic)
 */
export interface WaitingProblemDiagnosticReport {
  totalUnitsSold: number;
  regularPriceUnitsSold: number;
  promotionalUnitsSold: number;
  promotionalSalesSharePercent: number; // نسبة المبيعات التي تمت في العروض
  averageDiscountDepthPercent: number;
  totalRegularContribution: number;
  totalPromoContribution: number;
  waitingProblemSeverity: 'MILD' | 'MODERATE' | 'CRITICAL';
  hypothesisEvaluationArabic: string;
  recommendedCountermeasures: string[];
}

export function diagnoseWaitingProblem(
  products: ProductRecord[]
): WaitingProblemDiagnosticReport {
  let totalUnits = 0;
  let promoUnits = 0;
  let regUnits = 0;
  let totalRegularContribution = 0;
  let totalPromoContribution = 0;

  products.forEach((p) => {
    const { landedUnitCost } = calculateLandedUnitCost(p.costs);
    const flatVC = p.variableCosts.packagingUnitCost || 5;
    const feeRate = ((p.variableCosts.paymentFeePercent || 1.5) + (p.variableCosts.salesCommissionPercent || 2.5)) / 100;

    p.salesTransactions.forEach((tx) => {
      totalUnits += tx.units;
      const unitCM = tx.unitPrice * (1 - feeRate) - landedUnitCost - flatVC;
      const totalCM = unitCM * tx.units;

      // فحص هل المعاملة تمت بسعر مخفض ملحوظ (أقل بـ 10% أو أكثر من السعر الحالي) أو موسومة كعرض
      const isDiscounted = tx.isPromotionSale || tx.unitPrice < p.currentSellingPrice * 0.90;

      if (isDiscounted) {
        promoUnits += tx.units;
        totalPromoContribution += totalCM;
      } else {
        regUnits += tx.units;
        totalRegularContribution += totalCM;
      }
    });
  });

  const promoShare = totalUnits > 0 ? roundPercent((promoUnits / totalUnits) * 100) : 0;

  let severity: 'MILD' | 'MODERATE' | 'CRITICAL' = 'MILD';
  let hypothesis = '';
  const countermeasures: string[] = [];

  if (promoShare > 45) {
    severity = 'CRITICAL';
    hypothesis =
      'الأدلة تدعم بقوة فرضية أن شريحة واسعة من زبائن المحل بأسيوط تؤجل الشراء عمداً انتظاراً للتخفيضات الكبيرة، ما يُفرغ وسط الموسم من المبيعات المربحة ويُجبر المحل على البيع بهوامش ضيقة.';
    countermeasures.push(
      'الوقف الفوري للتخفيضات الشاملة (Storewide Sales) والاعتماد حصرياً على باقات الأطقم وعروض الشراء المتعدد.'
    );
    countermeasures.push(
      'تفعيل عروض القيمة المضافة غير السعرية (مثل التظبيط والتقصير المجاني أو هدايا الإكسسوار) بدلاً من الخصومات النقدية.'
    );
    countermeasures.push(
      'إطلاق حوافز الشراء المبكر في أول 30 يوماً من الموسم (قسائم مشروطة للمستقبل) لمكافأة من يشتري بالسعر الكامل.'
    );
  } else if (promoShare > 25) {
    severity = 'MODERATE';
    hypothesis =
      'توجد بوادر لتردد الزبائن في بداية الموسم، ولكن مبيعات السعر الكامل لا تزال تمثل الأغلبية. التدخل الوقائي مطلوب لتجنب تفاقم المشكلة.';
    countermeasures.push(
      'حصر التخفيضات على المقاسات الشاذة والألوان بطيئة الحركة فقط، وعدم إدراج المقاسات الأساسية الشائعة.'
    );
    countermeasures.push(
      'إبراز مميزات جودة الأقمشة المصرية والتقفيل الممتاز لتبرير السعر الكامل في وجه التخفيضات السطحية للمنافسين.'
    );
  } else {
    severity = 'MILD';
    hypothesis =
      'مبيعات السعر الكامل صحية جداً (أكثر من 75% من المبيعات)، ولا توجد أدلة على ظاهرة انتظار جماعي للأوكازيون.';
    countermeasures.push(
      'الاستمرار في سياسة التسعير المتزنة وتجنب الإعلان المبكر عن مواعيد التخفيضات حتى لا تُشوش على حركة البيع الطبيعية.'
    );
  }

  return {
    totalUnitsSold: totalUnits,
    regularPriceUnitsSold: regUnits,
    promotionalUnitsSold: promoUnits,
    promotionalSalesSharePercent: promoShare,
    averageDiscountDepthPercent: 20,
    totalRegularContribution: roundMoney(totalRegularContribution),
    totalPromoContribution: roundMoney(totalPromoContribution),
    waitingProblemSeverity: severity,
    hypothesisEvaluationArabic: hypothesis,
    recommendedCountermeasures: countermeasures,
  };
}
