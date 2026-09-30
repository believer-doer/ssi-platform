"use client";
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useSessionContext } from '@/lib/hooks/useSessionContext';

const schema = z.object({
  format: z.string().min(2, "Credential format is required"),
  issuerDid: z.string().min(2, "Issuer DID is required"),
  holderDid: z.string().min(2, "Holder DID is required"),
  schemaId: z.string().min(2, "Schema ID is required"),
  claims: z.string().min(2, "Claims are required"),
});

type FormData = z.infer<typeof schema>;

export default function CreateCredentialPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { jwt, tenantId } = useSessionContext();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const mutation = useMutation({
    mutationFn: (data: FormData) => {
      const body = {
        tenantId: tenantId ?? 'tenant-001',
        format: data.format,
        issuerDid: data.issuerDid,
        holderDid: data.holderDid,
        schemaId: data.schemaId,
        claims: JSON.parse(data.claims),
      };
      return apiFetch('/{driver}/credentials', 'post', {
        driver: 'internal',
        jwt: jwt,
        body,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credentials'] });
      router.push('/tenant/credentials');
    },
  });

  return (
    <div className="max-w-xl mx-auto space-y-8 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-2 text-center">
        <h3 className="text-3xl font-extrabold tracking-tight text-slate-900">Issue New Credential</h3>
        <p className="text-slate-500">Generate a new verifiable credential for a specific subject.</p>
      </div>

      <form 
        className="bg-white/80 backdrop-blur-2xl p-10 rounded-[2.5rem] shadow-2xl shadow-indigo-100/50 border border-white space-y-8" 
        onSubmit={handleSubmit((data) => mutation.mutate(data))}
      >
        <div className="space-y-6">
          <div className="group">
            <label className="block text-sm font-bold text-slate-700 mb-2.5 ml-1 transition-colors group-focus-within:text-brand-600">
              Credential Format
            </label>
            <div className="relative">
              <input 
                {...register('format')} 
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all placeholder:text-slate-400 font-medium"
                placeholder="e.g. vc-jwt, vc-ldp"
              />
            </div>
            {errors.format && <div className="text-rose-500 text-xs mt-2 font-bold ml-1">{errors.format.message}</div>}
          </div>

          <div className="group">
            <label className="block text-sm font-bold text-slate-700 mb-2.5 ml-1 transition-colors group-focus-within:text-brand-600">
              Issuer DID
            </label>
            <div className="relative">
              <input 
                {...register('issuerDid')} 
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all placeholder:text-slate-400 font-mono text-sm uppercase"
                placeholder="did:key:..."
              />
            </div>
            {errors.issuerDid && <div className="text-rose-500 text-xs mt-2 font-bold ml-1">{errors.issuerDid.message}</div>}
          </div>

          <div className="group">
            <label className="block text-sm font-bold text-slate-700 mb-2.5 ml-1 transition-colors group-focus-within:text-brand-600">
              Holder DID
            </label>
            <div className="relative">
              <input 
                {...register('holderDid')} 
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all placeholder:text-slate-400 font-mono text-sm uppercase"
                placeholder="did:key:..."
              />
            </div>
            {errors.holderDid && <div className="text-rose-500 text-xs mt-2 font-bold ml-1">{errors.holderDid.message}</div>}
          </div>

          <div className="group">
            <label className="block text-sm font-bold text-slate-700 mb-2.5 ml-1 transition-colors group-focus-within:text-brand-600">
              Schema ID
            </label>
            <div className="relative">
              <input 
                {...register('schemaId')} 
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all placeholder:text-slate-400 font-medium"
                placeholder="e.g. schema:employee-card"
              />
            </div>
            {errors.schemaId && <div className="text-rose-500 text-xs mt-2 font-bold ml-1">{errors.schemaId.message}</div>}
          </div>

          <div className="group">
            <label className="block text-sm font-bold text-slate-700 mb-2.5 ml-1 transition-colors group-focus-within:text-brand-600">
              Claims (JSON)
            </label>
            <div className="relative">
              <textarea 
                {...register('claims')} 
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all placeholder:text-slate-400 font-mono text-sm"
                placeholder='{"givenName": "John", "role": "Engineer"}'
                rows={4}
              />
            </div>
            {errors.claims && <div className="text-rose-500 text-xs mt-2 font-bold ml-1">{errors.claims.message}</div>}
          </div>
        </div>

        <div className="pt-4 flex flex-col sm:flex-row gap-4">
          <button 
            type="submit" 
            className="flex-[2] btn-primary py-4 rounded-2xl font-black text-white text-lg shadow-xl shadow-brand-500/30 hover:translate-y-[-2px] active:translate-y-0 transition-all disabled:opacity-50 disabled:translate-y-0"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-3">
                <span className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                Issuing...
              </span>
            ) : 'Issue Credential'}
          </button>
          
          <button 
            type="button"
            onClick={() => router.back()}
            className="flex-1 px-8 py-4 rounded-2xl font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 hover:text-slate-700 transition-all"
          >
            Cancel
          </button>
        </div>

        {mutation.error && (
          <div className="p-5 rounded-2xl bg-rose-50 border-2 border-rose-100 text-rose-600 text-sm font-bold animate-in bounce-in duration-500">
            <div className="flex gap-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {String(mutation.error)}
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
