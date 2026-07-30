import { Chip } from '@mui/material';
import { IconCancelFilled } from '@icons/index';
import { MiniChipProps } from './index.types';

/**
 * La píldora de algo ELEGIDO: un miembro de la familia, un discurso de un
 * orador, un idioma de un grupo. Dentro de un campo lleva su aspa para
 * quitarlo; fuera de un campo es solo una marca que se lee.
 *
 * ── Por qué es neutra ────────────────────────────────────────────────────
 *
 * Iba en azul —relleno `--accent-150` y BORDE `--accent-dark`—, y el borde no
 * era un capricho: hacía falta porque el relleno de la píldora era el mismo
 * color que el fondo del campo donde vive, así que sin canto no se veía dónde
 * acababa.
 *
 * Ahora el relleno es un escalón más oscuro que el campo (`--accent-200`), que
 * es lo que la separa del fondo, y el borde sobra. El texto pasa a la tinta
 * normal: lo elegido no es un aviso ni un estado, es un dato más de un
 * formulario, y el azul lo pintaba con más voz de la que le toca.
 *
 * Son los tokens de la app y no un gris a secas a propósito: el chip que trae
 * MUI de fábrica —el que salía en Editar territorio— es gris claro fijo, y en
 * modo oscuro se queda gris claro sobre fondo oscuro.
 */
const MiniChip = ({
  label,
  edit = false,
  onDelete,
  disabled = false,
}: MiniChipProps) => {
  return (
    <Chip
      disabled={disabled}
      className="body-small-regular"
      label={label}
      onDelete={edit ? () => onDelete() : null}
      sx={{
        padding: edit ? '4px 4px 4px 12px' : '4px 12px',
        color: 'var(--ink)',
        borderRadius: 'var(--shape-full)',
        border: 'none',
        background: 'var(--accent-200)',
        minHeight: '26px',
        height: 'auto',
        '.MuiChip-label': {
          padding: edit ? '0px 2px 0px 0px' : 0,
        },
        '& svg': { height: '16px', width: '16px', cursor: 'pointer' },
        '& svg, & svg g, & svg g path': {
          fill: 'var(--ink-2)',
        },
        // El aspa se apaga hasta que se va a por ella: dentro de un campo con
        // cinco píldoras, cinco aspas a plena tinta compiten con los nombres,
        // que es lo que de verdad hay que leer.
        '& .MuiChip-deleteIcon:hover svg, & .MuiChip-deleteIcon:hover svg g, & .MuiChip-deleteIcon:hover svg g path':
          {
            fill: 'var(--ink)',
          },
      }}
      deleteIcon={
        <div
          style={{
            margin: 0,
            padding: 0,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <IconCancelFilled />
        </div>
      }
    />
  );
};

export default MiniChip;
