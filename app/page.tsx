"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type QuestionType = "scale" | "yesno";
type AnswerValue = number | "yes" | "no";
type Answers = Record<string, AnswerValue>;
type CompletedMissions = Record<string, boolean>;

type Question = {
  id: string;
  category: string;
  categoryClass: string;
  title: string;
  description: string;
  type: QuestionType;
  lowLabel?: string;
  highLabel?: string;
  weight: number;
  factor: string;
};

type User = {
  id: string;
  name: string;
  email: string;
  password?: string;
};

type Risk = {
  label: "Low" | "Moderate" | "High";
  key: "low" | "moderate" | "high";
  color: string;
  gaugeColor?: string;
  message: string;
};

type Result = {
  percent: number;
  risk: Risk;
  riskFactors: string[];
  recommendations: string[];
  missions: string[];
  createdAt: string;
};

const TOKEN_KEY = "cancer-risk-app-token";
const USER_KEY = "cancer-risk-app-user";
const USERS_KEY = "cancer-risk-app-users";
const RESULT_KEY_PREFIX = "cancer-risk-app-latest-result";

const QUESTIONS: Question[] = [
  {
    id: "processedFood",
    category: "Diet",
    categoryClass: "cat-diet",
    title: "How often do you eat processed food?",
    description:
      "Examples include ham, sausages, instant meals, packaged snacks, and highly processed foods.",
    type: "scale",
    lowLabel: "Rarely",
    highLabel: "Very often",
    weight: 1.3,
    factor: "High processed food intake",
  },
  {
    id: "redMeat",
    category: "Diet",
    categoryClass: "cat-diet",
    title: "How often do you eat red meat?",
    description: "Examples include beef, pork, lamb, and processed red meat products.",
    type: "scale",
    lowLabel: "0–1 times/week",
    highLabel: "Almost daily",
    weight: 1.2,
    factor: "High red meat intake",
  },
  {
    id: "smoking",
    category: "Lifestyle",
    categoryClass: "cat-lifestyle",
    title: "Do you currently smoke?",
    description: "Include cigarettes, e-cigarettes, and heated tobacco products.",
    type: "yesno",
    weight: 2.5,
    factor: "Smoking",
  },
  {
    id: "alcohol",
    category: "Lifestyle",
    categoryClass: "cat-lifestyle",
    title: "How often do you drink alcohol?",
    description: "Choose a higher score if you drink frequently or tend to drink heavily.",
    type: "scale",
    lowLabel: "Rarely",
    highLabel: "Often/heavily",
    weight: 1.4,
    factor: "Frequent alcohol use",
  },
  {
    id: "sleep",
    category: "Lifestyle",
    categoryClass: "cat-lifestyle",
    title: "How would you rate your sleep quality?",
    description:
      "Choose a higher score if your sleep is short, irregular, or frequently interrupted.",
    type: "scale",
    lowLabel: "Good and regular",
    highLabel: "Poor/irregular",
    weight: 1.0,
    factor: "Poor or irregular sleep",
  },
  {
    id: "exerciseFrequency",
    category: "Exercise",
    categoryClass: "cat-exercise",
    title: "How often do you exercise each week?",
    description:
      "Include walking, cardio, strength training, sports, and other physical activity.",
    type: "scale",
    lowLabel: "5+ times/week",
    highLabel: "Almost never",
    weight: 1.4,
    factor: "Low exercise frequency",
  },
  {
    id: "exerciseIntensity",
    category: "Exercise",
    categoryClass: "cat-exercise",
    title: "How intense is your usual exercise?",
    description: "Consider whether your activity makes you breathe faster or sweat slightly.",
    type: "scale",
    lowLabel: "Moderate/strong",
    highLabel: "Very light",
    weight: 1.0,
    factor: "Low exercise intensity",
  },
  {
    id: "familyHistory",
    category: "Family History",
    categoryClass: "cat-family",
    title: "Do you have a close family history of cancer?",
    description: "Think of parents, siblings, grandparents, or other close relatives.",
    type: "yesno",
    weight: 2.0,
    factor: "Family history of cancer",
  },
  {
    id: "stress",
    category: "Stress / Environment",
    categoryClass: "cat-environment",
    title: "How high is your stress level recently?",
    description: "Answer based on your average stress level over the past 1–3 months.",
    type: "scale",
    lowLabel: "Low",
    highLabel: "Very high",
    weight: 1.1,
    factor: "High stress",
  },
  {
    id: "occupationalExposure",
    category: "Stress / Environment",
    categoryClass: "cat-environment",
    title: "Do you have occupational or environmental exposure risks?",
    description:
      "Examples include dust, chemicals, smoke, asbestos, radiation, or repeated pollution exposure.",
    type: "yesno",
    weight: 1.8,
    factor: "Occupational/environmental exposure",
  },
];

