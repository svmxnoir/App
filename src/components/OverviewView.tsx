import React, { useState } from 'react';
import {
  ProductRecord,
  MarketObservation,
  StoreFixedSettings,
  CommercialSeasonEvent,
} from '../types/pricing';
import {
  calculateProductFinancials,
  calculateMarketBenchmark,
} from '../engine/pricingEngine';
import {
  formatEGP,
  formatPercent,
  CATEGORY_LABELS,
  getActiveSeason,
} from '../utils/formatters';
import {
  AlertCircle,
  TrendingUp,
  Calendar,
  Clock,
  ArrowUpRight,
  CheckCircle2,
  HelpCircle,
  Sparkles,
  ShieldAlert,
  Compass,
  ArrowRight,
  Edit3,
} from 'lucide-react';

interface OverviewViewProps {
  products: ProductRecord[];
  allObservations: MarketObservation[];
  storeSettings: StoreFixedSettings;
  seasons: CommercialSeasonEvent[];
  onSelectProduct: (product: ProductRecord) => void;
  onNavigateToTab: (tab: 'products' | 'calculator' | 'promotions' | 'commission' | 'market' | 'tests' | 'data') => void;
  onUpdateSeasons: (seasons: CommercialSeasonEvent[]) => void;
}

export interface NextActionPlanItem {
  id: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  titleArabic: string;
  reasonArabic: string;
  targetProduct?: ProductRecord;
  targetTab?: 'products' | 'calculator' | 'promotions' | 'commission';
  actionButtonArabic: string;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  products,
  allObservations,
  storeSettings,
  seasons,
  onSelectProduct,
  onNavigateToTab,
  onUpdateSeasons,
}) => {
  const [isSeasonModalOpen, setIsSeasonModalOpen] = useState<boolean>(false);
  const [editingSeasonsList, setEditingSeasonsList] = useState<CommercialSeasonEvent[]>(seasons);

  // حساب الموسم النشط بناءً على تاريخ اليوم (2026-10-12)
  const activeSeasonInfo = getActiveSeason(seasons, '2026-10-12');
  const { currentSeason, daysRemaining, progressPercent, upcomingSeason, daysUntilUpcoming } = activeSeasonInfo;

  // إحصائيات رأس المال والمخزون
  let totalTiedUpCapitalCost = 0;
  let totalRemainingPieces = 0;
  let belowFloorCount = 0;
  let agedCount = 0;
  let underpricedOpportunitiesCount = 0;

  const now = Date.now();
  const criticalAttentionItems: Array<{
    product: ProductRecord;
    severity: 'danger' | 'warning' | 'opportunity';
    title: string;
    desc: string;
    actionLabel: string;
  }> = [];

  const nextActionPlan: NextActionPlanItem[] = [];

  products.forEach((p) => {
    const fin = calculateProductFinancials(p, storeSettings);
    const benchmark = calculateMarketBenchmark(p.category, p.qualityTier, allObservations);

    const remaining = Math.max(
      0,
      (p.quantityReceived || p.quantityPurchased) -
        (p.quantitySold || 0) -
        (p.quantityDamaged || 0)
    );

    totalRemainingPieces += remaining;
    totalTiedUpCapitalCost += remaining * fin.landedUnitCost;

    const daysInStock = Math.max(
      0,
      Math.floor((now - new Date(p.purchaseDate).getTime()) / (1000 * 60 * 60 * 24))
    );

    // فحص السؤال 2: التنبيهات العاجلة اليوم
    if (fin.isBelowEconomicFloor) {
      belowFloorCount++;
      criticalAttentionItems.push({
        product: p,
        severity: 'danger',
        title: `خسارة نقدية مؤكدة: ${p.name}`,
        desc: `السعر الحالي (${formatEGP(p.currentSellingPrice)}) أقل من أرضية التكلفة (${formatEGP(fin.economicFloorPrice)}). كل قطعة تباع تسبب عجزاً نقدياً.`,
        actionLabel: 'تعديل السعر فوراً',
      });

      nextActionPlan.push({
        id: `ACT_FLOOR_${p.id}`,
        priority: 'CRITICAL',
        titleArabic: `وقف النزيف النقدي في صنف: ${p.name}`,
        reasonArabic: `سعر البيع المعروض (${formatEGP(p.currentSellingPrice)}) أقل من أرضية التكلفة الاقتصادية الحقيقية بمقدار ${formatEGP(fin.economicFloorPrice - p.currentSellingPrice)}.`,
        targetProduct: p,
        actionButtonArabic: 'رفع السعر للأرضية الاقتصادية',
      });
    }

    if (daysInStock > 60 && remaining > 5) {
      agedCount++;
      criticalAttentionItems.push({
        product: p,
        severity: 'warning',
        title: `مخزون بطيء في الرف منذ ${daysInStock} يوماً: ${p.name}`,
        desc: `متبقي ${remaining} قطعة برأس مال محبوس قدره ${formatEGP(remaining * fin.landedUnitCost)}. اقتراب تبدل الموسم يفرض تصريفها في باقة أو ترويج.`,
        actionLabel: 'طرح في باقة مجمعة',
      });

      nextActionPlan.push({
        id: `ACT_CLEAR_${p.id}`,
        priority: 'HIGH',
        titleArabic: `تحرير ${formatEGP(remaining * fin.landedUnitCost)} سيولة محبوسة في: ${p.name}`,
        reasonArabic: `المنتج راكد منذ ${daysInStock} يوماً. نوصي بدمجه في باقة أطقم منسقة بدلاً من انتظار خسارة نهاية الموسم.`,
        targetTab: 'promotions',
        actionButtonArabic: 'تصميم باقة ترويجية للصنف',
      });
    }

    // فحص السؤال 3: أين نفقد أرباحاً أو نفوّت فرصة تسعير؟
    const initialUnits = p.quantityReceived || p.quantityPurchased;
    if (
      remaining > 0 &&
      remaining < initialUnits * 0.3 &&
      benchmark.medianPrice > 0 &&
      p.currentSellingPrice < benchmark.medianPrice * 0.85
    ) {
      underpricedOpportunitiesCount++;
      nextActionPlan.push({
        id: `ACT_INC_${p.id}`,
        priority: 'MEDIUM',
        titleArabic: `اقتناص فرصة رفع السعر في: ${p.name}`,
        reasonArabic: `متبقي ${remaining} قطعة فقط بسعر (${formatEGP(p.currentSellingPrice)}) أقل بكثير من وسيط السوق (${formatEGP(benchmark.medianPrice)}). يمكنك زيادة السعر بمقدار 20-30 ج.م دون التأثير على الطلب.`,
        targetProduct: p,
        actionButtonArabic: 'زيادة السعر واقتناص الهامش',
      });
    }
  });

  const handleSaveSeasonDates = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSeasons(editingSeasonsList);
    setIsSeasonModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* ======================================================== */}
      {/* 1. السؤال الأول: ما هو الموسم التجاري الحالي وكم يتبقى منه؟ */}
      {/* ======================================================== */}
      <div className="bg-gradient-to-l from-stone-900 via-stone-800 to-stone-900 text-white p-6 rounded-2xl border border-stone-800 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold">
              <Compass className="w-4 h-4 text-amber-400" />
              <span>السؤال الأول: ما هو الموسم التجاري لمتجر أسيوط حالياً؟</span>
              <span aria-hidden="true">·</span>
              <span className="text-stone-300">
                {currentSeason.isEstimatedWindow ? 'نافذة بيع تجارية تقديرية' : 'موسم تقويمي محدد'}
              </span>
            </div>

            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-3">
              <span>{currentSeason.nameArabic}</span>
              <span className="text-xs px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                متبقي {daysRemaining} يوماً على نهاية الموسم
              </span>
            </h1>

            <p className="text-stone-300 text-xs max-w-2xl leading-relaxed pt-1">
              {currentSeason.strategyNotes}
            </p>
          </div>

          <button
            onClick={() => {
              setEditingSeasonsList(seasons);
              setIsSeasonModalOpen(true);
            }}
            className="px-3.5 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-xs font-medium border border-stone-700 flex items-center gap-1.5 self-start transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>تعديل نوافذ ومواعيد التقويم الموسمي</span>
          </button>
        </div>

        {/* Season Timeline Progress Bar */}
        <div className="space-y-1.5 pt-2 border-t border-stone-700/60 text-xs">
          <div className="flex justify-between items-center text-stone-400 text-[11px]">
            <span>البداية: {currentSeason.startDate}</span>
            <span className="font-semibold text-amber-300 font-mono">انقضى %{progressPercent} من الموسم</span>
            <span>النهاية المقدرة: {currentSeason.endDate}</span>
          </div>
          <div className="h-2.5 bg-stone-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 transition-all duration-500 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Categories Focus & Upcoming Season Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-stone-400">الفئات المستهدفة في هذا الموسم:</span>
            {currentSeason.relevantCategories.map((cat, i) => (
              <span key={i} className="px-2 py-0.5 rounded bg-stone-800 text-stone-200 border border-stone-700 text-[11px]">
                {CATEGORY_LABELS[cat]}
              </span>
            ))}
          </div>

          {upcomingSeason && (
            <div className="text-amber-400 text-[11px] font-semibold">
              الموسم القادم: {upcomingSeason.nameArabic} (يبدأ بعد {daysUntilUpcoming} يوماً)
            </div>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. السؤال الثاني: ما الذي يتطلب انتباهك وقرارك اليوم؟ */}
      {/* ======================================================== */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-600" />
              <span>السؤال الثاني: ما الذي يتطلب انتباهك وقرارك اليوم؟</span>
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              الأصناف المعرضة لخسارة نقدية مباشرة أو المحبوسة في الرف مع اقتراب نهاية الموسم.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
              {criticalAttentionItems.length} حالات ملحة
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {criticalAttentionItems.length > 0 ? (
            criticalAttentionItems.map((item, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 transition-colors ${
                  item.severity === 'danger'
                    ? 'bg-rose-50/50 border-rose-200'
                    : 'bg-amber-50/50 border-amber-200'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-stone-900 text-sm">{item.title}</span>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                        item.severity === 'danger' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {item.severity === 'danger' ? 'نزيف نقدي' : 'مخزون بطيء'}
                    </span>
                  </div>
                  <p className="text-xs text-stone-600 leading-relaxed">{item.desc}</p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-stone-200/60 text-xs">
                  <span className="font-bold text-stone-900">
                    السعر الحالي: {formatEGP(item.product.currentSellingPrice)}
                  </span>
                  <button
                    onClick={() => onSelectProduct(item.product)}
                    className="px-3.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg font-medium transition-colors flex items-center gap-1"
                  >
                    <span>{item.actionLabel}</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-2 p-6 text-center text-xs text-stone-500 bg-stone-50 rounded-xl border border-stone-200">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
              لا توجد حالات نزيف نقدي أو مخزون حرج اليوم؛ كافة الأسعار فوق أرضية التكلفة الاقتصادية.
            </div>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. السؤال الثالث: أين قد نكون نفقد أرباحاً أو نفوّت فرصة تسعير؟ */}
      {/* ======================================================== */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-amber-700" />
              <span>السؤال الثالث: أين قد نكون نفقد أرباحاً أو نفوّت فرصة تسعير؟</span>
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              مقارنة أسعار المحل الميدانية بأسيوط مع وسيط السوق الوطني ورأس المال المحبوس.
            </p>
          </div>
          <span className="text-xs text-stone-500">
            رأس المال المحبوس بالتكلفة: <strong className="text-stone-900 font-bold">{formatEGP(totalTiedUpCapitalCost)}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          {/* Opportunity 1 */}
          <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
            <span className="font-bold text-stone-900 block text-sm">أصناف تباع بسرعة دون استغلال الهامش</span>
            <p className="text-stone-600 leading-relaxed">
              عندما ينخفض المخزون المتبقي عن 30% مع سرعة دوران عالية وسعر يقل عن وسيط السوق بـ 15% أو أكثر، يكون المحل قد ضحى بهامش إضافي كان بإمكانه تحقيقه.
            </p>
            <span className="font-bold text-amber-800 block pt-1">
              {underpricedOpportunitiesCount} أصناف مرشحة لرفع السعر تدريجياً
            </span>
          </div>

          {/* Opportunity 2 */}
          <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
            <span className="font-bold text-stone-900 block text-sm">تجميد السيولة في أصناف راكدة عالية التكلفة</span>
            <p className="text-stone-600 leading-relaxed">
              تأخير تصريف المعاطف أو الجواكت لبعد نهاية الشتاء يحبس آلاف الجنيهات التي يمكن تدويرها فوراً في بضاعة موسم الأعياد الجديد.
            </p>
            <span className="font-bold text-rose-700 block pt-1">
              {agedCount} أصناف راكدة (&gt; 60 يوماً)
            </span>
          </div>

          {/* Opportunity 3 */}
          <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
            <span className="font-bold text-stone-900 block text-sm">التنازل عن الخصومات النقدية للزبائن</span>
            <p className="text-stone-600 leading-relaxed">
              إعطاء خصم 30-50 ج.م نقداً عند الفصال ينقص أرباحك مباشرة، بينما تقديم تقصير مجاني عند ترزي المحل (يكلف 15 ج.م) يرضي الزبون ويحمي هامش البيع الكامل.
            </p>
            <button
              onClick={() => onNavigateToTab('promotions')}
              className="font-bold text-amber-800 hover:underline block pt-1"
            >
              استخدام عروض القيمة غير السعرية ←
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 4. السؤال الرابع: ما الذي يجب على صاحب المحل فعله الآن ولماذا؟ */}
      {/* ======================================================== */}
      <div className="bg-amber-50/40 rounded-2xl border border-amber-200/80 p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-amber-200/60 pb-3">
          <div>
            <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-800" />
              <span>السؤال الرابع: ما الذي يجب على صاحب المحل فعله الآن ولماذا؟ (Action Plan)</span>
            </h2>
            <p className="text-xs text-stone-600 mt-0.5">
              خطة قرارات تنفيذية مرتبة بالأولوية لتحقيق أعلى عائد وحماية سيولة المتجر اليوم.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {nextActionPlan.length > 0 ? (
            nextActionPlan.map((action, idx) => (
              <div
                key={action.id}
                className="bg-white p-4 rounded-xl border border-stone-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs hover:shadow-xs transition-shadow"
              >
                <div className="space-y-1 max-w-2xl">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        action.priority === 'CRITICAL'
                          ? 'bg-rose-100 text-rose-800'
                          : action.priority === 'HIGH'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {action.priority === 'CRITICAL' ? 'أولوية 1 عاجلة' : action.priority === 'HIGH' ? 'أولوية 2' : 'أولوية 3'}
                    </span>
                    <h3 className="font-bold text-stone-900 text-sm">{action.titleArabic}</h3>
                  </div>
                  <p className="text-stone-600 leading-relaxed">{action.reasonArabic}</p>
                </div>

                <div className="self-end md:self-center shrink-0">
                  <button
                    onClick={() => {
                      if (action.targetProduct) {
                        onSelectProduct(action.targetProduct);
                      } else if (action.targetTab) {
                        onNavigateToTab(action.targetTab);
                      }
                    }}
                    className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-lg font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <span>{action.actionButtonArabic}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="p-6 text-center text-xs text-stone-600 bg-white rounded-xl border border-stone-200">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
              أداء المتجر ممتاز ومتوازن، لا توجد إجراءات طارئة مطلوبة الآن. تابع حركة المبيعات وتحديث مرصد السوق بانتظام.
            </div>
          )}
        </div>
      </div>

      {/* Modal: Edit Seasonal Calendar Dates */}
      {isSeasonModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 border border-stone-200 text-stone-900 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="font-bold text-stone-900 text-base">تعديل نوافذ ومواعيد التقويم الموسمي لمتجر أسيوط</h3>
                <p className="text-xs text-stone-500">
                  يمكنك تخصيص تواريخ بداية ونهاية كل موسم تجاري بما يناسب واقع السوق المحلي في صعيد مصر.
                </p>
              </div>
              <button onClick={() => setIsSeasonModalOpen(false)} className="text-stone-400 hover:text-stone-700">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSeasonDates} className="space-y-3 max-h-96 overflow-y-auto p-1">
              {editingSeasonsList.map((s, idx) => (
                <div key={s.id} className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
                  <div className="flex justify-between items-center font-bold text-stone-900">
                    <span>{s.nameArabic}</span>
                    <label className="flex items-center gap-1.5 text-[11px] text-stone-600 cursor-pointer font-normal">
                      <input
                        type="checkbox"
                        checked={s.isEstimatedWindow}
                        onChange={(e) => {
                          const updated = [...editingSeasonsList];
                          updated[idx] = { ...s, isEstimatedWindow: e.target.checked };
                          setEditingSeasonsList(updated);
                        }}
                        className="accent-amber-700"
                      />
                      <span>نافذة بيع تقديرية للمحل</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-stone-600 text-[11px] mb-1">تاريخ البداية:</label>
                      <input
                        type="date"
                        value={s.startDate}
                        onChange={(e) => {
                          const updated = [...editingSeasonsList];
                          updated[idx] = { ...s, startDate: e.target.value };
                          setEditingSeasonsList(updated);
                        }}
                        className="w-full bg-white border border-stone-300 rounded p-1.5 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-stone-600 text-[11px] mb-1">تاريخ النهاية:</label>
                      <input
                        type="date"
                        value={s.endDate}
                        onChange={(e) => {
                          const updated = [...editingSeasonsList];
                          updated[idx] = { ...s, endDate: e.target.value };
                          setEditingSeasonsList(updated);
                        }}
                        className="w-full bg-white border border-stone-300 rounded p-1.5 text-xs"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsSeasonModalOpen(false)}
                  className="px-4 py-2 border border-stone-300 rounded-lg text-stone-700"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-lg font-bold"
                >
                  حفظ تواريخ التقويم
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
