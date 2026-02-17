import Link from "next/link";
import {
  MessageSquare,
  Mic,
  Users,
  Shield,
  Zap,
  Globe,
  ChevronRight,
  Headphones,
  Video,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#313338] text-[var(--text-normal)] overflow-x-hidden">
      {/* Background gradient effect */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/4 w-[150%] h-[150%] bg-gradient-to-br from-[#5865f2]/20 via-transparent to-transparent blur-3xl" />
        <div className="absolute -bottom-1/2 -right-1/4 w-[150%] h-[150%] bg-gradient-to-tl from-[#eb459e]/10 via-transparent to-transparent blur-3xl" />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 md:px-12">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-[#5865f2] flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white">FreedomTalk</span>
        </div>

        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-[var(--text-muted)] hover:text-white transition-colors">
            Features
          </a>
          <a href="#community" className="text-[var(--text-muted)] hover:text-white transition-colors">
            Community
          </a>
          <a href="#about" className="text-[var(--text-muted)] hover:text-white transition-colors">
            About
          </a>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" size="sm">
              Log In
            </Button>
          </Link>
          <Link href="/register">
            <Button size="sm">Sign Up</Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-6 text-center">
        <div className="max-w-4xl mx-auto animate-slide-up">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Where Communities
            <br />
            <span className="bg-gradient-to-r from-[#5865f2] via-[#eb459e] to-[#fee75c] bg-clip-text text-transparent">
              Come Together
            </span>
          </h1>
          <p className="text-lg md:text-xl text-[var(--text-muted)] mb-10 max-w-2xl mx-auto leading-relaxed">
            FreedomTalk is a free, open-source platform for voice, video, and text communication.
            Create your own community, join servers, and connect with friends — all without the bloat.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link href="/register">
              <Button size="lg" className="group">
                Get Started — It&apos;s Free
                <ChevronRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="secondary" size="lg">
                Already have an account?
              </Button>
            </Link>
          </div>

          {/* Preview mockup */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-t from-[#313338] via-transparent to-transparent z-10" />
            <div className="bg-[#2b2d31] rounded-lg overflow-hidden shadow-2xl border border-[#1e1f22]">
              {/* Mock app header */}
              <div className="flex items-center gap-2 px-4 py-3 bg-[#1e1f22] border-b border-[#111214]">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-[#da373c]" />
                  <div className="w-3 h-3 rounded-full bg-[#f0b132]" />
                  <div className="w-3 h-3 rounded-full bg-[#23a559]" />
                </div>
                <div className="flex-1 text-center text-xs text-[var(--text-muted)]">
                  FreedomTalk
                </div>
              </div>

              {/* Mock app layout */}
              <div className="flex h-[400px]">
                {/* Server sidebar */}
                <div className="w-[72px] bg-[#1e1f22] p-3 flex flex-col items-center gap-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className={`w-12 h-12 rounded-[24px] ${i === 1 ? 'bg-[#5865f2] rounded-[16px]' : 'bg-[#313338] hover:rounded-[16px]'} transition-all duration-200 cursor-pointer`}
                    />
                  ))}
                  <div className="w-12 h-12 rounded-[24px] bg-[#313338] hover:rounded-[16px] hover:bg-[#23a559] flex items-center justify-center text-[#23a559] hover:text-white transition-all duration-200 cursor-pointer">
                    +
                  </div>
                </div>

                {/* Channel sidebar */}
                <div className="w-60 bg-[#2b2d31] p-4">
                  <div className="text-xs font-semibold text-[var(--text-muted)] uppercase mb-2">
                    # General
                  </div>
                  {['welcome', 'announcements', 'general', 'off-topic'].map((channel, i) => (
                    <div
                      key={channel}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded text-sm cursor-pointer ${
                        i === 2 ? 'bg-[#404249] text-white' : 'text-[var(--text-muted)] hover:bg-[#35373c]'
                      }`}
                    >
                      <span className="text-lg opacity-60">#</span>
                      {channel}
                    </div>
                  ))}
                </div>

                {/* Main content */}
                <div className="flex-1 bg-[#313338] p-4">
                  <div className="border-b border-[#1e1f22] pb-3 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-lg opacity-60">#</span>
                      <span className="font-semibold text-white">general</span>
                    </div>
                  </div>

                  {/* Mock messages */}
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex gap-4 animate-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
                        <div className="w-10 h-10 rounded-full bg-[#5865f2] flex-shrink-0" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-white">User {i}</span>
                            <span className="text-xs text-[var(--text-muted)]">Today at 3:{45 + i * 5} PM</span>
                          </div>
                          <p className="text-[var(--text-normal)]">
                            This is an example message in the chat. FreedomTalk makes it easy to communicate! 🎉
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative z-10 py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Everything you need to build your community
            </h2>
            <p className="text-[var(--text-muted)] text-lg max-w-2xl mx-auto">
              Powerful features designed for communities of all sizes. Free forever, no strings attached.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature cards */}
            {[
              {
                icon: MessageSquare,
                title: "Text Channels",
                description: "Organize conversations with channels. Share files, embeds, and rich content.",
                color: "#5865f2",
              },
              {
                icon: Mic,
                title: "Voice Channels",
                description: "Drop-in voice channels for seamless audio communication with your community.",
                color: "#23a559",
              },
              {
                icon: Video,
                title: "Video Calls",
                description: "Face-to-face conversations with high-quality video calling and screen sharing.",
                color: "#eb459e",
              },
              {
                icon: Users,
                title: "Server Roles",
                description: "Create custom roles with granular permissions to manage your community.",
                color: "#fee75c",
              },
              {
                icon: Shield,
                title: "Privacy First",
                description: "Your data stays yours. Self-host, audit the code, and control your instance.",
                color: "#ed4245",
              },
              {
                icon: Zap,
                title: "Lightning Fast",
                description: "Built on modern tech for real-time messaging with minimal latency.",
                color: "#9b59b6",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="group p-6 bg-[#2b2d31] rounded-lg border border-[#1e1f22] hover:border-[#5865f2]/50 transition-all duration-300"
              >
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center mb-4"
                  style={{ backgroundColor: `${feature.color}20` }}
                >
                  <feature.icon className="w-6 h-6" style={{ color: feature.color }} />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-[var(--text-muted)] text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative z-10 py-24 px-6 bg-[#2b2d31]/50">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: "100%", label: "Open Source" },
              { value: "∞", label: "Messages" },
              { value: "24/7", label: "Uptime" },
              { value: "0$", label: "Cost" },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-4xl md:text-5xl font-bold text-white mb-2">
                  {stat.value}
                </div>
                <div className="text-[var(--text-muted)] text-sm uppercase tracking-wide">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="p-12 bg-gradient-to-br from-[#5865f2]/20 to-[#eb459e]/20 rounded-2xl border border-[#5865f2]/30">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to start your community?
            </h2>
            <p className="text-[var(--text-muted)] mb-8 max-w-lg mx-auto">
              Join thousands of communities already using FreedomTalk. Create your free account in seconds.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/register">
                <Button size="lg" className="w-full sm:w-auto">
                  Create Your Account
                </Button>
              </Link>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-[var(--text-muted)] hover:text-white transition-colors"
              >
                <Globe className="w-5 h-5" />
                View on GitHub
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-12 px-6 border-t border-[#1e1f22]">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-[#5865f2] flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-white">FreedomTalk</span>
              </div>
              <p className="text-sm text-[var(--text-muted)]">
                Free, open-source communication for everyone.
              </p>
            </div>

            {[
              {
                title: "Product",
                links: ["Features", "Download", "Mobile", "Status"],
              },
              {
                title: "Resources",
                links: ["Documentation", "API", "Support", "Blog"],
              },
              {
                title: "Legal",
                links: ["Privacy", "Terms", "Guidelines", "Licenses"],
              },
            ].map((section) => (
              <div key={section.title}>
                <h4 className="font-semibold text-white mb-4">{section.title}</h4>
                <ul className="space-y-2">
                  {section.links.map((link) => (
                    <li key={link}>
                      <a
                        href="#"
                        className="text-sm text-[var(--text-muted)] hover:text-white transition-colors"
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="pt-8 border-t border-[#1e1f22] flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-[var(--text-muted)]">
              © 2026 FreedomTalk. Open source under the MIT license.
            </p>
            <div className="flex items-center gap-4">
              <a
                href="#"
                className="text-[var(--text-muted)] hover:text-white transition-colors"
                aria-label="GitHub"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
              </a>
              <a
                href="#"
                className="text-[var(--text-muted)] hover:text-white transition-colors"
                aria-label="Twitter"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a
                href="#"
                className="text-[var(--text-muted)] hover:text-white transition-colors"
                aria-label="Discord"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
