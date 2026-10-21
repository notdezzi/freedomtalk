import { Github } from 'lucide-react';

const GITHUB_REPO = 'https://github.com/notdezzi/freedomtalk';

export function OpenSourceStrip() {
  return (
    <section className="ftl-oss-strip" aria-label="Open source">
      <div className="ftl-container">
        <div className="ftl-oss-inner">
          <Github size={22} aria-hidden style={{ color: 'var(--ftl-text)' }} />
          <p className="ftl-oss-text">
            <strong>Open source</strong> and MIT licensed — self-host FreedomTalk
            on your own hardware.
          </p>
          <a href={GITHUB_REPO} target="_blank" rel="noopener noreferrer" className="ftl-textlink">
            Take me to the code →
          </a>
        </div>
      </div>
    </section>
  );
}
