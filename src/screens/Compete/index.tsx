import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Switch,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { colors, spacing, radius } from '@/constants/theme';

type Run = {
  id: string;
  created_at: string;
  rider_score: number | string | null;
  notes: string | null;
};

export function CompeteScreen() {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [runs, setRuns] = useState<Run[]>([]);
  const [showForm, setShowForm] = useState(false);

  const [qualified_ride, set_qualified_ride] = useState(false);
  const [marked_out, set_marked_out] = useState(false);
  const [rider_score, set_rider_score] = useState('');
  const [horse_score, set_horse_score] = useState('');
  const [total_score, set_total_score] = useState('');
  const [horse_name, set_horse_name] = useState('');
  const [rigging_type, set_rigging_type] = useState('');
  const [rigging_position, set_rigging_position] = useState('');
  const [free_arm_discipline, set_free_arm_discipline] = useState('excellent');
  const [body_position, set_body_position] = useState('excellent');
  const [disqualification_reason, set_disqualification_reason] = useState('');
  const [notes, set_notes] = useState('');

  const loadRuns = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('bareback_runs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    setRuns((data as Run[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadRuns();
  }, [loadRuns]);

  const resetForm = () => {
    set_qualified_ride(false);
    set_marked_out(false);
    set_rider_score('');
    set_horse_score('');
    set_total_score('');
    set_horse_name('');
    set_rigging_type('');
    set_rigging_position('');
    set_free_arm_discipline('excellent');
    set_body_position('excellent');
    set_disqualification_reason('');
    set_notes('');
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const payload = {
      user_id: user.id,
      qualified_ride,
      marked_out,
      rider_score: rider_score ? Number(rider_score) : null,
      horse_score: horse_score ? Number(horse_score) : null,
      total_score: total_score ? Number(total_score) : null,
      horse_name: horse_name || null,
      rigging_type: rigging_type || null,
      rigging_position: rigging_position || null,
      free_arm_discipline,
      body_position,
      disqualification_reason: disqualification_reason || null,
      notes: notes || null,
    };
    const { error } = await supabase.from('bareback_runs').insert(payload);
    setSaving(false);
    if (error) {
      Alert.alert('Could not save', error.message);
      return;
    }
    resetForm();
    setShowForm(false);
    loadRuns();
  };

  return (
    <ScrollView style={cs.container} contentContainerStyle={cs.content}>
      <View style={cs.headerRow}>
        <Text style={cs.title}>Practice log</Text>
        <TouchableOpacity style={cs.addBtn} onPress={() => setShowForm((v) => !v)}>
          <Text style={cs.addBtnText}>{showForm ? 'Close' : '+ Log run'}</Text>
        </TouchableOpacity>
      </View>
      <Text style={cs.sub}>
        Hand-timed bareback riding runs stay yours — they are structurally separated from official results and never reach a
        leaderboard.
      </Text>

      {showForm && (
        <View style={cs.form}>
        <View style={cs.toggleRow}>
          <Text style={cs.label}>Qualified ride (8s)</Text>
          <Switch value={qualified_ride} onValueChange={set_qualified_ride} trackColor={{ true: colors.accent }} />
        </View>
        <View style={cs.toggleRow}>
          <Text style={cs.label}>Marked out</Text>
          <Switch value={marked_out} onValueChange={set_marked_out} trackColor={{ true: colors.accent }} />
        </View>
        <View style={cs.field}>
          <Text style={cs.label}>Rider score (0-25)</Text>
          <TextInput
            style={cs.input}
            value={rider_score}
            onChangeText={set_rider_score}
            keyboardType={'number-pad'}
            placeholder="0"
            placeholderTextColor={colors.muted}
          />
        </View>
        <View style={cs.field}>
          <Text style={cs.label}>Horse score (0-25)</Text>
          <TextInput
            style={cs.input}
            value={horse_score}
            onChangeText={set_horse_score}
            keyboardType={'number-pad'}
            placeholder="0"
            placeholderTextColor={colors.muted}
          />
        </View>
        <View style={cs.field}>
          <Text style={cs.label}>Total score</Text>
          <TextInput
            style={cs.input}
            value={total_score}
            onChangeText={set_total_score}
            keyboardType={'number-pad'}
            placeholder="0"
            placeholderTextColor={colors.muted}
          />
        </View>
        <View style={cs.field}>
          <Text style={cs.label}>Horse name</Text>
          <TextInput
            style={cs.input}
            value={horse_name}
            onChangeText={set_horse_name}
            placeholder=""
            placeholderTextColor={colors.muted}
          />
        </View>
        <View style={cs.field}>
          <Text style={cs.label}>Rigging type</Text>
          <TextInput
            style={cs.input}
            value={rigging_type}
            onChangeText={set_rigging_type}
            placeholder=""
            placeholderTextColor={colors.muted}
          />
        </View>
        <View style={cs.field}>
          <Text style={cs.label}>Rigging position</Text>
          <TextInput
            style={cs.input}
            value={rigging_position}
            onChangeText={set_rigging_position}
            placeholder=""
            placeholderTextColor={colors.muted}
          />
        </View>
        <View style={cs.field}>
          <Text style={cs.label}>Free arm discipline</Text>
          <View style={cs.chips}>
            {(['excellent', 'good', 'fair', 'poor'] as const).map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[cs.chip, free_arm_discipline === opt && cs.chipActive]}
                onPress={() => set_free_arm_discipline(opt)}
              >
                <Text style={[cs.chipText, free_arm_discipline === opt && cs.chipTextActive]}>{opt.replace(/_/g, ' ')}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={cs.field}>
          <Text style={cs.label}>Body position</Text>
          <View style={cs.chips}>
            {(['excellent', 'good', 'fair', 'poor'] as const).map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[cs.chip, body_position === opt && cs.chipActive]}
                onPress={() => set_body_position(opt)}
              >
                <Text style={[cs.chipText, body_position === opt && cs.chipTextActive]}>{opt.replace(/_/g, ' ')}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={cs.field}>
          <Text style={cs.label}>DQ reason</Text>
          <TextInput
            style={cs.input}
            value={disqualification_reason}
            onChangeText={set_disqualification_reason}
            placeholder=""
            placeholderTextColor={colors.muted}
          />
        </View>
        <View style={cs.field}>
          <Text style={cs.label}>Notes</Text>
          <TextInput
            style={cs.input}
            value={notes}
            onChangeText={set_notes}
            placeholder=""
            placeholderTextColor={colors.muted}
            multiline
          />
        </View>
          <TouchableOpacity style={[cs.saveBtn, saving && cs.disabled]} onPress={handleSave} disabled={saving}>
            <Text style={cs.saveBtnText}>{saving ? 'Saving…' : 'Save run'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {(() => {
        const _vals = runs
          .map((r: any) => Number(r.total_score))
          .filter((n: number) => !Number.isNaN(n) && n > 0);
        if (!_vals.length) return null;
        const _best = Math.max(..._vals);
        return (
          <View style={cs.pbBanner}>
            <Text style={cs.pbLabel}>Personal best</Text>
            <Text style={cs.pbValue}>{_best}</Text>
          </View>
        );
      })()}

      <TouchableOpacity style={cs.analyzeBtn} onPress={() => router.push('/analyze')}>
        <Text style={cs.analyzeBtnText}>⭐ Analyze a video</Text>
      </TouchableOpacity>

      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 24 }} />
      ) : runs.length === 0 ? (
        <Text style={cs.empty}>Nothing logged yet. Log your first bareback riding run above.</Text>
      ) : (
        runs.map((run) => (
          <View key={run.id} style={cs.runCard}>
            <Text style={cs.runPrimary}>{String(run.rider_score ?? '—')}</Text>
            <Text style={cs.runDate}>{new Date(run.created_at).toLocaleDateString()}</Text>
            {run.notes ? <Text style={cs.runNotes}>{run.notes}</Text> : null}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const cs = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.screenX, gap: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 24, fontWeight: '700', color: colors.text },
  sub: { fontSize: 13, color: colors.muted, lineHeight: 19 },
  addBtn: { backgroundColor: colors.accent, borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 8 },
  addBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  form: { backgroundColor: colors.card, borderRadius: radius.card, padding: spacing.cardPad, gap: 14, borderWidth: 1, borderColor: colors.border },
  field: { gap: 6 },
  label: { fontSize: 14, color: colors.text, fontWeight: '600' },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.control, padding: 12, color: colors.text, fontSize: 15 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 8 },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.muted, fontSize: 13 },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  saveBtn: { backgroundColor: colors.accent, borderRadius: radius.control, padding: 15, alignItems: 'center', marginTop: 4 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  disabled: { opacity: 0.6 },
  analyzeBtn: { borderWidth: 1, borderColor: colors.accent, borderRadius: radius.control, padding: 14, alignItems: 'center' },
  analyzeBtnText: { color: colors.accent, fontSize: 15, fontWeight: '600' },
  pbBanner: { backgroundColor: colors.card, borderRadius: radius.card, padding: spacing.cardPad, borderWidth: 1, borderColor: colors.accent, gap: 2 },
  pbLabel: { fontSize: 11, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.8 },
  pbValue: { fontSize: 28, fontWeight: '800', color: colors.accent },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 24, fontSize: 14 },
  runCard: { backgroundColor: colors.card, borderRadius: radius.card, padding: spacing.cardPad, gap: 4, borderWidth: 1, borderColor: colors.border },
  runPrimary: { fontSize: 18, fontWeight: '700', color: colors.text },
  runDate: { fontSize: 12, color: colors.muted },
  runNotes: { fontSize: 14, color: colors.muted, marginTop: 4 },
});
