import React, { useState } from 'react';
import { StoreFixedSettings, ProductRecord } from '../types/pricing';
import {
  compareCommissionModels,
  CommissionSimulationInput,
  CommissionComparisonReport,
} from '../engine/commissionEngine';
import { formatEGP, formatPercent } from '../utils/formatters';
import {
  Users,
  ShieldCheck,
  AlertTriangle,
  TrendingUp,
  Percent,
  Award,
  HelpCircle,
  Scale,
} from 'lucide-react';

interface CommissionToolViewProps {
  products: ProductRecord[];
  storeSettings: StoreFixedSettings;
}

export const CommissionToolView: React.FC<CommissionToolViewProps> = ({
  products,
  storeSettings,
}) => {
  // حساب المبيعات والتكاليف الشهرية التقديرية من المنتجات أو المدخلات
  const [netSalesRevenue, setNetSalesRevenue] = useState<number>(120000); // 120,000 ج.م مبيعات شهرية
  const [landedCostOfGoods, setLandedCostOfGoods] = useState<number>(68000); // 68,000 ج.م تكلفة بضاعة
  const [variableFeesCost, setVariableFeesCost] = useState<number>(4500); // 4,500 ج.م أكياس وعمولات فيزا
  const [fixedShopExpenses, setFixedShopExpenses] = useState<number>(storeSettings.monthlyFixedExpenses);

  // معايير النماذج
  const [salesModelPercent, setSalesModelPercent] = useState<number>(2.5);
  const [contribModelPercent, setContribModelPercent] = useState<number>(10.0);
  const [tieredTargetSales, setTieredTargetSales] = useState<number>(110000);
  const [tieredBaseBonus, setTieredBaseBonus] = useState<number>(2500);
  const [tieredOverTargetPercent, setTieredOverTargetPercent] = useState<number>(4.0);

  const simulationInput: CommissionSimulationInput = {
    monthlyNetSalesRevenue: Number(netSalesRevenue),
    monthlyLandedCostOfGoods: Number(landedCostOfGoods),
    monthlyVariableFeesCost: Number(variableFeesCost),
    monthlyFixedShopExpenses: Number(fixedShopExpenses),
    salesModelPercent: Number(salesModelPercent),
    contributionModelPercent: Number(contribModelPercent),
    tieredTargetMonthlySales: Number(tieredTargetSales),
    tieredBaseBonus: Number(tieredBaseBonus),
    tieredOverTargetBonusPercent: Number(tieredOverTargetPercent),
  };

  const report: CommissionComparisonReport = compareCommissionModels(simulationInput);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-stone-200">
        <div className="flex items-center gap-2 text-amber-700 text-xs font-semibold mb-1">
          <Users className="w-4 h-4 text-amber-700" />
          <span>منظومة إدارة وتحفيز فريق مبيعات المحل</span>
        </div>
        <h2 className="text-lg md:text-xl font-bold text-stone-900">
          أداة مقارنة وتحليل نماذج عمولات وحوافز الموظفين
        </h2>
        <p className="text-xs text-stone-600 mt-1 max-w-2xl leading-relaxed">
          دراسة ومقارنة 3 بدائل مختلفة لعمولات بائعي المحل بأسيوط، مع كشف المخاطر السلوكية لمنع تقديم خصومات عشوائية تلتهم أرباحك.
        </p>
      </div>

      {/* Inputs Grid */}
      <div className="bg-white p-5 rounded-2xl border border-stone-200 space-y-4 text-xs">
        <h3 className="font-bold text-stone-900 text-sm border-b border-stone-100 pb-2">
          1. بيانات محاكاة مبيعات وتكاليف المتجر الشهرية بأسيوط
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-stone-600 mb-1">إجمالي المبيعات الصافية الشهرية (ج.م):</label>
            <input
              type="number"
              step="5000"
              value={netSalesRevenue}
              onChange={(e) => setNetSalesRevenue(Number(e.target.value))}
              className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2.5 font-bold text-stone-900"
            />
          </div>

          <div>
            <label className="block text-stone-600 mb-1">تكلفة البضاعة المباعة LC (ج.م):</label>
            <input
              type="number"
              step="5000"
              value={landedCostOfGoods}
              onChange={(e) => setLandedCostOfGoods(Number(e.target.value))}
              className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2.5 font-bold text-stone-900"
            />
          </div>

          <div>
            <label className="block text-stone-600 mb-1">مصاريف البيع المتغيرة (أكياس/فيزا):</label>
            <input
              type="number"
              step="500"
              value={variableFeesCost}
              onChange={(e) => setVariableFeesCost(Number(e.target.value))}
              className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2.5 text-stone-900"
            />
          </div>

          <div>
            <label className="block text-stone-600 mb-1">المصاريف الثابتة بأسيوط (إيجار/كهرباء):</label>
            <input
              type="number"
              step="1000"
              value={fixedShopExpenses}
              onChange={(e) => setFixedShopExpenses(Number(e.target.value))}
              className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2.5 text-stone-900"
            />
          </div>
        </div>

        {/* Base Summary Bar */}
        <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div>
            <span className="text-stone-500">مساهمة المحل الإجمالية قبل العمولات: </span>
            <span className="font-bold text-stone-900 text-sm">
              {formatEGP(report.grossStoreContribution)}
            </span>
          </div>
          <div>
            <span className="text-stone-500">نسبة مجمل الربح من المبيعات: </span>
            <span className="font-bold text-stone-900 text-sm">{formatPercent(report.grossMarginPercent)}</span>
          </div>
          <div className="text-[11px] text-stone-500">
            * هذا الوعاء هو المصدر الحقيقي الذي يُدفع منه إيجار المحل ورواتب الموظفين
          </div>
        </div>
      </div>

      {/* Model Parameters Sliders */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        {/* Model 1 Slider */}
        <div className="bg-white p-4 rounded-xl border border-stone-200 space-y-2">
          <div className="flex justify-between items-center font-bold text-stone-900">
            <span>نسبة نموذج المبيعات:</span>
            <span className="text-amber-800">%{salesModelPercent}</span>
          </div>
          <input
            type="range"
            min="0.5"
            max="6.0"
            step="0.5"
            value={salesModelPercent}
            onChange={(e) => setSalesModelPercent(Number(e.target.value))}
            className="w-full accent-amber-700"
          />
          <span className="text-[11px] text-stone-500 block">نسبة من إجمالي ما يدفعه الزبون</span>
        </div>

        {/* Model 2 Slider */}
        <div className="bg-white p-4 rounded-xl border border-stone-200 space-y-2">
          <div className="flex justify-between items-center font-bold text-stone-900">
            <span>نسبة نموذج هامش المساهمة:</span>
            <span className="text-emerald-700">%{contribModelPercent}</span>
          </div>
          <input
            type="range"
            min="2"
            max="20"
            step="1"
            value={contribModelPercent}
            onChange={(e) => setContribModelPercent(Number(e.target.value))}
            className="w-full accent-emerald-700"
          />
          <span className="text-[11px] text-stone-500 block">نسبة من الربح الصافي المتبقي بعد التكلفة</span>
        </div>

        {/* Model 3 Inputs */}
        <div className="bg-white p-4 rounded-xl border border-stone-200 space-y-2">
          <div className="flex justify-between items-center font-bold text-stone-900">
            <span>مكافأة تارجت المبيعات:</span>
            <span className="text-purple-700">{formatEGP(tieredBaseBonus)}</span>
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="التارجت الشهري"
              value={tieredTargetSales}
              onChange={(e) => setTieredTargetSales(Number(e.target.value))}
              className="w-1/2 p-1.5 bg-stone-50 border border-stone-200 rounded text-[11px]"
            />
            <input
              type="number"
              placeholder="المكافأة ج.م"
              value={tieredBaseBonus}
              onChange={(e) => setTieredBaseBonus(Number(e.target.value))}
              className="w-1/2 p-1.5 bg-stone-50 border border-stone-200 rounded text-[11px]"
            />
          </div>
          <span className="text-[11px] text-stone-500 block">مكافأة مشروطة بتحقيق المبيعات المستهدفة</span>
        </div>
      </div>

      {/* Comparison Cards for the 3 Models */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {report.models.map((m, idx) => (
          <div
            key={idx}
            className="bg-white rounded-2xl border border-stone-200 p-5 flex flex-col justify-between space-y-4 hover:shadow-xs transition-shadow"
          >
            <div className="space-y-3">
              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-stone-100 text-stone-700 inline-block">
                البديل رقم {idx + 1}
              </span>
              <h4 className="font-bold text-stone-900 text-sm leading-tight">{m.modelTitleArabic}</h4>
              <p className="text-[11px] font-mono text-stone-600 bg-stone-50 p-2 rounded border border-stone-100">
                {m.calculationFormulaArabic}
              </p>

              {/* Financial Metrics */}
              <div className="space-y-2 pt-2 border-t border-stone-100 text-xs">
                <div className="flex justify-between">
                  <span className="text-stone-500">تكلفة العمولة الشهرية:</span>
                  <span className="font-bold text-stone-900 text-sm">{formatEGP(m.expectedCommissionExpense)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">مساهمة المحل الصافية المتبقية:</span>
                  <span className="font-bold text-emerald-800">
                    {formatEGP(m.netStoreContributionAfterCommission)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">صافي الربح التشغيلي للمحل:</span>
                  <span
                    className={`font-bold ${
                      m.netOperatingProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'
                    }`}
                  >
                    {formatEGP(m.netOperatingProfit)}
                  </span>
                </div>
              </div>

              {/* Details and Trade-offs */}
              <div className="space-y-2.5 pt-3 border-t border-stone-100 text-[11px] text-stone-700 leading-relaxed">
                <div>
                  <strong className="text-stone-900 block mb-0.5">معالجة الخصومات والمرتجعات:</strong>
                  <p>{m.handlingReturnsAndDiscountsArabic}</p>
                </div>

                <div>
                  <strong className="text-stone-900 block mb-0.5">المخاطر والتصرفات السلبية غير المقصودة:</strong>
                  <p className="text-rose-800">{m.unintendedIncentivesRiskArabic}</p>
                </div>

                <div>
                  <strong className="text-stone-900 block mb-0.5">هدف تبرير المكافأة:</strong>
                  <p>{m.justificationTargetArabic}</p>
                </div>
              </div>
            </div>

            <div className="p-2.5 bg-stone-50 rounded-xl text-[11px] text-stone-800 font-medium border border-stone-200">
              {m.recommendationVerdict}
            </div>
          </div>
        ))}
      </div>

      {/* Strategic Recommendation */}
      <div className="p-5 bg-gradient-to-l from-amber-50 to-stone-50 rounded-2xl border border-amber-200 text-xs text-stone-800 space-y-2">
        <h4 className="font-bold text-stone-900 text-sm flex items-center gap-2">
          <Scale className="w-4 h-4 text-amber-800" />
          خلاصة التحليل التجاري لتصميم سياسة العمولات في متجر أسيوط
        </h4>
        <p className="leading-relaxed">{report.strategicComparisonAdviceArabic}</p>
      </div>
    </div>
  );
};