function getStoredArray<T>(key: string): T[] {
  if (typeof window === "undefined") return [];

  try {
    return JSON.parse(localStorage.getItem(key) || "[]") as T[];
  } catch {
    return [];
  }
}

function getScore(question: Question, answer: AnswerValue | undefined): number {
  if (answer === undefined || answer === null) return 0;

  if (question.type === "yesno") {
    return answer === "yes" ? 5 * question.weight : 1 * question.weight;
  }

  return Number(answer) * question.weight;
}

function classifyRisk(percent: number): Risk {
  if (percent < 35) {
    return {
      label: "Low",
      key: "low",
      color: "#16a34a",
      message:
        "Based on your answers, your lifestyle-based risk level is relatively low. The key is maintaining your current healthy habits.",
    };
  }

  if (percent < 65) {
    return {
      label: "Moderate",
      key: "moderate",
      color: "#ca8a04",
      gaugeColor: "#facc15",
      message:
        "Several lifestyle risk factors are present. Small, consistent changes can help reduce your long-term risk.",
    };
  }

  return {
    label: "High",
    key: "high",
    color: "#dc2626",
    message:
      "Multiple risk factors were identified. Consider improving lifestyle habits and discussing screening plans with a medical professional.",
  };
}

function getRecommendations(riskFactors: string[]): string[] {
  const recommendations = new Set<string>([
    "General health checkup",
    "Blood test and liver function test",
  ]);

  if (riskFactors.includes("Smoking")) {
    recommendations.add("Lung health consultation or low-dose chest CT discussion");
  }

  if (
    riskFactors.includes("High processed food intake") ||
    riskFactors.includes("High red meat intake")
  ) {
    recommendations.add("Colonoscopy consultation");
  }

  if (riskFactors.includes("Frequent alcohol use")) {
    recommendations.add("Liver ultrasound or liver-related screening consultation");
  }

  if (riskFactors.includes("Family history of cancer")) {
    recommendations.add("Family-history-based cancer screening consultation");
  }

  if (riskFactors.includes("Occupational/environmental exposure")) {
    recommendations.add("Occupational/environmental medicine consultation");
  }

  recommendations.add("Upper endoscopy consultation");
  return Array.from(recommendations);
}

function getMissions(riskFactors: string[]): string[] {
  const missions: string[] = [];

  if (riskFactors.includes("Smoking")) {
    missions.push("Reduce smoking by 20% this week or book a smoking cessation consultation.");
  }

  if (riskFactors.includes("High processed food intake")) {
    missions.push("Replace processed foods with home-cooked meals or salads 3 times this week.");
  }

  if (riskFactors.includes("High red meat intake")) {
    missions.push("Choose fish, chicken, tofu, or beans instead of red meat 2 times this week.");
  }

  if (riskFactors.includes("Low exercise frequency")) {
    missions.push("Walk for 20 minutes on 4 days this week.");
  }

  if (riskFactors.includes("Low exercise intensity")) {
    missions.push("Add 10 minutes of slightly breathless movement to one workout.");
  }

  if (riskFactors.includes("Poor or irregular sleep")) {
    missions.push("Keep your phone away for 1 hour before sleep on 3 nights.");
  }

  if (riskFactors.includes("High stress")) {
    missions.push("Do 5 minutes of breathing, stretching, or walking 5 times this week.");
  }

  if (missions.length === 0) {
    missions.push("Keep your current habits and complete light exercise at least 3 times this week.");
    missions.push("Add one serving of vegetables or fruit each day.");
  }

  return missions.slice(0, 4);
}

