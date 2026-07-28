export const bootState: {
  status: 'BOOTING' | 'STARTING' | 'HEALTHY' | 'DEGRADED';
  error: string | null;
  details: Record<string, unknown>;
} = {
  status: 'BOOTING',
  error: null,
  details: {},
};
