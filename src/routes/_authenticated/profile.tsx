import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useMe, KES_RATE } from "@/lib/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "My profile — TaskPulse" },
      { name: "description", content: "Your TaskPulse level, streak and earnings history." },
      { property: "og:title", content: "My profile — TaskPulse" },
      { property: "og:description", content: "Your TaskPulse level, streak and earnings history." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Profile,
});

const DAYS = 30;

function Profile() {
  const { data: me, isLoading } = useMe();
  const p = me?.profile;
  const [pw, setPw] = useState("");

  const history = useQuery({
    queryKey: ["earnings", p?.id],
    enabled: !!p,
    queryFn: async () =>
      (await supabase.from("task_completions").select("reward_usd, created_at").eq("user_id", p!.id).order("created_at")).data ?? [],
  });

  const daily = useMemo(() => {
    const map = new Map<string, number>();
    const today = new Date();
    for (let i = DAYS - 1; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      map.set(d.toISOString().slice(0, 10), 0);
    }
    for (const r of history.data ?? []) {
      const k = r.created_at.slice(0, 10);
      if (map.has(k)) map.set(k, map.get(k)! + Number(r.reward_usd));
    }
    let cum = 0;
    return [...map].map(([day, usd]) => ({ day: day.slice(5), usd: +usd.toFixed(2), total: +(cum += usd).toFixed(2) }));
  }, [history.data]);

  if (isLoading || !p) return <main className="p-8 text-muted-foreground">Loading…</main>;

  const inLevel = p.tasks_completed % 5;
  const changePw = async () => {
    if (pw.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) { toast.error(error.message); return; }
    toast.success("Password updated"); setPw("");
  };

  const tip = { contentStyle: { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 } };

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-10">
      <div>
        <h1 className="text-3xl font-bold">{p.username}</h1>
        <p className="text-sm text-muted-foreground">{p.email} · {p.selected_language} · {p.location} · ID {p.kyc_status}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs text-muted-foreground">Contributor level</p>
          <p className="mt-1 font-display text-3xl font-bold">{p.contributor_level}</p>
          <Progress className="mt-3" value={(inLevel / 5) * 100} />
          <p className="mt-1 text-xs text-muted-foreground">{5 - inLevel} tasks to level {p.contributor_level + 1}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs text-muted-foreground">Current streak</p>
          <p className="mt-1 font-display text-3xl font-bold">{p.current_streak} day{p.current_streak === 1 ? "" : "s"}</p>
          <p className="mt-1 text-xs text-muted-foreground">Last active: {p.last_active_date ?? "never"}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs text-muted-foreground">Total earned</p>
          <p className="mt-1 font-display text-3xl font-bold">${Number(p.total_earned_usd).toFixed(2)}</p>
          <p className="mt-1 text-xs text-muted-foreground">KES {(Number(p.total_earned_usd) * KES_RATE).toFixed(0)} · balance ${Number(p.balance_usd).toFixed(2)}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-semibold">Daily earnings (last {DAYS} days)</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer>
              <BarChart data={daily}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} tickFormatter={(v) => `$${v}`} />
                <Tooltip {...tip} formatter={(v: number) => [`$${v.toFixed(2)}`, "Earned"]} />
                <Bar dataKey="usd" fill="var(--brand)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-semibold">Cumulative earnings (last {DAYS} days)</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer>
              <AreaChart data={daily}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} tickFormatter={(v) => `$${v}`} />
                <Tooltip {...tip} formatter={(v: number) => [`$${v.toFixed(2)}`, "Total"]} />
                <Area dataKey="total" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="font-semibold">Recent tasks</h2>
        {(history.data ?? []).length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No completed tasks yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border text-sm">
            {[...(history.data ?? [])].reverse().slice(0, 10).map((r, i) => (
              <li key={i} className="flex justify-between py-2">
                <span className="text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span>
                <span className="text-success">+${Number(r.reward_usd).toFixed(2)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="font-semibold">Change password</h2>
        <div className="mt-3 flex max-w-md gap-2">
          <Input type="password" placeholder="New password (min 8)" value={pw} onChange={(e) => setPw(e.target.value)} />
          <Button variant="hero" onClick={changePw}>Update</Button>
        </div>
      </section>
    </main>
  );
}
