/*
Las correcciones locales a los discursos de los oradores del circuito.

Viven en Firestore, no en la base local ni en la sincronización E2E: la tabla de
oradores la reconstruye el Google Sheets del circuito en cada pasada, así que una
corrección guardada ahí duraría hasta la madrugada siguiente. Ver
`services/app/speaker_overrides.ts`.
*/

import { atom } from 'jotai';
import { SpeakerOverride } from '@services/app/speaker_overrides';

export const speakerOverridesState = atom<SpeakerOverride[]>([]);
