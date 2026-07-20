import { useState } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';

import { ApiError } from '../../../api/client';
import type { MealPhotoEstimate } from '../../../api/types';
import { AppText, Button, Card, Input, Screen, StatRow } from '../../../components/ui';
import { colors, spacing } from '../../../theme';
import {
  captureMealPhoto,
  type CapturedMealPhoto,
  estimateMealPhoto,
  type MealPhotoSource,
  uploadMealPhoto
} from '../photoCaptureService';

type EstimateFormState = {
  caloriesKcal: string;
  carbsGrams: string;
  fatGrams: string;
  name: string;
  proteinGrams: string;
  quantityDescription: string;
};

export function MealPhotoCaptureScreen() {
  const [entryId, setEntryId] = useState('');
  const [photo, setPhoto] = useState<CapturedMealPhoto | null>(null);
  const [estimate, setEstimate] = useState<MealPhotoEstimate | null>(null);
  const [estimateForm, setEstimateForm] = useState<EstimateFormState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isEstimating, setIsEstimating] = useState(false);
  const [isPicking, setIsPicking] = useState<MealPhotoSource | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const pickPhoto = async (source: MealPhotoSource) => {
    setError(null);
    setSuccess(null);
    setIsPicking(source);

    try {
      const selectedPhoto = await captureMealPhoto(source);
      if (selectedPhoto) {
        setPhoto(selectedPhoto);
        setEstimate(null);
        setEstimateForm(null);
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
      setEstimateForm(estimateToForm(response.estimate));
      setSuccess('Estimate ready. Review and correct the fields before saving.');
    } catch (estimateError) {
      setError(readErrorMessage(estimateError, 'Unable to estimate the meal photo.'));
    } finally {
      setIsEstimating(false);
    }
  };

  const submitPhoto = async () => {
    if (!photo) {
      setError('Capture or choose a meal photo first.');
      return;
    }

    const trimmedEntryId = entryId.trim();
    if (!trimmedEntryId) {
      setError('Enter the linked food entry ID before uploading.');
      return;
    }

    setError(null);
    setSuccess(null);
    setIsUploading(true);

    try {
      const response = await uploadMealPhoto(trimmedEntryId, photo);
      setSuccess(`Photo linked to ${response.entry.name}.`);
    } catch (uploadError) {
      setError(readErrorMessage(uploadError, 'Unable to upload the meal photo.'));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Screen contentStyle={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <AppText variant="caption" tone="primary" style={styles.eyebrow}>
            LiftFuel
          </AppText>
          <AppText variant="display">Log meal photo</AppText>
          <AppText variant="body" tone="muted">
            Capture a meal in the moment or choose an existing image, then attach it to a saved food entry.
          </AppText>
        </View>

        {error ? <StatusMessage tone="danger" message={error} /> : null}
        {success ? <StatusMessage tone="success" message={success} /> : null}

        <Card style={styles.card}>
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
              variant="secondary"
              onPress={() => pickPhoto('library')}
              style={styles.action}
            >
              {isPicking === 'library' ? 'Opening...' : 'Photo library'}
            </Button>
          </View>

          {photo ? (
            <View style={styles.previewGroup}>
              <Image source={{ uri: photo.uri }} style={styles.preview} />
              <StatRow label="Image" value={`${photo.width} x ${photo.height}`} />
              <StatRow label="Type" value={photo.mimeType} />
              <Button disabled={isEstimating} onPress={estimatePhoto}>
                {isEstimating ? 'Estimating...' : 'Estimate calories and macros'}
              </Button>
            </View>
          ) : (
            <View style={styles.emptyPreview}>
              <AppText variant="label">No photo selected</AppText>
              <AppText variant="caption" tone="muted">
                Camera and library permissions are requested only when you choose a source.
              </AppText>
            </View>
          )}
        </Card>

        {estimate && estimateForm ? (
          <Card style={styles.card}>
            <View style={styles.sectionHeader}>
              <AppText variant="heading">Correct estimate</AppText>
              <AppText variant="caption" tone="warning">
                {estimate.confidence.toUpperCase()} CONFIDENCE
              </AppText>
            </View>
            <Input
              label="Meal name"
              onChangeText={(value) =>
                setEstimateForm((current) => current ? { ...current, name: value } : current)
              }
              value={estimateForm.name}
            />
            <Input
              label="Quantity"
              onChangeText={(value) =>
                setEstimateForm((current) =>
                  current ? { ...current, quantityDescription: value } : current
                )
              }
              value={estimateForm.quantityDescription}
            />
            <View style={styles.macroGrid}>
              <Input
                keyboardType="decimal-pad"
                label="Calories"
                onChangeText={(value) =>
                  setEstimateForm((current) =>
                    current ? { ...current, caloriesKcal: value } : current
                  )
                }
                value={estimateForm.caloriesKcal}
              />
              <Input
                keyboardType="decimal-pad"
                label="Protein"
                helperText="Grams"
                onChangeText={(value) =>
                  setEstimateForm((current) =>
                    current ? { ...current, proteinGrams: value } : current
                  )
                }
                value={estimateForm.proteinGrams}
              />
              <Input
                keyboardType="decimal-pad"
                label="Carbs"
                helperText="Grams"
                onChangeText={(value) =>
                  setEstimateForm((current) =>
                    current ? { ...current, carbsGrams: value } : current
                  )
                }
                value={estimateForm.carbsGrams}
              />
              <Input
                keyboardType="decimal-pad"
                label="Fat"
                helperText="Grams"
                onChangeText={(value) =>
                  setEstimateForm((current) =>
                    current ? { ...current, fatGrams: value } : current
                  )
                }
                value={estimateForm.fatGrams}
              />
            </View>
            <View style={styles.promptList}>
              {estimate.correctionPrompts.map((prompt) => (
                <AppText key={prompt} variant="caption" tone="muted">
                  {prompt}
                </AppText>
              ))}
            </View>
          </Card>
        ) : null}

        <Card style={styles.card}>
          <Input
            autoCapitalize="none"
            autoCorrect={false}
            label="Linked food entry ID"
            helperText="Meal creation screens will pass this automatically once food entry editing lands."
            onChangeText={(value) => {
              setEntryId(value);
              setError(null);
              setSuccess(null);
            }}
            value={entryId}
          />
          <Button disabled={isUploading} onPress={submitPhoto}>
            {isUploading ? 'Uploading...' : 'Upload and link photo'}
          </Button>
        </Card>
      </ScrollView>
    </Screen>
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

function readErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return fallback;
}

function estimateToForm(estimate: MealPhotoEstimate): EstimateFormState {
  return {
    caloriesKcal: String(estimate.caloriesKcal),
    carbsGrams: String(estimate.carbsGrams),
    fatGrams: String(estimate.fatGrams),
    name: estimate.name,
    proteinGrams: String(estimate.proteinGrams),
    quantityDescription: estimate.quantityDescription
  };
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
  sectionHeader: {
    gap: spacing.xs
  },
  macroGrid: {
    gap: spacing.md
  },
  promptList: {
    backgroundColor: colors.warningSoft,
    borderColor: colors.warning,
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md
  },
  preview: {
    aspectRatio: 4 / 3,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 8,
    width: '100%'
  },
  emptyPreview: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg
  },
  status: {
    borderRadius: 8,
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
  }
});
