import { ProductCategory, QualityTier, Season, SourceTier, GeographyScope, CommercialLevel, VerificationStatus } from '../types/pricing';

export function formatEGP(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return '0 ج.م';
  return `${amount.toLocaleString('ar-EG', {
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })} ج.م`;
}

export function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined || Number.isNaN(num)) return '0';
  return num.toLocaleString('ar-EG');
}

export function formatPercent(pct: number | null | undefined): string {
  if (pct === null || pct === undefined || Number.isNaN(pct)) return '0%';
  return `%${pct.toFixed(1)}`;
}

export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  basic_tshirt: 'تيشيرت أساسي قطن',
  fashion_tee: 'تيشيرت مطبوع / أوفرسايز',
  basic_polo: 'بولو كلاسيك بيكيه',
  premium_polo: 'بولو قطن معالج / كتان',
  casual_shirt: 'قميص كاجوال / أوكسفورد',
  formal_shirt: 'قميص كلاسيك / مناسبات',
  jeans: 'بنطلون جينز / دنيم',
  trousers: 'بنطلون كاجوال / جبردين',
  hoodie: 'سويت شيرت / هودي',
  knitwear: 'بلوفر وتريكو رجالي',
  jacket: 'جاكيت ومعاطف / بامب',
  suit: 'بدلة وبليزر رجالي',
  basics: 'ملابس داخلية وقطنيات',
};

export const QUALITY_TIER_LABELS: Record<QualityTier, { label: string; desc: string }> = {
  budget: { label: 'شعبي / اقتصادي', desc: 'أقمشة مختلطة، تكلفة منخفضة' },
  commercial: { label: 'تجاري معتدل', desc: 'خامة قطنية قياسية، تصنيع محلي' },
  mid_market: { label: 'لوكس / جودة عالية', desc: 'تقفيل ممتاز، قطن ممشط، معالجات غسيل' },
  premium: { label: 'فاخر / قطن مصري ممتاز', desc: 'قطن جيزة معالج، جودة تصدير' },
};

export const SEASON_LABELS: Record<Season, string> = {
  summer: 'صيفي',
  winter: 'شتوي',
  transitional: 'خريفي / ربيعي',
  perennial: 'طوال العام (مستمر)',
};

export const SOURCE_TIER_LABELS: Record<SourceTier, string> = {
  Tier_A: 'مستوى أ (مواقع رسمية موثقة)',
  Tier_B: 'مستوى ب (منصات تجارة كبرى)',
  Tier_C: 'مستوى ج (جملة العتبة والمصانع)',
  Tier_D: 'مستوى د (رصد ميداني محلي)',
  Tier_E: 'مستوى هـ (إفادة شفهية)',
};

export const GEOGRAPHY_LABELS: Record<GeographyScope, string> = {
  Assiut_Offline: 'أسيوط - متاجر ميدانية',
  National_Online: 'متاجر وطنية أونلاين',
  Cairo_Wholesale: 'القاهرة - جملة العتبة والموسكي',
  Mahalla_Factory: 'المحلة الكبرى - باب المصنع',
};

export const COMMERCIAL_LEVEL_LABELS: Record<CommercialLevel, string> = {
  Retail_Public: 'تجزئة للمستهلك',
  Wholesale_MOQ: 'جملة (حد أدنى)',
  Factory_Direct: 'مصنع مباشر',
  Bundle_Offer: 'باقة مجمعة (عرض طقم)',
};

export const VERIFICATION_STATUS_LABELS: Record<VerificationStatus, { label: string; colorClass: string }> = {
  Approved: { label: 'معتمد وموثق', colorClass: 'text-emerald-700 bg-emerald-50' },
  Pending_Review: { label: 'قيد المراجعة', colorClass: 'text-amber-700 bg-amber-50' },
  Rejected: { label: 'مرفوض', colorClass: 'text-rose-700 bg-rose-50' },
};

import { CommercialSeasonEvent } from '../types/pricing';

export interface ActiveSeasonInfo {
  currentSeason: CommercialSeasonEvent;
  daysRemaining: number;
  totalSeasonDays: number;
  progressPercent: number;
  upcomingSeason: CommercialSeasonEvent | null;
  daysUntilUpcoming: number | null;
}

