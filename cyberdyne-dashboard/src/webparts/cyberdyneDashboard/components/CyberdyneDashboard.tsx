import * as React from 'react';
import {
  ICyberdyneDashboardProps,
  INewsItem,
  IQuickLink,
  IEventItem
} from './ICyberdyneDashboardProps';

const STYLES_CSS = `
.cyberdyne-root {
  --hud-accent: #ff1e3c;
  --hud-accent-glow: rgba(255, 30, 60, 0.55);
  --hud-bg-canvas: #090a0d;
  --hud-bg-panel: #111319;
  --hud-bg-card: #191c24;
  --hud-text-primary: #ffffff;
  --hud-text-secondary: #8c93a4;
  --hud-border-dim: #252936;
  --hud-radius: 14px;
  --hud-radius-pill: 9999px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Avenir Next", Helvetica, Arial, sans-serif;
  background-color: var(--hud-bg-canvas);
  color: var(--hud-text-primary);
  min-height: 100vh;
  line-height: 1.5;
  box-sizing: border-box;
  overflow-x: hidden;
}
.cyberdyne-root * { box-sizing: border-box; margin: 0; padding: 0; }
.cyberdyne-root .top-navbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 28px; background: rgba(13, 14, 18, 0.95);
  border-bottom: 1px solid rgba(255, 30, 60, 0.25);
  position: sticky; top: 0; z-index: 100;
}
.cyberdyne-root .brand-group { display: flex; align-items: center; gap: 32px; }
.cyberdyne-root .logo-container { display: flex; align-items: center; gap: 12px; text-decoration: none; color: #fff; }
.cyberdyne-root .logo-icon {
  width: 34px; height: 34px; border-radius: 50%;
  border: 2px solid var(--hud-accent); box-shadow: 0 0 10px var(--hud-accent-glow);
  display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 14px; color: var(--hud-accent);
}
.cyberdyne-root .brand-text { display: flex; flex-direction: column; }
.cyberdyne-root .brand-name { font-size: 13px; font-weight: 800; letter-spacing: 1.5px; line-height: 1.1; }
.cyberdyne-root .brand-sub { font-size: 10px; letter-spacing: 2px; color: var(--hud-text-secondary); font-weight: 500; }
.cyberdyne-root .nav-links { display: flex; align-items: center; gap: 26px; list-style: none; }
.cyberdyne-root .nav-item {
  font-size: 13px; font-weight: 600; color: var(--hud-text-secondary);
  text-decoration: none; cursor: pointer; position: relative; padding: 6px 0; transition: color 0.2s;
}
.cyberdyne-root .nav-item:hover, .cyberdyne-root .nav-item.active { color: #ffffff; }
.cyberdyne-root .nav-item.active::after {
  content: ""; position: absolute; bottom: -4px; left: 0; width: 100%; height: 2px;
  background: var(--hud-accent); box-shadow: 0 0 8px var(--hud-accent-glow); border-radius: 2px;
}
.cyberdyne-root .top-right { display: flex; align-items: center; gap: 18px; }
.cyberdyne-root .icon-btn {
  background: transparent; border: none; color: var(--hud-text-secondary);
  cursor: pointer; position: relative; padding: 6px; display: flex; align-items: center; justify-content: center;
}
.cyberdyne-root .notif-badge {
  position: absolute; top: 0; right: 0; width: 14px; height: 14px; border-radius: 50%;
  background: var(--hud-accent); color: #fff; font-size: 9px; font-weight: bold;
  display: flex; align-items: center; justify-content: center; box-shadow: 0 0 6px var(--hud-accent-glow);
}
.cyberdyne-root .user-badge { display: flex; align-items: center; gap: 10px; }
.cyberdyne-root .user-info { display: flex; flex-direction: column; text-align: right; }
.cyberdyne-root .user-name { font-size: 12px; font-weight: 700; color: #fff; }
.cyberdyne-root .user-title { font-size: 10px; color: var(--hud-text-secondary); }
.cyberdyne-root .user-avatar { width: 34px; height: 34px; border-radius: 50%; object-fit: cover; border: 1.5px solid #2d3342; }

.cyberdyne-root .container { max-width: 1380px; margin: 0 auto; padding: 24px 28px 48px; }
.cyberdyne-root .sub-header-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 22px; }
.cyberdyne-root .headline { font-size: 18px; font-weight: 600; color: #d1d5db; }
.cyberdyne-root .search-box { position: relative; width: 300px; }
.cyberdyne-root .search-input {
  width: 100%; background: #111319; border: 1px solid var(--hud-accent);
  box-shadow: 0 0 10px var(--hud-accent-glow); border-radius: var(--hud-radius-pill);
  padding: 8px 16px 8px 36px; color: #fff; font-size: 12px; outline: none;
}
.cyberdyne-root .search-icon {
  position: absolute; left: 12px; top: 50%; transform: translateY(-50%);
  width: 14px; height: 14px; color: #636b7b;
}

.cyberdyne-root .hero-frame {
  position: relative; border-radius: 16px; border: 1px solid var(--hud-accent);
  box-shadow: 0 0 18px var(--hud-accent-glow); background: #0d0f15;
  overflow: hidden; min-height: 270px; display: flex; align-items: center; justify-content: center; margin-bottom: 26px;
}
.cyberdyne-root .hero-bg {
  position: absolute; inset: 0; background-position: center; background-size: cover;
  filter: brightness(0.35) contrast(1.2);
}
.cyberdyne-root .hero-overlay {
  position: absolute; inset: 0;
  background-image: linear-gradient(rgba(255, 30, 60, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 30, 60, 0.05) 1px, transparent 1px);
  background-size: 40px 40px; pointer-events: none;
}
.cyberdyne-root .hero-content { position: relative; z-index: 10; text-align: center; max-width: 760px; padding: 30px; }
.cyberdyne-root .hero-title { font-size: 26px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 8px; color: #fff; }
.cyberdyne-root .hero-sub { font-size: 13px; color: #c4c8d3; margin-bottom: 22px; }
.cyberdyne-root .hero-cta {
  display: inline-block; background: rgba(17, 19, 25, 0.85); color: #fff;
  font-size: 12px; font-weight: 800; letter-spacing: 1.5px; padding: 10px 24px;
  border-radius: var(--hud-radius-pill); border: 1px solid var(--hud-accent);
  box-shadow: 0 0 12px var(--hud-accent-glow); text-decoration: none; cursor: pointer; transition: all 0.25s;
}
.cyberdyne-root .hero-cta:hover { background: var(--hud-accent); box-shadow: 0 0 22px var(--hud-accent-glow); transform: translateY(-1px); }
.cyberdyne-root .hero-chevron {
  position: absolute; top: 50%; transform: translateY(-50%); background: rgba(13, 14, 18, 0.6);
  border: none; color: var(--hud-accent); font-size: 20px; width: 36px; height: 36px;
  display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 10; border-radius: 50%;
}
.cyberdyne-root .hero-chevron.left { left: 16px; }
.cyberdyne-root .hero-chevron.right { right: 16px; }
.cyberdyne-root .hero-dots-top { position: absolute; top: 14px; left: 18px; display: flex; gap: 6px; z-index: 10; }
.cyberdyne-root .pip { width: 8px; height: 8px; border-radius: 50%; }
.cyberdyne-root .pip.red { background: var(--hud-accent); box-shadow: 0 0 6px var(--hud-accent-glow); }
.cyberdyne-root .pip.teal { background: #2dd4bf; }
.cyberdyne-root .hero-meta { position: absolute; bottom: 12px; left: 18px; font-size: 11px; color: #636b7b; z-index: 10; }

.cyberdyne-root .carousel-track { display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: -10px; margin-bottom: 24px; }
.cyberdyne-root .track-pill { display: flex; align-items: center; background: #12141a; border: 1px solid #232733; padding: 4px 10px; border-radius: 12px; gap: 6px; }
.cyberdyne-root .dot { width: 6px; height: 6px; border-radius: 50%; background: #393e4f; cursor: pointer; transition: all 0.2s; }
.cyberdyne-root .dot.active { width: 22px; border-radius: 6px; background: var(--hud-accent); box-shadow: 0 0 8px var(--hud-accent-glow); }

.cyberdyne-root .grid { display: grid; grid-template-columns: 1.35fr 1fr 1fr; gap: 20px; }
.cyberdyne-root .hud-card {
  background: #111319; border: 1px solid var(--hud-accent);
  box-shadow: 0 0 14px var(--hud-accent-glow); border-radius: var(--hud-radius); padding: 18px 20px;
}
.cyberdyne-root .card-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.cyberdyne-root .card-title { font-size: 13px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; color: #fff; }

.cyberdyne-root .news-list { display: flex; flex-direction: column; gap: 12px; }
.cyberdyne-root .news-item {
  background: var(--hud-bg-card); border: 1px solid #232733; border-radius: 10px;
  padding: 14px 16px; text-decoration: none; color: inherit; display: flex; flex-direction: column; gap: 6px; transition: all 0.2s;
}
.cyberdyne-root .news-item:hover { background: #202430; border-color: rgba(255, 30, 60, 0.4); transform: translateX(2px); }
.cyberdyne-root .news-top-row { display: flex; align-items: center; justify-content: space-between; }
.cyberdyne-root .news-headline { font-size: 13px; font-weight: 600; color: #fff; }
.cyberdyne-root .news-tag {
  background: rgba(255, 30, 60, 0.15); border: 1px solid var(--hud-accent);
  color: #ff6b81; font-size: 10px; font-weight: 700; padding: 2px 10px; border-radius: var(--hud-radius-pill);
}
.cyberdyne-root .news-time { font-size: 11px; color: #6b7280; }

.cyberdyne-root .quick-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.cyberdyne-root .quick-pill {
  background: var(--hud-bg-card); border: 1px solid var(--hud-accent);
  box-shadow: 0 0 8px rgba(255, 30, 60, 0.3); border-radius: var(--hud-radius-pill);
  padding: 9px 12px; color: #ffffff; font-size: 11px; font-weight: 800; letter-spacing: 1px;
  text-align: center; text-decoration: none; transition: all 0.2s; cursor: pointer;
}
.cyberdyne-root .quick-pill:hover { background: var(--hud-accent); box-shadow: 0 0 14px var(--hud-accent-glow); color: #fff; }

.cyberdyne-root .event-row {
  background: var(--hud-bg-card); border: 1px solid #232733; border-radius: 10px;
  padding: 12px 14px; display: flex; align-items: center; gap: 14px;
}
.cyberdyne-root .event-icon {
  width: 32px; height: 32px; border-radius: 8px; border: 1px solid rgba(255, 30, 60, 0.4);
  display: flex; align-items: center; justify-content: center; color: var(--hud-accent);
}

.cyberdyne-root .topics-wrap { display: flex; flex-wrap: wrap; gap: 8px; }
.cyberdyne-root .topic-chip {
  background: var(--hud-bg-card); border: 1px solid #2d3342; border-radius: var(--hud-radius-pill);
  padding: 5px 14px; font-size: 11px; font-weight: 600; color: #cbd5e1; text-decoration: none; transition: all 0.2s;
}
.cyberdyne-root .topic-chip:hover { border-color: var(--hud-accent); box-shadow: 0 0 8px var(--hud-accent-glow); color: #fff; }

.cyberdyne-root .dir-silhouette {
  background: var(--hud-bg-card); border: 1px solid #232733; border-radius: 10px;
  padding: 24px; display: flex; align-items: center; justify-content: center;
}
.cyberdyne-root .dir-box {
  width: 52px; height: 64px; border-radius: 10px; border: 1.5px solid var(--hud-accent);
  box-shadow: 0 0 10px var(--hud-accent-glow); display: flex; align-items: center; justify-content: center; color: var(--hud-accent);
}

.cyberdyne-root .footer { border-top: 1px solid rgba(255, 30, 60, 0.2); padding: 24px 28px; margin-top: 40px; }
.cyberdyne-root .footer-inner {
  max-width: 1380px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between;
  font-size: 12px; color: #8c93a4;
}
.cyberdyne-root .footer-links { display: flex; gap: 20px; list-style: none; }
.cyberdyne-root .footer-links a { color: inherit; text-decoration: none; transition: color 0.2s; }
.cyberdyne-root .footer-links a:hover { color: #fff; }

@media (max-width: 1024px) {
  .cyberdyne-root .grid { grid-template-columns: 1fr; }
}
`;

