/** Option lists shared by onboarding and settings. */

export const NATIVE_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "hi", label: "Hindi (हिन्दी)" },
  { code: "te", label: "Telugu (తెలుగు)" },
  { code: "ta", label: "Tamil (தமிழ்)" },
  { code: "bn", label: "Bengali (বাংলা)" },
  { code: "es", label: "Spanish (Español)" },
  { code: "fr", label: "French (Français)" },
  { code: "pt", label: "Portuguese (Português)" },
  { code: "ar", label: "Arabic (العربية)" },
  { code: "zh", label: "Chinese (中文)" },
  { code: "ja", label: "Japanese (日本語)" },
  { code: "de", label: "German (Deutsch)" },
  { code: "other", label: "Another language" },
] as const;

export const PROFICIENCIES = [
  { value: "beginner", label: "Beginner", hint: "I know almost nothing yet." },
  { value: "elementary", label: "Elementary", hint: "I know greetings and simple phrases." },
  { value: "intermediate", label: "Intermediate", hint: "I can hold a basic conversation." },
  { value: "advanced", label: "Advanced", hint: "I want to polish and go deeper." },
] as const;

export const OBJECTIVES = [
  { value: "travel", label: "Travel", hint: "Get around and ask for things." },
  { value: "work", label: "Work", hint: "Use it in my career." },
  { value: "study", label: "Study", hint: "School, exams or university." },
  { value: "culture", label: "Culture", hint: "Films, books and music." },
  { value: "family", label: "Family", hint: "Talk with people I love." },
  { value: "fun", label: "Curiosity", hint: "Because it is interesting." },
] as const;

export const DAILY_GOALS = [
  { value: 5, label: "5 min", hint: "Casual" },
  { value: 10, label: "10 min", hint: "Regular" },
  { value: 20, label: "20 min", hint: "Serious" },
  { value: 30, label: "30 min", hint: "Intense" },
] as const;

export const LEARNING_STYLES = [
  { value: "visual", label: "Visual", hint: "Pictures, patterns and reading." },
  { value: "listening", label: "Listening", hint: "Hearing words and phrases." },
  { value: "reading", label: "Reading", hint: "Texts and written explanations." },
  { value: "speaking", label: "Speaking", hint: "Talking out loud." },
  { value: "mixed", label: "A bit of everything", hint: "No strong preference." },
] as const;

export const PROFICIENCY_VALUES = PROFICIENCIES.map((p) => p.value) as unknown as readonly ["beginner", "elementary", "intermediate", "advanced"];
export const OBJECTIVE_VALUES = OBJECTIVES.map((p) => p.value) as unknown as readonly ["travel", "work", "study", "culture", "family", "fun"];
export const STYLE_VALUES = LEARNING_STYLES.map((p) => p.value) as unknown as readonly ["visual", "listening", "reading", "speaking", "mixed"];
export const GOAL_VALUES = DAILY_GOALS.map((p) => p.value);
