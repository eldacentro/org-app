import { Box, Stack } from '@mui/material';
import { IconClose } from '@components/icons';
import Typography from '@components/typography';
import { PlanEvacuacion } from '@definition/evacuacion';
import { SALIDAS } from './data';
import { BLOQUES_ASIENTOS } from './asientos';

/**
 * Lo que sale al tocar algo del plano.
 *
 * La regla: no basta con decir QUÉ es lo que se ha tocado, hay que decir qué
 * pasa con ello en una evacuación —quién se encarga, en qué orden, por dónde
 * se sale—. Un plano que solo etiqueta cosas no ayuda a nadie con prisa.
 */

export type Seleccion =
  | { tipo: 'puesto'; equipoId: string; posicion: string }
  | { tipo: 'bloque'; bloqueId: string }
  | { tipo: 'salida'; salidaId: string }
  | { tipo: 'extintor'; id: number }
  | null;

type Props = {
  plan: PlanEvacuacion;
  seleccion: Seleccion;
  onClose: () => void;
};

type Contenido = {
  etiqueta: string;
  titulo: string;
  color: string;
  lineas: string[];
  lista?: string[];
  /** Los pasos de un procedimiento van numerados; una lista de nombres, no. */
  numerada?: boolean;
};

const construir = (
  plan: PlanEvacuacion,
  seleccion: NonNullable<Seleccion>
): Contenido | null => {
  if (seleccion.tipo === 'puesto') {
    const equipo = plan.equipos.find((e) => e.id === seleccion.equipoId);
    const miembro = equipo?.miembros.find(
      (m) => m.posicion === seleccion.posicion
    );
    if (!equipo) return null;

    const salida = SALIDAS.find((s) => s.puesto === seleccion.posicion);

    const lineas = [equipo.nombre];
    if (miembro?.esResponsable) lineas.push('Responsable del equipo');
    if (salida)
      lineas.push(`Atiende ${salida.nombre.toLowerCase()} (${salida.calle})`);

    return {
      etiqueta: `Puesto ${seleccion.posicion}`,
      titulo: miembro?.nombre ?? 'Sin asignar',
      color: equipo.color,
      lineas,
      lista: equipo.procedimiento,
      numerada: true,
    };
  }

  if (seleccion.tipo === 'bloque') {
    const bloque = BLOQUES_ASIENTOS.find((b) => b.id === seleccion.bloqueId);
    if (!bloque) return null;

    const equipos =
      bloque.zona === 'AB'
        ? plan.equipos.filter((e) => e.zona)
        : plan.equipos.filter((e) => e.zona === bloque.zona);

    return {
      etiqueta: `${bloque.asientos.length} asientos`,
      titulo: bloque.nombre,
      color: bloque.color,
      lineas: [bloque.detalle],
      lista: equipos.map(
        (e) =>
          `${e.nombre}: ${e.miembros.map((m) => `${m.posicion} ${m.nombre}`).join(', ')}`
      ),
    };
  }

  if (seleccion.tipo === 'salida') {
    const salida = SALIDAS.find((s) => s.id === seleccion.salidaId);
    if (!salida) return null;

    const equipo = plan.equipos.find((e) => e.id === salida.equipoId);
    const miembro = equipo?.miembros.find((m) => m.posicion === salida.puesto);

    const regla = salida.esEmergencia
      ? plan.reglasEspeciales.find((r) => r.includes('salida de emergencia'))
      : plan.reglasEspeciales.find((r) => r.includes('puerta principal'));

    return {
      etiqueta: salida.esEmergencia ? 'Salida de emergencia' : 'Salida',
      titulo: salida.calle,
      color: salida.esEmergencia ? '#10B981' : '#3B82F6',
      lineas: [
        `${salida.nombre} · puesto ${salida.puesto}`,
        miembro ? `Al cargo: ${miembro.nombre}` : '',
        regla ? 'Si esta salida está bloqueada:' : '',
      ].filter(Boolean),
      lista: regla ? [regla] : undefined,
    };
  }

  const extintor = plan.extintores.find((e) => e.id === seleccion.id);
  if (!extintor) return null;

  return {
    etiqueta: `Extintor ${extintor.id}`,
    titulo: extintor.tipo,
    color: '#EF4444',
    lineas: [
      extintor.id <= 5
        ? 'Entra en el procedimiento de intervención (extintores 1 a 5).'
        : 'Fuera del procedimiento de intervención.',
    ],
    lista: plan.procedimientoIntervencion.pasos,
    numerada: true,
  };
};

const DetalleSeleccion = ({ plan, seleccion, onClose }: Props) => {
  if (!seleccion) return null;

  const contenido = construir(plan, seleccion);
  if (!contenido) return null;

  return (
    <Box
      sx={{
        // Debajo del plano, no encima: flotando tapaba justo lo que se acaba
        // de tocar, y en un móvil el plano es apaisado y bajito.
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        // Superficie opaca a propósito: el `backdrop-filter: blur(24px)` de
        // antes es de lo más caro que se le puede pedir a un móvil, y aquí
        // solo servía para transparentar el plano de debajo.
        backgroundColor: 'var(--card)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--r-lg)',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box
            sx={{
              display: 'inline-block',
              padding: '2px 8px',
              borderRadius: 'var(--radius-max)',
              backgroundColor: contenido.color,
              marginBottom: '4px',
            }}
          >
            <Typography
              className="label-small-semibold"
              color="var(--always-white)"
            >
              {contenido.etiqueta}
            </Typography>
          </Box>

          <Typography className="h3" color="var(--ink)">
            {contenido.titulo}
          </Typography>
        </Box>

        <Box
          component="button"
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          sx={{
            appearance: 'none',
            border: 'none',
            cursor: 'pointer',
            flexShrink: 0,
            width: '28px',
            height: '28px',
            borderRadius: 'var(--radius-max)',
            backgroundColor: 'var(--accent-150)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <IconClose width={14} height={14} color="var(--ink-2)" />
        </Box>
      </Box>

      <Stack spacing="4px">
        {contenido.lineas.map((linea) => (
          <Typography
            key={linea}
            className="body-small-regular"
            color="var(--ink-2)"
          >
            {linea}
          </Typography>
        ))}
      </Stack>

      {contenido.lista && contenido.lista.length > 0 && (
        <Stack spacing="6px">
          {contenido.lista.map((item, index) => (
            <Box key={item} sx={{ display: 'flex', gap: '8px' }}>
              <Typography
                className="label-small-semibold"
                color={contenido.color}
                sx={{ minWidth: '14px', paddingTop: '2px' }}
              >
                {contenido.numerada ? index + 1 : '·'}
              </Typography>
              <Typography className="body-small-regular" color="var(--ink)">
                {item}
              </Typography>
            </Box>
          ))}
        </Stack>
      )}
    </Box>
  );
};

export default DetalleSeleccion;
