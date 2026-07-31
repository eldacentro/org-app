import { SxProps, Theme } from '@mui/material';

/**
 * Cómo se ven las pestañas de la app cuando hay que usar el `<Tabs>` de MUI a
 * pelo.
 *
 * ── Cuándo se usa esto y cuándo no ───────────────────────────────────────
 *
 * Lo normal es `@components/tabs` o `@components/scrollable_tabs`, que además
 * de pintar la tira se encargan de los paneles. Pero esos piden los contenidos
 * como `tabs: [{ label, Component }]`, y hay pantallas —la configuración de
 * Exhibidores y la de Salidas de predicación— donde el contenido de cada
 * pestaña se pinta en otro sitio. Ahí hace falta el `<Tabs>` de MUI y solo la
 * tira.
 *
 * El problema es que entonces cada pantalla se pinta su propia tira. Estas dos,
 * que son gemelas, tenían el MISMO bloque de cincuenta y siete líneas copiado,
 * de las cuales solo once eran distintas —el estado y las etiquetas—. Cuarenta
 * y seis líneas de estilo duplicadas es exactamente cómo dos pantallas
 * empiezan iguales y acaban distintas.
 *
 * ── Lo que dibuja ────────────────────────────────────────────────────────
 *
 * Sin subrayado: lo elegido se marca con el tinte de marca, igual que la tira
 * de semanas, `scrollable_tabs` y el selector de vista. Antes había un
 * subrayado azul de 3px con el texto en azul, que era un dibujo de "elegido"
 * más y el que menos se parecía al de al lado.
 */
export const appTabsSx: SxProps<Theme> = {
  width: '100%',
  maxWidth: '100%',
  minHeight: 'unset',
  padding: '4px 0',
  '& .MuiTabs-scroller': { overflowX: 'auto !important' },
  '& .MuiTabs-flexContainer': { gap: '4px' },
  '& .MuiTabs-indicator': {
    backgroundColor: 'transparent',
    height: 0,
  },
  '& .MuiTab-root': {
    minHeight: '40px',
    // La app no usa versalitas. Esto ya estaba, pero las etiquetas venían
    // ESCRITAS en mayúsculas, así que la regla no servía de nada: la
    // mayúscula no estaba en el estilo, estaba en el texto.
    textTransform: 'none',
    px: '16px',
    fontSize: '13px',
    transition:
      'background-color var(--motion-fast) var(--ease-standard), color var(--motion-fast) var(--ease-standard)',
  },
  '& .MuiTab-root.Mui-selected': {
    color: 'var(--state-selected-ink)',
    backgroundColor: 'var(--state-selected)',
    borderRadius: 'var(--shape-full)',
    fontWeight: 600,
    '&:hover': {
      backgroundColor: 'var(--state-selected-strong)',
    },
  },
  '& .MuiTab-root:not(.Mui-selected)': {
    color: 'var(--ink-3)',
    '&:hover': {
      backgroundColor: 'var(--state-hover)',
      borderRadius: 'var(--shape-full)',
    },
  },
};
