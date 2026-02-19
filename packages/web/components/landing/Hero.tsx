'use client';

import Link from 'next/link';
import { Button } from '@/components/ui';

export function Hero() {
  return (
    <section className="pt-32 pb-20 px-4 text-center">
      <h1 className="text-5xl font-bold text-white mb-6">
        Imagine a place where
        <br />
        you can belong
      </h1>
      <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-8">
        FreedomTalk is the easiest way to communicate over voice, video, and text.
        Chat, hang out, and stay close with your friends and communities.
      </p>
      <div className="flex items-center justify-center gap-4">
        <Link href="/auth/register">
          <Button size="lg">Get Started</Button>
        </Link>
        <Link href="/app">
          <Button variant="secondary" size="lg">Open App</Button>
        </Link>
      </div>
    </section>
  );
}
