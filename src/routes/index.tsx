import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Languages, ShieldCheck, Wallet } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TaskPulse — Earn by training AI in Kenyan languages" },
      { name: "description", content: "Translate short prompts into Swahili, Kikuyu, Luo, Kalenjin and Kamba. Earn $0.25 per task, paid via M-Pesa." },
      { property: "og:title", content: "TaskPulse — Earn by training AI in Kenyan languages" },
      { property: "og:description", content: "Crowd-sourced, ethical AI training data from Kenya's linguistic hubs." },
    ],
  }),
  component: Index,
});

const hubs = [
  ["Mount Kenya", "Kikuyu"],
  ["Lake Victoria", "Luo"],
  ["Rift Valley", "Kalenjin"],
  ["Eastern", "Kamba"],
  ["Coast", "Swahili"],
];

function Index() {
  return (
    <main>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-glow" />
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:py-28">
          <p className="text-sm font-medium uppercase tracking-widest text-accent">Built in Kenya, for Africa's AI</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-tight sm:text-6xl">
            Your language is <span className="text-brand">data the world needs.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            Translate short prompts into your mother tongue. Earn $0.25 per task and withdraw to M-Pesa.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button variant="hero" size="lg" asChild><Link to="/auth">Start earning</Link></Button>
            <Button variant="secondary" size="lg" asChild><Link to="/about">Our story</Link></Button>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 pb-16 sm:grid-cols-3">
        {[
          [Languages, "5 regional languages", "Swahili, Kikuyu, Luo, Kalenjin and Kamba."],
          [ShieldCheck, "Verified contributors", "Every worker passes ID verification for trusted data."],
          [Wallet, "Fair pay", "$0.25 per task (≈ KES 32). Level up every 5 tasks."],
        ].map(([Icon, t, d]) => {
          const I = Icon as typeof Languages;
          return (
            <div key={t as string} className="rounded-xl border border-border bg-card p-6">
              <I className="h-6 w-6 text-accent" />
              <h3 className="mt-4 text-lg font-semibold">{t as string}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{d as string}</p>
            </div>
          );
        })}
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-24">
        <h2 className="text-2xl font-bold">Linguistic hubs</h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-5">
          {hubs.map(([r, l]) => (
            <div key={l} className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">{r}</p>
              <p className="mt-1 font-display text-lg font-semibold text-accent">{l}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
