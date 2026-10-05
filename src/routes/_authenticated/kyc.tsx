import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/profile";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/kyc")({
  head: () => ({ meta: [{ title: "Verify your identity — TaskPulse" }, { name: "description", content: "Submit your ID for verification." }] }),
  component: Kyc,
});

const DOCS = ["National ID Card", "Driver License", "Military ID Card", "Birth Certificate"];

function Kyc() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const [doc, setDoc] = useState(DOCS[0]);
  const [files, setFiles] = useState<{ front?: File; back?: File; face?: File }>({});
  const [busy, setBusy] = useState(false);
  const p = me?.profile;
  if (!p) return <main className="p-8 text-muted-foreground">Loading…</main>;
  if (p.kyc_status === "Verified") return <Navigate to="/dashboard" />;

  if (p.kyc_status === "Pending Review")
    return (
      <main className="mx-auto max-w-md px-4 py-20 text-center">
        <Clock className="mx-auto h-12 w-12 text-accent" />
        <h1 className="mt-4 text-2xl font-bold">Under admin review</h1>
        <p className="mt-2 text-muted-foreground">We're checking your documents. You'll get access to tasks once approved.</p>
      </main>
    );

  const needsBack = doc !== "Birth Certificate";

  const upload = async (f: File, name: string) => {
    if (f.size > 10 * 1024 * 1024) throw new Error("Each file must be under 10MB");
    if (!f.type.startsWith("image/") && f.type !== "application/pdf") throw new Error("Images or PDF only");
    const path = `${p.id}/${Date.now()}-${name}.${f.name.split(".").pop()}`;
    const { error } = await supabase.storage.from("kyc").upload(path, f);
    if (error) throw error;
    return path;
  };

  const submit = async () => {
    if (!files.front || !files.face || (needsBack && !files.back)) return toast.error("Please upload all required files");
    setBusy(true);
    try {
      const front = await upload(files.front, "front");
      const back = needsBack && files.back ? await upload(files.back, "back") : null;
      const face = await upload(files.face, "face");
      const { error } = await supabase.rpc("submit_kyc", { _doc_type: doc, _front: front, _back: back as string, _face: face });
      if (error) throw error;
      toast.success("Submitted for review");
      qc.invalidateQueries({ queryKey: ["me"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const fileInput = (key: "front" | "back" | "face", label: string) => (
    <div>
      <Label>{label}</Label>
      <input type="file" accept="image/*,application/pdf" className="mt-1 block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-2 file:text-foreground"
        onChange={(e) => setFiles({ ...files, [key]: e.target.files?.[0] })} />
    </div>
  );

  return (
    <main className="mx-auto max-w-lg px-4 py-12">
      <h1 className="text-3xl font-bold">Verify your identity</h1>
      <p className="mt-2 text-muted-foreground">Required before you can access tasks.</p>
      {p.kyc_status === "Rejected" && (
        <div className="mt-6 rounded-xl border border-destructive bg-destructive/10 p-4">
          <p className="font-semibold text-destructive">Your submission was rejected</p>
          <p className="mt-1 text-sm text-destructive">{p.kyc_feedback ?? "Please resubmit clearer documents."}</p>
        </div>
      )}
      <div className="mt-6 space-y-4 rounded-2xl border border-border bg-card p-6">
        <div>
          <Label>Document type</Label>
          <select className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={doc} onChange={(e) => setDoc(e.target.value)}>
            {DOCS.map((d) => <option key={d}>{d}</option>)}
          </select>
        </div>
        {fileInput("front", needsBack ? "Front side" : "Document (single side)")}
        {needsBack && fileInput("back", "Back side")}
        {fileInput("face", "Clear selfie / face photo")}
        <Button variant="hero" className="w-full" disabled={busy} onClick={submit}>
          {busy ? "Uploading…" : "Submit for review"}
        </Button>
      </div>
    </main>
  );
}
