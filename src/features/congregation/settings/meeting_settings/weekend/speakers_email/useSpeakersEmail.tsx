import { useEffect, useRef, useState } from 'react';
import { useAtomValue } from 'jotai';
import { publicTalkSpeakersEmailState, settingsState } from '@states/settings';
import { dbAppSettingsUpdate } from '@services/dexie/settings';

const useSpeakersEmail = () => {
  const settings = useAtomValue(settingsState);
  const initialValue = useAtomValue(publicTalkSpeakersEmailState);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const [email, setEmail] = useState('');
  const [editing, setEditing] = useState(false);

  const handleEmailChange = (value: string) => {
    setEditing(true);
    setEmail(value);
  };

  const handleEmailSaveDb = async () => {
    const existing = structuredClone(
      settings.cong_settings.public_talk_speakers_email ?? {
        value: '',
        updatedAt: '',
      }
    );

    existing.value = email;
    existing.updatedAt = new Date().toISOString();

    await dbAppSettingsUpdate({
      'cong_settings.public_talk_speakers_email': existing,
    });
  };

  const handleEmailSave = () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);

    saveTimer.current = setTimeout(async () => {
      saveTimer.current = undefined;
      await handleEmailSaveDb();
      setEditing(false);
    }, 1000);
  };

  useEffect(() => {
    setEmail((prev) => (editing ? prev : initialValue));
  }, [initialValue, editing]);

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  return { email, handleEmailChange, handleEmailSave };
};

export default useSpeakersEmail;
