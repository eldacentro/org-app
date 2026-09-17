import { useEffect, useMemo, useState } from 'react';
import { Box, IconButton } from '@mui/material';
import Dialog from '@components/dialog';
import Typography from '@components/typography';
import AppButton from '@components/button';
import Badge from '@components/badge';
import SwitchWithLabel from '@components/switch_with_label';
import TimePicker from '@components/time_picker';
import { IconAdd, IconDelete, IconGenerate, IconUndo } from '@components/icons';
import {
  ServiceOutingSettingsType,
  ServiceOutingWeekType,
} from '@definition/service_outings';
import {
  applyWeekShiftDrafts,
  getEffectiveHoursForMonth,
  OUTING_DAY_KEYS,
  outingSlotLabel,
  weekShiftCollisions,
  weekShiftDrafts,
  WeekShiftChanges,
  WeekShiftDraft,
} from '@utils/service_outings';
import { generateDateFromTime } from '@utils/date';
import { fmtDiaConNumero, fmtRangoSemana } from '@utils/nombres_fecha';
import { useBreakpoints } from '@hooks/index';

/**
 * «Ajustes de la semana» de Salidas de predicación.
 *
 * Para qué sirve, en la práctica: la semana de la visita del superintendente de
 * circuito. Esa semana se sale a otras horas y en turnos que el resto del año
 * no existen —un miércoles por la tarde, un jueves por la mañana—, y quien lo
 * programa necesita poder decirlo sin tocar la configuración de la congregación.
 *
 * Lo que había era un interruptor, una pregunta de sí o no («¿deseas ajustar el
 * horario?») y, detrás de ella, catorce relojes en una caja de 250 píxeles con
 * barra de desplazamiento propia. No dejaba añadir un turno que no existiera, y
 * cambiar una hora dejaba colgando la asignación de ese turno.
 *
 * Ahora la semana se ve ENTERA, día por día, con los turnos que de verdad tiene.
 * Cada turno es una fila con su hora; cada día tiene su «Añadir turno». No hay
 * nada escondido detrás de una pregunta, y lo que se toca se dice en la propia
 * fila: qué hora era la habitual, qué turno es añadido y quién lo conduce.
 *
 * La lógica no vive aquí: `weekShiftDrafts` prepara los turnos y
 * `applyWeekShiftDrafts` los aplica (y mueve las asignaciones con su turno).
 * Las dos están probadas en `utils/service_outings.test.ts`.
 */

type WeekSettingsDialogProps = {
  open: boolean;
  weekOf: string;
  weekRecord: ServiceOutingWeekType | undefined;
  settings: ServiceOutingSettingsType | null;
  hour24: boolean;
  saving: boolean;
  /** Hay una visita programada esa semana: la marca la pone ella. */
  visitScheduled: boolean;
  /** Quién conduce el turno de esa fecha y hora ('' si nadie). */
  conductorOf: (date: string, time: string) => string;
  /** ¿Hay acompañantes del superintendente apuntados en ese turno? */
  hasCompanions: (date: string, time: string) => boolean;
  onClose: VoidFunction;
  onSave: (changes: WeekShiftChanges) => void;
  /** Guarda lo que haya pendiente (`null` si no se ha tocado nada) y rellena
   *  los turnos vacíos de la semana. */
  onAutofill: (changes: WeekShiftChanges | null) => void;
};

const aMinutos = (hora: string): number => {
  const [h, m] = hora.split(':').map(Number);

  return h * 60 + m;
};

const aHora = (minutos: number): string => {
  const tope = Math.max(0, Math.min(minutos, 23 * 60 + 30));

  return `${String(Math.floor(tope / 60)).padStart(2, '0')}:${String(
    tope % 60
  ).padStart(2, '0')}`;
};

const fechaDe = (date: string): Date => {
  const [y, m, d] = date.split('/').map(Number);

  return new Date(y, m - 1, d);
};

