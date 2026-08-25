import { useMemo, useRef, useState } from 'react';
import { Box, Stack, Dialog as MUIDialog } from '@mui/material';
import Dialog from '@components/dialog';
import TextField from '@components/textfield';
import { useAtomValue } from 'jotai';
import Button from '@components/button';
import Typography from '@components/typography';
import { IconClose } from '@components/icons';
import TerritoryMap from '../map/TerritoryMap';
import { congIDState } from '@states/settings';
import { Territory, TerritorySection } from '@definition/territories';
import { updateTerritoryPartial } from '@services/firebase/territories';
import {
  cortarTerritorio,
  mitadDeLaRaya,
  MOTIVO_TEXTO,
  Pos,
  puntoDentro,
} from '@services/app/territory_split';
import { territoryLabel } from '@services/app/territories';
import { displaySnackNotification } from '@services/states/app';

/**
 * Dividir un territorio en partes, cortando con una raya.
 *
 * Sirve para dos cosas, y por eso la pantalla no las explica: las enseña con
 * ejemplos al ponerle nombre a cada parte. Una es repartir un territorio
 * grande entre varios en la misma salida ("con Ana", "con Pedro"), que hasta
 * ahora se explicaba señalando con el dedo en la puerta del Salón. La otra es
 * trabajárselo uno por partes ("esta semana", "la que viene"), que se hacía
 * de memoria y siempre quedaba una calle sin tocar.
 *
 * Se corta, no se dibuja: una raya que cruza el territorio lo parte en dos y
 * las dos partes siguen siendo el territorio entero. Dibujando áreas a mano
 * siempre queda un hueco entre ellas, y ese hueco son portales a los que no
 * llama nadie. La comprobación está en `territory_split`.
 */

/**
 * Colores de las secciones. Van a pelo y no por tokens a propósito: se pintan
 * sobre las teselas del mapa, que no siguen el tema de la app, y tienen que
 * distinguirse entre ellas —es lo único que dice cuál es cada parte.
 */
const COLORES = [
  '#2563EB',
  '#DC2626',
  '#059669',
  '#D97706',
  '#7C3AED',
  '#0891B2',
];

const LETRAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const siguienteNombre = (usados: string[]): string =>
  LETRAS.split('').find((l) => !usados.includes(l)) ?? `${usados.length + 1}`;

type Props = {
  open: boolean;
  territory: Territory;
  onClose: () => void;
};

