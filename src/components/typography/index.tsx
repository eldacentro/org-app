import { Typography as MUITypography } from '@mui/material';
import { TypographyTypeProps } from './index.types';

/** Lo que declara una clase de texto de la app, y por tanto lo único que le
 *  puede ganar a un `sx` escrito a mano. */
const PROPIEDADES_DE_TEXTO = [
  'fontSize',
  'fontWeight',
  'fontStyle',
  'fontStretch',
  'letterSpacing',
  'lineHeight',
  'textTransform',
  'textDecoration',
  'textIndent',
] as const;

/**
 * El texto de la app.
 *
 * ── La trampa que resuelve el `&&` ───────────────────────────────────────
 *
 * Este componente SIEMPRE le pone una clase de texto al elemento: la que le
 * pasen o, si no, `body-regular`. Y esa clase declara el tamaño, el peso, el
 * espaciado, el interlineado y la caja de mayúsculas.
 *
 * La clase de la app y la que genera `sx` tienen la MISMA especificidad —una
 * clase cada una—, así que decide el orden en la hoja: `global.css` se carga
 * después y gana. Resultado: escribir `sx={{ fontWeight: 600 }}` en un
 * `<Typography>` no hacía absolutamente nada, y la única forma de que surtiera
 * efecto era `!important` o un `style=` en línea.
 *
 * Comprobado en el navegador con dos párrafos idénticos y la misma regla de
 * 8px: con clase de texto se ve a 15; sin ella, a 8.
 *
 * Y no era teórico: había **150 declaraciones** repartidas por la app que el
 * navegador tiraba a la basura —54 pesos, 26 interlineados, 26 espaciados, 21
 * cajas de mayúsculas y 21 tamaños—. La baldosa de fecha de Mis asignaciones
 * pedía su abreviatura a 8px, extranegrita y en mayúscula, y se veía a 15px,
 * peso normal y tal cual.
 *
 * El `&&` duplica la clase de `sx`, que pasa a valer por dos y le gana a la
 * clase de texto. Se aplica SOLO a las propiedades que la clase declara: todo
 * lo demás —color, márgenes, `transition`— nunca estuvo en disputa y sigue
 * exactamente igual.
 *
 * Quien quiera la clase entera, que no escriba esas propiedades; quien las
 * escriba, es porque quiere apartarse de ella, que es justo lo que ahora pasa.
 */
const Typography = (props: TypographyTypeProps) => {
  const color = props.color || 'var(--black)';
  const className = props.className || 'body-regular';

  const { sx } = props;

  // Solo se toca el `sx` si trae alguna propiedad en disputa. Si no, se pasa
  // tal cual y este componente sigue siendo exactamente el de antes.
  const sxConPeso =
    sx && typeof sx === 'object' && !Array.isArray(sx)
      ? (() => {
          const enDisputa: Record<string, unknown> = {};
          const resto: Record<string, unknown> = {};

          for (const [clave, valor] of Object.entries(sx)) {
            if ((PROPIEDADES_DE_TEXTO as readonly string[]).includes(clave)) {
              enDisputa[clave] = valor;
            } else {
              resto[clave] = valor;
            }
          }

          return Object.keys(enDisputa).length === 0
            ? sx
            : { ...resto, '&&': enDisputa };
        })()
      : sx;

  return (
    <MUITypography
      {...props}
      sx={sxConPeso}
      className={className}
      color={color}
    >
      {props.children}
    </MUITypography>
  );
};

export default Typography;
