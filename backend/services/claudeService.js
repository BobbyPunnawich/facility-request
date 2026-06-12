const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const PROMPT = (text) => `You are an expert in Thai address validation. Analyze the following free text and extract Thai address components.

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

async function analyzeAddress(text) {
  const stream = await client.messages.stream({
    model: 'claude-opus-4-8',
    max_tokens: 4096,
    thinking: { type: 'adaptive' },
    messages: [{ role: 'user', content: PROMPT(text) }],
  });

  const message = await stream.finalMessage();

  const textBlock = message.content.find((b) => b.type === 'text');
  if (!textBlock) throw new Error('No text response from Claude');

  let raw = textBlock.text.trim();

  // Strip markdown code fences if present
  raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('Claude returned invalid JSON: ' + raw.slice(0, 300));
  }
}

module.exports = { analyzeAddress };
