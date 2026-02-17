import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Auth | FreedomTalk',
  description: 'Sign in to FreedomTalk',
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>

      {/* Right side - Decorative */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden bg-background-elevated">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-accent/20 via-transparent to-secondary/20" />

        {/* Floating orbs */}
        <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-accent/10 rounded-full blur-3xl animate-float" />
        <div
          className="absolute bottom-1/4 left-1/4 w-48 h-48 bg-secondary/10 rounded-full blur-3xl animate-float"
          style={{ animationDelay: '2s' }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center w-full p-12">
          <div className="text-center">
            <h2 className="text-4xl font-bold mb-4">
              Welcome to <span className="gradient-text">FreedomTalk</span>
            </h2>
            <p className="text-lg text-foreground-muted max-w-md">
              Join thousands of communities connecting, sharing, and building together.
            </p>
          </div>

          {/* Feature highlights */}
          <div className="mt-12 space-y-6">
            {[
              'Real-time messaging with zero lag',
              'End-to-end encryption',
              'Open source & transparent',
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-accent-muted flex items-center justify-center">
                  <svg
                    className="w-3 h-3 text-accent"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <span className="text-foreground-muted">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
