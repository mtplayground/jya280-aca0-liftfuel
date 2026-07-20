export type PerformanceMetric = {
  name: string;
  value: number;
  unit: string;
  notes: string | null;
};

export type ProgressEntryInput = {
  entryDate: string;
  weightKg: number | null;
  bodyFatPercent: number | null;
  bodyFatIsEstimate: boolean;
  performanceMetrics: PerformanceMetric[];
  notes: string | null;
};

export type ProgressEntry = ProgressEntryInput & {
  id: string;
  accountId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type ProgressEntryQuery = {
  fromDate?: string;
  limit: number;
  toDate?: string;
};
