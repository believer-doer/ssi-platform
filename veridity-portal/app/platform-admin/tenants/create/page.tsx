"use client";
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useSessionContext } from '@/lib/hooks/useSessionContext';

const schema = z.object({
  name: z.string().min(2, "Tenant Name is required (min 2 chars)"),
  tier: z.enum(["basic", "professional", "enterprise"]),
  issuerDid: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function CreateTenantPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { jwt } = useSessionContext();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      tier: "basic",
    }
  });

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      apiFetch('/{driver}/tenants', 'post', {
        driver: 'internal',
        jwt: jwt,
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      router.push('/platform-admin/tenants');
    },
  });

  return (
    <div className="max-w-xl mx-auto space-y-12 py-12 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2">
          Platform Governance
        </div>
        <h3 className="text-4xl font-black tracking-tight text-slate-900 italic underline decoration-indigo-500 decoration-8 underline-offset-8">Provision Tenant</h3>
        <p className="text-slate-500 font-medium text-lg">Onboard a new organization to the Veridity Control Plane.</p>
      </div>

      <form 
        className="bg-white/90 backdrop-blur-3xl p-10 rounded-[3rem] shadow-2xl shadow-slate-200/60 border border-white space-y-8 relative overflow-hidden" 
        onSubmit={handleSubmit((data) => mutation.mutate(data))}
      >
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
        
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="block text-xs font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Organization Identity</label>
            <input 
              {...register('name')} 
              className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300 font-bold text-slate-700"
              placeholder="Enter legal entity name"
            />
            {errors.name && <div className="text-rose-500 text-[10px] font-black uppercase tracking-wider ml-2 mt-1">{errors.name.message}</div>}
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Service Tier</label>
            <div className="grid grid-cols-3 gap-3">
              {(['basic', 'professional', 'enterprise'] as const).map((t) => (
                <label key={t} className="relative cursor-pointer group">
                  <input 
                    type="radio" 
                    {...register('tier')} 
                    value={t} 
                    className="peer sr-only" 
                  />
                  <div className="px-4 py-3 text-center rounded-2xl border-2 border-slate-50 bg-slate-50 peer-checked:border-indigo-500 peer-checked:bg-white peer-checked:shadow-lg transition-all group-hover:border-slate-200">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 peer-checked:text-indigo-600">{t}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-black text-slate-400 uppercase tracking-[0.2em] ml-1 flex items-center justify-between">
              Issuer DID (Optional)
              <span className="text-[9px] font-bold text-indigo-400 lowercase">Experimental</span>
            </label>
            <input 
              {...register('issuerDid')} 
              className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300 font-mono text-xs"
              placeholder="did:example:123..."
            />
          </div>
        </div>

        <div className="pt-6 flex flex-col gap-4">
          <button 
            type="submit" 
            className="w-full bg-slate-900 py-5 rounded-2xl font-black text-white shadow-2xl shadow-slate-900/20 active:scale-[0.98] hover:bg-black transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-3">
                <span className="w-5 h-5 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                Validating Registry...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                Provision Resources
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
              </span>
            )}
          </button>
          
          <button 
            type="button"
            onClick={() => router.back()}
            className="w-full py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] hover:text-slate-600 transition-colors"
          >
            &larr; Return to Registry
          </button>
        </div>

        {mutation.error && (
          <div className="p-6 rounded-[2rem] bg-rose-50 border-2 border-rose-100 text-rose-700 flex items-center gap-4 animate-in zoom-in-95 duration-300">
            <svg className="w-6 h-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            <p className="text-sm font-black italic">{String(mutation.error)}</p>
          </div>
        )}
      </form>
    </div>
  );
}
