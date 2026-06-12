import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const buildPrompt = (text: string) => `You are an expert in Thai addresses, landmarks, and geography with deep knowledge of famous buildings, shopping malls, hospitals, universities, government offices, airports, temples, hotels, and other notable locations throughout Thailand.

FREE TEXT TO ANALYZE:
"${text}"

═══ STEP 1: LANDMARK / PLACE NAME DETECTION ═══
Check if the text mentions any named place, building, institution, or landmark — even if abbreviated, misspelled, or only partially written. If recognized, fill in ALL address components from your knowledge.

Recognition examples (handle misspellings and abbreviations):
- "ทรูทาวเวอ" / "ทรูทาวเวอร์" / "true tower" → True Tower (ทรูทาวเวอร์ 1), 87 ถนนวิภาวดีรังสิต แขวงลาดยาว เขตจตุจักร กรุงเทพมหานคร 10900
- "สยามพารากอน" / "paragon" → Siam Paragon, 991 ถนนพระราม 1 แขวงปทุมวัน เขตปทุมวัน กรุงเทพมหานคร 10330
- "เซ็นทรัลเวิลด์" / "centralworld" → CentralWorld, 4/1 ถนนราชดำริ แขวงปทุมวัน เขตปทุมวัน กรุงเทพมหานคร 10330
- "สนามบินสุวรรณภูมิ" / "สุวรรณภูมิ" → สนามบินสุวรรณภูมิ, 999 ถนนเทพรัตน แขวงหนองปรือ อำเภอบางพลี จังหวัดสมุทรปราการ 10540
- "ดอนเมือง" / "สนามบินดอนเมือง" → ท่าอากาศยานดอนเมือง, 222 ถนนวิภาวดีรังสิต แขวงสนามบิน เขตดอนเมือง กรุงเทพมหานคร 10210
- "เอ็มควอเทียร์" / "emquartier" → The EmQuartier, 693 ถนนสุขุมวิท แขวงคลองตันเหนือ เขตวัฒนา กรุงเทพมหานคร 10110
- "ไอคอนสยาม" / "iconsiam" → ICONSIAM, 299 ถนนเจริญนคร แขวงคลองต้นไทร เขตคลองสาน กรุงเทพมหานคร 10600
- "จุฬา" / "จุฬาลงกรณ์" → จุฬาลงกรณ์มหาวิทยาลัย, 254 ถนนพญาไท แขวงวังใหม่ เขตปทุมวัน กรุงเทพมหานคร 10330
- "ศิริราช" / "รพ.ศิริราช" → โรงพยาบาลศิริราช, 2 ถนนพรานนก แขวงศิริราช เขตบางกอกน้อย กรุงเทพมหานคร 10700
- "รามาธิบดี" / "รพ.ราม" / "ramathibodi" → โรงพยาบาลรามาธิบดี, 270 ถนนพระราม 6 แขวงทุ่งพญาไท เขตราชเทวี กรุงเทพมหานคร 10400
- "มาบุญครอง" / "mbk" → MBK Center, 444 ถนนพญาไท แขวงวังใหม่ เขตปทุมวัน กรุงเทพมหานคร 10330
- "ทองหล่อ" + building/complex clues → use your knowledge of the soi system in เขตวัฒนา

For ANY recognized landmark: set isLandmark=true, landmarkName=official name, and mark each inferred component with status "inferred".

═══ STEP 2: EXTRACT & VALIDATE ═══
Thai address components:
1. บ้านเลขที่ (house/building number)
2. ซอย (soi/lane)
3. ถนน (road/street)
4. แขวง/ตำบล (subdistrict)
5. เขต/อำเภอ (district)
6. จังหวัด (province)
7. รหัสไปรษณีย์ (postal code)

STATUS values:
- "ok" — found in text and correct
- "missing" — not in text and not inferrable
- "incorrect" — found but wrong (postal code/province mismatch, etc.)
- "suspicious" — present but possibly misspelled or inconsistent
- "inferred" — not in text, filled from AI knowledge of a recognized landmark

Validate: postal code vs province, subdistrict vs district, spelling correctness.
For inferred components: note "อ้างอิงจากความรู้ AI" in the note field.

confidence:
- "high" — certain address (landmark with known address, or complete text with all components valid)
- "medium" — mostly confident but one or two components uncertain
- "low" — largely guessed or text has very little address info

═══ RESPOND WITH ONLY RAW JSON ═══
No markdown, no code fences, nothing before or after the JSON.

{
  "isLandmark": false,
  "landmarkName": null,
  "confidence": "high|medium|low",
  "components": [
    { "label": "บ้านเลขที่", "value": "", "status": "ok|missing|incorrect|suspicious|inferred", "note": "" },
    { "label": "ซอย", "value": "", "status": "ok|missing|incorrect|suspicious|inferred", "note": "" },
    { "label": "ถนน", "value": "", "status": "ok|missing|incorrect|suspicious|inferred", "note": "" },
    { "label": "แขวง/ตำบล", "value": "", "status": "ok|missing|incorrect|suspicious|inferred", "note": "" },
    { "label": "เขต/อำเภอ", "value": "", "status": "ok|missing|incorrect|suspicious|inferred", "note": "" },
    { "label": "จังหวัด", "value": "", "status": "ok|missing|incorrect|suspicious|inferred", "note": "" },
    { "label": "รหัสไปรษณีย์", "value": "", "status": "ok|missing|incorrect|suspicious|inferred", "note": "" }
  ],
  "correctedAddress": "full corrected Thai address in standard order",
  "summary": "สรุปผลการวิเคราะห์"
}`;

