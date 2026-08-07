import { Image, Text, View } from '@react-pdf/renderer';
import { Document } from '@views/components';
import { PlanEvacuacion, RolEmergencia } from '@definition/evacuacion';
import {
  PdfBullet,
  PdfCard,
  PdfHairline,
  PdfNote,
  Sheet,
  color,
  nombreEntero,
  radius,
  text,
} from '@views/design';

/**
 * Documento 13 · Plan de evacuación — **una sola hoja, vertical**.
 *
 * ── Por qué vertical ─────────────────────────────────────────────────────
 *
 * Porque el plano del Salón es apaisado: a ancho completo de un A4 VERTICAL es
 * donde más grande cabe, y debajo queda sitio para las bandas. En apaisado
 * tendría que compartir fila y saldría más pequeño, para ganar un espacio que
 * aquí no hace falta. El plano es lo que se mira desde lejos en el tablón, así
 * que manda él.
 *
 * ── Qué es dinámico ──────────────────────────────────────────────────────
 *
 * Todo. El documento no tiene ni un nombre escrito: se dibuja entero desde el
 * `PlanEvacuacion` que hay en Dexie, el mismo que edita el engranaje de la
 * página. Cambiar quién ocupa el puesto A2 cambia el PDF.
 *
 * ── Viñetas ──────────────────────────────────────────────────────────────
 *
 * Puntos, nunca números. Los pasos de un protocolo parecen una secuencia
 * obligatoria cuando van numerados, y la mayoría de estas listas no lo son:
 * son cosas que hay que hacer, no un orden.
 */

const GAP = 4;

/** Una línea de lista con su punto. */
const Punto = ({ children }: { children: string }) => (
  <View
    style={{
      display: 'flex',
      flexDirection: 'row',
      gap: 5,
      paddingVertical: 0.6,
    }}
  >
    <View style={{ marginTop: 3.2 }}>
      <PdfBullet />
    </View>
    <Text style={{ ...text.body, fontSize: 8.2, flex: 1, lineHeight: 1.32 }}>
      {children}
    </Text>
  </View>
);

/** La cápsula del puesto: A1, B3… */
const Puesto = ({ children }: { children: string }) => (
  <Text
    style={{
      fontSize: 7.5,
      fontWeight: 800,
      color: color.accentDark,
      backgroundColor: color.wash,
      borderRadius: radius.full,
      paddingVertical: 1.5,
      paddingHorizontal: 5,
    }}
  >
    {children}
  </Text>
);

/** Rótulo a la izquierda y nombre a la derecha, como en la maqueta. */
const Persona = ({ rol, nombre }: { rol: string; nombre: string }) => (
  <View
    style={{
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      gap: 6,
      marginTop: 1.5,
    }}
  >
    <Text style={{ ...text.label, fontSize: 7 }}>{rol}</Text>
    <Text style={{ ...text.bodyStrong, fontSize: 8.4 }}>
      {nombreEntero(nombre)}
    </Text>
  </View>
);

/**
 * Una de las tres tarjetas de apoyo: quién lo lleva y qué hace.
 *
 * Son TRES tarjetas y no una a tres columnas. Con una sola, el rótulo de
 * arriba tenía que nombrar a los tres equipos —"Jefe de emergencias,
 * intervención y equipo sanitario"— y luego repetir cada nombre otra vez en
 * gris dentro de su columna. Cada equipo con su banda dice lo mismo una vez.
 */
const TarjetaApoyo = ({
  titulo,
  nota,
  gente,
  pasos,
}: {
  titulo: string;
  nota?: string;
  gente: { rol: string; nombre: string }[];
  pasos: string[];
}) => (
  <PdfCard title={titulo} meta={nota} dense style={{ flex: 1 }}>
    {gente.map((persona) => (
      <Persona key={persona.nombre} rol={persona.rol} nombre={persona.nombre} />
    ))}

    {pasos.length > 0 ? (
      <>
        <PdfHairline style={{ marginVertical: 4 }} />
        {pasos.map((paso) => (
          <Punto key={paso}>{paso}</Punto>
        ))}
      </>
    ) : null}
  </PdfCard>
);

type Props = {
  plan: PlanEvacuacion;
  cong_name: string;
  /** El plano ya rasterizado (ver `features/evacuacion/planoImagen`). */
  plano?: { src: string; ancho: number; alto: number };
};

