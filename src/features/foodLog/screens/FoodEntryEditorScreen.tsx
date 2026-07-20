import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ApiError } from '../../../api/client';
import type {
  FoodEntry,
  FoodEntryInput,
  FoodEntrySource,
  FoodItem,
  MealType
} from '../../../api/types';
import { AppText, Button, Card, Input, Screen, StatRow } from '../../../components/ui';
import type { AppStackParamList } from '../../../navigation/types';
import { colors, radius, spacing } from '../../../theme';
import { createFoodEntry, searchFoods, updateFoodEntry } from '../foodLogService';

type EntryFormState = {
  caloriesKcal: string;
  carbsGrams: string;
  entryId: string;
  fatGrams: string;
  logDate: string;
  mealType: MealType;
  name: string;
  notes: string;
  proteinGrams: string;
  quantityUnit: string;
  quantityValue: string;
  source: FoodEntrySource;
};

const mealTypes: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export function FoodEntryEditorScreen() {
  const navigation = useNavigation<NavigationProp<AppStackParamList>>();
  const [form, setForm] = useState<EntryFormState>(() => createInitialForm());
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoodItem[]>([]);
  const [savedEntry, setSavedEntry] = useState<FoodEntry | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const nutritionPreview = useMemo(() => {
    const calories = readFormNumber(form.caloriesKcal);
    const protein = readFormNumber(form.proteinGrams);
    const carbs = readFormNumber(form.carbsGrams);
    const fat = readFormNumber(form.fatGrams);

    if (calories === null || protein === null || carbs === null || fat === null) {
      return null;
    }

    return {
      calories,
      macroTotal: Math.round(protein * 4 + carbs * 4 + fat * 9)
    };
  }, [form.caloriesKcal, form.carbsGrams, form.fatGrams, form.proteinGrams]);

  const runSearch = async () => {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 2) {
      setError('Search with at least 2 characters.');
      setResults([]);
      return;
    }

    setError(null);
    setSuccess(null);
    setIsSearching(true);

    try {
      const items = await searchFoods(trimmedQuery);
      setResults(items);
      if (items.length === 0) {
        setSuccess('No matching foods found.');
      }
    } catch (searchError) {
      setError(readErrorMessage(searchError, 'Unable to search foods.'));
    } finally {
      setIsSearching(false);
    }
  };

  const selectFood = (item: FoodItem) => {
    setForm((current) => ({
      ...current,
      caloriesKcal: formatNumber(item.caloriesKcal),
      carbsGrams: formatNumber(item.carbsGrams),
      fatGrams: formatNumber(item.fatGrams),
      name: item.name,
      proteinGrams: formatNumber(item.proteinGrams),
      quantityUnit: item.servingUnit,
      quantityValue: formatNumber(item.servingQuantity),
      source: 'manual'
    }));
    setSuccess(`${item.name} loaded for editing.`);
    setError(null);
  };

  const saveEntry = async () => {
    const payload = formToPayload(form);
    if (!payload.ok) {
      setError(payload.message);
      return;
    }

    setError(null);
    setSuccess(null);
    setIsSaving(true);

    try {
      const entryId = form.entryId.trim();
      const entry = entryId
        ? await updateFoodEntry(entryId, payload.input)
        : await createFoodEntry(payload.input);

      setSavedEntry(entry);
      setSuccess(entryId ? 'Entry updated.' : 'Entry saved.');
      if (!entryId) {
        setForm((current) => ({ ...current, entryId: entry.id }));
      }
    } catch (saveError) {
      setError(readErrorMessage(saveError, 'Unable to save food entry.'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Screen contentStyle={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <AppText variant="caption" tone="primary" style={styles.eyebrow}>
            LiftFuel
          </AppText>
          <AppText variant="display">Log meal</AppText>
        </View>

        {error ? <StatusMessage tone="danger" message={error} /> : null}
        {success ? <StatusMessage tone="success" message={success} /> : null}

        <Card style={styles.card}>
          <Button variant="secondary" onPress={() => navigation.navigate('MealPhotoCapture')}>
            Capture meal photo
          </Button>
          <Input
            autoCapitalize="none"
            autoCorrect={false}
            label="Food search"
            onChangeText={(value) => {
              setQuery(value);
              setError(null);
              setSuccess(null);
            }}
            onSubmitEditing={runSearch}
            returnKeyType="search"
            value={query}
          />
          <Button disabled={isSearching} onPress={runSearch}>
            {isSearching ? 'Searching...' : 'Search foods'}
          </Button>

          {results.length > 0 ? (
            <View style={styles.results}>
              {results.map((item) => (
                <FoodResultRow key={item.id} item={item} onPress={() => selectFood(item)} />
              ))}
            </View>
          ) : null}
        </Card>

        <Card style={styles.card}>
          <View style={styles.sectionHeader}>
            <AppText variant="heading">Entry editor</AppText>
            <AppText variant="caption" tone="muted">
              {form.source === 'photo_estimate' ? 'Photo estimate' : 'Manual'}
            </AppText>
          </View>

          <Input
            autoCapitalize="none"
            autoCorrect={false}
            label="Existing entry ID"
            onChangeText={(value) => setField('entryId', value, setForm)}
            value={form.entryId}
          />
          <Input
            label="Meal name"
            onChangeText={(value) => setField('name', value, setForm)}
            value={form.name}
          />
          <View style={styles.row}>
            <Input
              containerStyle={styles.rowField}
              keyboardType="decimal-pad"
              label="Quantity"
              onChangeText={(value) => setField('quantityValue', value, setForm)}
              value={form.quantityValue}
            />
            <Input
              containerStyle={styles.rowField}
              label="Unit"
              onChangeText={(value) => setField('quantityUnit', value, setForm)}
              value={form.quantityUnit}
            />
          </View>

          <View style={styles.segmented}>
            {mealTypes.map((mealType) => (
              <Pressable
                accessibilityRole="button"
                key={mealType}
                onPress={() => setForm((current) => ({ ...current, mealType }))}
                style={[
                  styles.segment,
                  form.mealType === mealType ? styles.segmentActive : undefined
                ]}
              >
                <AppText
                  variant="caption"
                  tone={form.mealType === mealType ? 'inverse' : 'muted'}
                  style={styles.segmentLabel}
                >
                  {formatMealType(mealType)}
                </AppText>
              </Pressable>
            ))}
          </View>

          <View style={styles.row}>
            <Input
              containerStyle={styles.rowField}
              keyboardType="number-pad"
              label="Calories"
              onChangeText={(value) => setField('caloriesKcal', value, setForm)}
              value={form.caloriesKcal}
            />
            <Input
              containerStyle={styles.rowField}
              keyboardType="decimal-pad"
              label="Protein"
              onChangeText={(value) => setField('proteinGrams', value, setForm)}
              value={form.proteinGrams}
            />
          </View>
          <View style={styles.row}>
            <Input
              containerStyle={styles.rowField}
              keyboardType="decimal-pad"
              label="Carbs"
              onChangeText={(value) => setField('carbsGrams', value, setForm)}
              value={form.carbsGrams}
            />
            <Input
              containerStyle={styles.rowField}
              keyboardType="decimal-pad"
              label="Fat"
              onChangeText={(value) => setField('fatGrams', value, setForm)}
              value={form.fatGrams}
            />
          </View>

          <View style={styles.row}>
            <Input
              containerStyle={styles.rowField}
              label="Log date"
              onChangeText={(value) => setField('logDate', value, setForm)}
              value={form.logDate}
            />
            <Input
              containerStyle={styles.rowField}
              label="Source"
              onChangeText={(value) =>
                setForm((current) => ({
                  ...current,
                  source: value === 'photo_estimate' ? 'photo_estimate' : 'manual'
                }))
              }
              value={form.source}
            />
          </View>

          <Input
            label="Notes"
            multiline
            onChangeText={(value) => setField('notes', value, setForm)}
            value={form.notes}
          />

          {nutritionPreview ? (
            <View style={styles.previewPanel}>
              <StatRow label="Calories" value={`${nutritionPreview.calories} kcal`} />
              <StatRow label="Macro calories" value={`${nutritionPreview.macroTotal} kcal`} />
            </View>
          ) : null}

          <Button disabled={isSaving} onPress={saveEntry}>
            {isSaving ? 'Saving...' : form.entryId.trim() ? 'Update entry' : 'Save entry'}
          </Button>
        </Card>

        {savedEntry ? (
          <Card style={styles.card}>
            <AppText variant="heading">Saved entry</AppText>
            <StatRow label="ID" value={savedEntry.id} />
            <StatRow label="Name" value={savedEntry.name} />
            <StatRow label="Meal" value={formatMealType(savedEntry.mealType)} />
          </Card>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function FoodResultRow({ item, onPress }: { item: FoodItem; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.resultRow, pressed ? styles.pressed : undefined]}
    >
      <View style={styles.resultText}>
        <AppText variant="label">{item.name}</AppText>
        <AppText variant="caption" tone="muted">
          {formatNumber(item.servingQuantity)} {item.servingUnit}
        </AppText>
      </View>
      <AppText variant="metricSmall">{Math.round(item.caloriesKcal)}</AppText>
    </Pressable>
  );
}

function StatusMessage({
  message,
  tone
}: {
  message: string;
  tone: 'danger' | 'success';
}) {
  return (
    <View
      accessibilityRole="alert"
      style={[styles.status, tone === 'danger' ? styles.statusDanger : styles.statusSuccess]}
    >
      <AppText variant="caption" tone={tone}>
        {message}
      </AppText>
    </View>
  );
}

function createInitialForm(): EntryFormState {
  return {
    caloriesKcal: '',
    carbsGrams: '',
    entryId: '',
    fatGrams: '',
    logDate: new Date().toISOString().slice(0, 10),
    mealType: 'lunch',
    name: '',
    notes: '',
    proteinGrams: '',
    quantityUnit: 'serving',
    quantityValue: '1',
    source: 'manual'
  };
}

function setField(
  field: keyof EntryFormState,
  value: string,
  setForm: Dispatch<SetStateAction<EntryFormState>>
) {
  setForm((current) => ({ ...current, [field]: value }));
}

function formToPayload(
  form: EntryFormState
): { ok: true; input: FoodEntryInput } | { ok: false; message: string } {
  const name = form.name.trim();
  const quantityUnit = form.quantityUnit.trim();
  const caloriesKcal = readRequiredNumber(form.caloriesKcal);
  const proteinGrams = readRequiredNumber(form.proteinGrams);
  const carbsGrams = readRequiredNumber(form.carbsGrams);
  const fatGrams = readRequiredNumber(form.fatGrams);
  const quantityValue = readRequiredNumber(form.quantityValue);

  if (!name) return { ok: false, message: 'Meal name is required.' };
  if (!quantityUnit) return { ok: false, message: 'Quantity unit is required.' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.logDate)) {
    return { ok: false, message: 'Log date must use YYYY-MM-DD.' };
  }
  if (
    caloriesKcal === null ||
    proteinGrams === null ||
    carbsGrams === null ||
    fatGrams === null ||
    quantityValue === null
  ) {
    return { ok: false, message: 'Calories, macros, and quantity must be numbers.' };
  }
  if (quantityValue <= 0) return { ok: false, message: 'Quantity must be greater than zero.' };

  return {
    input: {
      caloriesKcal,
      carbsGrams,
      consumedAt: new Date().toISOString(),
      fatGrams,
      logDate: form.logDate,
      mealType: form.mealType,
      name,
      notes: form.notes.trim() || null,
      proteinGrams,
      quantityUnit,
      quantityValue,
      source: form.source
    },
    ok: true
  };
}

function readRequiredNumber(value: string): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function readFormNumber(value: string): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(1)));
}

function formatMealType(mealType: MealType): string {
  return mealType.replace(/^\w/, (character) => character.toUpperCase());
}

function readErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return fallback;
}

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: spacing.lg
  },
  content: {
    gap: spacing.lg,
    paddingBottom: spacing['2xl']
  },
  header: {
    gap: spacing.sm,
    paddingTop: spacing.md
  },
  eyebrow: {
    textTransform: 'uppercase'
  },
  card: {
    gap: spacing.lg
  },
  sectionHeader: {
    gap: spacing.xs
  },
  results: {
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden'
  },
  resultRow: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
    minHeight: 64,
    padding: spacing.md
  },
  resultText: {
    flex: 1,
    gap: spacing.xs
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md
  },
  rowField: {
    flex: 1
  },
  segmented: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    padding: spacing.xs
  },
  segment: {
    alignItems: 'center',
    borderRadius: radius.md,
    flex: 1,
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm
  },
  segmentActive: {
    backgroundColor: colors.primary
  },
  segmentLabel: {
    textAlign: 'center'
  },
  previewPanel: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md
  },
  status: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md
  },
  statusDanger: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.danger
  },
  statusSuccess: {
    backgroundColor: colors.successSoft,
    borderColor: colors.success
  },
  pressed: {
    opacity: 0.72
  }
});
