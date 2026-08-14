import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Portal } from '@mui/material';
import { useAtomValue } from 'jotai';
import { useNavigate } from 'react-router';
import { useCurrentUser } from '@hooks/index';
import Typography from '@components/typography';
import IconButton from '@components/icon_button';
import { IconArrowBack, IconClose, IconSearch } from '@icons/index';
import { documentosState, documentoCategoriasState } from '@states/documentos';
import { DestinoCategoria, DestinoRoles } from '@definition/destinos';
import { DESTINOS } from '../destinos';
import { iconoDestino } from '../iconos';
import { buscarDestinos, buscarDocumentos } from '../buscar';

/**
 * EL BUSCADOR.
 *
 * ── Qué problema resuelve ─────────────────────────────────────────────────
 *
 * No la velocidad: el mapa. Hay 31 destinos repartidos en seis paneles, y un
 * hermano que quiere ver los turnos de la cartelera tiene que saber que
 * "Exhibidores" vive DENTRO de Programas semanales, bajo la categoría
 * Reuniones. Eso es justo lo que no sabe quien acaba de empezar.
 *
 * Por eso cada resultado dice también DÓNDE está. No es decoración: es lo que
 * hace que la segunda vez ya no haga falta buscar.
 *
 * ── La forma: el «search view» de Material ────────────────────────────────
 *
 * En la barra solo hay una lupa. Al pulsarla se abre esta vista a pantalla
 * completa, que es lo que M3 prescribe para móvil —la barra de búsqueda
 * permanente se come sitio de la cabecera todo el rato para algo que se usa de
 * vez en cuando—.
 *
 * Entra con las curvas de §2.4: sube un poco y aparece. Y se apaga sola con
 * `prefers-reduced-motion`, por la regla global.
 *
 * ── Lo que NO hace, a propósito ───────────────────────────────────────────
 *
 * No sustituye a las baldosas. Es un atajo para quien ya sabe lo que quiere;
 * quien no lo sabe sigue teniendo los paneles, que enseñan el mapa entero.
 */

const NOMBRE_CATEGORIA: Record<DestinoCategoria, string> = {
  reuniones: 'Reuniones',
  predicacion: 'Predicación',
  congregacion: 'Congregación',
  discursos: 'Discursos',
  informes: 'Informes',
  ajustes: 'Configuración',
};

