"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageSquare, Mic, Video, Users, Shield, Zap, Github, ArrowRight, Lock, Hash, } from "lucide-react";
function useTypingEffect(words, speed = 100) {
    const [text, setText] = useState("");
    const [wordIndex, setWordIndex] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);
    useEffect(() => {
        const word = words[wordIndex];
        const timeout = setTimeout(() => {
            if (!isDeleting) {
                setText(word.substring(0, text.length + 1));
                if (text === word) {
                    setTimeout(() => setIsDeleting(true), 2000);
                }
            }
            else {
                setText(word.substring(0, text.length - 1));
                if (text === "") {
                    setIsDeleting(false);
                    setWordIndex((i) => (i + 1) % words.length);
                }
            }
        }, isDeleting ? speed / 2 : speed);
        return () => clearTimeout(timeout);
    }, [text, isDeleting, wordIndex, words, speed]);
    return text;
}
const features = [
    { icon: Hash, title: "Text Channels", desc: "Organized conversations with markdown, code blocks, and file sharing.", color: "#5865f2" },
    { icon: Mic, title: "Voice Channels", desc: "Drop-in voice chat. No calling needed — just click and talk.", color: "#57f287" },
    { icon: Video, title: "Video & Screen Share", desc: "HD video calls and screen sharing for everyone.", color: "#eb459e" },
    { icon: Users, title: "Server Roles", desc: "Custom roles with granular permissions.", color: "#fee75c" },
    { icon: Shield, title: "Your Data, Your Rules", desc: "Self-host and own your community data.", color: "#ed4245" },
    { icon: Lock, title: "Secure & Private", desc: "Built with security as a priority.", color: "#9b59b6" },
];
export default function Home() {
    const typing = useTypingEffect(["communities", "conversations", "connections"]);
    return (<div className="bg-[#313338] min-h-screen">
      
      <nav className="fixed top-0 w-full z-50 bg-[#313338]/90 backdrop-blur border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#5865f2] rounded-lg flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-white"/>
            </div>
            <span className="font-bold text-white">FreedomTalk</span>
          </Link>

          <div className="hidden md:flex items-center gap-8 text-sm">
            <a href="#features" className="text-white/70 hover:text-white">Features</a>
            <a href="#about" className="text-white/70 hover:text-white">About</a>
            <a href="https://github.com" target="_blank" className="text-white/70 hover:text-white flex items-center gap-1">
              <Github className="w-4 h-4"/> GitHub
            </a>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-white/70 hover:text-white">Log In</Link>
            <Link href="/register" className="text-sm bg-[#5865f2] hover:bg-[#4752c4] text-white px-4 py-2 rounded-md transition">
              Sign Up
            </Link>
          </div>
        </div>
      </nav>

      
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 mb-8">
            <Zap className="w-4 h-4 text-yellow-400"/>
            <span className="text-sm text-white/80">Discord-compatible platform</span>
          </div>

          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
            Where <span className="text-[#5865f2]">{typing}|</span><br />
            come together
          </h1>

          <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto mb-10">
            FreedomTalk is a Discord-compatible platform for creating servers, chatting with friends,
            and building communities. Text, voice, and video — all in one place.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <button className="w-full sm:w-auto bg-[#5865f2] hover:bg-[#4752c4] text-white px-8 py-4 rounded-lg font-medium flex items-center justify-center gap-2 transition">
                Get Started <ArrowRight className="w-4 h-4"/>
              </button>
            </Link>
            <Link href="/login">
              <button className="w-full sm:w-auto bg-white/5 hover:bg-white/10 text-white px-8 py-4 rounded-lg font-medium border border-white/10 transition">
                Already have an account?
              </button>
            </Link>
          </div>
        </div>

        
        <div className="max-w-5xl mx-auto mt-16">
          <div className="bg-[#2b2d31] rounded-xl border border-white/5 overflow-hidden shadow-2xl">
            <div className="bg-[#1e1f22] px-4 py-3 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500"/>
                <div className="w-3 h-3 rounded-full bg-yellow-500"/>
                <div className="w-3 h-3 rounded-full bg-green-500"/>
              </div>
            </div>
            <div className="flex h-72">
              <div className="w-16 bg-[#1e1f22] p-2 flex flex-col items-center gap-2">
                {[1, 2, 3, 4, 5].map((i) => (<div key={i} className={`w-10 h-10 rounded-2xl ${i === 1 ? "bg-[#5865f2] rounded-xl" : "bg-[#313338]"}`}/>))}
              </div>
              <div className="w-44 bg-[#2b2d31] p-3 hidden sm:block">
                <p className="text-xs text-white/40 uppercase font-semibold mb-2">Channels</p>
                {["welcome", "general", "off-topic"].map((c, i) => (<div key={c} className={`flex items-center gap-1.5 px-2 py-1.5 rounded text-sm ${i === 1 ? "bg-white/10 text-white" : "text-white/50"}`}>
                    <Hash className="w-3 h-3"/> {c}
                  </div>))}
              </div>
              <div className="flex-1 bg-[#313338] p-4">
                <div className="flex items-center gap-2 pb-3 mb-3 border-b border-white/5">
                  <Hash className="w-4 h-4 text-white/40"/>
                  <span className="text-white font-medium">general</span>
                </div>
                <div className="space-y-3">
                  {[1, 2].map((i) => (<div key={i} className="flex gap-3">
                      <div className="w-8 h-8 bg-[#5865f2] rounded-full shrink-0"/>
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-white text-sm font-medium">User</span>
                          <span className="text-xs text-white/40">Today</span>
                        </div>
                        <p className="text-white/70 text-sm">Welcome to the server! 🎉</p>
                      </div>
                    </div>))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      
      <section id="features" className="py-24 px-6 bg-[#2b2d31]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Everything you love about Discord
            </h2>
            <p className="text-white/50 max-w-xl mx-auto">
              All the features you need to build your community, without the baggage.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (<div key={f.title} className="bg-[#313338] p-6 rounded-xl border border-white/5 hover:border-white/10 transition">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4" style={{ backgroundColor: f.color + "20" }}>
                  <f.icon className="w-5 h-5" style={{ color: f.color }}/>
                </div>
                <h3 className="text-white font-semibold mb-2">{f.title}</h3>
                <p className="text-white/50 text-sm">{f.desc}</p>
              </div>))}
          </div>
        </div>
      </section>

      
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {["100% Free", "∞ Messages", "24/7 Up", "0 Ads"].map((s) => (<div key={s} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-[#5865f2] mb-1">{s.split(" ")[0]}</div>
                <div className="text-sm text-white/40">{s.split(" ")[1] || ""}</div>
              </div>))}
          </div>
        </div>
      </section>

      
      <section id="about" className="py-24 px-6 bg-[#2b2d31]">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to start?
          </h2>
          <p className="text-white/50 mb-8">
            Create your free account and start building your server in seconds.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <button className="w-full sm:w-auto bg-[#5865f2] hover:bg-[#4752c4] text-white px-8 py-4 rounded-lg font-medium flex items-center justify-center gap-2 transition">
                Create Account <ArrowRight className="w-4 h-4"/>
              </button>
            </Link>
            <a href="https://github.com" target="_blank" className="flex items-center justify-center gap-2 text-white/60 hover:text-white py-4 transition">
              <Github className="w-5 h-5"/> View on GitHub
            </a>
          </div>
        </div>
      </section>

      
      <footer className="py-12 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 bg-[#5865f2] rounded flex items-center justify-center">
                  <MessageSquare className="w-3 h-3 text-white"/>
                </div>
                <span className="font-semibold text-white">FreedomTalk</span>
              </div>
              <p className="text-sm text-white/40">Discord-compatible platform.</p>
            </div>
            {["Product", "Resources", "Legal"].map((cat) => (<div key={cat}>
                <h4 className="font-semibold text-white text-sm mb-3">{cat}</h4>
                <ul className="space-y-2 text-sm text-white/40">
                  <li><a href="#" className="hover:text-white">Link</a></li>
                  <li><a href="#" className="hover:text-white">Link</a></li>
                  <li><a href="#" className="hover:text-white">Link</a></li>
                </ul>
              </div>))}
          </div>
          <div className="pt-8 border-t border-white/5 flex justify-between items-center text-sm text-white/40">
            <span>© 2026 FreedomTalk</span>
            <div className="flex gap-4">
              <a href="#" className="hover:text-white"><Github className="w-5 h-5"/></a>
            </div>
          </div>
        </div>
      </footer>
    </div>);
}
//# sourceMappingURL=page.jsx.map