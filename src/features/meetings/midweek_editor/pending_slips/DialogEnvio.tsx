import { ReactNode } from 'react';
import { Box, Stack } from '@mui/material';
import { PendingSlip } from '@services/app/pending_s89';
import { IconInfo, IconShare } from '@components/icons';
import Button from '@components/button';
import Dialog from '@components/dialog';
import InfoTip from '@components/info_tip';
import Typography from '@components/typography';
import useEnvioHojita from './useEnvioHojita';

/**
 * Mandar una hojita: el chat y el PDF, en ese orden.
 *
 * ── Por qué son DOS toques y no uno ──────────────────────────────────────
 *
 * `navigator.share` admite mandar texto y fichero juntos, pero WhatsApp
 * DESCARTA el texto cuando el fichero es un documento. Un mensaje que se pierde
 * en silencio es peor que dos toques, así que el texto va por `wa.me` —que deja
 * el mensaje escrito, sin enviarlo— y el PDF por la hoja del sistema. El último
 * toque, el de enviar, lo sigue dando una persona.
 *
 * Están numerados porque son un camino, no dos alternativas: la mitad del
 * trabajo de esta pantalla es que no haya que acordarse del orden.
 *
 * Sin teléfono no se desactiva nada ni se falla al pulsar: desaparece el paso 1
 * —que es lo único que necesita el número— y queda el 2, que sirve igual
 * eligiendo el contacto a mano.
 */
