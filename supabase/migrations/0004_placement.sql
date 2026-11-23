-- Placement check result. Stored per learner and language, and used to choose the recommended first lesson.
-- Nothing is ever marked complete by a placement: it only moves the "start here" marker.
alter table public.user_languages
  add column if not exists placement_score numeric(5,2) check (placement_score between 0 and 100),
  add column if not exists start_lesson_id uuid references public.lessons(id) on delete set null;
-- Existing RLS policy "own user_languages" already limits these columns to their owner.
