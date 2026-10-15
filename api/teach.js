const SYSTEM_PROMPT = `You are the student in TeachMe Back, a curious but confused learner.
The user is teaching you a topic. Stay in character as a student at the requested level.
Rules:
- Reply ONLY as the student. Never lecture, explain the answer, or fix the user's explanation.
- Ask exactly one follow-up question at a time.
- Point out one gap, unexplained idea, or jargon term when you notice it, using phrases like "wait, I don't get that part".
- Be warm, concise, and genuinely curious. Do not praise excessively.
- Return valid JSON only with this shape: {"reply":"string","confusion_score":number,"gaps":["string"]}.
- confusion_score is 0-100: 0 means crystal clear and 100 means very confused. Score the explanation so far.
- gaps must be short, concrete items the teacher should clarify. Keep it to 0-3 items.`;

function jsonResponse(body, status = 200) {
  return { statusCode: status, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}

function validate(input) {
  if (!input || typeof input !== 'object') return 'Request body must be an object.';
  if (!input.topic || typeof input.topic !== 'string' || input.topic.trim().length > 120) return 'Add a topic up to 120 characters.';
  if (!['Age 10', 'High school', 'Beginner adult'].includes(input.level)) return 'Choose a supported student level.';
  if (!input.message || typeof input.message !== 'string' || input.message.trim().length < 2) return 'Write a little more so the student can respond.';
  if (input.message.length > 5000) return 'Keep each explanation under 5,000 characters.';
  return null;
}

function normalizeContext(input) {
  const prior = Number(input.prior_score);
  const gaps = Array.isArray(input.gaps) ? input.gaps.filter(gap => typeof gap === 'string').map(gap => gap.trim().slice(0, 160)).filter(Boolean).slice(0, 6) : [];
  return { prior_score: Number.isFinite(prior) ? Math.max(0, Math.min(100, Math.round(prior))) : 50, gaps };
}

function fallback(input) {
  const text = input.message.trim();
  const score = Math.max(18, Math.min(88, 68 - Math.floor(text.length / 90) * 8));
  const gaps = text.length < 180 ? ['the main idea and how its parts connect'] : ['a concrete example of what this looks like in real life'];
  return {
    reply: text.length < 180
      ? `Wait, I don't get that part yet. What does “${input.topic}” actually do, step by step?`
      : `Hmm, I think I follow the big picture, but I'm stuck on one thing: can you give me a simple example of ${input.topic}?`,
    confusion_score: score,
    gaps
  };
}

async function teach(input) {
  const error = validate(input);
  if (error) return jsonResponse({ error }, 400);

  if (!process.env.LLM_API_KEY) return jsonResponse(fallback(input));

  const base = (process.env.LLM_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);
  const context = normalizeContext(input);
  const response = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.LLM_API_KEY}` },
    signal: controller.signal,
    body: JSON.stringify({
      model: process.env.LLM_MODEL || 'gpt-4o-mini',
      temperature: 0.7,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: JSON.stringify({ topic: input.topic.trim(), student_level: input.level, prior_score: context.prior_score, gaps: context.gaps, explanation: input.message.trim() }) }
      ]
    })
  });
  clearTimeout(timeout);
  if (!response.ok) throw new Error(`LLM request failed with ${response.status}`);
  const data = await response.json();
  const parsed = JSON.parse(data.choices?.[0]?.message?.content || '{}');
  if (typeof parsed.reply !== 'string' || typeof parsed.confusion_score !== 'number' || !Array.isArray(parsed.gaps)) throw new Error('LLM returned an invalid response.');
  return jsonResponse({ reply: parsed.reply, confusion_score: Math.max(0, Math.min(100, Math.round(parsed.confusion_score))), gaps: parsed.gaps.slice(0, 3).map(String) });
}

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const result = await teach(body);
    res.status(result.statusCode).set(result.headers).send(result.body);
  } catch (error) {
    console.error(error);
    res.status(502).json({ error: 'The curious student is unavailable right now. Try again in a moment.' });
  }
}

module.exports = handler;
module.exports.teach = teach;
