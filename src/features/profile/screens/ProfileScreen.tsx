import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { readAppErrorMessage } from '../../../api/errorMessages';
import type {
  ActivityLevel,
  Goal,
  ProfileInput,
  Sex,
  TrainingSplit,
  UserProfile
} from '../../../api/types';
import { AppText, Button, Card, Input, Screen, StatRow } from '../../../components/ui';
import { colors, radius, spacing } from '../../../theme';
import { triggerPlanRecalculation } from '../planRecalculation';
import { getProfile, saveProfile } from '../profileService';

type ProfileFormState = {
  activityLevel: ActivityLevel;
  ageYears: string;
  bodyFatPercent: string;
  goal: Goal;
  heightCm: string;
  sex: Sex;
  trainingDaysPerWeek: string;
  trainingSplit: TrainingSplit;
  weightKg: string;
};

type SelectOption<TValue extends string> = {
  label: string;
  value: TValue;
};

const sexOptions: SelectOption<Sex>[] = [
  { label: 'Female', value: 'female' },
  { label: 'Male', value: 'male' },
  { label: 'Non-binary', value: 'non_binary' },
  { label: 'Prefer not to say', value: 'prefer_not_to_say' }
];

const activityOptions: SelectOption<ActivityLevel>[] = [
  { label: 'Mostly seated', value: 'sedentary' },
  { label: 'Lightly active', value: 'light' },
  { label: 'Moderate', value: 'moderate' },
  { label: 'Active', value: 'active' },
  { label: 'Very active', value: 'very_active' }
];

const goalOptions: SelectOption<Goal>[] = [
  { label: 'Cut', value: 'cut' },
  { label: 'Maintain', value: 'maintain' },
  { label: 'Bulk', value: 'bulk' }
];

const trainingOptions: SelectOption<TrainingSplit>[] = [
  { label: 'Full body', value: 'full_body' },
  { label: 'Upper / Lower', value: 'upper_lower' },
  { label: 'Push / Pull / Legs', value: 'push_pull_legs' },
  { label: 'Body part', value: 'body_part' },
  { label: 'Sport specific', value: 'sport_specific' },
  { label: 'Custom', value: 'custom' }
];

