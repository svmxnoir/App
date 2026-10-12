import React, { useState, useEffect } from 'react';
import {
  ProductRecord,
  MarketObservation,
  StoreFixedSettings,
  CommercialSeasonEvent,
  StorePromotion,
} from './types/pricing';
import {
  loadStoredProducts,
  saveProducts,
  loadStoredObservations,
  saveObservations,
  loadStoreSettings,
  saveStoreSettings,
  loadStoredSeasons,
  saveSeasons,
  loadStoredPromotions,
  savePromotions,
} from './utils/storage';
import { calculateProductFinancials } from './engine/pricingEngine';
import { formatEGP } from './utils/formatters';

import { OverviewView } from './components/OverviewView';
import { ProductsView } from './components/ProductsView';
import { CalculatorView } from './components/CalculatorView';
import { PromotionsView } from './components/PromotionsView';
import { CommissionToolView } from './components/CommissionToolView';
import { MarketView } from './components/MarketView';
import { TestSuiteView } from './components/TestSuiteView';
import { SettingsView } from './components/SettingsView';
import { ProductDetailModal } from './components/ProductDetailModal';

import {
  LayoutDashboard,
  Package,
  Calculator,
  Building2,
  FileCheck2,
  Settings,
  AlertTriangle,
  Store,
  Sparkles,
  Users,
} from 'lucide-react';

export type MainTab =
  | 'overview'
  | 'products'
  | 'calculator'
  | 'promotions'
  | 'commission'
  | 'market'
  | 'tests'
  | 'data';

