'use client';

import { Check, ArrowRight } from 'lucide-react';

const reasons = [
  {
    title: 'True Ownership',
    description:
      'Your data belongs to you. Export it anytime, delete it completely. No vendor lock-in, ever.',
  },
  {
    title: 'Open Source',
    description:
      'Fully transparent codebase. Audit it, contribute to it, or run your own instance.',
  },
  {
    title: 'No Algorithmic Feeds',
    description:
      'Chronological, unfiltered conversations. No engagement hacking, no manipulation.',
  },
  {
    title: 'Fair Pricing',
    description:
      'Simple, transparent pricing. No hidden fees, no surprise charges, no BS.',
  },
  {
    title: 'Active Development',
    description:
      'Regular updates, new features, and responsive support. We listen to our community.',
  },
  {
    title: 'Developer Friendly',
    description:
      'Powerful API, webhooks, and integrations. Build bots, automations, and custom tools.',
  },
];

const comparisons = [
  { us: 'End-to-end encryption', them: 'Limited encryption' },
  { us: 'No ads, ever', them: 'Ads in free tier' },
  { us: 'Full data export', them: 'Limited export options' },
  { us: 'Open source', them: 'Proprietary' },
  { us: 'Transparent roadmap', them: 'Uncertain future' },
];

export default function WhyUs() {
  return (
    <section id="why-us" className="py-24 md:py-32 relative">
      {/* Background accent */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-accent/[0.02] to-transparent pointer-events-none" />

      <div className="container relative">
        <div className="grid lg:grid-cols-2 gap-16 items-start">
          {/* Left: Reasons */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-muted border border-accent/20 mb-6">
              <span className="text-sm font-medium text-accent">Why FreedomTalk?</span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6">
              Built different,
              <br />
              <span className="gradient-text">for a reason</span>
            </h2>
            <p className="text-lg text-foreground-muted mb-10">
              We started FreedomTalk because we believed communication platforms
              should respect their users. Here&apos;s what makes us different.
            </p>

            <div className="grid sm:grid-cols-2 gap-6">
              {reasons.map((reason) => (
                <div key={reason.title} className="flex gap-4">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-accent-muted flex items-center justify-center">
                    <Check className="w-4 h-4 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{reason.title}</h3>
                    <p className="text-sm text-foreground-muted">
                      {reason.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Comparison */}
          <div className="lg:sticky lg:top-32">
            <div className="card !p-0 overflow-hidden">
              {/* Header */}
              <div className="grid grid-cols-2 border-b border-border">
                <div className="px-6 py-4 border-r border-border">
                  <span className="text-sm font-semibold gradient-text">FreedomTalk</span>
                </div>
                <div className="px-6 py-4">
                  <span className="text-sm font-medium text-foreground-subtle">Others</span>
                </div>
              </div>

              {/* Rows */}
              <div className="divide-y divide-border">
                {comparisons.map((item, index) => (
                  <div key={index} className="grid grid-cols-2">
                    <div className="px-6 py-4 border-r border-border flex items-center gap-3">
                      <Check className="w-4 h-4 text-accent flex-shrink-0" />
                      <span className="text-sm">{item.us}</span>
                    </div>
                    <div className="px-6 py-4 flex items-center">
                      <span className="text-sm text-foreground-subtle">{item.them}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-border bg-background-surface/50">
                <a
                  href="#"
                  className="inline-flex items-center gap-2 text-sm font-medium text-accent hover:text-accent-hover transition-colors group"
                >
                  Read our full manifesto
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
