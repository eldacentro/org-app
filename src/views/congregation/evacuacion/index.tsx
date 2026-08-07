import { ReactNode } from 'react';
import { Image, Text, View } from '@react-pdf/renderer';
import { Document } from '@views/components';
import { PlanEvacuacion } from '@definition/evacuacion';
import {
  PdfBullet,
  PdfCard,
  PdfHairline,
  Sheet,
  color,
  radius,
  stroke,
  nombreEntero,
  text,
} from '@views/design';

/**
 * Documento 13 · Plan de evacuación — **una sola hoja, vertical**.
 *
 * ── Por qué vertical ─────────────────────────────────────────────────────
 *
 * Porque el plano del Salón es apaisado 2,3:1. A ancho completo de un A4
 * VERTICAL mide 532 pt, que es el mayor tamaño que puede tener en una cara, y
 * deja debajo sitio para cuatro bandas. En un A4 apaisado tendría que
 * compartir fila con las tarjetas de equipo y bajaría a unos 385 pt —un 28 %
 * más pequeño— para ganar un espacio que aquí no hace falta. El plano es lo
 * que se mira desde lejos en el tablón, así que manda él.
 *
 * ── Qué es dinámico ──────────────────────────────────────────────────────
 *
 * Todo. El documento no tiene ni un nombre escrito: se dibuja entero desde el
 * `PlanEvacuacion` que hay en Dexie, el mismo que edita el engranaje de la
 * página. Cambiar quién ocupa el puesto A2 cambia el PDF.
 *
 * ── Los textos son los del protocolo, LITERALES ──────────────────────────
 *
 * La maqueta del sistema de documentos los enseña abreviados ("Desaloja
 * empezando por la sala B…") porque es una maqueta y necesita que quepan. Aquí
 * NO se abrevian: `@definition/evacuacion` lo dice y tiene razón — esto es un
 * protocolo de emergencia y lo que ponga es lo que alguien va a leer y hacer.
 * Por eso el modo compacto aprieta la escala y no el texto.
 *
 * ── Viñetas ──────────────────────────────────────────────────────────────
 *
 * Puntos, nunca números. Los pasos de un protocolo parecen una secuencia
 * obligatoria cuando van numerados, y la mayoría de estas listas no lo son
 * —son cosas que hay que hacer, no un orden—. Es además lo que pidió Carlos.
 */

/**
 * El hueco entre las bandas. Cinco y no ocho: este documento TIENE que caber
 * en una cara, y el modo compacto del sistema aprieta la escala, no el aire
 * entre bloques — así que el aire se ajusta aquí.
 */
const GAP = 5;

/** Lo que mide el plano en la hoja. Ver la nota donde se pinta. */
const ANCHO_PLANO = 532;

/** Un rótulo de los pequeños: 7/700 versalitas en gris claro. */
const Rotulo = ({ children }: { children: string }) => (
  <Text style={{ ...text.label, fontSize: 7 }}>{children}</Text>
);

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
    <Text style={{ ...text.body, fontSize: 8.2, flex: 1, lineHeight: 1.35 }}>
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

/**
 * Una de las tres columnas de apoyo: quién lo lleva y qué hace.
 *
 * La separación es un hairline VERTICAL entre columnas, nunca un borde contra
 * el canto redondeado de la tarjeta (R7): por eso la última no lo lleva y las
 * demás lo llevan a la derecha, con su hueco.
 */
const Columna = ({
  titulo,
  nota,
  gente,
  pasos,
  ultima,
}: {
  titulo: string;
  nota?: string;
  gente: ({ rol: string; nombre: string } | undefined)[];
  pasos: string[];
  ultima?: boolean;
}) => (
  <View
    style={{
      flex: 1,
      paddingRight: ultima ? 0 : 9,
      marginRight: ultima ? 0 : 9,
      borderRight: ultima
        ? undefined
        : `${stroke.hairline}px solid ${color.hairline}`,
    }}
  >
    <Rotulo>{titulo}</Rotulo>
    {/* El renglón de la nota se reserva en las TRES columnas aunque solo una
        lo use: si no, esa columna empieza un escalón más abajo que sus
        vecinas y las tres dejan de alinearse arriba. */}
    <Text style={{ ...text.meta, fontSize: 7, marginTop: 0.5 }}>
      {nota ?? ' '}
    </Text>

    {gente.filter(Boolean).map((persona) => (
      <View
        key={persona!.nombre}
        style={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          gap: 6,
          marginTop: 1.5,
        }}
      >
        <Text style={{ ...text.label, fontSize: 7 }}>{persona!.rol}</Text>
        <Text style={{ ...text.bodyStrong, fontSize: 8.4 }}>
          {nombreEntero(persona!.nombre)}
        </Text>
      </View>
    ))}

    {pasos.length > 0 ? (
      <>
        <PdfHairline style={{ marginVertical: 4 }} />
        {pasos.map((paso) => (
          <Punto key={paso}>{paso}</Punto>
        ))}
      </>
    ) : null}
  </View>
);

