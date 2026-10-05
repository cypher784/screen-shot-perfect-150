import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

export type TranslationReview = {
  score: number;
  verdict: string;
  explanation: string;
  suggestions: string[];
  improved: string;
};

export async function reviewTranslation(source: string, translation: string, language: string): Promise<TranslationReview> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("AI is not configured.");
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
  });
  const result = streamText({
    model: provider.responses("openai/gpt-6-astra"),
    system:
      "You are an expert reviewer of English-to-Kenyan-language translations (Swahili, Kikuyu, Luo, Kalenjin, Kamba). " +
      "Assess meaning, grammar, spelling and naturalness. Be encouraging and concise. " +
      'Reply with JSON only: {"score": integer 0-100, "verdict": "Excellent"|"Good"|"Needs work"|"Incorrect", ' +
      '"explanation": "2-3 sentences", "suggestions": ["up to 3 short tips"], "improved": "best translation"}',
    prompt: `Target language: ${language}\nEnglish source: ${source}\nTranslator's version: ${translation}`,
    providerOptions: {
      openai: {
        store: false,
        forceReasoning: true,
        reasoningEffort: "low",
        reasoningSummary: "auto",
        include: ["reasoning.encrypted_content"],
      },
    },
  });
  const text = await result.text;
  const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  let r: Partial<TranslationReview> = {};
  try { r = JSON.parse(json); } catch { throw new Error("The AI reply could not be read. Please try again."); }
  return {
    score: Math.max(0, Math.min(100, Math.round(Number(r.score) || 0))),
    verdict: String(r.verdict ?? ""),
    explanation: String(r.explanation ?? ""),
    suggestions: Array.isArray(r.suggestions) ? r.suggestions.slice(0, 3).map(String) : [],
    improved: String(r.improved ?? ""),
  };
}
