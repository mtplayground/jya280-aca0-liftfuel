import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Card, Input } from '../../../components/ui';
import type {
  ActivityLevel,
  Goal,
  ProfileInput,
  Sex,
  TrainingSplit
} from '../../../api/types';
import { ApiError } from '../../../api/client';
import { spacing } from '../../../theme';
import { saveProfile } from '../../profile';
import { OnboardingStepShell } from '../components/OnboardingStepShell';
import { OptionCard } from '../components/OptionCard';

type OnboardingFlowScreenProps = {
  onComplete: () => void;
};

type StepId = 'basics' | 'activity' | 'goal' | 'training' | 'bodyFat';

type OnboardingFormState = {
  activityLevel: ActivityLevel | null;
  ageYears: string;
  bodyFatPercent: string;
  goal: Goal | null;
  heightCm: string;
  sex: Sex | null;
  trainingDaysPerWeek: string;
  trainingSplit: TrainingSplit | null;
  weightKg: string;
};

type SelectOption<TValue extends string> = {
  description: string;
  label: string;
  value: TValue;
};

const steps: StepId[] = ['basics', 'activity', 'goal', 'training', 'bodyFat'];

const sexOptions: SelectOption<Sex>[] = [
  { label: 'Female', value: 'female', description: 'Use female metabolic constants.' },
  { label: 'Male', value: 'male', description: 'Use male metabolic constants.' },
  { label: 'Non-binary', value: 'non_binary', description: 'Keep the profile inclusive.' },
  {
    label: 'Prefer not to say',
    value: 'prefer_not_to_say',
    description: 'Skip sex-specific assumptions where possible.'
  }
];

const activityOptions: SelectOption<ActivityLevel>[] = [
  { label: 'Mostly seated', value: 'sedentary', description: 'Desk day with little walking.' },
  { label: 'Lightly active', value: 'light', description: 'Some walking or easy movement.' },
  { label: 'Moderate', value: 'moderate', description: 'Regular movement and training.' },
  { label: 'Active', value: 'active', description: 'Physical job or frequent training.' },
  { label: 'Very active', value: 'very_active', description: 'Hard training plus active days.' }
];

const goalOptions: SelectOption<Goal>[] = [
  { label: 'Cut', value: 'cut', description: 'Reduce body weight while protecting lean mass.' },
  { label: 'Maintain', value: 'maintain', description: 'Hold weight steady and fuel training.' },
  { label: 'Bulk', value: 'bulk', description: 'Gain weight with a controlled surplus.' }
];

const trainingOptions: Array<SelectOption<TrainingSplit> & { days: string }> = [
  {
    label: 'Push / Pull / Legs',
    value: 'push_pull_legs',
    description: 'A common 5-6 day split for higher weekly volume.',
    days: '6'
  },
  {
    label: 'Upper / Lower',
    value: 'upper_lower',
    description: 'Balanced 4 day structure with repeatable sessions.',
    days: '4'
  },
  {
    label: 'Full body',
    value: 'full_body',
    description: 'Efficient 2-3 day setup for broad coverage.',
    days: '3'
  },
  {
    label: 'Body part',
    value: 'body_part',
    description: 'Classic muscle-group split across the week.',
    days: '5'
  },
  {
    label: 'Sport specific',
    value: 'sport_specific',
    description: 'Training organized around practices or events.',
    days: '4'
  },
  {
    label: 'Custom',
    value: 'custom',
    description: 'Use your own weekly training structure.',
    days: '3'
  }
];

const initialForm: OnboardingFormState = {
  activityLevel: null,
  ageYears: '',
  bodyFatPercent: '',
  goal: null,
  heightCm: '',
  sex: null,
  trainingDaysPerWeek: '',
  trainingSplit: null,
  weightKg: ''
};

