import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe, LANGUAGES } from "@/lib/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — TaskPulse" }, { name: "description", content: "TaskPulse admin command center." }] }),
  component: Admin,
});

function Admin() {
  const { data: me, isLoading } = useMe();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [word, setWord] = useState("");
  const [lang, setLang] = useState("Swahili");

  const users = useQuery({
    queryKey: ["admin-users"],
    enabled: !!me?.isAdmin,
    queryFn: async () => (await supabase.from("profiles").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  if (isLoading) return <main className="p-8 text-muted-foreground">Loading…</main>;
  if (!me?.isAdmin) return <Navigate to="/dashboard" />;

  const openFile = async (path: string | null) => {
    if (!path) return;
    const { data, error } = await supabase.storage.from("kyc").createSignedUrl(path, 120);
    if (error) { toast.error(error.message); return; }
    window.open(data.signedUrl, "_blank", "noopener");
  };

  const review = async (id: string, approve: boolean) => {
    if (!approve && !notes[id]?.trim()) { toast.error("Add a rejection note"); return; }
    const { error } = await supabase.rpc("admin_review_kyc", { _user_id: id, _approve: approve, _feedback: notes[id] ?? "" });
    if (error) { toast.error(error.message); return; }
    toast.success(approve ? "Verified" : "Rejected");
    qc.invalidateQueries({ queryKey: ["admin-users"] });
  };

  const addPrompt = async () => {
    const w = word.trim();
    if (!w || w.length > 200) { toast.error("Enter a prompt (max 200 chars)"); return; }
    const { error } = await supabase.from("task_prompts").insert({ english_word: w, target_language: lang });
    if (error) { toast.error(error.message); return; }
    toast.success("Prompt added");
    setWord("");
  };

  const list = (users.data ?? []).filter((u) =>
    [u.username, u.email].some((s) => s.toLowerCase().includes(search.toLowerCase())),
  );
  const pending = list.filter((u) => u.kyc_status === "Pending Review");

  return (
    <main className="mx-auto max-w-6xl space-y-10 px-4 py-10">
      <h1 className="text-3xl font-bold">Command center</h1>

      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold">Add training prompt</h2>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Input placeholder="English word or sentence" value={word} onChange={(e) => setWord(e.target.value)} />
          <select className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={lang} onChange={(e) => setLang(e.target.value)}>
            {LANGUAGES.map((l) => <option key={l}>{l}</option>)}
          </select>
          <Button variant="hero" onClick={addPrompt}>Add</Button>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">KYC queue ({pending.length})</h2>
        <div className="mt-4 space-y-3">
          {pending.length === 0 && <p className="text-sm text-muted-foreground">Nothing waiting for review.</p>}
          {pending.map((u) => (
            <div key={u.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold">{u.username} <span className="text-sm text-muted-foreground">· {u.email}</span></p>
                  <p className="text-sm text-muted-foreground">{u.kyc_doc_type}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => openFile(u.kyc_front_path)}>Front</Button>
                  {u.kyc_back_path && <Button size="sm" variant="secondary" onClick={() => openFile(u.kyc_back_path)}>Back</Button>}
                  <Button size="sm" variant="secondary" onClick={() => openFile(u.kyc_face_path)}>Selfie</Button>
                </div>
              </div>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <Input placeholder="Rejection note (required to reject)" value={notes[u.id] ?? ""} onChange={(e) => setNotes({ ...notes, [u.id]: e.target.value })} />
                <Button variant="success" onClick={() => review(u.id, true)}>Approve</Button>
                <Button variant="destructive" onClick={() => review(u.id, false)}>Reject</Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <WithdrawalQueue />


      <section>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Users ({list.length})</h2>
          <Input className="max-w-xs" placeholder="Search username or email" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="mt-4 overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-card text-left text-muted-foreground">
              <tr><th className="p-3">User</th><th className="p-3">Language</th><th className="p-3">KYC</th><th className="p-3">Level</th><th className="p-3">Earned</th></tr>
            </thead>
            <tbody>
              {list.map((u) => (
                <tr key={u.id} className="border-t border-border">
                  <td className="p-3">{u.username}<div className="text-xs text-muted-foreground">{u.email}</div></td>
                  <td className="p-3">{u.selected_language}</td>
                  <td className="p-3">{u.kyc_status}</td>
                  <td className="p-3">{u.contributor_level}</td>
                  <td className="p-3">${Number(u.total_earned_usd).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
