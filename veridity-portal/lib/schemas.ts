import { z } from 'zod';

export const tenantSchema = z.object({
  id: z.string(),
  name: z.string(),
  driver: z.string(),
});

export type Tenant = z.infer<typeof tenantSchema>;