type GeoResult = { latitude: number | null; longitude: number | null; source: string | null };

async function nominatimSearch(query: string): Promise<GeoResult> {
  try {
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', query);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '1');
    url.searchParams.set('countrycodes', 'TH');
    url.searchParams.set('accept-language', 'th,en');

    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': 'FacilityRequest/1.0 (bobbypunnawich@gmail.com)', Accept: 'application/json' },
    });
    if (!res.ok) return { latitude: null, longitude: null, source: null };

    const data = (await res.json()) as Array<{ lat: string; lon: string }>;
    if (data.length > 0) {
      return { latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon), source: 'nominatim' };
    }
    return { latitude: null, longitude: null, source: null };
  } catch {
    return { latitude: null, longitude: null, source: null };
  }
}

async function photonSearch(query: string): Promise<GeoResult> {
  try {
    const url = new URL('https://photon.komoot.io/api/');
    url.searchParams.set('q', query);
    url.searchParams.set('limit', '1');
    url.searchParams.set('lang', 'th');
    // Location bias: center of Bangkok
    url.searchParams.set('lat', '13.7563');
    url.searchParams.set('lon', '100.5018');

    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': 'FacilityRequest/1.0 (bobbypunnawich@gmail.com)', Accept: 'application/json' },
    });
    if (!res.ok) return { latitude: null, longitude: null, source: null };

    const data = (await res.json()) as { features?: Array<{ geometry: { coordinates: [number, number] } }> };
    if (data.features?.length) {
      const [lon, lat] = data.features[0].geometry.coordinates;
      return { latitude: lat, longitude: lon, source: 'photon' };
    }
    return { latitude: null, longitude: null, source: null };
  } catch {
    return { latitude: null, longitude: null, source: null };
  }
}

async function geocodeWithFallbacks(correctedAddress: string, landmarkName: string | null): Promise<GeoResult> {
  // 1. Full corrected address → Nominatim
  const r1 = await nominatimSearch(correctedAddress);
  if (r1.latitude !== null) return r1;

  if (landmarkName) {
    // 2. Landmark name (Thai) → Nominatim
    const r2 = await nominatimSearch(landmarkName);
    if (r2.latitude !== null) return r2;

    // 3. Landmark name (Thai) → Photon (better POI coverage)
    const r3 = await photonSearch(landmarkName);
    if (r3.latitude !== null) return r3;

    // 4. Landmark name + "Thailand" → Photon (English fallback)
    const r4 = await photonSearch(landmarkName + ' Thailand');
    if (r4.latitude !== null) return r4;
  }

  return { latitude: null, longitude: null, source: null };
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY is not configured' }, { status: 500 });
    }

    const body = await req.json();
    const text: string = body?.text;
    if (!text?.trim()) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const stream = await client.messages.stream({
      model: 'claude-opus-4-8',
      max_tokens: 4096,
      thinking: { type: 'adaptive' },
      messages: [{ role: 'user', content: buildPrompt(text.trim()) }],
    });

    const message = await stream.finalMessage();

    const textBlock = message.content.find((b) => b.type === 'text') as
      | { type: 'text'; text: string }
      | undefined;
    if (!textBlock) throw new Error('No text response from Claude');

    let raw = textBlock.text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

    let analysis: Record<string, unknown>;
    try {
      analysis = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) analysis = JSON.parse(match[0]);
      else throw new Error('Claude returned invalid JSON');
    }

    const landmarkName = typeof analysis.landmarkName === 'string' ? analysis.landmarkName : null;
    const correctedAddress = typeof analysis.correctedAddress === 'string' ? analysis.correctedAddress : '';

    if (correctedAddress || landmarkName) {
      const geo = await geocodeWithFallbacks(correctedAddress, landmarkName);
      analysis.latitude = geo.latitude;
      analysis.longitude = geo.longitude;
      analysis.geocodeSource = geo.source;
    } else {
      analysis.latitude = null;
      analysis.longitude = null;
      analysis.geocodeSource = null;
    }

    return NextResponse.json(analysis);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
