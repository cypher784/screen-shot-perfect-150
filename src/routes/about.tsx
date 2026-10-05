import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About TaskPulse — Our mission and history" },
      { name: "description", content: "How TaskPulse is closing the data gap for African languages with fair digital work." },
      { property: "og:title", content: "About TaskPulse" },
      { property: "og:description", content: "Bridging the linguistic data gap for African languages." },
    ],
  }),
  component: About,
});

const timeline = [
  ["The gap", "Most AI tools barely understand Kikuyu, Luo, Kalenjin or Kamba. Millions of Kenyans are left out."],
  ["Campus roots", "TaskPulse began as a student project across Kenya's academic hubs — Nairobi, Kisumu, Eldoret and Mombasa."],
  ["The platform", "We turned it into a paid micro-task platform so native speakers earn from their knowledge."],
  ["Our promise", "Fair pay, verified contributors, transparent payouts and data used only for ethical AI."],
];

function About() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <p className="text-sm uppercase tracking-widest text-accent">About us</p>
      <h1 className="mt-3 text-4xl font-bold sm:text-5xl">Bridging Africa's <span className="text-brand">language data gap</span></h1>
      <p className="mt-6 text-lg text-muted-foreground">
        TaskPulse helps native speakers turn their language into income while building AI that truly speaks to Africa.
      </p>
      <ol className="mt-12 space-y-8 border-l border-border pl-6">
        {timeline.map(([t, d]) => (
          <li key={t} className="relative">
            <span className="absolute -left-[31px] top-1 h-3 w-3 rounded-full bg-brand" />
            <h2 className="text-xl font-semibold">{t}</h2>
            <p className="mt-1 text-muted-foreground">{d}</p>
          </li>
        ))}
      </ol>
    </main>
  );
}
