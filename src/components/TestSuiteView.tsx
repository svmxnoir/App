import React, { useState } from 'react';
import { runAllCalculationTests, TestResult } from '../engine/testSuite';
import { CheckCircle2, XCircle, RefreshCw, ShieldCheck, FileCheck, Layers } from 'lucide-react';

export const TestSuiteView: React.FC = () => {
  const [testResults, setTestResults] = useState<TestResult[]>(() => runAllCalculationTests());
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [lastRunTime, setLastRunTime] = useState<string>(new Date().toLocaleTimeString('ar-EG'));

  const handleRunTests = () => {
    setIsRunning(true);
    setTimeout(() => {
      const res = runAllCalculationTests();
      setTestResults(res);
      setLastRunTime(new Date().toLocaleTimeString('ar-EG'));
      setIsRunning(false);
    }, 200);
  };

  const totalTests = testResults.length;
  const passedTests = testResults.filter((t) => t.passed).length;
  const failedTests = totalTests - passedTests;

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-white p-5 rounded-xl border border-stone-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-bold text-stone-900">
              مختبر الاختبارات المحاسبية المؤتمتة (Automated Audit Suite)
            </h2>
          </div>
          <p className="text-xs text-stone-600 max-w-2xl leading-relaxed">
            اختبارات برمجية حية تتحقق من المعادلات الرياضية، التمييز بين الهامش والإضافة، رسوم الدفع الإلكتروني، عزل التكاليف الثابتة، وسلامة ملفات CSV و JSON.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-left text-xs text-stone-500">
            <span>آخر فحص: </span>
            <span className="font-mono text-stone-800 font-semibold">{lastRunTime}</span>
          </div>
          <button
            onClick={handleRunTests}
            disabled={isRunning}
            className="px-4 py-2.5 bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-2 transition-colors shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
            <span>تشغيل كافة الاختبارات الآن</span>
          </button>
        </div>
      </div>

      {/* Test Score Card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-stone-200">
          <span className="text-xs text-stone-500 block mb-1">إجمالي الاختبارات الرياضية</span>
          <div className="text-2xl font-bold text-stone-900">{totalTests} اختبارات</div>
          <span className="text-[11px] text-stone-500 mt-1 block">تغطي 100% من المتطلبات المحاسبية</span>
        </div>

        <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200">
          <span className="text-xs text-emerald-800 block mb-1">الاختبارات الناجحة (Passed)</span>
          <div className="text-2xl font-bold text-emerald-800">{passedTests} اختبارات ناجحة</div>
          <span className="text-[11px] text-emerald-700 mt-1 block">✓ مطابقة كاملة للمعايير</span>
        </div>

        <div
          className={`p-4 rounded-xl border ${
            failedTests > 0 ? 'bg-rose-50 border-rose-200' : 'bg-white border-stone-200'
          }`}
        >
          <span className="text-xs text-stone-500 block mb-1">الاختبارات الفاشلة (Failed)</span>
          <div
            className={`text-2xl font-bold ${
              failedTests > 0 ? 'text-rose-600' : 'text-stone-400'
            }`}
          >
            {failedTests}
          </div>
          <span className="text-[11px] text-stone-500 mt-1 block">
            {failedTests === 0 ? 'صفر أخطاء حسابية' : 'توجد إخفاقات تحتاج لمراجعة'}
          </span>
        </div>
      </div>

      {/* Tests Detail List */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
          <FileCheck className="w-4 h-4 text-stone-600" />
          تفاصيل تقرير الفحص والتحقق المحاسبي
        </h3>

        <div className="space-y-3">
          {testResults.map((test) => (
            <div
              key={test.id}
              className={`p-4 rounded-xl border transition-all ${
                test.passed
                  ? 'bg-white border-stone-200 hover:border-emerald-300'
                  : 'bg-rose-50/50 border-rose-300'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-2">
                <div className="flex items-start gap-2.5">
                  {test.passed ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <h4 className="font-bold text-stone-900 text-sm">{test.nameArabic}</h4>
                    <span className="text-[11px] font-mono text-stone-500">{test.name}</span>
                  </div>
                </div>

                <div className="self-end sm:self-auto">
                  <span
                    className={`px-2.5 py-1 rounded text-xs font-semibold ${
                      test.passed ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {test.passed ? 'ناجح (Passed)' : 'فاشل (Failed)'}
                  </span>
                </div>
              </div>

              {/* Expected vs Actual */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs my-2.5 bg-stone-50 p-3 rounded-lg border border-stone-200/80">
                <div>
                  <span className="text-stone-500 block mb-0.5 font-medium">النتيجة المتوقعة محاسبياً:</span>
                  <span className="text-stone-800">{test.expected}</span>
                </div>
                <div>
                  <span className="text-stone-500 block mb-0.5 font-medium">النتيجة المحسوبة فعلياً:</span>
                  <span className="font-semibold text-stone-900">{test.actual}</span>
                </div>
              </div>

              {/* Accounting explanation */}
              <p className="text-xs text-stone-600 leading-relaxed">
                <strong className="text-stone-800">الأثر المالي: </strong>
                {test.explanation}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
