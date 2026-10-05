CREATE TABLE public.withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount_usd numeric NOT NULL,
  amount_kes numeric NOT NULL,
  mpesa_phone text NOT NULL,
  status text NOT NULL DEFAULT 'Pending',
  mpesa_receipt text,
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);
GRANT SELECT ON public.withdrawals TO authenticated;
GRANT ALL ON public.withdrawals TO service_role;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own or admin withdrawals" ON public.withdrawals FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- Users may only edit safe profile fields, never balances, levels or KYC state
REVOKE UPDATE ON public.profiles FROM authenticated, anon;
GRANT UPDATE (phone, bio, location, selected_language, mpesa_reg_code) ON public.profiles TO authenticated;

CREATE OR REPLACE FUNCTION public.request_withdrawal(_amount_usd numeric, _phone text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
declare p public.profiles; _id uuid; _ph text;
begin
  select * into p from public.profiles where id = auth.uid() for update;
  if p.id is null then raise exception 'Not signed in'; end if;
  if p.kyc_status <> 'Verified' then raise exception 'ID verification required'; end if;
  _ph := regexp_replace(coalesce(_phone,''), '\s', '', 'g');
  if _ph ~ '^0[17][0-9]{8}$' then _ph := '254' || substr(_ph,2); end if;
  if _ph ~ '^\+254' then _ph := substr(_ph,2); end if;
  if _ph !~ '^254[17][0-9]{8}$' then raise exception 'Enter a valid Kenyan M-Pesa number'; end if;
  if _amount_usd is null or _amount_usd < 2 then raise exception 'Minimum withdrawal is $2.00'; end if;
  if _amount_usd > p.balance_usd then raise exception 'Amount exceeds your balance'; end if;
  if exists (select 1 from public.withdrawals where user_id = p.id and status = 'Pending') then
    raise exception 'You already have a pending withdrawal'; end if;
  update public.profiles set balance_usd = balance_usd - round(_amount_usd,2) where id = p.id;
  insert into public.withdrawals (user_id, amount_usd, amount_kes, mpesa_phone)
    values (p.id, round(_amount_usd,2), round(_amount_usd * 129), _ph) returning id into _id;
  return _id;
end $$;

CREATE OR REPLACE FUNCTION public.admin_review_withdrawal(_id uuid, _approve boolean, _receipt text, _note text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
declare w public.withdrawals;
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'Forbidden'; end if;
  select * into w from public.withdrawals where id = _id for update;
  if w.id is null or w.status <> 'Pending' then raise exception 'Withdrawal is not pending'; end if;
  if _approve then
    if coalesce(trim(_receipt),'') = '' then raise exception 'M-Pesa receipt code required'; end if;
    update public.withdrawals set status='Paid', mpesa_receipt=upper(trim(_receipt)), admin_note=nullif(trim(_note),''), reviewed_at=now() where id=_id;
  else
    if coalesce(trim(_note),'') = '' then raise exception 'Rejection note required'; end if;
    update public.withdrawals set status='Rejected', admin_note=trim(_note), reviewed_at=now() where id=_id;
    update public.profiles set balance_usd = balance_usd + w.amount_usd where id = w.user_id;
  end if;
end $$;
REVOKE EXECUTE ON FUNCTION public.request_withdrawal(numeric, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_review_withdrawal(uuid, boolean, text, text) FROM anon;