const EvacuacionPDF = ({ plan, cong_name, plano }: Props) => {
  const equipoA = plan.equipos.find((e) => e.zona === 'A');
  const equipoB = plan.equipos.find((e) => e.zona === 'B');
  const sanitario = plan.equipos.find((e) => !e.zona);

  const buscaRol = (parte: string) =>
    plan.estructuraMando.find((r) =>
      r.rol.toLowerCase().includes(parte.toLowerCase())
    );

  // "Jefe" y "Auxiliar" a secas: la banda de la tarjeta ya dice de qué son, y
  // repetirlo dentro no cabe en un tercio de hoja.
  const corto = (rol: RolEmergencia | undefined, etiqueta: string) =>
    rol ? [{ rol: etiqueta, nombre: rol.nombre }] : [];

  const jefeEmergencias = buscaRol('jefe de emergencias');
  const auxEmergencias = buscaRol('auxiliar de emergencias');
  const jefeIntervencion = buscaRol('jefe de intervención');
  const auxIntervencion = buscaRol('auxiliar de intervención');

  /**
   * Las reglas del plan vienen todas en la misma lista, pero no todas son lo
   * mismo: unas son CASOS ("puerta principal bloqueada: …") y el resto son
   * normas que valen siempre.
   *
   * Se separan por lo que dicen y no por su posición, que se rompería en
   * cuanto alguien reordene la lista desde el engranaje. Y si ninguna encaja
   * —porque se hayan reescrito—, el bloque de casos no se pinta y todo cae en
   * las normas: se pierde el matiz, no el contenido.
   */
  const esCaso = (regla: string) => /bloquead/i.test(regla);
  const casos = plan.reglasEspeciales.filter(esCaso);
  const normas = [
    ...plan.normasEquipos,
    ...plan.reglasEspeciales.filter((r) => !esCaso(r)),
  ];

  /**
   * El año de la cápsula sale de CUÁNDO se actualizó, no de un campo escrito a
   * mano: `anio` se quedó en "2025" mientras el plan se seguía tocando, y una
   * hoja que dice un año que no es el suyo se lee como caducada.
   */
  const anio = new Date(plan.updatedAt || Date.now()).getFullYear();

  /**
   * CUÁNTO MIDE EL PLANO. La cuenta que sustituye al número escrito a mano.
   *
   * El problema real: la hoja cabía o no cabía según cuánto texto tuviera el
   * plan de cada congregación. Con los datos de prueba entraba; con los de
   * Elda, que llevan responsabilidades y normas editadas, no. Un ancho fijo no
   * puede acertar con las dos.
   *
   * Así que se estima lo que ocupa el TEXTO y el plano se queda con el resto.
   * La estimación es de brocha gorda —cuántos renglones da cada frase en su
   * columna, a 8,2 pt— y por eso va con holgura y con topes: no hace falta
   * clavarla, hace falta no pasarse. Si sobra, el plano sale un poco menor que
   * el máximo; si falta, se queda en su mínimo legible y la hoja sigue siendo
   * una.
   */
  const ANCHO_UTIL = 535; // A4 vertical menos los márgenes del modo compacto

  /**
   * El alto que queda para el contenido, CALIBRADO contra una hoja real.
   *
   * La cuenta de servilleta daba 700 (842 de A4, menos 30 de margen, menos 44
   * de pie, menos unos 75 de cabecera y regla). Con ese número el plano salía
   * de 238 pt y la hoja se iba a dos. Midiendo la última hoja que SÍ cupo, el
   * plano medía unos 150, así que la estimación se pasaba en más de 100: lo que
   * no cuentan los rellenos y los bordes de cada tarjeta, que son muchos.
   *
   * En vez de afinar el modelo —que tendría que saber lo que react-pdf hace
   * por dentro— se corrige el total. La cuenta de abajo solo tiene que
   * repartir bien, no acertar al punto.
   */
  const ALTO_UTIL = 592;

  /** Renglones que da un texto en una columna de `ancho` puntos. */
  const renglones = (texto: string, ancho: number) =>
    Math.max(1, Math.ceil((texto.length * 4.05) / ancho));

  const altoLista = (textos: string[], ancho: number) =>
    textos.reduce(
      (total, t) => total + renglones(t, ancho - 8) * 10.9 + 1.2,
      0
    );

  // Banda + relleno de una tarjeta, y el hueco entre filas.
  const TARJETA = 22;

  const anchoMitad = (ANCHO_UTIL - GAP) / 2;
  const anchoTercio = (ANCHO_UTIL - GAP * 2) / 3;

  const filaEquipos =
    TARJETA +
    12 + // la línea de los tres nombres
    5 + // el hairline
    Math.max(
      altoLista(equipoA?.procedimiento ?? [], anchoMitad),
      altoLista(equipoB?.procedimiento ?? [], anchoMitad)
    );

  const filaApoyo =
    TARJETA +
    2 * 12 + // jefe y auxiliar
    5 +
    Math.max(
      altoLista(
        [
          ...(jefeEmergencias?.responsabilidades ?? []),
          ...(auxEmergencias?.responsabilidades ?? []),
        ],
        anchoTercio
      ),
      altoLista(plan.procedimientoIntervencion.pasos, anchoTercio),
      altoLista(sanitario?.procedimiento ?? [], anchoTercio)
    );

  const filaFinal = Math.max(
    TARJETA + altoLista(casos, anchoMitad),
    TARJETA + altoLista(normas, anchoMitad)
  );

  const relacion = plano ? plano.ancho / plano.alto : 2.4;
  const hueco =
    ALTO_UTIL - filaEquipos - filaApoyo - filaFinal - GAP * 3 - TARJETA;

  const altoPlano = Math.max(105, Math.min(hueco, ANCHO_UTIL / relacion));
  const anchoPlano = altoPlano * relacion;

  const equipoCard = (equipo: typeof equipoA) => {
    if (!equipo) return null;

    const responsable = equipo.miembros.find((m) => m.esResponsable);

    return (
      <PdfCard
        title={equipo.nombre}
        meta={
          responsable ? `Resp.: ${nombreEntero(responsable.nombre)}` : undefined
        }
        dense
        style={{ flex: 1 }}
      >
        {/* Los tres nombres en UNA línea, no en tres filas: lo pide la
            especificación de la variante de una hoja y ahorra cuatro
            renglones entre los dos equipos sin tocar una palabra. */}
        <View
          style={{
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 5,
          }}
        >
          {equipo.miembros.map((miembro) => (
            <View
              key={`${equipo.id}-${miembro.nombre}`}
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
              }}
            >
              {miembro.posicion ? <Puesto>{miembro.posicion}</Puesto> : null}
              <Text style={{ ...text.bodyStrong, fontSize: 8.2 }}>
                {nombreEntero(miembro.nombre)}
              </Text>
            </View>
          ))}
        </View>

        {/* Sin rótulo "ORDEN DE DESALOJO": debajo del nombre de un equipo de
            evacuación, una lista de pasos no puede ser otra cosa. Una línea
            menos por equipo. */}
        {equipo.procedimiento.length > 0 ? (
          <>
            <PdfHairline style={{ marginVertical: 4 }} />
            {equipo.procedimiento.map((paso) => (
              <Punto key={paso}>{paso}</Punto>
            ))}
          </>
        ) : null}
      </PdfCard>
    );
  };

  return (
    <Document title="Plan de evacuación" lang="es-ES">
      <Sheet
        congregation={cong_name}
        period={String(anio)}
        title="Plan de evacuación"
        documentName="Plan de evacuación"
        updatedAt={plan.fechaDocumento}
        dense
      >
        {/* ① EL PLANO, lo que se mira desde lejos, con su leyenda debajo. */}
        {plano ? (
          <PdfCard title="Plano del Salón" flush dense>
            {/* Ancho y alto EXPLÍCITOS, y centrado.
                Con `width: '100%'` el plano se estiraba siempre al ancho de la
                tarjeta —532— pasara lo que pasara: cambiar su tamaño solo
                cambiaba la resolución del PNG, no lo que ocupaba en la hoja.
                Estuvo un buen rato pareciendo que encogerlo no servía de nada.
                El alto viene medido del propio dibujo, así que si algún día
                cambia el plano la caja se ajusta sola. */}
            {/* Medidas EXPLÍCITAS, nunca `flexGrow` ni `height: '100%'`.
                Se probó a que el plano se quedara con lo que sobrara, que es
                lo que hace la cuadrícula del calendario (R16). Aquí no vale:
                con un padre que crece y un hijo al 100 %, react-pdf pierde la
                cuenta y no solo hincha el plano — los renglones de las
                tarjetas de abajo se dibujan UNOS ENCIMA DE OTROS. */}
            <View style={{ alignItems: 'center' }}>
              <Image
                src={plano.src}
                style={{ width: anchoPlano, height: altoPlano }}
              />
            </View>
          </PdfCard>
        ) : null}

        {/* ② Los dos equipos de evacuación. */}
        <View
          style={{
            display: 'flex',
            flexDirection: 'row',
            gap: GAP,
            marginTop: GAP,
          }}
        >
          {equipoCard(equipoA)}
          {equipoCard(equipoB)}
        </View>

        {/* ③ Los tres equipos de apoyo, cada uno en su tarjeta. */}
        <View
          style={{
            display: 'flex',
            flexDirection: 'row',
            gap: GAP,
            marginTop: GAP,
          }}
        >
          <TarjetaApoyo
            titulo="Jefe de emergencias"
            gente={[
              ...corto(jefeEmergencias, 'Jefe'),
              ...corto(auxEmergencias, 'Auxiliar'),
            ]}
            pasos={[
              ...(jefeEmergencias?.responsabilidades ?? []),
              ...(auxEmergencias?.responsabilidades ?? []),
            ]}
          />
          <TarjetaApoyo
            titulo="Equipo de intervención"
            // En la BANDA y no como una línea dentro: es una condición de
            // todo el equipo, no un paso más, y ahí no gasta renglón.
            //
            // Corta a propósito. El aviso entero —"Este protocolo sólo se
            // activará en casos necesarios"— no cabe al lado del título en un
            // tercio de hoja: se montaba encima de él.
            nota="solo si es necesario"
            gente={[
              ...corto(jefeIntervencion, 'Jefe'),
              ...corto(auxIntervencion, 'Auxiliar'),
            ]}
            pasos={plan.procedimientoIntervencion.pasos}
          />
          {sanitario ? (
            <TarjetaApoyo
              titulo={sanitario.nombre}
              gente={sanitario.miembros.map((m, i) => ({
                rol: i === 0 ? 'Jefe' : 'Auxiliar',
                nombre: m.nombre,
              }))}
              pasos={sanitario.procedimiento}
            />
          ) : null}
        </View>

        {/* ④ y ⑤ Los casos de salida bloqueada y las normas, A LA PAR.
            Son las dos bandas más pequeñas y las dos de leer con calma, no de
            mirar de reojo. Apiladas se llevaban la hoja a dos; a la par caben
            y además se acaba la página con un bloque de dos columnas, que es
            como empieza —los dos equipos—. */}
        <View
          wrap={false}
          style={{
            display: 'flex',
            flexDirection: 'row',
            gap: GAP,
            marginTop: GAP,
          }}
        >
          {casos.length > 0 ? (
            <PdfNote style={{ flex: 1 }}>
              <View style={{ marginBottom: 3 }}>
                <Text style={{ ...text.label, color: color.accentDark }}>
                  Si una salida está bloqueada
                </Text>
              </View>
              {casos.map((caso) => {
                // "Puerta principal bloqueada: verificar los aseos…" → la
                // entradilla en negrita, EN LÍNEA con el resto.
                //
                // Dos <Text> anidados dentro de uno, y ni una cadena suelta
                // entre ellos: es lo que permite R17 y lo que hace que la
                // negrita no se lleve su propio renglón.
                const corte = caso.indexOf(':');
                const entradilla = corte > 0 ? caso.slice(0, corte) : null;
                const resto = corte > 0 ? caso.slice(corte + 1).trim() : caso;

                return (
                  <View key={caso} style={{ marginBottom: 2 }}>
                    <Text
                      style={{ ...text.body, fontSize: 8.2, lineHeight: 1.32 }}
                    >
                      {entradilla ? (
                        <Text style={{ fontWeight: 600 }}>{entradilla}: </Text>
                      ) : null}
                      <Text>{resto}</Text>
                    </Text>
                  </View>
                );
              })}
            </PdfNote>
          ) : null}

          {normas.length > 0 ? (
            <PdfCard title="Normas generales" dense style={{ flex: 1 }}>
              {normas.map((norma) => (
                <Punto key={norma}>{norma}</Punto>
              ))}
            </PdfCard>
          ) : null}
        </View>
      </Sheet>
    </Document>
  );
};

export default EvacuacionPDF;
