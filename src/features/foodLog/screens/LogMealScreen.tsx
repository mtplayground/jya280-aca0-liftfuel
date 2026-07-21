import { useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { readAppErrorMessage } from '../../../api/errorMessages';
import type {
  FoodEntry,
  FoodEntryInput,
  FoodEntrySource,
  FoodItem,
  MealPhotoEstimate,
  MealType
} from '../../../api/types';
import { AppText, Button, Card, Input, Screen, StatRow } from '../../../components/ui';
import { colors, radius, spacing } from '../../../theme';
import { createFoodEntry, searchFoods, updateFoodEntry } from '../foodLogService';
import {
  captureMealPhoto,
  type CapturedMealPhoto,
  estimateMealPhoto,
  type MealPhotoSource,
  uploadMealPhoto
} from '../photoCaptureService';

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

export function LogMealScreen() {
  const [form, setForm] = useState<EntryFormState>(() => createInitialForm());
  const [photo, setPhoto] = useState<CapturedMealPhoto | null>(null);
  const [estimate, setEstimate] = useState<MealPhotoEstimate | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoodItem[]>([]);
  const [savedEntry, setSavedEntry] = useState<FoodEntry | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPicking, setIsPicking] = useState<MealPhotoSource | null>(null);
  const [isEstimating, setIsEstimating] = useState(false);
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

  const pickPhoto = async (source: MealPhotoSource) => {
    setError(null);
    setSuccess(null);
    setIsPicking(source);

    try {
      const selectedPhoto = await captureMealPhoto(source);
      if (selectedPhoto) {
        setPhoto(selectedPhoto);
        setEstimate(null);
        setSavedEntry(null);
        setForm((current) => ({
          ...createInitialForm(),
          mealType: current.mealType
        }));
      }
    } catch (pickError) {
      setError(readErrorMessage(pickError, 'Unable to select a meal photo.'));
    } finally {
      setIsPicking(null);
    }
  };

  const estimatePhoto = async () => {
    if (!photo) {
      setError('Capture or choose a meal photo first.');
      return;
    }

    setError(null);
    setSuccess(null);
    setIsEstimating(true);

    try {
      const response = await estimateMealPhoto(photo);
      setEstimate(response.estimate);
      setForm((current) => estimateToForm(response.estimate, current));
      setIsEditorOpen(false);
      setSuccess('Estimate ready.');
    } catch (estimateError) {
      setIsEditorOpen(true);
      setForm((current) => ({ ...current, source: 'manual' }));
      setError(readErrorMessage(estimateError, 'Unable to estimate the meal photo.'));
    } finally {
      setIsEstimating(false);
    }
  };

  const runSearch = async () => {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 2) {
      setError('Search with at least 2 characters.');
      setHasSearched(false);
      setResults([]);
      return;
    }

    setError(null);
    setSuccess(null);
    setIsSearching(true);

    try {
      const items = await searchFoods(trimmedQuery);
      setHasSearched(true);
      setResults(items);
      if (items.length === 0) {
        setSuccess('No matching foods found.');
      }
    } catch (searchError) {
      setHasSearched(false);
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
    setEstimate(null);
    setHasSearched(false);
    setIsEditorOpen(true);
    setSuccess(`${item.name} loaded.`);
    setError(null);
  };

  const openManualEditor = () => {
    setIsEditorOpen(true);
    setForm((current) => ({
      ...current,
      source: current.source === 'photo_estimate' ? current.source : 'manual'
    }));
    setError(null);
    setSuccess(null);
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

      if (photo && !entry.photoObjectKey) {
        try {
          const uploadResponse = await uploadMealPhoto(entry.id, photo);
          setSavedEntry(uploadResponse.entry);
        } catch (uploadError) {
          setSavedEntry(entry);
          setForm((current) => ({ ...current, entryId: entry.id }));
          setError(readErrorMessage(uploadError, 'Photo upload failed.'));
          setSuccess('Entry saved without the photo.');
          return;
        }
      } else {
        setSavedEntry(entry);
      }

      setSuccess(entryId ? 'Entry updated.' : 'Entry saved.');
      setForm((current) => ({ ...current, entryId: entry.id }));
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
          <View style={styles.sectionHeader}>
            <AppText variant="heading">Photo estimate</AppText>
            <AppText variant="caption" tone={estimate ? 'success' : 'muted'}>
              {estimate ? `${estimate.confidence.toUpperCase()} CONFIDENCE` : 'Default'}
            </AppText>
          </View>

          <View style={styles.actions}>
            <Button
              disabled={Boolean(isPicking)}
              onPress={() => pickPhoto('camera')}
              style={styles.action}
            >
              {isPicking === 'camera' ? 'Opening...' : 'Use camera'}
            </Button>
            <Button
              disabled={Boolean(isPicking)}
              onPress={() => pickPhoto('library')}
              style={styles.action}
              variant="secondary"
            >
              {isPicking === 'library' ? 'Opening...' : 'Photo library'}
            </Button>
          </View>

          {photo ? (
            <View style={styles.previewGroup}>
              <Image source={{ uri: photo.uri }} style={styles.preview} />
              <StatRow label="Image" value={`${photo.width} x ${photo.height}`} />
              <Button disabled={isEstimating} onPress={estimatePhoto}>
                {isEstimating ? 'Estimating...' : estimate ? 'Re-estimate meal' : 'Estimate meal'}
              </Button>
            </View>
          ) : (
            <View style={styles.emptyPreview}>
              <AppText variant="label">No photo selected</AppText>
            </View>
          )}

          {estimate ? (
            <View style={styles.estimatePanel}>
              <StatRow label="Meal" value={form.name || estimate.name} />
              <StatRow label="Calories" value={`${form.caloriesKcal || estimate.caloriesKcal} kcal`} />
              <StatRow
                label="Macros"
                value={`${form.proteinGrams || estimate.proteinGrams}p / ${form.carbsGrams || estimate.carbsGrams}c / ${form.fatGrams || estimate.fatGrams}f`}
              />
              <View style={styles.actions}>
                <Button onPress={saveEntry} disabled={isSaving} style={styles.action}>
                  {isSaving ? 'Saving...' : 'Save estimate'}
                </Button>
                <Button onPress={() => setIsEditorOpen(true)} style={styles.action} variant="secondary">
                  Edit values
                </Button>
              </View>
            </View>
          ) : null}
        </Card>

        <Card style={styles.card}>
          <View style={styles.sectionHeader}>
            <AppText variant="heading">Manual correction</AppText>
            <Button variant="ghost" onPress={openManualEditor}>
              {isEditorOpen ? 'Editing' : 'Edit manually'}
            </Button>
          </View>

          {isEditorOpen ? (
            <>
              <Input
                autoCapitalize="none"
                autoCorrect={false}
                label="Food search"
                onChangeText={(value) => {
                  setQuery(value);
                  setHasSearched(false);
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
              ) : hasSearched && query.trim().length >= 2 && !isSearching ? (
                <View style={styles.emptyPreview}>
                  <AppText variant="label">No foods found</AppText>
                  <AppText variant="caption" tone="muted">
                    Adjust the search or enter the meal values below.
                  </AppText>
                </View>
              ) : null}

              <EntryEditor
                form={form}
                nutritionPreview={nutritionPreview}
                setForm={setForm}
              />

              <Button disabled={isSaving} onPress={saveEntry}>
                {isSaving ? 'Saving...' : form.entryId.trim() ? 'Update entry' : 'Save entry'}
              </Button>
            </>
          ) : (
            <View style={styles.emptyPreview}>
              <AppText variant="label">
                {estimate ? 'Estimate ready for review' : 'Search or adjust values'}
              </AppText>
            </View>
          )}
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

function EntryEditor({
  form,
  nutritionPreview,
  setForm
}: {
  form: EntryFormState;
  nutritionPreview: { calories: number; macroTotal: number } | null;
  setForm: Dispatch<SetStateAction<EntryFormState>>;
}) {
  return (
    <>
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
    </>
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

function estimateToForm(estimate: MealPhotoEstimate, current: EntryFormState): EntryFormState {
  const quantity = parseQuantityDescription(estimate.quantityDescription);

  return {
    ...current,
    caloriesKcal: formatNumber(estimate.caloriesKcal),
    carbsGrams: formatNumber(estimate.carbsGrams),
    fatGrams: formatNumber(estimate.fatGrams),
    name: estimate.name,
    proteinGrams: formatNumber(estimate.proteinGrams),
    quantityUnit: quantity.unit,
    quantityValue: formatNumber(quantity.value),
    source: 'photo_estimate'
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

function parseQuantityDescription(value: string): { unit: string; value: number } {
  const trimmed = value.trim();
  const match = /^(\d+(?:\.\d+)?)\s*(.*)$/.exec(trimmed);
  if (!match) {
    return {
      unit: trimmed.slice(0, 40) || 'serving',
      value: 1
    };
  }

  const quantityValue = Number(match[1]);
  return {
    unit: match[2]?.trim().slice(0, 40) || 'serving',
    value: Number.isFinite(quantityValue) && quantityValue > 0 ? quantityValue : 1
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
  return readAppErrorMessage(error, fallback);
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
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between'
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md
  },
  action: {
    flex: 1
  },
  previewGroup: {
    gap: spacing.md
  },
  preview: {
    aspectRatio: 4 / 3,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.lg,
    width: '100%'
  },
  estimatePanel: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md
  },
  emptyPreview: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg
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
    justifyContent: 'center',
    minHeight: 38,
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
    backgroundColor: colors.surfaceMuted,
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