export function OnboardingFlowScreen({ onComplete }: OnboardingFlowScreenProps) {
  const [form, setForm] = useState<OnboardingFormState>(initialForm);
  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const step = steps[stepIndex];
  const stepCopy = useMemo(() => getStepCopy(step), [step]);

  const setField = <TKey extends keyof OnboardingFormState>(
    key: TKey,
    value: OnboardingFormState[TKey]
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
    setError(null);
  };

  const goBack = () => {
    setError(null);
    setStepIndex((current) => Math.max(0, current - 1));
  };

  const continueOrSave = async () => {
    const validation = validateStep(step, form);
    if (!validation.isValid) {
      setError(validation.message);
      return;
    }

    if (stepIndex < steps.length - 1) {
      setStepIndex((current) => current + 1);
      setError(null);
      return;
    }

    await submitProfile();
  };

  const submitProfile = async () => {
    const input = buildProfileInput(form);
    if (!input) {
      setError('Review the previous steps before saving your profile.');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await saveProfile(input);
      onComplete();
    } catch (saveError) {
      if (saveError instanceof ApiError) {
        setError(saveError.message);
      } else {
        setError('Unable to save your profile. Check your connection and try again.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <OnboardingStepShell
      canGoBack={stepIndex > 0}
      error={error}
      isSaving={isSaving}
      onBack={goBack}
      onNext={continueOrSave}
      stepIndex={stepIndex}
      stepTotal={steps.length}
      subtitle={stepCopy.subtitle}
      title={stepCopy.title}
    >
      {step === 'basics' ? (
        <BasicsStep form={form} setField={setField} />
      ) : step === 'activity' ? (
        <ActivityStep form={form} setField={setField} />
      ) : step === 'goal' ? (
        <GoalStep value={form.goal} onChange={(value) => setField('goal', value)} />
      ) : step === 'training' ? (
        <TrainingStep form={form} setField={setField} />
      ) : (
        <BodyFatStep form={form} setField={setField} />
      )}
    </OnboardingStepShell>
  );
}

function BasicsStep({
  form,
  setField
}: {
  form: OnboardingFormState;
  setField: <TKey extends keyof OnboardingFormState>(
    key: TKey,
    value: OnboardingFormState[TKey]
  ) => void;
}) {
  return (
    <View style={styles.inputGrid}>
      <Input
        keyboardType="decimal-pad"
        label="Current weight"
        onChangeText={(value) => setField('weightKg', value)}
        placeholder="82"
        returnKeyType="next"
        value={form.weightKg}
        helperText="Kilograms"
      />
      <Input
        keyboardType="decimal-pad"
        label="Height"
        onChangeText={(value) => setField('heightCm', value)}
        placeholder="178"
        returnKeyType="next"
        value={form.heightCm}
        helperText="Centimeters"
      />
      <Input
        keyboardType="number-pad"
        label="Age"
        onChangeText={(value) => setField('ageYears', value)}
        placeholder="32"
        returnKeyType="done"
        value={form.ageYears}
        helperText="Years"
      />
    </View>
  );
}

function ActivityStep({
  form,
  setField
}: {
  form: OnboardingFormState;
  setField: <TKey extends keyof OnboardingFormState>(
    key: TKey,
    value: OnboardingFormState[TKey]
  ) => void;
}) {
  return (
    <>
      <View style={styles.optionGroup}>
        <AppText variant="label">Sex</AppText>
        {sexOptions.map((option) => (
          <OptionCard
            key={option.value}
            description={option.description}
            isSelected={form.sex === option.value}
            onPress={() => setField('sex', option.value)}
            title={option.label}
          />
        ))}
      </View>
      <View style={styles.optionGroup}>
        <AppText variant="label">Typical day</AppText>
        {activityOptions.map((option) => (
          <OptionCard
            key={option.value}
            description={option.description}
            isSelected={form.activityLevel === option.value}
            onPress={() => setField('activityLevel', option.value)}
            title={option.label}
          />
        ))}
      </View>
    </>
  );
}

function GoalStep({
  onChange,
  value
}: {
  onChange: (value: Goal) => void;
  value: Goal | null;
}) {
  return (
    <View style={styles.optionGroup}>
      {goalOptions.map((option) => (
        <OptionCard
          key={option.value}
          description={option.description}
          isSelected={value === option.value}
          onPress={() => onChange(option.value)}
          title={option.label}
        />
      ))}
    </View>
  );
}

function TrainingStep({
  form,
  setField
}: {
  form: OnboardingFormState;
  setField: <TKey extends keyof OnboardingFormState>(
    key: TKey,
    value: OnboardingFormState[TKey]
  ) => void;
}) {
  return (
    <>
      <View style={styles.optionGroup}>
        {trainingOptions.map((option) => (
          <OptionCard
            key={option.value}
            description={option.description}
            isSelected={form.trainingSplit === option.value}
            onPress={() => {
              setField('trainingSplit', option.value);
              setField('trainingDaysPerWeek', option.days);
            }}
            title={option.label}
          >
            <AppText variant="caption" tone="primary">
              {option.days} days/week
            </AppText>
          </OptionCard>
        ))}
      </View>
      <Input
        keyboardType="number-pad"
        label="Training days per week"
        onChangeText={(value) => setField('trainingDaysPerWeek', value)}
        placeholder="4"
        value={form.trainingDaysPerWeek}
      />
    </>
  );
}

function BodyFatStep({
  form,
  setField
}: {
  form: OnboardingFormState;
  setField: <TKey extends keyof OnboardingFormState>(
    key: TKey,
    value: OnboardingFormState[TKey]
  ) => void;
}) {
  return (
    <>
      <Input
        keyboardType="decimal-pad"
        label="Body fat estimate"
        onChangeText={(value) => setField('bodyFatPercent', value)}
        placeholder="Optional"
        value={form.bodyFatPercent}
        helperText="Percent. Leave blank if you are unsure."
      />
      <Card style={styles.note}>
        <AppText variant="label">Estimate only</AppText>
        <AppText variant="caption" tone="muted">
          LiftFuel stores body fat as an estimate and keeps it optional for plan setup.
        </AppText>
      </Card>
    </>
  );
}

function getStepCopy(step: StepId): { title: string; subtitle: string } {
  switch (step) {
    case 'basics':
      return {
        title: 'Body basics',
        subtitle: 'Add the minimum numbers needed to calculate a starting plan.'
      };
    case 'activity':
      return {
        title: 'Daily activity',
        subtitle: 'Choose the closest match for your usual non-training day.'
      };
    case 'goal':
      return {
        title: 'Primary goal',
        subtitle: 'Pick the direction the nutrition plan should support first.'
      };
    case 'training':
      return {
        title: 'Training rhythm',
        subtitle: 'Select a common split or tune the weekly frequency.'
      };
    case 'bodyFat':
      return {
        title: 'Advanced estimate',
        subtitle: 'Body fat percentage is optional and can be refined later.'
      };
  }
}

function validateStep(
  step: StepId,
  form: OnboardingFormState
): { isValid: true } | { isValid: false; message: string } {
  switch (step) {
    case 'basics': {
      if (!isNumberInRange(form.weightKg, 20, 400)) {
        return { isValid: false, message: 'Enter a weight between 20 and 400 kg.' };
      }
      if (!isNumberInRange(form.heightCm, 90, 250)) {
        return { isValid: false, message: 'Enter a height between 90 and 250 cm.' };
      }
      if (!isIntegerInRange(form.ageYears, 13, 100)) {
        return { isValid: false, message: 'Enter an age between 13 and 100.' };
      }
      return { isValid: true };
    }
    case 'activity':
      if (!form.sex) {
        return { isValid: false, message: 'Choose the sex value for this profile.' };
      }
      if (!form.activityLevel) {
        return { isValid: false, message: 'Choose the closest daily activity level.' };
      }
      return { isValid: true };
    case 'goal':
      if (!form.goal) {
        return { isValid: false, message: 'Choose a goal to continue.' };
      }
      return { isValid: true };
    case 'training':
      if (!form.trainingSplit) {
        return { isValid: false, message: 'Choose a training split preset.' };
      }
      if (!isIntegerInRange(form.trainingDaysPerWeek, 0, 7)) {
        return { isValid: false, message: 'Training days must be a whole number from 0 to 7.' };
      }
      return { isValid: true };
    case 'bodyFat':
      if (form.bodyFatPercent.trim() && !isNumberInRange(form.bodyFatPercent, 3, 75)) {
        return { isValid: false, message: 'Body fat estimate must be between 3% and 75%.' };
      }
      return { isValid: true };
  }
}

function buildProfileInput(form: OnboardingFormState): ProfileInput | null {
  const bodyFatPercent = form.bodyFatPercent.trim()
    ? parseRoundedNumber(form.bodyFatPercent, 1)
    : null;

  if (!form.sex || !form.activityLevel || !form.goal || !form.trainingSplit) {
    return null;
  }

  return {
    activityLevel: form.activityLevel,
    ageYears: Number.parseInt(form.ageYears, 10),
    bodyFatIsEstimate: true,
    bodyFatPercent,
    goal: form.goal,
    heightCm: parseRoundedNumber(form.heightCm, 2),
    sex: form.sex,
    trainingDaysPerWeek: Number.parseInt(form.trainingDaysPerWeek, 10),
    trainingSplit: form.trainingSplit,
    weightKg: parseRoundedNumber(form.weightKg, 2)
  };
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

const styles = StyleSheet.create({
  inputGrid: {
    gap: spacing.md
  },
  optionGroup: {
    gap: spacing.sm
  },
  note: {
    gap: spacing.sm
  }
});
