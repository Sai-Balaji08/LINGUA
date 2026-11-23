-- Server-side helpers. Everything here runs inside Postgres, so it cannot be bypassed from the browser.

-- Is the signed-in user an admin? SECURITY DEFINER so it can read profiles without recursion.
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- A lesson is visible to learners only when every ancestor is published.
create or replace function public.lesson_visible(p_lesson_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.lessons l
    join public.units u on u.id = l.unit_id
    join public.levels lv on lv.id = u.level_id
    join public.courses c on c.id = lv.course_id
    join public.languages lang on lang.id = c.language_id
    where l.id = p_lesson_id
      and l.published and u.published and lv.published and c.published and lang.published
  );
$$;

create or replace function public.exercise_visible(p_exercise_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select public.lesson_visible(e.lesson_id) from public.exercises e where e.id = p_exercise_id;
$$;

-- Create a profile row whenever someone signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Learners can edit their own profile but can never change their own role.
create or replace function public.protect_profile_role()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role and auth.uid() is not null then
    -- Only an existing admin may change roles, and never their own.
    if not public.is_admin() or new.id = auth.uid() then
      new.role := old.role;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists profiles_protect_role on public.profiles;
create trigger profiles_protect_role
  before update on public.profiles
  for each row execute function public.protect_profile_role();

-- Daily AI quota. Returns true when the request is allowed and counts it.
create or replace function public.consume_ai_quota(p_limit int)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_requests int;
begin
  if v_uid is null then return false; end if;
  insert into public.ai_usage (user_id, day, requests) values (v_uid, current_date, 0)
    on conflict (user_id, day) do nothing;
  update public.ai_usage set requests = requests + 1
    where user_id = v_uid and day = current_date and requests < p_limit
    returning requests into v_requests;
  return v_requests is not null;
end $$;

-- Remaining AI requests for today (read-only).
create or replace function public.ai_quota_remaining(p_limit int)
returns int
language sql stable security definer set search_path = public as $$
  select greatest(p_limit - coalesce((select requests from public.ai_usage
    where user_id = auth.uid() and day = current_date), 0), 0);
$$;

-- Awards achievements the caller has genuinely earned. Users cannot insert into
-- user_achievements directly; this function is the only way.
create or replace function public.evaluate_achievements()
returns setof public.achievements
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_lessons int;
  v_words int;
  v_convos int;
  v_perfect int;
  v_days int;
begin
  if v_uid is null then return; end if;

  select count(*) into v_lessons from public.user_progress where user_id = v_uid and status = 'completed';
  select count(*) into v_words from public.user_vocabulary where user_id = v_uid;
  select count(*) into v_convos from public.ai_conversations where user_id = v_uid and status = 'ended';
  select count(*) into v_perfect from public.lesson_attempts where user_id = v_uid and score = 100;
  select count(distinct (started_at at time zone 'utc')::date) into v_days
    from public.learning_sessions where user_id = v_uid and started_at > now() - interval '30 days';

  return query
  with earned as (
    insert into public.user_achievements (user_id, achievement_id)
    select v_uid, a.id from public.achievements a
    where not exists (select 1 from public.user_achievements ua where ua.user_id = v_uid and ua.achievement_id = a.id)
      and (
        (a.code = 'first_lesson' and v_lessons >= 1) or
        (a.code = 'ten_lessons' and v_lessons >= 10) or
        (a.code = 'perfect_lesson' and v_perfect >= 1) or
        (a.code = 'fifty_words' and v_words >= 50) or
        (a.code = 'first_conversation' and v_convos >= 1) or
        (a.code = 'seven_active_days' and v_days >= 7)
      )
    returning achievement_id
  )
  select a.* from public.achievements a join earned e on e.achievement_id = a.id;
end $$;

-- Lets a signed-in user permanently delete their own account and all of their data.
create or replace function public.delete_my_account()
returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  delete from auth.users where id = auth.uid();
end $$;

-- Lock down who may call what.
revoke all on function public.consume_ai_quota(int) from public, anon;
revoke all on function public.ai_quota_remaining(int) from public, anon;
revoke all on function public.evaluate_achievements() from public, anon;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.consume_ai_quota(int) to authenticated;
grant execute on function public.ai_quota_remaining(int) to authenticated;
grant execute on function public.evaluate_achievements() to authenticated;
grant execute on function public.delete_my_account() to authenticated;
grant execute on function public.is_admin() to authenticated, anon;
grant execute on function public.lesson_visible(uuid) to authenticated, anon;
grant execute on function public.exercise_visible(uuid) to authenticated, anon;

-- Starter achievements.
insert into public.achievements (code, title, description, icon) values
  ('first_lesson', 'First lesson', 'Finished your first lesson.', 'flag'),
  ('ten_lessons', 'Ten lessons', 'Finished ten lessons.', 'layers'),
  ('perfect_lesson', 'Clean sweep', 'Answered every exercise in a lesson correctly.', 'sparkles'),
  ('fifty_words', 'Fifty words', 'Saved fifty words to your vocabulary.', 'book-open'),
  ('first_conversation', 'First conversation', 'Finished a conversation with the AI partner.', 'message-circle'),
  ('seven_active_days', 'Seven days of practice', 'Practised on seven different days in the last 30.', 'calendar-check')
on conflict (code) do nothing;

-- To make someone an admin, run this in the Supabase SQL editor (replace the email):
--   update public.profiles set role = 'admin'
--   where id = (select id from auth.users where email = 'you@example.com');
-- The SQL editor runs without an end-user session (auth.uid() is null), so the role trigger lets it through.
