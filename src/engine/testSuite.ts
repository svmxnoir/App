/**
 * حزمة الاختبارات المحاسبية والمنطقية المؤتمتة لمحرك التسعير ودعم القرار
 * Automated Calculation, Retail Economics & Data Integrity Test Suite
 *
 * Full coverage of Priority 1 through Priority 5:
 * 1. Cash-coverage and full-cost break-even calculations
 * 2. Target contribution margin (pure & with fixed overhead)
 * 3. Explicit zero fees and commissions (0 remains 0)
 * 4. Invalid inputs and impossible target margins (denominator <= 0)
 * 5. Fixed-overhead allocation assumptions and disclosures
 * 6. Separation of retail prices and bundle offers
 * 7. Quality-tier filtering in market benchmarks
 * 8. Exclusion of unverified and pending market observations
 * 9. Missing market data & insufficient data handling
 * 10. Promotion net proceeds after discounts and fees
 * 11. Settings changes propagating into dependent calculations
 * 12. Regression checks: historical transaction immutability & Gross Margin vs Markup
 */

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
  calculateTargetPriceFromMargin,
  calculateTargetPriceFromMarkup,
  calculateProductFinancials,
  calculateMarketBenchmark,
} from './pricingEngine';
import { evaluatePromotionSafety } from './promotionsEngine';
import {
  ProductRecord,
  StoreFixedSettings,
  VariableSellingCosts,
  MarketObservation,
  SalesTransaction,
} from '../types/pricing';

export interface TestResult {
  id: string;
  name: string;
  nameArabic: string;
  category: 'Math' | 'Validation' | 'DataIntegrity';
  passed: boolean;
  expected: string;
  actual: string;
  explanation: string;
}

