import React, { useState, useRef } from 'react';
import {
  StoreFixedSettings,
  ProductRecord,
  MarketObservation,
  CommercialSeasonEvent,
  StorePromotion,
} from '../types/pricing';
import {
  exportBackupJSON,
  exportProductsCSV,
  exportObservationsCSV,
  parseProductsCSV,
  resetAllDataToSeed,
} from '../utils/storage';
import { formatEGP, formatPercent } from '../utils/formatters';
import {
  Save,
  Download,
  Upload,
  RotateCcw,
  Building,
  Database,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';

interface SettingsViewProps {
  storeSettings: StoreFixedSettings;
  products: ProductRecord[];
  observations: MarketObservation[];
  seasons: CommercialSeasonEvent[];
  promotions: StorePromotion[];
  onSaveSettings: (settings: StoreFixedSettings) => void;
  onRestoreData: (
    products: ProductRecord[],
    observations: MarketObservation[],
    settings: StoreFixedSettings,
    seasons?: CommercialSeasonEvent[],
    promotions?: StorePromotion[]
  ) => void;
  onImportCsvProducts: (imported: ProductRecord[]) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  storeSettings,
  products,
  observations,
  seasons,
  promotions,
  onSaveSettings,
  onRestoreData,
  onImportCsvProducts,
}) => {
  const [fixedExpenses, setFixedExpenses] = useState<number>(storeSettings.monthlyFixedExpenses);
  const [monthlyUnits, setMonthlyUnits] = useState<number>(storeSettings.expectedMonthlyUnitSales);
  const [minCMR, setMinCMR] = useState<number>(Math.round(storeSettings.minAcceptableCMR * 100));
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  const jsonFileInputRef = useRef<HTMLInputElement>(null);
  const csvFileInputRef = useRef<HTMLInputElement>(null);

  const handleSaveStoreSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: StoreFixedSettings = {
      monthlyFixedExpenses: Number(fixedExpenses),
      expectedMonthlyUnitSales: Number(monthlyUnits),
      minAcceptableCMR: Number(minCMR) / 100,
    };
    onSaveSettings(updated);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleJSONFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);

        if (!parsed.products || !Array.isArray(parsed.products)) {
          alert('الملف غير صالح: لا يحتوي على مصفوفة منتجات صحيحة.');
          return;
        }

        const confirmMsg = `تنبيه أمان: استرجاع النسخة الاحتياطية سيستبدل البيانات الحالية (${products.length} صنف و ${observations.length} رصد سوقي). هل تريد المتابعة واسترجاع ${parsed.products.length} صنف؟`;
        if (confirm(confirmMsg)) {
          const restoredProducts = parsed.products as ProductRecord[];
          const restoredObs = (parsed.marketObservations || observations) as MarketObservation[];
          const restoredSettings = (parsed.storeSettings || storeSettings) as StoreFixedSettings;
          const restoredSeasons = (parsed.commercialSeasons || seasons) as CommercialSeasonEvent[];
          const restoredPromotions = (parsed.storePromotions || promotions) as StorePromotion[];

          onRestoreData(restoredProducts, restoredObs, restoredSettings, restoredSeasons, restoredPromotions);
          alert('تم استرجاع النسخة الاحتياطية بنجاح!');
        }
      } catch (err) {
        alert('حدث خطأ أثناء قراءة ملف JSON. تأكد من سلامة الملف.');
      }
    };
    reader.readAsText(file);
    if (jsonFileInputRef.current) jsonFileInputRef.current.value = '';
  };

  const handleCSVFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const { products: importedProds, errors } = parseProductsCSV(content);

        if (errors.length > 0) {
          alert(`تنبيه: ${errors.join('\n')}`);
        }

        if (importedProds.length === 0) {
          alert('لم يتم العثور على صفوف صالحة للاستيراد في ملف CSV.');
          return;
        }

        if (
          confirm(
            `تم استخراج ${importedProds.length} صنف بنجاح من ملف CSV. هل تريد إضافتها إلى كتالوج المحل؟`
          )
        ) {
          onImportCsvProducts(importedProds);
          alert(`تمت إضافة ${importedProds.length} صنف بنجاح.`);
        }
      } catch (err) {
        alert('حدث خطأ أثناء تحليل ملف CSV.');
      }
    };
    reader.readAsText(file);
    if (csvFileInputRef.current) csvFileInputRef.current.value = '';
  };

  const handleResetToSeed = () => {
    if (
      confirm(
        'هل أنت متأكد تماماً من رغبتك في إعادة تعيين كافة البيانات إلى بيانات العرض الافتراضية الخاصة بأسيوط؟ سيتم حذف أي تعديلات لم تقم بحفظها بنسخة احتياطية.'
      )
    ) {
      const reset = resetAllDataToSeed();
      onRestoreData(reset.products, reset.observations, reset.settings, reset.seasons, reset.promotions);
      setFixedExpenses(reset.settings.monthlyFixedExpenses);
      setMonthlyUnits(reset.settings.expectedMonthlyUnitSales);
      setMinCMR(Math.round(reset.settings.minAcceptableCMR * 100));
      alert('تمت استعادة البيانات التجريبية الافتراضية.');
    }
  };

  const estimatedFixedPerUnit = Math.round((fixedExpenses / Math.max(1, monthlyUnits)) * 100) / 100;

  return (
    <div className="space-y-6">
      {/* 1. Store Operational Fixed Overhead Settings */}
      <div className="bg-white p-6 rounded-xl border border-stone-200 space-y-4">
        <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
          <Building className="w-5 h-5 text-amber-700" />
          <div>
            <h2 className="text-base font-bold text-stone-900">
              إعدادات التكاليف الثابتة لمتجر أسيوط (Shop Overhead & Targets)
            </h2>
            <p className="text-xs text-stone-500">
              تُستخدم هذه الإعدادات لحساب أرضية السعر الاقتصادية وتقدير نصيب القطعة التخطيطي من إيجار المحل ورواتب الموظفين.
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveStoreSettings} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-stone-700 font-medium mb-1">
                إجمالي المصاريف الثابتة الشهرية للمحل (ج.م):
              </label>
              <input
                type="number"
                min="0"
                step="500"
                value={fixedExpenses}
                onChange={(e) => setFixedExpenses(Number(e.target.value))}
                className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2.5 text-stone-900 text-sm font-semibold"
              />
              <span className="text-[11px] text-stone-500 mt-1 block">
                إيجار المحل بأسيوط + رواتب الموظفين + كهرباء ومرافق
              </span>
            </div>

            <div>
              <label className="block text-stone-700 font-medium mb-1">
                حجم المبيعات الشهري المستهدف (قطع):
              </label>
              <input
                type="number"
                min="10"
                step="10"
                value={monthlyUnits}
                onChange={(e) => setMonthlyUnits(Number(e.target.value))}
                className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2.5 text-stone-900 text-sm font-semibold"
              />
              <span className="text-[11px] text-stone-500 mt-1 block">
                معدل المبيعات التقديري للقطاع الرجالي
              </span>
            </div>

            <div>
              <label className="block text-stone-700 font-medium mb-1">
                أدنى نسبة هامش مساهمة مقبولة (CMR %):
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={minCMR}
                onChange={(e) => setMinCMR(Number(e.target.value))}
                className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2.5 text-stone-900 text-sm font-semibold"
              />
              <span className="text-[11px] text-stone-500 mt-1 block">
                الحد الأدنى الذي يمنع النزيف النقدي في أرضية السعر
              </span>
            </div>
          </div>

          <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 text-xs text-stone-700 flex items-center justify-between">
            <div>
              <span>نصيب القطعة التقديري من المصاريف الثابتة: </span>
              <span className="font-bold text-stone-900">{formatEGP(estimatedFixedPerUnit)} / قطعة</span>
            </div>
            <div className="flex items-center gap-2">
              {saveSuccess && (
                <span className="text-emerald-700 font-medium flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" />
                  تم الحفظ بنجاح
                </span>
              )}
              <button
                type="submit"
                className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-lg font-bold flex items-center gap-1.5 transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                <span>حفظ التعديلات</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* 2. Data Backup & Restore */}
      <div className="bg-white p-6 rounded-xl border border-stone-200 space-y-4">
        <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
          <Database className="w-5 h-5 text-amber-700" />
          <div>
            <h2 className="text-base font-bold text-stone-900">
              النسخ الاحتياطي الكامل وإدارة البيانات (JSON & CSV)
            </h2>
            <p className="text-xs text-stone-500">
              تطبيق أوفلاين محلي بالكامل؛ احفظ نسختك الاحتياطية بانتظام لضمان عدم ضياع حساباتك.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* JSON Backup card */}
          <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-3 text-xs">
            <h3 className="font-bold text-stone-900 text-sm flex items-center gap-2">
              <Download className="w-4 h-4 text-stone-700" />
              النسخة الاحتياطية الشاملة (ملف JSON)
            </h3>
            <p className="text-stone-600 leading-relaxed">
              تحتوي على كافة المنتجات، التكاليف، سجلات الأسعار، حركات المبيعات، وأدلة السوق في ملف واحد آمن.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                onClick={() => exportBackupJSON(products, observations, storeSettings, seasons, promotions)}
                className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-lg font-medium transition-colors"
              >
                تحميل نسخة احتياطية JSON
              </button>
              <button
                onClick={() => jsonFileInputRef.current?.click()}
                className="px-4 py-2 bg-white border border-stone-300 hover:bg-stone-100 text-stone-800 rounded-lg font-medium transition-colors flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>استرجاع نسخة JSON</span>
              </button>
              <input
                ref={jsonFileInputRef}
                type="file"
                accept=".json"
                onChange={handleJSONFileSelected}
                className="hidden"
              />
            </div>
          </div>

          {/* CSV Export / Import card */}
          <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-3 text-xs">
            <h3 className="font-bold text-stone-900 text-sm flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
              تصدير واستيراد الإكسل (CSV)
            </h3>
            <p className="text-stone-600 leading-relaxed">
              تصدير المنتجات لبرامج المحاسبة والإكسل مع دعم الترميز العربي (UTF-8 BOM).
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                onClick={() => exportProductsCSV(products)}
                className="px-3 py-2 bg-white border border-stone-300 hover:bg-stone-100 text-stone-800 rounded-lg font-medium transition-colors"
              >
                تصدير المنتجات (CSV)
              </button>
              <button
                onClick={() => exportObservationsCSV(observations)}
                className="px-3 py-2 bg-white border border-stone-300 hover:bg-stone-100 text-stone-800 rounded-lg font-medium transition-colors"
              >
                تصدير أدلة السوق (CSV)
              </button>
              <button
                onClick={() => csvFileInputRef.current?.click()}
                className="px-3 py-2 bg-white border border-stone-300 hover:bg-stone-100 text-stone-800 rounded-lg font-medium transition-colors flex items-center gap-1"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>استيراد منتجات من CSV</span>
              </button>
              <input
                ref={csvFileInputRef}
                type="file"
                accept=".csv"
                onChange={handleCSVFileSelected}
                className="hidden"
              />
            </div>
          </div>
        </div>

        {/* Reset to Seed */}
        <div className="p-4 bg-rose-50/50 rounded-xl border border-rose-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div>
            <span className="font-bold text-rose-900 block flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              إعادة تعيين البيانات للوضع التجريبي الأصلي
            </span>
            <span className="text-stone-600">
              يمسح التعديلات ويستعيد بيانات دراسة السوق وعينات ملابس أسيوط الافتراضية.
            </span>
          </div>
          <button
            onClick={handleResetToSeed}
            className="px-3.5 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-lg font-medium transition-colors shrink-0 self-start sm:self-auto flex items-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>استعادة البيانات الافتراضية</span>
          </button>
        </div>
      </div>
    </div>
  );
};
