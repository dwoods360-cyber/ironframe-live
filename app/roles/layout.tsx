import React from 'react';

export default function RolesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // --- BUILD BYPASS ---
  if (process.env.NEXT_BUILD_PHASE === 'true') {
    return <div>Build phase bypass</div>;
  }
  // --------------------

  return <>{children}</>;
}
