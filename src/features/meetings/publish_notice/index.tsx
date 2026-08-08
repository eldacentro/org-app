import { useMemo, useState } from 'react';
import { Box } from '@mui/material';
import { useAtomValue } from 'jotai';
import Button from '@components/button';
import InfoTip from '@components/info_tip';
import Typography from '@components/typography';
import { displaySnackNotification } from '@services/states/app';
import { personIsAwayOn } from '@services/app/persons';
import { personGetDisplayName } from '@utils/common';
import { personsByViewState } from '@states/persons';
import { schedulesState } from '@states/schedules';
import {
  displayNameMeetingsEnableState,
  fullnameOptionState,
  userDataViewState,
} from '@states/settings';
import { dbSchedBulkUpdate } from '@services/dexie/schedules';
import {
  collectMeetingMonthAssignees,
  collectMeetingChangesSincePublish,
  countMeetingChangesSincePublish,
  isMeetingMonthPublished,
  MeetingPublishKey,
  meetingMonthNeedsPublishing,
  restampMeetingMonthPublished,
  isMeetingWeekPublished,
  meetingWeeksOfMonth,
} from '@services/app/meetings_publish';
import {
  meetingDateOfWeek,
  meetingMonthResolver,
} from '@services/app/meeting_month';
import { schedulesGetMeetingDate } from '@services/app/schedules';
import { fmtDiaCorto } from '@utils/nombres_fecha';

/**
 * La tira de aviso de publicación, arriba de la página del programa.
 *
 * Tres cosas que hay que decir donde se está trabajando, y ninguna interrumpe:
 * nada de diálogos, que aquí se está escribiendo el programa.
 *
 * 1. El mes está en borrador: solo lo ve quien lo edita. Sin esto, publicar es
 *    un botón que no se sabe si hace falta pulsar.
 * 2. El mes está publicado y se ha cambiado algo desde entonces: la
 *    congregación ya vio la versión anterior. Se puede volver a publicar, que
 *    pone la fecha al día y cierra el aviso.
 * 3. Alguien de este mes tiene una ausencia apuntada en esas fechas — el caso
 *    de "se apuntó la ausencia DESPUÉS de asignarle". La aplicación no
 *    desasigna a nadie sola: avisa, y decide una persona.
 */
