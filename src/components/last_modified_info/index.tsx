import { useMemo, useState } from 'react';
import { Box } from '@mui/material';
import { useAppTranslation, useCurrentUser } from '@hooks/index';
import { IconHistory } from '@components/icons';
import Button from '@components/button';
import Dialog from '@components/dialog';
import Typography from '@components/typography';
import { MESES_ES } from '@utils/nombres_fecha';
import { FieldChange } from '@services/app/last_modified';

type LastModifiedInfoProps = {
  updatedAt: string;
  lastModifiedBy: string;
  /**
   * Qué campos se cambiaron y cuándo. Si no llega nada, la línea sigue siendo
   * una línea: no se abre nada y no se promete nada que no haya.
   */
  changes?: FieldChange[];
};

/** «Presidente y Oración» — la lista se escribe, no se concatena con comas. */
const enumerar = (items: string[]) => {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];

  return `${items.slice(0, -1).join(', ')} y ${items.at(-1)}`;
};

/**
 * «3 de agosto».
 *
 * Con los meses de la casa y no con `toLocaleDateString`, que se va al idioma
 * del NAVEGADOR: en un Chrome en inglés salía «el August 3» dentro de una
 * frase en español.
 */
const diaLargo = (value: Date) =>
  `${value.getDate()} de ${MESES_ES[value.getMonth()].toLowerCase()}`;

/** «20:41». Con dos cifras siempre, para que la columna no baile. */
const hora = (value: Date) =>
  `${String(value.getHours()).padStart(2, '0')}:${String(
    value.getMinutes()
  ).padStart(2, '0')}`;

/**
 * «Última actualización» — y quién ve cuánto.
 *
 * A un anciano o a un administrador le sirve el dato entero: la hora exacta y
 * el nombre de quien lo tocó es lo que permite ir y preguntarle. Al resto de la
 * congregación eso no le resuelve nada, y de paso señala a un hermano por su
 * nombre cada vez que alguien abre la página.
 *
 * Fuera de ese círculo se queda solo la FECHA, que es lo único que contesta a
 * la pregunta que se hace todo el mundo: ¿esto está al día?
 *
 * **Va al PIE de la página, no arriba.** Es un dato de contexto, no un
 * titular: puesto debajo del título era lo segundo que se leía al abrir, por
 * delante del contenido que se venía a ver.
 *
 * **Y se abre.** La aplicación guarda un `updatedAt` por CADA campo, así que
 * la respuesta puede ser mejor que «se tocó el 3 de agosto»: puede ser
 * «Presidente y Oración de apertura, el 3 de agosto».
 *
 * El límite se dice en voz alta dentro del panel: se guarda CUÁNDO se tocó
 * cada campo, pero no QUIÉN — el autor solo existe a nivel de registro
 * entero. Prometer un «quién» por campo con estos datos sería inventarlo.
 */
