import { displaySnackNotification } from '@services/states/app';
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  forwardRef,
  type ReactElement,
  type ReactNode,
  type Ref,
} from 'react';
import { useConfirm } from '@components/confirm_dialog';
import {
  Box,
  Stack,
  Dialog as MUIDialog,
  Slide,
  IconButton,
} from '@mui/material';
import { TransitionProps } from '@mui/material/transitions';
import { useAtomValue } from 'jotai';
import { PhotoProvider, PhotoView } from 'react-photo-view';
import 'react-photo-view/dist/react-photo-view.css';
import Button from '@components/button';
import Typography from '@components/typography';
import Badge from '@components/badge';
import {
  IconEdit,
  IconClose,
  IconMapOverview,
  IconGroups,
  IconChevronRight,
} from '@components/icons';
import { TagChip, ViviendasTag } from './ui';
import { usePersonName } from './usePersonName';
import { BadgeColor } from '@definition/app';
import TerritoryMap from './map/TerritoryMap';
import DireccionesTab from './DireccionesTab';
import DialogCompartir from './dialogs/DialogCompartir';
import DialogDividir from './dialogs/DialogDividir';
import SegmentedControl from '@components/segmented_control';
import {
  Territory,
  TerritoryAssignment,
  TerritoryTag,
} from '@definition/territories';
import {
  territoryZonesState,
  territoryTagsState,
  territoryOpenAssignmentsState,
  territoryAssignmentsState,
  territoryLocationsState,
  territorySettingsState,
  territoriesState,
} from '@states/territories';
import { congIDState, userLocalUIDState } from '@states/settings';
import {
  uploadTerritoryImage,
  deleteTerritoryImage,
  updateTerritoryPartial,
} from '@services/firebase/territories';
import {
  getZoneColor,
  getZoneName,
  isInCooldown,
  territoryLabel,
  displayText,
  formatTerritoryDate,
  isStillEncrypted,
  isLightColor,
} from '@services/app/territories';
import { useBreakpoints } from '@hooks/index';

type Props = {
  territory: Territory | null;
  /** Ausente cuando la vista ES la página y no hay nada que cerrar. */
  onClose?: () => void;
  canManage?: boolean;
  showLiveLocation?: boolean;
  onEntregar?: (assignment: TerritoryAssignment) => void;
  onAsignar?: (territory: Territory) => void;
  onEdit?: () => void;
  /**
   * Un pie al final de la hoja. Lo usa el enlace compartido para decir quién
   * lo mandó y hasta cuándo vale: esa vista ES el diálogo a pantalla completa,
   * así que cualquier cosa que se pinte por debajo queda tapada.
   */
  footer?: ReactNode;
  /**
   * Nota al final de la pestaña «Info». Para lo que hay que poder consultar
   * pero no merece sitio permanente: de dónde viene un enlace compartido y
   * hasta cuándo vale. Debajo del mapa ocupaba media pantalla.
   */
  notaInfo?: ReactNode;
};

