import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useMe, WHATSAPP_URL } from "@/lib/profile";

export function Header() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="font-display text-xl font-bold">
          Task<span className="text-brand">Pulse</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm sm:gap-3">
          <Link to="/about" className="hidden px-2 text-muted-foreground hover:text-foreground sm:block">
            About
          </Link>
          {me?.user ? (
            <>
              <Link to="/dashboard" className="px-2 text-muted-foreground hover:text-foreground">
                Dashboard
              </Link>
              <Link to="/profile" className="px-2 text-muted-foreground hover:text-foreground">
                Profile
              </Link>
              <Link to="/checker" className="px-2 text-muted-foreground hover:text-foreground">
                Checker
              </Link>
              {me.isAdmin && (
                <Link to="/admin" className="px-2 text-accent hover:text-foreground">
                  Admin
                </Link>
              )}
              <Button size="sm" variant="secondary" onClick={signOut}>
                Sign out
              </Button>
            </>
          ) : (
            <Button size="sm" variant="hero" asChild>
              <Link to="/auth">Get started</Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}

export function WhatsAppWidget() {
  return (
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Join the TaskPulse WhatsApp community"
      className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-whatsapp px-4 py-3 text-sm font-semibold text-accent-foreground shadow-glow transition hover:scale-105"
    >
      <MessageCircle className="h-5 w-5" />
      <span className="hidden sm:inline">Join community</span>
    </a>
  );
}

export function CookieBanner() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    setShow(localStorage.getItem("tp_cookies") !== "1");
  }, []);
  if (!show) return null;
  return (
    <div className="fixed inset-x-3 bottom-20 z-50 mx-auto max-w-xl rounded-xl border border-border bg-card p-4 shadow-glow sm:bottom-5">
      <p className="text-sm text-muted-foreground">
        We use functional cookies and session tracking to keep you signed in and keep the platform secure.
      </p>
      <div className="mt-3 flex justify-end">
        <Button
          size="sm"
          variant="hero"
          onClick={() => {
            localStorage.setItem("tp_cookies", "1");
            setShow(false);
          }}
        >
          Accept
        </Button>
      </div>
    </div>
  );
}
