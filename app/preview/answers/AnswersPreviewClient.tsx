"use client";

import EmployerAnswersForm from "@/components/dashboard/EmployerAnswersForm";
import StepEmployerAnswers from "@/components/onboarding/StepEmployerAnswers";
import StepHeader from "@/components/onboarding/StepHeader";
import type { AnswerQuestion } from "@/lib/employerAnswers";
import { STEP, STEPS } from "@/lib/onboarding/steps";
import type { UserProfile } from "@/lib/types";

// Logged-out look at the "answer these once" form in both of its homes: the signup step
// (every question, pre-filled from the resume) and the Start gate (only what is still
// missing). Both are the REAL components with mock questions — nothing here can save.
// `?dark=1` flips the dashboard half; signup has one look.
const NO_LINKEDIN = { flag: "no_linkedin", label: "I don't have a LinkedIn" };
const NO_DEGREE = { flag: "no_degree", label: "I don't have a college degree" };
const NO_PAY = { flag: "no_salary_expectation", label: "I'd rather not name a number" };

const ALL: AnswerQuestion[] = [
  { key: "country", label: "Do you live in the United States?", kind: "us_resident", value: null },
  { key: "city", label: "City", kind: "text", value: "Austin" },
  { key: "state", label: "State", kind: "text", value: "TX" },
  { key: "work_authorized_us", label: "Are you legally authorized to work in the United States?", kind: "yesno", value: true },
  { key: "needs_sponsorship", label: "Will you now or in the future require visa sponsorship?", kind: "yesno", value: null },
  { key: "current_title", label: "Most recent job title", kind: "text", value: "", suggestion: "Marketing Manager" },
  { key: "current_employer", label: "Most recent employer", kind: "text", value: "", suggestion: "Acme Inc." },
  { key: "linkedin_url", label: "LinkedIn profile URL", kind: "text", value: "", suggestion: "linkedin.com/in/jane-roe", opt_out: NO_LINKEDIN },
  { key: "school", label: "School or university", kind: "text", value: "", suggestion: "University of Texas at Austin", opt_out: NO_DEGREE },
  { key: "degree", label: "Degree", kind: "text", value: "", suggestion: "BA Communications", opt_out: NO_DEGREE },
  { key: "salary_expectation", label: "Salary expectation — what we tell employers who ask", kind: "text", value: "", suggestion: "$85,000 per year", opt_out: NO_PAY },
];
const MISSING = ALL.filter((q) => ["school", "degree", "salary_expectation"].includes(q.key));

const PROFILE = { work_authorized_us: null, needs_sponsorship: null } as UserProfile;

const noop = () => {};

export default function AnswersPreviewClient({ dark }: { dark: boolean }) {
  return (
    <div>
      {/* Signup — the wizard's own card */}
      <div className="app-ui min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-4 py-12">
          <p className="mb-4 text-xs text-text2/70">
            Preview — signup step {STEP.answers} of {STEPS.length} (mock answers, nothing saves)
          </p>
          <div className="bg-surface rounded-2xl overflow-hidden"
            style={{ boxShadow: "0 10px 44px -14px rgba(26,26,46,0.22), 0 1px 3px rgba(26,26,46,0.06)" }}>
            <StepHeader step={STEP.answers} />
            <div className="p-6 sm:p-8">
              <StepEmployerAnswers profile={PROFILE} preset={ALL} onNext={noop} onBack={noop} />
            </div>
          </div>
        </div>
      </div>

      {/* Start gate — the dashboard's "Almost there" sheet, for accounts older than a question */}
      <div className={["bg-background hd-dash-root py-12 px-4", dark ? "dark" : ""].join(" ")}>
        <p className="mb-4 text-center text-xs text-text2/70">
          Preview — the Start gate {dark ? "(night)" : "(day)"}
        </p>
        <div className="mx-auto w-full max-w-md bg-surface border border-border rounded-2xl shadow-xl p-6">
          <h3 className="text-lg font-bold text-text">Almost there</h3>
          <p className="text-sm text-text2/70 mb-4">
            A couple of things before your campaign can actually apply:
          </p>
          <EmployerAnswersForm questions={MISSING} onDone={noop} />
        </div>
      </div>
    </div>
  );
}
