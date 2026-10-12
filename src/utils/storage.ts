import {
  ProductRecord,
  MarketObservation,
  StoreFixedSettings,
  ProductCategory,
  QualityTier,
  CommercialSeasonEvent,
  StorePromotion,
} from '../types/pricing';
import {
  INITIAL_PRODUCTS,
  INITIAL_MARKET_OBSERVATIONS,
  DEFAULT_STORE_SETTINGS,
  DEFAULT_COMMERCIAL_SEASONS,
  DEFAULT_STORE_PROMOTIONS,
} from '../data/seedData';

const PRODUCTS_KEY = 'assiut_retail_pricing_products_v1';
const OBSERVATIONS_KEY = 'assiut_retail_pricing_observations_v1';
const SETTINGS_KEY = 'assiut_retail_pricing_settings_v1';
const SEASONS_KEY = 'assiut_retail_pricing_seasons_v1';
const PROMOTIONS_KEY = 'assiut_retail_pricing_promotions_v1';

export function loadStoredProducts(): ProductRecord[] {
  try {
    const raw = localStorage.getItem(PRODUCTS_KEY);
    if (!raw) {
      saveProducts(INITIAL_PRODUCTS);
      return INITIAL_PRODUCTS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_PRODUCTS;
  } catch (err) {
    console.error('Error loading products from localStorage:', err);
    return INITIAL_PRODUCTS;
  }
}

export function saveProducts(products: ProductRecord[]): void {
  try {
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
  } catch (err) {
    console.error('Error saving products:', err);
  }
}

export function loadStoredObservations(): MarketObservation[] {
  try {
    const raw = localStorage.getItem(OBSERVATIONS_KEY);
    if (!raw) {
      saveObservations(INITIAL_MARKET_OBSERVATIONS);
      return INITIAL_MARKET_OBSERVATIONS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_MARKET_OBSERVATIONS;
  } catch (err) {
    console.error('Error loading market observations:', err);
    return INITIAL_MARKET_OBSERVATIONS;
  }
}

export function saveObservations(observations: MarketObservation[]): void {
  try {
    localStorage.setItem(OBSERVATIONS_KEY, JSON.stringify(observations));
  } catch (err) {
    console.error('Error saving observations:', err);
  }
}

export function loadStoreSettings(): StoreFixedSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      saveStoreSettings(DEFAULT_STORE_SETTINGS);
      return DEFAULT_STORE_SETTINGS;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error loading store settings:', err);
    return DEFAULT_STORE_SETTINGS;
  }
}

export function saveStoreSettings(settings: StoreFixedSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error('Error saving store settings:', err);
  }
}