type Props = {
  plan: PlanEvacuacion;
  cong_name: string;
  /** El plano ya rasterizado (ver `features/evacuacion/planoImagen`). */
  plano?: string;
};

const EvacuacionPDF = ({ plan, cong_name, plano }: Props) => {
  const equipoA = plan.equipos.find((e) => e.zona === 'A');
  const equipoB = plan.equipos.find((e) => e.zona === 'B');
  const sanitario = plan.equipos.find((e) => !e.zona);

  const buscaRol = (parte: string) =>
    plan.estructuraMando.find((r) =>
      r.rol.toLowerCase().includes(parte.toLowerCase())
    );

  // "Jefe" y "Auxiliar" a secas: el rótulo de la columna ya dice de qué son,
  // y repetirlo ("Jefe de emergencias / Auxiliar de emergencias") no cabe en
  // un tercio de hoja.
  const corto = (
    rol: ReturnType<typeof buscaRol>,
    etiqueta: string
  ): { rol: string; nombre: string } | undefined =>
    rol ? { rol: etiqueta, nombre: rol.nombre } : undefined;

  const jefeEmergencias = buscaRol('jefe de emergencias');
  const auxEmergencias = buscaRol('auxiliar de emergencias');
  const jefeIntervencion = buscaRol('jefe de intervención');
  const auxIntervencion = buscaRol('auxiliar de intervención');

  /**
   * Las reglas del plan vienen todas en la misma lista, pero no todas son lo
   * mismo: las dos primeras son CASOS ("en caso de que la puerta principal
   * esté bloqueada…") y el resto son normas que valen siempre.
   *
   * Se separan por cómo empiezan y no por su posición, que se rompería en
   * cuanto alguien reordene la lista desde el engranaje. Y si ninguna encaja
   * —porque se hayan reescrito—, la tarjeta de casos no se pinta y todo cae en
   * las normas: se pierde el matiz, no el contenido.
   */
  const esCaso = (regla: string) => /bloquead/i.test(regla);

  /**
   * El subtítulo de la hoja ya dice "tiempo máximo de evacuación: 4 minutos",
   * así que la norma que repite ese mismo número sobra en el papel. Se detecta
   * por el número —sale de `tiempoMaximo`—, no por la frase, para que siga
   * valiendo si alguien la reescribe o cambia los minutos.
   */
  const repiteElTiempo = (regla: string) =>
    /tiempo\s+m[áa]ximo/i.test(regla) &&
    new RegExp(`\\b${plan.tiempoMaximo}\\b`).test(regla);

  const casos = plan.reglasEspeciales.filter(esCaso);
  const normas = [
    ...plan.normasEquipos,
    ...plan.reglasEspeciales.filter((r) => !esCaso(r)),
  ].filter((r) => !repiteElTiempo(r));

  const equipoCard = (equipo: typeof equipoA, titulo: string): ReactNode => {
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
        {/* Los tres nombres en UNA línea, no en tres filas.
            Lo pide la especificación de la variante de una hoja ("los seis
            nombres pasan a una línea por equipo") y ahorra cuatro renglones
            entre los dos equipos sin tocar una sola palabra. La cápsula del
            puesto va pegada a su nombre, así que se sigue leyendo quién es A1
            de un vistazo. */}
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

        {equipo.procedimiento.length > 0 ? (
          <>
            <PdfHairline style={{ marginVertical: 5 }} />
            <View style={{ marginBottom: 3 }}>
              <Rotulo>{titulo}</Rotulo>
            </View>
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
        period={plan.anio}
        title="Plan de evacuación"
        subtitle={`Salón del Reino · tiempo máximo de evacuación: ${plan.tiempoMaximo} minutos`}
        documentName="Plan de evacuación"
        updatedAt={plan.fechaDocumento}
        updatedVerb="Aprobado el"
        dense
      >
        {/* ① EL PLANO, a ancho completo — lo que se mira desde lejos. */}
        {plano ? (
          <PdfCard title="Plano del Salón" flush dense>
            {/* Ancho EXPLÍCITO y centrado, no `width: '100%'`.
                El plano es apaisado 2,3:1, así que su alto sale de su ancho:
                a los 532 pt de la caja se comía 232 de alto y la hoja se iba a
                dos. A 350 baja a 153 y todo cabe con holgura, que es lo que este documento
                tiene que hacer. Los 532 de la especificación son el máximo
                posible en una cara, no una obligación. */}
            <View style={{ alignItems: 'center' }}>
              <Image src={plano} style={{ width: ANCHO_PLANO }} />
            </View>
          </PdfCard>
        ) : null}

        {/* ② Los dos equipos de evacuación, a dos columnas. */}
        <View
          style={{
            display: 'flex',
            flexDirection: 'row',
            gap: GAP,
            marginTop: GAP,
          }}
        >
          {equipoCard(equipoA, 'Orden de desalojo')}
          {equipoCard(equipoB, 'Orden de desalojo')}
        </View>

        {/* ③ Los tres equipos de apoyo, fundidos en UNA tarjeta a TRES
            COLUMNAS. Apilados —nombres arriba y luego cada procedimiento en su
            franja— la hoja se iba a dos, que es justo lo que este documento no
            puede hacer: es el del tablón. A tres columnas cada equipo se lee
            entero de una pasada y cabe. Lo pide así la especificación. */}
        <PdfCard
          title="Jefe de emergencias, intervención y equipo sanitario"
          dense
          style={{ marginTop: GAP }}
        >
          <View style={{ display: 'flex', flexDirection: 'row' }}>
            <Columna
              titulo="Jefe de emergencias"
              gente={[
                corto(jefeEmergencias, 'Jefe'),
                corto(auxEmergencias, 'Auxiliar'),
              ]}
              pasos={[
                ...(jefeEmergencias?.responsabilidades ?? []),
                ...(auxEmergencias?.responsabilidades ?? []),
              ]}
            />
            <Columna
              titulo="Equipo de intervención"
              nota={plan.procedimientoIntervencion.aviso}
              gente={[
                corto(jefeIntervencion, 'Jefe'),
                corto(auxIntervencion, 'Auxiliar'),
              ]}
              pasos={plan.procedimientoIntervencion.pasos}
            />
            {sanitario ? (
              <Columna
                titulo={sanitario.nombre}
                gente={sanitario.miembros.map((m, i) => ({
                  rol: i === 0 ? 'Jefe' : 'Auxiliar',
                  nombre: m.nombre,
                }))}
                pasos={sanitario.procedimiento}
                ultima
              />
            ) : null}
          </View>
        </PdfCard>

        {/* ④ y ⑤ Los casos de salida bloqueada y las normas, A LA PAR.
            La especificación los pone uno debajo del otro, y con sus textos
            abreviados caben así. Aquí NO se abrevian —es un protocolo de
            emergencia, ver la nota de arriba—, y apilados se llevaban la hoja
            a dos. Antes que encoger el plano, que es lo que se mira desde
            lejos y por lo que esta hoja va en vertical, se ponen a la par:
            siguen leyéndose de arriba abajo por importancia y son las dos
            bandas más pequeñas. */}
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
            <PdfCard
              title="Si una salida está bloqueada"
              dense
              style={{ flex: 1 }}
            >
              {casos.map((caso) => {
                // "Puerta principal bloqueada: verificar los aseos…" → la
                // entradilla en negrita y el resto normal. Dos <Text>
                // hermanos y no uno con hijos mezclados: R17.
                const corte = caso.indexOf(':');
                const entradilla = corte > 0 ? caso.slice(0, corte) : null;
                const resto = corte > 0 ? caso.slice(corte + 1).trim() : caso;

                return (
                  <View key={caso} style={{ marginBottom: 3 }}>
                    {entradilla ? (
                      <Text style={{ ...text.bodyStrong, fontSize: 8.2 }}>
                        {entradilla}
                      </Text>
                    ) : null}
                    <Text
                      style={{ ...text.body, fontSize: 8.2, lineHeight: 1.35 }}
                    >
                      {resto}
                    </Text>
                  </View>
                );
              })}
            </PdfCard>
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
