import React from 'react';

export function JsonInspector({ data }: { data: unknown }) {
  return (
    <pre className="bg-gray-100 rounded p-4 overflow-x-auto text-xs">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}
