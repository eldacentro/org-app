import { useEffect, useMemo, useState } from 'react';
import { useAtomValue } from 'jotai';
import { congIDState, userLocalUIDState } from '@states/settings';
import { fieldGroupsState } from '@states/field_service_groups';
import {
  SpeakerDinnerRotationType,
  SpeakerInvitationType,
} from '@definition/speaker_invitation';
import {
  leerRotacionCenas,
  listarInvitaciones,
} from '@services/firebase/speaker_invitations';
import {
  calcularTurnosCena,
  esSemanaDeVisita,
  unaPorSemana,
} from '@services/app/rotacion_cenas';
import { schedulesState } from '@states/schedules';
import { useAppTranslation } from '@hooks/index';
import { formatDate, getWeekDate } from '@utils/date';
import { nombreDeGrupo } from './nombreGrupo';

/**
 * LAS CENAS QUE LE TOCAN A MI GRUPO, para enseñárselas a quien las organiza.
 *
 * Se le enseña al SUPERINTENDENTE DEL GRUPO y a su auxiliar, no a todo el
 * grupo: a diferencia de la limpieza, aquí no participa el grupo entero —se
 * busca una familia dentro— y quien tiene que moverlo es el que lo lleva. Si le
 * saliera a los treinta, nadie se daría por aludido.
 *
 * SOLO LAS DECIDIDAS. Una cena sale cuando el orador ya dijo que se queda Y
 * todas las semanas anteriores de la rotación están resueltas. Antes salía en
 * cuanto el orador decía que sí, aunque la semana anterior siguiera sin
 * contestar — y si esa contestaba que sí, la cena pasaba al grupo siguiente:
 * a un superintendente se le quitaba una cena que ya estaba organizando y al
 * otro le aparecía de golpe.
 *
 * Los datos vienen de Firestore, como todo el módulo del orador, así que esto
 * va aparte del resto de «Mis asignaciones», que lee de la base de datos local.
 * Si falla, devuelve una lista vacía: una asignación de más que no aparece es
 * molesto, pero una pantalla que no carga lo es mucho más.
 */
const useCenaDeMiGrupo = () => {
  const { t } = useAppTranslation();
  const congId = useAtomValue(congIDState);
  const yo = useAtomValue(userLocalUIDState);
  const grupos = useAtomValue(fieldGroupsState);
  const schedules = useAtomValue(schedulesState);

  const [invitaciones, setInvitaciones] = useState<SpeakerInvitationType[]>([]);
  const [rotacion, setRotacion] = useState<SpeakerDinnerRotationType | null>(
    null
  );

  useEffect(() => {
    let cancelado = false;

    const cargar = async () => {
      if (!congId || !yo) return;

      try {
        const [todas, laRotacion] = await Promise.all([
          listarInvitaciones(congId),
          leerRotacionCenas(congId),
        ]);

        if (cancelado) return;

        setInvitaciones(todas);
        setRotacion(laRotacion);
      } catch (error) {
        console.error('No se pudieron leer las cenas del orador', error);
      }
    };

    cargar();

    return () => {
      cancelado = true;
    };
  }, [congId, yo]);

  /** Los grupos que llevo yo: superintendente o auxiliar. */
  const misGrupos = useMemo(() => {
    return new Set(
      grupos
        .filter((g) =>
          (g.group_data.members ?? []).some(
            (m) =>
              m.person_uid === yo && (m.isOverseer || m.isAssistant)
          )
        )
        .map((g) => g.group_id)
    );
  }, [grupos, yo]);

  const turnos = useMemo(
    () =>
      calcularTurnosCena({
        invitaciones,
        rotacion,
        grupos,
        schedules,
        hoy: formatDate(getWeekDate(new Date()), 'yyyy/MM/dd'),
      }),
    [invitaciones, rotacion, grupos, schedules]
  );

  /** Las semanas decididas en que le toca a un grupo mío y se cena. */
  const semanas = useMemo(() => {
    if (misGrupos.size === 0) return [];

    // La misma invitación que cuenta en la rueda: la vigente de cada semana.
    const porSemana = new Map(
      unaPorSemana(invitaciones).map((inv) => [inv.weekOf, inv])
    );

    return turnos
      .filter((turno) => {
        // La semana de la visita del superintendente no tiene orador visitante.
        if (esSemanaDeVisita(turno.weekOf, schedules)) return false;

        // Solo si de verdad se queda y ya no se puede mover. Mientras no se
        // sepa, no se le dice a nadie que organice una cena que a lo mejor no
        // es suya.
        return turno.decidido && turno.gasta && misGrupos.has(turno.grupo);
      })
      .map((turno) => {
        const inv = porSemana.get(turno.weekOf);

        return {
          weekOf: turno.weekOf,
          speakerName: inv?.speakerName ?? '',
          comensales: inv?.respuesta?.comensales ?? 0,
          dateLocale: inv?.dateLocale ?? '',
          grupo: nombreDeGrupo(
            grupos.find((g) => g.group_id === turno.grupo),
            t
          ),
        };
      });
  }, [turnos, invitaciones, grupos, misGrupos, schedules, t]);

  return { semanas };
};

export default useCenaDeMiGrupo;
