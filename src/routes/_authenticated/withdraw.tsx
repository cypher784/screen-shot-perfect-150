import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe, KES_RATE } from "@/lib/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/withdraw")({
  head: () => ({
    meta: [
      { title: "Withdraw to M-Pesa — TaskPulse" },
      { name: "description", content: "Request your TaskPulse earnings to your M-Pesa number." },
      { property: "og:title", content: "Withdraw to M-Pesa — TaskPulse" },
      { property: "og:description", content: "Request your TaskPulse earnings to your M-Pesa number." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Withdraw,
});

function Withdraw() {
  const { data: me, isLoading } = useMe();
  const qc = useQueryClient();
  const p = me?.profile;
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (p?.phone) setPhone(p.phone); }, [p?.phone]);

  const list = useQuery({
    queryKey: ["withdrawals", p?.id],
    enabled: !!p,
    queryFn: async () => (await supabase.from("withdrawals").select("*").eq("user_id", p!.id).order("created_at", { ascending: false })).data ?? [],
  });

  if (isLoading || !p) return <main className="p-8 text-muted-foreground">Loading…</main>;
  if (p.kyc_status !== "Verified") return <Navigate to="/kyc" />;

  const bal = Number(p.balance_usd);
  const usd = Number(amount) || 0;
  const submit = async () => {
    setBusy(true);
    const { error } = await supabase.rpc("request_withdrawal", { _amount_usd: usd, _phone: phone });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Withdrawal requested");
    setAmount("");
    qc.invalidateQueries();
  };

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <h1 className="text-3xl font-bold">Withdraw to M-Pesa</h1>
      <div className="rounded-2xl border border-border bg-card p-6">
        <p className="text-sm text-muted-foreground">Available balance</p>
        <p className="font-display text-3xl font-bold">${bal.toFixed(2)} <span className="text-base text-muted-foreground">· KES {(bal * KES_RATE).toFixed(0)}</span></p>
        <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <Input type="number" min={2} step="0.01" placeholder="Amount (USD, min $2)" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <Input placeholder="M-Pesa number e.g. 0712345678" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Button variant="hero" disabled={busy} onClick={submit}>Request</Button>
        </div>
        {usd > 0 && <p className="mt-2 text-xs text-muted-foreground">You'll receive about KES {(usd * KES_RATE).toFixed(0)}. Payouts are reviewed by an admin.</p>}
      </div>
      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="font-semibold">History</h2>
        {(list.data ?? []).length === 0 ? <p className="mt-2 text-sm text-muted-foreground">No withdrawals yet.</p> : (
          <ul className="mt-3 divide-y divide-border text-sm">
            {list.data!.map((w) => (
              <li key={w.id} className="flex flex-wrap justify-between gap-2 py-3">
                <span>${Number(w.amount_usd).toFixed(2)} · KES {Number(w.amount_kes)} → {w.mpesa_phone}<div className="text-xs text-muted-foreground">{new Date(w.created_at).toLocaleString()}</div></span>
                <span className={w.status === "Paid" ? "text-success" : w.status === "Rejected" ? "text-destructive" : "text-warning"}>
                  {w.status}{w.mpesa_receipt ? ` · ${w.mpesa_receipt}` : ""}
                  {w.admin_note && <div className="text-xs text-muted-foreground">{w.admin_note}</div>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