const DialogDividir = ({ open, territory, onClose }: Props) => {
  const congId = useAtomValue(congIDState);

  const [secciones, setSecciones] = useState<TerritorySection[]>(
    territory.secciones ?? []
  );
  const [raya, setRaya] = useState<Pos[]>([]);
  const [aviso, setAviso] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  // Cada corte apila el estado anterior: deshacer es volver a la foto de
  // antes, no intentar "descortar".
  const [anteriores, setAnteriores] = useState<TerritorySection[][]>([]);
  // El hueco que hay que dejar libre abajo al encuadrar, medido UNA vez.
  //
  // Si se le pasa la altura viva de la barra, el mapa se reencuadra cada vez
  // que la barra crece o mengua —y crece al poner el primer punto, y otra vez
  // al cortar—. Es decir: te acercas para seguir una calle, tocas, y el mapa
  // se va solo. Se mide al montar, que es cuando hace falta para que el
  // territorio no salga tapado, y a partir de ahí manda el dedo.
  const insetRef = useRef(0);
  const [inset, setInset] = useState(0);
  const medirBarra = (el: HTMLDivElement | null) => {
    if (el && insetRef.current === 0) {
      insetRef.current = el.offsetHeight;
      setInset(el.offsetHeight);
    }
  };

  // La parte que se está renombrando, y lo que lleva escrito.
  const [renombrando, setRenombrando] = useState<TerritorySection | null>(null);
  const [nombreNuevo, setNombreNuevo] = useState('');

  const sinGuardar =
    JSON.stringify(secciones) !== JSON.stringify(territory.secciones ?? []);

  const puntos = raya.length;

  const cortar = () => {
    if (puntos < 2) return;
    setAviso(null);

    // Sin secciones todavía, se corta el territorio entero.
    if (secciones.length === 0) {
      const resultado = cortarTerritorio(territory.geometry!, raya);
      if (resultado.ok === false) {
        setAviso(MOTIVO_TEXTO[resultado.motivo]);
        return;
      }

      setAnteriores((prev) => [...prev, secciones]);
      setSecciones([
        {
          id: crypto.randomUUID(),
          nombre: 'A',
          color: COLORES[0],
          geometry: resultado.piezas[0],
        },
        {
          id: crypto.randomUUID(),
          nombre: 'B',
          color: COLORES[1],
          geometry: resultado.piezas[1],
        },
      ]);
      setRaya([]);
      return;
    }

    // Ya dividido: se parte la parte por la que pasa el CENTRO de la raya.
    //
    // El primer intento fue "la que la raya cruza", y no vale: la raya
    // se prolonga sola por las puntas (para no obligar a trazar por fuera del
    // territorio), así que una raya dibujada dentro de una parte acaba
    // cruzando también al de al lado, y entonces no se cortaba nada — decía
    // que la raya tocaba varios. Por dónde pasa el centro no tiene esa duda:
    // se parte aquello por encima de lo que estás trazando.
    const medio = mitadDeLaRaya(raya);
    const indice = secciones.findIndex((seccion) =>
      puntoDentro(medio, seccion.geometry)
    );

    if (indice < 0) {
      setAviso(
        'Traza la raya por encima de la parte que quieras partir: se parte aquella por la que pasa el centro de la raya.'
      );
      return;
    }

    const resultado = cortarTerritorio(secciones[indice].geometry, raya);
    if (resultado.ok === false) {
      setAviso(MOTIVO_TEXTO[resultado.motivo]);
      return;
    }

    const original = secciones[indice];
    const nombres = secciones.map((s) => s.nombre);
    const nuevoNombre = siguienteNombre(nombres);
    const colorLibre =
      COLORES.find((c) => !secciones.some((s) => s.color === c)) ??
      COLORES[secciones.length % COLORES.length];

    setAnteriores((prev) => [...prev, secciones]);
    setSecciones([
      ...secciones.slice(0, indice),
      { ...original, geometry: resultado.piezas[0] },
      {
        id: crypto.randomUUID(),
        nombre: nuevoNombre,
        color: colorLibre,
        geometry: resultado.piezas[1],
      },
      ...secciones.slice(indice + 1),
    ]);
    setRaya([]);
  };

  const deshacerCorte = () => {
    const previo = anteriores[anteriores.length - 1];
    if (!previo) return;
    setAnteriores((prev) => prev.slice(0, -1));
    setSecciones(previo);
    setRaya([]);
    setAviso(null);
  };

  const guardar = async () => {
    setGuardando(true);
    try {
      await updateTerritoryPartial(congId, territory.id, {
        secciones,
        updatedAt: new Date().toISOString(),
      });
      displaySnackNotification({
        header:
          secciones.length > 0
            ? `${territoryLabel(territory)}, en ${secciones.length} partes`
            : 'División quitada',
        message:
          secciones.length > 0
            ? 'Ya se ve en el mapa. Con "Compartir enlace" puedes pasar el QR y que cada uno vea la suya.'
            : 'El territorio vuelve a ir entero.',
        severity: 'success',
      });
      onClose();
    } catch (err) {
      console.error(err);
      displaySnackNotification({
        header: 'No se ha podido guardar',
        message: 'Comprueba tu conexión e inténtalo de nuevo.',
        severity: 'error',
      });
    } finally {
      setGuardando(false);
    }
  };

  const renombrar = () => {
    if (!renombrando) return;
    const limpio = nombreNuevo.trim().slice(0, 24);
    if (limpio.length > 0) {
      setSecciones((prev) =>
        prev.map((s) =>
          s.id === renombrando.id ? { ...s, nombre: limpio } : s
        )
      );
    }
    setRenombrando(null);
  };

  const instrucciones = useMemo(() => {
    if (puntos === 0) {
      return secciones.length === 0
        ? 'Toca el mapa para ir marcando la raya. Entre toque y toque puedes mover y acercar para seguir una calle o un camino.'
        : 'Toca el mapa para partir una de las partes, o guarda así.';
    }
    if (puntos === 1) return 'Marca al menos otro punto al otro lado.';
    return `${puntos} puntos. La raya tiene que cruzar de lado a lado.`;
  }, [puntos, secciones.length]);

  return (
    <MUIDialog
      fullScreen
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: { backgroundColor: 'var(--white)', overflow: 'hidden', margin: 0 },
      }}
    >
      <Box
        sx={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--white)',
        }}
      >
        <Box sx={{ flex: 1, position: 'relative', minHeight: 0 }}>
          <TerritoryMap
            geometry={territory.geometry}
            color="var(--accent-main)"
            height="100%"
            borderRadius={0}
            secciones={secciones}
            raya={raya}
            onTocarMapa={(punto) => {
              setAviso(null);
              setRaya((prev) => [...prev, punto]);
            }}
            bottomInset={inset}
          />

          <Box
            component="button"
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            sx={{
              position: 'absolute',
              top: 'max(16px, env(safe-area-inset-top))',
              left: 16,
              zIndex: 1200,
              width: 44,
              height: 44,
              borderRadius: 'var(--shape-full)',
              // Negro literal: va sobre las teselas del mapa, que son claras
              // siempre, no sobre el fondo del tema.
              backgroundColor: 'rgba(0,0,0,0.45)',
              backdropFilter: 'blur(12px)',
              border: '0.5px solid rgba(255,255,255,0.18)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              appearance: 'none',
              padding: 0,
            }}
          >
            <IconClose color="var(--always-white)" width={16} height={16} />
          </Box>
        </Box>

        {/* ─── La barra de abajo ────────────────────────────────────────── */}
        <Box
          ref={medirBarra}
          sx={{
            flexShrink: 0,
            padding: '16px 24px',
            paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
            borderTop: '0.5px solid var(--line)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            backgroundColor: 'var(--white)',
          }}
        >
          <Box>
            <Typography className="h4" color="var(--ink)">
              Dividir {territoryLabel(territory)}
            </Typography>
            <Typography
              className="body-small-regular"
              color="var(--ink-2)"
              sx={{ display: 'block', mt: '2px' }}
            >
              {instrucciones}
            </Typography>
          </Box>

          {/* Qué partes hay ahora mismo, con su color: es lo que se mira para
              decir "tú la A y yo la B". */}
          {secciones.length > 0 && (
            <Stack
              direction="row"
              spacing={1}
              sx={{ flexWrap: 'wrap' }}
              useFlexGap
            >
              {/* Por orden alfabético: el corte mete cada parte nueva al lado
                  del que ha partido, que es lo suyo para el mapa, pero en una
                  lista "A, C, B" se lee como un error. */}
              {[...secciones]
                .sort((a, b) => a.nombre.localeCompare(b.nombre))
                .map((seccion) => (
                  <Box
                    key={seccion.id}
                    component="button"
                    type="button"
                    aria-label={`Cambiar el nombre de ${seccion.nombre}`}
                    onClick={() => {
                      setRenombrando(seccion);
                      setNombreNuevo(seccion.nombre);
                    }}
                    className="active-press"
                    sx={{
                      appearance: 'none',
                      font: 'inherit',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 10px',
                      borderRadius: 'var(--shape-full)',
                      border: '1px solid var(--line)',
                      backgroundColor: 'var(--grey-100)',
                    }}
                  >
                    <Box
                      aria-hidden
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: 'var(--shape-full)',
                        backgroundColor: seccion.color,
                      }}
                    />
                    <Typography
                      className="label-small-medium"
                      color="var(--ink)"
                    >
                      {seccion.nombre}
                    </Typography>
                  </Box>
                ))}
            </Stack>
          )}

          {secciones.length > 0 && (
            <Typography className="label-small-regular" color="var(--ink-3)">
              Toca una parte para ponerle nombre: «Con Ana», «Esta semana»… Las
              letras valen igual.
            </Typography>
          )}

          {aviso && (
            <Typography
              className="body-small-regular"
              sx={{
                color: 'var(--orange-dark)',
                backgroundColor: 'rgba(var(--orange-main-base), 0.10)',
                border: '1px solid rgba(var(--orange-main-base), 0.25)',
                borderRadius: 'var(--shape-md)',
                padding: '10px 12px',
              }}
            >
              {aviso}
            </Typography>
          )}

          <Stack
            direction="row"
            spacing={1}
            sx={{ flexWrap: 'wrap' }}
            useFlexGap
          >
            {puntos > 0 && (
              <Button
                variant="secondary"
                disableAutoStretch
                onClick={() => setRaya((prev) => prev.slice(0, -1))}
              >
                Quitar punto
              </Button>
            )}
            {anteriores.length > 0 && puntos === 0 && (
              <Button
                variant="secondary"
                disableAutoStretch
                onClick={deshacerCorte}
              >
                Deshacer corte
              </Button>
            )}
            {secciones.length > 0 && puntos === 0 && (
              <Button
                variant="secondary"
                color="red"
                disableAutoStretch
                onClick={() => {
                  setAnteriores((prev) => [...prev, secciones]);
                  setSecciones([]);
                  setAviso(null);
                }}
              >
                Quitar la división
              </Button>
            )}
          </Stack>

          {puntos >= 2 ? (
            <Button variant="main" onClick={cortar}>
              Cortar por aquí
            </Button>
          ) : (
            <Button
              variant="main"
              disabled={guardando || !sinGuardar}
              onClick={guardar}
            >
              {guardando
                ? 'Guardando…'
                : secciones.length > 0
                  ? `Guardar ${secciones.length} partes`
                  : 'Guardar'}
            </Button>
          )}
        </Box>
      </Box>

      {/* Ponerle nombre a la parte.
        Las letras valen para partir, pero lo que se dice en la puerta del
        Salón es "vete tú con Ana": con el nombre del que lo lleva puesto en
        la parte, el mapa compartido ya dice el reparto entero sin explicar
        nada. */}
      <Dialog open={Boolean(renombrando)} onClose={() => setRenombrando(null)}>
        <Stack spacing={2} sx={{ width: '100%' }}>
          <Typography className="h2" color="var(--ink)">
            Nombre de la parte
          </Typography>
          <Typography className="body-small-regular" color="var(--ink-2)">
            Quien la lleva, o cuándo la vas a hacer. Es lo que se ve en el mapa.
          </Typography>
          <TextField
            label="Nombre"
            value={nombreNuevo}
            onChange={(e) => setNombreNuevo(e.target.value.slice(0, 24))}
            slotProps={{ htmlInput: { maxLength: 24 } }}
          />
          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button
              variant="secondary"
              disableAutoStretch
              onClick={() => setRenombrando(null)}
            >
              Cancelar
            </Button>
            <Button
              variant="main"
              disableAutoStretch
              disabled={nombreNuevo.trim().length === 0}
              onClick={renombrar}
            >
              Guardar nombre
            </Button>
          </Stack>
        </Stack>
      </Dialog>
    </MUIDialog>
  );
};

export default DialogDividir;
