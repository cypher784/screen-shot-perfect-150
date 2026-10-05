<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# AGENTS.md

- Money, levels, cooldowns and KYC status change only through security-definer SQL functions (complete_task, submit_kyc, admin_review_kyc); why: clients must never write balances or verification state directly.
- Roles live in public.user_roles checked via has_role(); why: avoids privilege escalation from profile edits.
- KYC files go in the private `kyc` bucket under `<user_id>/...`, viewed by admins via signed URLs; why: ID documents are sensitive.
- Signed-in pages live under src/routes/_authenticated/; why: managed auth gate.
