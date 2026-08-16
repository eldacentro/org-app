import { Box } from '@mui/material';
import { useAtom, useAtomValue } from 'jotai';
import { formatoHojitaState } from '@states/schedules';
import { cookiesConsentState } from '@states/app';
import SegmentedControl from '@components/segmented_control';
import Typography from '@components/typography';

/**
 * En qué formato sale la hojita al mandarla por WhatsApp.
 *
 * ── Por qué es un ajuste y no una decisión tomada ────────────────────────
 *
 * La imagen es mejor para casi todo el mundo —se ve en el chat, sin abrir
 * nada—, pero la S-89 lleva líneas de letra pequeña y WhatsApp recomprime lo
 * que le llega. Si en algún teléfono esa letra no se lee, hace falta poder
 * volver al PDF sin esperar a que lo arreglemos nosotros. Y quien imprime las
 * hojitas para entregarlas en mano quiere el documento, no una foto.
 *
 * Un control de dos segmentos y no un interruptor: son dos formatos con nombre,
 * no una cosa que se enciende y se apaga. «Hojita en imagen: sí/no» obligaría a
 * saber qué es lo que hay al otro lado del «no».
 *
 * El ajuste es de este dispositivo, como la plantilla de S-89: es la costumbre
 * de quien reparte. Ver `formatoHojitaState`.
 */
const FormatoHojita = () => {
  const [formato, setFormato] = useAtom(formatoHojitaState);
  const cookiesConsent = useAtomValue(cookiesConsentState);

  const opciones = ['Imagen', 'PDF'] as const;

  const handleChange = (indice: number) => {
    const valor = indice === 1 ? 'pdf' : 'imagen';

    setFormato(valor);

    if (cookiesConsent) {
      localStorage.setItem('organized_formato_hojita', valor);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <Typography className="body-regular" color="var(--ink)">
        Formato de la hojita
      </Typography>

      <Typography className="body-small-regular" color="var(--ink-2)">
        {formato === 'imagen'
          ? 'Se ve en el propio chat, sin abrir nada. Cámbialo a PDF si hace falta imprimirla o si la letra pequeña no se lee bien.'
          : 'Llega como documento, que es el formato bueno para imprimir. En imagen se vería directamente en el chat.'}
      </Typography>

      <Box sx={{ alignSelf: 'flex-start', marginTop: '4px' }}>
        <SegmentedControl
          ariaLabel="Formato de la hojita"
          tabs={[...opciones]}
          active={formato === 'pdf' ? 1 : 0}
          onChange={handleChange}
        />
      </Box>
    </Box>
  );
};

export default FormatoHojita;
