import type { Metadata } from 'next';
import {
  Navbar,
  Hero,
  Features,
  OpenSourceStrip,
  BigCTA,
  Footer,
  LandingMotion,
} from '@/components/landing';
import '../components/landing/landing.css';

export const metadata: Metadata = {
  title: "Group chat that's all fun & games",
  description:
    'FreedomTalk is the playful group chat for gamers and online communities — talk, play, and hang out with voice, chat, and servers you make your own. Open it right in your browser.',
};

export default function Home() {
  return (
    <div className="ftl">
      <LandingMotion />
      <Navbar />
      <main>
        <Hero />
        <Features />
        <OpenSourceStrip />
        <BigCTA />
      </main>
      <Footer />
    </div>
  );
}
