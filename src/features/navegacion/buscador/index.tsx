import {
  Fragment,
  KeyboardEvent,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Box, Portal } from '@mui/material';
import { useAtomValue } from 'jotai';
import { useNavigate } from 'react-router';
import { useCurrentUser } from '@hooks/index';
import Typography from '@components/typography';
import IconButton from '@components/icon_button';
import { IconCancelCicle, IconClose, IconSearch } from '@icons/index';
import { documentosState, documentoCategoriasState } from '@states/documentos';
import { weekendMeetingOutgoingTalksPublicState } from '@states/settings';
import useUpcomingCircuitVisit from '@features/circuit_visit/shared/useUpcomingCircuitVisit';
import useCircuitVisitForBrothers from '@features/circuit_visit/shared/useCircuitVisitForBrothers';
import { DestinoCategoria, DestinoRoles } from '@definition/destinos';
import { DESTINOS } from '../destinos';
import { iconoDestino } from '../iconos';
import { buscarDestinos, buscarDocumentos, normalizar } from '../buscar';

/**
 * EL BUSCADOR.
 *
 * ── Qué problema resuelve ─────────────────────────────────────────────────
 *
 * No la velocidad: el mapa. Hay 31 destinos repartidos en seis paneles, y un
 * hermano que quiere ver los turnos de la cartelera tiene que saber que
 * «Exhibidores» vive DENTRO de Programas semanales, bajo la categoría
 * Reuniones. Eso es justo lo que no sabe quien acaba de empezar.
 *
 * Por eso cada resultado dice también DÓNDE está, y por eso con la caja vacía
 * se enseña el mapa entero: para quien abre esto sin saber qué escribir, ver
 * todo lo que hay ES la respuesta.
 *
 * ── La forma ──────────────────────────────────────────────────────────────
 *
 * En la barra solo hay una lupa. Al pulsarla se abre un panel flotante sobre
 * un velo desenfocado. El cristal va en el VELO y el panel es SÓLIDO: ver
 * `global/index.css`, que explica por qué eso no se negocia.
 *
 * Anclado ARRIBA y no centrado: con el teclado abierto, un panel centrado
 * salta al aparecer. Anclado arriba crece hacia abajo y se queda quieto.
 *
 * ── Lo que NO hace, a propósito ───────────────────────────────────────────
 *
 * No sustituye a las baldosas. Es un atajo para quien ya sabe lo que quiere;
 * quien no lo sabe sigue teniendo los paneles.
 */

const NOMBRE_CATEGORIA: Record<DestinoCategoria, string> = {
  reuniones: 'Reuniones',
  predicacion: 'Predicación',
  congregacion: 'Congregación',
  discursos: 'Discursos',
  informes: 'Informes',
  ajustes: 'Configuración',
};

const ORDEN_CATEGORIAS = Object.keys(NOMBRE_CATEGORIA) as DestinoCategoria[];

/**
 * Parte el nombre en tres para poder resaltar lo que coincide.
 *
 * Es EL detalle que hace que un buscador se sienta listo: ver «Exhi» destacado
 * dentro de «Exhibidores» confirma, sin leer nada más, que ha entendido lo que
 * escribías.
 *
 * Se busca sobre el texto normalizado y se corta sobre el ORIGINAL. Vale
 * porque normalizar no cambia la longitud con texto español —una «ó» sigue
 * ocupando un carácter—, pero si algún día no cuadrara, no se resalta nada en
 * vez de cortar por donde no es.
 */
const partirPorCoincidencia = (nombre: string, termino: string) => {
  const t = normalizar(termino.trim());
  const n = normalizar(nombre);

  if (t.length === 0 || n.length !== nombre.length) return null;

  const i = n.indexOf(t);

  if (i === -1) return null;

  return {
    antes: nombre.slice(0, i),
    coincide: nombre.slice(i, i + t.length),
    despues: nombre.slice(i + t.length),
  };
};

const TituloGrupo = ({ children }: { children: ReactNode }) => (
  <Typography
    className="label-small-semibold"
    color="var(--ink-2)"
    sx={{
      textTransform: 'uppercase',
      letterSpacing: '0.07em',
      padding: '10px 10px 6px',
      // Se queda pegada al recorrer: con el mapa entero dentro, saber en qué
      // categoría vas es la mitad de la orientación.
      position: 'sticky',
      top: 0,
      zIndex: 1,
      backgroundColor: 'var(--card)',
    }}
  >
    {children}
  </Typography>
);

