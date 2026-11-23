// Hand-written row types matching supabase/migrations/0001_schema.sql.

export type UserRole = "learner" | "admin";
export type ExerciseType =
  | "multiple_choice"
  | "translation"
  | "fill_blank"
  | "word_arrangement"
  | "listening"
  | "reading"
  | "matching"
  | "grammar"
  | "writing"
  | "speaking";
export type Skill = "reading" | "listening" | "writing" | "speaking" | "grammar" | "vocabulary";

export interface Language {
  id: string;
  code: string;
  name: string;
  native_name: string;
  greeting: string;
  speech_locale: string;
  published: boolean;
  position: number;
}

export interface Course {
  id: string;
  language_id: string;
  title: string;
  description: string;
  taught_in: string;
  published: boolean;
  position: number;
}

export interface Level {
  id: string;
  course_id: string;
  code: string;
  title: string;
  position: number;
  published: boolean;
}

export interface Unit {
  id: string;
  level_id: string;
  title: string;
  description: string;
  position: number;
  published: boolean;
}

export interface Lesson {
  id: string;
  unit_id: string;
  title: string;
  description: string;
  grammar_note: string | null;
  estimated_minutes: number;
  position: number;
  published: boolean;
}

export interface ExerciseOption {
  id: string;
  exercise_id: string;
  text: string;
  match_text: string | null;
  is_correct: boolean;
  position: number;
}

export interface Exercise {
  id: string;
  lesson_id: string;
  type: ExerciseType;
  skill: Skill;
  prompt: string;
  instructions: string;
  explanation: string;
  audio_url: string | null;
  content: Record<string, unknown>;
  position: number;
  exercise_options?: ExerciseOption[];
}

export interface VocabularyWord {
  id: string;
  language_id: string;
  owner_id: string | null;
  term: string;
  translation: string;
  transliteration: string | null;
  part_of_speech: string | null;
  definition: string | null;
  example_sentence: string | null;
  example_translation: string | null;
  audio_url: string | null;
}

export interface UserVocabulary {
  id: string;
  user_id: string;
  vocabulary_id: string;
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  lapses: number;
  due_at: string;
  last_reviewed_at: string | null;
  vocabulary?: VocabularyWord;
}

export interface Profile {
  id: string;
  display_name: string;
  role: UserRole;
  native_language: string | null;
  target_language_id: string | null;
  proficiency: "beginner" | "elementary" | "intermediate" | "advanced" | null;
  objective: "travel" | "work" | "study" | "culture" | "family" | "fun" | null;
  daily_goal_minutes: number;
  learning_style: "visual" | "listening" | "reading" | "speaking" | "mixed" | null;
  onboarded: boolean;
  notify_daily_reminder: boolean;
  notify_weekly_summary: boolean;
  allow_ai_feedback: boolean;
}

export interface LessonAttempt {
  id: string;
  user_id: string;
  lesson_id: string;
  score: number;
  correct_count: number;
  total_count: number;
  duration_seconds: number;
  xp_earned: number;
  passed: boolean;
  completed_at: string;
}

export interface ExerciseAttempt {
  id: string;
  attempt_id: string;
  user_id: string;
  exercise_id: string;
  skill: Skill;
  score: number;
  is_correct: boolean;
  measured: boolean;
  time_ms: number;
  created_at: string;
}

export interface UserProgress {
  user_id: string;
  lesson_id: string;
  status: "in_progress" | "completed";
  best_score: number;
  attempts: number;
  completed_at: string | null;
}

export interface LearningSession {
  id: string;
  user_id: string;
  activity: "lesson" | "review" | "conversation";
  ref_id: string | null;
  duration_seconds: number;
  started_at: string;
}

export interface Achievement {
  id: string;
  code: string;
  title: string;
  description: string;
  icon: string;
}

export interface UserLanguage {
  user_id: string;
  language_id: string;
  proficiency: string | null;
  placement_score: number | null;
  start_lesson_id: string | null;
  started_at: string;
}
