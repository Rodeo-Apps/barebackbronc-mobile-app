// src/screens/Body/index.tsx
//
// The load your riding arm is taking.
//
// Bareback is the hardest event in rodeo on a body, and the rigging arm takes
// nearly all of it. Two of this event's fault codes already exist for that
// reason rather than for score — `ELBOW_LOAD_HIGH` and `NECK_POSITION_RISK` do
// not cost a rider a point, and they are the two most worth knowing about.
//
// So this screen does not invent a health record. It reads the analyses the
// rider has already run and pulls out the injury-risk half, which is data the
// app genuinely has, and it is honest that this is a pattern in your own
// riding rather than a medical opinion.

import { useQuery } from '@tanstack/react-query';
import { Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { QueryBoundary } from '@/components/ui/QueryBoundary';
import { Screen } from '@/components/ui/Screen';
import { Stat } from '@/components/ui/Stat';
import { colors } from '@/constants/theme';
import { listMyAnalyses } from '@/lib/analysis';
import { useSession } from '@/lib/auth';
import { event as eventTaxonomy } from '@/lib/pose';
import { getMyProfile } from '@/lib/queries';

/**
 * Codes that are about the rider's body rather than their score.
 *
 * Listed explicitly rather than inferred, because "which faults are injury
 * risks" is a judgement about this event that belongs somewhere a human can
 * read it, not in a heuristic over label text.
 */
const RISK_CODES = new Set(['ELBOW_LOAD_HIGH', 'NECK_POSITION_RISK']);

function labelFor(code: string): string {
  return eventTaxonomy.TAXONOMY.definitions.find((d) => d.code === code)?.label ?? code;
}

export function BodyScreen() {
  const { user } = useSession();

  const profileQuery = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => getMyProfile(user!.id),
    enabled: Boolean(user?.id),
  });
  const profileId = profileQuery.data?.id;

  const analysesQuery = useQuery({
    queryKey: ['analyses', profileId],
    queryFn: () => listMyAnalyses(profileId!),
    enabled: Boolean(profileId),
  });

  const completed = (analysesQuery.data ?? []).filter((a) => a.status === 'completed');

  // How often each risk code has come up, and across how many rides. One
  // flagged ride is a ride; the same flag on half of them is a pattern.
  const counts = new Map<string, number>();
  for (const analysis of completed) {
    for (const code of analysis.fault_codes) {
      if (RISK_CODES.has(code)) counts.set(code, (counts.get(code) ?? 0) + 1);
    }
  }
  const flagged = [...counts.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <Screen>
      <View style={{ gap: 6 }}>
        <Text style={{ color: colors.text, fontSize: 26, fontWeight: '700' }}>Body</Text>
        <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 21 }}>
          The two things the analyser watches that have nothing to do with your score.
        </Text>
      </View>

      <QueryBoundary
        isLoading={profileQuery.isLoading || analysesQuery.isLoading}
        error={profileQuery.error ?? analysesQuery.error}
        data={completed}
        onRetry={() => analysesQuery.refetch()}
        empty={
          <EmptyState
            title="Nothing to go on yet"
            body="Analyse a few rides and this fills in. It tracks how often your rigging arm and neck position get flagged across rides, which is a pattern you cannot feel one ride at a time."
          />
        }
      >
        {(analyses) => (
          <View style={{ gap: 16 }}>
            <Card title="Across your rides">
              <View style={{ flexDirection: 'row', gap: 24, flexWrap: 'wrap' }}>
                <Stat label="Rides analysed" value={String(analyses.length)} />
                <Stat
                  label="Flagged"
                  value={String(flagged.reduce((n, [, c]) => n + c, 0))}
                  hint="Body, not score"
                />
              </View>
            </Card>

            {flagged.length === 0 ? (
              <Card
                title="Nothing flagged"
                subtitle="Neither the rigging arm nor neck position has come up outside your usual range in the rides you have analysed. That is the answer you want."
              />
            ) : (
              flagged.map(([code, n]) => {
                const share = Math.round((n / analyses.length) * 100);
                return (
                  <Card
                    key={code}
                    title={labelFor(code)}
                    subtitle={`Flagged on ${n} of ${analyses.length} rides (${share}%).`}
                  >
                    <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 19 }}>
                      {share >= 50
                        ? 'That is often enough to be how you ride rather than how one horse went. Worth raising with a sports-medicine practitioner who knows the event.'
                        : 'Worth watching. One or two rides is a horse; a run of them is a habit.'}
                    </Text>
                  </Card>
                );
              })
            )}

            <Card
              title="What this is not"
              subtitle={
                'This is a pattern in video of your own riding, measured against your own baseline. It is not a diagnosis, it does not know your history, and it cannot see anything that happened off the horse. ' +
                'Justin Sportsmedicine is at every PRCA rodeo and is the right first call for anything that hurts.'
              }
            />
          </View>
        )}
      </QueryBoundary>
    </Screen>
  );
}