export function loadStoredSeasons(): CommercialSeasonEvent[] {
  try {
    const raw = localStorage.getItem(SEASONS_KEY);
    if (!raw) {
      saveSeasons(DEFAULT_COMMERCIAL_SEASONS);
      return DEFAULT_COMMERCIAL_SEASONS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_COMMERCIAL_SEASONS;
  } catch (err) {
    console.error('Error loading seasons:', err);
    return DEFAULT_COMMERCIAL_SEASONS;
  }
}

export function saveSeasons(seasons: CommercialSeasonEvent[]): void {
  try {
    localStorage.setItem(SEASONS_KEY, JSON.stringify(seasons));
  } catch (err) {
    console.error('Error saving seasons:', err);
  }
}

export function loadStoredPromotions(): StorePromotion[] {
  try {
    const raw = localStorage.getItem(PROMOTIONS_KEY);
    if (!raw) {
      savePromotions(DEFAULT_STORE_PROMOTIONS);
      return DEFAULT_STORE_PROMOTIONS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_STORE_PROMOTIONS;
  } catch (err) {
    console.error('Error loading promotions:', err);
    return DEFAULT_STORE_PROMOTIONS;
  }
}

export function savePromotions(promotions: StorePromotion[]): void {
  try {
    localStorage.setItem(PROMOTIONS_KEY, JSON.stringify(promotions));
  } catch (err) {
    console.error('Error saving promotions:', err);
  }
}

export function resetAllDataToSeed(): {
  products: ProductRecord[];
  observations: MarketObservation[];
  settings: StoreFixedSettings;
  seasons: CommercialSeasonEvent[];
  promotions: StorePromotion[];
} {
  saveProducts(INITIAL_PRODUCTS);
  saveObservations(INITIAL_MARKET_OBSERVATIONS);
  saveStoreSettings(DEFAULT_STORE_SETTINGS);
  saveSeasons(DEFAULT_COMMERCIAL_SEASONS);
  savePromotions(DEFAULT_STORE_PROMOTIONS);
  return {
    products: INITIAL_PRODUCTS,
    observations: INITIAL_MARKET_OBSERVATIONS,
    settings: DEFAULT_STORE_SETTINGS,
    seasons: DEFAULT_COMMERCIAL_SEASONS,
    promotions: DEFAULT_STORE_PROMOTIONS,
  };
}

// تصدير نسخة احتياطية كاملة JSON
export function exportBackupJSON(
  products: ProductRecord[],
  observations: MarketObservation[],
  settings: StoreFixedSettings,
  seasons?: CommercialSeasonEvent[],
  promotions?: StorePromotion[]
): void {
  const payload = {
    appName: 'محرك التسعير المرن لملابس الرجال - مصر (أسيوط)',
    exportTimestamp: new Date().toISOString(),
    version: '2.0.0',
    storeSettings: settings,
    products,
    marketObservations: observations,
    commercialSeasons: seasons || DEFAULT_COMMERCIAL_SEASONS,
    storePromotions: promotions || DEFAULT_STORE_PROMOTIONS,
  };

  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(payload, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute(
    'download',
    `assiut_retail_backup_${new Date().toISOString().slice(0, 10)}.json`
  );
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

// تصدير قائمة المنتجات إلى CSV مع تضمين UTF-8 BOM لقراءة العربية في Excel
export function exportProductsCSV(products: ProductRecord[]): void {
  const headers = [
    'SKU',
    'اسم المنتج',
    'التصنيف',
    'الموديل',
    'المقاسات',
    'اللون',
    'فئة الجودة',
    'المورد',
    'كود الدفعة',
    'تاريخ الشراء',
    'سعر الشراء ج.م',
    'قطع الدفعة',
    'نولون الشحن ج.م',
    'مصاريف إضافية ج.م',
    'تكلفة مباشرة للقطعة ج.م',
    'سعر البيع الحالي ج.م',
    'هامش الربح المستهدف %',
    'الكمية المستلمة',
    'الكمية المباعة',
    'المخزون المتبقي',
  ];

  const rows = products.map((p) => {
    const remaining = Math.max(0, (p.quantityReceived || p.quantityPurchased) - (p.quantitySold || 0) - (p.quantityDamaged || 0));
    return [
      `"${p.id}"`,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.category}"`,
      `"${(p.variant || '').replace(/"/g, '""')}"`,
      `"${(p.size || '').replace(/"/g, '""')}"`,
      `"${(p.color || '').replace(/"/g, '""')}"`,
      `"${p.qualityTier}"`,
      `"${(p.supplier || '').replace(/"/g, '""')}"`,
      `"${p.purchaseBatch || ''}"`,
      `"${p.purchaseDate || ''}"`,
      p.costs.purchaseCost,
      p.costs.batchUnits,
      p.costs.batchTransportCost,
      p.costs.batchOtherExpenses,
      p.costs.directUnitCost,
      p.currentSellingPrice,
      p.targetGrossMarginPercent,
      p.quantityReceived,
      p.quantitySold,
      remaining,
    ].join(',');
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `products_assiut_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// تصدير ملاحظات السوق إلى CSV
export function exportObservationsCSV(observations: MarketObservation[]): void {
  const headers = [
    'معرف الملاحظة',
    'التصنيف',
    'فئة الجودة',
    'العلامة التجارية / المصدر',
    'اسم البائع',
    'النطاق الجغرافي',
    'المستوى التجاري',
    'السعر المعروض ج.م',
    'السعر الأصلي ج.م',
    'نسبة الخصم %',
    'المواصفات والخامة',
    'رابط المصدر',
    'مستوى التوثيق',
    'تاريخ الرصد',
    'حالة الاعتماد',
    'ملاحظات تدقيق',
  ];

  const rows = observations.map((o) => [
    `"${o.id}"`,
    `"${o.category}"`,
    `"${o.qualityTier}"`,
    `"${(o.brandName || '').replace(/"/g, '""')}"`,
    `"${(o.sellerName || '').replace(/"/g, '""')}"`,
    `"${o.geographyScope}"`,
    `"${o.commercialLevel}"`,
    o.currentPrice,
    o.originalPrice ?? '',
    o.calculatedDiscountPct ?? '',
    `"${(o.fabricComposition || '').replace(/"/g, '""')}"`,
    `"${(o.sourceUrl || '').replace(/"/g, '""')}"`,
    `"${o.sourceTier}"`,
    `"${o.observationDate}"`,
    `"${o.verificationStatus}"`,
    `"${(o.notes || '').replace(/"/g, '""')}"`,
  ].join(','));

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `market_evidence_assiut_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// استيراد ومعالجة ملف CSV للمنتجات
export function parseProductsCSV(csvText: string): { products: ProductRecord[]; errors: string[] } {
  const errors: string[] = [];
  const products: ProductRecord[] = [];

  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    errors.push('ملف CSV فارغ أو لا يحتوي على صفوف بيانات.');
    return { products, errors };
  }

  // تخطي رأس الجدول
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    // تحليل بسيط مع مراعاة الفواصل داخل علامات الاقتباس
    const parts = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(',');
    const clean = parts.map((p) => p.replace(/^"|"$/g, '').trim());

    if (clean.length < 5) continue;

    const sku = clean[0] || `SKU-IMP-${Date.now()}-${i}`;
    const name = clean[1] || `صنف مستورد ${i}`;
    const category = (clean[2] || 'basic_tshirt') as ProductCategory;
    const variant = clean[3] || 'عادي';
    const size = clean[4] || 'M, L, XL';
    const color = clean[5] || 'متعدد';
    const qualityTier = (clean[6] || 'commercial') as QualityTier;
    const supplier = clean[7] || 'مورد محلي';
    const purchaseCost = Number(clean[10]) || 100;
    const batchUnits = Number(clean[11]) || 50;
    const transportCost = Number(clean[12]) || 150;
    const directUnitCost = Number(clean[14]) || 3;
    const sellingPrice = Number(clean[15]) || purchaseCost * 1.5;

    const newProd: ProductRecord = {
      id: sku,
      name,
      category,
      variant,
      size,
      color,
      qualityTier,
      supplier,
      purchaseBatch: `BATCH-IMP-${i}`,
      purchaseDate: new Date().toISOString().slice(0, 10),
      season: 'perennial',
      quantityPurchased: batchUnits,
      quantityReceived: batchUnits,
      quantitySold: 0,
      quantityDamaged: 0,
      quantityReturned: 0,
      costs: {
        purchaseCost,
        batchUnits,
        batchTransportCost: transportCost,
        batchOtherExpenses: 0,
        directUnitCost,
      },
      variableCosts: {
        packagingUnitCost: 5,
        localDeliveryUnitCost: 0,
        paymentFeePercent: 1.5,
        salesCommissionPercent: 2.0,
        marketplaceFeePercent: 0,
      },
      targetGrossMarginPercent: 35,
      targetMarkupPercent: 50,
      currentSellingPrice: sellingPrice,
      priceHistory: [{ price: sellingPrice, date: new Date().toISOString().slice(0, 10), reason: 'استيراد من ملف CSV' }],
      salesTransactions: [],
      notes: 'تم الاستيراد من ملف خارجي',
    };

    products.push(newProd);
  }

  return { products, errors };
}
