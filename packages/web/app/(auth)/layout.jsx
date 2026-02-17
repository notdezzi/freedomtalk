import Link from "next/link";
import { MessageSquare } from "lucide-react";
export default function AuthLayout({ children, }) {
    return (<div className="min-h-screen bg-[#313338] flex flex-col">
      
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/4 w-[150%] h-[150%] bg-gradient-to-br from-[#5865f2]/20 via-transparent to-transparent blur-3xl"/>
      </div>

      
      <header className="relative z-10 flex items-center justify-center py-6">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="w-10 h-10 rounded-full bg-[#5865f2] flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-white"/>
          </div>
          <span className="text-xl font-bold text-white">FreedomTalk</span>
        </Link>
      </header>

      
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        {children}
      </main>
    </div>);
}
//# sourceMappingURL=layout.jsx.map