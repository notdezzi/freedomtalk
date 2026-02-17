"use client";
import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui";
import api from "@/lib/api";
function VerifyEmailContent() {
    const searchParams = useSearchParams();
    const token = searchParams.get("token");
    const [status, setStatus] = useState("loading");
    const [message, setMessage] = useState("");
    useEffect(() => {
        const verifyEmail = async () => {
            if (!token) {
                setStatus("error");
                setMessage("Invalid verification link. Please request a new verification email.");
                return;
            }
            try {
                await api.post("/auth/verify-email", { token });
                setStatus("success");
                setMessage("Your email has been verified successfully!");
            }
            catch (err) {
                setStatus("error");
                setMessage(err instanceof Error ? err.message : "Verification failed. The link may have expired.");
            }
        };
        verifyEmail();
    }, [token]);
    return (<div className="w-full max-w-md">
      <div className="bg-[#313338] rounded-lg shadow-lg p-8 text-center">
        {status === "loading" && (<>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--brand-primary)]/20 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-[var(--brand-primary)] animate-spin"/>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Verifying your email...</h1>
            <p className="text-[var(--text-muted)]">Please wait while we verify your email address.</p>
          </>)}

        {status === "success" && (<>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--status-green)]/20 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-[var(--status-green)]"/>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Email Verified!</h1>
            <p className="text-[var(--text-muted)] mb-6">{message}</p>
            <Link href="/login">
              <Button fullWidth>Continue to Login</Button>
            </Link>
          </>)}

        {status === "error" && (<>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--text-danger)]/20 flex items-center justify-center">
              <XCircle className="w-8 h-8 text-[var(--text-danger)]"/>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Verification Failed</h1>
            <p className="text-[var(--text-muted)] mb-6">{message}</p>
            <div className="space-y-3">
              <Link href="/login">
                <Button fullWidth>Go to Login</Button>
              </Link>
              <p className="text-sm text-[var(--text-muted)]">
                Need a new verification email?{" "}
                <Link href="/resend-verification" className="text-[var(--text-link)] hover:underline">
                  Resend verification
                </Link>
              </p>
            </div>
          </>)}
      </div>
    </div>);
}
export default function VerifyEmailPage() {
    return (<Suspense fallback={<div className="min-h-screen bg-[#313338]"/>}>
      <VerifyEmailContent />
    </Suspense>);
}
//# sourceMappingURL=page.jsx.map