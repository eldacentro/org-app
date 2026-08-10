import { UpdateSpec } from 'dexie';
import appDb from '@db/appDb';
import { sourceSchema } from '@services/dexie/schema';
import { dbSchedUpdate } from '@services/dexie/schedules';
import { SourceWeekType } from '@definition/sources';
type SourceChanges = UpdateSpec<SourceWeekType> & Record<string, unknown>;
import { updateObject } from '@utils/common';

const dbUpdateSourcesMetadata = async () => {
  const metadata = await appDb.metadata.get(1);

  if (!metadata) return;

  metadata.metadata.sources = {
    ...metadata.metadata.sources,
    send_local: true,
  };

  await appDb.metadata.put(metadata);
};

export const dbSourcesSave = async (srcData: SourceWeekType) => {
  const findSource = await appDb.sources.get(srcData.weekOf);

  if (!findSource) {
    const newSource = structuredClone(sourceSchema);
    newSource.weekOf = srcData.weekOf;

    await appDb.sources.put(newSource);
  }

  const source = await appDb.sources.get(srcData.weekOf);

  const newSource = structuredClone(source);
  updateObject(newSource, srcData);

  await appDb.sources.put(newSource);
  await dbUpdateSourcesMetadata();
};

export const dbSourcesUpdate = async (
  weekOf: string,
  changes: SourceChanges
) => {
  // LA SEMANA PUEDE NO EXISTIR TODAVÍA, y eso es normal.
  //
  // Los discursos públicos se cuadran con meses de antelación —cuando llamas a
  // otra congregación a pedir un orador no esperas a que salga el cuaderno—,
  // pero el número del discurso vive en `sources`, que solo tiene semanas con
  // material. Sin fila, `update` no crea nada: se iba en silencio, y en la
  // pantalla el desplegable del discurso sencillamente no reaccionaba.
  //
  // Así que se crea la fila vacía y se escribe encima. No inventa material:
  // el esqueleto va sin lectura bíblica ni estudio de La Atalaya, que es
  // justo lo que miran los selectores de semana para decidir qué enseñar, así
  // que una semana así no aparece como si tuviera cuaderno. Y cuando el
  // material llegue de verdad, `dbSourcesSave` FUSIONA sobre lo que haya
  // (`updateObject` nunca recorta una lista que ya está), así que el discurso
  // apuntado meses antes sigue ahí.
  const exists = await appDb.sources.get(weekOf);

  if (!exists) {
    const newSource = structuredClone(sourceSchema);
    newSource.weekOf = weekOf;

    await appDb.sources.put(newSource);
  }

  await appDb.sources.update(weekOf, changes);
  await dbUpdateSourcesMetadata();

  // A esta función solo llegan ediciones manuales de los editores de
  // reuniones (discurso, título, canciones, partes de entre semana...) —
  // las importaciones de materiales usan dbSourcesSave/dbSourcesBulkPut.
  // Aunque el dato viva en sources, para el usuario es una edición del
  // programa de esa semana, así que se sella también updatedAt y
  // lastModifiedBy del registro sched, que es lo que muestran las páginas
  // de reuniones como "Última actualización".
  const sched = await appDb.sched.get(weekOf);

  if (sched) {
    await dbSchedUpdate(weekOf, {});
  }
};

export const dbSourcesBulkPut = async (sources: SourceWeekType[]) => {
  await appDb.sources.bulkPut(sources);
  await dbUpdateSourcesMetadata();
};

export const dbSourcesUpdateEventsName = async () => {
  const sources = await appDb.sources.toArray();

  const sourcesToUpdate = sources.filter((source) => {
    const midweekEventsIsArray =
      source.midweek_meeting &&
      Array.isArray(source.midweek_meeting.event_name);

    const weekendEventsIsArray =
      source.weekend_meeting &&
      Array.isArray(source.weekend_meeting.event_name);

    return !midweekEventsIsArray || !weekendEventsIsArray;
  });

  if (sourcesToUpdate.length === 0) return;

  sourcesToUpdate.forEach((source) => {
    if (source.midweek_meeting) {
      const midweekEvent = source.midweek_meeting.event_name;
      if (typeof midweekEvent === 'object' && !Array.isArray(midweekEvent)) {
        source.midweek_meeting.event_name = [
          {
            type: 'main',
            value: midweekEvent['value'],
            updatedAt: midweekEvent['updatedAt'],
          },
        ];
      }
    }

    if (source.weekend_meeting) {
      const weekendEvent = source.weekend_meeting.event_name;

      if (typeof weekendEvent === 'object' && !Array.isArray(weekendEvent)) {
        source.weekend_meeting.event_name = [
          {
            type: 'main',
            value: weekendEvent['value'],
            updatedAt: weekendEvent['updatedAt'],
          },
        ];
      }
    }
  });

  await appDb.sources.bulkPut(sourcesToUpdate);
  await dbUpdateSourcesMetadata();
};
