-- Row Level Security. Every table is locked by default; policies below open exactly what is needed.
-- Rule of thumb:
--   * Learning content: learners read published content, only admins write.
--   * Private records: a user can only see and change their own rows.
--   * Anything that must not be self-granted (achievements, AI quota) has NO insert policy;
--     it is written only by SECURITY DEFINER functions in 0002_functions.sql.

alter table public.languages enable row level security;
alter table public.courses enable row level security;
alter table public.levels enable row level security;
alter table public.units enable row level security;
alter table public.lessons enable row level security;
alter table public.exercises enable row level security;
alter table public.exercise_options enable row level security;
alter table public.vocabulary enable row level security;
alter table public.lesson_vocabulary enable row level security;
alter table public.profiles enable row level security;
alter table public.user_languages enable row level security;
alter table public.lesson_attempts enable row level security;
alter table public.exercise_attempts enable row level security;
alter table public.user_progress enable row level security;
alter table public.learning_sessions enable row level security;
alter table public.user_vocabulary enable row level security;
alter table public.vocabulary_reviews enable row level security;
alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;
alter table public.ai_usage enable row level security;
alter table public.ai_conversations enable row level security;

-- ---------- learning content ----------
create policy "read published languages" on public.languages for select to authenticated
  using (published or public.is_admin());
create policy "admin writes languages" on public.languages for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "read published courses" on public.courses for select to authenticated
  using (published or public.is_admin());
create policy "admin writes courses" on public.courses for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "read published levels" on public.levels for select to authenticated
  using (published or public.is_admin());
create policy "admin writes levels" on public.levels for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "read published units" on public.units for select to authenticated
  using (published or public.is_admin());
create policy "admin writes units" on public.units for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "read visible lessons" on public.lessons for select to authenticated
  using (public.lesson_visible(id) or public.is_admin());
create policy "admin writes lessons" on public.lessons for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "read visible exercises" on public.exercises for select to authenticated
  using (public.lesson_visible(lesson_id) or public.is_admin());
create policy "admin writes exercises" on public.exercises for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "read visible options" on public.exercise_options for select to authenticated
  using (public.exercise_visible(exercise_id) or public.is_admin());
create policy "admin writes options" on public.exercise_options for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "read lesson vocabulary" on public.lesson_vocabulary for select to authenticated
  using (public.lesson_visible(lesson_id) or public.is_admin());
create policy "admin writes lesson vocabulary" on public.lesson_vocabulary for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Curated words (owner_id null) are public; custom words are private to their owner.
create policy "read vocabulary" on public.vocabulary for select to authenticated
  using (owner_id is null or owner_id = auth.uid() or public.is_admin());
create policy "add vocabulary" on public.vocabulary for insert to authenticated
  with check (owner_id = auth.uid() or (owner_id is null and public.is_admin()));
create policy "edit vocabulary" on public.vocabulary for update to authenticated
  using (owner_id = auth.uid() or (owner_id is null and public.is_admin()))
  with check (owner_id = auth.uid() or (owner_id is null and public.is_admin()));
create policy "delete vocabulary" on public.vocabulary for delete to authenticated
  using (owner_id = auth.uid() or (owner_id is null and public.is_admin()));

create policy "read achievements" on public.achievements for select to authenticated using (true);
create policy "admin writes achievements" on public.achievements for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------- profiles ----------
create policy "read own profile" on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
create policy "create own profile" on public.profiles for insert to authenticated
  with check (id = auth.uid() and role = 'learner');
create policy "update own profile" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
-- Role changes are additionally blocked by the profiles_protect_role trigger.

-- ---------- private learning records ----------
create policy "own user_languages" on public.user_languages for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "read own attempts" on public.lesson_attempts for select to authenticated
  using (user_id = auth.uid());
create policy "record own attempts" on public.lesson_attempts for insert to authenticated
  with check (user_id = auth.uid() and public.lesson_visible(lesson_id));
create policy "delete own attempts" on public.lesson_attempts for delete to authenticated
  using (user_id = auth.uid());

create policy "read own exercise attempts" on public.exercise_attempts for select to authenticated
  using (user_id = auth.uid());
create policy "record own exercise attempts" on public.exercise_attempts for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.lesson_attempts a where a.id = attempt_id and a.user_id = auth.uid())
  );

create policy "own progress" on public.user_progress for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.lesson_visible(lesson_id));

create policy "own sessions" on public.learning_sessions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "read own saved words" on public.user_vocabulary for select to authenticated
  using (user_id = auth.uid());
create policy "save words" on public.user_vocabulary for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.vocabulary v where v.id = vocabulary_id and (v.owner_id is null or v.owner_id = auth.uid()))
  );
create policy "update own saved words" on public.user_vocabulary for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "remove saved words" on public.user_vocabulary for delete to authenticated
  using (user_id = auth.uid());

create policy "read own reviews" on public.vocabulary_reviews for select to authenticated
  using (user_id = auth.uid());
create policy "record own reviews" on public.vocabulary_reviews for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.user_vocabulary uv where uv.id = user_vocabulary_id and uv.user_id = auth.uid())
  );

create policy "read own achievements" on public.user_achievements for select to authenticated
  using (user_id = auth.uid());
-- no insert policy on purpose: see evaluate_achievements()

create policy "read own ai usage" on public.ai_usage for select to authenticated
  using (user_id = auth.uid());
-- no insert/update policy on purpose: see consume_ai_quota()

create policy "own conversations" on public.ai_conversations for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- storage: public lesson audio, admin-only uploads ----------
insert into storage.buckets (id, name, public) values ('lesson-audio', 'lesson-audio', true)
  on conflict (id) do nothing;

create policy "anyone reads lesson audio" on storage.objects for select
  using (bucket_id = 'lesson-audio');
create policy "admins upload lesson audio" on storage.objects for insert to authenticated
  with check (bucket_id = 'lesson-audio' and public.is_admin());
create policy "admins update lesson audio" on storage.objects for update to authenticated
  using (bucket_id = 'lesson-audio' and public.is_admin());
create policy "admins delete lesson audio" on storage.objects for delete to authenticated
  using (bucket_id = 'lesson-audio' and public.is_admin());
