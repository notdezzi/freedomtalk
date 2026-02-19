import { Navbar, Hero, Features, WhyUs, CTA, Footer } from '@/components/landing';

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Features />
        <WhyUs />
        <CTA />
      </main>
      <Footer />
    </>
  );
}
