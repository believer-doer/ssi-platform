"use client";

import { useEffect, useState } from 'react';

type SessionContext = {
  authenticated?: boolean;
  jwt?: string;
  tenantId?: string | null;
  roles?: string[];
};

export function useSessionContext() {
  const [context, setContext] = useState<SessionContext>({ roles: [] });

  useEffect(() => {
    let ignore = false;

    fetch('/api/session', { credentials: 'include', cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) throw new Error('Unable to load session');
        return res.json();
      })
      .then((data) => {
        if (!ignore) {
          setContext({
            authenticated: Boolean(data?.authenticated),
            jwt: undefined,
            tenantId: data?.tenantId ?? null,
            roles: Array.isArray(data?.roles) ? data.roles : [],
          });
        }
      })
      .catch(() => {
        if (!ignore) {
          setContext({ authenticated: false, jwt: undefined, tenantId: null, roles: [] });
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  return context;
}
