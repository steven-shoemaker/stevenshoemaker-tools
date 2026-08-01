import { Link } from 'react-router-dom'
import './tools-landing.css'

const TOOLS = [
  {
    id: 'org-chart',
    number: '001',
    title: 'Org Chart from CSV',
    description:
      'Paste a name–manager CSV. Repair dirty data, rearrange people, watch SPOC update live.',
    to: '/org-chart',
    available: true,
  },
] as const

export function ToolsLanding() {
  return (
    <div className="tools-landing">
      <header className="tl-header">
        <div className="tl-brand">
          <div className="tl-mark" aria-hidden>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M3 5.5H11M7 2.5V5.5M4.5 8.5H9.5M5.5 11.5H8.5"
                stroke="white"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div className="tl-brand-text">
            <span className="tl-brand-name">Tools</span>
            <span className="tl-brand-by">by Steven Shoemaker</span>
          </div>
        </div>
        <a
          className="tl-site-link"
          href="https://stevenshoemaker.me"
          target="_blank"
          rel="noreferrer"
        >
          stevenshoemaker.me
        </a>
      </header>

      <main className="tl-main">
        <section className="tl-hero">
          <p className="tl-eyebrow">tools.stevenshoemaker.me</p>
          <h1 className="tl-headline">
            Small tools.
            <br />
            Run in your browser.
          </h1>
          <p className="tl-lede">
            Single-purpose utilities for people ops and analysis. Nothing
            uploaded — your data stays on your machine.
          </p>
        </section>

        <section className="tl-list" aria-labelledby="tl-available">
          <h2 id="tl-available" className="tl-section-label">
            Available
          </h2>

          {TOOLS.map((tool) => (
            <article key={tool.id} className="tl-tool">
              <div className="tl-tool-main">
                <div className="tl-tool-icon" aria-hidden>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path
                      d="M4 6H16M10 3V6M6 11H14M8 16H12"
                      stroke="white"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <div className="tl-tool-copy">
                  <div className="tl-tool-title-row">
                    <h3 className="tl-tool-title">{tool.title}</h3>
                    <span className="tl-tool-badge">Tool No. {tool.number}</span>
                  </div>
                  <p className="tl-tool-desc">{tool.description}</p>
                </div>
              </div>
              <Link className="tl-open" to={tool.to}>
                Open
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                  <path
                    d="M3 7H11M8 4L11 7L8 10"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>
            </article>
          ))}

          <div className="tl-tool tl-tool-soon">
            <div className="tl-tool-main">
              <div className="tl-tool-icon tl-tool-icon-muted" aria-hidden />
              <div className="tl-tool-copy">
                <h3 className="tl-tool-title tl-muted">Next tool</h3>
                <p className="tl-tool-desc tl-muted">
                  More single-purpose utilities will land here.
                </p>
              </div>
            </div>
            <span className="tl-soon-pill">Soon</span>
          </div>
        </section>
      </main>

      <footer className="tl-footer">
        <span>Built by Steven Shoemaker</span>
        <span>Private by default · runs locally</span>
      </footer>
    </div>
  )
}
