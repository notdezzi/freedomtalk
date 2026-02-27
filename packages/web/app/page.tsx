import {
  Navbar,
  Hero,
  NarrativeVoice,
  NarrativeText,
  NarrativeVideo,
  NarrativeCommunities,
  SystemDepth,
  CTA,
  Footer
} from '@/components/landing';

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <NarrativeVoice />
        <NarrativeText />
        <NarrativeVideo />
        <NarrativeCommunities />
        <SystemDepth />
        <CTA />
      </main>
      <Footer />
    </>
  );
}