const Transition = forwardRef(function Transition(
  props: TransitionProps & { children: ReactElement },
  ref: Ref<unknown>
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

// Reset de estilos nativos de <button> — varios controles aquí usaban un
// Box con onClick (invisible para lectores de pantalla y sin soporte de
// teclado); ahora son botones reales con este reset para conservar el
// aspecto visual exacto.
const buttonReset = {
  appearance: 'none',
  border: 'none',
  background: 'none',
  padding: 0,
  margin: 0,
  font: 'inherit',
  color: 'inherit',
  textAlign: 'inherit',
  '&:focus-visible': {
    outline: '2px solid var(--accent-main)',
    outlineOffset: '2px',
  },
} as const;

// Oculta visualmente un control sin sacarlo del árbol de accesibilidad ni
// del orden de tabulación (a diferencia del atributo `hidden`).
const visuallyHidden = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
} as const;

// ─── Asignado / libre — solo para responsables ───────────────────────────
//
// Esto era un PUNTO de 8px con un tooltip. Tres problemas:
//
//   · En la cabecera había ya otros dos puntos del mismo tamaño y forma —el
//     color de la zona, a la izquierda del nombre, y los colores de las
//     etiquetas, arriba a la derecha—. Tres puntos idénticos queriendo decir
//     tres cosas que no tienen nada que ver.
//   · Lo que decía SOLO estaba en el tooltip, y un tooltip en un móvil no
//     existe: no hay dónde posar el dedo.
//   · Y lo que un responsable necesita saber de un territorio abierto no es
//     "está asignado" —eso ya lo dice el botón de Entregar— sino A QUIÉN.
//
// Ahora es el `Badge` de la app, con el nombre dentro, en la misma fila que
// la zona y las viviendas. El punto de la zona se queda: ese está pegado a su
// propia etiqueta, así que no hay nada que adivinar.
type AssignedStatus = 'asignado' | 'descanso' | 'libre';

const ASSIGNED_STATUS_LABEL: Record<AssignedStatus, string> = {
  asignado: 'Asignado',
  descanso: 'En descanso',
  libre: 'Libre',
};

const ASSIGNED_STATUS_COLOR: Record<AssignedStatus, BadgeColor> = {
  asignado: 'orange',
  descanso: 'grey',
  libre: 'green',
};

const AssignedBadge = ({
  status,
  personName,
}: {
  status: AssignedStatus;
  personName?: string;
}) => (
  <Badge
    size="small"
    color={ASSIGNED_STATUS_COLOR[status]}
    text={
      status === 'asignado' && personName
        ? `Asignado a ${personName}`
        : ASSIGNED_STATUS_LABEL[status]
    }
  />
);

// Etiquetas de tamaño (creadas en la unificación de 2026) — para un
// publicador, verlas junto a la cantidad de viviendas es redundante (misma
// información dos veces); para un responsable sí aporta al gestionar, así
// que solo se filtran de la vista de un publicador (ver `visibleHeaderTags`).
const SIZE_TAG_NAMES = new Set([
  'Pequeño',
  'Mediano',
  'Grande',
  'Extra grande',
]);

/** Una entrega ya cerrada de este territorio, con el nombre ya resuelto. */
type EntregaAnterior = {
  id: string;
  nombre: string;
  desde: string;
  hasta: string;
  trabajado: boolean;
  campana: boolean;
};

// ─── Pestaña combinada "Info": viviendas + notas + Direcciones (No visitar) ──
// Antes eran 2 pestañas separadas ("Info" solo con notas, y "Direcciones");
// se unieron para no obligar a cambiar de pestaña para ver todo el panorama
// del territorio de un vistazo.
const InfoTabContent = ({
  territory,
  canManage,
  assignment,
  assignedName,
  historial,
  dateFormat,
  tags,
  allTags,
  onToggleTag,
  onDividir,
}: {
  territory: Territory;
  canManage: boolean;
  /** La asignación abierta, si la hay. Solo se pinta para responsables. */
  assignment?: TerritoryAssignment | null;
  assignedName?: string;
  /** Entregas anteriores, ya resueltas a nombre. Solo para responsables. */
  historial: EntregaAnterior[];
  dateFormat: string;
  /** Las etiquetas puestas a ESTE territorio, ya filtradas por rol. */
  tags: string[];
  /** Todas las de la congregación — las que se pueden poner y quitar. */
  allTags: TerritoryTag[];
  /** Solo se pasa si quien mira puede cambiarlas. */
  onToggleTag?: (tagId: string) => void;
  /** Solo se pasa a quien puede dividir el territorio. */
  onDividir?: () => void;
}) => {
  const [editandoEtiquetas, setEditandoEtiquetas] = useState(false);

  return (
    // La cantidad de viviendas NO se repite aquí: ya está en el bloque de
    // identidad, tres centímetros más arriba en móvil y en la ficha sobre el
    // mapa en escritorio. Salía dos veces en la misma pantalla, en las dos.
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Quién lo tiene y desde cuándo.
        La chapa de la cabecera dice A QUIÉN de un vistazo; esto es el detalle,
        que es lo que antes obligaba a cerrar el territorio, ir a la lista de
        asignaciones, buscarlo y volver. */}
      {canManage && assignment && (
        <Box
          sx={{
            padding: '12px 16px',
            backgroundColor: 'rgba(var(--orange-main-base), 0.08)',
            borderRadius: 'var(--shape-md)',
            border: '1px solid rgba(var(--orange-main-base), 0.25)',
          }}
        >
          <Typography
            className="label-small-semibold"
            color="var(--orange-dark)"
            sx={{ display: 'block', mb: '4px' }}
          >
            Asignación
          </Typography>
          <Typography className="body-small-regular" color="var(--ink)">
            {assignedName}
            {assignment.isCampaign ? ' · campaña' : ''}
          </Typography>
          <Typography className="label-small-regular" color="var(--ink-2)">
            Entregado el{' '}
            {formatTerritoryDate(assignment.assignedAt, dateFormat)}
            {assignment.dueAt
              ? ` · vence el ${formatTerritoryDate(assignment.dueAt, dateFormat)}`
              : ''}
          </Typography>
        </Box>
      )}

      {/* Quién lo ha tenido antes.
        Solo para responsables: es información de gestión —a quién se le dio y
        si lo devolvió trabajado—, no algo que el publicador que lo tiene ahora
        necesite (ni tiene por qué ver el rastro de sus hermanos).

        Sirve para lo que antes obligaba a irse al historial general y filtrar
        a mano: no darle a alguien el mismo territorio que acaba de tener, y
        ver de un vistazo si este es de los que vuelven sin trabajar. */}
      {canManage && (
        <Box>
          <Typography
            className="label-small-semibold"
            color="var(--ink-3)"
            sx={{ display: 'block', mb: '8px' }}
          >
            Últimas veces
          </Typography>

          {historial.length === 0 ? (
            <Typography className="body-small-regular" color="var(--ink-2)">
              {assignment
                ? 'Es la primera vez que se entrega.'
                : 'Todavía no se ha entregado nunca.'}
            </Typography>
          ) : (
            <Stack spacing="8px">
              {historial.map((entrega) => (
                <Box
                  key={entrega.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    flexWrap: 'wrap',
                    padding: '8px 12px',
                    borderRadius: 'var(--shape-sm)',
                    border: '1px solid var(--line)',
                  }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Stack
                      direction="row"
                      alignItems="center"
                      spacing={0.75}
                      sx={{ flexWrap: 'wrap', rowGap: '4px' }}
                    >
                      <Typography
                        className="body-small-regular"
                        color="var(--ink)"
                      >
                        {entrega.nombre}
                      </Typography>
                      {entrega.campana && (
                        <Badge size="small" color="accent" text="Campaña" />
                      )}
                    </Stack>
                    <Typography
                      className="label-small-regular"
                      color="var(--ink-2)"
                      sx={{ display: 'block' }}
                    >
                      {formatTerritoryDate(entrega.desde, dateFormat)} →{' '}
                      {formatTerritoryDate(entrega.hasta, dateFormat)}
                    </Typography>
                  </Box>
                  <Badge
                    size="small"
                    color={entrega.trabajado ? 'green' : 'grey'}
                    text={entrega.trabajado ? 'Trabajado' : 'Sin trabajar'}
                  />
                </Box>
              ))}
            </Stack>
          )}
        </Box>
      )}

      {/* Las etiquetas viven AQUÍ, no en la cabecera.
        Estuvieron un rato arriba, con su nombre y su color, y la cabecera se
        quedó cargada: la zona, las viviendas, a quién está asignado y encima
        todas las etiquetas, en una fila que en un móvil se iba a tres líneas.
        Y una etiqueta no es algo que haga falta tener delante SIEMPRE: es una
        característica del territorio, que es exactamente lo que esta pestaña
        guarda. Arriba se queda lo que se mira de un vistazo; aquí, lo que se
        consulta. */}
      {/* Los trozos en los que está dividido, si lo está.
        Solo los territorios grandes se parten, así que esto no sale casi
        nunca — pero cuando sale es lo que se mira antes de salir: "tú la A,
        yo la B". El mapa de arriba los pinta con estos mismos colores. */}
      {(territory.secciones?.length || onDividir) && (
        <Box>
          <Typography
            className="label-small-semibold"
            color="var(--ink-3)"
            sx={{ display: 'block', mb: '8px' }}
          >
            Trozos
          </Typography>

          {territory.secciones?.length ? (
            <Stack
              direction="row"
              flexWrap="wrap"
              gap={0.75}
              alignItems="center"
              sx={{ mb: onDividir ? '8px' : 0 }}
            >
              {/* Alfabético: el corte mete cada trozo nuevo al lado del que
                  ha partido, y "A, C, B" en una lista se lee como un error. */}
              {[...territory.secciones]
                .sort((a, b) => a.nombre.localeCompare(b.nombre))
                .map((seccion) => (
                  <TagChip
                    key={seccion.id}
                    label={seccion.nombre}
                    color={seccion.color}
                  />
                ))}
            </Stack>
          ) : (
            <Typography
              className="body-small-regular"
              color="var(--ink-2)"
              sx={{ display: 'block', mb: '8px' }}
            >
              Va entero. Se puede partir para repartirlo entre varios grupos en
              una salida.
            </Typography>
          )}

          {onDividir && (
            <Button variant="secondary" disableAutoStretch onClick={onDividir}>
              {territory.secciones?.length ? 'Cambiar los trozos' : 'Dividir'}
            </Button>
          )}
        </Box>
      )}

      {(tags.length > 0 || (canManage && allTags.length > 0)) && (
        <Box>
          <Typography
            className="label-small-semibold"
            color="var(--ink-3)"
            sx={{ display: 'block', mb: '8px' }}
          >
            Etiquetas
          </Typography>

          {/* Las etiquetas NO se tocan hasta que se pide.
            Estuvieron un rato encendiéndose y apagándose al pulsarlas, con la
            idea de que "si puedes cambiarlas, están cambiables". Pero esto se
            lee mucho más de lo que se edita, y un roce con el pulgar mientras
            se consulta le pone —o le quita— una etiqueta al territorio sin
            avisar, se guarda en el momento y se sincroniza a toda la
            congregación. No hay deshacer.
            Así que por defecto son un DATO: se ven las que tiene y no responden
            al tacto. Para cambiarlas hay que decirlo, y entonces salen todas
            las de la congregación como interruptores. */}
          <Stack direction="row" flexWrap="wrap" gap={0.75} alignItems="center">
            {(editandoEtiquetas
              ? allTags
              : allTags.filter((t) => tags.includes(t.id))
            ).map((tag) => (
              <TagChip
                key={tag.id}
                label={tag.nombre}
                color={tag.color}
                selected={tags.includes(tag.id)}
                onClick={
                  editandoEtiquetas && onToggleTag
                    ? () => onToggleTag(tag.id)
                    : undefined
                }
              />
            ))}

            {tags.length === 0 && !editandoEtiquetas && (
              <Typography className="label-small-regular" color="var(--ink-2)">
                Sin etiquetas
              </Typography>
            )}

            {canManage && onToggleTag && (
              <Box
                component="button"
                type="button"
                onClick={() => setEditandoEtiquetas(!editandoEtiquetas)}
                aria-pressed={editandoEtiquetas}
                sx={{
                  appearance: 'none',
                  border: 'none',
                  background: 'none',
                  padding: '2px 8px',
                  marginLeft: '4px',
                  cursor: 'pointer',
                  borderRadius: 'var(--shape-full)',
                  color: 'var(--accent-main)',
                  '&:hover': { backgroundColor: 'var(--state-hover)' },
                  '&:focus-visible': {
                    outline: '2px solid var(--accent-main)',
                    outlineOffset: '2px',
                  },
                }}
              >
                <Typography
                  component="span"
                  className="label-small-semibold"
                  color="inherit"
                >
                  {editandoEtiquetas ? 'Listo' : 'Editar'}
                </Typography>
              </Box>
            )}
          </Stack>
        </Box>
      )}

      {territory.notas && (
        <Box
          sx={{
            padding: '12px 16px',
            backgroundColor: 'rgba(var(--orange-main-base), 0.1)',
            borderRadius: 'var(--shape-md)',
            border: '1px solid rgba(var(--orange-main-base), 0.3)',
          }}
        >
          {/* El rótulo estaba a 10px con 0,6 de espaciado entre letras y en
            mayúsculas — un tamaño que no existe en la escala de la app y que,
            en mayúsculas, es directamente ilegible. */}
          <Typography
            className="label-small-semibold"
            color="var(--orange-dark)"
            sx={{ display: 'block', mb: '4px' }}
          >
            Notas
          </Typography>
          <Typography
            className="body-small-regular"
            sx={{
              color: 'var(--orange-dark)',
              lineHeight: 1.5,
              // Si este dispositivo no puede descifrar la nota, se avisa en
              // vez de enseñar el texto cifrado en crudo.
              ...(isStillEncrypted(territory.notas) && {
                fontStyle: 'italic',
                opacity: 0.75,
              }),
            }}
          >
            {displayText(territory.notas)}
          </Typography>
        </Box>
      )}
      <DireccionesTab territoryId={territory.id} canManage={canManage} />
    </Box>
  );
};

