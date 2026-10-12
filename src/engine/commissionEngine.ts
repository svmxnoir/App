/**
 * محرك مقارنة نماذج عمولات وحوافز موظفي المحل بأسيوط
 * Retail Commission Comparison, Incentive Modeling & Behavioral Risk Engine
 */

import { roundMoney, roundPercent } from './pricingEngine';

export interface CommissionSimulationInput {
  monthlyNetSalesRevenue: number;     // إجمالي المبيعات الصافية الشهرية (ج.م)
  monthlyLandedCostOfGoods: number;   // إجمالي تكلفة البضاعة المباعة (ج.م)
  monthlyVariableFeesCost: number;    // إجمالي مصاريف البيع المتغيرة (أكياس، فيزا) (ج.م)
  monthlyFixedShopExpenses: number;   // إيجار المحل ورواتب أساسية وكهرباء بأسيوط (ج.م)
  
  // بارامترات النماذج الثلاثة
  salesModelPercent: number;          // نسبة نموذج المبيعات % (مثلاً 2.5%)
  contributionModelPercent: number;   // نسبة نموذج المساهمة % (مثلاً 10%)
  tieredTargetMonthlySales: number;   // المستهدف لنموذج الحوافز المتدرجة (ج.م)
  tieredBaseBonus: number;            // مكافأة تحقيق الهدف الأساسي (ج.م)
  tieredOverTargetBonusPercent: number;// نسبة إضافية على ما يزيد عن المستهدف %
}

export interface CommissionModelEvaluation {
  modelType: 'NET_SALES' | 'CONTRIBUTION_MARGIN' | 'TIERED_TARGET';
  modelTitleArabic: string;
  calculationFormulaArabic: string;
  expectedCommissionExpense: number;       // تكلفة العمولة المتوقعة للموظفين (ج.م)
  netStoreContributionAfterCommission: number; // مساهمة المحل المتبقية بعد العمولة (ج.م)
  netOperatingProfit: number;              // صافي الربح التشغيلي بعد مصاريف أسيوط الثابتة (ج.م)
  effectiveCostRatePercent: number;        // نسبة العمولة الفعلية من إجمالي المبيعات %
  handlingReturnsAndDiscountsArabic: string;
  unintendedIncentivesRiskArabic: string;
  justificationTargetArabic: string;
  recommendationVerdict: string;
}

export interface CommissionComparisonReport {
  grossStoreContribution: number;      // إجمالي مساهمة المحل قبل العمولات
  grossMarginPercent: number;          // نسبة مجمل الربح
  models: CommissionModelEvaluation[];
  strategicComparisonAdviceArabic: string;
}

