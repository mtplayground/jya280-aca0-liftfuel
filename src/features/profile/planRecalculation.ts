import type { UserProfile } from '../../api/types';

export type PlanRecalculationEvent = {
  profile: UserProfile;
  triggeredAt: string;
};

type PlanRecalculationListener = (event: PlanRecalculationEvent) => void;

const listeners = new Set<PlanRecalculationListener>();

export function subscribeToPlanRecalculation(
  listener: PlanRecalculationListener
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function triggerPlanRecalculation(profile: UserProfile): void {
  const event: PlanRecalculationEvent = {
    profile,
    triggeredAt: new Date().toISOString()
  };

  for (const listener of listeners) {
    try {
      listener(event);
    } catch (error) {
      console.error('Plan recalculation listener failed', error);
    }
  }
}