const DEFAULT_NEWS: INewsItem[] = [
  { id: 'news-1', title: 'Cybersecurity Update: Sector 9 Secure', tag: 'Sector 9 Secure', dateOrAgo: '1 hour ago', url: '#news-1' },
  { id: 'news-2', title: 'Q3 Performance Review', tag: 'Q3 Performance Review', dateOrAgo: '15 days ago', url: '#news-2' },
  { id: 'news-3', title: 'New Neural Interface Protocol', tag: 'New Neural Interface Protocol', dateOrAgo: '12 mons ago', url: '#news-3' }
];

const DEFAULT_QUICK_LINKS: IQuickLink[] = [
  { id: 'ql-1', label: 'SUBMIT REPORT', url: '#submit-report' },
  { id: 'ql-2', label: 'RESOURCES', url: '#resources' },
  { id: 'ql-3', label: 'MY WORKSPACES', url: '#workspaces' },
  { id: 'ql-4', label: 'HELPDESK', url: '#helpdesk' }
];

const DEFAULT_EVENT: IEventItem = { id: 'ev-1', title: 'Quantum Sim', dateStr: '14.11', timeStr: '09:00', url: '#quantum-sim' };
const DEFAULT_TOPICS = ['Project Orion', 'Data Ethics', 'AI Ethics', 'Sector 7'];