const DialogEnvio = ({
  slip,
  detalle,
  onClose,
  onEnviada,
  onSaltar,
  restantes,
}: {
  slip: PendingSlip | null;
  /** "Parte 4 · miércoles 3 de septiembre" — lo arma la lista, que ya lo tiene. */
  detalle: string;
  onClose: VoidFunction;
  /** Se llama cuando la hojita ha salido de la app. */
  onEnviada?: VoidFunction;
  /** Pasar a la siguiente sin mandar esta. */
  onSaltar?: VoidFunction;
  /** Cuántas quedan detrás de esta, para el pie de la cola. */
  restantes?: number;
}) => {
  const {
    nombre,
    nombreCompleto,
    telefono,
    mensaje,
    enlace,
    listo,
    preparando,
    compartiendo,
    compartir,
  } = useEnvioHojita(slip);

  const esAyudante = slip?.papel === 'ayudante';

  const handleCompartir = async () => {
    const resultado = await compartir();

    // Solo avanza si la hojita ha salido de verdad. Cerrar la hoja del sistema
    // sin elegir destino deja todo como estaba, que es lo que quiso decir quien
    // la cerró.
    if (resultado === 'compartido' || resultado === 'descargado') {
      onEnviada?.();
    }
  };

  return (
    <Dialog open={Boolean(slip)} onClose={onClose}>
      <Typography className="h2" color="var(--ink)">
        {nombreCompleto || nombre}
      </Typography>

      <Typography
        className="body-small-regular"
        color="var(--ink-2)"
        sx={{ marginTop: '4px' }}
      >
        {esAyudante ? `Ayudante · ${detalle}` : detalle}
      </Typography>

      {/* El mensaje, tal cual va a quedar escrito en el chat. Se enseña porque
          es lo que se manda en nombre de uno: leerlo antes de abrir WhatsApp es
          más rápido que corregirlo después. */}
      <Box
        sx={{
          marginTop: '16px',
          padding: '16px',
          borderRadius: 'var(--shape-sm)',
          backgroundColor: 'var(--surface-2)',
        }}
      >
        <Typography
          className="body-small-regular"
          color="var(--ink)"
          sx={{ whiteSpace: 'pre-line' }}
        >
          {conNegritas(mensaje)}
        </Typography>
      </Box>

      {!telefono && (
        <Box sx={{ marginTop: '16px' }}>
          <InfoTip
            isBig={false}
            color="warning"
            icon={<IconInfo color="var(--orange-dark)" />}
            text={`${nombre || 'Esta persona'} no tiene teléfono en su ficha, así que no se puede abrir el chat. La hojita se puede compartir igual eligiendo el contacto a mano.`}
          />
        </Box>
      )}

      <Stack spacing="16px" sx={{ marginTop: '24px' }}>
        {enlace && (
          <Paso numero="1" texto="Abre WhatsApp con el mensaje ya escrito">
            {/* `_blank` para que WhatsApp se abra AL LADO y la app se quede
                donde está: sin él, el enlace navega en la misma pestaña y en la
                app instalada la cola se pierde entre un hermano y el siguiente,
                que es justo lo que esta pantalla existe para evitar. */}
            <Button variant="main" href={enlace} target="_blank" rel="noopener">
              Abrir el chat
            </Button>
          </Paso>
        )}

        <Paso
          numero={enlace ? '2' : undefined}
          texto={
            preparando
              ? 'Preparando la hojita…'
              : 'Adjunta la hojita en ese mismo chat'
          }
        >
          <Button
            variant={enlace ? 'tertiary' : 'main'}
            onClick={handleCompartir}
            disabled={!listo || compartiendo}
            startIcon={<IconShare color="var(--accent-dark)" />}
          >
            Compartir la hojita
          </Button>
        </Paso>
      </Stack>

      <Box
        sx={{
          marginTop: '24px',
          paddingTop: '16px',
          borderTop: '1px solid var(--line)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <Typography className="label-small-regular" color="var(--ink-3)">
          {typeof restantes === 'number' && restantes > 0
            ? restantes === 1
              ? 'Se marca como enviada al compartir. Después queda 1 más'
              : `Se marca como enviada al compartir. Después quedan ${restantes} más`
            : 'Se marca como enviada al compartir'}
        </Typography>

        <Box sx={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          {/* Saltar existe porque no todas las hojitas se mandan por aquí: a
              veces se entrega en mano, o el hermano está delante. Sin esto, la
              única salida sería cerrar la cola entera y volver a buscar dónde
              se quedó. */}
          {onSaltar && typeof restantes === 'number' && restantes > 0 && (
            <Button variant="secondary" onClick={onSaltar} disableAutoStretch>
              Saltar
            </Button>
          )}

          <Button variant="tertiary" onClick={onClose} disableAutoStretch>
            Cerrar
          </Button>
        </Box>
      </Box>
    </Dialog>
  );
};

/**
 * La vista previa, con las negritas puestas como se van a leer.
 *
 * El mensaje del ayudante lleva `*ayudante*` porque así WhatsApp lo pone en
 * negrita en el chat. Aquí, en crudo, los asteriscos parecen una errata —y
 * quien lo lea antes de mandarlo va a pensar que la app escribe mal—, así que
 * la vista previa hace lo mismo que hará WhatsApp: enseñarlo en negrita.
 *
 * Es solo eso, negrita entre asteriscos, que es lo único que el mensaje usa.
 * No es un intérprete de todo el formato de WhatsApp ni hace falta que lo sea.
 */
const conNegritas = (texto: string): ReactNode[] =>
  texto
    .split(/(\*[^*\n]+\*)/g)
    .map((trozo, indice) =>
      trozo.startsWith('*') && trozo.endsWith('*') && trozo.length > 2 ? (
        <strong key={indice}>{trozo.slice(1, -1)}</strong>
      ) : (
        trozo
      )
    );

/**
 * Un paso del camino: su número, qué consigue, y el botón que lo hace.
 *
 * El rótulo ARRIBA y el botón DEBAJO a lo ancho, no los dos en la misma fila.
 * En una fila el botón se lleva medio diálogo y deja el texto en una columna de
 * dos palabras: «Adjunta / la hojita / en ese / mismo / chat», cinco renglones
 * para una frase. Se vio en el móvil, que es donde se usa esto.
 */
const Paso = ({
  numero,
  texto,
  children,
}: {
  numero?: string;
  texto: string;
  children: ReactNode;
}) => (
  <Box>
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '8px',
      }}
    >
      {numero && (
        // Cuadrito con relleno tintado y sin borde (DESIGN_SYSTEM §6.4b).
        <Box
          sx={{
            flexShrink: 0,
            width: '24px',
            height: '24px',
            borderRadius: 'var(--shape-xs)',
            backgroundColor: 'var(--accent-150)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography
            className="label-small-semibold"
            color="var(--accent-dark)"
          >
            {numero}
          </Typography>
        </Box>
      )}

      <Typography className="label-small-regular" color="var(--ink-2)">
        {texto}
      </Typography>
    </Box>

    {children}
  </Box>
);

export default DialogEnvio;
