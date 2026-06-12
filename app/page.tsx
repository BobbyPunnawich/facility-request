'use client';

import { useState } from 'react';

interface AddressComponent {
  label: string;
  value: string;
  status: 'ok' | 'missing' | 'incorrect' | 'suspicious' | 'inferred';
  note: string;
}

interface AnalysisResult {
  isLandmark: boolean;
  landmarkName: string | null;
  confidence: 'high' | 'medium' | 'low';
  components: AddressComponent[];
  correctedAddress: string;
  summary: string;
  latitude: number | null;
  longitude: number | null;
  geocodeSource: string | null;
}

const STATUS_CONFIG = {
  ok:         { label: 'ถูกต้อง',     icon: '✓', classes: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  missing:    { label: 'ขาดหาย',      icon: '—', classes: 'bg-gray-100 text-gray-500 border-gray-200' },
  incorrect:  { label: 'ไม่ถูกต้อง',  icon: '✕', classes: 'bg-red-100 text-red-700 border-red-200' },
  suspicious: { label: 'น่าสงสัย',    icon: '!', classes: 'bg-amber-100 text-amber-700 border-amber-200' },
  inferred:   { label: 'AI สรุป',     icon: '✦', classes: 'bg-blue-100 text-blue-700 border-blue-200' },
} as const;

const CONFIDENCE_CONFIG = {
  high:   { label: 'ความเชื่อมั่นสูง',     classes: 'bg-emerald-100 text-emerald-700' },
  medium: { label: 'ความเชื่อมั่นปานกลาง', classes: 'bg-amber-100 text-amber-700' },
  low:    { label: 'ความเชื่อมั่นต่ำ',      classes: 'bg-red-100 text-red-700' },
};

const COMPONENT_SUBTITLES: Record<string, string> = {
  'บ้านเลขที่':    'House / Building No.',
  'ซอย':           'Soi / Lane',
  'ถนน':           'Road / Street',
  'แขวง/ตำบล':    'Subdistrict',
  'เขต/อำเภอ':     'District',
  'จังหวัด':       'Province',
  'รหัสไปรษณีย์': 'Postal Code',
};

const SAMPLE_FULL =
  'ส่งของมาที่ นายสมชาย ใจดี บ้านเลขที่ 45/2 ซอยรัชดาภิเษก 7 ถนนรัชดาภิเษก แขวงดินแดง เขตดินแดง กรุงเทพ 10110 ขอบคุณครับ';
const SAMPLE_LANDMARK = 'ตึกทรูทาวเวอ 1';

export default function Home() {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(err.error || `Request failed with status ${res.status}`);
      }

      const data: AnalysisResult = await res.json();
      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const overallStatus = result
    ? result.components.some((c) => c.status === 'incorrect')
      ? 'incorrect'
      : result.components.some((c) => c.status === 'suspicious')
      ? 'suspicious'
      : result.components.some((c) => c.status === 'missing')
      ? 'missing'
      : 'ok'
    : null;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl mb-4 shadow-lg">
            <span className="text-3xl">📍</span>
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Bobby&apos;s POC</h1>
          <p className="mt-2 text-slate-500 text-lg">
            วิเคราะห์ ตรวจสอบ และแก้ไขที่อยู่ภาษาไทยจากข้อความอิสระ
          </p>
        </div>

        {/* Input Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6 mb-8">
          <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">
            วางข้อความที่มีข้อมูลที่อยู่
          </label>
          <p className="text-xs text-slate-400 mb-3">
            ใส่ข้อความใดก็ได้ — ที่อยู่เต็ม, ชื่อสถานที่, ตึก, หรือแม้แต่ชื่อย่อ AI จะวิเคราะห์และหาพิกัดให้
          </p>
          <textarea
            className="w-full h-36 p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition placeholder:text-slate-400"
            placeholder="เช่น: ตึกทรูทาวเวอ 1  หรือ  ส่งมาที่ 45/2 ซอยรัชดา 7 กทม 10110..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="mt-4 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400">ตัวอย่าง:</span>
              <button
                type="button"
                onClick={() => setText(SAMPLE_LANDMARK)}
                className="text-xs text-blue-500 hover:text-blue-700 underline underline-offset-2 transition"
              >
                ชื่อตึก (Landmark)
              </button>
              <button
                type="button"
                onClick={() => setText(SAMPLE_FULL)}
                className="text-xs text-indigo-500 hover:text-indigo-700 underline underline-offset-2 transition"
              >
                ที่อยู่เต็ม
              </button>
            </div>
            <button
              onClick={handleAnalyze}
              disabled={loading || !text.trim()}
              className="px-8 py-3 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-md"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  กำลังวิเคราะห์…
                </>
              ) : (
                <>🔍 วิเคราะห์ที่อยู่</>
              )}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-8 text-sm flex gap-3 items-start">
            <span className="text-lg leading-none">⚠️</span>
            <div>
              <p className="font-semibold">เกิดข้อผิดพลาด</p>
              <p className="mt-0.5 text-red-600">{error}</p>
            </div>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-6">
            {/* Landmark Banner */}
            {result.isLandmark && result.landmarkName && (
              <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-xl p-4 flex gap-3 items-start text-sm">
                <span className="text-xl leading-none">🏢</span>
                <div>
                  <p className="font-bold">ตรวจพบสถานที่ที่รู้จัก</p>
                  <p className="mt-0.5 text-blue-700">
                    <span className="font-semibold">{result.landmarkName}</span> — AI เติมข้อมูลที่อยู่จากฐานความรู้
                    (แสดงด้วยสถานะ <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-100 text-blue-700 border border-blue-200 rounded-full text-xs font-semibold">✦ AI สรุป</span>)
                  </p>
                </div>
              </div>
            )}

            {/* Summary Banner */}
            {result.summary && (
              <div
                className={`rounded-xl p-4 border text-sm ${
                  overallStatus === 'ok'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : overallStatus === 'incorrect'
                    ? 'bg-red-50 border-red-200 text-red-800'
                    : overallStatus === 'suspicious'
                    ? 'bg-amber-50 border-amber-200 text-amber-800'
                    : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <span className="font-semibold">สรุป: </span>
                {result.summary}
              </div>
            )}

            {/* Part 1 */}
            <section className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
              <div className="px-6 py-5 bg-gradient-to-r from-indigo-600 to-indigo-500">
                <div className="flex items-center gap-3">
                  <span className="bg-white/20 text-white text-xs font-bold px-2.5 py-1 rounded-full">PART 1</span>
                  <div>
                    <h2 className="text-white font-bold text-lg leading-tight">การวิเคราะห์องค์ประกอบที่อยู่</h2>
                    <p className="text-indigo-200 text-xs mt-0.5">Address Component Extraction &amp; Validation</p>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-52">องค์ประกอบ</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">ค่าที่ได้</th>
                      <th className="px-5 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider w-36">สถานะ</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">หมายเหตุ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {result.components.map((comp, idx) => {
                      const cfg = STATUS_CONFIG[comp.status] ?? STATUS_CONFIG.missing;
                      return (
                        <tr key={idx} className={`hover:bg-slate-50/60 transition ${comp.status === 'inferred' ? 'bg-blue-50/30' : ''}`}>
                          <td className="px-5 py-4">
                            <p className="font-semibold text-slate-800">{comp.label}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{COMPONENT_SUBTITLES[comp.label] ?? ''}</p>
                          </td>
                          <td className="px-5 py-4">
                            {comp.value ? (
                              <span className="text-slate-800 font-medium">{comp.value}</span>
                            ) : (
                              <span className="text-slate-300 italic text-xs">— ไม่พบ</span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-center">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.classes}`}>
                              <span className="font-bold">{cfg.icon}</span>
                              {cfg.label}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-slate-600 text-xs leading-relaxed">{comp.note || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Legend */}
              <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex flex-wrap gap-3">
                {Object.entries(STATUS_CONFIG).map(([key, val]) => (
                  <span key={key} className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${val.classes}`}>
                    <b>{val.icon}</b> {val.label}
                  </span>
                ))}
              </div>
            </section>

            {/* Part 2 */}
            <section className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
              <div className="px-6 py-5 bg-gradient-to-r from-emerald-600 to-teal-500">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="bg-white/20 text-white text-xs font-bold px-2.5 py-1 rounded-full">PART 2</span>
                    <div>
                      <h2 className="text-white font-bold text-lg leading-tight">ที่อยู่ที่ถูกต้องและพิกัดที่ตั้ง</h2>
                      <p className="text-emerald-200 text-xs mt-0.5">Corrected Address &amp; Geolocation</p>
                    </div>
                  </div>
                  {result.confidence && (
                    <span className={`text-xs px-3 py-1 rounded-full font-semibold ${CONFIDENCE_CONFIG[result.confidence]?.classes ?? ''}`}>
                      {CONFIDENCE_CONFIG[result.confidence]?.label}
                    </span>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        ที่อยู่ที่ถูกต้อง (Corrected Full Address)
                      </th>
                      <th className="px-5 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider w-36">Latitude</th>
                      <th className="px-5 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider w-36">Longitude</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="hover:bg-slate-50/60 transition">
                      <td className="px-5 py-5 text-slate-800 font-medium leading-relaxed">
                        {result.correctedAddress || (
                          <span className="text-slate-400 italic text-xs">ไม่สามารถระบุที่อยู่ได้</span>
                        )}
                      </td>
                      <td className="px-5 py-5 text-center">
                        {result.latitude != null ? (
                          <span className="font-mono text-emerald-700 font-semibold text-sm">
                            {result.latitude.toFixed(6)}
                          </span>
                        ) : (
                          <span className="text-slate-300 text-xs italic">N/A</span>
                        )}
                      </td>
                      <td className="px-5 py-5 text-center">
                        {result.longitude != null ? (
                          <span className="font-mono text-emerald-700 font-semibold text-sm">
                            {result.longitude.toFixed(6)}
                          </span>
                        ) : (
                          <span className="text-slate-300 text-xs italic">N/A</span>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {result.latitude != null && result.longitude != null && (
                <div className="px-5 py-3 bg-emerald-50 border-t border-emerald-100 flex items-center gap-4 flex-wrap">
                  <a
                    href={`https://www.google.com/maps?q=${result.latitude},${result.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 flex items-center gap-1.5 transition"
                  >
                    🗺️ เปิดใน Google Maps
                  </a>
                  <span className="text-slate-300">|</span>
                  <a
                    href={`https://www.openstreetmap.org/?mlat=${result.latitude}&mlon=${result.longitude}&zoom=17`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 flex items-center gap-1.5 transition"
                  >
                    🌐 เปิดใน OpenStreetMap
                  </a>
                  {result.geocodeSource && (
                    <>
                      <span className="text-slate-300">|</span>
                      <span className="text-xs text-slate-400">
                        พิกัดจาก: {result.geocodeSource === 'photon' ? 'Photon (Komoot)' : 'Nominatim (OSM)'}
                      </span>
                    </>
                  )}
                </div>
              )}
            </section>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-slate-400 text-xs mt-12">
          Powered by Claude Opus (Anthropic) · Nominatim (OSM) · Photon (Komoot)
        </p>
      </div>
    </main>
  );
}
