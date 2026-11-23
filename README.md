# LINGUA

A free-first language learning platform. **Learn a language. Don't just complete lessons.**

Next.js 16 · TypeScript · Tailwind CSS · Framer Motion · Supabase (Auth, Postgres, Row Level Security, Storage) · optional server-side AI.

---

## What is built

| Area | Where | Notes |
| --- | --- | --- |
| Landing page | `src/app/page.tsx`, `src/components/landing/*` | Hero, how it works, languages, method, AI demo, features, free promise, FAQ |
| Auth | `src/app/(auth)/*`, `src/proxy.ts`, `src/lib/auth.ts` | Sign up, log in, log out, forgot/reset password, email verification, session cookies, protected routes |
| Onboarding | `src/app/onboarding/*` | Six questions plus an optional placement check scored on the server |
| Dashboard | `src/app/(app)/dashboard` | Real data only: goal, streak, due words, week chart, recent activity, next lesson |
| Course map and lessons | `src/app/(app)/learn/*`, `src/components/lesson/*` | Language → Course → Level → Unit → Lesson → Exercise |
| 10 exercise types | `src/lib/exercises/*`, `src/components/exercise/*` | Multiple choice, translation, fill blank, word arrangement, listening, reading, matching, grammar, writing, speaking |
| Vocabulary and review | `src/app/(app)/vocabulary`, `review` | Spaced repetition (SM-2 style), difficult words, search, flashcards, review history |
| Conversation partner | `src/app/(app)/conversation`, `src/app/api/ai/*` | Six scenarios, three difficulties, highlighted mistakes, corrections, natural alternatives, review |
| Progress | `src/app/(app)/progress` | Skill accuracy kept separate from practice time, streaks and XP |
| Settings | `src/app/(app)/settings` | Profile, learning preferences, notifications, privacy, password, delete account |
| Admin CMS | `src/app/(app)/admin/*` | Languages → exercises, answer options, explanations, audio upload, publish/unpublish, reorder |

## 1. Run it locally

```bash
cd lingua
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. Without Supabase keys the landing page works and private pages send you to a "setup needed" notice. That is expected until step 2.

## 2. Connect Supabase (about 10 minutes)

1. Create a free project at https://supabase.com.
2. **Project Settings → API**: copy the **Project URL** and the **anon public** key into `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   ```
   Do **not** use or paste the `service_role` key anywhere. LINGUA never needs it.
3. **SQL Editor**: run these files from `supabase/migrations/` **in order**, one at a time: `0001_schema.sql`, `0002_functions.sql`, `0003_rls.sql`, `0004_placement.sql`, `0005_ai_refund.sql`.
4. Then run `supabase/seed.sql` (starter Spanish, French and Hindi courses, safe to run again).
5. **Authentication → URL Configuration**: set Site URL to `http://localhost:3000` and add `http://localhost:3000/auth/callback` to Redirect URLs. (Add your Vercel URL and `/auth/callback` later.)
6. **Authentication → Providers → Email**: keep "Confirm email" on so email verification works.
7. Restart `npm run dev`, sign up, verify the email, finish onboarding.

### Make yourself an admin

Run in the SQL Editor (use your email). Nobody can do this from the website, by design:

```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'you@example.com');
```

Then **Admin** appears in the sidebar.

## 3. Optional: turn on the AI features

Add to `.env.local` (server only, never prefix with `NEXT_PUBLIC_`):

```
ANTHROPIC_API_KEY=sk-ant-...
AI_MODEL=claude-haiku-5-5
AI_DAILY_LIMIT=40
```

Without a key, lessons, vocabulary, review and progress all keep working and AI screens explain that AI is unavailable. `AI_DAILY_LIMIT` caps AI requests per learner per day to control cost. Lessons are never limited.

## 4. Deploy to Vercel

1. Push the project to GitHub.
2. Import it in Vercel and add the same environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`, and optionally the three AI variables).
3. Add the Vercel URL and `<url>/auth/callback` in Supabase **Authentication → URL Configuration**.

## Database relationships

```
languages 1─* courses 1─* levels 1─* units 1─* lessons 1─* exercises 1─* exercise_options
                                                   │
                                                   └─*─* vocabulary   (via lesson_vocabulary)

auth.users 1─1 profiles                       (role, preferences, privacy switches)
profiles   1─* user_languages  *─1 languages   (placement result, start lesson per language)
profiles   1─* lesson_attempts 1─* exercise_attempts *─1 exercises   (every answer, with its skill)
profiles   1─* user_progress   *─1 lessons     (completed / best score)
profiles   1─* learning_sessions               (minutes learned: lessons, review, conversation)
profiles   1─* user_vocabulary *─1 vocabulary  (spaced repetition state)
user_vocabulary 1─* vocabulary_reviews         (every review, for history)
profiles   *─* achievements                    (via user_achievements, granted only by a database function)
profiles   1─* ai_conversations, ai_usage      (saved chats; daily quota counter)
```

Deleting a parent deletes its children (cascade). Deleting an account removes every private row.

## Security model

- **Row Level Security is on for every table** (`0003_rls.sql`). Learners read only published content and only their own private rows.
- **Admin is enforced in three places**: the `/admin` layout reads the role from the database and returns 404 to others; every admin Server Action re-reads the role and re-validates input; and the database policies use `public.is_admin()`, so even a forged request is rejected. A trigger stops anyone changing their own role.
- **Scores are computed on the server** from the real exercises. The browser sends raw answers only.
- **Achievements and the AI quota** have no insert policy; only `SECURITY DEFINER` functions write them.
- **Secrets**: only the public anon key is used in the browser. AI keys stay on the server.
- **AI text is treated as untrusted**: parsed, length-limited and validated before storing or showing. Learner text is wrapped so it cannot act as instructions.
- Security headers are set in `next.config.ts`.

## Commands

```bash
npm run dev        # develop
npm run build      # production build
npm run lint       # type check (tsc --noEmit)
npm test           # unit tests (vitest)
npm run seed:build # regenerate supabase/seed.sql from scripts/seed-data.mjs
```

## Honest limits

- Speaking exercises are **self-rated**; they are recorded but never scored as proof of skill.
- Pronunciation uses the browser's built-in voices, so quality depends on the device.
- Notification toggles save your preference; sending reminder or weekly emails needs a scheduled job and an email provider, which are not included yet.
- The seed course is a small starter set. Use the Admin area to write more lessons.