export function compareCommissionModels(
  input: CommissionSimulationInput
): CommissionComparisonReport {
  const {
    monthlyNetSalesRevenue,
    monthlyLandedCostOfGoods,
    monthlyVariableFeesCost,
    monthlyFixedShopExpenses,
    salesModelPercent,
    contributionModelPercent,
    tieredTargetMonthlySales,
    tieredBaseBonus,
    tieredOverTargetBonusPercent,
  } = input;

  // إجمالي مساهمة المحل قبل العمولات
  const grossContribution = Math.max(
    0,
    monthlyNetSalesRevenue - monthlyLandedCostOfGoods - monthlyVariableFeesCost
  );
  const grossMargin =
    monthlyNetSalesRevenue > 0
      ? roundPercent(((monthlyNetSalesRevenue - monthlyLandedCostOfGoods) / monthlyNetSalesRevenue) * 100)
      : 0;

  // 1. نموذج نسبة من صافي المبيعات (Net Sales %)
  const salesCommExpense = roundMoney(monthlyNetSalesRevenue * (salesModelPercent / 100));
  const salesNetContrib = roundMoney(grossContribution - salesCommExpense);
  const salesOperatingProfit = roundMoney(salesNetContrib - monthlyFixedShopExpenses);

  const model1: CommissionModelEvaluation = {
    modelType: 'NET_SALES',
    modelTitleArabic: 'النموذج التقليدي: نسبة من صافي المبيعات',
    calculationFormulaArabic: `قيمة المبيعات (${monthlyNetSalesRevenue.toLocaleString()} ج.م) × ${salesModelPercent}%`,
    expectedCommissionExpense: salesCommExpense,
    netStoreContributionAfterCommission: salesNetContrib,
    netOperatingProfit: salesOperatingProfit,
    effectiveCostRatePercent: salesModelPercent,
    handlingReturnsAndDiscountsArabic:
      'تُخصم المرتجعات من إجمالي الفاتورة الصافية. ولكن الخصومات التي يمنحها البائع لا تخصم من عمولته، بل تُحسب العمولة على السعر بعد الخصم.',
    unintendedIncentivesRiskArabic:
      '⚠️ خطر سلوكي حرج: يدفع البائع للمطالبة بخصومات كبيرة وسريعة لإتمام البيع بأي ثمن لرفع قيمة الفاتورة، لأن الخصم يقلل ربح صاحب المحل بنسبة 100% بينما لا ينقص عمولة البائع إلا بنسبة 2.5% فقط!',
    justificationTargetArabic: `يتطلب تحقيق مبيعات لا تقل عن ${Math.round(monthlyFixedShopExpenses / Math.max(0.1, grossContribution / monthlyNetSalesRevenue)).toLocaleString()} ج.م لتغطية مصاريف المحل.`,
    recommendationVerdict:
      'بسيط ومفهوم للبائع، ولكنه خطير في فترات الركود أو عند منح البائع صلاحية إعطاء خصومات.',
  };

  // 2. نموذج نسبة من هامش المساهمة الحقيقي (Contribution Margin %)
  const contribCommExpense = roundMoney(grossContribution * (contributionModelPercent / 100));
  const contribNetStore = roundMoney(grossContribution - contribCommExpense);
  const contribOperatingProfit = roundMoney(contribNetStore - monthlyFixedShopExpenses);
  const contribEffectiveRate =
    monthlyNetSalesRevenue > 0 ? roundPercent((contribCommExpense / monthlyNetSalesRevenue) * 100) : 0;

  const model2: CommissionModelEvaluation = {
    modelType: 'CONTRIBUTION_MARGIN',
    modelTitleArabic: 'النموذج الاحترافي: نسبة من هامش المساهمة الحقيقي',
    calculationFormulaArabic: `إجمالي المساهمة الربحية (${grossContribution.toLocaleString()} ج.م) × ${contributionModelPercent}%`,
    expectedCommissionExpense: contribCommExpense,
    netStoreContributionAfterCommission: contribNetStore,
    netOperatingProfit: contribOperatingProfit,
    effectiveCostRatePercent: contribEffectiveRate,
    handlingReturnsAndDiscountsArabic:
      'تُخصم المرتجعات بالكامل. وأي خصم يمنحه البائع ينقص مباشرة من وعاء العمولة، مما يحمي هامش ربح المحل.',
    unintendedIncentivesRiskArabic:
      '✓ سلوك منضبط وإيجابي: يتجنب البائع تقديم خصومات عشوائية، ويسعى لبيع الأصناف ذات الربحية العالية والتقفيل الممتاز لأن عمولته ترتفع مع كل جنيه ربح حقيقي.',
    justificationTargetArabic:
      'العمولة تدفع نفسها بنفسها؛ فإذا انعدم الربح انعدمت العمولة تلقائياً، ما يحمي المحل من الخسارة.',
    recommendationVerdict:
      'الخيار الأمثل لمتاجر أسيوط لحماية رأس المال وربط مصلحة البائع بمصلحة صاحب المحل مباشرة.',
  };

  // 3. نموذج الحوافز المتدرجة المربوطة بالهدف (Tiered Target)
  let tieredExpense = 0;
  let targetAchieved = false;
  if (monthlyNetSalesRevenue >= tieredTargetMonthlySales) {
    targetAchieved = true;
    tieredExpense = tieredBaseBonus;
    const excess = monthlyNetSalesRevenue - tieredTargetMonthlySales;
    if (excess > 0) {
      tieredExpense += excess * (tieredOverTargetBonusPercent / 100);
    }
  }
  tieredExpense = roundMoney(tieredExpense);
  const tieredNetStore = roundMoney(grossContribution - tieredExpense);
  const tieredOperatingProfit = roundMoney(tieredNetStore - monthlyFixedShopExpenses);
  const tieredEffectiveRate =
    monthlyNetSalesRevenue > 0 ? roundPercent((tieredExpense / monthlyNetSalesRevenue) * 100) : 0;

  const model3: CommissionModelEvaluation = {
    modelType: 'TIERED_TARGET',
    modelTitleArabic: 'نموذج الحافز المتدرج (المكافأة المشروطة بالهدف)',
    calculationFormulaArabic: targetAchieved
      ? `تحقق الهدف (${tieredTargetMonthlySales.toLocaleString()} ج.م): مكافأة ${tieredBaseBonus} ج.م + نسبة على الزيادة`
      : `لم يتحقق الهدف المستهدف (${tieredTargetMonthlySales.toLocaleString()} ج.م): صفر عمولة إضافية`,
    expectedCommissionExpense: tieredExpense,
    netStoreContributionAfterCommission: tieredNetStore,
    netOperatingProfit: tieredOperatingProfit,
    effectiveCostRatePercent: tieredEffectiveRate,
    handlingReturnsAndDiscountsArabic:
      'لا تُصرف المكافأة إلا بعد استبعاد المرتجعات والتأكد من ثبات المبيعات بعد نهاية الشهر.',
    unintendedIncentivesRiskArabic:
      '⚠️ خطر التلاعب بنهاية الشهر: إذا اقترب البائع من تحقيق التارجت، قد يضغط على الزبائن أو يؤجل فواتير من شهر لآخر للاستفادة من قفزة المكافأة.',
    justificationTargetArabic: `الهدف المحدد (${tieredTargetMonthlySales.toLocaleString()} ج.م) يضمن تغطية المصاريف الثابتة بأسيوط وتحقيق فائض ربحي مؤكد.`,
    recommendationVerdict:
      'ممتاز في مواسم الذروة (مثل شهر رمضان والأعياد وبداية الشتاء) لتحفيز طاقة البيع الجماعية.',
  };

  const advice =
    '💡 **توصية المحلل التجاري لمتاجر أسيوط:** تجنب الاعتماد على نسبة مجردة من المبيعات إذا كان البائع مخولاً بالفصال مع الزبائن. الجمع بين **نسبة من هامش المساهمة (8-10%)** مع **مكافأة موسمية مشروطة في الأعياد** يوفر الحماية الكاملة للمحل ويحفز طاقم العمل بإنصاف.';

  return {
    grossStoreContribution: grossContribution,
    grossMarginPercent: grossMargin,
    models: [model1, model2, model3],
    strategicComparisonAdviceArabic: advice,
  };
}
