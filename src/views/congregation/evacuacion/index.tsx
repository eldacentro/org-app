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
const ANCHO_PLANO = 470;

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
    {nota ? (
      <Text style={{ ...text.meta, fontSize: 7, marginTop: 0.5 }}>{nota}</Text>
    ) : null}

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
  const esCaso = (regla: string) => /^en caso de que/i.test(regla.trim());
  const casos = plan.reglasEspeciales.filter(esCaso);
  const normas = [
    ...plan.normasEquipos,
    ...plan.reglasEspeciales.filter((r) => !esCaso(r)),
  ];

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
        <View style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {equipo.miembros.map((miembro) => (
            <View
              key={`${equipo.id}-${miembro.nombre}`}
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {miembro.posicion ? <Puesto>{miembro.posicion}</Puesto> : null}
              <Text style={{ ...text.bodyStrong, fontSize: 8.6, flex: 1 }}>
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
                dos. A 470 baja a 205 y cabe, que es lo que este documento
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

        {/* ④ Los dos casos de salida bloqueada, a dos columnas. */}
        {casos.length > 0 ? (
          <PdfCard
            title="Si una salida está bloqueada"
            dense
            style={{ marginTop: GAP }}
          >
            <View
              style={{ display: 'flex', flexDirection: 'row', gap: GAP + 4 }}
            >
              {casos.map((caso) => (
                <View key={caso} style={{ flex: 1 }}>
                  <Text
                    style={{ ...text.body, fontSize: 8.2, lineHeight: 1.35 }}
                  >
                    {caso}
                  </Text>
                </View>
              ))}
            </View>
          </PdfCard>
        ) : null}

        {/* ⑤ Normas generales, a dos columnas. */}
        {normas.length > 0 ? (
          <PdfCard title="Normas generales" dense style={{ marginTop: GAP }}>
            <View
              style={{ display: 'flex', flexDirection: 'row', gap: GAP + 4 }}
            >
              <View style={{ flex: 1 }}>
                {normas.slice(0, Math.ceil(normas.length / 2)).map((norma) => (
                  <Punto key={norma}>{norma}</Punto>
                ))}
              </View>
              <View style={{ flex: 1 }}>
                {normas.slice(Math.ceil(normas.length / 2)).map((norma) => (
                  <Punto key={norma}>{norma}</Punto>
                ))}
              </View>
            </View>
          </PdfCard>
        ) : null}
      </Sheet>
    </Document>
  );
};

export default EvacuacionPDF;
