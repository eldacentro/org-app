import { useState } from 'react';
import { Box, Stack } from '@mui/material';
import { IconCheckCircle, IconInfo } from '@components/icons';
import Accordion from '@components/accordion';
import Card from '@components/card';
import Typography from '@components/typography';
import useReparto from './useReparto';
import { REPARTO_MESES } from '@services/app/reparto';
import { RepartoAsignacionType } from '@services/app/reparto';

/**
 * «hace 14 semanas», que es lo que se pregunta de verdad.
 *
 * Ojo con el futuro: en una aplicación de programas, media congregación tiene
 * asignaciones puestas para las semanas que vienen. Eso NO es «hace tanto» —
 * decirlo así ponía «esta semana» a quien está programado para octubre— y sí
 * importa, porque a quien ya le han puesto algo no le toca ahora.
 */
const haceCuanto = (weekOf: string) => {
  if (!weekOf) return 'nunca le ha tocado';

  const desde = new Date(weekOf.replace(/\//g, '-'));

  if (Number.isNaN(desde.getTime())) return '';

  const semanas = Math.floor(
    (Date.now() - desde.getTime()) / (7 * 24 * 60 * 60 * 1000)
  );

  if (semanas < 0) {
    const faltan = Math.abs(semanas);

    return faltan <= 1
      ? 'ya programado'
      : `ya programado, en ${faltan} semanas`;
  }

  if (semanas === 0) return 'esta semana';
  if (semanas === 1) return 'hace 1 semana';

  return `hace ${semanas} semanas`;
};

const vecesTexto = (veces: number) =>
  veces === 1 ? '1 vez' : `${veces} veces`;

const Resumen = ({ reparto }: { reparto: RepartoAsignacionType }) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      flexWrap: 'wrap',
    }}
  >
    <Typography className="body-small-regular" color="var(--grey-400)">
      {`${reparto.personas.length} ${
        reparto.personas.length === 1 ? 'hermano' : 'hermanos'
      } · entre ${reparto.menos} y ${reparto.mas} veces`}
    </Typography>

    {/* El total no lleva señal, y es a propósito: «va equilibrado» o «míralo»
        son juicios sobre una RUEDA, donde todos pueden llevar lo mismo. En el
        total no — quien está aprobado para doce cosas lleva más que quien lo
        está para dos, y eso no es un desequilibrio. Con semáforo, esta fila
        saldría siempre en naranja y dejaría de decir nada. */}
    {reparto.code === undefined ? null : reparto.desigual ? (
      <IconInfo width={16} height={16} color="var(--orange-dark)" />
    ) : (
      <IconCheckCircle width={16} height={16} color="var(--green-main)" />
    )}
  </Box>
);

/**
 * La rueda de cada asignación.
 *
 * Arriba, el margen entre el que menos veces la ha llevado y el que más: eso
 * solo ya contesta «¿va equilibrado?», que es lo que la hoja de cálculo
 * obligaba a deducir contando huecos. Al abrir una, la lista ordenada por a
 * quién le toca antes — el mismo orden que usa el autocompletado, así que si
 * el reparto va torcido aquí se ve por qué.
 */
const Reparto = () => {
  const { asignaciones, nombreDe } = useReparto();

  const [abierta, setAbierta] = useState<string | false>(false);

  if (asignaciones.length === 0) {
    return (
      <Typography className="body-regular" color="var(--grey-400)">
        Todavía no hay asignaciones repartidas que mirar.
      </Typography>
    );
  }

  return (
    <Stack spacing="16px">
      <Typography className="body-small-regular" color="var(--grey-400)">
        {`Las veces se cuentan en los últimos ${REPARTO_MESES} meses, más lo que ya esté programado. La última vez que le tocó a cada uno se dice entera, aunque sea de mucho antes.`}
      </Typography>

      {/* Cada asignación, en su tarjeta — la misma superficie blanca que el
          resto de la aplicación. Antes eran plegables sueltos sobre el fondo de
          la página: la única pantalla que no se parecía a las demás.

          La tarjeta va FUERA del plegable y no dentro, para no anidar dos
          superficies con el mismo fondo y el mismo borde (ver DESIGN_SYSTEM,
          §8). El plegable pone el comportamiento; la tarjeta, el papel. */}
      {asignaciones.map((reparto) => {
        // El total no tiene código de asignación —no es una—, así que su
        // identificador se pone a mano. Sin esto, `String(undefined)` haría de
        // identificador y funcionaría de milagro.
        const id = reparto.code === undefined ? 'total' : String(reparto.code);

        return (
          <Card key={id} sx={{ padding: '8px 16px', gap: '0px' }}>
            <Accordion
              id={id}
              expanded={abierta === id}
              onChange={(value) => setAbierta(value)}
              label={
                <Box
                  sx={{ display: 'flex', flexDirection: 'column', gap: '2px' }}
                >
                  <Typography className="body-regular" color="var(--ink)">
                    {reparto.titulo}
                  </Typography>
                  <Resumen reparto={reparto} />
                </Box>
              }
            >
              <Stack spacing="4px" sx={{ padding: '8px 0' }}>
                {reparto.personas.map((persona, i) => (
                  <Box
                    key={persona.person_uid}
                    sx={{
                      display: 'flex',
                      alignItems: 'baseline',
                      justifyContent: 'space-between',
                      gap: '12px',
                      padding: '6px 0',
                      borderBottom:
                        i < reparto.personas.length - 1
                          ? '1px solid var(--line)'
                          : 'none',
                    }}
                  >
                    <Typography
                      className="body-small-regular"
                      color="var(--ink)"
                    >
                      {`${i + 1}. ${nombreDe(persona.person_uid)}`}
                    </Typography>

                    <Typography
                      className="label-small-regular"
                      color="var(--grey-400)"
                      sx={{ textAlign: 'right', flexShrink: 0 }}
                    >
                      {`${haceCuanto(persona.ultima)} · ${vecesTexto(persona.veces)}`}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Accordion>
          </Card>
        );
      })}
    </Stack>
  );
};

export default Reparto;
