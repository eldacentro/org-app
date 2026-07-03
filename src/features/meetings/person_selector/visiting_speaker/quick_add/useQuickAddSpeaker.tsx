import { useState } from 'react';
import { useAtomValue } from 'jotai';
import { IconError } from '@components/icons';
import { SpeakersCongregationsType } from '@definition/speakers_congregations';
import { incomingCongSpeakersState } from '@states/speakers_congregations';
import { circuitNumberState } from '@states/settings';
import { speakersCongregationSchema } from '@services/dexie/schema';
import { dbSpeakersCongregationsCreate } from '@services/dexie/speakers_congregations';
import { dbVisitingSpeakerQuickAdd } from '@services/dexie/visiting_speakers';
import { displaySnackNotification } from '@services/states/app';
import { getMessageByCode } from '@services/i18n/translation';
import { QuickAddSpeakerType } from './index.types';

type Step = 'congregation' | 'speaker';

const useQuickAddSpeaker = ({ onClose, onCreated }: QuickAddSpeakerType) => {
  const congregations = useAtomValue(incomingCongSpeakersState);
  const ownCircuit = useAtomValue(circuitNumberState);

  const [step, setStep] = useState<Step>('congregation');
  const [congInputValue, setCongInputValue] = useState('');
  const [selectedCong, setSelectedCong] = useState<SpeakersCongregationsType | null>(
    null
  );
  const [firstname, setFirstname] = useState('');
  const [lastname, setLastname] = useState('');
  const [isElder, setIsElder] = useState(false);
  const [isMinisterialServant, setIsMinisterialServant] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const reset = () => {
    setStep('congregation');
    setCongInputValue('');
    setSelectedCong(null);
    setFirstname('');
    setLastname('');
    setIsElder(false);
    setIsMinisterialServant(false);
    setIsSaving(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleCongInputChange = (value: string) => {
    setCongInputValue(value);
    setSelectedCong(null);
  };

  const handleCongSelect = (value: SpeakersCongregationsType | null) => {
    setSelectedCong(value);
    if (value) {
      setCongInputValue(value.cong_data.cong_name.value);
    }
  };

  const canContinue = selectedCong !== null || congInputValue.trim().length > 0;

  const handleContinueToSpeaker = async () => {
    if (selectedCong) {
      setStep('speaker');
      return;
    }

    // Congregación nueva: se crea con el mínimo indispensable (nombre +
    // mismo circuito que la propia congregación, el caso más común) — el
    // resto de la ficha (dirección, coordinador, horarios) se completa
    // después desde el Catálogo de oradores si hace falta, sin bloquear
    // aquí el alta rápida del orador.
    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      const newCong: SpeakersCongregationsType = structuredClone(
        speakersCongregationSchema
      );
      newCong.id = crypto.randomUUID();
      newCong.cong_data.cong_name = { value: congInputValue.trim(), updatedAt: now };
      newCong.cong_data.cong_circuit = { value: ownCircuit, updatedAt: now };

      await dbSpeakersCongregationsCreate(newCong);
      setSelectedCong(newCong);
      setStep('speaker');
    } catch (error) {
      console.error(error);
      displaySnackNotification({
        header: getMessageByCode('error_app_generic-title'),
        message: error.message,
        severity: 'error',
        icon: <IconError color="var(--card)" />,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleMoveBackToCongregation = () => setStep('congregation');

  const canSave = firstname.trim().length > 0 || lastname.trim().length > 0;

  const handleSave = async () => {
    if (!selectedCong?.id) return;

    setIsSaving(true);
    try {
      const speaker = await dbVisitingSpeakerQuickAdd(
        selectedCong.id,
        firstname.trim(),
        lastname.trim(),
        isElder,
        isMinisterialServant
      );

      onCreated(speaker);
      handleClose();
    } catch (error) {
      console.error(error);
      displaySnackNotification({
        header: getMessageByCode('error_app_generic-title'),
        message: error.message,
        severity: 'error',
        icon: <IconError color="var(--card)" />,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return {
    congregations,
    step,
    congInputValue,
    selectedCong,
    handleCongInputChange,
    handleCongSelect,
    canContinue,
    handleContinueToSpeaker,
    handleMoveBackToCongregation,
    firstname,
    setFirstname,
    lastname,
    setLastname,
    isElder,
    setIsElder,
    isMinisterialServant,
    setIsMinisterialServant,
    canSave,
    handleSave,
    isSaving,
    handleClose,
  };
};

export default useQuickAddSpeaker;