const Fila = ({
  icono,
  titulo,
  donde,
  onClick,
}: {
  icono: ReactNode;
  titulo: string;
  /**
   * Dónde vive. Solo se pone al BUSCAR: en la lista por categorías sería
   * repetir debajo de cada nombre lo que ya dice la cabecera del grupo.
   */
  donde?: string;
  onClick: () => void;
}) => (
  <Box
    component="button"
    type="button"
    onClick={onClick}
    sx={{
      appearance: 'none',
      font: 'inherit',
      textAlign: 'left',
      border: 'none',
      background: 'none',
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      gap: '14px',
      padding: '10px 8px',
      // Fila de lista: mínimo táctil de 48 (§2.5a). Aquí con alto real, que
      // van pegadas una debajo de otra.
      minHeight: '56px',
      boxSizing: 'border-box',
      borderRadius: 'var(--shape-sm)',
      cursor: 'pointer',
      transition: 'background-color var(--motion-fast) var(--ease-standard)',
      '&:hover': { backgroundColor: 'var(--state-hover)' },
      '&:active': { backgroundColor: 'var(--state-pressed)' },
    }}
  >
    {/* La caja del icono: relleno tintado y SIN borde (§6.4b). */}
    <Box
      sx={{
        width: 40,
        height: 40,
        flexShrink: 0,
        borderRadius: 'var(--shape-md)',
        backgroundColor: 'var(--accent-150)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {icono}
    </Box>

    <Box sx={{ minWidth: 0, flex: 1 }}>
      <Typography className="body-regular-semibold" color="var(--ink)">
        {titulo}
      </Typography>
      {/* Dónde vive. Esto es lo que enseña el mapa: la segunda vez, el
          hermano ya sabe ir sin buscar. */}
      {donde && (
        <Typography className="label-small-regular" color="var(--ink-2)">
          {donde}
        </Typography>
      )}
    </Box>
  </Box>
);

const Grupo = ({
  titulo,
  children,
}: {
  titulo: string;
  children: ReactNode;
}) => (
  <Box sx={{ marginBottom: '20px' }}>
    <Typography
      className="label-small-semibold"
      color="var(--ink-2)"
      sx={{
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        padding: '0 8px 6px',
      }}
    >
      {titulo}
    </Typography>
    {children}
  </Box>
);

const Buscador = ({ onClose }: { onClose: () => void }) => {
  const navigate = useNavigate();
  const usuario = useCurrentUser();
  const documentos = useAtomValue(documentosState);
  const categorias = useAtomValue(documentoCategoriasState);

  const [termino, setTermino] = useState('');
  const campo = useRef<HTMLInputElement>(null);

  // El foco al abrir: si hay que tocar la caja para escribir, el atajo deja de
  // serlo. En móvil esto además levanta el teclado, que es lo que se espera.
  useEffect(() => {
    campo.current?.focus();
  }, []);

  // Mientras está abierto, lo de detrás no se desplaza. Sin esto, al arrastrar
  // dentro de los resultados se mueve la página del fondo y al cerrar te
  // encuentras en otro sitio.
  useEffect(() => {
    const previo = document.body.style.overflow;

    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previo;
    };
  }, []);

  // Escape cierra. Es gratis y quien usa teclado lo da por hecho.
  useEffect(() => {
    const alPulsar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', alPulsar);
    return () => window.removeEventListener('keydown', alPulsar);
  }, [onClose]);

  // Las banderas que miran los destinos. Se cogen del MISMO hook que usa el
  // resto de la app: si aquí se dedujeran por su cuenta, el buscador acabaría
  // discrepando de las puertas de las rutas.
  const roles: DestinoRoles = useMemo(
    () => ({
      isAdmin: usuario.isAdmin,
      isElder: usuario.isElder,
      isSecretary: usuario.isSecretary,
      isPublisher: usuario.isPublisher,
      isAppointed: usuario.isAppointed,
      isPersonViewer: usuario.isPersonViewer,
      isMidweekEditor: usuario.isMidweekEditor,
      isWeekendEditor: usuario.isWeekendEditor,
      isDepartmentsEditor: usuario.isDepartmentsEditor,
      isPublicTalkCoordinator: usuario.isPublicTalkCoordinator,
      isAttendanceEditor: usuario.isAttendanceEditor,
      isGroupOverseer: usuario.isGroupOverseer,
      isLanguageGroupOverseer: usuario.isLanguageGroupOverseer,
      isServiceCommittee: usuario.isServiceCommittee,
      isMeetingEditor: usuario.isMeetingEditor,
      isGroup: usuario.isGroup,
      enable_AP_application: usuario.enable_AP_application,
    }),
    [usuario]
  );

  const docsBuscables = useMemo(
    () =>
      documentos.map((d) => ({
        id: d.id,
        nombre: d.nombre,
        categoria: categorias.find((c) => c.id === d.categoriaId)?.nombre ?? '',
      })),
    [documentos, categorias]
  );

  const resultados = useMemo(
    () => buscarDestinos(termino, roles),
    [termino, roles]
  );

  const docs = useMemo(
    () => buscarDocumentos(termino, docsBuscables),
    [termino, docsBuscables]
  );

  const buscando = termino.trim().length > 0;
  const sinNada = buscando && resultados.length === 0 && docs.length === 0;

  const ir = (ruta: string) => {
    onClose();
    navigate(ruta);
  };

  // Con la caja vacía se enseña el mapa entero, agrupado. Para quien abre el
  // buscador sin saber qué escribir, ver todo lo que hay es la respuesta.
  const porCategoria = useMemo(() => {
    const permitidos = DESTINOS.filter((d) => !d.visible || d.visible(roles));

    return (Object.keys(NOMBRE_CATEGORIA) as DestinoCategoria[])
      .map((c) => ({
        categoria: c,
        destinos: permitidos.filter((d) => d.categoria === c),
      }))
      .filter((g) => g.destinos.length > 0);
  }, [roles]);

  return (
    /* AL `body`, y no donde nace.
     *
     * Un `position: fixed` NO se ancla a la ventana si algún ancestro tiene
     * `transform`, `filter` o `will-change`: pasa a anclarse a ESE ancestro.
     * Y la lupa vive dentro de `.topbar`, que tiene las dos cosas — medido: la
     * vista se quedaba en 343×96, del tamaño de la barra, con la página
     * asomando por debajo.
     *
     * El portal la saca al `body`, donde `fixed` vuelve a significar lo que
     * dice. Y de paso queda a salvo de que mañana alguien anime la barra. */
    <Portal>
      <Box
        className="buscador-vista"
        sx={{
          position: 'fixed',
          inset: 0,
          zIndex: 1300,
          backgroundColor: 'var(--paper)',
          display: 'flex',
          flexDirection: 'column',
          // La muesca del iPhone, igual que en los diálogos.
          paddingTop: 'env(safe-area-inset-top)',
        }}
      >
        {/* La caja de búsqueda, arriba y pegada */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '8px 12px',
            borderBottom: '1px solid var(--line)',
            backgroundColor: 'var(--card)',
          }}
        >
          <IconButton onClick={onClose} aria-label="Cerrar la búsqueda">
            <IconArrowBack color="var(--ink)" />
          </IconButton>

          <Box
            component="input"
            ref={campo}
            value={termino}
            onChange={(e) => setTermino(e.target.value)}
            onKeyDown={(e) => {
              // Intro abre el primero: quien escribe «exhi» y pulsa Intro no
              // quiere leer la lista, quiere llegar.
              if (e.key === 'Enter' && resultados.length > 0) {
                ir(resultados[0].destino.ruta);
              }
            }}
            placeholder="Buscar en la aplicación…"
            aria-label="Buscar en la aplicación"
            sx={{
              flex: 1,
              minWidth: 0,
              appearance: 'none',
              border: 'none',
              outline: 'none',
              background: 'none',
              color: 'var(--ink)',
              fontFamily: 'inherit',
              fontSize: '16px',
              padding: '8px 4px',
              '&::placeholder': { color: 'var(--ink-3)' },
            }}
          />

          {termino.length > 0 && (
            <IconButton
              onClick={() => {
                setTermino('');
                campo.current?.focus();
              }}
              aria-label="Borrar lo escrito"
            >
              <IconClose color="var(--ink-2)" />
            </IconButton>
          )}
        </Box>

        {/* Los resultados */}
        <Box
          sx={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 12px calc(24px + env(safe-area-inset-bottom))',
          }}
        >
          {!buscando &&
            porCategoria.map((g) => (
              <Grupo key={g.categoria} titulo={NOMBRE_CATEGORIA[g.categoria]}>
                {g.destinos.map((d) => (
                  <Fila
                    key={d.id}
                    icono={iconoDestino(d.id)}
                    titulo={d.nombre}
                    donde={NOMBRE_CATEGORIA[d.categoria]}
                    onClick={() => ir(d.ruta)}
                  />
                ))}
              </Grupo>
            ))}

          {buscando && resultados.length > 0 && (
            <Grupo titulo="Ir a">
              {resultados.map(({ destino }) => (
                <Fila
                  key={destino.id}
                  icono={iconoDestino(destino.id)}
                  titulo={destino.nombre}
                  donde={NOMBRE_CATEGORIA[destino.categoria]}
                  onClick={() => ir(destino.ruta)}
                />
              ))}
            </Grupo>
          )}

          {buscando && docs.length > 0 && (
            <Grupo titulo="Documentos">
              {docs.map((doc) => (
                <Fila
                  key={doc.id}
                  icono={iconoDestino('documentos')}
                  titulo={doc.nombre}
                  // La categoría del documento: es POR LO QUE se ha encontrado
                  // cuando el nombre no la dice.
                  donde={doc.categoria || 'Documentos'}
                  onClick={() => ir('/congregation/documentos')}
                />
              ))}
            </Grupo>
          )}

          {sinNada && (
            <Box sx={{ textAlign: 'center', padding: '48px 24px' }}>
              <Typography className="h3" color="var(--ink)">
                No hay nada con «{termino.trim()}»
              </Typography>
              <Typography
                className="body-small-regular"
                color="var(--ink-2)"
                sx={{ marginTop: '8px' }}
              >
                Prueba con otra palabra. También puedes buscar por la categoría
                de un documento.
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Portal>
  );
};

/** La lupa de la barra, y la vista que abre. */
const BotonBuscador = () => {
  const [abierto, setAbierto] = useState(false);

  return (
    <>
      <IconButton
        onClick={() => setAbierto(true)}
        aria-label="Buscar en la aplicación"
      >
        <IconSearch color="var(--black)" width={22} height={22} />
      </IconButton>

      {abierto && <Buscador onClose={() => setAbierto(false)} />}
    </>
  );
};

export default BotonBuscador;
