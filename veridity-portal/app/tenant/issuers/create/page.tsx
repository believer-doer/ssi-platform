"use client";
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useSessionContext } from '@/lib/hooks/useSessionContext';

const schema = z.object({
  name: z.string().min(2, "Name is required (min 2 chars)"),
  didMethod: z.string().min(2, "DID Method is required (min 2 chars)"),
});

type FormData = z.infer<typeof schema>;

export default function CreateIssuerPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { jwt, tenantId } = useSessionContext();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      didMethod: 'did:key', // Default to did:key
    }
  });

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      apiFetch('/{driver}/issuers', 'post', {
        driver: 'internal',
        tenantId: tenantId ?? 'tenant-001', // Fallback for dev
        jwt: jwt,
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issuers'] });
      router.push('/tenant/issuers');
    },
  });

  return (
    <div className="max-w-xl mx-auto space-y-8 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-2">
        <h3 className="text-3xl font-bold tracking-tight text-slate-900">Create New Issuer</h3>
        <p className="text-slate-500">Onboard a new verifiable credential issuer to your tenant.</p>
      </div>

      <form 
        className="bg-white/70 backdrop-blur-xl p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-white/40 space-y-6" 
        onSubmit={handleSubmit((data) => mutation.mutate(data))}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Issuer Name</label>
            <input 
              {...register('name')} 
              className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400"
              placeholder="e.g. Acme Corp Issuer"
            />
            {errors.name && <div className="text-rose-500 text-xs mt-1 font-medium ml-1">{errors.name.message}</div>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">DID Method</label>
            <input 
              {...register('didMethod')} 
              className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400"
              placeholder="e.g. did:key, did:web"
            />
            {errors.didMethod && <div className="text-rose-500 text-xs mt-1 font-medium ml-1">{errors.didMethod.message}</div>}
          </div>
        </div>

        <div className="pt-4 flex items-center gap-3">
          <button 
            type="submit" 
            className="flex-1 btn-primary py-3.5 rounded-2xl font-bold text-white shadow-lg shadow-brand-500/25 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processing...
              </span>
            ) : 'Create Issuer'}
          </button>
          
          <button 
            type="button"
            onClick={() => router.back()}
            className="px-6 py-3.5 rounded-2xl font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            Cancel
          </button>
        </div>

        {mutation.error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-sm font-medium animate-in zoom-in-95 duration-200">
            {String(mutation.error)}
          </div>
        )}
      </form>
    </div>
  );
}
