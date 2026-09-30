"use client";

import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Lock, Mail, ArrowRight, ShieldCheck, Zap, Globe } from 'lucide-react';
import Image from 'next/image';

export default function LoginPage() {
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<{ email: string; password: string }>();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (data: { email: string; password: string }) => {
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        const { role, tenantId } = (await res.json()) as { role?: string; tenantId?: string };
        // Navigate to the authenticated workspace route.
        router.replace(role === 'platform-admin' ? '/platform-admin/tenants' : `/tenant/${tenantId}/dashboard`);
      } else {
        const result = await res.json() as { error?: string };
        setError(result.error || 'Invalid credentials. Please try again.');
      }
    } catch {
      setError('Connection failed. Please check your network.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex relative overflow-hidden font-sans">
      {/* Dynamic Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute top-[60%] -right-[5%] w-[30%] h-[40%] bg-purple-600/10 rounded-full blur-[100px]" />
        <div className="absolute top-0 left-0 w-full h-full opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
      </div>

      {/* Left Decoration - Brand Side */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center px-24 relative z-10 border-r border-white/5">
        <div className="space-y-12">
          <div className="flex items-center gap-4 group">
            {/* <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-2xl shadow-indigo-500/40 group-hover:scale-110 transition-transform duration-500">
              <Hexagon className="w-8 h-8 text-white fill-white/10" />
            </div>
            <span className="text-3xl font-black tracking-tighter text-white italic tracking-widest">VERIDITY</span> */}
            <Image src="/assets/veridity-logo.svg" alt="Veridity Logo" width={160} height={40} priority className="w-40" />
          </div>

          <div className="space-y-6">
            <h1 className="text-6xl font-black text-white leading-[1.1] tracking-tight">
              Enterprise-Grade <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 italic underline decoration-white/20 decoration-8 underline-offset-[12px]">SSI Governance</span>
            </h1>
            <p className="text-slate-400 text-xl font-medium max-w-lg leading-relaxed">
              Secure your organization&apos;s digital identity with Veridity. The centralized control plane for decentralized trust.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 pt-8">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                <ShieldCheck className="w-5 h-5 text-indigo-400" />
              </div>
              <p className="text-slate-300 font-bold text-sm">Military Grade</p>
              <p className="text-slate-500 text-xs">Proprietary driver isolation for maximum security.</p>
            </div>
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                <Zap className="w-5 h-5 text-purple-400" />
              </div>
              <p className="text-slate-300 font-bold text-sm">Real-time Sync</p>
              <p className="text-slate-500 text-xs">Instant registry propagation across all drivers.</p>
            </div>
          </div>
        </div>
        
        <div className="absolute bottom-12 left-24 flex items-center gap-6">
            <div className="flex -space-x-3">
                {[1,2,3,4].map(i => (
                    <div key={i} className="w-10 h-10 rounded-full border-2 border-slate-950 bg-slate-800 flex items-center justify-center overflow-hidden">
                        <Image src={`https://i.pravatar.cc/100?u=${i*123}`} alt="avatar" width={40} height={40} unoptimized />
                    </div>
                ))}
            </div>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">+500 Enterprises Integrated</p>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative z-10 font-sans">
        <div className="w-full max-w-md space-y-10 animate-in fade-in slide-in-from-right-8 duration-1000">
          <div className="text-center lg:text-left space-y-3">
            <h2 className="text-4xl font-black text-white tracking-tight italic">Welcome Back</h2>
            <p className="text-slate-400 font-medium">Access your global control plane instance.</p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-1">Identity Identifier</label>
                <div className="relative group/input">
                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-500 group-focus-within/input:text-indigo-400 transition-colors" />
                  </div>
                  <input 
                    {...register('email')}
                    type="email" 
                    required
                    placeholder="admin@veridity.io"
                    className="block w-full pl-14 pr-5 py-5 bg-white/5 border border-white/10 rounded-[1.5rem] text-white font-bold placeholder:text-slate-600 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all hover:bg-white/[0.07]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-1">Access Passcode</label>
                <div className="relative group/input">
                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-500 group-focus-within/input:text-indigo-400 transition-colors" />
                  </div>
                  <input 
                    {...register('password')}
                    type="password" 
                    required
                    placeholder="••••••••••••"
                    className="block w-full pl-14 pr-5 py-5 bg-white/5 border border-white/10 rounded-[1.5rem] text-white font-bold placeholder:text-slate-600 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all hover:bg-white/[0.07]"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between px-2">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input type="checkbox" className="w-5 h-5 rounded-lg bg-white/5 border-white/10 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-950 transition-all" />
                <span className="text-sm font-bold text-slate-500 group-hover:text-slate-300 transition-colors">Persistent session</span>
              </label>
              <button type="button" className="text-sm font-bold text-indigo-400 hover:text-indigo-300 transition-colors">Forgotten identifier?</button>
            </div>

            {error && (
              <div className="p-5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-black italic flex items-center gap-3 animate-in shake-in-from-bottom duration-300">
                <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-3 bg-white py-6 rounded-[2rem] font-black text-slate-950 text-lg shadow-[0_20px_50px_rgba(255,255,255,0.1)] active:scale-[0.97] hover:bg-indigo-50 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="w-6 h-6 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
                  Signing Authority...
                </>
              ) : (
                <>
                  Authentication Entry
                  <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="pt-10 flex flex-col items-center gap-6">
            <div className="flex items-center gap-4 w-full">
                <div className="h-px flex-1 bg-white/5" />
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Network Authority</span>
                <div className="h-px flex-1 bg-white/5" />
            </div>
            
            <div className="flex gap-4">
                <button className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-slate-400 hover:bg-white/10 hover:text-white transition-all flex items-center gap-2">
                    <Globe className="w-4 h-4" /> Local Driver
                </button>
                <button className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-slate-400 hover:bg-white/10 hover:text-white transition-all flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4" /> SSI Connect
                </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
