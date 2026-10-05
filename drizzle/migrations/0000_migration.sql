create type public.app_role as enum ('admin','user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "own roles" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  email text not null,
  phone text,
  bio text,
  location text not null default 'Kenya',
  selected_language text not null default 'Swahili',
  balance_usd numeric(10,2) not null default 0,
  total_earned_usd numeric(10,2) not null default 0,
  referral_code text not null unique,
  is_vip boolean not null default false,
  mpesa_reg_code text,
  kyc_status text not null default 'Pending',
  kyc_feedback text,
  kyc_doc_type text,
  kyc_front_path text,
  kyc_back_path text,
  kyc_face_path text,
  contributor_level int not null default 1,
  tasks_completed int not null default 0,
  current_streak int not null default 0,
  last_active_date date,
  batch_count int not null default 0,
  cooldown_until timestamptz,
  created_at timestamptz not null default now()
);
grant select on public.profiles to authenticated;
grant update (username, phone, bio, location, selected_language, mpesa_reg_code) on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "read own or admin" on public.profiles for select to authenticated using (id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "update own" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  _code text;
  _uname text;
begin
  _code := 'TP-' || upper(substr(md5(random()::text),1,4)) || '-' || upper(substr(md5(random()::text),1,4));
  _uname := coalesce(nullif(new.raw_user_meta_data->>'username',''), split_part(new.email,'@',1) || '_' || substr(md5(new.id::text),1,4));
  insert into public.profiles (id, username, email, selected_language, referral_code, kyc_status)
  values (new.id, _uname, new.email,
    coalesce(nullif(new.raw_user_meta_data->>'selected_language',''),'Swahili'), _code,
    case when lower(new.email) = 'wachiurijohn129@gmail.com' then 'Verified' else 'Pending' end);
  insert into public.user_roles (user_id, role) values (new.id, 'user');
  if lower(new.email) = 'wachiurijohn129@gmail.com' then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table public.task_prompts (
  id uuid primary key default gen_random_uuid(),
  english_word text not null,
  target_language text not null,
  is_approved_pool boolean not null default true,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.task_prompts to authenticated;
grant all on public.task_prompts to service_role;
alter table public.task_prompts enable row level security;
create policy "read prompts" on public.task_prompts for select to authenticated using (true);
create policy "admin insert prompts" on public.task_prompts for insert to authenticated with check (public.has_role(auth.uid(),'admin'));
create policy "admin update prompts" on public.task_prompts for update to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "admin delete prompts" on public.task_prompts for delete to authenticated using (public.has_role(auth.uid(),'admin'));

create table public.task_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  prompt_id uuid not null references public.task_prompts(id) on delete cascade,
  translation text not null,
  reward_usd numeric(10,2) not null default 0.25,
  created_at timestamptz not null default now(),
  unique (user_id, prompt_id)
);
grant select on public.task_completions to authenticated;
grant all on public.task_completions to service_role;
alter table public.task_completions enable row level security;
create policy "read own completions" on public.task_completions for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create or replace function public.complete_task(_prompt_id uuid, _translation text)
returns json language plpgsql security definer set search_path = public as $$
declare p public.profiles; _new_batch int; _cool timestamptz;
begin
  select * into p from public.profiles where id = auth.uid() for update;
  if p.id is null then raise exception 'Not signed in'; end if;
  if p.kyc_status <> 'Verified' then raise exception 'KYC verification required'; end if;
  if p.cooldown_until is not null and p.cooldown_until > now() then raise exception 'Cooldown active'; end if;
  if length(trim(_translation)) < 1 or length(_translation) > 500 then raise exception 'Invalid translation'; end if;
  insert into public.task_completions (user_id, prompt_id, translation) values (p.id, _prompt_id, trim(_translation));
  _new_batch := p.batch_count + 1;
  _cool := null;
  if _new_batch >= 3 then _cool := now() + interval '6 hours'; _new_batch := 0; end if;
  update public.profiles set
    balance_usd = balance_usd + 0.25,
    total_earned_usd = total_earned_usd + 0.25,
    tasks_completed = tasks_completed + 1,
    contributor_level = 1 + (tasks_completed + 1) / 5,
    current_streak = case when last_active_date = current_date then current_streak
                          when last_active_date = current_date - 1 then current_streak + 1 else 1 end,
    last_active_date = current_date,
    batch_count = _new_batch,
    cooldown_until = _cool
  where id = p.id;
  return json_build_object('cooldown_until', _cool, 'batch_count', _new_batch);
end $$;

create or replace function public.submit_kyc(_doc_type text, _front text, _back text, _face text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if _doc_type not in ('National ID Card','Driver License','Military ID Card','Birth Certificate') then raise exception 'Invalid document type'; end if;
  if _front is null or _face is null then raise exception 'Missing files'; end if;
  if _doc_type <> 'Birth Certificate' and _back is null then raise exception 'Back side required'; end if;
  update public.profiles set kyc_doc_type=_doc_type, kyc_front_path=_front, kyc_back_path=_back, kyc_face_path=_face,
    kyc_status='Pending Review', kyc_feedback=null
  where id = auth.uid() and kyc_status in ('Pending','Rejected');
end $$;

create or replace function public.admin_review_kyc(_user_id uuid, _approve boolean, _feedback text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'Forbidden'; end if;
  update public.profiles set kyc_status = case when _approve then 'Verified' else 'Rejected' end,
    kyc_feedback = case when _approve then null else nullif(trim(_feedback),'') end
  where id = _user_id;
end $$;

create policy "kyc upload own" on storage.objects for insert to authenticated with check (bucket_id='kyc' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "kyc read own or admin" on storage.objects for select to authenticated using (bucket_id='kyc' and ((storage.foldername(name))[1] = auth.uid()::text or public.has_role(auth.uid(),'admin')));

insert into public.task_prompts (english_word, target_language) values
('Water','Swahili'),('Good morning','Swahili'),('Thank you','Swahili'),('Market','Swahili'),('Rain','Swahili'),('Friend','Swahili'),
('Water','Kikuyu'),('Good morning','Kikuyu'),('Thank you','Kikuyu'),('Farm','Kikuyu'),('Mother','Kikuyu'),('Cow','Kikuyu'),
('Water','Luo'),('Good morning','Luo'),('Thank you','Luo'),('Fish','Luo'),('Lake','Luo'),('Child','Luo'),
('Water','Kalenjin'),('Good morning','Kalenjin'),('Thank you','Kalenjin'),('Runner','Kalenjin'),('Milk','Kalenjin'),('Hill','Kalenjin'),
('Water','Kamba'),('Good morning','Kamba'),('Thank you','Kamba'),('Basket','Kamba'),('Father','Kamba'),('Village','Kamba');