/*
Cómo va la reunión de entre semana que se está siguiendo ahora mismo.

Vive SOLO en memoria y en el almacenamiento del propio navegador (ver
`services/app/meeting_run.ts`). No es una tabla, no pasa por Dexie y no se
sincroniza: es lo que está viendo quien preside en su móvil mientras la reunión
está en marcha.

Está aquí, y no dentro del componente de la barra, porque los relojitos de cada
parte están repartidos por todo el programa y necesitan saber en qué estado está
la suya. Pasárselo de padres a hijos habría obligado a tocar ocho componentes que
no tienen nada que ver con esto.
*/

import { atom } from 'jotai';
import { MeetingRunView } from '@services/app/meeting_run';

// Escrito así —y no `atom<MeetingRunView | null>(null)`— porque con esa forma
// los tipos de jotai 2.18 lo dan por atom de SOLO LECTURA y `useSetAtom` no
// compila. Mismo caso que `personPendingGroupState`.
export const meetingRunViewState = atom(null as MeetingRunView | null);