// ─── Botón de acción principal (a lo ancho, en la hoja de móvil) ──────────
//
// Era un botón inventado desde cero: fondo en degradado de 135°, sombra de
// color, 16px a peso 700, −0,2px de espaciado entre letras y un radio propio.
// O sea, el único botón así de TODA la app — y encima el degradado se
// construía pegando `ee` y `bb` al final del color de la zona, un truco que
// solo funciona si ese color es un HEX de 6 dígitos.
//
// Ahora es el `Button` compartido. Lo único que se conserva es lo que aquí sí
// hace falta: que ocupe el ancho de la hoja, que sea más alto de lo normal
// (es el objetivo principal de un pulgar) y que pueda ir del color de la zona.
const ActionButton = ({
  label,
  onClick,
  color,
  variant = 'primary',
  disabled = false,
  disabledReason,
}: {
  label: string;
  onClick: () => void;
  color?: string;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  /** Si está deshabilitado, motivo mostrado debajo — para no dejar al
   *  usuario sin explicación de por qué no puede pulsarlo. */
  disabledReason?: string;
}) => (
  <Box>
    <Button
      variant={variant === 'primary' ? 'main' : 'tertiary'}
      disabled={disabled}
      onClick={onClick}
      minHeight={variant === 'primary' ? 52 : 44}
      ariaLabel={disabled ? `${label} — ${disabledReason ?? ''}` : undefined}
      sx={{
        width: '100%',
        ...(variant === 'primary' &&
          color && {
            backgroundColor: color,
            // El color de zona lo elige un responsable en un selector libre.
            // Con un amarillo o un cian, el texto blanco encima quedaba por
            // debajo de 2:1 de contraste — ilegible al sol o con vista
            // cansada, y de forma permanente para TODOS los territorios de
            // esa zona. Se mide la luminancia y se pone texto oscuro cuando
            // el fondo es claro.
            color: isLightColor(color) ? 'var(--black)' : 'var(--always-white)',
            '&:hover': {
              backgroundColor: `color-mix(in srgb, ${color} 88%, var(--black))`,
            },
          }),
      }}
    >
      {label}
    </Button>
    {disabled && disabledReason && (
      <Typography
        className="label-small-regular"
        color="var(--ink-2)"
        sx={{ textAlign: 'center', mt: '6px', display: 'block' }}
      >
        {disabledReason}
      </Typography>
    )}
  </Box>
);