const LastModifiedInfo = ({
  updatedAt,
  lastModifiedBy,
  changes,
}: LastModifiedInfoProps) => {
  const { t } = useAppTranslation();

  const { isElder, isAdmin } = useCurrentUser();

  // El detalle es solo del cuerpo de ancianos. A los demás les basta —y les
  // corresponde— la fecha: quién tocó qué y a qué hora señala a un hermano por
  // su nombre cada vez que alguien abre la página.
  const puedeVerDetalle = isElder || isAdmin;

  const [open, setOpen] = useState(false);

  // Los campos cambiados el mismo día se cuentan juntos: a nadie le importa
  // que el presidente y la oración se tocaran con doce minutos de diferencia.
  /**
   * Los cambios, agrupados por MOMENTO y por autor — no por día.
   *
   * Por día no servía: autocompletar sella las quince partes a la vez, así que
   * el panel decía «hoy cambió todo» y con eso no se sabe nada. Agrupando por
   * minuto, un autocompletado sale como UN apunte («14 partes, a las 20:41») y
   * el cambio que alguien hizo a las nueve de la noche sale aparte, que es el
   * que se estaba buscando.
   *
   * Se agrupa también por quién: dos personas tocando cosas en el mismo minuto
   * son dos apuntes, no uno.
   */
  const porMomento = useMemo(() => {
    const grupos = new Map<
      string,
      { fecha: Date; by?: string; labels: string[] }
    >();

    for (const change of changes ?? []) {
      const fecha = new Date(change.updatedAt);

      if (Number.isNaN(fecha.getTime())) continue;

      const clave = `${change.updatedAt.slice(0, 16)}|${change.by ?? ''}`;
      const grupo = grupos.get(clave);

      if (grupo) {
        if (!grupo.labels.includes(change.label))
          grupo.labels.push(change.label);
      } else {
        grupos.set(clave, { fecha, by: change.by, labels: [change.label] });
      }
    }

    return [...grupos.values()].sort(
      (a, b) => b.fecha.getTime() - a.fecha.getTime()
    );
  }, [changes]);

  // Antes hacía falta el nombre para pintar la línea. Ya no: sin nombre sigue
  // habiendo fecha, y la fecha es justo lo que le importa a quien no es
  // anciano.
  if (!updatedAt) return null;

  const date = new Date(updatedAt);

  const conDetalle = puedeVerDetalle && lastModifiedBy;

  const algunoConAutor = porMomento.some((grupo) => grupo.by);

  const texto = conDetalle
    ? `${date.toLocaleString()} (${lastModifiedBy})`
    : date.toLocaleDateString();

  const linea = `${t('tr_lastUpdate', 'Última actualización')}: ${texto}`;

  // Sin ser del cuerpo, la línea es solo texto: ni se abre, ni se subraya, ni
  // se llega a ella con el tabulador.
  const sePuedeAbrir = puedeVerDetalle && porMomento.length > 0;

  return (
    <>
      {/* Se abre con el teclado igual que con el dedo: es un control, aunque
          parezca una línea de texto. Sin `tabIndex` ni tecla, quien navega con
          el tabulador no llega nunca al panel. */}
      <Box
        onClick={sePuedeAbrir ? () => setOpen(true) : undefined}
        onKeyDown={
          sePuedeAbrir
            ? (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setOpen(true);
                }
              }
            : undefined
        }
        role={sePuedeAbrir ? 'button' : undefined}
        tabIndex={sePuedeAbrir ? 0 : undefined}
        sx={{
          marginTop: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          alignSelf: 'flex-start',
          opacity: 0.7,
          cursor: sePuedeAbrir ? 'pointer' : 'default',
          transition: 'opacity var(--motion-fast) var(--ease-standard)',
          '&:hover': { opacity: sePuedeAbrir ? 1 : 0.7 },
          '&:focus-visible': {
            opacity: 1,
            outline: '2px solid var(--accent-main)',
            outlineOffset: '4px',
            borderRadius: 'var(--shape-sm)',
          },
        }}
      >
        {sePuedeAbrir && (
          <IconHistory width={16} height={16} color="var(--grey-400)" />
        )}

        <Typography
          className="label-small-regular"
          color="var(--grey-400)"
          sx={{
            textDecoration: sePuedeAbrir ? 'underline' : 'none',
            textUnderlineOffset: '3px',
          }}
        >
          {linea}
        </Typography>
      </Box>

      {open && (
        <Dialog open={open} onClose={() => setOpen(false)}>
          <Typography className="h2" sx={{ color: 'var(--ink)', mb: 1 }}>
            {t('tr_lastUpdate', 'Última actualización')}
          </Typography>

          <Typography
            className="body-small-regular"
            sx={{ color: 'var(--ink-2)', mb: 3 }}
          >
            {t(
              'tr_lastUpdateWhatChanged',
              'Qué se cambió en esta página y cuándo.'
            )}
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {porMomento.map((grupo) => (
              <Box key={`${grupo.fecha.toISOString()}|${grupo.by ?? ''}`}>
                {/* Arriba, CUÁNDO y QUIÉN — que es lo que se viene a buscar.
                    Debajo, qué se tocó en ese momento. Al revés se leía como
                    una lista de partes con una fecha de propina. */}
                <Typography
                  className="body-regular-semibold"
                  sx={{ color: 'var(--ink)' }}
                >
                  {`${diaLargo(grupo.fecha)}, ${hora(grupo.fecha)}`}
                  {grupo.by ? ` · ${grupo.by}` : ''}
                </Typography>

                <Typography
                  className="label-small-regular"
                  sx={{ color: 'var(--ink-2)' }}
                >
                  {/* Sin campos que nombrar —un registro que solo guarda su
                      propia fecha, como el de Grupos— la línea se quedaba en
                      blanco. */}
                  {grupo.labels.length > 0
                    ? enumerar(grupo.labels)
                    : 'Se guardó la página'}
                </Typography>

                {/* La coletilla solo cuando el módulo SÍ guarda el autor y a
                    este apunte le falta: entonces sí significa «esto es
                    antiguo». Donde no se guarda por campo —Departamentos,
                    Grupos— no falta nada que explicar, y el nombre del último
                    que guardó ya está en la línea de arriba. */}
                {!grupo.by && algunoConAutor && (
                  <Typography
                    className="label-small-regular"
                    sx={{ color: 'var(--grey-400)' }}
                  >
                    No consta quién: es de antes de que se guardara el autor de
                    cada cambio.
                  </Typography>
                )}
              </Box>
            ))}
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
            <Button variant="main" onClick={() => setOpen(false)}>
              {t('tr_close', 'Cerrar')}
            </Button>
          </Box>
        </Dialog>
      )}
    </>
  );
};

export default LastModifiedInfo;
