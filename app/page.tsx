import Link from "next/link";

export default function LandingPage() {
  return (
    <>
      <section className="hero">
        <div className="container hero-inner">
          <p className="eyebrow">For students preparing for job &amp; internship interviews</p>
          <h1>Turn your experiences into interview-ready STAR stories.</h1>
          <p className="lead">
            StoryBank helps you write down what you&apos;ve done as{" "}
            <strong>Situation, Task, Action, Result</strong> stories — and practice one every day,
            so you never freeze on &ldquo;Tell me about a time when…&rdquo;.
          </p>
          <div className="hero-cta">
            <Link href="/signup" className="btn btn-primary btn-lg">
              Sign up — it&apos;s free
            </Link>
            <Link href="/login" className="text-link">
              I already have an account
            </Link>
          </div>
        </div>
      </section>

      <section className="container features" aria-label="How it works">
        <ol className="steps">
          <li className="card">
            <span className="step-num" aria-hidden="true">1</span>
            <h2>Capture</h2>
            <p>Jot down a project, job or challenge in one line. Add details whenever you&apos;re ready.</p>
          </li>
          <li className="card">
            <span className="step-num" aria-hidden="true">2</span>
            <h2>Structure</h2>
            <p>Shape it into Situation, Task, Action and Result, and tag it — leadership, teamwork, failure…</p>
          </li>
          <li className="card">
            <span className="step-num" aria-hidden="true">3</span>
            <h2>Practice daily</h2>
            <p>Get one story to rehearse each day, so your answers are sharp when the interview comes.</p>
          </li>
        </ol>
        <p className="privacy-note">Your stories are private — only you can see them.</p>
      </section>
    </>
  );
}
