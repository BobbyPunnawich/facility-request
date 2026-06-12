import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const buildPrompt = (text: string) => `You are an expert in Thai address validation. Analyze the following free text and extract Thai address components.

Thai address has 7 components:
1. บ้านเลขที่ (house/building number) — e.g. "123/45", "เลขที่ 10 หมู่ 3"
2. ซอย (soi/lane) — e.g. "ซอยสุขุมวิท 11", "ซ.5"
3. ถนน (road/street) — e.g. "ถนนสุขุมวิท", "ถ.พระราม 4"
4. แขวง/ตำบล (subdistrict) — e.g. "แขวงคลองเตย", "ตำบลหนองแค"
5. เขต/อำเภอ (district) — e.g. "เขตคลองเตย", "อำเภอเมือง"
6. จังหวัด (province) — e.g. "กรุงเทพมหานคร", "จ.เชียงใหม่", "นนทบุรี"
7. รหัสไปรษณีย์ (postal code) — 5 digits, e.g. "10110"

FREE TEXT:
${text}

INSTRUCTIONS:
- Extract each component from the text above
- Validate: does the postal code match the province? Does the subdistrict belong to the stated district? Any misspellings?
- Set status: "ok" if correct, "missing" if not found in text, "incorrect" if wrong (e.g. postal code doesn't match province), "suspicious" if possibly misspelled or inconsistent
- Provide a corrected full address in Thai using standard order: บ้านเลขที่ ซอย ถนน แขวง/ตำบล เขต/อำเภอ จังหวัด รหัสไปรษณีย์
- summary field: brief Thai explanation of what was found and any issues

IMPORTANT: Respond with ONLY a raw JSON object — no markdown, no code fences, no extra text before or after.

{
  "components": [
    { "label": "บ้านเลขที่", "value": "", "status": "ok|missing|incorrect|suspicious", "note": "" },
    { "label": "ซอย", "value": "", "status": "ok|missing|incorrect|suspicious", "note": "" },
    { "label": "ถนน", "value": "", "status": "ok|missing|incorrect|suspicious", "note": "" },
    { "label": "แขวง/ตำบล", "value": "", "status": "ok|missing|incorrect|suspicious", "note": "" },
    { "label": "เขต/อำเภอ", "value": "", "status": "ok|missing|incorrect|suspicious", "note": "" },
    { "label": "จังหวัด", "value": "", "status": "ok|missing|incorrect|suspicious", "note": "" },
    { "label": "รหัสไปรษณีย์", "value": "", "status": "ok|missing|incorrect|suspicious", "note": "" }
  ],
  "correctedAddress": "full corrected Thai address string",
  "summary": "สรุปผลการวิเคราะห์"
}`;

async function geocodeAddress(address: string): Promise<{ latitude: number | null; longitude: number | null }> {
  try {
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', address);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '1');
    url.searchParams.set('countrycodes', 'TH');
    url.searchParams.set('accept-language', 'th,en');

    const res = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'FacilityRequest/1.0 (bobbypunnawich@gmail.com)',
        Accept: 'application/json',
      },
    });

    if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`);
    const data = (await res.json()) as Array<{ lat: string; lon: string }>;

    if (data.length > 0) {
      return { latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) };
    }
    return { latitude: null, longitude: null };
  } catch {
    return { latitude: null, longitude: null };
  }
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

    if (typeof analysis.correctedAddress === 'string' && analysis.correctedAddress) {
      const geo = await geocodeAddress(analysis.correctedAddress);
      analysis.latitude = geo.latitude;
      analysis.longitude = geo.longitude;
    } else {
      analysis.latitude = null;
      analysis.longitude = null;
    }

    return NextResponse.json(analysis);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
