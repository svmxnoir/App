export type ProductCategory =
  | 'basic_tshirt'      // تيشيرت أساسي قطن
  | 'fashion_tee'       // تيشيرت مطبوع / أوفرسايز
  | 'basic_polo'        // بولو قطن بيكيه
  | 'premium_polo'      // بولو قطن معالج / كتان
  | 'casual_shirt'      // قميص كاجوال / أوكسفورد
  | 'formal_shirt'      // قميص كلاسيك / مناسبات
  | 'jeans'             // بنطلون جينز / دنيم
  | 'trousers'          // بنطلون كاجوال / جبردين / بانجالين
  | 'hoodie'            // سويت شيرت / هودي
  | 'knitwear'          // بلوفر وتريكو
  | 'jacket'            // جاكيت ومعاطف / ووتربروف / بامب
  | 'suit'              // بدلة وبليزر رجالي
  | 'basics';           // قطنيات وملابس داخلية

export type QualityTier =
  | 'budget'        // شعبي / اقتصادي
  | 'commercial'    // تجاري / قياسي
  | 'mid_market'    // لوكس / ماركة متوسطة
  | 'premium';      // فاخر / قطن مصري ممتاز

export type Season =
  | 'summer'        // صيفي
  | 'winter'        // شتوي
  | 'transitional'  // خريفي / ربيعي
  | 'perennial';    // مستمر طوال العام

export type SourceTier =
  | 'Tier_A'  // مصادر أولية موثوقة ومفحوصة (مواقع رسمية موثقة)
  | 'Tier_B'  // منصات تجارة إلكترونية معتمدة (جوميا، نون، سوشيال موثق)
  | 'Tier_C'  // تسعير مصانع وجملة (العتبة، المحلة الكبرى)
  | 'Tier_D'  // رصد ميداني غير رسمي
  | 'Tier_E'; // إفادات شفهية وتقريبية

export type GeographyScope =
  | 'Assiut_Offline'   // متاجر أسيوط الميدانية (مثل النميس، يسري راغب)
  | 'National_Online'  // مواقع البراندات الوطنية (شحن لكافة المحافظات)
  | 'Cairo_Wholesale'  // أسواق جملة القاهرة (العتبة والموسكي)
  | 'Mahalla_Factory'; // مصانع المحلة الكبرى مباشرة

export type CommercialLevel =
  | 'Retail_Public'   // سعر تجزئة للمستهلك
  | 'Wholesale_MOQ'   // سعر جملة بالدرب / الحد الأدنى
  | 'Factory_Direct'  // سعر باب المصنع
  | 'Bundle_Offer';   // عروض مجمعة (باقة أطقم)

export type VerificationStatus =
  | 'Approved'       // معتمد ومدرج في حساب المتوسطات
  | 'Pending_Review' // قيد المراجعة والتحقق
  | 'Rejected';      // مرفوض (غير مطابق أو غير دقيق)

export type RecommendationAction =
  | 'HOLD'       // تثبيت السعر الحالي
  | 'INCREASE'   // رفع السعر لاستغلال الطلب
  | 'PROMOTE'    // عرض ترويجي أو باقة مجمعة
  | 'MARKDOWN'   // تخفيض تدريجي للتصريف
  | 'LIQUIDATE'; // تصفية نهائية واسترداد السيولة

export interface ProductCosts {
  purchaseCost: number;        // سعر شراء القطعة من المورد (ج.م)
  batchUnits: number;          // إجمالي قطع الشحنة / الدفعة
  batchTransportCost: number;  // تكلفة شحن ونقل الدفعة لأسيوط (ج.م)
  batchOtherExpenses: number;  // مصاريف شحن/تحميل وتنزيل إضافية للدفعة (ج.م)
  directUnitCost: number;      // تكلفة تشطيب / كيس / كارت صنف خاص بالقطعة (ج.م)
}

