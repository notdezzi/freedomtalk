import Link from 'next/link';
import { LogoMark } from './illustrations';

const GITHUB_REPO = 'https://github.com/notdezzi/freedomtalk';
const GITHUB_RELEASES = 'https://github.com/notdezzi/freedomtalk/releases';
const GITHUB_ISSUES = 'https://github.com/notdezzi/freedomtalk/issues';

const columns = [
  {
    title: 'Product',
    links: [
      { label: 'Open in browser', href: '/app' },
      { label: 'Download', href: GITHUB_RELEASES, external: true },
      { label: 'Features', href: '#features' },
      { label: 'Log in', href: '/auth/login' },
    ],
  },
  {
    title: 'Community',
    links: [
      { label: 'GitHub', href: GITHUB_REPO, external: true },
      { label: 'Releases', href: GITHUB_RELEASES, external: true },
      { label: 'Report an issue', href: GITHUB_ISSUES, external: true },
    ],
  },
];

export function Footer() {
  return (
    <footer className="ftl-footer">
      <div className="ftl-container">
        <div className="ftl-footer-grid">
          <div className="ftl-footer-brand">
            <Link href="/" className="ftl-logo" aria-label="FreedomTalk home">
              <LogoMark />
              <span className="ftl-logo-word">
                Freedom<span style={{ color: 'var(--ftl-blurple)' }}>Talk</span>
              </span>
            </Link>
            <p className="ftl-footer-tag">
              The group chat that&rsquo;s all fun and games. Open source, MIT
              licensed, and yours to host.
            </p>
          </div>

          {columns.map((col) => (
            <div key={col.title} className="ftl-footer-col">
              <h3>{col.title}</h3>
              <ul>
                {col.links.map((link) => (
                  <li key={link.label}>
                    {link.external ? (
                      <a href={link.href} target="_blank" rel="noopener noreferrer">
                        {link.label}
                      </a>
                    ) : (
                      <Link href={link.href}>{link.label}</Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="ftl-footer-bottom">
          <span>© {new Date().getFullYear()} FreedomTalk · MIT License</span>
          <span>Runs on your hardware, not ours.</span>
        </div>
      </div>
    </footer>
  );
}