// ─── Componente principal ────────────────────────────────────────────────────
const DialogVerTerritorio = ({
  territory,
  onClose,
  canManage = false,
  showLiveLocation,
  onEntregar,
  onAsignar,
  onEdit,
  footer,
  notaInfo,
}: Props) => {
  // Vista de mapa a pantalla completa, o diálogo de escritorio.
  //
  // Esto se ha ido corrigiendo por ancho dos veces y las dos se quedó corto:
  // primero 480px, luego 768px. Un iPad Pro de 11" mide 834pt en vertical y
  // 1194 en horizontal, así que seguía viéndose como en un ordenador.
  //
  // El ancho nunca fue la pregunta correcta: lo que decide es si la pantalla
  // se toca con el dedo. En cualquier tablet se quiere el mapa a pantalla
  // completa, mida lo que mida. Se mantiene `laptopDown` para que un móvil
  // siga entrando aunque el navegador no informe del tipo de puntero.
  const { laptopDown, touchDevice } = useBreakpoints();
  const tabletDown = laptopDown || touchDevice;
  const { confirm, ConfirmDialogNode } = useConfirm();
  const [tab, setTab] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [dividirOpen, setDividirOpen] = useState(false);

  // Por estado y no por `useRef`: la hoja vive dentro del Paper del diálogo,
  // que no está en el DOM hasta que se abre. Con una ref normal, el efecto
  // corría al montar el componente —cuando todavía no hay nada que medir— y
  // no volvía a correr nunca: la medida se quedaba en cero y la hoja seguía
  // cortando los botones igual que antes.
  const [cabeceraEl, setCabeceraEl] = useState<HTMLDivElement | null>(null);
  const [accionesEl, setAccionesEl] = useState<HTMLDivElement | null>(null);
  // Lo que hay en la pestaña Mapa, que es corta a propósito: si el reparto no
  // cupiera entero, quedaría medio asomando y habría que arrastrar la hoja
  // para verlo — justo lo que se quería evitar sacándolo de la pestaña Info.
  const [contenidoMapaEl, setContenidoMapaEl] = useState<HTMLDivElement | null>(
    null
  );
  const [minAlturaHoja, setMinAlturaHoja] = useState(0);

  useLayoutEffect(() => {
    if (!cabeceraEl) return;

    const medir = () => {
      // Un dedo de contenido por debajo de las pestañas: sin él la hoja se
      // queda pegada a los botones y parece que dentro no hay nada.
      // Del CONTENEDOR que hace scroll, no del bloque de dentro: el
      // contenedor añade su propio relleno, y midiendo solo el bloque la hoja
      // se quedaba tres píxeles corta — lo justo para que la última fila de
      // trozos asomara por debajo del borde.
      const contenido = contenidoMapaEl
        ? Math.max(
            28,
            contenidoMapaEl.parentElement?.scrollHeight ??
              contenidoMapaEl.offsetHeight
          )
        : 28;
      setMinAlturaHoja(
        cabeceraEl.offsetHeight + (accionesEl?.offsetHeight ?? 0) + contenido
      );
    };

    medir();
    if (typeof ResizeObserver === 'undefined') return;
    const observador = new ResizeObserver(medir);
    observador.observe(cabeceraEl);
    if (accionesEl) observador.observe(accionesEl);
    if (contenidoMapaEl) observador.observe(contenidoMapaEl);
    return () => observador.disconnect();
  }, [cabeceraEl, accionesEl, contenidoMapaEl]);

  const zones = useAtomValue(territoryZonesState);
  const allTags = useAtomValue(territoryTagsState);
  const openAssignments = useAtomValue(territoryOpenAssignmentsState);
  const allAssignments = useAtomValue(territoryAssignmentsState);
  const territories = useAtomValue(territoriesState);
  const allLocations = useAtomValue(territoryLocationsState);

  // Al cerrar, el territorio que se estaba viendo se RETIENE.
  //
  // Aquí había un `if (!liveTerritory) return null` a secas, y por eso cerrar
  // no tenía animación: en cuanto el padre pone `viewing` a null, este
  // componente devolvía null, se iba del árbol de una vez y el diálogo
  // desaparecía de golpe. La transición de salida no llegaba ni a empezar,
  // porque no quedaba nada que animar.
  // Reteniendo el último, el diálogo sigue pintado —con su contenido— mientras
  // se desliza hacia abajo, y solo entonces se desmonta.
  const ultimoRef = useRef<Territory | null>(null);

  // LIVE TERRITORY: El prop 'territory' puede ser un snapshot estático (ej. del state de índice).
  // Buscamos el objeto vivo en jotai para que los cambios (como subir imagen) se reflejen al instante.
  const liveTerritory = useMemo(() => {
    const vivo = territories.find((t) => t.id === territory?.id) || territory;
    if (vivo) ultimoRef.current = vivo;

    return vivo ?? ultimoRef.current;
  }, [territories, territory]);

  const congID = useAtomValue(congIDState);
  const currentUid = useAtomValue(userLocalUIDState);
  const settings = useAtomValue(territorySettingsState);

  // Refs para leer en el efecto sin incluirlos como dependencias
  // (queremos resetear el tab al abrir un territorio, no cuando cambia la config)
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const tabletDownRef = useRef(tabletDown);
  tabletDownRef.current = tabletDown;

  // Reestablece el tab por defecto cada vez que se abre un territorio diferente
  useEffect(() => {
    if (!territory?.id) return;
    const s = settingsRef.current;
    const mobile = tabletDownRef.current;
    // "Info" (que ahora incluye Direcciones) es la última pestaña en móvil
    // (tras Mapa e Imagen) pero la primera en escritorio (no hay pestaña Mapa
    // aparte: el mapa siempre está visible en la columna izquierda).
    const defaultTab = mobile
      ? s.expandMap
        ? 0
        : s.expandImage
          ? 1
          : s.expandInfo
            ? 2
            : 0
      : s.expandInfo
        ? 0
        : s.expandImage
          ? 1
          : 0;
    setTab(defaultTab);
  }, [territory?.id]);

  // Móvil tiene 3 pestañas y escritorio 2. Al girar el móvil o ensanchar la
  // ventana con la pestaña "Info" (índice 2) abierta, escritorio se quedaba
  // sin nada que pintar: contenido en blanco y ninguna pestaña marcada.
  useEffect(() => {
    const maxTab = tabletDown ? 2 : 1;
    setTab((current) => (current > maxTab ? 0 : current));
  }, [tabletDown]);

  // La asignación abierta del territorio, sea normal o de campaña. Antes se
  // excluían las de campaña por miedo a que un territorio tuviera dos
  // abiertas a la vez y "Entregar" actuara sobre la equivocada; eso ya no
  // puede pasar (`openAssignmentId` actúa de candado dentro de una
  // transacción, y solo puede haber UNA abierta). Excluirlas hacía que un
  // territorio ocupado por campaña se viera como "Libre" y no se pudiera
  // entregar desde aquí.
  const resolveName = usePersonName();

  const relevantAssignment = useMemo(() => {
    if (!liveTerritory) return null;
    return openAssignments.find((a) => a.territoryId === liveTerritory.id);
  }, [liveTerritory, openAssignments]);

  /**
   * Las últimas entregas cerradas de ESTE territorio, con el nombre resuelto.
   *
   * Se corta en cinco a propósito: esto es "¿a quién se lo he dado hace poco y
   * cómo volvió?", no el historial completo —ese sigue estando entero en su
   * pestaña, que además se puede buscar—.
   */
  const historial = useMemo<EntregaAnterior[]>(() => {
    if (!liveTerritory || !canManage) return [];

    return allAssignments
      .filter((a) => a.territoryId === liveTerritory.id && a.returnedAt)
      .sort(
        (x, y) =>
          new Date(y.returnedAt!).getTime() - new Date(x.returnedAt!).getTime()
      )
      .slice(0, 5)
      .map((a) => ({
        id: a.id,
        nombre: resolveName(a.personUid),
        desde: a.assignedAt,
        hasta: a.returnedAt!,
        trabajado: a.status === 'trabajado',
        campana: Boolean(a.isCampaign),
      }));
  }, [allAssignments, liveTerritory, canManage, resolveName]);

  /**
   * Cuántas direcciones de «No visitar» hay en este territorio.
   *
   * Va como marca en la pestaña «Info» porque es lo ÚNICO de esta pantalla que
   * hay que ver sí o sí: quien sale a predicar con el territorio necesita saber
   * que hay puertas donde no se llama, y estaban donde no se ven —dentro de una
   * pestaña que se puede no abrir nunca—.
   *
   * Se cuenta lo que el que mira va a encontrar de verdad, con la misma regla
   * que la propia lista: las aprobadas siempre, y las pendientes solo si son
   * suyas o si es responsable. Un número que no cuadre con lo que hay debajo
   * confunde más que no poner ninguno.
   */
  const noVisitarCount = useMemo(() => {
    if (!liveTerritory) return 0;

    return allLocations.filter((l) => {
      if (l.territoryId !== liveTerritory.id) return false;
      if (l.aprobada) return true;
      return canManage || l.addedBy === currentUid;
    }).length;
  }, [allLocations, liveTerritory, canManage, currentUid]);

  if (!liveTerritory) return null;

  // Con qué se puede actuar sobre este territorio desde aquí. Sin nada de
  // esto la barra inferior se quedaba pintada igualmente: una franja vacía con
  // su línea y su relleno, comiéndose el sitio del contenido.
  const hayAcciones =
    canManage || Boolean(relevantAssignment && onEntregar) || Boolean(onEdit);

  const color = getZoneColor(liveTerritory.zoneId, zones);
  const zoneName = getZoneName(liveTerritory.zoneId, zones);
  const label = territoryLabel(liveTerritory);
  const isOpen = Boolean(relevantAssignment);
  const assignedStatus: AssignedStatus = isOpen
    ? 'asignado'
    : isInCooldown(liveTerritory, settings.daysUntilReassignable)
      ? 'descanso'
      : 'libre';

  // ¿Puede QUIEN ESTÁ MIRANDO entregar este territorio? Un responsable
  // siempre; un publicador solo SU PROPIO territorio (y si la congregación
  // se lo permite). Antes solo se comprobaba el ajuste, no de quién era la
  // asignación: con "ver territorios del grupo" activado, o entrando por un
  // enlace directo a un territorio ajeno, el botón salía activo y un
  // publicador podía cerrar la asignación de otro hermano.
  const isMine = Boolean(
    relevantAssignment &&
    currentUid &&
    relevantAssignment.personUid === currentUid
  );
  const canReturnThis = canManage || (settings.publishersCanReturn && isMine);

  /**
   * Quién puede partir el territorio: un responsable siempre, y el hermano
   * que lo tiene ahora mismo — es el que está delante en la salida y el que
   * sabe por dónde quiere partirlo. Sin él, dividir habría que pedirlo por
   * teléfono el sábado por la mañana.
   */
  const puedeDividir = Boolean(
    liveTerritory?.geometry && (canManage || (relevantAssignment && isMine))
  );

  // Un responsable sí saca partido de ver la etiqueta de tamaño junto a la
  // cantidad de viviendas (gestión); a un publicador le sale la misma
  // información dos veces, así que se le filtra solo a él.
  const visibleHeaderTags = canManage
    ? liveTerritory.tags || []
    : (liveTerritory.tags || []).filter((tagId) => {
        const tag = allTags.find((t) => t.id === tagId);
        return !tag || !SIZE_TAG_NAMES.has(tag.nombre);
      });

  const handleNavigate = () => {
    if (!liveTerritory.geometry) return;
    const geo = liveTerritory.geometry;
    let coords: number[][] = [];
    if (geo.type === 'Polygon') {
      coords = geo.coordinates[0];
    } else if (geo.type === 'MultiPolygon') {
      coords = geo.coordinates[0][0];
    }
    if (!coords || coords.length === 0) return;
    let lngSum = 0;
    let latSum = 0;
    coords.forEach(([lng, lat]) => {
      lngSum += lng;
      latSum += lat;
    });
    const lat = latSum / coords.length;
    const lng = lngSum / coords.length;
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
      '_blank'
    );
  };

  const handleUploadImage = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadTerritoryImage(congID, liveTerritory.id, file);
      // Actualización parcial, NUNCA saveTerritory (setDoc del documento
      // entero). La subida puede tardar minutos en 4G; guardando el
      // documento completo desde la copia capturada en el render se
      // reescribían `openAssignmentId` y `lastWorkedAt` con valores viejos,
      // soltando el candado de una asignación abierta o resucitando el de
      // una ya cerrada.
      await updateTerritoryPartial(congID, liveTerritory.id, { imageURL: url });
    } catch (e) {
      console.error(e);
      displaySnackNotification({
        header: 'Error',
        message: 'Error subiendo imagen. Verifica tu conexión.',
        severity: 'error',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteImage = async () => {
    const ok = await confirm({
      message:
        '¿Eliminar la imagen de este territorio? Esta acción no se puede deshacer.',
      confirmLabel: 'Eliminar',
      destructive: true,
    });
    if (!ok) return;
    setUploading(true);
    try {
      await deleteTerritoryImage(congID, liveTerritory.id);
      await updateTerritoryPartial(congID, liveTerritory.id, {
        imageURL: null,
      });
    } catch (e) {
      console.error(e);
      displaySnackNotification({
        header: 'Error',
        message: 'Error eliminando la imagen. Verifica tu conexión.',
        severity: 'error',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleToggleTag = async (tagId: string) => {
    const current = liveTerritory.tags || [];
    const updated = current.includes(tagId)
      ? current.filter((t) => t !== tagId)
      : [...current, tagId];
    await updateTerritoryPartial(congID, liveTerritory.id, { tags: updated });
  };

  // ── Alturas del sheet por tab ──────────────────────────────────────────────
  // tab 0 (Mapa):   sheet corto siempre → mapa muy visible sobre el sheet
  //                 (las notas/viviendas ahora viven en la pestaña Info, no
  //                 aquí, así que este sheet ya no necesita crecer por eso).
  // tab 1 (Imagen): sheet alto → la imagen se muestra DENTRO del sheet.
  // tab 2 (Info):   sheet medio-alto (notas + viviendas + Direcciones).
  const SHEET_HEIGHTS = ['30vh', '90vh', '76vh'];
  const sheetHeight = SHEET_HEIGHTS[tab];

  // ── El suelo de la hoja ────────────────────────────────────────────────
  // La cabecera y la barra de botones no encogen (no deben: son lo que se
  // pulsa), así que en la pestaña Mapa —donde la hoja mide 30vh a propósito
  // para que se vea el mapa— en un móvil de 6,3" no cabían: 30vh son 256px y
  // solo la cabecera más los botones ya piden 303. Lo que sobraba se salía
  // por debajo del `overflow: hidden` y los botones aparecían cortados por la
  // mitad. En un móvil grande sí cabía, que es por qué esto no se veía.
  //
  // Se mide lo que ocupan de verdad (con dos botones o con tres, con o sin
  // pie) y la hoja no baja de ahí. En un móvil grande el `max()` no cambia
  // nada: 30vh siguen siendo más.

  // El suelo medido va por `min-height`, NO metido dentro de `height`.
  //
  // La hoja anima su altura al cambiar de pestaña (`transition: height`), y
  // si la medida se mete en `height` esa transición arranca a la vez que la
  // de entrada del diálogo y se queda CLAVADA en el valor de partida: la
  // regla decía 431px y el navegador seguía pintando 256, con los botones
  // otra vez cortados. `min-height` no está en la transición, así que aplica
  // en el sitio y la animación de las pestañas se mantiene.
  //
  // `max-height` al 92% para que en horizontal la hoja no se coma la pantalla
  // entera empujando su propia cabecera por encima del borde de arriba (si
  // el contenido fijo pidiera más, manda `min-height`, que es lo correcto:
  // antes cortar la pantalla que cortar los botones).

  // En vh para animar (consistente con SHEET_HEIGHTS) y en px para pasarle a
  // Leaflet el espacio que debe reservar abajo al encuadrar/centrar el mapa.
  const sheetHeightVh = parseFloat(sheetHeight);
  const sheetHeightPx =
    typeof window !== 'undefined'
      ? Math.min(
          Math.round(0.92 * window.innerHeight),
          Math.max(
            Math.round((sheetHeightVh / 100) * window.innerHeight),
            minAlturaHoja
          )
        )
      : 0;

  // ── LAYOUT MÓVIL ───────────────────────────────────────────────────────────
  const mobileContent = (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: 'var(--white)',
      }}
    >
      {/* MAPA: cubre el 100% del fondo SIEMPRE */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
        }}
      >
        <TerritoryMap
          geometry={liveTerritory.geometry}
          color={color}
          showLiveLocation={showLiveLocation}
          height="100%"
          borderRadius={0}
          secciones={liveTerritory.secciones}
          bottomInset={sheetHeightPx}
          onNavigate={handleNavigate}
        />
      </Box>

      {/* BOTÓN CERRAR flotante — izquierda para no chocar con los
          controles del mapa (satélite / zoom) que están en la derecha.
          Solo si hay a dónde volver: quien llega por un enlace compartido no
          tiene detrás ninguna pantalla, y una X que no cierra nada es peor que
          ninguna X. */}
      {onClose && (
        <Box
          sx={{
            position: 'absolute',
            top: 'max(16px, env(safe-area-inset-top))',
            left: 16,
            zIndex: 1200, // Encima de controles del mapa (z:1000) y del sheet (z:100)
          }}
        >
          <Box
            component="button"
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            sx={{
              ...buttonReset,
              width: 44,
              height: 44,
              borderRadius: 'var(--shape-full)',
              // Negro literal a propósito: va SOBRE las teselas del mapa,
              // que siempre son claras, no sobre el fondo del tema.
              backgroundColor: 'rgba(0,0,0,0.45)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '0.5px solid rgba(255,255,255,0.18)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition:
                'transform var(--motion-fast) var(--ease-standard), background-color var(--motion-fast) var(--ease-standard)',
              '&:active': { transform: 'scale(0.88)' },
              '&:hover': { backgroundColor: 'rgba(0,0,0,0.6)' },
            }}
          >
            <IconClose color="var(--always-white)" width={16} height={16} />
          </Box>
        </Box>
      )}

      {/* BOTTOM SHEET flotante */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: sheetHeight,
          minHeight: minAlturaHoja ? `${minAlturaHoja}px` : undefined,
          maxHeight: '92%',
          zIndex: 100,
          // 380ms, más que `--motion-medium`, a propósito: una hoja que ocupa media
          // pantalla necesita más recorrido que un color de fondo. La CURVA sí es
          // la del sistema.
          transition: 'height var(--motion-medium) var(--ease-standard)',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--white)',
          borderRadius: 'var(--shape-xl) var(--shape-xl) 0 0',
          boxShadow: '0 -12px 48px rgba(0,0,0,0.25)',
          overflow: 'hidden',
        }}
      >
        {/* Aquí iba una franja de 4px con el color de la zona en degradado
            hacia transparente, pegada al canto superior de la hoja. Es la
            uñita otra vez, tumbada: un borde recto contra dos esquinas
            redondeadas, que además se desvanecía por la derecha y hacía que
            la hoja pareciera torcida.

            No se sustituye por nada, se quita: el color de la zona ya lo
            dicen el punto que hay justo debajo, junto al nombre de la zona, y
            el propio polígono del mapa. Era la tercera vez que se decía lo
            mismo en la misma pantalla, y la más fea de las tres. */}

        {/* Cabecera (asa + identidad + pestañas) en un solo bloque: es lo
            que se mide para que la hoja nunca sea más baja que su propio
            contenido fijo. */}
        <Box ref={setCabeceraEl} sx={{ flexShrink: 0 }}>
          {/* Drag handle pill */}
          <Box
            sx={{
              flexShrink: 0,
              display: 'flex',
              justifyContent: 'center',
              pt: '10px',
              pb: '6px',
            }}
          >
            <Box
              sx={{
                width: 40,
                height: 4,
                borderRadius: 'var(--shape-full)',
                backgroundColor: 'var(--line)',
              }}
            />
          </Box>

          {/* IDENTITY BLOCK */}
          <Box sx={{ flexShrink: 0, px: 3, pb: '12px' }}>
            <Stack
              direction="row"
              alignItems="flex-start"
              justifyContent="space-between"
            >
              <Box sx={{ flex: 1, minWidth: 0 }}>
                {/* Número del territorio */}
                {/* Era 28px a peso 800 con −0,8px de espaciado: un tamaño
                  y un peso que no existen en la escala de la app. `h1` es
                  el equivalente que sí está. */}
                <Typography
                  className="h1"
                  color="var(--ink)"
                  sx={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    mb: '6px',
                  }}
                >
                  {label}
                </Typography>

                {/* Zona + estado */}
                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={1}
                  flexWrap="wrap"
                  gap={0.75}
                >
                  <Stack direction="row" alignItems="center" spacing={'5px'}>
                    <Box
                      sx={{
                        width: 9,
                        height: 9,
                        borderRadius: 'var(--shape-full)',
                        backgroundColor: color,
                        boxShadow: `0 0 0 2.5px color-mix(in srgb, ${color} 15%, transparent)`,
                        flexShrink: 0,
                      }}
                    />
                    <Typography
                      className="label-small-medium"
                      color="var(--ink-2)"
                    >
                      {zoneName}
                    </Typography>
                  </Stack>
                  {liveTerritory.numeroViviendas != null && (
                    <ViviendasTag count={liveTerritory.numeroViviendas} />
                  )}
                  {/* Que el territorio sea de campaña se decía SOLO en el
                    recuadro de asignación de la pestaña Info, y ese recuadro
                    es solo para responsables: el publicador que lo abría no
                    veía por ninguna parte que lo que tiene en la mano es un
                    territorio de campaña. Va arriba, pegado al número, que es
                    lo que se mira de un vistazo. */}
                  {relevantAssignment?.isCampaign && (
                    <Badge size="small" color="accent" text="Campaña" />
                  )}
                  {canManage && (
                    <AssignedBadge
                      status={assignedStatus}
                      personName={
                        relevantAssignment
                          ? resolveName(relevantAssignment.personUid)
                          : undefined
                      }
                    />
                  )}
                </Stack>
              </Box>
            </Stack>
          </Box>

          {/* SEGMENTED CONTROL */}
          <Box sx={{ flexShrink: 0, px: 3, pb: '14px' }}>
            <SegmentedControl
              ariaLabel="Vistas del territorio"
              tabs={['Mapa', 'Imagen', 'Info']}
              counts={[undefined, undefined, noVisitarCount]}
              active={tab}
              onChange={(i) => {
                setTab(i);
              }}
            />
          </Box>
        </Box>

        {/* CONTENIDO DINÁMICO (scrollable) */}
        <Box
          sx={{
            flex: 1,
            overflowY: 'auto',
            px: 3,
            pt: '4px',
            // Ocultar scrollbar pero mantener scroll
            scrollbarWidth: 'none',
            '&::-webkit-scrollbar': { display: 'none' },
          }}
        >
          {/* TAB 0: Mapa — el mapa cubre todo el fondo. Aquí abajo queda una
              franja que estaba ocupada solo por un aviso; es el sitio donde
              se ve —y se toca— el reparto del territorio, que antes había que
              ir a buscar dentro de la pestaña Info. */}
          {tab === 0 && (
            <Box
              ref={setContenidoMapaEl}
              sx={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
            >
              {(puedeDividir || Boolean(liveTerritory.secciones?.length)) && (
                <Box
                  component={puedeDividir ? 'button' : 'div'}
                  type={puedeDividir ? 'button' : undefined}
                  onClick={
                    puedeDividir ? () => setDividirOpen(true) : undefined
                  }
                  className={puedeDividir ? 'active-press' : undefined}
                  aria-label={
                    puedeDividir
                      ? liveTerritory.secciones?.length
                        ? 'Cambiar el reparto del territorio'
                        : 'Repartir el territorio en trozos'
                      : undefined
                  }
                  sx={{
                    appearance: 'none',
                    font: 'inherit',
                    textAlign: 'left',
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 14px',
                    borderRadius: 'var(--shape-lg)',
                    border: '1px solid var(--line)',
                    backgroundColor: 'var(--card)',
                    cursor: puedeDividir ? 'pointer' : 'default',
                    transition:
                      'background-color var(--motion-fast) var(--ease-standard)',
                    ...(puedeDividir && {
                      '&:hover': { backgroundColor: 'var(--state-hover)' },
                      '&:focus-visible': {
                        outline: '2px solid var(--accent-main)',
                        outlineOffset: '2px',
                      },
                    }),
                  }}
                >
                  {/* La chapa del icono va con relleno y sin borde, como el
                      resto de la app. */}
                  <Box
                    aria-hidden
                    sx={{
                      width: 38,
                      height: 38,
                      flexShrink: 0,
                      borderRadius: 'var(--shape-md)',
                      backgroundColor: 'var(--accent-150)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <IconGroups
                      color="var(--accent-dark)"
                      width={20}
                      height={20}
                    />
                  </Box>

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    {liveTerritory.secciones?.length ? (
                      <>
                        <Typography
                          className="body-small-semibold"
                          color="var(--ink)"
                        >
                          Repartido en {liveTerritory.secciones.length} trozos
                        </Typography>
                        <Stack
                          direction="row"
                          flexWrap="wrap"
                          gap={0.5}
                          sx={{ mt: '4px' }}
                        >
                          {[...liveTerritory.secciones]
                            .sort((a, b) => a.nombre.localeCompare(b.nombre))
                            .map((seccion) => (
                              <TagChip
                                key={seccion.id}
                                label={seccion.nombre}
                                color={seccion.color}
                              />
                            ))}
                        </Stack>
                      </>
                    ) : (
                      <>
                        <Typography
                          className="body-small-semibold"
                          color="var(--ink)"
                        >
                          Repartir el territorio
                        </Typography>
                        <Typography
                          className="label-small-regular"
                          color="var(--ink-2)"
                          sx={{ display: 'block' }}
                        >
                          Pártelo en trozos para una salida
                        </Typography>
                      </>
                    )}
                  </Box>

                  {puedeDividir && (
                    <IconChevronRight
                      color="var(--ink-3)"
                      width={20}
                      height={20}
                    />
                  )}
                </Box>
              )}

              <Typography
                className="label-small-regular"
                sx={{
                  color: 'var(--ink-3)',
                  textAlign: 'center',
                }}
              >
                El mapa está detrás. Úsalo para navegar el territorio.
              </Typography>
            </Box>
          )}

          {/* TAB 1: Imagen */}
          {tab === 1 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {liveTerritory.imageURL ? (
                <PhotoProvider maskOpacity={0.92}>
                  <PhotoView src={liveTerritory.imageURL}>
                    <Box
                      component="img"
                      src={liveTerritory.imageURL}
                      alt={label}
                      sx={{
                        width: '100%',
                        borderRadius: 'var(--shape-lg)',
                        cursor: 'zoom-in',
                        display: 'block',
                        // Limitar altura para que no sea interminable en scroll
                        maxHeight: '56vh',
                        objectFit: 'contain',
                        backgroundColor: 'var(--accent-100)',
                      }}
                    />
                  </PhotoView>
                </PhotoProvider>
              ) : (
                <Box
                  sx={{
                    height: 200,
                    borderRadius: 'var(--shape-lg)',
                    border: '1.5px dashed var(--line)',
                    backgroundColor: 'var(--accent-100)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 1,
                  }}
                >
                  <IconMapOverview
                    width={32}
                    height={32}
                    color="var(--ink-2)"
                  />
                  <Typography
                    className="body-small-regular"
                    sx={{ color: 'var(--ink-2)' }}
                  >
                    Sin imagen adjunta
                  </Typography>
                </Box>
              )}

              {/* Controles de imagen para responsables */}
              {canManage && (
                <Stack direction="row" spacing={1.5}>
                  <Box sx={{ flex: 1 }}>
                    <label style={{ cursor: 'pointer', display: 'block' }}>
                      <Box
                        sx={{
                          width: '100%',
                          minHeight: '44px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: 'var(--shape-full)',
                          border: `1px solid ${color}`,
                          color: color,
                          textAlign: 'center',
                          cursor: 'pointer',
                          transition:
                            'background-color var(--motion-fast) var(--ease-standard)',
                          '&:active': {
                            backgroundColor: `color-mix(in srgb, ${color} 10%, transparent)`,
                          },
                        }}
                        className="button-caps"
                      >
                        {uploading
                          ? 'Subiendo…'
                          : liveTerritory.imageURL
                            ? 'Cambiar imagen'
                            : 'Subir imagen (PNG/JPG)'}
                      </Box>
                      {/* `hidden` saca el input del orden de tabulación —
                          nadie podía llegar aquí con teclado. Se oculta
                          visualmente en su lugar, así sigue siendo
                          enfocable y activable con Enter/Espacio. */}
                      <Box
                        component="input"
                        type="file"
                        accept="image/png,image/jpeg"
                        disabled={uploading}
                        // Resetear el value (igual que en escritorio): sin
                        // esto, si la subida falla, volver a elegir EL MISMO
                        // fichero no dispara 'change' y parece que la app
                        // ignora el intento.
                        onChange={(e) => {
                          handleUploadImage(e.target.files?.[0]);
                          e.target.value = '';
                        }}
                        sx={visuallyHidden}
                      />
                    </label>
                  </Box>
                  {liveTerritory.imageURL && (
                    <Box
                      component="button"
                      type="button"
                      disabled={uploading}
                      onClick={handleDeleteImage}
                      aria-label="Borrar imagen del territorio"
                      sx={{
                        ...buttonReset,
                        width: 'auto',
                        px: 2,
                        minHeight: '44px',
                        borderRadius: 'var(--shape-full)',
                        backgroundColor: 'rgba(var(--red-main-base), 0.1)',
                        color: 'var(--red-main)',
                        textAlign: 'center',
                        cursor: uploading ? 'default' : 'pointer',
                        transition:
                          'background-color var(--motion-fast) var(--ease-standard)',
                        '&:active': {
                          backgroundColor: uploading
                            ? undefined
                            : 'rgba(var(--red-main-base), 0.2)',
                        },
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      Borrar
                    </Box>
                  )}
                </Stack>
              )}
            </Box>
          )}

          {/* TAB 2: Info (viviendas + notas + Direcciones) */}
          {tab === 2 && (
            <InfoTabContent
              territory={liveTerritory}
              canManage={canManage}
              assignment={relevantAssignment}
              assignedName={
                relevantAssignment
                  ? resolveName(relevantAssignment.personUid)
                  : undefined
              }
              historial={historial}
              dateFormat={settings.dateFormat}
              tags={visibleHeaderTags}
              allTags={allTags}
              onToggleTag={canManage ? handleToggleTag : undefined}
              onDividir={puedeDividir ? () => setDividirOpen(true) : undefined}
            />
          )}

          {/* Al final del todo: se consulta si hace falta y no estorba. */}
          {tab === 2 && notaInfo && (
            <Box sx={{ paddingTop: '16px' }}>{notaInfo}</Box>
          )}
        </Box>

        {/* BARRA DE ACCIONES */}
        {(hayAcciones || footer) && (
          <Box
            ref={setAccionesEl}
            sx={{
              flexShrink: 0,
              px: 3,
              pt: '12px',
              pb: 'max(20px, env(safe-area-inset-bottom))',
              borderTop: '0.5px solid var(--line)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            {relevantAssignment && onEntregar && canReturnThis && (
              <ActionButton
                label="Entregar territorio"
                onClick={() => onEntregar(relevantAssignment)}
                color={color}
                variant="primary"
              />
            )}
            {/* Las dos secundarias comparten fila.
              Apiladas eran TRES botones a lo ancho, y en la pestaña Mapa —donde
              el sheet se queda corto a propósito, para que se vea el mapa— el
              tercero, "Editar", caía por debajo del pliegue: no existía a menos
              que arrastraras el sheet hacia arriba. En una fila caben las dos y
              la cuenta baja a dos alturas.
              Compartir: un responsable puede mandar CUALQUIER territorio, esté
              asignado o no (p. ej. para dárselo por WhatsApp a alguien sin
              cuenta); un publicador, solo el suyo. Cuando va atado a una
              asignación, el enlace muere al entregar el territorio. */}
            {(canManage ||
              (relevantAssignment && isMine) ||
              (canManage && onEdit)) && (
              <Box
                sx={{
                  display: 'flex',
                  gap: '8px',
                  '& > *': { flex: 1, minWidth: 0 },
                }}
              >
                {(canManage || (relevantAssignment && isMine)) && (
                  <ActionButton
                    label="Compartir enlace"
                    onClick={() => setShareOpen(true)}
                    variant="secondary"
                  />
                )}
                {canManage && onEdit && (
                  <ActionButton
                    label="Editar"
                    onClick={onEdit}
                    variant="secondary"
                  />
                )}
              </Box>
            )}
            {/* Antes este botón solo desaparecía sin explicar nada cuando un
              publicador no podía entregar por sí mismo. */}
            {relevantAssignment && onEntregar && !canReturnThis && (
              <ActionButton
                label="Entregar territorio"
                onClick={() => {}}
                disabled
                disabledReason={
                  isMine
                    ? 'Solo un responsable puede marcar este territorio como entregado'
                    : 'Este territorio lo tiene asignado otro publicador'
                }
              />
            )}
            {canManage && !relevantAssignment && onAsignar && (
              <ActionButton
                label="Asignar territorio"
                onClick={() => onAsignar(liveTerritory)}
                color={color}
                variant="primary"
              />
            )}
            {footer}
          </Box>
        )}
      </Box>
    </Box>
  );

  // ── LAYOUT ESCRITORIO (2 columnas) ─────────────────────────────────────────
  const desktopContent = (
    <Box
      sx={{ display: 'flex', width: '100%', height: '100%', minHeight: 540 }}
    >
      {/* Columna izquierda: MAPA */}
      <Box
        sx={{
          width: '57%',
          flexShrink: 0,
          position: 'relative',
          backgroundColor: 'var(--accent-200)',
          borderRadius: 'var(--shape-xl) 0 0 var(--shape-xl)',
          overflow: 'hidden',
        }}
      >
        <TerritoryMap
          geometry={liveTerritory.geometry}
          color={color}
          showLiveLocation={showLiveLocation}
          height="100%"
          secciones={liveTerritory.secciones}
          onNavigate={handleNavigate}
        />

        {/* Ficha de identidad glass en mapa */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 18,
            left: 16,
            right: 16,
            zIndex: 900,
            backgroundColor: 'rgba(255,255,255,0.88)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderRadius: 'var(--shape-lg)',
            p: '14px 18px',
            border: '0.5px solid rgba(255,255,255,0.65)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.22)',
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
          >
            <Box>
              <Typography className="h4" color="var(--ink)">
                {label}
              </Typography>
              <Stack
                direction="row"
                alignItems="center"
                spacing={'6px'}
                sx={{ mt: '4px' }}
              >
                <Box
                  sx={{
                    width: 7,
                    height: 7,
                    borderRadius: 'var(--shape-full)',
                    backgroundColor: color,
                  }}
                />
                <Typography className="label-small-medium" color="var(--ink-2)">
                  {zoneName}
                </Typography>
              </Stack>
            </Box>
            {liveTerritory.numeroViviendas != null && (
              <ViviendasTag count={liveTerritory.numeroViviendas} />
            )}
            {relevantAssignment?.isCampaign && (
              <Badge size="small" color="accent" text="Campaña" />
            )}
            {canManage && (
              <AssignedBadge
                status={assignedStatus}
                personName={
                  relevantAssignment
                    ? resolveName(relevantAssignment.personUid)
                    : undefined
                }
              />
            )}
          </Stack>
        </Box>
      </Box>

      {/* Columna derecha: INFO */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          backgroundColor: 'var(--white)',
          borderRadius: '0 var(--shape-xl) var(--shape-xl) 0',
        }}
      >
        {/* Header */}
        <Box
          sx={{
            px: 3,
            pt: 2.5,
            pb: 2,
            borderBottom: '0.5px solid var(--line)',
            flexShrink: 0,
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
          >
            <Stack direction="row" alignItems="center" spacing={'8px'}>
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: 'var(--shape-full)',
                  backgroundColor: color,
                  boxShadow: `0 0 0 3px color-mix(in srgb, ${color} 13%, transparent)`,
                  flexShrink: 0,
                }}
              />
              <Typography className="body-small-semibold" color="var(--ink)">
                {label}
              </Typography>
            </Stack>
            <Stack direction="row" alignItems="center" spacing={0.5}>
              {canManage && onEdit && (
                <IconButton
                  size="small"
                  onClick={onEdit}
                  aria-label="Editar territorio"
                  sx={{
                    width: 32,
                    height: 32,
                    color: 'var(--ink-2)',
                    '&:hover': { backgroundColor: 'var(--accent-100)' },
                  }}
                >
                  <IconEdit width={15} height={15} />
                </IconButton>
              )}
              {onClose && (
                <IconButton
                  size="small"
                  onClick={onClose}
                  aria-label="Cerrar"
                  sx={{
                    width: 32,
                    height: 32,
                    color: 'var(--ink-2)',
                    '&:hover': { backgroundColor: 'var(--accent-100)' },
                  }}
                >
                  <IconClose width={15} height={15} />
                </IconButton>
              )}
            </Stack>
          </Stack>

          {/* Las etiquetas viven en la pestaña Info, aquí al lado. Estaban
              también en esta ficha, así que con Info abierta salían dos veces
              en la misma pantalla. */}
        </Box>

        {/* Tabs */}
        <Box sx={{ px: 3, py: 1.5, flexShrink: 0 }}>
          <SegmentedControl
            ariaLabel="Vistas del territorio"
            tabs={['Info', 'Imagen']}
            counts={[noVisitarCount, undefined]}
            active={tab}
            onChange={(i) => {
              setTab(i);
            }}
          />
        </Box>

        {/* Contenido scrollable */}
        <Box sx={{ flex: 1, overflowY: 'auto', px: 3, pb: 1 }}>
          {tab === 0 && (
            <InfoTabContent
              territory={liveTerritory}
              canManage={canManage}
              assignment={relevantAssignment}
              assignedName={
                relevantAssignment
                  ? resolveName(relevantAssignment.personUid)
                  : undefined
              }
              historial={historial}
              dateFormat={settings.dateFormat}
              tags={visibleHeaderTags}
              allTags={allTags}
              onToggleTag={canManage ? handleToggleTag : undefined}
              onDividir={puedeDividir ? () => setDividirOpen(true) : undefined}
            />
          )}

          {tab === 1 && (
            <Box>
              {liveTerritory.imageURL ? (
                <PhotoProvider maskOpacity={0.9}>
                  <PhotoView src={liveTerritory.imageURL}>
                    <Box
                      component="img"
                      src={liveTerritory.imageURL}
                      alt={label}
                      sx={{
                        width: '100%',
                        borderRadius: 'var(--shape-md)',
                        cursor: 'zoom-in',
                        boxShadow: 'var(--small-card-shadow)',
                        mb: 1.5,
                      }}
                    />
                  </PhotoView>
                </PhotoProvider>
              ) : (
                <Box
                  sx={{
                    height: 160,
                    borderRadius: 'var(--shape-md)',
                    backgroundColor: 'var(--accent-100)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px dashed var(--line)',
                    mb: 1.5,
                  }}
                >
                  <Typography
                    className="body-small-regular"
                    color="var(--ink-2)"
                  >
                    Sin imagen
                  </Typography>
                </Box>
              )}
              {canManage && (
                <Stack direction="row" spacing={1.5}>
                  <Box sx={{ flex: 1 }}>
                    <label style={{ cursor: 'pointer', display: 'block' }}>
                      <Box
                        sx={{
                          ...buttonReset,
                          // Tiene que ser un <Box> dentro de un <label> (es lo
                          // que dispara el selector de archivos), pero se
                          // dibuja con la misma geometría que el botón
                          // "tertiary" compartido: píldora, 40 de alto, borde
                          // de 1px.
                          width: '100%',
                          minHeight: '40px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: 'var(--shape-full)',
                          border: '1px solid var(--accent-dark)',
                          color: 'var(--accent-dark)',
                          textAlign: 'center',
                          cursor: uploading ? 'default' : 'pointer',
                          opacity: uploading ? 0.6 : 1,
                          transition:
                            'background-color var(--motion-fast) var(--ease-standard)',
                          '&:hover': uploading
                            ? undefined
                            : { backgroundColor: 'var(--accent-200)' },
                        }}
                        className="button-caps"
                      >
                        {uploading
                          ? 'Subiendo…'
                          : liveTerritory.imageURL
                            ? 'Cambiar imagen'
                            : 'Subir imagen (PNG/JPG)'}
                      </Box>
                      <Box
                        component="input"
                        type="file"
                        accept="image/png,image/jpeg"
                        disabled={uploading}
                        onChange={(e) => {
                          handleUploadImage(e.target.files?.[0]);
                          e.target.value = '';
                        }}
                        sx={visuallyHidden}
                      />
                    </label>
                  </Box>
                  {liveTerritory.imageURL && (
                    <Button
                      variant="tertiary"
                      disableAutoStretch
                      disabled={uploading}
                      onClick={handleDeleteImage}
                      sx={{
                        color: 'var(--red-main)',
                        '&:hover': {
                          backgroundColor: 'rgba(var(--red-main-base), 0.08)',
                        },
                      }}
                    >
                      Borrar
                    </Button>
                  )}
                </Stack>
              )}
            </Box>
          )}
        </Box>

        {/* Acciones inferiores */}
        <Box
          sx={{
            px: 3,
            pb: 2.5,
            pt: 1.5,
            borderTop: '0.5px solid var(--line)',
            flexShrink: 0,
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            spacing={1.5}
            justifyContent="flex-end"
          >
            {relevantAssignment && onEntregar && !canReturnThis && (
              <Typography
                className="label-small-regular"
                sx={{ color: 'var(--ink-2)' }}
              >
                {isMine
                  ? 'Solo un responsable puede marcar este territorio como entregado.'
                  : 'Este territorio lo tiene asignado otro publicador.'}
              </Typography>
            )}
            {(canManage || (relevantAssignment && isMine)) && (
              <Button variant="secondary" onClick={() => setShareOpen(true)}>
                Compartir enlace
              </Button>
            )}
            {relevantAssignment && onEntregar && (
              <Button
                variant="main"
                onClick={() => onEntregar(relevantAssignment)}
                disabled={!canReturnThis}
              >
                Entregar
              </Button>
            )}
            {canManage && !relevantAssignment && onAsignar && (
              <Button variant="main" onClick={() => onAsignar(liveTerritory)}>
                Asignar
              </Button>
            )}
          </Stack>
        </Box>
      </Box>
    </Box>
  );

  return (
    <>
      {ConfirmDialogNode}
      <MUIDialog
        fullScreen={tabletDown}
        open={!!territory}
        onClose={onClose}
        // El deslizamiento, a cualquier ancho. Estaba atado a `tabletDown`,
        // así que en una ventana grande el territorio aparecía y desaparecía
        // de golpe. Sube desde abajo y baja al cerrarse: es la misma hoja,
        // ocupe toda la pantalla o no.
        //
        // Por `slots` y no por `TransitionComponent`: ese prop está marcado
        // como obsoleto en MUI 7 y desaparece en la siguiente mayor.
        slots={{ transition: Transition }}
        PaperProps={{
          sx: tabletDown
            ? {
                backgroundColor: 'var(--white)',
                overflow: 'hidden',
                // Quitar sombra y bordes del Paper para que el diseño propio tome el control
                boxShadow: 'none',
                borderRadius: 0,
                margin: 0,
              }
            : {
                maxWidth: '860px',
                width: 'calc(100% - 32px)',
                borderRadius: 'var(--shape-xl)',
                overflow: 'hidden',
                backgroundColor: 'transparent',
                boxShadow: 'var(--pop-up-shadow), 0 0 0 0.5px rgba(0,0,0,0.06)',
              },
        }}
      >
        {tabletDown ? mobileContent : desktopContent}
      </MUIDialog>

      {dividirOpen && (
        <DialogDividir
          open={dividirOpen}
          territory={liveTerritory}
          onClose={() => setDividirOpen(false)}
        />
      )}

      {shareOpen && (
        <DialogCompartir
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          territory={liveTerritory}
          // Puede no haberla: un responsable comparte territorios libres.
          assignment={relevantAssignment ?? null}
        />
      )}
    </>
  );
};

export default DialogVerTerritorio;
