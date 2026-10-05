import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { reviewTranslation } from "./translation-check.server";

export const checkTranslation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      source: z.string().trim().min(1).max(500),
      translation: z.string().trim().min(1).max(500),
      language: z.enum(["Swahili", "Kikuyu", "Luo", "Kalenjin", "Kamba"]),
    }).parse(d),
  )
  .handler(async ({ data }) => reviewTranslation(data.source, data.translation, data.language));
