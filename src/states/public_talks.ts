import { atom } from 'jotai';
import { PublicTalkLocaleType, PublicTalkType } from '@definition/public_talks';
import { JWLangState } from './settings';

export const publicTalksState = atom<PublicTalkType[]>([]);

export const publicTalksSearchKeyState = atom('');

export const publicTalksLocaleState = atom((get) => {
  const lang = get(JWLangState);
  const talks = get(publicTalksState);

  return talks.map((talk) => {
    return {
      talk_number: talk.talk_number,
      talk_title: talk.talk_title[lang] ?? '',
    } as PublicTalkLocaleType;
  });
});

// Aquí vivía `publicTalksFilteredState`, que no consumía nadie: el filtrado de
// verdad lo hace `usePublicTalks` (por título, por orador y por número). Dos
// filtros para lo mismo, y el muerto solo miraba el título — el día que
// alguien lo hubiera enchufado, habría perdido la búsqueda por número sin
// enterarse.