export const CyberdyneDashboard: React.FC<ICyberdyneDashboardProps> = (props) => {
  const [activeTab, setActiveTab] = React.useState('Home');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [currentSlideIndex, setCurrentSlideIndex] = React.useState(0);

  const rootStyle: React.CSSProperties = {
    ['--hud-accent' as any]: props.accentColor || '#ff1e3c',
    ['--hud-accent-glow' as any]:
      props.glowIntensity === 'low'
        ? 'rgba(255, 30, 60, 0.25)'
        : props.glowIntensity === 'medium'
        ? 'rgba(255, 30, 60, 0.45)'
        : 'rgba(255, 30, 60, 0.65)'
  };

  const navItems = ['Home', 'Workspaces', 'Tools', 'Directory', 'News', 'Profile'];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (props.onSearch) props.onSearch(searchQuery);
  };

  return (
    <div className="cyberdyne-root" style={rootStyle}>
      <style>{STYLES_CSS}</style>

      {/* 1. TOP GLOBAL NAVIGATION BAR */}
      <header className="top-navbar">
        <div className="brand-group">
          <a href="#" className="logo-container">
            <div className="logo-icon">G</div>
            <div className="brand-text">
              <span className="brand-name">{props.companyName}</span>
              <span className="brand-sub">{props.globalSubtitle}</span>
            </div>
          </a>

          <nav>
            <ul className="nav-links">
              {navItems.map((tab) => (
                <li key={tab}>
                  <a
                    className={`nav-item ${activeTab === tab ? 'active' : ''}`}
                    onClick={(e) => {
                      e.preventDefault();
                      setActiveTab(tab);
                    }}
                    href={`#${tab.toLowerCase()}`}
                  >
                    {tab}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="top-right">
          <button className="icon-btn" title="Logs">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
          </button>

          <button className="icon-btn" title="Alerts">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <span className="notif-badge">1</span>
          </button>

          <div className="user-badge">
            <div className="user-info">
              <span className="user-name">{props.userName}</span>
              <span className="user-title">{props.userTitle}</span>
            </div>
            <img
              src={
                props.userAvatarUrl ||
                'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=120&q=80'
              }
              alt={props.userName}
              className="user-avatar"
            />
          </div>
        </div>
      </header>

      {/* 2. SUBHEADER & MAIN CONTAINER */}
      <main className="container">
        <div className="sub-header-row">
          <div className="headline">{props.pageHeadline}</div>
          <form className="search-box" onSubmit={handleSearchSubmit}>
            <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search resources..."
              className="search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </form>
        </div>

        {/* 3. HERO CAROUSEL */}
        <section className="hero-frame">
          <div className="hero-bg" style={{ backgroundImage: `url(${props.heroBgImage})` }} />
          <div className="hero-overlay" />

          <div className="hero-dots-top">
            <span className="pip red" />
            <span className="pip teal" />
            <span className="pip teal" />
          </div>

          <button
            className="hero-chevron left"
            onClick={() => setCurrentSlideIndex((prev) => (prev > 0 ? prev - 1 : 2))}
          >
            &#10094;
          </button>

          <div className="hero-content">
            <h1 className="hero-title">{props.heroTitle}</h1>
            <p className="hero-sub">{props.heroSubtitle}</p>
            <a href={props.heroCtaUrl} className="hero-cta">
              {props.heroCtaText}
            </a>
          </div>

          <button
            className="hero-chevron right"
            onClick={() => setCurrentSlideIndex((prev) => (prev < 2 ? prev + 1 : 0))}
          >
            &#10095;
          </button>

          <div className="hero-meta">Avenir Next</div>
        </section>

        {/* CAROUSEL DOTS */}
        <div className="carousel-track">
          <div className="track-pill">
            {[0, 1, 2, 3, 4].map((idx) => (
              <span
                key={idx}
                className={`dot ${currentSlideIndex === idx ? 'active' : ''}`}
                onClick={() => setCurrentSlideIndex(idx)}
              />
            ))}
          </div>
        </div>

        {/* 4. DASHBOARD GRID */}
        <div className="grid">
          {/* LATEST NEWS */}
          <section className="hud-card">
            <div className="card-head">
              <span className="card-title">Latest Network News</span>
            </div>
            <div className="news-list">
              {DEFAULT_NEWS.map((item) => (
                <a key={item.id} href={item.url} className="news-item">
                  <div className="news-top-row">
                    <span className="news-headline">{item.title}</span>
                    <span className="news-tag">{item.tag}</span>
                  </div>
                  <span className="news-time">{item.dateOrAgo}</span>
                </a>
              ))}
            </div>
          </section>

          {/* QUICK ACCESS & EVENTS */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <section className="hud-card">
              <div className="card-head">
                <span className="card-title">My Quick Access</span>
              </div>
              <div className="quick-grid">
                {DEFAULT_QUICK_LINKS.map((link) => (
                  <a key={link.id} href={link.url} className="quick-pill">
                    {link.label}
                  </a>
                ))}
              </div>
            </section>

            {props.showEvents && (
              <section className="hud-card">
                <div className="card-head">
                  <span className="card-title">Upcoming Events</span>
                </div>
                <div className="event-row">
                  <div className="event-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700 }}>{DEFAULT_EVENT.title}</div>
                    <div style={{ fontSize: 11, color: '#8c93a4' }}>
                      {DEFAULT_EVENT.dateStr} | {DEFAULT_EVENT.timeStr}
                    </div>
                  </div>
                </div>
              </section>
            )}
          </div>

          {/* TRENDING TOPICS & DIRECTORY */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {props.showTrendingTopics && (
              <section className="hud-card">
                <div className="card-head">
                  <span className="card-title">Trending Topics</span>
                </div>
                <div className="topics-wrap">
                  {DEFAULT_TOPICS.map((topic) => (
                    <a key={topic} href={`#topic-${topic}`} className="topic-chip">
                      {topic}
                    </a>
                  ))}
                </div>
              </section>
            )}

            {props.showDirectory && (
              <section className="hud-card">
                <div className="card-head">
                  <span className="card-title">Directory</span>
                </div>
                <div className="dir-silhouette">
                  <div className="dir-box">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="7" r="4" />
                      <path d="M5.5 21a6.5 6.5 0 0 1 13 0" />
                    </svg>
                  </div>
                </div>
              </section>
            )}
          </div>
        </div>
      </main>

      {/* 5. FOOTER */}
      <footer className="footer">
        <div className="footer-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="logo-icon" style={{ width: 24, height: 24, fontSize: 11 }}>G</div>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#fff' }}>{props.companyName}</span>
          </div>

          <ul className="footer-links">
            <li><a href="#privacy">Privacy Policy</a></li>
            <li><a href="#contact">Contact</a></li>
            <li><a href="#support">Support</a></li>
          </ul>

          <div>&copy; 2077 {props.companyName}. Secured Network.</div>
        </div>
      </footer>
    </div>
  );
};