const MeetingPublishNotice = ({
  type,
  month,
}: {
  type: MeetingPublishKey;
  month: string;
}) => {
  const schedules = useAtomValue(schedulesState);
  const dataView = useAtomValue(userDataViewState);
  const persons = useAtomValue(personsByViewState);
  const displayNameEnabled = useAtomValue(displayNameMeetingsEnableState);
  const fullnameOption = useAtomValue(fullnameOptionState);

  const needsPublishing = meetingMonthNeedsPublishing(month, type);

  // Con la misma regla que el selector de semanas del editor: no siempre es el
  // mes del lunes. Ver `meeting_month.ts`.
  const monthOf = meetingMonthResolver(type);

  const isPublished = useMemo(
    () => isMeetingMonthPublished(schedules, month, type, dataView, monthOf),
    [schedules, month, type, dataView, monthOf]
  );

  const changes = useMemo(
    () =>
      countMeetingChangesSincePublish(
        schedules,
        month,
        type,
        dataView,
        monthOf
      ),
    [schedules, month, type, dataView, monthOf]
  );

  const [verCambios, setVerCambios] = useState(false);

  /**
   * Qué se ha cambiado, en una línea por cambio: qué día, qué parte, a quién y
   * quién lo hizo.
   *
   * Se calcula solo cuando se despliega. Un mes tocado muchas veces recorre
   * todas sus semanas parte por parte, y no hay por qué pagarlo mientras el
   * aviso está cerrado, que es casi siempre.
   */
  const cambios = useMemo(() => {
    if (!verCambios) return [];

    return collectMeetingChangesSincePublish(
      schedules,
      month,
      type,
      dataView,
      monthOf
    ).map((cambio) => {
      const dia =
        schedulesGetMeetingDate({
          week: cambio.weekOf,
          meeting: type === 'midweek' ? 'midweek' : 'weekend',
          short: true,
        }).locale || cambio.weekOf;

      // El nombre solo si la parte lleva persona: un tipo de semana o una
      // cancelación no la llevan, y un guion suelto ahí no dice nada.
      const quien = cambio.name ? ` — ${cambio.name}` : '';
      const porQuien = cambio.by ? ` (por ${cambio.by})` : '';

      return `${dia}, ${cambio.parte}${quien}${porQuien}`;
    });
  }, [verCambios, schedules, month, type, dataView, monthOf]);

  /**
   * Los choques concretos: quién, qué día y qué parte.
   *
   * Antes decía «Fulano tiene una ausencia apuntada en las fechas que tiene
   * asignadas este mes» y ahí se acababa. Con eso no se puede hacer nada: hay
   * que repasar el mes entero a mano buscando dónde está el problema, que es
   * justo el trabajo que este aviso venía a ahorrar.
   */
  const awayClashes = useMemo(() => {
    const found: string[] = [];

    for (const assignee of collectMeetingMonthAssignees(
      schedules,
      month,
      type,
      dataView,
      monthOf
    )) {
      const person = persons.find(
        (record) => record.person_uid === assignee.uid
      );

      if (!person) continue;

      // Por el día de la REUNIÓN, no por el lunes de la semana: preguntar por
      // el lunes daba avisos falsos. Ver `meetingDateOfWeek`.
      //
      // Un discurso saliente trae su propio día —el de la congregación que le
      // recibe—, y ese manda sobre el nuestro.
      const cuando = assignee.fecha || meetingDateOfWeek(assignee.weekOf, type);

      if (!personIsAwayOn(person, cuando.replace(/\//g, '-'))) continue;

      const name =
        personGetDisplayName(person, displayNameEnabled, fullnameOption) ||
        assignee.name;

      if (!name) continue;

      // El rótulo dice el día del que se está avisando. Para una salida ese día
      // es el de la otra congregación, así que no vale el de nuestra reunión:
      // diría un día y la ausencia sería de otro.
      const dia = assignee.fecha
        ? fmtDiaCorto(assignee.fecha)
        : schedulesGetMeetingDate({
            week: assignee.weekOf,
            meeting: type === 'midweek' ? 'midweek' : 'weekend',
            short: true,
          }).locale;

      const linea = `${name} — ${dia || assignee.weekOf}, ${assignee.parte}`;

      if (!found.includes(linea)) found.push(linea);
    }

    return found;
  }, [
    schedules,
    month,
    type,
    dataView,
    monthOf,
    persons,
    displayNameEnabled,
    fullnameOption,
  ]);

  const handleRepublish = async () => {
    const toSave = restampMeetingMonthPublished(
      schedules,
      month,
      type,
      dataView,
      undefined,
      monthOf
    );

    if (toSave.length === 0) return;

    await dbSchedBulkUpdate(toSave);

    displaySnackNotification({
      header: 'Hecho',
      message: 'Los cambios de este mes quedan publicados.',
      severity: 'success',
    });
  };

  /**
   * Cuántas semanas de este mes siguen sin publicar.
   *
   * Desde que se publica por semanas, «este mes está en borrador» dejó de ser
   * verdad o mentira: un mes puede estar a medias. Y a medias es justo el estado
   * peligroso —sueltas las dos primeras semanas y te olvidas del resto—, así que
   * la tira tiene que decir cuántas quedan y cuáles.
   */
  const { pendientes, aMedias } = useMemo(() => {
    if (!needsPublishing) return { pendientes: [], aMedias: false };

    const semanas = meetingWeeksOfMonth(schedules, month, monthOf);

    const sinPublicar = semanas.filter(
      (week) => !isMeetingWeekPublished(week, type, dataView)
    );

    return {
      pendientes: sinPublicar.map(
        (week) =>
          schedulesGetMeetingDate({
            week: week.weekOf,
            // Los discursos salientes viven en el registro del fin de semana y
            // se celebran ese día: su fecha es la de esa reunión.
            meeting: type === 'midweek' ? 'midweek' : 'weekend',
            short: true,
          }).locale || week.weekOf
      ),
      // A medias es el estado peligroso: sueltas las dos primeras semanas y te
      // olvidas del resto. Que se note.
      aMedias: sinPublicar.length > 0 && sinPublicar.length < semanas.length,
    };
  }, [needsPublishing, schedules, month, monthOf, type, dataView]);

  const showDraft = needsPublishing && pendientes.length > 0;
  const showChanged = needsPublishing && isPublished && changes > 0;
  const showAway = awayClashes.length > 0;

  if (!showDraft && !showChanged && !showAway) return null;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {showDraft && (
        <InfoTip
          isBig={false}
          color="warning"
          text={
            aMedias
              ? `Este mes está a medias: ${pendientes.length === 1 ? 'queda 1 semana' : `quedan ${pendientes.length} semanas`} sin publicar (${pendientes.join(', ')}). Esas asignaciones no las ve nadie todavía.`
              : 'Este mes está en borrador: solo lo ves tú. Los hermanos no verán sus asignaciones hasta que lo publiques.'
          }
        />
      )}

      {showChanged && (
        <InfoTip isBig={false} color="warning">
          {/* `span` en los dos, y no `div`/`p`: InfoTip ya mete lo que le pasas
              DENTRO de su propio párrafo, y un <div> o un <p> ahí es HTML
              inválido — React lo canta en consola. Un <span> con display:flex
              maqueta igual. */}
          <Box
            component="span"
            sx={{ display: 'flex', flexDirection: 'column', gap: '6px' }}
          >
            <Box
              component="span"
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                width: '100%',
              }}
            >
              <Typography
                component="span"
                className="body-regular"
                sx={{ color: 'var(--orange-dark)' }}
              >
                {`Este mes está publicado. Has hecho ${changes} ${changes === 1 ? 'cambio' : 'cambios'} desde entonces.`}
              </Typography>

              <Box
                component="span"
                sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                {/* Primero comprobar, después publicar: se lee en el orden en
                    que se decide. Volver a publicar sin mirar qué cambió es
                    justo lo que este botón viene a evitar. */}
                {/* En naranja, el color del propio aviso: es la acción de
                    comprobar, no la de decidir. `color` aquí es un prefijo de
                    token (`var(--orange-secondary)`), no un nombre de variante. */}
                <Button
                  variant="small"
                  color="orange"
                  onClick={() => setVerCambios((valor) => !valor)}
                >
                  {verCambios ? 'Ocultar cambios' : 'Ver cambios'}
                </Button>

                <Button variant="small" onClick={handleRepublish}>
                  Volver a publicar
                </Button>
              </Box>
            </Box>

            {/* Una línea por cambio: qué día, qué parte, a quién y quién lo
                hizo. Es lo que permite ir a comprobarlo en vez de repasar el mes
                entero, igual que en el aviso de ausencias de abajo. */}
            {verCambios &&
              cambios.map((linea, index) => (
                <Typography
                  key={`${linea}-${index}`}
                  component="span"
                  className="label-small-regular"
                  sx={{ color: 'var(--orange-dark)' }}
                >
                  {linea}
                </Typography>
              ))}
          </Box>
        </InfoTip>
      )}

      {showAway && (
        <InfoTip isBig={false} color="warning">
          <Box
            component="span"
            sx={{ display: 'flex', flexDirection: 'column', gap: '2px' }}
          >
            <Typography
              component="span"
              className="body-regular"
              sx={{ color: 'var(--orange-dark)' }}
            >
              {awayClashes.length === 1
                ? 'Hay una asignación en un día que esa persona está fuera. Nadie se desasigna solo: mira si hay que cambiarlo.'
                : `Hay ${awayClashes.length} asignaciones en días que esas personas están fuera. Nadie se desasigna solo: mira si hay que cambiarlo.`}
            </Typography>

            {/* Una línea por choque: quién, qué día y qué parte. Es lo que
                permite ir directo a arreglarlo en vez de repasar el mes. */}
            {awayClashes.map((linea) => (
              <Typography
                key={linea}
                component="span"
                className="label-small-regular"
                sx={{ color: 'var(--orange-dark)' }}
              >
                {linea}
              </Typography>
            ))}
          </Box>
        </InfoTip>
      )}
    </Box>
  );
};

export default MeetingPublishNotice;