export default function App() {
  const [products, setProducts] = useState<ProductRecord[]>(() => loadStoredProducts());
  const [observations, setObservations] = useState<MarketObservation[]>(() =>
    loadStoredObservations()
  );
  const [storeSettings, setStoreSettings] = useState<StoreFixedSettings>(() => loadStoreSettings());
  const [seasons, setSeasons] = useState<CommercialSeasonEvent[]>(() => loadStoredSeasons());
  const [promotions, setPromotions] = useState<StorePromotion[]>(() => loadStoredPromotions());

  const [activeTab, setActiveTab] = useState<MainTab>('overview');
  const [selectedProductForDetail, setSelectedProductForDetail] = useState<ProductRecord | null>(
    null
  );

  // حفظ التعديلات في التخزين المحلي
  useEffect(() => {
    saveProducts(products);
  }, [products]);

  useEffect(() => {
    saveObservations(observations);
  }, [observations]);

  useEffect(() => {
    saveStoreSettings(storeSettings);
  }, [storeSettings]);

  useEffect(() => {
    saveSeasons(seasons);
  }, [seasons]);

  useEffect(() => {
    savePromotions(promotions);
  }, [promotions]);

  // دوال إدارة المنتجات
  const handleUpdateProduct = (updated: ProductRecord) => {
    setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    if (selectedProductForDetail?.id === updated.id) {
      setSelectedProductForDetail(updated);
    }
  };

  const handleAddProduct = (newProd: ProductRecord) => {
    setProducts((prev) => [newProd, ...prev]);
  };

  const handleDeleteProduct = (productId: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== productId));
    if (selectedProductForDetail?.id === productId) {
      setSelectedProductForDetail(null);
    }
  };

  // دوال إدارة العروض والمواسم
  const handleSavePromotion = (newPromo: StorePromotion) => {
    setPromotions((prev) => [newPromo, ...prev]);
  };

  const handleUpdatePromotion = (updatedPromo: StorePromotion) => {
    setPromotions((prev) => prev.map((p) => (p.id === updatedPromo.id ? updatedPromo : p)));
  };

  const handleUpdateSeasons = (newSeasons: CommercialSeasonEvent[]) => {
    setSeasons(newSeasons);
  };

  // دوال إدارة أدلة السوق
  const handleAddObservation = (newObs: MarketObservation) => {
    setObservations((prev) => [newObs, ...prev]);
  };

  const handleUpdateObservationStatus = (
    id: string,
    newStatus: MarketObservation['verificationStatus']
  ) => {
    setObservations((prev) =>
      prev.map((obs) => (obs.id === id ? { ...obs, verificationStatus: newStatus } : obs))
    );
  };

  const handleDeleteObservation = (id: string) => {
    setObservations((prev) => prev.filter((obs) => obs.id !== id));
  };

  // دوال استرجاع واستيراد البيانات
  const handleRestoreData = (
    restoredProducts: ProductRecord[],
    restoredObs: MarketObservation[],
    restoredSettings: StoreFixedSettings,
    restoredSeasons?: CommercialSeasonEvent[],
    restoredPromotions?: StorePromotion[]
  ) => {
    setProducts(restoredProducts);
    setObservations(restoredObs);
    setStoreSettings(restoredSettings);
    if (restoredSeasons) setSeasons(restoredSeasons);
    if (restoredPromotions) setPromotions(restoredPromotions);
  };

  const handleImportCsvProducts = (imported: ProductRecord[]) => {
    setProducts((prev) => [...imported, ...prev]);
  };

  // حساب مؤشرات سريعة للشريط العلوي
  const belowFloorAlertsCount = products.filter((p) => {
    const fin = calculateProductFinancials(p, storeSettings);
    return fin.isBelowEconomicFloor;
  }).length;

  return (
    <div className="min-h-screen bg-stone-100/70 text-stone-900 flex flex-col font-sans" dir="rtl">
      {/* Top Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-40 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-stone-900 text-amber-400 flex items-center justify-center font-bold text-lg shadow-xs">
              <Store className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-base md:text-lg text-stone-900 leading-tight">
                  منظومة القرار والتسعير التكيفي لملابس الرجال
                </h1>
                <span className="text-[11px] font-semibold text-amber-900 bg-amber-100/80 px-2 py-0.5 rounded">
                  أسيوط / مصر
                </span>
              </div>
              <p className="text-[11px] text-stone-500 mt-0.5">
                دعم القرار التجاري · حماية هامش المساهمة · سياسة العروض وتحفيز المبيعات
              </p>
            </div>
          </div>

          {/* Quick Header Metric Info */}
          <div className="flex items-center gap-3 text-xs self-end sm:self-auto">
            <div className="text-left hidden sm:block">
              <span className="text-[11px] text-stone-500 block">أصناف الكتالوج</span>
              <span className="font-bold text-stone-900">{products.length} صنف</span>
            </div>

            {belowFloorAlertsCount > 0 && (
              <button
                onClick={() => setActiveTab('overview')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs font-semibold hover:bg-rose-100 transition-colors"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                <span>{belowFloorAlertsCount} صنف تحت أرضية التكلفة!</span>
              </button>
            )}
          </div>
        </div>

        {/* Primary Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex overflow-x-auto border-t border-stone-100 text-xs md:text-sm font-medium">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'overview'
                ? 'border-amber-700 text-amber-900 font-bold bg-amber-50/30'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>نظرة عامة والقرارات (الأسئلة الأربعة)</span>
          </button>

          <button
            onClick={() => setActiveTab('products')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'products'
                ? 'border-amber-700 text-amber-900 font-bold bg-amber-50/30'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>دليل المنتجات والمخزون</span>
          </button>

          <button
            onClick={() => setActiveTab('calculator')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'calculator'
                ? 'border-amber-700 text-amber-900 font-bold bg-amber-50/30'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            <Calculator className="w-4 h-4" />
            <span>الحاسبة ومحاكي الأسعار</span>
          </button>

          <button
            onClick={() => setActiveTab('promotions')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'promotions'
                ? 'border-amber-700 text-amber-900 font-bold bg-amber-50/30'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-700" />
            <span>مكتبة وسياسة العروض الترويجية</span>
          </button>

          <button
            onClick={() => setActiveTab('commission')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'commission'
                ? 'border-amber-700 text-amber-900 font-bold bg-amber-50/30'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>عمولات وحوافز الموظفين</span>
          </button>

          <button
            onClick={() => setActiveTab('market')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'market'
                ? 'border-amber-700 text-amber-900 font-bold bg-amber-50/30'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>مرصد السوق والأدلة</span>
          </button>

          <button
            onClick={() => setActiveTab('tests')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'tests'
                ? 'border-amber-700 text-amber-900 font-bold bg-amber-50/30'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            <FileCheck2 className="w-4 h-4" />
            <span>المختبر المحاسبي</span>
          </button>

          <button
            onClick={() => setActiveTab('data')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'data'
                ? 'border-amber-700 text-amber-900 font-bold bg-amber-50/30'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>البيانات والنسخ الاحتياطي</span>
          </button>
        </div>
      </header>

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        {activeTab === 'overview' && (
          <OverviewView
            products={products}
            allObservations={observations}
            storeSettings={storeSettings}
            seasons={seasons}
            onSelectProduct={(p) => setSelectedProductForDetail(p)}
            onNavigateToTab={(tab) => setActiveTab(tab)}
            onUpdateSeasons={handleUpdateSeasons}
          />
        )}

        {activeTab === 'products' && (
          <ProductsView
            products={products}
            storeSettings={storeSettings}
            onSelectProduct={(p) => setSelectedProductForDetail(p)}
            onAddProduct={handleAddProduct}
            onUpdateProduct={handleUpdateProduct}
            onDeleteProduct={handleDeleteProduct}
          />
        )}

        {activeTab === 'calculator' && (
          <CalculatorView
            products={products}
            allObservations={observations}
            storeSettings={storeSettings}
          />
        )}

        {activeTab === 'promotions' && (
          <PromotionsView
            products={products}
            promotions={promotions}
            seasons={seasons}
            storeSettings={storeSettings}
            onSavePromotion={handleSavePromotion}
            onUpdatePromotion={handleUpdatePromotion}
          />
        )}

        {activeTab === 'commission' && (
          <CommissionToolView
            products={products}
            storeSettings={storeSettings}
          />
        )}

        {activeTab === 'market' && (
          <MarketView
            observations={observations}
            onAddObservation={handleAddObservation}
            onUpdateObservationStatus={handleUpdateObservationStatus}
            onDeleteObservation={handleDeleteObservation}
          />
        )}

        {activeTab === 'tests' && <TestSuiteView />}

        {activeTab === 'data' && (
          <SettingsView
            storeSettings={storeSettings}
            products={products}
            observations={observations}
            seasons={seasons}
            promotions={promotions}
            onSaveSettings={(s) => setStoreSettings(s)}
            onRestoreData={handleRestoreData}
            onImportCsvProducts={handleImportCsvProducts}
          />
        )}
      </main>

      {/* Product Detail Modal */}
      {selectedProductForDetail && (
        <ProductDetailModal
          product={selectedProductForDetail}
          allObservations={observations}
          storeSettings={storeSettings}
          onClose={() => setSelectedProductForDetail(null)}
          onUpdateProduct={handleUpdateProduct}
        />
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-stone-200 py-4 text-center text-xs text-stone-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            محرك التسعير المرن لملابس الرجال في مصر (أسيوط) · نموذج حسابي وتجاري متوافق مع واقع التجزئة
          </span>
          <span className="font-mono text-[11px] text-stone-400">
            أوفلاين محلي بالكامل · لا يتطلب إنترنت أو حسابات مدفوعة
          </span>
        </div>
      </footer>
    </div>
  );
}