export interface VariableSellingCosts {
  packagingUnitCost: number;       // تكلفة كيس المحل / التغليف (ج.م)
  localDeliveryUnitCost: number;   // تكلفة التوصيل المحلي إن وجدت (ج.م)
  paymentFeePercent: number;       // نسبة عمولة الدفع الإلكتروني (فيزا/انستاباي % - مثلاً 1.5%)
  salesCommissionPercent: number;  // نسبة عمولة البائع / الكاشير (% - مثلاً 2%)
  marketplaceFeePercent: number;   // عمولة منصة البيع الإلكتروني إن وجدت (% - 0% للمحل الأرضي)
}

export interface StoreFixedSettings {
  monthlyFixedExpenses: number;    // إيجار المحل في أسيوط + رواتب + كهرباء (ج.م/شهر)
  expectedMonthlyUnitSales: number;// حجم المبيعات الشهري المتوقع بالقطع
  minAcceptableCMR: number;         // أدنى نسبة هامش مساهمة مقبولة كسر عشري (مثلاً 0.15 = 15%)
  storeName?: string;              // اسم المحل
}

export interface PriceHistoryEntry {
  price: number;
  date: string;
  reason: string;
}

export interface SalesTransaction {
  id: string;
  date: string;
  units: number;
  unitPrice: number;
  channel: 'in_store' | 'online' | 'wholesale';
  notes?: string;
  isPromotionSale?: boolean;       // هل تم البيع ضمن عرض ترويجي؟
  promotionId?: string;            // كود العرض الترويجي
}

export interface MarketObservation {
  id: string;
  category: ProductCategory;
  qualityTier: QualityTier;
  brandName: string;
  sellerName: string;
  geographyScope: GeographyScope;
  commercialLevel: CommercialLevel;
  currentPrice: number;
  originalPrice: number | null;
  calculatedDiscountPct: number | null;
  fabricComposition: string;
  sourceUrl: string;
  sourceTier: SourceTier;
  observationDate: string;
  verificationStatus: VerificationStatus;
  notes: string;
}

export interface ProductRecord {
  id: string;                      // رمز الصنف SKU (فريد)
  name: string;                    // اسم المنتج
  category: ProductCategory;       // التصنيف
  variant: string;                 // القصة / الموديل (مثل: Slim Fit / Regular)
  size: string;                    // المقاسات المتاحة
  color: string;                   // اللون
  qualityTier: QualityTier;        // فئة الجودة
  supplier: string;                // المورد (العتبة، المحلة، مستورد)
  purchaseBatch: string;           // كود الدفعة
  purchaseDate: string;            // تاريخ الشراء
  season: Season;                  // الموسم
  
  // حركات المخزون
  quantityPurchased: number;       // الكمية المشتراة
  quantityReceived: number;        // المستلم فعلياً
  quantitySold: number;            // المباع حتى الآن
  quantityDamaged: number;         // التالف / الهالك
  quantityReturned: number;        // المرتجع
  
  // التكاليف
  costs: ProductCosts;
  variableCosts: VariableSellingCosts;
  
  // أهداف وهوامش التاجر
  targetGrossMarginPercent: number;// نسبة هامش الربح الإجمالي المستهدف (% مثلاً 35%)
  targetMarkupPercent: number;     // أو نسبة الإضافة على التكلفة (Markup % مثلاً 50%)
  
  // السعر الحالي والسجل
  currentSellingPrice: number;     // سعر البيع المعروض حالياً
  priceHistory: PriceHistoryEntry[];
  salesTransactions: SalesTransaction[];
  
  notes: string;
}

export interface FinancialCalculationResult {
  landedUnitCost: number;            // تكلفة الوصول للقطعة (LC)
  allocatedBatchExpensePerUnit: number; // نصيب القطعة من نقل ومصاريف الدفعة
  currentSellingPrice: number;       // سعر البيع الحالي
  grossProfit: number;               // مجمل الربح للقطعة (P - LC)
  grossMarginPercent: number;        // هامش الربح الإجمالي %
  markupPercent: number;             // نسبة الإضافة على التكلفة Markup %
  
  // التكاليف المتغيرة
  flatVariableCostPerUnit: number;   // التكاليف المتغيرة المباشرة (تغليف + توصيل)
  percentageVariableFeeRate: number; // إجمالي النسب المتغيرة (عمولة دفع + بيع + منصة) كسر عشري
  variableCostAmount: number;        // إجمالي التكلفة المتغيرة بالجنيه عند السعر الحالي
  
