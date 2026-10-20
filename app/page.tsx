import Link from "next/link";
import { ArrowDown, ArrowRight, FileText, Lock, Mic, PenLine, Sparkles } from "lucide-react";

const STEPS = [
  { icon: PenLine, title: "1. Write", text: "something you did" },
  { icon: Sparkles, title: "2. AI structures it", text: "into a clear STAR answer" },
  { icon: Mic, title: "3. Practise", text: "say it out loud" },
];

const DEMO_STAR = [
  { letter: "S", ask: "The situation", text: "Our university had no charity event." },
  { letter: "T", ask: "Your task", text: "I wanted to start one." },
  { letter: "A", ask: "What you did", text: "Found 6 helpers and promoted it on Instagram." },
  { letter: "R", ask: "The result", text: "200 students ran and we raised €3,000." },
];

const QUESTIONS = [
  { tag: "Leadership", question: "When did you lead a team?" },
  { tag: "Teamwork", question: "When did you work well in a group?" },
  { tag: "Conflict", question: "When did you solve an argument?" },
  { tag: "Failure", question: "When did something go wrong?" },
];

export default function LandingPage() {
  return (
    <>
      <section className="hero wash">
        <div className="container hero-inner">
          <p className="eyebrow">For students with a job interview soon</p>
          <h1 className="display">
            Get <em>ready for job interviews</em> with your own stories.
          </h1>

          <ol className="step-boxes" aria-label="How it works">
            {STEPS.map(({ icon: Icon, title, text }, i) => (
              <li key={title} className="step-box-wrap">
                <div className="step-box">
                  <span className="icon-tile is-lg" aria-hidden="true">
                    <Icon size={22} strokeWidth={1.75} />
                  </span>
                  <strong>{title}</strong>
                  <span>{text}</span>
                </div>
                {i < STEPS.length - 1 && <ArrowRight className="step-arrow" size={18} strokeWidth={2} aria-hidden="true" />}
              </li>
            ))}
          </ol>

          <div className="hero-cta">
            <Link href="/signup" className="btn btn-primary btn-lg">
              Sign up — it&apos;s free
            </Link>
            <Link href="/login">I already have an account</Link>
          </div>
        </div>
      </section>

      <section className="demo-section" aria-labelledby="demo-heading">
        <div className="container demo">
          <h2 id="demo-heading" className="section-title">
            Example
          </h2>

          <div className="demo-flow">
            <div className="demo-box is-input">
              <span className="demo-kicker">
                <PenLine size={16} strokeWidth={1.75} aria-hidden="true" /> You write
              </span>
              <p className="demo-input">“I organised a charity run with 200 students and we raised €3,000.”</p>
            </div>

            <div className="demo-arrow" aria-hidden="true">
              <span className="badge badge-ai">
                <Sparkles size={14} strokeWidth={2} /> AI
              </span>
              <ArrowRight className="only-wide" size={22} strokeWidth={2} />
              <ArrowDown className="only-narrow" size={22} strokeWidth={2} />
            </div>

            <div className="demo-box is-output">
              <span className="demo-kicker">
                <Sparkles size={16} strokeWidth={1.75} aria-hidden="true" /> You get a clear answer in 4 parts
              </span>
              <ul className="star-boxes">
                {DEMO_STAR.map((s) => (
                  <li key={s.letter} className="star-box">
                    <span className="star-letter" aria-hidden="true">
                      {s.letter}
                    </span>
                    <strong className="star-ask">{s.ask}</strong>
                    <span className="star-answer">{s.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="questions-section" aria-labelledby="questions-heading">
        <div className="container">
          <h2 id="questions-heading" className="section-title">
            Questions you might be asked during the interview
          </h2>
          <ul className="q-grid">
            {QUESTIONS.map((q) => (
              <li key={q.tag} className="card q-card">
                <span className="chip chip-tag tc-teal">{q.tag}</span>
                <p className="q-text">“{q.question}”</p>
              </li>
            ))}
          </ul>
          <p className="q-note">
            StoryBank helps you have <strong>a story ready for each one.</strong>
          </p>

          <div className="cv-strip">
            <span className="icon-tile is-ai" aria-hidden="true">
              <FileText size={18} strokeWidth={1.75} />
            </span>
            <p>
              <strong>Have a CV?</strong> Upload it and we <strong>suggest stories for you.</strong>
            </p>
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <div className="container footer-inner">
          <p className="privacy">
            <Lock size={16} strokeWidth={1.75} aria-hidden="true" />
            <span>
              <strong>Free.</strong> Your stories are private to your account. AI features use Google Gemini.
            </span>
          </p>
          <a href="#main" className="small">
            Back to top
          </a>
        </div>
      </footer>
    </>
  );
}