const Fila = ({
  icono,
  titulo,
  termino,
  donde,
  activa,
  onClick,
  onHover,
}: {
  icono: ReactNode;
  titulo: string;
  /** Lo escrito, para resaltar la parte que coincide. */
  termino?: string;
  /**
   * Dónde vive. Solo al BUSCAR: en la lista por categorías sería repetir
   * debajo de cada nombre lo que ya dice la cabecera del grupo.
   */
  donde?: string;
  activa?: boolean;
  onClick: () => void;
  onHover?: () => void;
}) => {
  const partes = termino ? partirPorCoincidencia(titulo, termino) : null;

  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      onMouseEnter={onHover}
      sx={{
        appearance: 'none',
        font: 'inherit',
        textAlign: 'left',
        border: 'none',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        padding: '10px',
        // Fila de lista: mínimo táctil de 48 (§2.5a). Con alto real, que van
        // pegadas una debajo de otra.
        minHeight: '56px',
        boxSizing: 'border-box',
        borderRadius: 'var(--shape-md)',
        cursor: 'pointer',
        // La fila marcada lleva el MISMO dibujo de «elegido» que el resto de la
        // app (§2.5): píldora tintada, nunca color pleno.
        backgroundColor: activa ? 'var(--state-selected)' : 'transparent',
        transition: 'background-color var(--motion-fast) var(--ease-standard)',
      }}
    >
      <Box
        sx={{
          width: 40,
          height: 40,
          flexShrink: 0,
          borderRadius: 'var(--shape-md)',
          // Relleno tintado y SIN borde (§6.4b). Sobre la fila marcada se
          // invierte para que la cajita no desaparezca dentro del tinte.
          backgroundColor: activa ? 'var(--card)' : 'var(--accent-150)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icono}
      </Box>

      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography className="body-regular-semibold" color="var(--ink)">
          {partes ? (
            <>
              {partes.antes}
              <Box component="span" sx={{ color: 'var(--accent-dark)' }}>
                {partes.coincide}
              </Box>
              {partes.despues}
            </>
          ) : (
            titulo
          )}
        </Typography>

        {donde && (
          <Typography className="label-small-regular" color="var(--ink-2)">
            {donde}
          </Typography>
        )}
      </Box>

      {activa && (
        <Typography className="label-small-semibold" color="var(--ink-3)">
          ↵
        </Typography>
      )}
    </Box>
  );
};

/**
 * Lo que tarda en irse. Tiene que ser LO MISMO que `--motion-fast` en
 * `buscador-se-va`: si aquí fuera menos, se cortaría a media animación; si
 * fuera más, se quedaría un rato en negro esperando a nadie.
 */
const DURACION_SALIDA = 150;

/**
 * ¿ABRIMOS EL TECLADO SOLOS? Con ratón sí, con el dedo no.
 *
 * Antes se enfocaba el campo y punto, y el resultado dependía del sistema:
 * Android abre el teclado con un `focus()` de código, pero iOS lo ignora si no
 * viene pegado a un gesto —y el nuestro llegaba después del toque—. El mismo
 * botón hacía dos cosas distintas según el teléfono, que es peor que
 * cualquiera de las dos.
 *
 * Elegido: en el móvil NO se abre el teclado. El panel se abre para enseñar el
 * mapa entero y el teclado se come más de media pantalla justo cuando hay algo
 * que mirar; quien quiera escribir toca el campo, que lo tiene delante. Con
 * ratón y teclado no hay nada que tapar, así que ahí sí: listo para escribir.
 *
 * Se pregunta por el APARATO y no por el ancho: una tableta con teclado se
 * comporta como un escritorio, y un móvil apaisado de 900px sigue siendo un
 * dedo.
 */
const conRaton = () =>
  window.matchMedia('(hover: hover) and (pointer: fine)').matches;

const Buscador = ({
  onClose,
}: {
  /** `haNavegado` distingue «me voy a una página» de «cierro y me quedo». */
  onClose: (haNavegado: boolean) => void;
}) => {
  const navigate = useNavigate();
  const usuario = useCurrentUser();
  const documentos = useAtomValue(documentosState);
  const categorias = useAtomValue(documentoCategoriasState);

  /* Las dos pestañas de Programas semanales que NO siempre están.
   *
   * Se calculan igual que en `useWeeklySchedules`, con las mismas fuentes y en
   * el mismo orden — incluido que el anciano ve la visita en cuanto se
   * programa y el resto solo dentro de su ventana. Copiar la regla es lo malo;
   * lo que se copia aquí es la LLAMADA a quien la sabe. */
  const salientesPublicos = useAtomValue(
    weekendMeetingOutgoingTalksPublicState
  );
  const visitaCompleta = useUpcomingCircuitVisit();
  const visitaParaHermanos = useCircuitVisitForBrothers();

  const hayVisitaProxima = Boolean(
    usuario.isElder || usuario.isAdmin ? visitaCompleta : visitaParaHermanos
  );

  const [termino, setTermino] = useState('');
  const [activo, setActivo] = useState(0);
  const [seVa, setSeVa] = useState(false);
  const campo = useRef<HTMLInputElement>(null);
  const lista = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  /**
   * EL FOCO SE DA AL NACER EL NODO, NO EN UN EFECTO.
   *
   * Esto estaba mal desde el primer día y no se veía: el efecto de montaje
   * corría ANTES de que `Portal` hubiera puesto nada en el `body` —Portal
   * resuelve su contenedor en un efecto de disposición y hasta la siguiente
   * pasada no monta a sus hijos—, así que el `ref` valía `null`, el `?.` se lo
   * tragaba sin rechistar y el campo no se enfocaba nunca. Medido: cero
   * llamadas a `focus()` al abrir.
   *
   * Un `ref` de función se ejecuta EN EL MOMENTO en que el nodo entra en el
   * documento. No hay carrera que perder ni temporizador que ajustar.
   */
  const alMontarElCampo = useCallback((nodo: HTMLInputElement | null) => {
    campo.current = nodo;

    if (nodo && conRaton()) nodo.focus();
  }, []);

  const alMontarElPanel = useCallback((nodo: HTMLDivElement | null) => {
    panel.current = nodo;

    // Con el dedo el foco va al PANEL, no al campo: se entra en el diálogo
    // —que es lo que un lector de pantalla necesita— sin levantar el teclado.
    if (nodo && !conRaton()) nodo.focus();
  }, []);

  /**
   * Cerrar es en dos tiempos: primero se pinta yéndose, y solo después se
   * quita de en medio.
   *
   * Con `prefers-reduced-motion` la animación no existe —la regla general de
   * `index.css` la anula—, pero el reloj sigue corriendo: se queda quieto 150ms
   * y desaparece. Nadie percibe eso como espera, y a cambio no hay dos caminos
   * de cierre que mantener.
   */
  const cerrar = () => setSeVa(true);

  /**
   * Esc escucha en la VENTANA, no en el panel.
   *
   * Colgado del panel solo funcionaba con el foco dentro, y basta con pulsar en
   * un hueco del panel —o que otra cosa se lleve el foco— para que el foco
   * caiga al `body` y Esc deje de responder. Una tecla de escape que a veces va
   * y a veces no es peor que no tenerla: dejas de fiarte de ella.
   */
  useEffect(() => {
    const alPulsarEnLaVentana = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Escape') return;

      e.preventDefault();
      setSeVa(true);
    };

    window.addEventListener('keydown', alPulsarEnLaVentana);
    return () => window.removeEventListener('keydown', alPulsarEnLaVentana);
  }, []);

  useEffect(() => {
    if (!seVa) return;

    const reloj = setTimeout(() => onClose(false), DURACION_SALIDA);

    return () => clearTimeout(reloj);
  }, [seVa, onClose]);

  // Mientras está abierto, lo de detrás no se desplaza. Y no es solo comodidad:
  // un desenfoque con movimiento debajo se recompone en cada fotograma, que es
  // justo el coste que hay que evitar en un teléfono modesto.
  useEffect(() => {
    const previo = document.body.style.overflow;

    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previo;
    };
  }, []);

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
      verOradoresSalientes: salientesPublicos,
      hayVisitaProxima,
    }),
    [usuario, salientesPublicos, hayVisitaProxima]
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

  const permitidos = useMemo(
    () => DESTINOS.filter((d) => !d.visible || d.visible(roles)),
    [roles]
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

  const porCategoria = useMemo(
    () =>
      ORDEN_CATEGORIAS.map((c) => ({
        categoria: c,
        destinos: permitidos.filter((d) => d.categoria === c),
      })).filter((g) => g.destinos.length > 0),
    [permitidos]
  );

  /**
   * Todo lo que se puede abrir, EN EL ORDEN EN QUE SE VE. Es la lista sobre la
   * que se mueven las flechas: si el teclado recorriera otra cosa que lo que
   * hay en pantalla, la marca saltaría a sitios que no se ven.
   */
  const navegables = useMemo(() => {
    if (!buscando) {
      return porCategoria.flatMap((g) => g.destinos.map((d) => d.ruta));
    }

    return [
      ...resultados.map((r) => r.destino.ruta),
      ...docs.map(() => '/congregation/documentos'),
    ];
  }, [buscando, porCategoria, resultados, docs]);

  // Al cambiar lo escrito se vuelve arriba: si no, la marca se queda en una
  // fila que ya no existe.
  useEffect(() => {
    setActivo(0);
  }, [termino]);

  /**
   * Ir a un sitio cierra EN SECO, sin la animación de salida.
   *
   * No es un descuido: quien pulsa un resultado ya está mirando a otra parte, y
   * la transición que importa es la de la página que llega. Ver el buscador
   * desvanecerse encima solo retrasaría lo que ha pedido. La salida animada es
   * para cuando cierras y te quedas donde estabas, que es cuando el ojo
   * necesita saber a dónde ha ido lo que tapaba la pantalla.
   */
  const ir = (ruta: string, pestana?: string) => {
    onClose(true);
    navigate(pestana ? `${ruta}?ver=${pestana}` : ruta);
  };

  const alPulsarTecla = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();

      const siguiente =
        e.key === 'ArrowDown'
          ? Math.min(activo + 1, navegables.length - 1)
          : Math.max(activo - 1, 0);

      setActivo(siguiente);

      // Que la fila marcada se vea siempre. `nearest` y no `center`: centrar
      // mueve la lista entera en cada flecha y marea.
      const filas = lista.current?.querySelectorAll('[data-fila]');

      filas?.[siguiente]?.scrollIntoView({ block: 'nearest' });

      return;
    }

    if (e.key === 'Enter' && navegables[activo]) {
      e.preventDefault();
      ir(navegables[activo]);
    }
  };

  // El índice de cada fila, contando de arriba abajo en el orden en que se
  // pintan. Va fuera del render de cada bloque para que las flechas y lo que
  // se ve no puedan desincronizarse.
  let indice = -1;
  const siguienteIndice = () => {
    indice += 1;
    return indice;
  };

  return (
    /* AL `body`, y no donde nace.
     *
     * Un `position: fixed` NO se ancla a la ventana si algún ancestro tiene
     * `transform`, `filter` o `will-change`: pasa a anclarse a ESE ancestro. Y
     * la lupa vive dentro de `.topbar`, que tiene las dos cosas — medido, la
     * vista se quedaba en 343×96, del tamaño de la barra. */
    <Portal>
      {/* El velo, que es quien lleva el cristal. Pulsarlo cierra, que es lo
          que todo el mundo intenta. */}
      <Box
        className={`buscador-velo${seVa ? ' se-va' : ''}`}
        onClick={cerrar}
        aria-hidden
      />

      <Box
        ref={alMontarElPanel}
        className={`buscador-panel${seVa ? ' se-va' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Buscar en la aplicación"
        // -1: se le puede dar el foco desde código, pero no está en el
        // recorrido del tabulador. Es lo que permite entrar en el diálogo sin
        // meterse en el campo de escribir.
        tabIndex={-1}
        onKeyDown={alPulsarTecla}
        sx={{
          position: 'fixed',
          zIndex: 1301,
          // Anclado arriba y con márgenes. En pantalla ancha se centra y se
          // limita: un panel de 1200px de ancho no parece un buscador.
          top: 'calc(12px + env(safe-area-inset-top))',
          left: '16px',
          right: '16px',
          marginInline: 'auto',
          maxWidth: '560px',
          // `dvh` y no `vh`: en un móvil, `vh` no descuenta la barra del
          // navegador y el panel se saldría por abajo.
          maxHeight: 'calc(100dvh - 24px - env(safe-area-inset-top))',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          backgroundColor: 'var(--card)',
          borderRadius: 'var(--shape-xl)',
          // Sombra larga y suave con el tinte de la marca, no una dura.
          boxShadow:
            '0 24px 64px -16px rgba(var(--accent-dark-base), 0.45), 0 2px 8px rgba(0, 0, 0, 0.08)',
        }}
      >
        {/* La caja de escribir */}
        <Box sx={{ position: 'relative', flexShrink: 0 }}>
          {/* Un lavado de marca casi invisible: es lo que hace que la cabecera
              parezca cristal sin llevarlo. */}
          <Box
            aria-hidden
            sx={{
              position: 'absolute',
              inset: '0 0 auto',
              height: '64px',
              pointerEvents: 'none',
              background:
                'linear-gradient(180deg, rgba(var(--accent-main-base), 0.07), transparent)',
            }}
          />

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 14px',
              position: 'relative',
            }}
          >
            <IconSearch color="var(--ink-2)" width={20} height={20} />

            <Box
              component="input"
              ref={alMontarElCampo}
              value={termino}
              onChange={(e) => setTermino(e.target.value)}
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
                // 16px justos: por debajo, iOS hace zoom al enfocar el campo.
                fontSize: '16px',
                padding: '6px 0',
                '&::placeholder': { color: 'var(--ink-3)' },
                /* AQUÍ NO VA EL ANILLO DE FOCO.
                 *
                 * La regla global se lo pone a todo lo enfocable, y con razón:
                 * navegando con el tabulador hay que ver dónde estás. Pero
                 * dentro de este panel el foco no se busca, se da: se abre y ya
                 * estás escribiendo. El anillo solo dibujaba un rectángulo
                 * suelto alrededor de una franja que no parece un campo —el
                 * campo, visualmente, es el panel entero—.
                 *
                 * Lo que dice dónde estás es el cursor parpadeando, que no se
                 * quita. Dos clases de especificidad para ganarle a la global,
                 * que va en `:where()` y no puede subir más. */
                '&:focus-visible': { outline: 'none' },
              }}
            />

            {/* Borrar lo escrito. Aspa DENTRO de un círculo, que es el dibujo
                de toda la vida de «vaciar el campo» y no se confunde con el
                aspa desnuda de al lado, que cierra. Solo cuando hay algo que
                borrar. */}
            {termino.length > 0 && (
              <IconButton
                onClick={() => {
                  setTermino('');
                  campo.current?.focus();
                }}
                aria-label="Borrar lo escrito"
              >
                <IconCancelCicle color="var(--ink-3)" width={18} height={18} />
              </IconButton>
            )}

            {/* La pista de teclado, solo donde hay teclado. */}
            <Box
              aria-hidden
              sx={{
                display: { mobile: 'none', tablet688: 'block' },
                flexShrink: 0,
                border: '1px solid var(--line-2)',
                borderRadius: 'var(--shape-xs)',
                padding: '3px 6px',
              }}
            >
              <Typography className="label-small-semibold" color="var(--ink-3)">
                ESC
              </Typography>
            </Box>

            {/* CERRAR, y siempre visible.
             *
             * Pulsar el velo también cierra, y Esc también, pero ninguna de las
             * dos SE VE. Quien le da a la lupa sin querer necesita ver la
             * salida, no intuirla: en un móvil no hay Esc y «pulsa fuera» es
             * justo lo que no se le ocurre a quien se ha asustado. */}
            <IconButton onClick={cerrar} aria-label="Cerrar el buscador">
              <IconClose color="var(--ink-2)" width={20} height={20} />
            </IconButton>
          </Box>
        </Box>

        <Box
          sx={{ height: '1px', backgroundColor: 'var(--line)', flexShrink: 0 }}
        />

        {/* Los resultados */}
        <Box
          ref={lista}
          sx={{
            flex: 1,
            overflowY: 'auto',
            // A los lados sí, ARRIBA NO. Una cabecera pegajosa no puede subir
            // por encima del relleno de su contenedor —su bloque contenedor es
            // la caja de relleno—, así que con `padding: 8px` se quedaba 8px
            // más abajo y por esa rendija se veía pasar la lista por detrás.
            // Medido: borde del área 69, cabecera clavada en 77.
            padding: '0 8px',
            paddingBottom: 'calc(8px + env(safe-area-inset-bottom))',
          }}
        >
          {!buscando &&
            porCategoria.map((g) => (
              <Fragment key={g.categoria}>
                <TituloGrupo>{NOMBRE_CATEGORIA[g.categoria]}</TituloGrupo>

                {g.destinos.map((d) => {
                  const i = siguienteIndice();

                  return (
                    <Box key={d.id} data-fila>
                      <Fila
                        icono={iconoDestino(d.id)}
                        titulo={d.nombre}
                        // En el mapa solo lo llevan los que se llaman igual que
                        // otro —la pestaña y la página de editar—. Sin esto
                        // salían dos filas idénticas y no había forma de saber
                        // cuál era cuál.
                        donde={d.donde}
                        activa={i === activo}
                        onHover={() => setActivo(i)}
                        onClick={() => ir(d.ruta, d.pestana)}
                      />
                    </Box>
                  );
                })}
              </Fragment>
            ))}

          {buscando && resultados.length > 0 && (
            <>
              <TituloGrupo>Ir a</TituloGrupo>

              {resultados.map(({ destino }) => {
                const i = siguienteIndice();

                return (
                  <Box key={destino.id} data-fila>
                    <Fila
                      icono={iconoDestino(destino.id)}
                      titulo={destino.nombre}
                      termino={termino}
                      donde={
                        destino.donde ?? NOMBRE_CATEGORIA[destino.categoria]
                      }
                      activa={i === activo}
                      onHover={() => setActivo(i)}
                      onClick={() => ir(destino.ruta, destino.pestana)}
                    />
                  </Box>
                );
              })}
            </>
          )}

          {buscando && docs.length > 0 && (
            <>
              <TituloGrupo>Documentos</TituloGrupo>

              {docs.map((doc) => {
                const i = siguienteIndice();

                return (
                  <Box key={doc.id} data-fila>
                    <Fila
                      icono={iconoDestino('documentos')}
                      titulo={doc.nombre}
                      termino={termino}
                      // La categoría: es POR LO QUE se ha encontrado cuando el
                      // nombre no la dice.
                      donde={doc.categoria || 'Documentos'}
                      activa={i === activo}
                      onHover={() => setActivo(i)}
                      onClick={() => ir('/congregation/documentos')}
                    />
                  </Box>
                );
              })}
            </>
          )}

          {buscando && resultados.length === 0 && docs.length === 0 && (
            <Box sx={{ textAlign: 'center', padding: '40px 24px' }}>
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

/** La lupa de la barra, y el panel que abre. */
const BotonBuscador = () => {
  const [abierto, setAbierto] = useState(false);
  const lupa = useRef<HTMLButtonElement>(null);

  /**
   * Al cerrar, el foco vuelve a la lupa.
   *
   * Si no, se queda en el `body` y el siguiente tabulador empieza otra vez por
   * arriba del todo. Solo se nota navegando con teclado o con lector de
   * pantalla, que es justo a quien más le cuesta recuperarse de eso.
   *
   * Solo al cerrar de verdad: si se cerró porque el resultado te llevó a otra
   * página, el foco ya no es asunto nuestro.
   */
  const cerrado = (haNavegado: boolean) => {
    setAbierto(false);

    if (!haNavegado) lupa.current?.focus();
  };

  // Ctrl/⌘+K, donde hay teclado. No estorba a nadie y quien lo conoce lo
  // agradece.
  useEffect(() => {
    const alPulsar = (e: globalThis.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setAbierto(true);
      }
    };

    window.addEventListener('keydown', alPulsar);
    return () => window.removeEventListener('keydown', alPulsar);
  }, []);

  return (
    <>
      <IconButton
        ref={lupa}
        onClick={() => setAbierto(true)}
        aria-label="Buscar en la aplicación"
      >
        <IconSearch color="var(--black)" width={22} height={22} />
      </IconButton>

      {abierto && <Buscador onClose={cerrado} />}
    </>
  );
};

export default BotonBuscador;
