import React, { useState } from 'react';
import {
  MarketObservation,
  ProductCategory,
  QualityTier,
  GeographyScope,
  CommercialLevel,
  SourceTier,
  VerificationStatus,
} from '../types/pricing';
import {
  formatEGP,
  formatPercent,
  CATEGORY_LABELS,
  QUALITY_TIER_LABELS,
  GEOGRAPHY_LABELS,
  COMMERCIAL_LEVEL_LABELS,
  SOURCE_TIER_LABELS,
  VERIFICATION_STATUS_LABELS,
} from '../utils/formatters';
import {
  Search,
  Plus,
  ExternalLink,
  ShieldCheck,
  Check,
  X,
  AlertCircle,
  Building2,
  MapPin,
  TrendingUp,
} from 'lucide-react';

interface MarketViewProps {
  observations: MarketObservation[];
  onAddObservation: (obs: MarketObservation) => void;
  onUpdateObservationStatus: (id: string, newStatus: VerificationStatus) => void;
  onDeleteObservation: (id: string) => void;
}

export const MarketView: React.FC<MarketViewProps> = ({
  observations,
  onAddObservation,
  onUpdateObservationStatus,
  onDeleteObservation,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [geographyFilter, setGeographyFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  // حقول إضافة رصد جديد
  const [newBrand, setNewBrand] = useState<string>('');
  const [newSeller, setNewSeller] = useState<string>('');
  const [newCategory, setNewCategory] = useState<ProductCategory>('basic_tshirt');
  const [newQuality, setNewQuality] = useState<QualityTier>('commercial');
  const [newPrice, setNewPrice] = useState<number>(250);
  const [newOriginalPrice, setNewOriginalPrice] = useState<number | ''>('');
  const [newGeography, setNewGeography] = useState<GeographyScope>('Assiut_Offline');
  const [newCommercialLevel, setNewCommercialLevel] = useState<CommercialLevel>('Retail_Public');
  const [newSourceTier, setNewSourceTier] = useState<SourceTier>('Tier_A');
  const [newSourceUrl, setNewSourceUrl] = useState<string>('');
  const [newFabric, setNewFabric] = useState<string>('قطن 100%');
  const [newStatus, setNewStatus] = useState<VerificationStatus>('Pending_Review');
  const [newNotes, setNewNotes] = useState<string>('');

  const handleCreateObservation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBrand.trim() || newPrice <= 0) {
      alert('يرجى إدخال اسم البراند / المصدر والسعر المعروض.');
      return;
    }

    const original = newOriginalPrice !== '' ? Number(newOriginalPrice) : null;
    let discountPct: number | null = null;
    if (original && original > newPrice) {
      discountPct = Math.round(((original - newPrice) / original) * 1000) / 10;
    }

    const newObs: MarketObservation = {
      id: `OBS_${Date.now().toString().slice(-6)}`,
      category: newCategory,
      qualityTier: newQuality,
      brandName: newBrand.trim(),
      sellerName: newSeller.trim() || newBrand.trim(),
      geographyScope: newGeography,
      commercialLevel: newCommercialLevel,
      currentPrice: Number(newPrice),
      originalPrice: original,
      calculatedDiscountPct: discountPct,
      fabricComposition: newFabric.trim(),
      sourceUrl: newSourceUrl.trim() || '#',
      sourceTier: newSourceTier,
      observationDate: new Date().toISOString().slice(0, 10),
      verificationStatus: newStatus,
      notes: newNotes.trim(),
    };

    onAddObservation(newObs);
    setIsAddModalOpen(false);
    setNewBrand('');
    setNewSeller('');
    setNewSourceUrl('');
    setNewNotes('');
  };

  const filtered = observations.filter((o) => {
    const matchesSearch =
      o.brandName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.sellerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.fabricComposition.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.notes.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = categoryFilter === 'all' || o.category === categoryFilter;
    const matchesGeography = geographyFilter === 'all' || o.geographyScope === geographyFilter;
    const matchesStatus = statusFilter === 'all' || o.verificationStatus === statusFilter;

    return matchesSearch && matchesCategory && matchesGeography && matchesStatus;
  });

  const approvedCount = observations.filter((o) => o.verificationStatus === 'Approved').length;
  const pendingCount = observations.filter((o) => o.verificationStatus === 'Pending_Review').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-amber-700" />
            مرصد أدلة السوق والأسعار المنافسة في مصر وأسيوط
          </h2>
          <p className="text-xs text-stone-600 mt-0.5">
            سجل موثق لملاحظات السوق (تاون تيم، ديفاكتو، إل سي وايكيكي، محلات أسيوط، وجملة العتبة والمحلة). الملاحظات المعتمدة فقط هي التي تؤثر على المؤشرات.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-semibold flex items-center gap-2 self-start transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة رصد سوقي ميداني جديد</span>
        </button>
      </div>

      {/* Summary KPI Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="bg-white p-3 rounded-xl border border-stone-200">
          <span className="text-stone-500 block">إجمالي الأدلة المرصودة</span>
          <span className="text-base font-bold text-stone-900">{observations.length} رصد</span>
        </div>
        <div className="bg-white p-3 rounded-xl border border-stone-200">
          <span className="text-stone-500 block">أدلة معتمدة تؤثر بالخوارزمية</span>
          <span className="text-base font-bold text-emerald-700">{approvedCount} معتمد</span>
        </div>
        <div className="bg-white p-3 rounded-xl border border-stone-200">
          <span className="text-stone-500 block">أدلة قيد الفحص والمراجعة</span>
          <span className="text-base font-bold text-amber-700">{pendingCount} معلق</span>
        </div>
        <div className="bg-white p-3 rounded-xl border border-stone-200">
          <span className="text-stone-500 block">نطاق التغطية الجغرافية</span>
          <span className="text-base font-bold text-stone-800">أسيوط + وطني + جملة</span>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-stone-200 flex flex-wrap items-center gap-3 text-xs">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-stone-400 absolute right-3 top-2.5" />
          <input
            type="text"
            placeholder="بحث بالعلامة التجارية، اسم المحل، الخامة..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-9 pl-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-stone-900"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-stone-700"
        >
          <option value="all">كافة الفئات</option>
          {Object.entries(CATEGORY_LABELS).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>

        <select
          value={geographyFilter}
          onChange={(e) => setGeographyFilter(e.target.value)}
          className="bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-stone-700"
        >
          <option value="all">كافة النطاقات الجغرافية</option>
          {Object.entries(GEOGRAPHY_LABELS).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-stone-700"
        >
          <option value="all">كافة حالات الاعتماد</option>
          <option value="Approved">معتمد وموثق فقط</option>
          <option value="Pending_Review">قيد المراجعة</option>
          <option value="Rejected">مرفوض</option>
        </select>
      </div>

      {/* Observations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((obs) => {
          const statusMeta = VERIFICATION_STATUS_LABELS[obs.verificationStatus];

          return (
            <div
              key={obs.id}
              className="bg-white rounded-xl border border-stone-200 p-4 space-y-3 hover:shadow-xs transition-shadow flex flex-col justify-between"
            >
              <div>
                {/* Meta Top Line */}
                <div className="flex items-center justify-between text-xs text-stone-500 mb-1">
                  <span className="font-mono">{obs.id}</span>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${statusMeta.colorClass}`}>
                    {statusMeta.label}
                  </span>
                </div>

                {/* Title & Brand */}
                <h3 className="font-bold text-stone-900 text-sm">{obs.brandName}</h3>
                <p className="text-xs text-stone-600">
                  {obs.sellerName} · {GEOGRAPHY_LABELS[obs.geographyScope]}
                </p>

                {/* Category & Scope */}
                <div className="flex items-center gap-2 text-[11px] text-stone-500 my-2 pt-2 border-t border-stone-100">
                  <span>{CATEGORY_LABELS[obs.category]}</span>
                  <span aria-hidden="true">·</span>
                  <span>{COMMERCIAL_LEVEL_LABELS[obs.commercialLevel]}</span>
                  <span aria-hidden="true">·</span>
                  <span>{SOURCE_TIER_LABELS[obs.sourceTier].split(' ')[0]}</span>
                </div>

                {/* Price Display */}
                <div className="bg-stone-50 p-3 rounded-lg border border-stone-200 my-2 flex items-baseline justify-between">
                  <div>
                    <span className="text-[11px] text-stone-500 block">السعر المعروض للبيع</span>
                    <span className="text-lg font-bold text-stone-900">
                      {formatEGP(obs.currentPrice)}
                    </span>
                  </div>
                  {obs.originalPrice && (
                    <div className="text-left">
                      <span className="text-[11px] text-stone-400 line-through block">
                        {formatEGP(obs.originalPrice)}
                      </span>
                      {obs.calculatedDiscountPct && (
                        <span className="text-xs text-rose-600 font-bold block">
                          خصم {formatPercent(obs.calculatedDiscountPct)}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Fabric & Notes */}
                {obs.fabricComposition && (
                  <p className="text-xs text-stone-700">
                    <strong className="text-stone-900">الخامة: </strong>
                    {obs.fabricComposition}
                  </p>
                )}
                {obs.notes && (
                  <p className="text-[11px] text-stone-500 mt-1 leading-relaxed bg-amber-50/50 p-2 rounded">
                    {obs.notes}
                  </p>
                )}
              </div>

              {/* Bottom Actions & Audit Controls */}
              <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
                {obs.sourceUrl && obs.sourceUrl !== '#' ? (
                  <a
                    href={obs.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-stone-600 hover:text-stone-900 flex items-center gap-1 font-medium hover:underline text-[11px]"
                  >
                    <span>فحص الرابط</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <span className="text-[11px] text-stone-400">رصد ميداني مباشر</span>
                )}

                {/* Verification Toggle */}
                <div className="flex items-center gap-1">
                  {obs.verificationStatus !== 'Approved' && (
                    <button
                      onClick={() => onUpdateObservationStatus(obs.id, 'Approved')}
                      className="px-2 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded text-[11px] font-medium"
                      title="اعتماد الرصد لإدراجه في حسابات السوق"
                    >
                      اعتماد ✓
                    </button>
                  )}
                  {obs.verificationStatus !== 'Rejected' && (
                    <button
                      onClick={() => onUpdateObservationStatus(obs.id, 'Rejected')}
                      className="px-2 py-1 bg-stone-100 hover:bg-rose-100 text-stone-600 hover:text-rose-700 rounded text-[11px]"
                      title="استبعاد الرصد"
                    >
                      استبعاد ✕
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Observation Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col border border-stone-200 text-stone-900 overflow-hidden">
            <div className="p-4 border-b border-stone-200 bg-stone-50 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-stone-900 text-base">إضافة رصد سوقي منافس جديد</h3>
                <p className="text-xs text-stone-500">
                  توثيق سعر منافس من المحلات أو المواقع مع تحديد الرابط والخامة ومستوى الدقة.
                </p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-stone-400 hover:text-stone-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateObservation} className="p-5 overflow-y-auto space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-700 font-medium mb-1">اسم العلامة التجارية / البراند *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: Town Team أو محل محلي"
                    value={newBrand}
                    onChange={(e) => setNewBrand(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2"
                  />
                </div>
                <div>
                  <label className="block text-stone-700 font-medium mb-1">اسم المتجر / البائع</label>
                  <input
                    type="text"
                    placeholder="مثال: متجر النميس أسيوط أو فرع مول"
                    value={newSeller}
                    onChange={(e) => setNewSeller(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-700 font-medium mb-1">فئة المنتج</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as ProductCategory)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2"
                  >
                    {Object.entries(CATEGORY_LABELS).map(([k, label]) => (
                      <option key={k} value={k}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-stone-700 font-medium mb-1">النطاق الجغرافي</label>
                  <select
                    value={newGeography}
                    onChange={(e) => setNewGeography(e.target.value as GeographyScope)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2"
                  >
                    {Object.entries(GEOGRAPHY_LABELS).map(([k, label]) => (
                      <option key={k} value={k}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-700 font-medium mb-1">السعر المعروض للبيع (ج.م) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={newPrice}
                    onChange={(e) => setNewPrice(Number(e.target.value))}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-stone-600 mb-1">السعر الاسمي المشطوب إن وجد (ج.م)</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="اختياري"
                    value={newOriginalPrice}
                    onChange={(e) => setNewOriginalPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-600 mb-1">المستوى التجاري:</label>
                  <select
                    value={newCommercialLevel}
                    onChange={(e) => setNewCommercialLevel(e.target.value as CommercialLevel)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2"
                  >
                    {Object.entries(COMMERCIAL_LEVEL_LABELS).map(([k, label]) => (
                      <option key={k} value={k}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-stone-600 mb-1">مستوى الثقة ومصدر الدليل:</label>
                  <select
                    value={newSourceTier}
                    onChange={(e) => setNewSourceTier(e.target.value as SourceTier)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2"
                  >
                    {Object.entries(SOURCE_TIER_LABELS).map(([k, label]) => (
                      <option key={k} value={k}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-stone-600 mb-1">رابط المصدر أو صفحة العرض (URL):</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={newSourceUrl}
                  onChange={(e) => setNewSourceUrl(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2"
                />
              </div>

              <div>
                <label className="block text-stone-600 mb-1">مواصفات الخامة وتفاصيل القماش:</label>
                <input
                  type="text"
                  placeholder="مثال: قطن 100% سنغل جيرسي أو دنيم مطاط"
                  value={newFabric}
                  onChange={(e) => setNewFabric(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2"
                />
              </div>

              <div>
                <label className="block text-stone-600 mb-1">حالة التحقق المبدئية:</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as VerificationStatus)}
                  className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2"
                >
                  <option value="Approved">معتمد فوراً (يؤثر على حسابات السوق)</option>
                  <option value="Pending_Review">قيد المراجعة والتحقق (افتراضي)</option>
                  <option value="Rejected">مرفوض / غير مطابق</option>
                </select>
              </div>

              <div>
                <label className="block text-stone-600 mb-1">ملاحظات إضافية:</label>
                <textarea
                  rows={2}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-stone-300 rounded-lg text-stone-700"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-lg font-bold"
                >
                  حفظ الدليل
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
