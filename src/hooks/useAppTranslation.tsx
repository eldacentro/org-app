import { useTranslation } from 'react-i18next';
import { useAtomValue } from 'jotai';
import { appLangState } from '@states/app';

const useHookTranslation = () => {
  const appLang = useAtomValue(appLangState);

  const { t, i18n } = useTranslation('ui', { lng: appLang });

  return { t, i18n };
};

export default useHookTranslation;
