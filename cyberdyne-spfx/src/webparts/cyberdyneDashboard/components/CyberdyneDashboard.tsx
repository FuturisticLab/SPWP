import * as React from 'react';
import styles from './CyberdyneDashboard.module.scss';
import type { ICyberdyneDashboardProps, GlowIntensity } from './ICyberdyneDashboardProps';

const GLOW_ALPHA: Record<GlowIntensity, number> = { low: 0.25, medium: 0.45, high: 0.65 };
const NAV_ITEMS: string[] = ['Home', 'Workspaces', 'Tools', 'Directory', 'News', 'Profile'];

/** Converts #rgb / #rrggbb to an rgba() string; falls back to Cyberdyne red on bad input. */
function hexToRgba(hex: string, alpha: number): string {
  let h = (hex || '').trim().replace(/^#/, '');
  if (h.length === 3) {
    h = h.split('').map((c) => c + c).join('');
  }
  if (!/^[0-9a-fA-F]{6}$/.test(h)) {
    h = 'ff1e3c';
  }
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

function safeAccent(hex: string): string {
  return /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test((hex || '').trim())
    ? (hex.trim().charAt(0) === '#' ? hex.trim() : `#${hex.trim()}`)
    : '#ff1e3c';
}

const cx = (...names: Array<string | false | undefined>): string => names.filter(Boolean).join(' ');

const LogoMark: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
    <path d="M19 7.5A8 8 0 1 0 19 16.5" />
    <path d="M12 12h7v4.5" />
  </svg>
);

const CyberdyneDashboard: React.FC<ICyberdyneDashboardProps> = (props) => {
  const { slides, news, quickLinks, events, topics } = props;

  const [activeNav, setActiveNav] = React.useState<string>('Home');
  const [query, setQuery] = React.useState<string>('');
  const [slideIndex, setSlideIndex] = React.useState<number>(0);

  const slideCount = Math.max(slides.length, 1);
  const current = slides[slideIndex % slideCount] || slides[0];

  // Reset to first slide if the slide list shrinks (e.g. edited in property pane).
  React.useEffect(() => {
    if (slideIndex >= slideCount) {
      setSlideIndex(0);
    }
  }, [slideCount, slideIndex]);

  const go = (delta: number): void => setSlideIndex((i) => (i + delta + slideCount) % slideCount);

  const themeVars = {
    '--accent': safeAccent(props.accentColor),
    '--glow': hexToRgba(props.accentColor, GLOW_ALPHA[props.glowIntensity] ?? GLOW_ALPHA.high)
  } as React.CSSProperties;

  const onSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    if (query.trim()) {
      props.onSearch(query.trim());
    }
  };

  return (
    <div className={styles.root} style={themeVars}>
      {props.showHeaderAndFooter && (
        <header className={styles.topBar}>
          <div className={styles.brandGroup}>
            <div className={styles.brand}>
              <div className={styles.logo}><LogoMark /></div>
              <div className={styles.brandText}>
                <span className={styles.brandName}>{props.companyName}</span>
                <span className={styles.brandSub}>{props.globalSubtitle}</span>
              </div>
            </div>
            <nav className={styles.nav} aria-label="Primary">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={cx(styles.navItem, activeNav === item && styles.navItemActive)}
                  aria-current={activeNav === item ? 'page' : undefined}
                  onClick={() => setActiveNav(item)}
                >
                  {item}
                </button>
              ))}
            </nav>
          </div>

          <div className={styles.topRight}>
            <button type="button" className={styles.iconBtn} aria-label="Print">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M6 9V3h12v6" /><rect x="3" y="9" width="18" height="8" rx="2" /><path d="M7 14h10v7H7z" />
              </svg>
            </button>
            <button type="button" className={styles.iconBtn} aria-label="Notifications (1 unread)">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <span className={styles.badge}>1</span>
            </button>
            <div className={styles.user}>
              <div className={styles.userText}>
                <span className={styles.userName}>{props.userDisplayName}</span>
                {props.userTitle && <span className={styles.userTitle}>{props.userTitle}</span>}
              </div>
              <img className={styles.avatar} src={props.userPhotoUrl} alt="" />
            </div>
          </div>
        </header>
      )}

      <main className={styles.main}>
        <div className={styles.subHeader}>
          <h2 className={styles.headline}>{props.pageHeadline}</h2>
          <form className={styles.search} role="search" onSubmit={onSubmit}>
            <svg className={styles.searchIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              className={styles.searchInput}
              type="search"
              placeholder="Search resources..."
              aria-label="Search resources"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </form>
        </div>

        {current && (
          <section className={styles.hero} aria-roledescription="carousel" aria-label="Featured">
            <div className={styles.heroBg} style={{ backgroundImage: `url("${current.imageUrl}")` }} />
            <div className={styles.heroGrid} />
            <div className={styles.heroPips} aria-hidden="true">
              <span className={cx(styles.pip, styles.pipAccent)} />
              <span className={styles.pip} />
              <span className={styles.pip} />
            </div>

            {slideCount > 1 && (
              <button type="button" className={cx(styles.chevron, styles.chevronLeft)} aria-label="Previous slide" onClick={() => go(-1)}>
                &#10094;
              </button>
            )}

            <div className={styles.heroContent} aria-live="polite">
              <h1 className={styles.heroTitle}>{current.title}</h1>
              <p className={styles.heroSub}>{current.subtitle}</p>
              {current.ctaText && (
                <a className={styles.cta} href={current.ctaUrl}>{current.ctaText}</a>
              )}
            </div>

            {slideCount > 1 && (
              <button type="button" className={cx(styles.chevron, styles.chevronRight)} aria-label="Next slide" onClick={() => go(1)}>
                &#10095;
              </button>
            )}
          </section>
        )}

        <div className={styles.dotsRow}>
          <div className={styles.dotsTrack}>
            {slides.map((s, i) => (
              <button
                key={i}
                type="button"
                className={cx(styles.dot, i === slideIndex && styles.dotActive)}
                aria-label={`Go to slide ${i + 1}: ${s.title}`}
                aria-current={i === slideIndex ? 'true' : undefined}
                onClick={() => setSlideIndex(i)}
              />
            ))}
          </div>
        </div>

        <div className={styles.grid}>
          {/* Column 1 – News */}
          <section className={styles.card}>
            <div className={styles.cardHead}>
              <h3 className={styles.cardTitle}>Latest Network News</h3>
              <div className={styles.cardDots} aria-hidden="true">
                <span className={cx(styles.cardDot, styles.cardDotOn)} /><span className={styles.cardDot} /><span className={styles.cardDot} />
              </div>
            </div>
            <div className={styles.list}>
              {news.map((n, i) => (
                <a key={i} className={styles.newsItem} href={n.url}>
                  <div className={styles.newsRow}>
                    <span className={styles.newsTitle}>{n.title}</span>
                    {n.tag && <span className={styles.tag}>{n.tag}</span>}
                  </div>
                  <span className={styles.newsMeta}>{n.meta}</span>
                </a>
              ))}
            </div>
          </section>

          {/* Column 2 – Quick access + events */}
          <div className={styles.column}>
            <section className={styles.card}>
              <div className={styles.cardHead}>
                <h3 className={styles.cardTitle}>My Quick Access</h3>
              </div>
              <div className={styles.quickGrid}>
                {quickLinks.map((q, i) => (
                  <a key={i} className={styles.quickBtn} href={q.url}>{q.label}</a>
                ))}
              </div>
            </section>

            {props.showEvents && (
              <section className={styles.card}>
                <div className={styles.cardHead}>
                  <h3 className={styles.cardTitle}>Upcoming Events</h3>
                  <div className={styles.cardDots} aria-hidden="true">
                    <span className={cx(styles.cardDot, styles.cardDotOn)} /><span className={styles.cardDot} /><span className={styles.cardDot} />
                  </div>
                </div>
                <div className={styles.list}>
                  {events.map((ev, i) => (
                    <a key={i} className={styles.eventRow} href={ev.url}>
                      <span className={styles.eventIcon}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                      </span>
                      <span>
                        <span className={styles.eventTitle}>{ev.title}</span><br />
                        <span className={styles.eventWhen}>{ev.when}</span>
                      </span>
                    </a>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Column 3 – Topics + directory */}
          <div className={styles.column}>
            {props.showTrendingTopics && (
              <section className={styles.card}>
                <div className={styles.cardHead}>
                  <h3 className={styles.cardTitle}>Trending Topics</h3>
                </div>
                <div className={styles.chips}>
                  {topics.map((t) => (
                    <button key={t} type="button" className={styles.chip} onClick={() => props.onSearch(t)}>{t}</button>
                  ))}
                </div>
              </section>
            )}

            {props.showDirectory && (
              <section className={styles.card}>
                <div className={styles.cardHead}>
                  <h3 className={styles.cardTitle}>Directory</h3>
                </div>
                <a className={styles.directoryBox} href={props.directoryUrl} aria-label="Open people directory">
                  <span className={styles.directoryIcon}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <circle cx="12" cy="8" r="4" /><path d="M5.5 21a6.5 6.5 0 0 1 13 0" />
                    </svg>
                  </span>
                </a>
              </section>
            )}
          </div>
        </div>
      </main>

      {props.showHeaderAndFooter && (
        <footer className={styles.footer}>
          <div className={styles.footerInner}>
            <div className={styles.footerBrand}>
              <span className={cx(styles.logo, styles.logoSmall)}><LogoMark size={14} /></span>
              {props.companyName}
            </div>
            <nav className={styles.footerLinks} aria-label="Footer">
              <a className={styles.footerLink} href="#privacy">Privacy Policy</a>
              <a className={styles.footerLink} href="#contact">Contact</a>
              <a className={styles.footerLink} href="#support">Support</a>
            </nav>
            <span>&copy; {new Date().getFullYear()} {props.companyName}. Secured Network.</span>
          </div>
        </footer>
      )}
    </div>
  );
};

export default CyberdyneDashboard;
