'use client';

import Link from 'next/link';
import { Button } from '@/components/ui';

export function CTA() {
  return (
    <section className="py-20 px-4 bg-blue-600">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl font-bold text-white mb-4">
          Ready to start your journey?
        </h2>
        <p className="text-blue-100 mb-8">
          Join millions of users and create your free account today.
        </p>
        <Link href="/auth/register">
          <Button variant="secondary" size="lg">
            Get Started for Free
          </Button>
        </Link>
      </div>
    </section>
  );
}