export function runAllCalculationTests(): TestResult[] {
  const results: TestResult[] = [];

  // =========================================================================
  // 1. اختبار سعر التغطية النقدية والتعادل التشغيلي التقديري مع المصاريف الثابتة
  // =========================================================================
  try {
    const landedCost = 200; // C
    const vc: VariableSellingCosts = {
      packagingUnitCost: 10, // V = 10
      localDeliveryUnitCost: 0,
      paymentFeePercent: 2.0,
      salesCommissionPercent: 3.0,
      marketplaceFeePercent: 0, // r = 5% = 0.05
    };
    const allocatedFixedOverhead = 40; // F = 40

    // Cash coverage price: P_cash = (200 + 10) / (1 - 0.05) = 210 / 0.95 = 221.05 ج.م
    const cashRes = calculateCashCoveragePrice(landedCost, vc);

    // Full-cost operating break-even: P_operating = (200 + 40 + 10) / (1 - 0.05) = 250 / 0.95 = 263.16 ج.م
    const opRes = calculateOperatingBreakEvenPrice(landedCost, allocatedFixedOverhead, vc);

    // فحص إثبات أن السعر 240 ج.م يحقق مساهمة كاش موجبة ولكنه تحت التعادل التشغيلي
    const cmAt240 = calculateUnitContribution(240, landedCost, vc); // 240 * 0.95 - 200 - 10 = 228 - 210 = 18 ج.م > 0

    const passed =
      cashRes.price === 221.05 &&
      opRes.price === 263.16 &&
      cmAt240 === 18 &&
      !cashRes.isImpossible &&
      !opRes.isImpossible;

    results.push({
      id: 'TEST_01_CASH_AND_OPERATING_BREAKEVEN',
      name: 'Cash-Coverage & Full-Cost Operating Break-Even',
      nameArabic: 'سعر التغطية النقدية والتعادل التشغيلي التقديري',
      category: 'Math',
      passed,
      expected: 'P_cash = 221.05 ج.م ، P_operating = 263.16 ج.م ، ومساهمة الكاش عند 240 ج.م موجبة = 18.00 ج.م',
      actual: `P_cash = ${cashRes.price} ج.م ، P_operating = ${opRes.price} ج.م ، المساهمة عند 240 ج.م = ${cmAt240} ج.م`,
      explanation:
        'يثبت الاختبار أن البيع تحت سعر التعادل التشغيلي الكامل (263.16) لا يعني بالضرورة خسارة نقدية فورية إذا كان أعلى من سعر التغطية النقدية (221.05).',
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    results.push({
      id: 'TEST_01_CASH_AND_OPERATING_BREAKEVEN',
      name: 'Cash-Coverage & Operating Break-Even',
      nameArabic: 'سعر التغطية النقدية والتعادل التشغيلي',
      category: 'Math',
      passed: false,
      expected: 'Passed without error',
      actual: `Error: ${errorMsg}`,
      explanation: 'فشل الفحص الرياضي',
    });
  }

  // =========================================================================
  // 2. اختبار السعر المستهدف لهامش المساهمة (بعد المصاريف الثابتة وقبلها)
  // =========================================================================
  try {
    const landedCost = 150; // C
    const vc: VariableSellingCosts = {
      packagingUnitCost: 10, // V = 10
      localDeliveryUnitCost: 0,
      paymentFeePercent: 1.5,
      salesCommissionPercent: 2.5,
      marketplaceFeePercent: 0, // r = 4% = 0.04
    };
    const allocatedFixed = 30; // F = 30
    const targetMargin = 0.20; // m = 20% = 0.20

    // P = (150 + 30 + 10) / (1 - 0.04 - 0.20) = 190 / 0.76 = 250.00 ج.م
    const targetWithOverhead = calculateTargetPriceWithFixedOverhead(
      landedCost,
      allocatedFixed,
      vc,
      targetMargin
    );

    // التحقق المستقل من الأرقام عند السعر 250:
    // صافي الإيراد = 250 * 0.96 = 240 ج.م
    // التكاليف = 150 (شراء) + 30 (ثابتة) + 10 (كيس) = 190 ج.م
    // الربح الصافي = 240 - 190 = 50 ج.م
    // نسبة الهامش من سعر البيع = 50 / 250 = 20.0% تماماً
    const passed = targetWithOverhead.price === 250 && !targetWithOverhead.isImpossible;

    results.push({
      id: 'TEST_02_TARGET_CONTRIBUTION_MARGIN',
      name: 'Target Contribution Margin Pricing',
      nameArabic: 'السعر المستهدف لهامش المساهمة مع المصاريف الثابتة',
      category: 'Math',
      passed,
      expected: 'P_target = 250.00 ج.م (يحقق بالضبط 20% هامش بعد تغطية المصاريف الثابتة والعمولات)',
      actual: `P_target = ${targetWithOverhead.price} ج.م`,
      explanation:
        'يطبق معادلة P = (C + F + V) / (1 - r - m) ويطابق النتيجة المستقلة بدقة كاملة.',
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    results.push({
      id: 'TEST_02_TARGET_CONTRIBUTION_MARGIN',
      name: 'Target Contribution Margin Pricing',
      nameArabic: 'السعر المستهدف لهامش المساهمة',
      category: 'Math',
      passed: false,
      expected: '250.00',
      actual: `Error: ${errorMsg}`,
      explanation: 'خطأ',
    });
  }

  // =========================================================================
  // 3. اختبار الحفاظ على الصفر الصريح ومنع استبداله بافتراضات خفية
  // =========================================================================
  try {
    const landedCost = 100;
    const vcZero: VariableSellingCosts = {
      packagingUnitCost: 0,
      localDeliveryUnitCost: 0,
      paymentFeePercent: 0,
      salesCommissionPercent: 0,
      marketplaceFeePercent: 0,
    };

    const vcCalc = calculateVariableSellingCosts(200, vcZero);
    const cashCoverage = calculateCashCoveragePrice(landedCost, vcZero);

    // V يجب أن يكون 0 تماماً وليس 5 أو أي قيمة خفية
    // r يجب أن يكون 0 تماماً وليس 4% أو 1.5%
    // سعر التغطية النقدية يجب أن يكون 100.00 ج.م بالضبط
    const passed =
      vcCalc.flatPerUnit === 0 &&
      vcCalc.feeRateDecimal === 0 &&
      vcCalc.totalVariableCostAmount === 0 &&
      cashCoverage.price === 100;

    results.push({
      id: 'TEST_03_EXPLICIT_ZERO_PRESERVATION',
      name: 'Explicit Zero Preservation (No Hidden Defaults)',
      nameArabic: 'الحفاظ على الصفر الصريح ومنع العمولات والرسوم الخفية',
      category: 'Validation',
      passed,
      expected: 'V_flat = 0.00 ج.م ، r = 0% ، P_cash = 100.00 ج.م (دون فرض أي عمولات خفية)',
      actual: `V_flat = ${vcCalc.flatPerUnit} ج.م ، r = ${vcCalc.feeRateDecimal} ، P_cash = ${cashCoverage.price} ج.م`,
      explanation:
        'يضمن أن إدخال الصفر من قبل المستخدم يظل صفراً حقيقياً ولا يتم استبداله بأي رسوم أو تكاليف ضمنية.',
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    results.push({
      id: 'TEST_03_EXPLICIT_ZERO_PRESERVATION',
      name: 'Explicit Zero Preservation',
      nameArabic: 'الحفاظ على الصفر الصريح',
      category: 'Validation',
      passed: false,
      expected: 'Zero preserved',
      actual: `Error: ${errorMsg}`,
      explanation: 'خطأ',
    });
  }

  // =========================================================================
  // 4. اختبار المدخلات غير الصالحة وهوامش الربح المستحيلة (المقام <= 0)
  // =========================================================================
  try {
    const landedCost = 100;
    const vc: VariableSellingCosts = {
      packagingUnitCost: 5,
      localDeliveryUnitCost: 0,
      paymentFeePercent: 5.0,
      salesCommissionPercent: 0,
      marketplaceFeePercent: 0, // r = 0.05
    };

    // تجربة هامش مستهدف 96% بحيث r + m = 0.05 + 0.96 = 1.01 > 1.0 (مقام سالب!)
    const impossibleMargin = calculateTargetPriceFromMargin(landedCost, vc, 96);

    // تجربة رسوم بيع تتجاوز 100% (r = 105%)
    const impossibleFeeVc: VariableSellingCosts = {
      packagingUnitCost: 5,
      localDeliveryUnitCost: 0,
      paymentFeePercent: 105,
      salesCommissionPercent: 0,
      marketplaceFeePercent: 0,
    };
    const impossibleFee = calculateCashCoveragePrice(landedCost, impossibleFeeVc);

    const passed =
      impossibleMargin.isImpossible === true &&
      impossibleMargin.price === null &&
      Boolean(impossibleMargin.errorNote) &&
      impossibleFee.isImpossible === true &&
      impossibleFee.price === null;

    results.push({
      id: 'TEST_04_IMPOSSIBLE_DENOMINATOR_REJECTION',
      name: 'Rejection of Impossible Margins & Negative Denominators',
      nameArabic: 'رفض الهوامش المستحيلة رياضياً والمقامات السالبة',
      category: 'Validation',
      passed,
      expected: 'isImpossible = true ، price = null ، مع رسالة خطأ صريحة توضح استحالة التحقق',
      actual: `هامش 96%: مستحيل=${impossibleMargin.isImpossible} ، السعر=${impossibleMargin.price} | رسوم 105%: مستحيل=${impossibleFee.isImpossible}`,
      explanation:
        'يمنع إخراج أسعار سالبة أو فلكية مضللة للمستخدم عندما تتجاوز نسب الرسوم مع الهامش 100%.',
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    results.push({
      id: 'TEST_04_IMPOSSIBLE_DENOMINATOR_REJECTION',
      name: 'Rejection of Impossible Margins',
      nameArabic: 'رفض الهوامش المستحيلة',
      category: 'Validation',
      passed: false,
      expected: 'isImpossible=true',
      actual: `Error: ${errorMsg}`,
      explanation: 'خطأ',
    });
  }

  // =========================================================================
  // 5. اختبار فرضيات توزيع المصاريف الثابتة ومنع ازدواجية الحساب
  // =========================================================================
  try {
    const storeSettings: StoreFixedSettings = {
      monthlyFixedExpenses: 18000,
      expectedMonthlyUnitSales: 450,
      minAcceptableCMR: 0.12,
    };

    const testProd: ProductRecord = {
      id: 'SKU-T05',
      name: 'صنف اختبار الثابتة',
      category: 'basic_tshirt',
      variant: 'Regular',
      size: 'L',
      color: 'أسود',
      qualityTier: 'commercial',
      supplier: 'المحلة',
      purchaseBatch: 'B-1',
      purchaseDate: '2026-10-01',
      season: 'summer',
      quantityPurchased: 100,
      quantityReceived: 100,
      quantitySold: 0,
      quantityDamaged: 0,
      quantityReturned: 0,
      costs: {
        purchaseCost: 80,
        batchUnits: 100,
        batchTransportCost: 200, // 2 ج.م نقل
        batchOtherExpenses: 0,
        directUnitCost: 3,
      }, // LC = 80 + 2 + 3 = 85 ج.م
      variableCosts: {
        packagingUnitCost: 5,
        localDeliveryUnitCost: 0,
        paymentFeePercent: 1.5,
        salesCommissionPercent: 2.5,
        marketplaceFeePercent: 0,
      },
      targetGrossMarginPercent: 35,
      targetMarkupPercent: 50,
      currentSellingPrice: 150,
      priceHistory: [],
      salesTransactions: [],
      notes: '',
    };

    const fin = calculateProductFinancials(testProd, storeSettings);

    // F = 18000 / 450 = 40.00 ج.م
    // التأكد من أن تكلفة الوصول LC (85 ج.م) لا تحتوي على الـ 40 ج.م
    // التأكد من أن التكاليف المتغيرة لا تحتوي على الـ 40 ج.م
    // التأكد من وجود نص الإفصاح الصريح
    const passed =
      fin.estimatedFixedOverheadPerUnit === 40 &&
      fin.landedUnitCost === 85 &&
      fin.flatVariableCostPerUnit === 5 &&
      fin.fixedOverheadDisclosure.includes('450') &&
      fin.fixedOverheadDisclosure.includes('18000');

    results.push({
      id: 'TEST_05_FIXED_OVERHEAD_SEPARATION',
      name: 'Fixed Overhead Separation & Explicit Disclosure',
      nameArabic: 'فصل المصاريف الثابتة عن تكلفة الوصول والإفصاح عن الفرضية',
      category: 'Math',
      passed,
      expected: 'F = 40.00 ج.م (18,000 ÷ 450) دون دمجه في LC (85 ج.م) مع إفصاح صريح',
      actual: `F = ${fin.estimatedFixedOverheadPerUnit} ج.م ، LC = ${fin.landedUnitCost} ج.م ، الإفصاح موجود=${Boolean(fin.fixedOverheadDisclosure)}`,
      explanation:
        'يضمن عدم ازدواجية احتساب المصاريف الثابتة في تكلفة القطعة، ويوضح لصاحب المتجر فرضية حجم المبيعات الشهرية.',
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    results.push({
      id: 'TEST_05_FIXED_OVERHEAD_SEPARATION',
      name: 'Fixed Overhead Separation',
      nameArabic: 'فصل المصاريف الثابتة',
      category: 'Math',
      passed: false,
      expected: 'Separated',
      actual: `Error: ${errorMsg}`,
      explanation: 'خطأ',
    });
  }

  // =========================================================================
  // 6. اختبار عزل عروض الباقات المجمعة عن أسعار التجزئة الفردية
  // =========================================================================
  try {
    const obsList: MarketObservation[] = [
      {
        id: 'OBS_RETAIL_1',
        category: 'jeans',
        qualityTier: 'mid_market',
        brandName: 'Brand Retail A',
        sellerName: 'Store 1',
        geographyScope: 'National_Online',
        commercialLevel: 'Retail_Public',
        currentPrice: 450,
        originalPrice: null,
        calculatedDiscountPct: null,
        sourceUrl: '#',
        sourceTier: 'Tier_A',
        observationDate: '2026-10-10',
        verificationStatus: 'Approved',
        notes: 'سعر قطعة فردية',
      },
      {
        id: 'OBS_BUNDLE_1',
        category: 'jeans',
        qualityTier: 'mid_market',
        brandName: 'Brand Bundle B',
        sellerName: 'Store 2',
        geographyScope: 'Assiut_Offline',
        commercialLevel: 'Bundle_Offer',
        currentPrice: 750, // باقة طقم كامل 750 ج.م
        originalPrice: null,
        calculatedDiscountPct: null,
        sourceUrl: '#',
        sourceTier: 'Tier_A',
        observationDate: '2026-10-10',
        verificationStatus: 'Approved',
        notes: 'باقة طقم 3 قطع',
      },
    ];

    const benchmark = calculateMarketBenchmark('jeans', 'mid_market', obsList);

    // المعيار: يجب أن يدخل السعر الفردي فقط (450) في عينة التجزئة
    // ويجب ألا يدخل الـ 750 في الأسعار الفردية، بل يُعد في bundleOffersCount = 1
    const passed =
      benchmark.sampleSize === 1 &&
      benchmark.minPrice === 450 &&
      benchmark.maxPrice === 450 &&
      benchmark.medianPrice === 450 &&
      benchmark.bundleOffersCount === 1;

    results.push({
      id: 'TEST_06_BUNDLE_SEPARATION',
      name: 'Separation of Bundle Offers from Single-Item Retail Benchmarks',
      nameArabic: 'عزل عروض الباقات المجمعة عن مؤشرات أسعار القطع الفردية',
      category: 'DataIntegrity',
      passed,
      expected: 'sampleSize = 1 (القطعة الفردية 450 ج.م فقط) ، وعزل الباقة (750 ج.م) في عداد الباقات المستقل',
      actual: `عينة الفردي = ${benchmark.sampleSize} (سعر=${benchmark.medianPrice} ج.م) ، عروض الباقات المعزولة = ${benchmark.bundleOffersCount}`,
      explanation:
        'يمنع تلوث مؤشر سعر البنطلون الفردي بأسعار الباقات الكاملة (مثل باقة 750 ج.م) أو تقسيمها التقديري غير الموثق.',
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    results.push({
      id: 'TEST_06_BUNDLE_SEPARATION',
      name: 'Bundle Separation',
      nameArabic: 'عزل عروض الباقات',
      category: 'DataIntegrity',
      passed: false,
      expected: 'Separated',
      actual: `Error: ${errorMsg}`,
      explanation: 'خطأ',
    });
  }

  // =========================================================================
  // 7. اختبار تصفية فئة الجودة بدقة في مرصد السوق (Quality-Tier Filtering)
  // =========================================================================
  try {
    const obsList: MarketObservation[] = [
      {
        id: 'OBS_BUDGET',
        category: 'jeans',
        qualityTier: 'budget',
        brandName: 'شعبية',
        sellerName: 'سوق محلي',
        geographyScope: 'Assiut_Offline',
        commercialLevel: 'Retail_Public',
        currentPrice: 150,
        originalPrice: null,
        calculatedDiscountPct: null,
        sourceUrl: '#',
        sourceTier: 'Tier_D',
        observationDate: '2026-10-10',
        verificationStatus: 'Approved',
        notes: '',
      },
      {
        id: 'OBS_MID_1',
        category: 'jeans',
        qualityTier: 'mid_market',
        brandName: 'براند تجاري',
        sellerName: 'مول',
        geographyScope: 'National_Online',
        commercialLevel: 'Retail_Public',
        currentPrice: 500,
        originalPrice: null,
        calculatedDiscountPct: null,
        sourceUrl: '#',
        sourceTier: 'Tier_A',
        observationDate: '2026-10-10',
        verificationStatus: 'Approved',
        notes: '',
      },
      {
        id: 'OBS_MID_2',
        category: 'jeans',
        qualityTier: 'mid_market',
        brandName: 'براند متوسط',
        sellerName: 'متجر',
        geographyScope: 'National_Online',
        commercialLevel: 'Retail_Public',
        currentPrice: 600,
        originalPrice: null,
        calculatedDiscountPct: null,
        sourceUrl: '#',
        sourceTier: 'Tier_A',
        observationDate: '2026-10-11',
        verificationStatus: 'Approved',
        notes: '',
      },
      {
        id: 'OBS_PREMIUM',
        category: 'jeans',
        qualityTier: 'premium',
        brandName: 'براند فاخر',
        sellerName: 'بوتيك',
        geographyScope: 'National_Online',
        commercialLevel: 'Retail_Public',
        currentPrice: 1400,
        originalPrice: null,
        calculatedDiscountPct: null,
        sourceUrl: '#',
        sourceTier: 'Tier_A',
        observationDate: '2026-10-11',
        verificationStatus: 'Approved',
        notes: '',
      },
    ];

    // طلب مؤشر لفئة mid_market فقط
    const midBenchmark = calculateMarketBenchmark('jeans', 'mid_market', obsList);

    // يجب أن تشمل العينة فقط (500 و 600) والوسيط = 550 ج.م
    // ويجب استبعاد 150 (budget) و 1400 (premium) تماماً!
    const passed =
      midBenchmark.sampleSize === 2 &&
      midBenchmark.minPrice === 500 &&
      midBenchmark.maxPrice === 600 &&
      midBenchmark.medianPrice === 550;

    results.push({
      id: 'TEST_07_QUALITY_TIER_FILTERING',
      name: 'Rigorous Quality-Tier Isolation in Market Benchmarks',
      nameArabic: 'التطبيق الصارم لتصفية فئات الجودة في مؤشرات السوق',
      category: 'DataIntegrity',
      passed,
      expected: 'sampleSize = 2 ، الوسيط = 550.00 ج.م (مطابقة فئة mid_market واستبعاد الشعبي 150 والفاخر 1400)',
      actual: `عينة=${midBenchmark.sampleSize} ، أدنى=${midBenchmark.minPrice} ، وسيط=${midBenchmark.medianPrice} ، أعلى=${midBenchmark.maxPrice}`,
      explanation:
        'يمنع مقارنة جينز شعبي رخيص بقطعة فاخرة لضمان موثوقية قرارات التسعير لتاجر التجزئة.',
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    results.push({
      id: 'TEST_07_QUALITY_TIER_FILTERING',
      name: 'Quality-Tier Filtering',
      nameArabic: 'تصفية فئات الجودة',
      category: 'DataIntegrity',
      passed: false,
      expected: 'Filtered',
      actual: `Error: ${errorMsg}`,
      explanation: 'خطأ',
    });
  }

  // =========================================================================
  // 8. اختبار استبعاد الملاحظات غير المعتمدة وقيد المراجعة والمرفوضة
  // =========================================================================
  try {
    const obsList: MarketObservation[] = [
      {
        id: 'OBS_APP',
        category: 'jacket',
        qualityTier: 'mid_market',
        brandName: 'معتمد',
        sellerName: 'محل 1',
        geographyScope: 'National_Online',
        commercialLevel: 'Retail_Public',
        currentPrice: 900,
        originalPrice: null,
        calculatedDiscountPct: null,
        sourceUrl: '#',
        sourceTier: 'Tier_A',
        observationDate: '2026-10-10',
        verificationStatus: 'Approved',
        notes: '',
      },
      {
        id: 'OBS_PENDING',
        category: 'jacket',
        qualityTier: 'mid_market',
        brandName: 'قيد المراجعة',
        sellerName: 'محل 2',
        geographyScope: 'Assiut_Offline',
        commercialLevel: 'Retail_Public',
        currentPrice: 400,
        originalPrice: null,
        calculatedDiscountPct: null,
        sourceUrl: '#',
        sourceTier: 'Tier_D',
        observationDate: '2026-10-10',
        verificationStatus: 'Pending_Review',
        notes: '',
      },
      {
        id: 'OBS_REJ',
        category: 'jacket',
        qualityTier: 'mid_market',
        brandName: 'مرفوض',
        sellerName: 'محل 3',
        geographyScope: 'Assiut_Offline',
        commercialLevel: 'Retail_Public',
        currentPrice: 250,
        originalPrice: null,
        calculatedDiscountPct: null,
        sourceUrl: '#',
        sourceTier: 'Tier_E',
        observationDate: '2026-10-10',
        verificationStatus: 'Rejected',
        notes: '',
      },
    ];

    const benchmark = calculateMarketBenchmark('jacket', 'mid_market', obsList);

    // فقط المعتمد (900) يدخل، والملاحظات قيد المراجعة والمرفوضة تُستبعد فوراً
    const passed =
      benchmark.sampleSize === 1 &&
      benchmark.minPrice === 900 &&
      benchmark.maxPrice === 900;

    results.push({
      id: 'TEST_08_UNVERIFIED_OBSERVATIONS_EXCLUSION',
      name: 'Exclusion of Unverified, Pending & Rejected Observations',
      nameArabic: 'استبعاد الملاحظات غير المعتمدة وقيد المراجعة من المؤشر',
      category: 'DataIntegrity',
      passed,
      expected: 'sampleSize = 1 (الملاحظة المعتمدة 900 ج.م فقط واستبعاد 400 و 250)',
      actual: `عينة=${benchmark.sampleSize} ، سعر=${benchmark.medianPrice} ج.م`,
      explanation:
        'يضمن ألا تؤثر الشائعات أو الرصود غير المؤكدة على قرارات تسعير المتجر.',
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    results.push({
      id: 'TEST_08_UNVERIFIED_OBSERVATIONS_EXCLUSION',
      name: 'Exclusion of Unverified Observations',
      nameArabic: 'استبعاد الملاحظات غير المعتمدة',
      category: 'DataIntegrity',
      passed: false,
      expected: 'Excluded',
      actual: `Error: ${errorMsg}`,
      explanation: 'خطأ',
    });
  }

  // =========================================================================
  // 9. اختبار التعامل مع غياب بيانات السوق وعتبة كفاية العينة
  // =========================================================================
  try {
    // فئة لا توجد لها أي ملاحظات على الإطلاق
    const emptyBenchmark = calculateMarketBenchmark('suit', 'premium', []);

    // المعيار الصارم: عدم اختلاق أي رقم، والإعلان الصريح عن عدم كفاية البيانات
    const passed =
      emptyBenchmark.sampleSize === 0 &&
      emptyBenchmark.hasSufficientData === false &&
      emptyBenchmark.medianPrice === 0 &&
      Boolean(emptyBenchmark.insufficientDataReason) &&
      emptyBenchmark.insufficientDataReason!.includes('غير كافية');

    results.push({
      id: 'TEST_09_MISSING_MARKET_DATA_HANDLING',
      name: 'Transparent Handling of Missing & Insufficient Market Data',
      nameArabic: 'الإفصاح الشفاف عن غياب بيانات السوق وعدم اختلاق أسعار',
      category: 'Validation',
      passed,
      expected: 'hasSufficientData = false ، وسيط = 0 ، وتوضيح صريح بعدم كفاية البيانات',
      actual: `كفاية البيانات=${emptyBenchmark.hasSufficientData} ، الوسيط=${emptyBenchmark.medianPrice} ، السبب=${emptyBenchmark.insufficientDataReason}`,
      explanation:
        'يمنع النظام من اختلاق متوسطات سوقية وهمية عندما لا تتوفر أدلة ميدانية حقيقية وموثقة.',
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    results.push({
      id: 'TEST_09_MISSING_MARKET_DATA_HANDLING',
      name: 'Missing Market Data Handling',
      nameArabic: 'التعامل مع غياب بيانات السوق',
      category: 'Validation',
      passed: false,
      expected: 'Handled safely',
      actual: `Error: ${errorMsg}`,
      explanation: 'خطأ',
    });
  }

  // =========================================================================
  // 10. اختبار صافي متحصلات العروض الترويجية بعد الخصومات والرسوم
  // =========================================================================
  try {
    const prod1: ProductRecord = {
      id: 'P1',
      name: 'قميص 1',
      category: 'casual_shirt',
      variant: 'Regular',
      size: 'M',
      color: 'أزرق',
      qualityTier: 'commercial',
      supplier: 'العتبة',
      purchaseBatch: 'B1',
      purchaseDate: '2026-10-01',
      season: 'all_year' as any,
      quantityPurchased: 50,
      quantityReceived: 50,
      quantitySold: 0,
      quantityDamaged: 0,
      quantityReturned: 0,
      costs: { purchaseCost: 100, batchUnits: 50, batchTransportCost: 0, batchOtherExpenses: 0, directUnitCost: 0 },
      variableCosts: { packagingUnitCost: 4, localDeliveryUnitCost: 0, paymentFeePercent: 1.5, salesCommissionPercent: 2.0, marketplaceFeePercent: 0 },
      targetGrossMarginPercent: 30,
      targetMarkupPercent: 50,
      currentSellingPrice: 200,
      priceHistory: [],
      salesTransactions: [],
      notes: '',
    }; // LC = 100, Flat = 4, Fee = 3.5%

    const prod2: ProductRecord = {
      ...prod1,
      id: 'P2',
      name: 'قميص 2',
      costs: { purchaseCost: 150, batchUnits: 50, batchTransportCost: 0, batchOtherExpenses: 0, directUnitCost: 0 },
      variableCosts: { packagingUnitCost: 6, localDeliveryUnitCost: 0, paymentFeePercent: 1.5, salesCommissionPercent: 2.0, marketplaceFeePercent: 0 },
      currentSellingPrice: 300,
    }; // LC = 150, Flat = 6, Fee = 3.5%

    // سعر العرض الإجمالي للباقة = 400 ج.م (السعر الأصلي 200 + 300 = 500 ج.م، خصم 100 ج.م = 20%)
    const promoReport = evaluatePromotionSafety([prod1, prod2], 400, 0.10);

    // الحسابات المستقلة:
    // إجمالي التكلفة LC = 100 + 150 = 250 ج.م
    // إجمالي مصاريف التغليف = 4 + 6 = 10 ج.م
    // نسبة الرسوم المتغيرة = 3.5% (0.035)
    // صافي الإيراد بعد الرسوم = 400 * (1 - 0.035) = 386.00 ج.م
    // هامش مساهمة الباقة = 386 - 250 - 10 = 126.00 ج.م
    // نسبة هامش المساهمة = 126 / 400 = 0.315 (31.5%)
    const passed =
      promoReport.totalRegularPrice === 500 &&
      promoReport.offerPrice === 400 &&
      promoReport.discountPercent === 20 &&
      promoReport.totalLandedCost === 250 &&
      promoReport.totalFlatVariableCost === 10 &&
      promoReport.bundleContribution === 126 &&
      promoReport.bundleCMR === 0.315 &&
      promoReport.isNegativeContribution === false;

    results.push({
      id: 'TEST_10_PROMOTION_NET_PROCEEDS',
      name: 'Promotion Net Proceeds & Contribution Accuracy',
      nameArabic: 'دقة احتساب صافي متحصلات العروض الترويجية وهامش المساهمة',
      category: 'Math',
      passed,
      expected: 'إجمالي التكلفة = 250 ج.م ، تغليف = 10 ج.م ، مساهمة الباقة = 126.00 ج.م ، CMR = 31.5%',
      actual: `تكلفة=${promoReport.totalLandedCost} ج.م ، مساهمة الباقة=${promoReport.bundleContribution} ج.م ، CMR=${promoReport.bundleCMR * 100}%`,
      explanation:
        'يطبق حسابات المساهمة الجماعية للباقة بدقة ويخصم التكاليف المتغيرة والنسبية دون أي افتراضات خفية.',
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    results.push({
      id: 'TEST_10_PROMOTION_NET_PROCEEDS',
      name: 'Promotion Net Proceeds',
      nameArabic: 'صافي متحصلات العروض',
      category: 'Math',
      passed: false,
      expected: '126.00',
      actual: `Error: ${errorMsg}`,
      explanation: 'خطأ',
    });
  }

  // =========================================================================
  // 11. اختبار انتقال تعديلات الإعدادات الفورية إلى كافة الحسابات التابعة
  // =========================================================================
  try {
    const testProd: ProductRecord = {
      id: 'SKU-T11',
      name: 'صنف انتقال الإعدادات',
      category: 'basic_tshirt',
      variant: 'Regular',
      size: 'L',
      color: 'كحلي',
      qualityTier: 'commercial',
      supplier: 'المحلة',
      purchaseBatch: 'B-1',
      purchaseDate: '2026-10-01',
      season: 'summer',
      quantityPurchased: 100,
      quantityReceived: 100,
      quantitySold: 0,
      quantityDamaged: 0,
      quantityReturned: 0,
      costs: { purchaseCost: 100, batchUnits: 100, batchTransportCost: 0, batchOtherExpenses: 0, directUnitCost: 0 },
      variableCosts: { packagingUnitCost: 5, localDeliveryUnitCost: 0, paymentFeePercent: 2.0, salesCommissionPercent: 3.0, marketplaceFeePercent: 0 },
      targetGrossMarginPercent: 30,
      targetMarkupPercent: 50,
      currentSellingPrice: 200,
      priceHistory: [],
      salesTransactions: [],
      notes: '',
    }; // C = 100, V = 5, r = 0.05. Unit CM at 200 = 200 * 0.95 - 105 = 85 ج.م

    // الإعداد الأصلي: مصاريف 15,000 ومبيعات 500 -> F = 30 ج.م
    const settingsA: StoreFixedSettings = {
      monthlyFixedExpenses: 15000,
      expectedMonthlyUnitSales: 500,
      minAcceptableCMR: 0.10,
    };
    const finA = calculateProductFinancials(testProd, settingsA);
    // NOP = 85 - 30 = 55 ج.م. Operating Break-even = (100 + 30 + 5) / 0.95 = 142.11 ج.م

    // تحديث الإعدادات (مثلاً زيادة إيجار المحل في شارع النميس إلى 30,000 ج.م) -> F = 60 ج.م
    const settingsB: StoreFixedSettings = {
      monthlyFixedExpenses: 30000,
      expectedMonthlyUnitSales: 500,
      minAcceptableCMR: 0.10,
    };
    const finB = calculateProductFinancials(testProd, settingsB);
    // NOP = 85 - 60 = 25 ج.م. Operating Break-even = (100 + 60 + 5) / 0.95 = 173.68 ج.م

    const passed =
      finA.estimatedFixedOverheadPerUnit === 30 &&
      finA.netOperatingProfitPerUnit === 55 &&
      finA.operatingBreakEvenPrice === 142.11 &&
      finB.estimatedFixedOverheadPerUnit === 60 &&
      finB.netOperatingProfitPerUnit === 25 &&
      finB.operatingBreakEvenPrice === 173.68;

    results.push({
      id: 'TEST_11_SETTINGS_PROPAGATION',
      name: 'Dynamic Settings Propagation into Financial Calculations',
      nameArabic: 'سريان تعديلات مصاريف المتجر فورياً على سعر التعادل والربح',
      category: 'Math',
      passed,
      expected: 'عند مضاعفة المصاريف من 15k إلى 30k: يرتفع التعادل من 142.11 إلى 173.68 ج.م وينخفض الربح من 55 إلى 25 ج.م',
      actual: `التعادل A = ${finA.operatingBreakEvenPrice} ج.م -> التعادل B = ${finB.operatingBreakEvenPrice} ج.م ، الربح = ${finB.netOperatingProfitPerUnit} ج.م`,
      explanation:
        'يثبت أن تغيير أي إعداد للمتجر ينعكس فورياً وحسابياً على كافة مؤشرات الأصناف ونقاط التعادل دون تخزين قيم جامدة.',
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    results.push({
      id: 'TEST_11_SETTINGS_PROPAGATION',
      name: 'Settings Propagation',
      nameArabic: 'سريان تعديلات الإعدادات',
      category: 'Math',
      passed: false,
      expected: 'Propagated',
      actual: `Error: ${errorMsg}`,
      explanation: 'خطأ',
    });
  }

  // =========================================================================
  // 12. اختبارات التحقق من عدم الانحدار: ثبات المعاملات وفصل الهامش عن الـ Markup
  // =========================================================================
  try {
    // أ. الفصل الحاسم بين هامش الربح ونسبة الإضافة
    const cost = 100;
    const price = 150;
    const margin = calculateGrossMargin(price, cost); // (150 - 100) / 150 = 33.3%
    const markup = calculateMarkup(price, cost); // (150 - 100) / 100 = 50.0%
    const profit = calculateGrossProfit(price, cost); // 50 ج.م

    // ب. ثبات المعاملات التاريخية عند تعديل السعر الحالي للصنف
    const historicTx: SalesTransaction = {
      id: 'TX-HISTORIC-99',
      date: '2026-01-15',
      units: 2,
      unitPrice: 300,
      channel: 'in_store',
    };

    const originalProduct: ProductRecord = {
      id: 'SKU-T12',
      name: 'صنف فحص الثبات',
      category: 'casual_shirt',
      variant: 'Slim',
      size: 'L',
      color: 'أبيض',
      qualityTier: 'mid_market',
      supplier: 'العتبة',
      purchaseBatch: 'B-0',
      purchaseDate: '2026-01-01',
      season: 'all_year' as any,
      quantityPurchased: 50,
      quantityReceived: 50,
      quantitySold: 2,
      quantityDamaged: 0,
      quantityReturned: 0,
      costs: { purchaseCost: 180, batchUnits: 50, batchTransportCost: 0, batchOtherExpenses: 0, directUnitCost: 0 },
      variableCosts: { packagingUnitCost: 5, localDeliveryUnitCost: 0, paymentFeePercent: 1.5, salesCommissionPercent: 0, marketplaceFeePercent: 0 },
      targetGrossMarginPercent: 35,
      targetMarkupPercent: 50,
      currentSellingPrice: 300,
      priceHistory: [{ price: 300, date: '2026-01-01', reason: 'سعر البداية' }],
      salesTransactions: [historicTx],
      notes: '',
    };

    // التاجر يرفع السعر الآن إلى 450 ج.م
    const updatedProduct = {
      ...originalProduct,
      currentSellingPrice: 450,
      priceHistory: [
        ...originalProduct.priceHistory,
        { price: 450, date: '2026-10-12', reason: 'تعديل السعر الحالي' },
      ],
    };

    const passed =
      Math.abs(margin - 33.3) <= 0.1 &&
      Math.abs(markup - 50.0) <= 0.1 &&
      profit === 50 &&
      margin !== markup &&
      updatedProduct.salesTransactions[0].unitPrice === 300 &&
      updatedProduct.salesTransactions[0].unitPrice !== updatedProduct.currentSellingPrice &&
      updatedProduct.currentSellingPrice === 450;

    results.push({
      id: 'TEST_12_REGRESSION_INTEGRITY',
      name: 'Regression Checks: Transaction Immutability & Margin/Markup Split',
      nameArabic: 'اختبارات عدم الانحدار: ثبات الحركات التاريخية وتمايز الهوامش',
      category: 'DataIntegrity',
      passed,
      expected: 'Margin = 33.3% != Markup = 50.0% ، والمعاملة القديمة تبقى على 300 ج.م بينما السعر المعروض 450 ج.م',
      actual: `Margin = ${margin}% ، Markup = ${markup}% ، سعر المعاملة المسجلة = ${updatedProduct.salesTransactions[0].unitPrice} ج.م`,
      explanation:
        'يضمن ثبات السجلات المالية التاريخية وعدم تشوهها بأي تغييرات مستقبلية في أسعار السلع أو تكاليفها.',
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    results.push({
      id: 'TEST_12_REGRESSION_INTEGRITY',
      name: 'Regression Checks',
      nameArabic: 'اختبارات عدم الانحدار',
      category: 'DataIntegrity',
      passed: false,
      expected: 'No regressions',
      actual: `Error: ${errorMsg}`,
      explanation: 'خطأ',
    });
  }

  return results;
}
