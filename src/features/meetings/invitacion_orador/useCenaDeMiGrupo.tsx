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
import { grupoPorSemana } from '@services/app/rotacion_cenas';

/**
 * LAS CENAS QUE LE TOCAN A MI GRUPO, para enseñárselas a quien las organiza.
 *
 * Se le enseña al SUPERINTENDENTE DEL GRUPO y a su auxiliar, no a todo el
 * grupo: a diferencia de la limpieza, aquí no participa el grupo entero —se
 * busca una familia dentro— y quien tiene que moverlo es el que lo lleva. Si le
 * saliera a los treinta, nadie se daría por aludido.
 *
 * Los datos vienen de Firestore, como todo el módulo del orador, así que esto
 * va aparte del resto de «Mis asignaciones», que lee de la base de datos local.
 * Si falla, devuelve una lista vacía: una asignación de más que no aparece es
 * molesto, pero una pantalla que no carga lo es mucho más.
 */
const useCenaDeMiGrupo = () => {
  const congId = useAtomValue(congIDState);
  const yo = useAtomValue(userLocalUIDState);
  const grupos = useAtomValue(fieldGroupsState);

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

  /** Las semanas en que le toca a un grupo mío Y el orador se queda a cenar. */
  const semanas = useMemo(() => {
    if (misGrupos.size === 0) return [];

    const turnos = grupoPorSemana({ invitaciones, rotacion, grupos });

    return invitaciones
      .filter((inv) => {
        const grupo = turnos.get(inv.weekOf);

        if (!grupo || !misGrupos.has(grupo)) return false;

        // Solo si de verdad se queda. Mientras no se sepa no se le dice a
        // nadie que organice una cena que a lo mejor no hay.
        return Boolean(inv.respuesta?.asistira && inv.respuesta.cena);
      })
      .map((inv) => ({
        weekOf: inv.weekOf,
        speakerName: inv.speakerName,
        comensales: inv.respuesta?.comensales ?? 0,
        dateLocale: inv.dateLocale,
      }));
  }, [invitaciones, rotacion, grupos, misGrupos]);

  return { semanas };
};

export default useCenaDeMiGrupo;
