import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe, KES_RATE } from "@/lib/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — TaskPulse" }, { name: "description", content: "Your TaskPulse tasks and earnings." }] }),
  component: Dashboard,
});

function useNow() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);
  return now;
}

function Dashboard() {
  const { data: me, isLoading } = useMe();
  const qc = useQueryClient();
  const now = useNow();
  const p = me?.profile;

  const tasks = useQuery({
    queryKey: ["tasks", p?.id, p?.selected_language],
    enabled: !!p && p.kyc_status === "Verified",
    queryFn: async () => {
      const [{ data: prompts }, { data: done }] = await Promise.all([
        supabase.from("task_prompts").select("*").eq("target_language", p!.selected_language).eq("is_approved_pool", true),
        supabase.from("task_completions").select("prompt_id").eq("user_id", p!.id),
      ]);
      const ids = new Set(done?.map((d) => d.prompt_id));
      return (prompts ?? []).filter((x) => !ids.has(x.id));
    },
  });

  const [answers, setAnswers] = useState<Record<string, string>>({});

  if (isLoading || !me) return <main className="p-8 text-muted-foreground">Loading…</main>;
  if (!p) return <main className="p-8">Profile not found.</main>;
  if (p.kyc_status !== "Verified") return <Navigate to="/kyc" />;

  const cooldownMs = p.cooldown_until ? new Date(p.cooldown_until).getTime() - now : 0;
  const onCooldown = cooldownMs > 0;
  const toNext = 5 - (p.tasks_completed % 5);

  const submit = async (id: string) => {
    const t = (answers[id] ?? "").trim();
    if (!t) return toast.error("Enter your translation");
    const { error } = await supabase.rpc("complete_task", { _prompt_id: id, _translation: t });
    if (error) return toast.error(error.message);
    toast.success("+$0.25 earned");
    qc.invalidateQueries();
  };

  const stats = [
    ["Balance", `$${Number(p.balance_usd).toFixed(2)}`, `KES ${(Number(p.balance_usd) * KES_RATE).toFixed(0)}`],
    ["Total earned", `$${Number(p.total_earned_usd).toFixed(2)}`, `${p.tasks_completed} tasks`],
    ["Level", `${p.contributor_level}`, `${toNext} tasks to next level`],
    ["Streak", `${p.current_streak} day${p.current_streak === 1 ? "" : "s"}`, p.selected_language],
  ];

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold">Hi, {p.username}</h1>
      <p className="mt-1 text-sm text-muted-foreground">Referral code: <span className="text-accent">{p.referral_code}</span></p>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(([l, v, s]) => (
          <div key={l} className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">{l}</p>
            <p className="mt-1 font-display text-2xl font-bold">{v}</p>
            <p className="text-xs text-muted-foreground">{s}</p>
          </div>
        ))}
      </div>

      <section className="mt-10">
        <div className="flex items-end justify-between">
          <h2 className="text-xl font-semibold">{p.selected_language} tasks</h2>
          <p className="text-xs text-muted-foreground">Batch: {p.batch_count}/3</p>
        </div>
        {onCooldown ? (
          <div className="mt-4 rounded-xl border border-warning/40 bg-card p-6">
            <p className="font-semibold text-warning">Cooldown active</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Next batch unlocks in {Math.floor(cooldownMs / 3600000)}h {Math.ceil((cooldownMs % 3600000) / 60000)}m.
            </p>
          </div>
        ) : tasks.data?.length === 0 ? (
          <p className="mt-4 text-muted-foreground">You've completed every prompt in this language. Check back soon!</p>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {tasks.data?.slice(0, 3 - p.batch_count).map((t) => (
              <div key={t.id} className="rounded-xl border border-border bg-card p-5">
                <p className="text-xs text-muted-foreground">Translate into {t.target_language}</p>
                <p className="mt-1 font-display text-xl font-semibold">“{t.english_word}”</p>
                <div className="mt-3 flex gap-2">
                  <Input maxLength={500} placeholder="Your translation" value={answers[t.id] ?? ""} onChange={(e) => setAnswers({ ...answers, [t.id]: e.target.value })} />
                  <Button variant="hero" onClick={() => submit(t.id)}>Submit</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
