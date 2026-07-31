import { ReactNode } from 'react';
import { Box } from '@mui/material';

/**
 * El pie de un diálogo: la acción y el "Cancelar".
 *
 * ── Por qué existe ───────────────────────────────────────────────────────
 *
 * La app tenía DOS idiomas para el mismo pie, y ninguno era minoritario:
 *
 *   · **Apilado** — los dos botones a lo ancho, el que actúa arriba y
 *     "Cancelar" debajo. Es el de las once carpetas `*_delete`, el de enviar
 *     el informe, el del aviso de modo de prueba…
 *   · **En fila a la derecha** — "Cancelar" y luego la acción, pegados al
 *     canto derecho. Es el de Territorios, Documentos, Limpieza y unos
 *     veinticinco ficheros más.
 *
 * O sea que borrar un grupo y borrar un territorio —el mismo acto, con el
 * mismo riesgo— se pedían de dos formas distintas según en qué pantalla
 * estuvieras.
 *
 * ── Y por qué se queda con los dos ───────────────────────────────────────
 *
 * Porque cada uno tiene razón en su sitio. Apilado y a lo ancho es lo correcto
 * en un móvil: son dos objetivos grandes para el pulgar, en la parte de abajo
 * de la pantalla. En fila a la derecha es lo correcto en escritorio: un botón
 * de "Cancelar" de 496px de ancho no parece un botón, parece una barra.
 *
 * Así que el pie es uno solo y cambia de forma con el sitio, no con la
 * pantalla que lo use.
 *
 * ── El orden ─────────────────────────────────────────────────────────────
 *
 * En el código va siempre primero la ACCIÓN y después "Cancelar". Apilado sale
 * en ese orden —la acción arriba, como en el sistema— y en fila se le da la
 * vuelta con `row-reverse`, que la deja a la derecha, que es donde se espera en
 * escritorio. Una sola forma de escribirlo, las dos convenciones respetadas.
 */
const DialogFooter = ({
  action,
  cancel,
}: {
  /** El botón que HACE algo: Guardar, Borrar, Enviar. */
  action: ReactNode;
  /** El de salirse. Opcional: hay diálogos con una sola salida. */
  cancel?: ReactNode;
}) => (
  <Box
    sx={{
      display: 'flex',
      width: '100%',
      gap: '8px',
      flexDirection: { mobile: 'column', tablet600: 'row-reverse' },
      // En `row-reverse` el "principio" del eje es la DERECHA, así que esto
      // los pega al canto derecho.
      justifyContent: { mobile: 'flex-start', tablet600: 'flex-start' },
      alignItems: { mobile: 'stretch', tablet600: 'center' },
    }}
  >
    {action}
    {cancel}
  </Box>
);

export default DialogFooter;