const WeekSettingsDialog = ({
  open,
  weekOf,
  weekRecord,
  settings,
  hour24,
  saving,
  visitScheduled,
  conductorOf,
  hasCompanions,
  onClose,
  onSave,
  onAutofill,
}: WeekSettingsDialogProps) => {
  const { tablet600Up } = useBreakpoints();

  const [drafts, setDrafts] = useState<WeekShiftDraft[]>([]);
  const [isCoWeek, setIsCoWeek] = useState(false);
  // ¿Se ha tocado algo? Guardar sin cambios le pone fecha nueva a la semana, la
  // manda a todos los dispositivos y, si el mes ya está publicado, hace saltar
  // el aviso de «lo has cambiado después de publicarlo» — por nada.
  const [dirty, setDirty] = useState(false);

  // Se prepara al ABRIR, no mientras está abierto: si una sincronización
  // cambiara la semana por debajo, no puede llevarse lo que se está editando.
  useEffect(() => {
    if (!open || !weekOf) return;

    setDrafts(weekShiftDrafts(settings, weekRecord, weekOf));
    setIsCoWeek(visitScheduled || !!weekRecord?.isCircuitOverseerWeek);
    setDirty(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, weekOf]);

  // Los siete días de la semana, tengan turnos o no: un día sin salidas es
  // justo donde hace falta poder añadir una.
  const days = useMemo(() => {
    if (!weekOf) return [];

    const monday = fechaDe(weekOf);

    return OUTING_DAY_KEYS.map((dayKey, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);

      const dbDate = `${date.getFullYear()}/${String(
        date.getMonth() + 1
      ).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;

      return { dayKey, date, dbDate };
    });
  }, [weekOf]);

  const collisions = useMemo(() => weekShiftCollisions(drafts), [drafts]);

  const changes = useMemo(
    () =>
      applyWeekShiftDrafts({
        weekRecord,
        weekOf,
        isCircuitOverseerWeek: isCoWeek,
        drafts,
      }),
    [weekRecord, weekOf, isCoWeek, drafts]
  );

  const setTime = (key: string, time: string) => {
    setDirty(true);
    setDrafts((prev) =>
      prev.map((draft) => (draft.key === key ? { ...draft, time } : draft))
    );
  };

  const removeShift = (key: string) => {
    setDirty(true);
    setDrafts((prev) => prev.filter((draft) => draft.key !== key));
  };

  // La hora con la que nace un turno nuevo. Lo natural es que rellene el hueco
  // que ese día tiene respecto a los horarios de la congregación —si no hay
  // turno de tarde, la hora de la tarde—, y si ya están los dos, un rato
  // después del último. Nunca una hora que ya exista ese día: dos turnos a la
  // misma hora se repartirían la misma asignación.
  const addShift = (dayKey: WeekShiftDraft['dayKey'], dbDate: string) => {
    setDirty(true);
    setDrafts((prev) => {
      const delDia = prev.filter((draft) => draft.date === dbDate);
      const ocupadas = new Set(delDia.map((draft) => draft.time));
      const horas = getEffectiveHoursForMonth(settings, dbDate.slice(0, 7));

      const candidatas = [
        horas[`${dayKey}_morning`] || '10:00',
        horas[`${dayKey}_afternoon`] || '17:00',
      ];

      let time = candidatas.find((hora) => !ocupadas.has(hora));

      if (!time) {
        let minutos =
          Math.max(...delDia.map((draft) => aMinutos(draft.time))) + 60;

        while (ocupadas.has(aHora(minutos)) && minutos < 23 * 60 + 30) {
          minutos += 30;
        }

        time = aHora(minutos);
      }

      const nuevo: WeekShiftDraft = {
        key: crypto.randomUUID(),
        kind: 'extra',
        date: dbDate,
        dayKey,
        time,
        originalTime: time,
      };

      return [...prev, nuevo].sort(
        (a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)
      );
    });
  };

  const valid = collisions.length === 0 && !saving;
  const canSave = valid && dirty;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      // Más ancho que un diálogo de formulario: aquí se ve una semana entera, y
      // a 560 los días se apilaban en una sola columna interminable.
      PaperProps={{ style: { maxWidth: '760px' } }}
      // Sin relleno abajo: lo pone el pie, que va pegado. Quien se desplaza es
      // esta caja, y un elemento pegajoso se clava en el borde de su RELLENO,
      // no en el de la caja — con 32 de relleno, el pie se quedaba 32 más
      // arriba y por la rendija se veía pasar el contenido. DESIGN_SYSTEM §4.1.
      sx={{ paddingBottom: '0 !important' }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <Typography className="h2" color="var(--ink)">
          Ajustes de la semana
        </Typography>
        <Typography className="body-small-regular" color="var(--ink-2)">
          {weekOf ? fmtRangoSemana(weekOf) : ''}. Lo que cambies aquí vale solo
          para esta semana.
        </Typography>
      </Box>

      {/* ── La visita ─────────────────────────────────────────────────── */}
      <Box
        sx={{
          padding: '16px',
          borderRadius: 'var(--shape-md)',
          border: '1px solid var(--line)',
          backgroundColor: isCoWeek ? 'var(--accent-100)' : 'var(--card)',
          transition:
            'background-color var(--motion-fast) var(--ease-standard)',
        }}
      >
        <SwitchWithLabel
          label="Semana del superintendente de circuito"
          helper={
            visitScheduled
              ? 'La marca la visita programada en «Visita del superintendente». De miércoles a domingo, los turnos sin conductor salen a su nombre.'
              : 'De miércoles a domingo, los turnos sin conductor salen a nombre del superintendente.'
          }
          checked={isCoWeek}
          readOnly={visitScheduled}
          onChange={(checked) => {
            setDirty(true);
            setIsCoWeek(checked);
          }}
        />
      </Box>

      {/* ── Los turnos ────────────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <Typography className="h3" color="var(--ink)">
            Turnos de la semana
          </Typography>
          <Typography className="body-small-regular" color="var(--ink-2)">
            Cambia una hora o añade un turno que normalmente no hay. Quien lo
            conduce se mueve con él.
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gap: '12px',
            gridTemplateColumns: {
              mobile: 'minmax(0, 1fr)',
              tablet600: 'repeat(2, minmax(0, 1fr))',
            },
            alignItems: 'start',
          }}
        >
          {days.map(({ dayKey, date, dbDate }) => {
            const shifts = drafts.filter((draft) => draft.date === dbDate);

            return (
              <Box
                key={dbDate}
                sx={{
                  borderRadius: 'var(--shape-md)',
                  border: '1px solid var(--line)',
                  backgroundColor: 'var(--card)',
                  overflow: 'hidden',
                }}
              >
                {/* Cabecera del día */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    padding: '6px 6px 6px 16px',
                    minHeight: '48px',
                    backgroundColor: 'var(--accent-100)',
                  }}
                >
                  <Typography
                    className="body-regular-semibold"
                    color="var(--accent-dark)"
                  >
                    {fmtDiaConNumero(date)}
                  </Typography>

                  <AppButton
                    variant="small"
                    disableAutoStretch
                    startIcon={<IconAdd />}
                    onClick={() => addShift(dayKey, dbDate)}
                    ariaLabel={`Añadir turno el ${fmtDiaConNumero(
                      date
                    ).toLowerCase()}`}
                  >
                    Añadir turno
                  </AppButton>
                </Box>

                {shifts.length === 0 && (
                  <Typography
                    className="body-small-regular"
                    color="var(--ink-3)"
                    sx={{ padding: '14px 16px' }}
                  >
                    Sin salidas este día.
                  </Typography>
                )}

                {shifts.map((shift, index) => {
                  const conductor = conductorOf(shift.date, shift.originalTime);
                  const companions = hasCompanions(
                    shift.date,
                    shift.originalTime
                  );
                  const changed =
                    shift.kind === 'habitual' &&
                    shift.time !== shift.habitualTime;
                  const collides = collisions.includes(shift.key);

                  const notes: string[] = [];

                  if (conductor) notes.push(`Conduce ${conductor}`);
                  if (companions) notes.push('con acompañantes apuntados');

                  return (
                    <Box
                      key={shift.key}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '10px 6px 10px 16px',
                        borderTop:
                          index === 0 ? 'none' : '1px solid var(--line)',
                      }}
                    >
                      <TimePicker
                        ampm={!hour24}
                        value={generateDateFromTime(shift.time)}
                        onChange={(newDate) => {
                          if (!newDate || isNaN(newDate.getTime())) return;

                          setTime(
                            shift.key,
                            `${String(newDate.getHours()).padStart(
                              2,
                              '0'
                            )}:${String(newDate.getMinutes()).padStart(2, '0')}`
                          );
                        }}
                        // `flex: 'none'`: el TimePicker trae `flex: 1` de serie
                        // y en una fila flexible eso le gana al ancho, así que
                        // la columna de relojes bajaba en zigzag.
                        sx={{ flex: 'none', width: '124px' }}
                      />

                      <Box
                        sx={{
                          flex: 1,
                          minWidth: 0,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '2px',
                        }}
                      >
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '6px',
                          }}
                        >
                          <Typography
                            className="body-small-semibold"
                            color="var(--ink)"
                          >
                            {outingSlotLabel(
                              shift.kind === 'habitual'
                                ? shift.key
                                : `${shift.dayKey}_extra_`,
                              shift.time
                            )}
                          </Typography>

                          {shift.kind === 'extra' && (
                            <Badge size="small" color="accent" text="Añadido" />
                          )}
                        </Box>

                        {collides ? (
                          <Typography
                            className="label-small-medium"
                            color="var(--error-main)"
                          >
                            Ya hay un turno a esa hora.
                          </Typography>
                        ) : (
                          <>
                            {changed && (
                              <Typography
                                className="label-small-regular"
                                color="var(--ink-2)"
                              >
                                Habitual: {shift.habitualTime}
                              </Typography>
                            )}
                            {notes.length > 0 && (
                              <Typography
                                className="label-small-regular"
                                color="var(--ink-2)"
                              >
                                {notes.join(', ')}
                              </Typography>
                            )}
                          </>
                        )}
                      </Box>

                      {changed && (
                        <IconButton
                          aria-label={`Volver a la hora habitual, ${shift.habitualTime}`}
                          title="Volver a la hora habitual"
                          onClick={() =>
                            setTime(shift.key, shift.habitualTime ?? shift.time)
                          }
                        >
                          <IconUndo color="var(--ink-2)" />
                        </IconButton>
                      )}

                      {shift.kind === 'extra' && (
                        <IconButton
                          aria-label={
                            conductor
                              ? `Quitar el turno y la asignación de ${conductor}`
                              : 'Quitar el turno'
                          }
                          title="Quitar el turno"
                          onClick={() => removeShift(shift.key)}
                        >
                          <IconDelete color="var(--error-main)" />
                        </IconButton>
                      )}
                    </Box>
                  );
                })}
              </Box>
            );
          })}
        </Box>

        {changes.removed.some((r) => conductorOf(r.date, r.time)) && (
          <Typography className="body-small-regular" color="var(--error-main)">
            Al guardar se quitará también la asignación de los turnos añadidos
            que has quitado.
          </Typography>
        )}
      </Box>

      {/* ── Pie ─────────────────────────────────────────────────────────
          PEGADO ABAJO. Una semana entera no cabe en pantalla, y con el pie al
          final del desplazamiento «Guardar» quedaba siempre fuera de la vista:
          se cambiaba una hora arriba y había que bajar siete días para
          confirmarla. Ahora viaja con la ventana.

          Los márgenes negativos deshacen el relleno lateral del diálogo (16 en
          móvil, 32 en escritorio) para que la franja llegue de borde a borde y
          tape lo que pasa por detrás; el relleno de dentro lo devuelve, así
          que los botones se quedan alineados con todo lo demás. */}
      <Box
        sx={{
          position: 'sticky',
          bottom: 0,
          zIndex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: 'var(--white)',
          borderTop: '1px solid var(--line)',
          marginInline: { mobile: '-16px', desktop: '-32px' },
          paddingInline: { mobile: '16px', desktop: '32px' },
          paddingBottom: { mobile: '16px', desktop: '24px' },
          paddingTop: { mobile: '12px', desktop: '16px' },
        }}
      >
        {/* A la izquierda y sin contorno: es un atajo sobre el contenido, no
            una de las dos salidas del diálogo. Guarda lo pendiente antes de
            rellenar, para que un turno recién añadido no se quede fuera.

            En un móvil se queda en su icono: con el texto, los tres botones no
            caben en una fila y «Guardar» —que es a lo que se viene— caía solo
            a la izquierda de una segunda línea. */}
        {tablet600Up ? (
          <AppButton
            variant="secondary"
            disableAutoStretch
            startIcon={<IconGenerate />}
            disabled={!valid}
            onClick={() => onAutofill(dirty ? changes : null)}
          >
            Autocompletar
          </AppButton>
        ) : (
          <IconButton
            aria-label="Autocompletar la semana"
            title="Autocompletar la semana"
            disabled={!valid}
            onClick={() => onAutofill(dirty ? changes : null)}
          >
            <IconGenerate color="var(--accent-main)" />
          </IconButton>
        )}

        <Box sx={{ flexGrow: 1 }} />

        <AppButton variant="tertiary" disableAutoStretch onClick={onClose}>
          Cancelar
        </AppButton>
        <AppButton
          variant="main"
          disableAutoStretch
          disabled={!canSave}
          onClick={() => onSave(changes)}
        >
          Guardar
        </AppButton>
      </Box>
    </Dialog>
  );
};

export default WeekSettingsDialog;