function Topbar({
  user,
  activePage,
  onSurvey,
  onMyPage,
  onLogout,
}: {
  user: User;
  activePage: "survey" | "mypage";
  onSurvey?: () => void;
  onMyPage?: () => void;
  onLogout: () => void;
}) {
  return (
    <div className="topbar">
      <div className="topbar-user">
        <img
          src="/assets/images/logo-symbol.png"
          alt="Cancer Lifestyle Risk Check logo"
          className="topbar-logo"
        />

        <div>
          <p className="topbar-small">Signed in as</p>
          <p className="topbar-name">
            {user.name} · {user.email}
          </p>
        </div>
      </div>
      <div className="topbar-actions">
        {activePage === "mypage" ? (
          <button className="btn btn-outline" onClick={onSurvey}>
            🏠 Survey
          </button>
        ) : (
          <button className="btn btn-outline" onClick={onMyPage}>
            👤 My Page
          </button>
        )}

        <button className="btn btn-outline" onClick={onLogout}>
          ↪ Log out
        </button>
      </div>
    </div>
  );
}

function RiskFactors({ factors }: { factors: string[] }) {
  if (!factors.length) {
    return <p className="green-note">No clearly high-risk factor was selected.</p>;
  }

  return (
    <div className="tag-wrap">
      {factors.map((factor) => (
        <span className="tag" key={factor}>
          {factor}
        </span>
      ))}
    </div>
  );
}

function Recommendations({ recommendations }: { recommendations: string[] }) {
  return (
    <div className="recommend-grid">
      {recommendations.map((item) => (
        <div className="recommend-item" key={item}>
          {item}
        </div>
      ))}
    </div>
  );
}

