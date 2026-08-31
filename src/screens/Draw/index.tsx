// src/screens/Draw/index.tsx
//
// What you drew.
//
// This is the single most-wanted piece of information in the sport, and until
// migration 0034 the app could not show it: `stock_draws` was readable only by
// org members, and a contestant is not a member of the producer's
// organisation. The push notification saying "the draw is up" pointed at a row
// the recipient could not open.

import { useQuery } from '@tanstack/react-query';
import { Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { QueryBoundary } from '@/components/ui/QueryBoundary';
import { Screen } from '@/components/ui/Screen';
import { Stat } from '@/components/ui/Stat';
import { colors } from '@/constants/theme';
import { useSession } from '@/lib/auth';
import { getMyProfile, listMyDraws, type MyDraw } from '@/lib/queries';

/**
 * Pull whatever the contractor keeps on this animal into something readable.
 *
 * `career_stats` is a free-form jsonb bag the producer fills in, so nothing
 * here assumes a shape — an unknown key is skipped rather than rendered as
 * "[object Object]", and a missing bag is simply no card.
 */
function statLines(stats: Record<string, unknown> | null): { label: string; value: string }[] {
  if (!stats) return [];
  const interesting: [string, string][] = [
    ['times_out', 'Times out'],
    ['average_score', 'Average mark'],
    ['high_score', 'Best mark'],
    ['ridden_percentage', 'Ridden %'],
  ];
  const out: { label: string; value: string }[] = [];
  for (const [key, label] of interesting) {
    const value = stats[key];
    if (typeof value === 'number' || typeof value === 'string') {
      out.push({ label, value: String(value) });
    }
  }
  return out;
}

function DrawCard({ draw }: { draw: MyDraw }) {
  const animal = draw.animals;
  const stats = statLines(animal?.career_stats ?? null);

  return (
    <Card
      title={animal?.name ?? 'Stock not named'}
      subtitle={
        animal?.brand_number ? `Brand ${animal.brand_number}` : 'The producer has not posted a brand number.'
      }
    >
      <View style={{ flexDirection: 'row', gap: 24, flexWrap: 'wrap' }}>
        {draw.entries?.draw_position ? (
          <Stat label="Draw" value={String(draw.entries.draw_position)} />
        ) : null}
        {draw.performance ? <Stat label="Perf" value={String(draw.performance)} /> : null}
        {draw.go_round ? <Stat label="Round" value={String(draw.go_round)} /> : null}
      </View>

      {stats.length > 0 ? (
        <View style={{ flexDirection: 'row', gap: 24, flexWrap: 'wrap' }}>
          {stats.map((s) => (
            <Stat key={s.label} label={s.label} value={s.value} />
          ))}
        </View>
      ) : null}

      {draw.is_redraw ? (
        <Text style={{ color: colors.warning, fontSize: 13, lineHeight: 19 }}>
          Re-draw{draw.redraw_reason ? ` — ${draw.redraw_reason}` : ''}. This replaces what you
          were on before.
        </Text>
      ) : null}
    </Card>
  );
}

export function DrawScreen() {
  const { user } = useSession();

  const profileQuery = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => getMyProfile(user!.id),
    enabled: Boolean(user?.id),
  });
  const profileId = profileQuery.data?.id;

  const drawQuery = useQuery({
    queryKey: ['draws', profileId],
    queryFn: () => listMyDraws(profileId!),
    enabled: Boolean(profileId),
    // The draw drops at a moment nobody controls, and this is the screen people
    // will sit on refreshing. Half a minute is a fair trade against the number
    // of handsets in an arena on one hotspot.
    refetchInterval: 30_000,
  });

  return (
    <Screen>
      <View style={{ gap: 6 }}>
        <Text style={{ color: colors.text, fontSize: 26, fontWeight: '700' }}>Your draw</Text>
        <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 21 }}>
          What you are on, as soon as the secretary posts it. This page refreshes itself.
        </Text>
      </View>

      <QueryBoundary
        isLoading={profileQuery.isLoading || drawQuery.isLoading}
        error={profileQuery.error ?? drawQuery.error}
        data={drawQuery.data}
        onRetry={() => drawQuery.refetch()}
        empty={
          <EmptyState
            title="Nothing drawn yet"
            body="Once you are entered and the producer has run the draw, what you are on shows up here — with whatever record the contractor keeps on it."
          />
        }
      >
        {(draws) => (
          <View style={{ gap: 12 }}>
            {draws.map((draw) => (
              <DrawCard key={draw.id} draw={draw} />
            ))}
          </View>
        )}
      </QueryBoundary>
    </Screen>
  );
}
