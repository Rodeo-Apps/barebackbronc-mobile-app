import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
export function DrawScreen() {
  return (
    <Screen>
      <EmptyState
        title={"No draw yet"}
        body={"When you draw a horse, everything recorded on that animal shows up here — buck pattern, jump frequency, how the trips before yours went."}
      />
    </Screen>
  );
}
