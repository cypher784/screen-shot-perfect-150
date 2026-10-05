import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LANGUAGES } from "@/lib/profile";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — TaskPulse" },
      { name: "description", content: "Sign in or create your TaskPulse contributor account." },
      { property: "og:title", content: "Sign in — TaskPulse" },
      { property: "og:description", content: "Join TaskPulse and start earning." },
    ],
  }),
  component: AuthPage,
});

const signupSchema = z.object({
  username: z.string().trim().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/, "Letters, numbers, underscore only"),
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(72),
});

function AuthPage() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ username: "", email: "", password: "", language: "Swahili" });
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "up") {
        const parsed = signupSchema.safeParse(form);
        if (!parsed.success) return toast.error(parsed.error.issues[0].message);
        const { error } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: {
            emailRedirectTo: window.location.origin + "/dashboard",
            data: { username: form.username, selected_language: form.language },
          },
        });
        if (error) return toast.error(error.message);
        toast.success("Check your email to confirm your account.");
        setMode("in");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
        if (error) return toast.error(error.message);
        navigate({ to: "/dashboard" });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <div className="rounded-2xl border border-border bg-card p-8">
        <h1 className="text-2xl font-bold">{mode === "in" ? "Welcome back" : "Create your account"}</h1>
        <form onSubmit={submit} className="mt-6 space-y-4">
          {mode === "up" && (
            <>
              <div><Label>Username</Label><Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></div>
              <div>
                <Label>Primary language</Label>
                <select className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })}>
                  {LANGUAGES.map((l) => <option key={l}>{l}</option>)}
                </select>
              </div>
            </>
          )}
          <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div><Label>Password</Label><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
          <Button type="submit" variant="hero" className="w-full" disabled={busy}>
            {mode === "in" ? "Sign in" : "Create account"}
          </Button>
        </form>
        <button className="mt-4 w-full text-sm text-muted-foreground hover:text-foreground" onClick={() => setMode(mode === "in" ? "up" : "in")}>
          {mode === "in" ? "New here? Create an account" : "Already registered? Sign in"}
        </button>
      </div>
    </main>
  );
}