function ResultContent({
  result,
  completedMissions,
  setCompletedMissions,
  onRetake,
}: {
  result: Result;
  completedMissions: CompletedMissions;
  setCompletedMissions: React.Dispatch<React.SetStateAction<CompletedMissions>>;
  onRetake: () => void;
}) {
  const gaugeColor = result.risk.gaugeColor || result.risk.color;
  const degree = result.percent * 3.6;

  function toggleMission(mission: string) {
    setCompletedMissions((prev) => ({
      ...prev,
      [mission]: !prev[mission],
    }));
  }

  return (
    <div className="result-grid">
      <section className="card">
        <div className="card-inner">
          <h2 className="section-title">📋 Risk Analysis Result</h2>

          <div className={`risk-box risk-${result.risk.key}`}>
            <div className="risk-flex">
              <div
                className="gauge"
                style={{
                  background: `conic-gradient(${gaugeColor} ${degree}deg, #e2e8f0 0deg)`,
                }}
              >
                <div className="gauge-center">
                  <span className="gauge-score">{result.percent}</span>
                  <span className="gauge-sub">/ 100</span>
                </div>
              </div>

              <div>
                <p className="risk-label-small">Overall risk level</p>
                <p className={`risk-label ${result.risk.key}`}>{result.risk.label}</p>
                <p className="risk-message">{result.risk.message}</p>
              </div>
            </div>
          </div>

          <h3 className="mini-title">Main risk factors</h3>
          <RiskFactors factors={result.riskFactors} />

          <h3 className="mini-title">Recommended screening or consultation</h3>
          <Recommendations recommendations={result.recommendations} />

          <p className="disclaimer">
            This is not a medical diagnosis. It is a demo lifestyle-based risk estimate. Actual
            screening depends on age, sex, medical history, and professional medical advice.
          </p>
        </div>
      </section>

      <aside className="side-stack">
        <section className="card">
          <div className="card-inner">
            <h2 className="section-title">🎯 Weekly Action Plan</h2>

            <div className="mission-list">
              {result.missions.map((mission, index) => (
                <button
                  className={`mission-btn ${completedMissions[mission] ? "completed" : ""}`}
                  key={mission}
                  onClick={() => toggleMission(mission)}
                >
                  {completedMissions[mission] ? "✓" : index + 1}. {mission}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="card">
          <div className="card-inner">
            <h2 className="section-title">🔔 Weekly Reminder</h2>
            <p className="risk-message">
              This area can later connect to browser notifications, email, or a scheduled backend
              reminder.
            </p>
            <div className="reminder-box">
              Suggested reminder: Every Monday at 9:00 AM, check this week’s health mission.
            </div>
          </div>
        </section>

        <button className="btn btn-outline" onClick={onRetake}>
          ↻ Retake survey
        </button>
      </aside>
    </div>
  );
}

function MyPageContent({
  result,
  completedMissions,
}: {
  result: Result;
  completedMissions: CompletedMissions;
}) {
  const completedCount = Object.values(completedMissions).filter(Boolean).length;
  const totalMissions = result.missions.length;

  return (
    <div className="mypage-grid">
      <div className="side-stack">
        <section className="card">
          <div className="card-inner">
            <h2 className="section-title">📈 Latest Risk Score</h2>
            <div className={`score-large risk-${result.risk.key}`}>
              <p className="risk-label-small">Overall risk level</p>
              <p className={`risk-label ${result.risk.key}`}>{result.risk.label}</p>
              <p className="score-number">{result.percent} / 100</p>
              <p className="risk-message">{result.risk.message}</p>
            </div>
          </div>
        </section>

        <section className="card">
          <div className="card-inner">
            <h2 className="section-title">🎯 Mission Progress</h2>
            <div className="mission-count">
              <p className="mission-count-number">
                {completedCount}/{totalMissions}
              </p>
              <p className="risk-label-small">missions completed</p>
            </div>
          </div>
        </section>
      </div>

      <div className="side-stack">
        <section className="card">
          <div className="card-inner">
            <h2 className="section-title">🛡️ Main Risk Factors</h2>
            <RiskFactors factors={result.riskFactors} />
          </div>
        </section>

        <section className="card">
          <div className="card-inner">
            <h2 className="section-title">📋 Recommended Screening</h2>
            <Recommendations recommendations={result.recommendations} />
          </div>
        </section>

        <section className="card">
          <div className="card-inner">
            <h2 className="section-title">🎯 Weekly Missions</h2>
            <div className="mission-list">
              {result.missions.map((mission, index) => (
                <div
                  className={`mission-static ${completedMissions[mission] ? "completed" : ""}`}
                  key={mission}
                >
                  {index + 1}. {mission}
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function HomePage() {
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [authError, setAuthError] = useState("");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [page, setPage] = useState<"survey" | "mypage">("survey");
  const [showResult, setShowResult] = useState(false);
  const [completedMissions, setCompletedMissions] = useState<CompletedMissions>({});
  const [latestResult, setLatestResult] = useState<Result | null>(null);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    const rawUser = localStorage.getItem(USER_KEY);

    if (token && rawUser) {
      const parsedUser = JSON.parse(rawUser) as User;
      setUser(parsedUser);

      const saved = localStorage.getItem(`${RESULT_KEY_PREFIX}-${parsedUser.id}`);
      if (saved) setLatestResult(JSON.parse(saved) as Result);
    }

    setMounted(true);
  }, []);

  const analysis: Result = useMemo(() => {
    const total = QUESTIONS.reduce(
      (sum, question) => sum + getScore(question, answers[question.id]),
      0
    );
    const max = QUESTIONS.reduce((sum, question) => sum + 5 * question.weight, 0);
    const percent = Math.round((total / max) * 100);
    const risk = classifyRisk(percent);

    const riskFactors = QUESTIONS.filter((question) => {
      const answer = answers[question.id];
      if (question.type === "yesno") return answer === "yes";
      return Number(answer) >= 4;
    }).map((question) => question.factor);

    return {
      percent,
      risk,
      riskFactors,
      recommendations: getRecommendations(riskFactors),
      missions: getMissions(riskFactors),
      createdAt: new Date().toISOString(),
    };
  }, [answers]);

  if (!mounted) return null;

  function saveUserSession(newUser: User) {
    const safeUser = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
    };

    localStorage.setItem(TOKEN_KEY, `demo-token-${newUser.id}`);
    localStorage.setItem(USER_KEY, JSON.stringify(safeUser));
    setUser(safeUser);
  }

  function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthError("");

    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") || "").trim();
    const email = String(form.get("email") || "")
      .trim()
      .toLowerCase();
    const password = String(form.get("password") || "").trim();
    const isSignup = authMode === "signup";

    if (!email || !password || (isSignup && !name)) {
      setAuthError("Please fill in all required fields.");
      return;
    }

    if (password.length < 6) {
      setAuthError("Password must be at least 6 characters.");
      return;
    }

    const users = getStoredArray<User>(USERS_KEY);

    if (isSignup) {
      const existingUser = users.find((item) => item.email === email);

      if (existingUser) {
        setAuthError("This email is already registered. Please log in instead.");
        return;
      }

      const newUser: User = {
        id: Date.now().toString(),
        name,
        email,
        password,
      };

      localStorage.setItem(USERS_KEY, JSON.stringify([...users, newUser]));
      saveUserSession(newUser);
      return;
    }

    const matchedUser = users.find((item) => item.email === email && item.password === password);

    if (!matchedUser) {
      setAuthError(
        "Email or password is incorrect. If this is your first time, please sign up first."
      );
      return;
    }

    saveUserSession(matchedUser);
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
    setStep(0);
    setAnswers({});
    setPage("survey");
    setShowResult(false);
    setCompletedMissions({});
    setLatestResult(null);
  }

  function handleFinishSurvey() {
    if (!user) return;
    localStorage.setItem(`${RESULT_KEY_PREFIX}-${user.id}`, JSON.stringify(analysis));
    setLatestResult(analysis);
    setShowResult(true);
  }

  function resetSurvey() {
    setStep(0);
    setAnswers({});
    setShowResult(false);
    setCompletedMissions({});
  }

  if (!user) {
    const isSignup = authMode === "signup";

    return (
      <main className="app">
        <div className="container center-layout">
          <div className="auth-grid">
            <section>
              <div className="badge">❤️ Cancer Lifestyle Risk Check</div>
              <h1 className="hero-title">Build healthier habits with a simple risk check.</h1>
              <p className="hero-text">
                Sign in to complete the lifestyle survey, view your personalized risk report, and track
                weekly action missions.
              </p>
            </section>

            <section className="card">
              <div className="card-inner">
                <div className="auth-icon">👤</div>
                <h2 className="auth-title">{isSignup ? "Create account" : "Log in"}</h2>
                <p className="auth-subtitle">
                  {isSignup ? "Create a new account to start." : "Log in to continue to your dashboard."}
                </p>

                <form onSubmit={handleAuthSubmit}>
                  {isSignup && (
                    <div className="form-group">
                      <label>Name</label>
                      <div className="input-box">
                        <span>👤</span>
                        <input name="name" type="text" placeholder="Your name" />
                      </div>
                    </div>
                  )}

                  <div className="form-group">
                    <label>Email</label>
                    <div className="input-box">
                      <span>✉️</span>
                      <input name="email" type="email" placeholder="you@example.com" />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Password</label>
                    <div className="input-box">
                      <span>🔒</span>
                      <input name="password" type="password" placeholder="At least 6 characters" />
                    </div>
                  </div>

                  {authError && <div className="error-box show">{authError}</div>}

                  <button className="btn btn-primary" type="submit">
                    {isSignup ? "Sign up" : "Log in"}
                  </button>
                </form>

                <div className="auth-switch">
                  {isSignup ? "Already have an account?" : "No account yet?"}{" "}
                  <button
                    className="text-link"
                    type="button"
                    onClick={() => {
                      setAuthMode(isSignup ? "login" : "signup");
                      setAuthError("");
                    }}
                  >
                    {isSignup ? "Log in" : "Sign up"}
                  </button>
                </div>

                <p className="demo-note">
                  Demo note: this version stores users and results in browser localStorage. It is not
                  a secure production login system.
                </p>
              </div>
            </section>
          </div>
        </div>
      </main>
    );
  }

  if (page === "mypage") {
    return (
      <main className="app">
        <div className="container">
          <Topbar
            user={user}
            activePage="mypage"
            onSurvey={() => {
              setPage("survey");
              setShowResult(false);
            }}
            onLogout={logout}
          />

          <header className="page-header left">
            <div className="badge">👤 Personal Health Dashboard</div>
            <h1 className="page-title">My Page</h1>
            <p className="page-text">
              Review your latest risk result, recommended screenings, and weekly action mission
              progress.
            </p>
          </header>

          {!latestResult ? (
            <section className="card">
              <div className="empty-state">
                <div className="empty-icon">📄</div>
                <h2 className="empty-title">No survey result yet</h2>
                <p className="empty-text">
                  Complete the lifestyle survey first. Your latest risk level, key factors,
                  recommendations, and missions will appear here.
                </p>
                <button className="btn btn-primary narrow" onClick={() => setPage("survey")}>
                  Start survey
                </button>
              </div>
            </section>
          ) : (
            <MyPageContent result={latestResult} completedMissions={completedMissions} />
          )}
        </div>
      </main>
    );
  }

  if (showResult) {
    return (
      <main className="app">
        <div className="container">
          <Topbar
            user={user}
            activePage="survey"
            onMyPage={() => setPage("mypage")}
            onLogout={logout}
          />

          <header className="page-header">
            <div className="badge">📋 Result Report</div>
            <h1 className="page-title">Your Risk Analysis Result</h1>
            <p className="page-text">
              Review your main risk factors, screening suggestions, and weekly action plan.
            </p>
          </header>

          <ResultContent
            result={analysis}
            completedMissions={completedMissions}
            setCompletedMissions={setCompletedMissions}
            onRetake={resetSurvey}
          />
        </div>
      </main>
    );
  }

  const question = QUESTIONS[step];
  const currentAnswer = answers[question.id];
  const progress = Math.round(((step + 1) / QUESTIONS.length) * 100);

  return (
    <main className="app">
      <div className="container">
        <Topbar
          user={user}
          activePage="survey"
          onMyPage={() => setPage("mypage")}
          onLogout={logout}
        />

        <header className="page-header">
          <div className="badge">❤️ Cancer Lifestyle Risk Check</div>
          <h1 className="page-title">Lifestyle-Based Cancer Risk Check</h1>
          <p className="page-text">
            Complete a short survey, see your personalized risk factors, and choose practical weekly
            missions.
          </p>
        </header>

        <section className="card survey-card">
          <div className="progress-area">
            <div className="progress-meta">
              <span>
                Question {step + 1} / {QUESTIONS.length}
              </span>
              <span>{progress}%</span>
            </div>
            <div className="progress-track">
              <div className="progress-bar" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <div className="question-area">
            <span className={`category-pill ${question.categoryClass}`}>{question.category}</span>
            <h2 className="question-title">{question.title}</h2>
            <p className="question-description">{question.description}</p>

            {question.type === "yesno" ? (
              <div className="yesno-grid">
                {(["yes", "no"] as const).map((value) => (
                  <button
                    key={value}
                    className={`yesno-btn ${currentAnswer === value ? "selected" : ""}`}
                    onClick={() => setAnswers((prev) => ({ ...prev, [question.id]: value }))}
                  >
                    <span>{value === "yes" ? "Yes" : "No"}</span>
                    <span>{currentAnswer === value ? "✓" : ""}</span>
                  </button>
                ))}
              </div>
            ) : (
              <>
                <div className="scale-grid">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      className={`scale-btn ${Number(currentAnswer) === value ? "selected" : ""}`}
                      onClick={() => setAnswers((prev) => ({ ...prev, [question.id]: value }))}
                    >
                      {value}
                    </button>
                  ))}
                </div>
                <div className="scale-labels">
                  <span>{question.lowLabel}</span>
                  <span>{question.highLabel}</span>
                </div>
              </>
            )}
          </div>

          <div className="survey-actions">
            <button
              className="btn btn-outline"
              disabled={step === 0}
              onClick={() => setStep((prev) => Math.max(prev - 1, 0))}
            >
              ← Previous
            </button>
            <button
              className="btn btn-primary"
              disabled={currentAnswer === undefined}
              onClick={() => {
                if (step === QUESTIONS.length - 1) {
                  handleFinishSurvey();
                } else {
                  setStep((prev) => prev + 1);
                }
              }}
            >
              {step === QUESTIONS.length - 1 ? "See result" : "Next"} →
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
