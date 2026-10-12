import React, { useState } from 'react';
import {
  ProductRecord,
  PromotionTemplate,
  StorePromotion,
  CommercialSeasonEvent,
  StoreFixedSettings,
} from '../types/pricing';
import {
  PROMOTION_TEMPLATES_LIBRARY,
  evaluatePromotionSafety,
  diagnoseWaitingProblem,
  PromotionSafetyReport,
} from '../engine/promotionsEngine';
import { formatEGP, formatPercent, CATEGORY_LABELS } from '../utils/formatters';
import {
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  Calendar,
  Layers,
  Tag,
  CheckCircle2,
  AlertTriangle,
  TrendingDown,
  Info,
  Plus,
  HelpCircle,
  FileCheck,
} from 'lucide-react';

interface PromotionsViewProps {
  products: ProductRecord[];
  promotions: StorePromotion[];
  seasons: CommercialSeasonEvent[];
  storeSettings: StoreFixedSettings;
  onSavePromotion: (promo: StorePromotion) => void;
  onUpdatePromotion: (promo: StorePromotion) => void;
}

export const PromotionsView: React.FC<PromotionsViewProps> = ({
  products,
  promotions,
  seasons,
  storeSettings,
  onSavePromotion,
  onUpdatePromotion,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'library' | 'builder' | 'calendar' | 'diagnostic'>('library');
  const [selectedTemplate, setSelectedTemplate] = useState<PromotionTemplate>(PROMOTION_TEMPLATES_LIBRARY[0]);

  // نموذج منشئ العروض
  const [builderTitle, setBuilderTitle] = useState<string>('');
  const [builderTemplate, setBuilderTemplate] = useState<PromotionTemplate>(PROMOTION_TEMPLATES_LIBRARY[0]);
  const [builderSelectedProductIds, setBuilderSelectedProductIds] = useState<string[]>([]);
  const [builderOfferPrice, setBuilderOfferPrice] = useState<number>(0);
  const [builderStartDate, setBuilderStartDate] = useState<string>('2026-10-15');
  const [builderEndDate, setBuilderEndDate] = useState<string>('2026-11-15');
  const [builderObjective, setBuilderObjective] = useState<string>('');
  const [builderOwnerNote, setBuilderOwnerNote] = useState<string>('');
  const [builderExplicitApproval, setBuilderExplicitApproval] = useState<boolean>(false);

  // تقييم العرض المكتمل
  const [evaluatingPromoId, setEvaluatingPromoId] = useState<string | null>(null);
  const [evalUnitsSold, setEvalUnitsSold] = useState<number>(10);
  const [evalRevenue, setEvalRevenue] = useState<number>(0);
  const [evalVerdict, setEvalVerdict] = useState<'SUCCESS' | 'PARTIAL' | 'UNSUCCESSFUL'>('SUCCESS');
  const [evalLearnings, setEvalLearnings] = useState<string>('');

  // فحص الأمان المالي اللحظي في المنشئ
  const selectedProductsForBuilder = products.filter((p) => builderSelectedProductIds.includes(p.id));
  const safetyReport: PromotionSafetyReport = evaluatePromotionSafety(
    selectedProductsForBuilder,
    builderOfferPrice,
    storeSettings.minAcceptableCMR
  );

  // تشخيص ظاهرة الانتظار
  const waitingDiagnostic = diagnoseWaitingProblem(products);

  const handleStartBuilderFromTemplate = (template: PromotionTemplate) => {
    setBuilderTemplate(template);
    setBuilderTitle(template.titleArabic);
    setBuilderOfferPrice(0);
    setBuilderExplicitApproval(false);
    setBuilderObjective(template.businessProblemSolved);
    setActiveSubTab('builder');
  };

  const handleToggleProductInBuilder = (productId: string) => {
    setBuilderSelectedProductIds((prev) => {
      const next = prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId];
      // اقتراح سعر أولي تلقائي
      const chosen = products.filter((p) => next.includes(p.id));
      const regularSum = chosen.reduce((sum, p) => sum + p.currentSellingPrice, 0);
      const discountRate = (builderTemplate.defaultDiscountPercent || 15) / 100;
      setBuilderOfferPrice(Math.round(regularSum * (1 - discountRate)));
      return next;
    });
  };

  const handleCreatePromotionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (builderSelectedProductIds.length === 0) {
      alert('يرجى اختيار منتج واحد على الأقل للعرض.');
      return;
    }
    if (builderOfferPrice <= 0) {
      alert('يرجى تحديد سعر العرض الإجمالي.');
      return;
    }
    if (safetyReport.requiresOwnerApproval && !builderExplicitApproval) {
      alert(
        'تنبيه محاسبي صارم: هذا العرض أقل من أرضية التكلفة أو يحقق مساهمة سالبة؛ يلزم تفعيل خيار "موافقة صاحب المحل الصريحة" لتوثيق المسؤولية وتحديد المبرر.'
      );
      return;
    }

    const newPromo: StorePromotion = {
      id: `PROMO_${Date.now().toString().slice(-6)}`,
      templateId: builderTemplate.id,
      type: builderTemplate.type,
      titleArabic: builderTitle.trim() || builderTemplate.titleArabic,
      startDate: builderStartDate,
      endDate: builderEndDate,
      status: 'ACTIVE',
      productIds: builderSelectedProductIds,
      bundleTotalRegularPrice: safetyReport.totalRegularPrice,
      bundleOfferPrice: builderOfferPrice,
      bundleLandedCost: safetyReport.totalLandedCost,
      bundleVariableCosts: safetyReport.totalFlatVariableCost,
      bundleContribution: safetyReport.bundleContribution,
      requiresOwnerApproval: safetyReport.requiresOwnerApproval,
      isApprovedByOwner: builderExplicitApproval || !safetyReport.requiresOwnerApproval,
      ownerApprovalNote: builderOwnerNote.trim() || undefined,
      isNegativeContribution: safetyReport.isNegativeContribution,
      minQuantityRequired: safetyReport.minUnitsToPreserveCash,
      objectiveNote: builderObjective.trim(),
    };

    onSavePromotion(newPromo);
    alert('تم حفظ وتفعيل العرض بنجاح في تقويم عروض المحل!');
    setActiveSubTab('calendar');
  };

  const handleSaveEvaluation = (promo: StorePromotion) => {
    const updated: StorePromotion = {
      ...promo,
      status: 'COMPLETED',
      evaluation: {
        unitsSold: Number(evalUnitsSold),
        actualRevenue: Number(evalRevenue || evalUnitsSold * promo.bundleOfferPrice),
        actualContribution: Number(evalUnitsSold * promo.bundleContribution),
        baselineComparisonNote: `تم بيع ${evalUnitsSold} باقة بإجمالي مساهمة ${formatEGP(
          evalUnitsSold * promo.bundleContribution
        )}`,
        verdict: evalVerdict,
        learnings: evalLearnings.trim(),
      },
    };
    onUpdatePromotion(updated);
    setEvaluatingPromoId(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white p-6 rounded-2xl border border-stone-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-amber-700 text-xs font-semibold mb-1">
              <Sparkles className="w-4 h-4 text-amber-700" />
              <span>منظومة إدارة العروض وسياسة التسعير الترويجي</span>
            </div>
            <h2 className="text-lg md:text-xl font-bold text-stone-900">
              مكتبة العروض الجاهزة وفحص الأمان المالي لمتاجر أسيوط
            </h2>
            <p className="text-xs text-stone-600 mt-1 max-w-2xl leading-relaxed">
              استبدال التخفيضات العشوائية بعروض وباقات منسقة تحمي أرباحك وتمنع ظاهرة انتظار الزبائن لأوكازيون نهاية الموسم.
            </p>
          </div>

          <button
            onClick={() => {
              setBuilderTemplate(PROMOTION_TEMPLATES_LIBRARY[0]);
              setBuilderTitle(PROMOTION_TEMPLATES_LIBRARY[0].titleArabic);
              setActiveSubTab('builder');
            }}
            className="px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-bold flex items-center gap-2 transition-colors self-start md:self-auto shadow-xs"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>بناء وتصميم عرض جديد</span>
          </button>
        </div>

        {/* Sub-Tabs */}
        <div className="flex border-b border-stone-200 mt-6 gap-2 text-xs md:text-sm font-medium">
          <button
            onClick={() => setActiveSubTab('library')}
            className={`pb-3 px-3 border-b-2 transition-colors ${
              activeSubTab === 'library'
                ? 'border-amber-700 text-amber-900 font-bold'
                : 'border-transparent text-stone-500 hover:text-stone-900'
            }`}
          >
            مكتبة قوالب العروض ({PROMOTION_TEMPLATES_LIBRARY.length})
          </button>
          <button
            onClick={() => setActiveSubTab('builder')}
            className={`pb-3 px-3 border-b-2 transition-colors ${
              activeSubTab === 'builder'
                ? 'border-amber-700 text-amber-900 font-bold'
                : 'border-transparent text-stone-500 hover:text-stone-900'
            }`}
          >
            منشئ وفاحص الأمان المالي
          </button>
          <button
            onClick={() => setActiveSubTab('calendar')}
            className={`pb-3 px-3 border-b-2 transition-colors ${
              activeSubTab === 'calendar'
                ? 'border-amber-700 text-amber-900 font-bold'
                : 'border-transparent text-stone-500 hover:text-stone-900'
            }`}
          >
            تقويم العروض المخططة ({promotions.length})
          </button>
          <button
            onClick={() => setActiveSubTab('diagnostic')}
            className={`pb-3 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeSubTab === 'diagnostic'
                ? 'border-amber-700 text-amber-900 font-bold'
                : 'border-transparent text-stone-500 hover:text-stone-900'
            }`}
          >
            <span>تشخيص ظاهرة انتظار الأوكازيون</span>
            {waitingDiagnostic.waitingProblemSeverity === 'CRITICAL' && (
              <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
            )}
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: TEMPLATES LIBRARY */}
      {activeSubTab === 'library' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {PROMOTION_TEMPLATES_LIBRARY.map((tpl) => (
            <div
              key={tpl.id}
              className="bg-white rounded-xl border border-stone-200 p-5 flex flex-col justify-between hover:shadow-xs transition-shadow space-y-4"
            >
              <div>
                <span className="text-[11px] font-mono text-stone-400 block mb-1">{tpl.id}</span>
                <h3 className="font-bold text-stone-900 text-sm">{tpl.titleArabic}</h3>
                <p className="text-xs text-stone-600 mt-1 leading-relaxed">{tpl.shortDescription}</p>

                <div className="my-3 pt-3 border-t border-stone-100 space-y-2 text-xs">
                  <div>
                    <strong className="text-stone-800 block text-[11px]">المشكلة التجارية التي يحلها:</strong>
                    <span className="text-stone-600 text-[11px]">{tpl.businessProblemSolved}</span>
                  </div>

                  <div>
                    <strong className="text-stone-800 block text-[11px]">المنتجات المؤهلة:</strong>
                    <span className="text-stone-600 text-[11px]">{tpl.qualifyingProductsDescription}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => setSelectedTemplate(tpl)}
                  className="text-stone-600 hover:text-stone-900 text-xs font-semibold hover:underline"
                >
                  عرض تفاصيل الاستخدام والمحاذير
                </button>
                <button
                  onClick={() => handleStartBuilderFromTemplate(tpl)}
                  className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-medium transition-colors"
                >
                  استخدام القالب
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Template Details Modal */}
      {selectedTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 border border-stone-200 text-stone-900 space-y-4 text-xs">
            <div className="flex items-start justify-between border-b border-stone-100 pb-3">
              <div>
                <span className="font-mono text-stone-400 text-[11px]">{selectedTemplate.id}</span>
                <h3 className="font-bold text-stone-900 text-base">{selectedTemplate.titleArabic}</h3>
              </div>
              <button
                onClick={() => setSelectedTemplate(null as unknown as PromotionTemplate)}
                className="text-stone-400 hover:text-stone-700 text-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-stone-700 leading-relaxed">
              <div>
                <strong className="text-stone-900 block mb-0.5">الهدف والمشكلة التجارية:</strong>
                <p>{selectedTemplate.businessProblemSolved}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-200">
                  <strong className="text-emerald-900 block mb-1">متى يُنصح باستخدامه؟ (✓)</strong>
                  <ul className="list-disc list-inside space-y-1 text-emerald-800 text-[11px]">
                    {selectedTemplate.whenToUse.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-3 bg-rose-50/50 rounded-lg border border-rose-200">
                  <strong className="text-rose-900 block mb-1">متى يُمنع استخدامه؟ (✕)</strong>
                  <ul className="list-disc list-inside space-y-1 text-rose-800 text-[11px]">
                    {selectedTemplate.whenNotToUse.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div>
                <strong className="text-stone-900 block mb-0.5">كيف تُحسب التكلفة والأثر المالي؟</strong>
                <p>{selectedTemplate.costCalculationExplanation}</p>
              </div>

              <div>
                <strong className="text-stone-900 block mb-0.5">كيف نقيس نجاح العرض بعد انتهائه؟</strong>
                <p>{selectedTemplate.successMetricsExplanation}</p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
              <button
                onClick={() => setSelectedTemplate(null as unknown as PromotionTemplate)}
                className="px-4 py-2 border border-stone-300 rounded-lg text-stone-700 hover:bg-stone-50"
              >
                إغلاق
              </button>
              <button
                onClick={() => {
                  const tpl = selectedTemplate;
                  setSelectedTemplate(null as unknown as PromotionTemplate);
                  handleStartBuilderFromTemplate(tpl);
                }}
                className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-lg font-bold"
              >
                تطبيق هذا القالب في منشئ العروض
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: BUILDER & FINANCIAL SAFETY CHECKER */}
      {activeSubTab === 'builder' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Builder Form (7 cols) */}
          <form
            onSubmit={handleCreatePromotionSubmit}
            className="lg:col-span-7 bg-white p-6 rounded-2xl border border-stone-200 space-y-5 text-xs"
          >
            <h3 className="text-sm font-bold text-stone-900 border-b border-stone-100 pb-2">
              تصميم وتكوين العرض التجاري
            </h3>

            <div>
              <label className="block text-stone-700 font-semibold mb-1">القالب الترويجي المعتمد:</label>
              <select
                value={builderTemplate.id}
                onChange={(e) => {
                  const tpl = PROMOTION_TEMPLATES_LIBRARY.find((t) => t.id === e.target.value);
                  if (tpl) {
                    setBuilderTemplate(tpl);
                    setBuilderTitle(tpl.titleArabic);
                  }
                }}
                className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2.5 text-stone-900 font-medium"
              >
                {PROMOTION_TEMPLATES_LIBRARY.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.titleArabic}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-stone-700 font-semibold mb-1">عنوان العرض المعروض للزبون:</label>
              <input
                type="text"
                required
                value={builderTitle}
                onChange={(e) => setBuilderTitle(e.target.value)}
                className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2.5 text-stone-900 text-sm font-bold"
              />
            </div>

            {/* Product Picker */}
            <div>
              <label className="block text-stone-700 font-semibold mb-1">
                اختر المنتجات المشمولة بالعرض ({builderSelectedProductIds.length} محددة):
              </label>
              <div className="max-h-48 overflow-y-auto border border-stone-200 rounded-lg p-2 space-y-1.5 bg-stone-50">
                {products.map((p) => {
                  const isSelected = builderSelectedProductIds.includes(p.id);
                  return (
                    <label
                      key={p.id}
                      className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                        isSelected ? 'bg-amber-100/70 border border-amber-300' : 'bg-white hover:bg-stone-100'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleProductInBuilder(p.id)}
                          className="accent-amber-700"
                        />
                        <span className="font-medium text-stone-900">{p.name}</span>
                        <span className="text-[11px] text-stone-500">({CATEGORY_LABELS[p.category]})</span>
                      </div>
                      <span className="font-bold text-stone-800">{formatEGP(p.currentSellingPrice)}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Offer Pricing */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-stone-700 font-bold mb-1">سعر العرض الإجمالي (ج.م) *:</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={builderOfferPrice}
                  onChange={(e) => setBuilderOfferPrice(Number(e.target.value))}
                  className="w-full bg-amber-50/50 border-2 border-amber-500 rounded-lg p-2.5 text-stone-900 text-base font-bold text-center"
                />
              </div>

              <div>
                <label className="block text-stone-700 font-semibold mb-1">مجموع الأسعار الأصلية:</label>
                <div className="p-2.5 bg-stone-100 rounded-lg text-center font-bold text-stone-600 text-base">
                  {formatEGP(safetyReport.totalRegularPrice)}
                </div>
              </div>
            </div>

            {/* Date Window */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-stone-600 mb-1">تاريخ بداية العرض:</label>
                <input
                  type="date"
                  value={builderStartDate}
                  onChange={(e) => setBuilderStartDate(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2"
                />
              </div>
              <div>
                <label className="block text-stone-600 mb-1">تاريخ نهاية العرض:</label>
                <input
                  type="date"
                  value={builderEndDate}
                  onChange={(e) => setBuilderEndDate(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2"
                />
              </div>
            </div>

            <div>
              <label className="block text-stone-600 mb-1">الهدف التجاري المحدد من العرض:</label>
              <textarea
                rows={2}
                value={builderObjective}
                onChange={(e) => setBuilderObjective(e.target.value)}
                placeholder="مثال: تسريع بيع 20 قطعة من الجواكت قبل نهاية نوفمبر لتمويل بضاعة الشتاء القادمة..."
                className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2"
              />
            </div>

            {/* Owner Approval Section if Safety Flagged */}
            {safetyReport.requiresOwnerApproval && (
              <div className="p-4 bg-rose-50 border border-rose-300 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-rose-800 font-bold">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>تنبيه أمان مالي: العرض يتطلب موافقة صريحة من صاحب المحل</span>
                </div>
                <p className="text-[11px] text-rose-700">
                  السعر المقترح يقع تحت أرضية السعر الاقتصادية أو يحقق مساهمة سالبة. لن يُسمح بتفعيل العرض إلا بموافقة صريحة مع ذكر المبرر التجاري.
                </p>
                <div>
                  <input
                    type="text"
                    placeholder="مبرر صاحب المحل (مثال: تصفية عاجلة لاسترداد السيولة قبل تبدل الموسم)"
                    value={builderOwnerNote}
                    onChange={(e) => setBuilderOwnerNote(e.target.value)}
                    className="w-full bg-white border border-rose-300 rounded-lg p-2 text-stone-900 text-xs"
                  />
                </div>
                <label className="flex items-center gap-2 text-xs font-semibold text-rose-900 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={builderExplicitApproval}
                    onChange={(e) => setBuilderExplicitApproval(e.target.checked)}
                    className="accent-rose-700"
                  />
                  <span>أوافق بصفتي صاحب المحل على تفعيل هذا العرض تحت مسؤوليتي التامة.</span>
                </label>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-sm font-bold transition-colors shadow-xs"
            >
              اعتماد وجدولة العرض في تقويم المحل
            </button>
          </form>

          {/* Safety Report Live Inspection (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white p-5 rounded-2xl border border-stone-200 space-y-4 text-xs">
              <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                <h3 className="font-bold text-stone-900 text-sm flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  تقرير الأمان المالي اللحظي للباقة
                </h3>
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                    safetyReport.isNegativeContribution
                      ? 'bg-rose-100 text-rose-800'
                      : safetyReport.isBelowEconomicFloor
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {safetyReport.safetyVerdictArabic}
                </span>
              </div>

              {/* Consequence Cards */}
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="bg-stone-50 p-2.5 rounded-lg border border-stone-200">
                  <span className="text-stone-500 block text-[11px]">مجموع تكلفة الوصول (LC)</span>
                  <span className="text-sm font-bold text-stone-900">
                    {formatEGP(safetyReport.totalLandedCost)}
                  </span>
                </div>
                <div className="bg-stone-50 p-2.5 rounded-lg border border-stone-200">
                  <span className="text-stone-500 block text-[11px]">أرضية السعر الاقتصادية</span>
                  <span className="text-sm font-bold text-stone-900">
                    {formatEGP(safetyReport.economicFloorPrice)}
                  </span>
                </div>
                <div className="bg-stone-50 p-2.5 rounded-lg border border-stone-200">
                  <span className="text-stone-500 block text-[11px]">هامش مساهمة الباقة (CM)</span>
                  <span
                    className={`text-sm font-bold ${
                      safetyReport.bundleContribution > 0 ? 'text-emerald-700' : 'text-rose-600'
                    }`}
                  >
                    {formatEGP(safetyReport.bundleContribution)}
                  </span>
                </div>
                <div className="bg-stone-50 p-2.5 rounded-lg border border-stone-200">
                  <span className="text-stone-500 block text-[11px]">نسبة الخصم الإجمالية</span>
                  <span className="text-sm font-bold text-amber-800">
                    %{safetyReport.discountPercent}
                  </span>
                </div>
              </div>

              {/* Cash Preservation Formula */}
              <div className="p-3 bg-amber-50/50 rounded-lg border border-amber-200 space-y-1">
                <span className="font-bold text-amber-950 block">مضاعف التعويض النقدي:</span>
                <p className="text-stone-700 leading-relaxed text-[11px]">
                  للحفاظ على نفس إجمالي الأرباح النقدية للمحل مقارنة ببيع القطع بالسعر الكامل، يجب أن يبيع المحل ما لا يقل عن{' '}
                  <strong className="text-amber-900 font-bold">{safetyReport.minUnitsToPreserveCash} باقات</strong>{' '}
                  من هذا العرض.
                </p>
              </div>

              {/* Warning Messages */}
              {safetyReport.warningMessages.map((w, idx) => (
                <div key={idx} className="p-2.5 bg-rose-50 border border-rose-200 rounded text-rose-800 text-[11px]">
                  {w}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: PROMOTION CALENDAR & OUTCOME TRACKER */}
      {activeSubTab === 'calendar' && (
        <div className="space-y-5">
          <div className="bg-white p-5 rounded-2xl border border-stone-200">
            <h3 className="font-bold text-stone-900 text-sm mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-700" />
              جدول العروض والترويج المجدولة للمتجر ({promotions.length} عروض)
            </h3>

            <div className="divide-y divide-stone-100">
              {promotions.map((p) => {
                const prods = products.filter((item) => p.productIds.includes(item.id));
                const isEvaluating = evaluatingPromoId === p.id;

                return (
                  <div key={p.id} className="py-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-bold text-stone-900 text-sm">{p.titleArabic}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                              p.status === 'ACTIVE'
                                ? 'bg-emerald-100 text-emerald-800'
                                : p.status === 'COMPLETED'
                                ? 'bg-stone-200 text-stone-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {p.status === 'ACTIVE' ? 'نشط حالياً' : p.status === 'COMPLETED' ? 'مكتمل ومقيّم' : 'مخطط'}
                          </span>
                        </div>
                        <p className="text-xs text-stone-500 mt-0.5">
                          الفترة: من {p.startDate} إلى {p.endDate} | الهدف: {p.objectiveNote}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-left">
                          <span className="text-[11px] text-stone-500 block">سعر العرض للباقة</span>
                          <span className="font-bold text-stone-900 text-base">{formatEGP(p.bundleOfferPrice)}</span>
                          <span className="text-[11px] text-stone-400 line-through block">
                            {formatEGP(p.bundleTotalRegularPrice)}
                          </span>
                        </div>

                        {p.status !== 'COMPLETED' && (
                          <button
                            onClick={() => {
                              setEvaluatingPromoId(p.id);
                              setEvalRevenue(p.bundleOfferPrice * 10);
                            }}
                            className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-semibold"
                          >
                            تقييم النتائج الفعلية
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Products included */}
                    <div className="flex flex-wrap gap-2 text-xs text-stone-600">
                      <span className="font-medium text-stone-800">الأصناف المشمولة:</span>
                      {prods.map((item) => (
                        <span key={item.id} className="bg-stone-100 px-2 py-0.5 rounded text-stone-700">
                          {item.name} ({formatEGP(item.currentSellingPrice)})
                        </span>
                      ))}
                    </div>

                    {/* Recorded Evaluation if present */}
                    {p.evaluation && (
                      <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs text-stone-700 space-y-1">
                        <div className="flex items-center justify-between font-bold text-stone-900">
                          <span>نتائج العرض الفعلية المسجلة:</span>
                          <span
                            className={
                              p.evaluation.verdict === 'SUCCESS'
                                ? 'text-emerald-700'
                                : p.evaluation.verdict === 'PARTIAL'
                                ? 'text-amber-700'
                                : 'text-rose-600'
                            }
                          >
                            {p.evaluation.verdict === 'SUCCESS'
                              ? '✓ نجاح مؤكد للهدف'
                              : p.evaluation.verdict === 'PARTIAL'
                              ? 'نجاح جزئي'
                              : 'غير ناجح'}
                          </span>
                        </div>
                        <p>{p.evaluation.baselineComparisonNote}</p>
                        {p.evaluation.learnings && (
                          <p className="text-stone-500">
                            <strong>الدروس المستفادة للمحل: </strong>
                            {p.evaluation.learnings}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Inline Evaluation Form */}
                    {isEvaluating && (
                      <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200 space-y-3 text-xs">
                        <strong className="text-stone-900 block font-bold">
                          تسجيل وتقييم نتائج هذا العرض بعد انتهائه:
                        </strong>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-stone-600 mb-1">الكمية المباعة فعلياً (باقة):</label>
                            <input
                              type="number"
                              min="0"
                              value={evalUnitsSold}
                              onChange={(e) => setEvalUnitsSold(Number(e.target.value))}
                              className="w-full bg-white border border-stone-300 rounded-lg p-2 font-bold"
                            />
                          </div>
                          <div>
                            <label className="block text-stone-600 mb-1">حكم التقييم النهائي:</label>
                            <select
                              value={evalVerdict}
                              onChange={(e) => setEvalVerdict(e.target.value as 'SUCCESS' | 'PARTIAL' | 'UNSUCCESSFUL')}
                              className="w-full bg-white border border-stone-300 rounded-lg p-2"
                            >
                              <option value="SUCCESS">نجح وحقق الهدف بالكامل</option>
                              <option value="PARTIAL">نجاح جزئي (مبيعات جيدة بهامش ضيق)</option>
                              <option value="UNSUCCESSFUL">لم ينجح (لم يحرك البضاعة المطلوبة)</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-stone-600 mb-1">الدروس المستفادة للمستقبل:</label>
                            <input
                              type="text"
                              placeholder="مثال: الباقة جذبت طلاب الجامعة لكن يجب توفير مقاس L أكثر..."
                              value={evalLearnings}
                              onChange={(e) => setEvalLearnings(e.target.value)}
                              className="w-full bg-white border border-stone-300 rounded-lg p-2"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            onClick={() => setEvaluatingPromoId(null)}
                            className="px-3 py-1.5 border border-stone-300 rounded-lg"
                          >
                            إلغاء
                          </button>
                          <button
                            onClick={() => handleSaveEvaluation(p)}
                            className="px-4 py-1.5 bg-stone-900 text-white rounded-lg font-bold"
                          >
                            حفظ تقييم العرض
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: WAITING PROBLEM COMMERCIAL DIAGNOSTIC */}
      {activeSubTab === 'diagnostic' && (
        <div className="space-y-5">
          <div className="bg-white p-6 rounded-2xl border border-stone-200 space-y-4 text-xs">
            <div className="flex items-start justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="font-bold text-stone-900 text-base flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-amber-700" />
                  تشخيص ظاهرة "انتظار الزبائن لأوكازيون نهاية الموسم" بأسيوط
                </h3>
                <p className="text-stone-500 mt-0.5">
                  تحليل مبني على فحص نسبة المبيعات بالسعر الكامل مقابل مبيعات التخفيضات لاختبار الفرضية التجارية.
                </p>
              </div>

              <span
                className={`px-3 py-1 rounded-lg font-bold text-xs ${
                  waitingDiagnostic.waitingProblemSeverity === 'CRITICAL'
                    ? 'bg-rose-100 text-rose-800'
                    : waitingDiagnostic.waitingProblemSeverity === 'MODERATE'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                حدة الظاهرة: {waitingDiagnostic.waitingProblemSeverity === 'CRITICAL' ? 'حرجة' : waitingDiagnostic.waitingProblemSeverity === 'MODERATE' ? 'متوسطة' : 'خفيفة وصحية'}
              </span>
            </div>

            {/* Diagnostic Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
                <span className="text-stone-500 block">إجمالي القطع المباعة بالدفتر</span>
                <span className="text-base font-bold text-stone-900">{waitingDiagnostic.totalUnitsSold} قطعة</span>
              </div>
              <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
                <span className="text-stone-500 block">مبيعات السعر الكامل</span>
                <span className="text-base font-bold text-emerald-700">{waitingDiagnostic.regularPriceUnitsSold} قطعة</span>
              </div>
              <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
                <span className="text-stone-500 block">مبيعات العروض والتخفيضات</span>
                <span className="text-base font-bold text-amber-800">{waitingDiagnostic.promotionalUnitsSold} قطعة</span>
              </div>
              <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
                <span className="text-stone-500 block">حصة المبيعات المخفضة</span>
                <span className="text-base font-bold text-stone-900">%{waitingDiagnostic.promotionalSalesSharePercent}</span>
              </div>
            </div>

            {/* Hypothesis explanation */}
            <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
              <strong className="text-stone-900 block font-bold text-sm">
                تقييم الفرضية التجارية بناءً على بيانات المتجر الفعلية:
              </strong>
              <p className="text-stone-700 leading-relaxed">{waitingDiagnostic.hypothesisEvaluationArabic}</p>
            </div>

            {/* Recommended Countermeasures */}
            <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-200 space-y-2">
              <strong className="text-amber-950 block font-bold text-sm">
                الإجراءات والسياسات الوقائية الموصى بها لحماية مبيعات أول الموسم:
              </strong>
              <ul className="list-disc list-inside space-y-1.5 text-stone-800">
                {waitingDiagnostic.recommendedCountermeasures.map((cm, idx) => (
                  <li key={idx}>{cm}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
