export type Company = {
  id: string;
  name: string;
  industry?: string;
  tier?: string;
  created_at?: string;
};

export type Risk = {
  id: string;
  title: string;
  description?: string;
  severity?: 'LOW' | 'MED' | 'HIGH' | 'CRITICAL' | string;
  status?: string;
  owner?: string;
  created_at?: string;
};
