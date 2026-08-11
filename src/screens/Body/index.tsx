import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
export function BodyScreen() {
  return (
    <Screen>
      <EmptyState
        title={"Nothing logged"}
        body={"Rides per week, per month, per season, against the injuries that followed. Over a career this is the most valuable dataset you can own about yourself. General information, never medical advice."}
        actionLabel={"Log a ride"}
      />
    </Screen>
  );
}