export function ProfileScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [form, setForm] = useState<ProfileFormState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const loadedProfile = await getProfile();
      setProfile(loadedProfile);
      setForm(loadedProfile ? profileToForm(loadedProfile) : null);
    } catch (loadError) {
      setError(readErrorMessage(loadError, 'Unable to load your profile.'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const updatedAtLabel = useMemo(() => {
    if (!profile) return null;
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(profile.updatedAt));
  }, [profile]);

  const setField = <TKey extends keyof ProfileFormState>(
    key: TKey,
    value: ProfileFormState[TKey]
  ) => {
    setForm((current) => (current ? { ...current, [key]: value } : current));
    setError(null);
    setSuccess(null);
  };

  const beginEdit = () => {
    if (profile) {
      setForm(profileToForm(profile));
      setIsEditing(true);
      setError(null);
      setSuccess(null);
    }
  };

  const cancelEdit = () => {
    setForm(profile ? profileToForm(profile) : null);
    setIsEditing(false);
    setError(null);
  };

  const submitProfile = async () => {
    if (!form) return;

    const validation = validateForm(form);
    if (!validation.isValid) {
      setError(validation.message);
      return;
    }

    const input = buildProfileInput(form);
    const planInputsChanged = profile ? didPlanInputsChange(profile, input) : true;

    setIsSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const savedProfile = await saveProfile(input);
      if (planInputsChanged) {
        triggerPlanRecalculation(savedProfile);
      }
      setProfile(savedProfile);
      setForm(profileToForm(savedProfile));
      setIsEditing(false);
      setSuccess(
        planInputsChanged
          ? 'Profile saved. Future plan targets will use these updated inputs.'
          : 'Profile saved.'
      );
    } catch (saveError) {
      setError(readErrorMessage(saveError, 'Unable to save your profile.'));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Screen contentStyle={styles.centered}>
        <AppText variant="caption" tone="primary" style={styles.eyebrow}>
          LiftFuel
        </AppText>
        <AppText variant="heading">Loading profile</AppText>
      </Screen>
    );
  }

  if (!profile || !form) {
    return (
      <Screen contentStyle={styles.centered}>
        <Card style={styles.card}>
          <View style={styles.copy}>
            <AppText variant="caption" tone="primary" style={styles.eyebrow}>
              LiftFuel
            </AppText>
            <AppText variant="heading">No saved profile</AppText>
            <AppText variant="body" tone="muted">
              Complete onboarding first so your nutrition plan has profile inputs.
            </AppText>
          </View>
          {error ? <StatusMessage tone="danger" message={error} /> : null}
          <Button onPress={loadProfile}>Reload profile</Button>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen contentStyle={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.copy}>
            <AppText variant="caption" tone="primary" style={styles.eyebrow}>
              LiftFuel profile
            </AppText>
            <AppText variant="display">Profile</AppText>
            <AppText variant="body" tone="muted">
              Review the inputs used for targets and update them as your training changes.
            </AppText>
          </View>
          {!isEditing ? (
            <Button onPress={beginEdit} style={styles.headerAction}>
              Edit profile
            </Button>
          ) : null}
        </View>

        {error ? <StatusMessage tone="danger" message={error} /> : null}
        {success ? <StatusMessage tone="success" message={success} /> : null}

        {isEditing ? (
          <ProfileEditForm
            form={form}
            isSaving={isSaving}
            onCancel={cancelEdit}
            onSave={submitProfile}
            setField={setField}
          />
        ) : (
          <ProfileSummary profile={profile} updatedAtLabel={updatedAtLabel} />
        )}
      </ScrollView>
    </Screen>
  );
}

function ProfileSummary({
  profile,
  updatedAtLabel
}: {
  profile: UserProfile;
  updatedAtLabel: string | null;
}) {
  return (
    <>
      <Card>
        <StatRow label="Weight" value={`${formatNumber(profile.weightKg)} kg`} />
        <StatRow label="Height" value={`${formatNumber(profile.heightCm)} cm`} />
        <StatRow label="Age" value={`${profile.ageYears}`} />
        <StatRow label="Sex" value={labelFor(sexOptions, profile.sex)} />
      </Card>

      <Card>
        <StatRow label="Goal" value={labelFor(goalOptions, profile.goal)} />
        <StatRow label="Activity" value={labelFor(activityOptions, profile.activityLevel)} />
        <StatRow label="Training split" value={labelFor(trainingOptions, profile.trainingSplit)} />
        <StatRow
          label="Training days"
          value={`${profile.trainingDaysPerWeek}/week`}
          helperText="Used by future plan calculations."
        />
      </Card>

      <Card>
        <StatRow
          label="Body fat"
          value={profile.bodyFatPercent === null ? 'Not set' : `${formatNumber(profile.bodyFatPercent)}%`}
          helperText={profile.bodyFatPercent === null ? undefined : 'Stored as an estimate.'}
        />
        <StatRow
          label="Last updated"
          value={updatedAtLabel ?? 'Unknown'}
          helperText="Plan inputs are read from the latest saved profile."
        />
      </Card>
    </>
  );
}

function ProfileEditForm({
  form,
  isSaving,
  onCancel,
  onSave,
  setField
}: {
  form: ProfileFormState;
  isSaving: boolean;
  onCancel: () => void;
  onSave: () => void;
  setField: <TKey extends keyof ProfileFormState>(
    key: TKey,
    value: ProfileFormState[TKey]
  ) => void;
}) {
  return (
    <>
      <Card style={styles.card}>
        <AppText variant="label">Body basics</AppText>
        <Input
          keyboardType="decimal-pad"
          label="Weight"
          helperText="Kilograms"
          onChangeText={(value) => setField('weightKg', value)}
          value={form.weightKg}
        />
        <Input
          keyboardType="decimal-pad"
          label="Height"
          helperText="Centimeters"
          onChangeText={(value) => setField('heightCm', value)}
          value={form.heightCm}
        />
        <Input
          keyboardType="number-pad"
          label="Age"
          helperText="Years"
          onChangeText={(value) => setField('ageYears', value)}
          value={form.ageYears}
        />
      </Card>

      <Card style={styles.card}>
        <OptionGroup
          label="Sex"
          options={sexOptions}
          value={form.sex}
          onChange={(value) => setField('sex', value)}
        />
        <OptionGroup
          label="Activity"
          options={activityOptions}
          value={form.activityLevel}
          onChange={(value) => setField('activityLevel', value)}
        />
      </Card>

      <Card style={styles.card}>
        <OptionGroup
          label="Goal"
          options={goalOptions}
          value={form.goal}
          onChange={(value) => setField('goal', value)}
        />
        <OptionGroup
          label="Training split"
          options={trainingOptions}
          value={form.trainingSplit}
          onChange={(value) => setField('trainingSplit', value)}
        />
        <Input
          keyboardType="number-pad"
          label="Training days per week"
          onChangeText={(value) => setField('trainingDaysPerWeek', value)}
          value={form.trainingDaysPerWeek}
        />
      </Card>

      <Card style={styles.card}>
        <AppText variant="label">Advanced estimate</AppText>
        <Input
          keyboardType="decimal-pad"
          label="Body fat"
          helperText="Percent. Leave blank if you are unsure."
          onChangeText={(value) => setField('bodyFatPercent', value)}
          value={form.bodyFatPercent}
        />
      </Card>

      <View style={styles.actions}>
        <Button variant="secondary" disabled={isSaving} onPress={onCancel} style={styles.action}>
          Cancel
        </Button>
        <Button disabled={isSaving} onPress={onSave} style={styles.action}>
          {isSaving ? 'Saving...' : 'Save profile'}
        </Button>
      </View>
    </>
  );
}

function OptionGroup<TValue extends string>({
  label,
  onChange,
  options,
  value
}: {
  label: string;
  onChange: (value: TValue) => void;
  options: SelectOption<TValue>[];
  value: TValue;
}) {
  return (
    <View style={styles.optionGroup}>
      <AppText variant="label">{label}</AppText>
      <View style={styles.optionGrid}>
        {options.map((option) => (
          <Button
            key={option.value}
            variant={option.value === value ? 'primary' : 'secondary'}
            onPress={() => onChange(option.value)}
            style={styles.optionButton}
          >
            {option.label}
          </Button>
        ))}
      </View>
    </View>
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

function profileToForm(profile: UserProfile): ProfileFormState {
  return {
    activityLevel: profile.activityLevel,
    ageYears: String(profile.ageYears),
    bodyFatPercent: profile.bodyFatPercent === null ? '' : String(profile.bodyFatPercent),
    goal: profile.goal,
    heightCm: String(profile.heightCm),
    sex: profile.sex,
    trainingDaysPerWeek: String(profile.trainingDaysPerWeek),
    trainingSplit: profile.trainingSplit,
    weightKg: String(profile.weightKg)
  };
}

function validateForm(
  form: ProfileFormState
): { isValid: true } | { isValid: false; message: string } {
  if (!isNumberInRange(form.weightKg, 20, 400)) {
    return { isValid: false, message: 'Enter a weight between 20 and 400 kg.' };
  }
  if (!isNumberInRange(form.heightCm, 90, 250)) {
    return { isValid: false, message: 'Enter a height between 90 and 250 cm.' };
  }
  if (!isIntegerInRange(form.ageYears, 13, 100)) {
    return { isValid: false, message: 'Enter an age between 13 and 100.' };
  }
  if (!isIntegerInRange(form.trainingDaysPerWeek, 0, 7)) {
    return { isValid: false, message: 'Training days must be a whole number from 0 to 7.' };
  }
  if (form.bodyFatPercent.trim() && !isNumberInRange(form.bodyFatPercent, 3, 75)) {
    return { isValid: false, message: 'Body fat estimate must be between 3% and 75%.' };
  }

  return { isValid: true };
}

function buildProfileInput(form: ProfileFormState): ProfileInput {
  return {
    activityLevel: form.activityLevel,
    ageYears: Number.parseInt(form.ageYears, 10),
    bodyFatIsEstimate: true,
    bodyFatPercent: form.bodyFatPercent.trim()
      ? parseRoundedNumber(form.bodyFatPercent, 1)
      : null,
    goal: form.goal,
    heightCm: parseRoundedNumber(form.heightCm, 2),
    sex: form.sex,
    trainingDaysPerWeek: Number.parseInt(form.trainingDaysPerWeek, 10),
    trainingSplit: form.trainingSplit,
    weightKg: parseRoundedNumber(form.weightKg, 2)
  };
}

function didPlanInputsChange(profile: UserProfile, input: ProfileInput): boolean {
  return (
    profile.activityLevel !== input.activityLevel ||
    profile.ageYears !== input.ageYears ||
    profile.bodyFatPercent !== input.bodyFatPercent ||
    profile.goal !== input.goal ||
    profile.heightCm !== input.heightCm ||
    profile.sex !== input.sex ||
    profile.trainingDaysPerWeek !== input.trainingDaysPerWeek ||
    profile.trainingSplit !== input.trainingSplit ||
    profile.weightKg !== input.weightKg
  );
}

function isNumberInRange(value: string, minimum: number, maximum: number): boolean {
  if (!value.trim()) return false;

  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue >= minimum && numberValue <= maximum;
}

function isIntegerInRange(value: string, minimum: number, maximum: number): boolean {
  if (!value.trim()) return false;

  const numberValue = Number(value);
  return Number.isInteger(numberValue) && numberValue >= minimum && numberValue <= maximum;
}

function parseRoundedNumber(value: string, precision: number): number {
  const factor = 10 ** precision;
  return Math.round(Number(value) * factor) / factor;
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : String(value);
}

function labelFor<TValue extends string>(options: SelectOption<TValue>[], value: TValue): string {
  return options.find((option) => option.value === value)?.label ?? value;
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
  centered: {
    justifyContent: 'center'
  },
  header: {
    gap: spacing.lg,
    paddingTop: spacing.md
  },
  copy: {
    gap: spacing.sm
  },
  eyebrow: {
    textTransform: 'uppercase'
  },
  headerAction: {
    alignSelf: 'flex-start',
    minWidth: 152
  },
  card: {
    gap: spacing.lg
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
  optionGroup: {
    gap: spacing.sm
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm
  },
  optionButton: {
    minHeight: 44,
    minWidth: 132,
    paddingHorizontal: spacing.md
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md
  },
  action: {
    flex: 1
  }
});