  // هامش المساهمة
  unitContribution: number;          // مساهمة القطعة الواحدة (CM)
  contributionMarginRatio: number;   // نسبة هامش المساهمة (CMR)
  
  // التكاليف الثابتة التقديرية
  estimatedFixedOverheadPerUnit: number; // نصيب القطعة التقديري من التكاليف الثابتة
  netOperatingProfitPerUnit: number;     // صافي الربح التشغيلي التقديري للقطعة
  
  // نقطة التعادل
  breakEvenQuantity: number | null;  // عدد القطع لتغطية التكاليف الثابتة المخصصة للدفعة
  breakEvenBatchRevenue: number | null;
  
  // الحدود السعرية
  economicFloorPrice: number;        // أرضية السعر الاقتصادية (تمنع الخسارة النقدية)
  targetPriceFromMargin: number;     // السعر المستهدف وفقاً لهامش الربح
  targetPriceFromMarkup: number;     // السعر المستهدف وفقاً لنسبة الإضافة
  
  // مؤشرات الصحة المالية
  isBelowEconomicFloor: boolean;
  isNegativeContribution: boolean;
  isImpossibleTargetMargin: boolean;
}

export interface DiscountSensitivityScenario {
  discountPercent: number;           // نسبة الخصم % (مثلاً 10%)
  discountedPrice: number;           // السعر بعد الخصم (ج.م)
  newUnitContribution: number;       // هامش مساهمة القطعة بعد الخصم
  newCMR: number;                    // نسبة هامش المساهمة الجديدة
  requiredVolumeUpliftPercent: number; // الزيادة المطلوبة في المبيعات للحفاظ على نفس المساهمة النقدية
  cashContributionPer100Units: number; // المساهمة لكل 100 قطعة مقارنة بالوضع الحالي
  isDestructive: boolean;            // هل الخصم مدمر نقدياً ومستحيل التعويض؟
}

export interface MarketBenchmarkSummary {
  sampleSize: number;
  minPrice: number;
  maxPrice: number;
  medianPrice: number;
  promoFloor: number;
  strategicAnchors: { brand: string; price: number; scope: string }[];
  offlineAssiutCeiling: number | null; // سقف أسيوط الميداني مثل باقات فينوم
}

export interface PricingRecommendation {
  action: RecommendationAction;
  actionTitleArabic: string;
  recommendedPrice: number;
  expectedFinancialConsequences: {
    unitContribution: number;
    contributionMarginRatio: number;
    totalRemainingBatchContribution: number;
    cashRecoveryPotential: number;
  };
  supportingEvidence: string[];
  confidenceLevel: 'High' | 'Medium' | 'Low';
  confidenceBasis: string;
  missingInformation: string[];
  risksAndTradeoffs: string[];
  whyPreferredOverAlternatives: string;
}

// ==========================================
// المواسم التجارية والتقويم الميداني لأسيوط
// ==========================================

export interface CommercialSeasonEvent {
  id: string;
  nameArabic: string;              // اسم الموسم التجاري (شتاء، عيد الفطر، مدارس...)
  seasonKey: Season;               // الصنف الموسمي
  startDate: string;               // تاريخ البداية (YYYY-MM-DD)
  endDate: string;                 // تاريخ النهاية
  isEstimatedWindow: boolean;      // هل التاريخ نافذة بيع تقديرية للمحل أم تاريخ تقويم فلكي ثابت؟
  relevantCategories: ProductCategory[]; // الفئات ذات الطلب المرتفع
  strategyNotes: string;           // توجيهات التسعير والبيع لهذا الموسم بأسيوط
  colorTheme: string;              // لون العرض
}

// ==========================================
// قوالب وسياسات العروض والترويج
// ==========================================

