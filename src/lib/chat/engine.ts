// Docs-grounded support assistant.
//
// By default it answers by retrieving the best-matching published knowledge
// articles for the organization and quoting the most relevant passages. If an
// OpenAI-compatible endpoint is configured (admin panel or env), it is used to
// phrase the answer using those passages as grounded context; the retrieval
// layer and citations remain the same either way.

import { getAiSettings } from "@/lib/integrations/store";

export type ChatDoc = {
  id: string;
  title: string;
  slug: string;
  body: string;
  category: string | null;
};

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "but", "if", "then", "of", "to", "in", "on",
  "for", "with", "is", "are", "was", "were", "be", "been", "am", "do", "does",
  "did", "how", "what", "when", "where", "who", "why", "can", "could", "i",
  "you", "we", "it", "this", "that", "my", "your", "our", "me", "us", "at",
  "as", "by", "from", "not", "no", "yes", "please", "help", "need", "want",
]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

function termFrequency(terms: string[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const term of terms) map.set(term, (map.get(term) ?? 0) + 1);
  return map;
}

export type ScoredDoc = { doc: ChatDoc; score: number };

export function retrieve(query: string, docs: ChatDoc[], limit = 3): ScoredDoc[] {
  const queryTerms = tokenize(query);
  if (queryTerms.length === 0) return [];

  const scored = docs.map((doc) => {
    const titleTerms = termFrequency(tokenize(doc.title));
    const bodyTerms = termFrequency(tokenize(doc.body));
    const categoryTerms = termFrequency(tokenize(doc.category ?? ""));

    let score = 0;
    for (const term of new Set(queryTerms)) {
      score += (titleTerms.get(term) ?? 0) * 4;
      score += (categoryTerms.get(term) ?? 0) * 2;
      score += Math.min(bodyTerms.get(term) ?? 0, 5);
    }
    // Light preference for shorter documents (more focused).
    const lengthPenalty = Math.log(1 + doc.body.length / 400);
    return { doc, score: score / lengthPenalty };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function bestSentences(body: string, queryTerms: string[], count = 2): string {
  const sentences = body
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20);
  if (sentences.length === 0) return body.slice(0, 280);

  const scored = sentences.map((sentence) => {
    const lower = sentence.toLowerCase();
    const score = queryTerms.reduce((acc, t) => (lower.includes(t) ? acc + 1 : acc), 0);
    return { sentence, score };
  });
  scored.sort((a, b) => b.score - a.score);
  const chosen = scored.slice(0, count).map((s) => s.sentence);
  return chosen.join(" ");
}

export type BotReply = {
  body: string;
  article: { id: string; title: string } | null;
  handoff: boolean;
  sources: { id: string; title: string; slug: string }[];
};

const FALLBACK =
  "I couldn't find an answer to that in our documentation yet. I've flagged this for the team — click “Talk to a human” and someone will help you shortly.";

export async function generateBotReply(query: string, docs: ChatDoc[]): Promise<BotReply> {
  const matches = retrieve(query, docs, 3);
  const top = matches[0];

  if (!top || top.score < 1) {
    return { body: FALLBACK, article: null, handoff: true, sources: [] };
  }

  const queryTerms = tokenize(query);
  const sources = matches.map((m) => ({ id: m.doc.id, title: m.doc.title, slug: m.doc.slug }));

  const llm = await tryLlmReply(query, matches);
  const quote = bestSentences(top.doc.body, queryTerms);
  const body =
    llm ??
    `Based on “${top.doc.title}”: ${quote}`;

  return {
    body,
    article: { id: top.doc.id, title: top.doc.title },
    handoff: false,
    sources,
  };
}

type ChatMessageInput = { role: "system" | "user" | "assistant"; content: string };

async function tryLlmReply(query: string, matches: ScoredDoc[]): Promise<string | null> {
  const ai = await getAiSettings();
  if (!ai.enabled || !ai.configured) return null;

  const endpoint = ai.baseUrl.endsWith("/chat/completions")
    ? ai.baseUrl
    : `${ai.baseUrl.replace(/\/+$/, "")}/chat/completions`;

  const context = matches
    .map((m, i) => `# Document ${i + 1}: ${m.doc.title}\n${m.doc.body}`)
    .join("\n\n")
    .slice(0, 12000);

  const messages: ChatMessageInput[] = [
    {
      role: "system",
      content:
        "You are a concise support assistant. Answer only using the provided documentation. " +
        "If the answer is not present, say you are not sure and suggest contacting support. " +
        "Keep replies under 120 words and do not invent policies, prices or links.",
    },
    { role: "user", content: `Documentation:\n${context}\n\nQuestion: ${query}` },
  ];

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${ai.apiKey}` },
      body: JSON.stringify({ model: ai.model, messages, temperature: 0.2, max_tokens: 300 }),
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = json.choices?.[0]?.message?.content?.trim();
    return content && content.length > 0 ? content : null;
  } catch {
    return null;
  }
}
