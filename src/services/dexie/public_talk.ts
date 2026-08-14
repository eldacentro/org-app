import { getI18n } from 'react-i18next';
import { getListLanguages } from '@services/app';
import { PublicTalkOverrideType, PublicTalkType } from '@definition/public_talks';
import { LANGUAGE_LIST } from '@constants/index';
import { applyPublicTalksOverride } from '@utils/public_talks';
import { dbReplaceTableIfChanged } from './rebuild';
import { localesListos } from '@services/i18n/ready';
import appDb from '@db/appDb';

const triggerSync = () => {
  import('@services/worker/backupWorker').then(
    ({ default: worker }) => worker.postMessage('startWorker')
  );
};

const dbUpdatePublicTalksOverrideMetadata = async () => {
  const metadata = await appDb.metadata.get(1);
  if (!metadata) return;

  metadata.metadata.public_talks_override = {
    ...metadata.metadata.public_talks_override,
    send_local: true,
  };

  await appDb.metadata.put(metadata);
};

export const dbPublicTalkUpdate = async () => {
  const result: PublicTalkType[] = [];

  const languages = await getListLanguages();

  // Sin todos los idiomas cargados esto reescribiría la tabla sin los títulos
  // del idioma que falte. Ver services/i18n/ready.ts.
  const listos = await localesListos(languages.map((lang) => lang.locale));

  if (!listos) return;

  for (const lang of languages) {
    const langCode = lang.code.toUpperCase();

    const resource = getI18n().options.resources[lang.locale];

    if (!resource) continue;

    const translations = resource.talks;

    if (!translations) continue;

    const isSource = LANGUAGE_LIST.find(
      (l) => l.threeLettersCode === lang.locale
    )?.source;

    for (const [key, value] of Object.entries(translations)) {
      const number = +key.split('_')[2];

      const findTalk = result.find((record) => record.talk_number === number);

      if (findTalk) {
        if (isSource || !findTalk.talk_title[langCode]) {
          findTalk.talk_title[langCode] = value;
        }
      }

      if (!findTalk) {
        result.push({ talk_number: number, talk_title: { [langCode]: value } });
      }
    }
  }

  const override = await appDb.public_talks_override.get('1');
  applyPublicTalksOverride(result, override);

  // Se rehace en cada sincronización, pero el contenido sale de las
  // traducciones (más los títulos importados): solo cambia de verdad al
  // cambiar de idioma, al actualizar la app o al guardar un override. Ver
  // dbReplaceTableIfChanged.
  await dbReplaceTableIfChanged(appDb.public_talks, result, 'talk_number');
};

export const dbPublicTalkOverrideGet = async (): Promise<
  PublicTalkOverrideType | undefined
> => {
  return await appDb.public_talks_override.get('1');
};

/**
 * Guarda los títulos importados y vuelve a reconstruir `public_talks` para
 * que se reflejen de inmediato, sin esperar al próximo cambio de idioma.
 */
export const dbPublicTalkOverrideSave = async (
  overrides: Record<string, Record<string, string>>
) => {
  await appDb.public_talks_override.put({
    id: '1',
    updatedAt: new Date().toISOString(),
    overrides,
  });

  await dbUpdatePublicTalksOverrideMetadata();
  await dbPublicTalkUpdate();
  triggerSync();
};