export type PromotionType =
  | 'OUTFIT_BUNDLE'        // باقة طقم كامل (جاكيت + بلوفر + جينز)
  | 'MULTI_BUY'            // شراء متعدد (اشتري 2 واحصل على خصم أو 3 بـ 999)
  | 'COMPLEMENTARY_ITEM'   // صنف تكميلي (بنطلون + خصم على تيشيرت أو حزام)
  | 'EARLY_SEASON_REWARD'  // حافز بداية الموسم (قسيمة شراء مبكرة بدون كسر السعر)
  | 'RETURNING_CUSTOMER'   // مزايا الزبون الدائم
  | 'CATEGORY_CLEARANCE'   // تحريك فئة أو صنف محدد
  | 'SLOW_STOCK_CLEAR'     // تصفية المخزون الراكد
  | 'CONTROLLED_MARKDOWN'  // تخفيض موسمي متدرج
  | 'NON_PRICE_VALUE';     // قيمة غير سعرية (هدية إكسسوار أو تقصير مجاني عند الترزي)

export interface PromotionTemplate {
  id: string;
  type: PromotionType;
  titleArabic: string;
  shortDescription: string;
  businessProblemSolved: string;   // ما هي المشكلة التجارية التي يعالجها؟
  qualifyingProductsDescription: string; // أي المنتجات مؤهلة؟
  whenToUse: string[];             // متى يُنصح باستخدامه؟
  whenNotToUse: string[];          // متى يُمنع استخدامه؟
  costCalculationExplanation: string; // كيف تُحسب تكلفته وتبعاته المالية؟
  successMetricsExplanation: string; // كيف نقيس نجاح العرض بعد انتهائه؟
  defaultDiscountPercent?: number;
  nonPriceValueDescription?: string;
}

export interface StorePromotion {
  id: string;
  templateId: string;
  type: PromotionType;
  titleArabic: string;
  startDate: string;
  endDate: string;
  status: 'PLANNED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  
  // المنتجات والشروط
  productIds: string[];            // المنتجات المشمولة بالعرض
  bundleTotalRegularPrice: number; // مجموع الأسعار الأصلية
  bundleOfferPrice: number;        // سعر العرض الإجمالي
  bundleLandedCost: number;        // مجموع تكلفة وصول مكونات العرض
  bundleVariableCosts: number;     // مصاريف البيع المتغيرة للباقة
  bundleContribution: number;      // هامش المساهمة للباقة بالكامل
  
  // شروط الأمان المالي
  requiresOwnerApproval: boolean;  // هل يتطلب موافقة المالك؟
  isApprovedByOwner: boolean;      // هل وافق المالك صراحة؟
  ownerApprovalNote?: string;      // مبرر المالك إذا كان العرض تحت أرضية التكلفة
  isNegativeContribution: boolean; // هل يسبب العرض مساهمة سالبة؟
  minQuantityRequired: number;     // الحد الأدنى لكمية المبيعات لتحقيق الهدف
  
  // قياس وتقييم النتائج
  objectiveNote: string;           // هدف العرض المحدد
  evaluation?: {
    unitsSold: number;
    actualRevenue: number;
    actualContribution: number;
    baselineComparisonNote: string;
    verdict: 'SUCCESS' | 'PARTIAL' | 'UNSUCCESSFUL';
    learnings: string;
  };
}

// ==========================================
// نماذج عمولات وحوافز موظفي المحل بأسيوط
// ==========================================

export type CommissionModelType =
  | 'NET_SALES_PERCENT'           // نسبة من صافي المبيعات
  | 'CONTRIBUTION_PROFIT_PERCENT' // نسبة من هامش المساهمة الفعلي
  | 'TIERED_TARGET_INCENTIVE';    // حافز تدريجي مربوط بهدف مبيعات / أرباح

export interface CommissionModelOption {
  type: CommissionModelType;
  nameArabic: string;
  ratePercent: number;             // النسبة الأساسية %
  calculationBasisArabic: string;  // أساس الحساب الدقيق
  handlingDiscountsArabic: string; // كيف يعالج الخصومات والمرتجعات؟
  unintendedRisksArabic: string;   // المخاطر والتصرفات السلبية غير المقصودة
  meritsArabic: string;            // المزايا ونقاط القوة
}
