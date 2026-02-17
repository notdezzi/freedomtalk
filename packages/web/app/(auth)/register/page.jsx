"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, Lock, Eye, EyeOff, User } from "lucide-react";
import { Button, Input, Checkbox } from "@/components/ui";
import { useAuthStore } from "@/stores/auth.store";
const registerSchema = z.object({
    username: z
        .string()
        .min(2, "Username must be at least 2 characters")
        .max(32, "Username must be 32 characters or less")
        .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
    email: z.string().email("Please enter a valid email address"),
    password: z
        .string()
        .min(8, "Password must be at least 8 characters")
        .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
        .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string(),
    terms: z.boolean().refine((val) => val === true, {
        message: "You must accept the terms and conditions",
    }),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});
export default function RegisterPage() {
    const router = useRouter();
    const { register: registerUser } = useAuthStore();
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const { register, handleSubmit, watch, formState: { errors }, } = useForm({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            username: "",
            email: "",
            password: "",
            confirmPassword: "",
            terms: false,
        },
    });
    const password = watch("password");
    const getPasswordStrength = () => {
        let strength = 0;
        if (password.length >= 8)
            strength++;
        if (/[A-Z]/.test(password))
            strength++;
        if (/[a-z]/.test(password))
            strength++;
        if (/[0-9]/.test(password))
            strength++;
        if (/[^A-Za-z0-9]/.test(password))
            strength++;
        return strength;
    };
    const passwordStrength = getPasswordStrength();
    const getStrengthColor = () => {
        if (passwordStrength <= 2)
            return "bg-[var(--text-danger)]";
        if (passwordStrength <= 3)
            return "bg-[var(--text-warning)]";
        return "bg-[var(--text-positive)]";
    };
    const getStrengthText = () => {
        if (passwordStrength <= 2)
            return "Weak";
        if (passwordStrength <= 3)
            return "Fair";
        return "Strong";
    };
    const onSubmit = async (data) => {
        setIsLoading(true);
        setError(null);
        try {
            await registerUser(data.username, data.email, data.password);
            router.push("/dm");
        }
        catch (err) {
            setError(err instanceof Error ? err.message : "Registration failed. Please try again.");
        }
        finally {
            setIsLoading(false);
        }
    };
    const handleOAuthRegister = (provider) => {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
        window.location.href = `${apiUrl}/api/v1/auth/oauth/${provider}`;
    };
    return (<div className="w-full max-w-md">
      <div className="bg-[#313338] rounded-lg shadow-lg p-8">
        
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-white mb-2">Create an account</h1>
          <p className="text-[var(--text-muted)]">Join FreedomTalk and start chatting</p>
        </div>

        
        {error && (<div className="mb-4 p-3 bg-[var(--text-danger)]/10 border border-[var(--text-danger)]/20 rounded-md">
            <p className="text-sm text-[var(--text-danger)]">{error}</p>
          </div>)}

        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input {...register("username")} type="text" label="Username" placeholder="cooluser123" error={errors.username?.message} icon={<User className="w-5 h-5"/>} disabled={isLoading}/>

          <Input {...register("email")} type="email" label="Email" placeholder="you@example.com" error={errors.email?.message} icon={<Mail className="w-5 h-5"/>} disabled={isLoading}/>

          <div>
            <div className="relative">
              <Input {...register("password")} type={showPassword ? "text" : "password"} label="Password" placeholder="Create a strong password" error={errors.password?.message} icon={<Lock className="w-5 h-5"/>} disabled={isLoading}/>
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-[38px] text-[var(--text-muted)] hover:text-[var(--text-normal)] transition-colors" tabIndex={-1}>
                {showPassword ? <EyeOff className="w-5 h-5"/> : <Eye className="w-5 h-5"/>}
              </button>
            </div>

            
            {password && (<div className="mt-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                    <div className={`h-full ${getStrengthColor()} transition-all duration-300`} style={{ width: `${(passwordStrength / 5) * 100}%` }}/>
                  </div>
                  <span className="text-xs text-[var(--text-muted)]">{getStrengthText()}</span>
                </div>
              </div>)}
          </div>

          <Input {...register("confirmPassword")} type={showPassword ? "text" : "password"} label="Confirm Password" placeholder="Confirm your password" error={errors.confirmPassword?.message} icon={<Lock className="w-5 h-5"/>} disabled={isLoading}/>

          <Checkbox {...register("terms")} label="I agree to the Terms of Service and Privacy Policy" error={errors.terms?.message}/>

          <Button type="submit" fullWidth loading={isLoading}>
            Create Account
          </Button>
        </form>

        
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[var(--border-default)]"/>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-2 bg-[#313338] text-[var(--text-muted)]">
              or continue with
            </span>
          </div>
        </div>

        
        <div className="space-y-3">
          <Button type="button" variant="secondary" fullWidth onClick={() => handleOAuthRegister("google")} disabled={isLoading}>
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </Button>

          <Button type="button" variant="secondary" fullWidth onClick={() => handleOAuthRegister("github")} disabled={isLoading}>
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            Continue with GitHub
          </Button>
        </div>

        
        <p className="mt-6 text-center text-sm text-[var(--text-muted)]">
          Already have an account?{" "}
          <Link href="/login" className="text-[var(--text-link)] hover:underline">
            Log In
          </Link>
        </p>
      </div>
    </div>);
}
//# sourceMappingURL=page.jsx.map