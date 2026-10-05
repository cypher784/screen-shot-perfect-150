import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const LANGUAGES = ["Swahili", "Kikuyu", "Luo", "Kalenjin", "Kamba"] as const;
export const KES_RATE = 129;
export const WHATSAPP_URL = "https://call.whatsapp.com/voice/qSgbrUavq0RBj1f9kljTMF";

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const [{ data: profile }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", u.user.id),
      ]);
      return {
        user: u.user,
        profile,
        isAdmin: !!roles?.some((r) => r.role === "admin"),
      };
    },
  });
}
