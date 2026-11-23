-- Gives one AI request back to the caller. Used when the AI provider fails, so a learner is never charged quota for an error.
create or replace function public.refund_ai_quota()
returns void
language sql security definer set search_path = public as $$
  update public.ai_usage set requests = greatest(requests - 1, 0)
  where user_id = auth.uid() and day = current_date;
$$;

revoke all on function public.refund_ai_quota() from public, anon;
grant execute on function public.refund_ai_quota() to authenticated;