export function getActiveSeason(
  seasons: CommercialSeasonEvent[],
  currentDateStr: string = '2026-10-12'
): ActiveSeasonInfo {
  const currentTimestamp = new Date(currentDateStr).getTime();

  // Safe fallback if seasons array is empty
  const fallbackSeason: CommercialSeasonEvent = {
    id: 'default',
    nameArabic: 'موسم عام',
    seasonKey: 'perennial',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    isEstimatedWindow: true,
    relevantCategories: [],
    strategyNotes: 'تشغيل اعتيادي',
    colorTheme: 'stone',
  };

  // 1. البحث عن الموسم النشط حالياً
  let active = seasons.find((s) => {
    const start = new Date(s.startDate).getTime();
    const end = new Date(s.endDate).getTime();
    return currentTimestamp >= start && currentTimestamp <= end;
  });

  if (!active && seasons.length > 0) {
    // إذا لم نكن داخل أي موسم بدقة، نختار أقرب موسم مستقبلي أو أول موسم
    active = seasons[0];
  }

  const selectedSeason = active || fallbackSeason;

  const startMs = new Date(selectedSeason.startDate).getTime();
  const endMs = new Date(selectedSeason.endDate).getTime();
  const totalDays = Math.max(1, Math.round((endMs - startMs) / (1000 * 60 * 60 * 24)));
  const daysPassed = Math.max(0, Math.round((currentTimestamp - startMs) / (1000 * 60 * 60 * 24)));
  const daysRemaining = Math.max(0, Math.round((endMs - currentTimestamp) / (1000 * 60 * 60 * 24)));
  const progressPercent = Math.min(100, Math.max(0, Math.round((daysPassed / totalDays) * 100)));

  // البحث عن الموسم التالي
  const upcoming = seasons
    .filter((s) => s.id !== selectedSeason.id && new Date(s.startDate).getTime() > currentTimestamp)
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())[0] || null;

  const daysUntilUpcoming = upcoming
    ? Math.max(0, Math.round((new Date(upcoming.startDate).getTime() - currentTimestamp) / (1000 * 60 * 60 * 24)))
    : null;

  return {
    currentSeason: selectedSeason,
    daysRemaining,
    totalSeasonDays: totalDays,
    progressPercent,
    upcomingSeason: upcoming,
    daysUntilUpcoming,
  };
}

/**
 * قاموس المصطلحات بالعامية والمفاهيم التجارية المصرية البسيطة
 */
export const PLAIN_TERMS_EXPLANATIONS = {
  markup: {
    title: 'الزيادة على تكلفة الشراء (Markup)',
    desc: 'النسبة المضافة فوق سعر التكلفة. مثال: قطعة تكلفتها 100 ج.م وتباع بـ 150 ج.م، نسبة الإضافة = 50%.',
  },
  margin: {
    title: 'نسبة الربح من سعر البيع (Gross Margin)',
    desc: 'نسبة ما تحتفظ به كربح من كل جنيه يدفعه الزبون. في المثال السابق: (50 ÷ 150) = 33.3%. لا تتطابق مع نسبة الإضافة!',
  },
  contribution: {
    title: 'المبلغ المتبقي من البيع (هامش المساهمة الحقيقي)',
    desc: 'ما يتبقى في درج المحل بعد سداد ثمن القطعة ومصاريف الأكياس وعمولة الكاشير أو الفيزا. هذا المبلغ هو ما يدفع إيجار المحل في أسيوط وأرباحك الصافية.',
  },
  economicFloor: {
    title: 'أرضية السعر الاقتصادية (أقل سعر يمنع الخسارة)',
    desc: 'خط أحمر محاسبي؛ البيع بأقل من هذا السعر يُعد نزيفاً نقدياً حقيقياً وخسارة مؤكدة حتى لو بدا السعر أعلى من سعر المصنع.',
  },
  deltaQ: {
    title: 'الزيادة الإجبارية بالمبيعات لتعويض التخفيض (ΔQ%)',
    desc: 'إذا قدمت خصماً 10%، كم قطعة إضافية يجب أن تبيعها للحفاظ على نفس السيولة دون أن تخسر أرباحك؟',
  },
};

