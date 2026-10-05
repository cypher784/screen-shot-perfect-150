import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LANGUAGES, useMe } from "@/lib/profile";
import { checkTranslation } from "@/lib/translation-check.functions";

export const Route = createFileRoute("/_authenticated/checker")({
  head: () => ({
    meta: [
      { title: "Translation checker — TaskPulse" },
      { name: "description", content: "Get AI-powered feedback on your translation accuracy." },
      { property: "og:title", content: "Translation checker — TaskPulse" },
      { property: "og:description", content: "Get AI-powered feedback on your translation accuracy." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Checker,
});

type Review = Awaited<ReturnType<typeof checkTranslation>>;

function Checker() {
  const { data: me } = useMe();
  const check = useServerFn(checkTranslation);
  const [source, setSource] = useState("");
  const [translation, setTranslation] = useState("");
  const [lang, setLang] = useState<string>("Swahili");
  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState<Review | null>(null);

  useEffect(() => { if (me?.profile?.selected_language) setLang(me.profile.selected_language); }, [me?.profile?.selected_language]);

  const run = async () => {
    if (!source.trim() || !translation.trim()) { toast.error("Enter both the phrase and your translation"); return; }
    setBusy(true); setReview(null);
    try {
      setReview(await check({ data: { source, translation, language: lang as (typeof LANGUAGES)[number] } }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Check failed");
    } finally { setBusy(false); }
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold">Translation checker</h1>
      <p className="mt-1 text-sm text-muted-foreground">Practise and get AI-powered feedback. Checks don't affect your earnings.</p>
      <div className="mt-6 space-y-3 rounded-2xl border border-border bg-card p-6">
        <select className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={lang} onChange={(e) => setLang(e.target.value)}>
          {LANGUAGES.map((l) => <option key={l}>{l}</option>)}
        </select>
        <Input maxLength={500} placeholder="English phrase" value={source} onChange={(e) => setSource(e.target.value)} />
        <Input maxLength={500} placeholder={`Your ${lang} translation`} value={translation} onChange={(e) => setTranslation(e.target.value)} />
        <Button variant="hero" onClick={run} disabled={busy}>{busy ? "Checking…" : "Check translation"}</Button>
      </div>
      {review && (
        <section className="mt-6 rounded-2xl border border-border bg-card p-6">
          <div className="flex items-baseline justify-between">
            <p className="font-display text-4xl font-bold text-brand">{review.score}<span className="text-lg text-muted-foreground">/100</span></p>
            <p className="font-semibold text-accent">{review.verdict}</p>
          </div>
          <p className="mt-3 text-sm">{review.explanation}</p>
          {review.suggestions.length > 0 && (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {review.suggestions.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          )}
          {review.improved && <p className="mt-4 text-sm">Suggested: <span className="font-semibold">“{review.improved}”</span></p>}
        </section>
      )}
    </main>
  );
}
