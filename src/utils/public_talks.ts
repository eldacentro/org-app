import { PublicTalkOverrideType, PublicTalkType } from '@definition/public_talks';

/**
 * Aplica encima de los títulos por defecto (los del bundle, vía Crowdin) lo
 * que un admin importó manualmente desde el archivo .jwpub oficial — solo
 * para los números de bosquejo donde de verdad difieren.
 *
 * Función pura sin dependencias de react-i18next a propósito: se usa tanto
 * desde el hilo principal (dexie/public_talk.ts, tras reconstruir la lista
 * desde el bundle) como desde el Web Worker de sincronización
 * (backupUtils.ts, tras recibir una importación de otro dispositivo), y ese
 * worker no tiene acceso a la instancia de i18next del hilo principal.
 */
export const applyPublicTalksOverride = (
  result: PublicTalkType[],
  override?: PublicTalkOverrideType
) => {
  if (!override?.overrides) return;

  for (const [langCode, talks] of Object.entries(override.overrides)) {
    for (const [numberStr, title] of Object.entries(talks)) {
      const number = +numberStr;

      const findTalk = result.find((record) => record.talk_number === number);

      if (findTalk) {
        findTalk.talk_title[langCode] = title;
      } else {
        result.push({ talk_number: number, talk_title: { [langCode]: title } });
      }
    }
  }
};
