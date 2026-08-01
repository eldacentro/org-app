import { Text, View } from '@react-pdf/renderer';
import { Document } from '@views/components';
import {
  PdfCard,
  PdfNote,
  PdfTable,
  Sheet,
  color,
  fechaPie,
  size,
  space,
  text,
} from '@views/design';
import registerFonts from '@views/registerFonts';

registerFonts();

/**
 * Documento 13 · Quién ve qué en la aplicación.
 *
 * Para el cuerpo de ancianos: qué partes de la aplicación puede abrir cada
 * hermano según los encargos que tenga. Existe para que puedan comprobar de un
 * vistazo que la aplicación no enseña a nadie lo que no le toca.
 *
 * **Cada fila sale de una puerta real del código** (los `Route` de `App.tsx` y
 * las banderas de `useCurrentUser`), no de lo que se supone que hace. Si mañana
 * cambia una puerta, este documento hay que rehacerlo — por eso lleva la fecha
 * en el pie.
 */

type Fila = { area: string; quien: string };

/** Lo que ve cualquiera que abra la aplicación, sin ningún encargo. */
const ABIERTAS: string[] = [
  'La pantalla de inicio y sus seis apartados',
  'Mis asignaciones',
  'Programas semanales de las reuniones',
  'Próximos eventos',
  'Limpieza del Salón',
  'Plan de evacuación',
  'Documentos',
  'Territorios',
  'Mi cuenta y la Ayuda',
];

/**
 * Lo que pide un encargo. El texto de «quién» describe la puerta tal cual está
 * escrita, incluidas las sumas: donde pone «o», basta con uno de los dos.
 */
const PREDICACION: Fila[] = [
  {
    area: 'Informe de predicación',
    quien: 'Quien está registrado como publicador',
  },
  {
    area: 'Solicitud de precursor auxiliar',
    quien: 'Publicador, y con la cuenta conectada',
  },
  {
    area: 'Grupos de predicación\nResponsabilidades',
    quien: 'Publicador, anciano o siervo ministerial, o superintendente de servicio',
  },
  {
    area: 'Salidas de predicación\nExhibidores',
    quien: 'Superintendente de servicio',
  },
];

/** Reuniones, discursos y lo que se programa. */
const REUNIONES: Fila[] = [
  {
    area: 'Lista de discursos públicos',
    quien: 'Anciano o siervo ministerial, o quien programa el fin de semana',
  },
  {
    area: 'Catálogo de oradores\nDiscursos salientes',
    quien: 'Anciano o siervo ministerial, o el coordinador de discursos',
  },
];

/** Personas, registros y administración. */
const REGISTROS: Fila[] = [
  {
    area: 'Personas (fichas y contactos)',
    quien: 'Anciano, o quien programa reuniones o discursos',
  },
  {
    area: 'Añadir una persona nueva',
    quien: 'Quien programa reuniones o discursos',
  },
  {
    area: 'Ausencias\nAjustes de la congregación\nRegistros de publicadores (S-21)\nVisita del superintendente',
    quien: 'Ancianos',
  },
  {
    area: 'Solicitudes de precursor auxiliar',
    quien: 'Ancianos, con la cuenta conectada',
  },
  {
    area: 'Registro de asistencia',
    quien: 'Quien lleva el registro de asistencia',
  },
  {
    area: 'Reunión de entre semana (editor)',
    quien: 'Quien programa la reunión de entre semana',
  },
  {
    area: 'Reunión de fin de semana (editor)',
    quien: 'Quien la programa, o el coordinador de discursos',
  },
  {
    area: 'Departamentos (editor)',
    quien: 'Quien programa la reunión de entre semana o los departamentos',
  },
  {
    area: 'Materiales de reunión',
    quien: 'Quien programa alguna de las dos reuniones',
  },
  {
    area: 'Informes de predicación de la congregación',
    quien: 'Secretario, superintendente de grupo o de grupo de idioma',
  },
  { area: 'Ajustes de grupo', quien: 'Superintendente de grupo de idioma' },
  { area: 'Informe a la sucursal (S-1)', quien: 'Administradores' },
  { area: 'Gestionar accesos', quien: 'Administradores, con la cuenta conectada' },
];

const COLUMNAS = [
  { key: 'area', header: 'Parte de la aplicación', width: 232, strong: true },
  { key: 'quien', header: 'Quién puede abrirla', flex: true },
];

export type TemplateAccesosProps = {
  congregation: string;
};

const TemplateAccesos = ({ congregation }: TemplateAccesosProps) => (
  <Document title="Quién ve qué en la aplicación" lang="es">
    <Sheet
      congregation={congregation}
      title="Quién ve qué en la aplicación"
      subtitle="Qué puede abrir cada hermano según sus encargos"
      documentName="Accesos por encargo"
      updatedAt={fechaPie()}
    >
      {/* El texto va dentro de un <Text>: una cadena suelta dentro de un
          <View> de react-pdf no se dibuja, y el aviso salía como una banda
          azul vacía. */}
      <PdfNote>
        <Text style={text.body}>
          Un hermano solo ve aquello para lo que tiene encargo. No es que las
          pantallas estén escondidas: la aplicación no le deja entrar, y si lo
          intenta escribiendo la dirección a mano, vuelve al inicio.
        </Text>
      </PdfNote>

      <PdfCard title="Lo que ve cualquier hermano">
        <Text style={{ ...text.body, marginBottom: space.sm }}>
          Sin ningún encargo, con solo tener la aplicación:
        </Text>

        <View
          style={{
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'wrap',
          }}
        >
          {ABIERTAS.map((item) => (
            <View key={item} style={{ width: '50%', paddingRight: space.sm }}>
              <Text style={{ fontSize: size.meta, paddingVertical: 1.4 }}>
                {item}
              </Text>
            </View>
          ))}
        </View>

        <Text
          style={{
            ...text.meta,
            color: color.faint,
            marginTop: space.sm,
          }}
        >
          Nada de esto contiene datos personales de nadie: son los programas, el
          calendario y la información que ya está en el tablón.
        </Text>
      </PdfCard>

      {/* Tres tarjetas y no una: `PdfCard` no se parte entre hojas, así que
          diecinueve filas de golpe saltaban enteras a la hoja siguiente y
          dejaban media hoja en blanco. Agrupadas por tema caben, y además se
          leen mejor que un muro de filas. */}
      <PdfCard title="Predicación y territorios" flush>
        <PdfTable columns={COLUMNAS} rows={PREDICACION} />
      </PdfCard>

      <PdfCard title="Reuniones y discursos" flush>
        <PdfTable columns={COLUMNAS} rows={REUNIONES} />
      </PdfCard>

      <PdfCard title="Personas, registros y administración" flush>
        <PdfTable columns={COLUMNAS} rows={REGISTROS} />
      </PdfCard>

      <PdfCard title="Lo que no ve nadie">
        <Text style={{ ...text.body, marginBottom: space.xs }}>
          Los informes de predicación, las fichas de las personas y los datos de
          la congregación viajan cifrados de un dispositivo a otro. Ni el
          servidor donde se guardan ni quien lo administra pueden leerlos: solo
          se descifran dentro de la aplicación, y solo a quien le corresponde.
        </Text>
        <Text style={{ ...text.body }}>
          Un hermano que no sea anciano ni tenga encargo no puede ver el informe
          de otro, ni su ficha, ni su tarjeta S-21.
        </Text>
      </PdfCard>

      <Text
        style={{
          ...text.meta,
          color: color.faint,
          marginTop: space.sm,
        }}
      >
        Este cuadro se ha sacado de las comprobaciones de acceso que lleva la
        aplicación por dentro. Si se cambia alguna, hay que rehacerlo: la fecha
        del pie dice a qué día corresponde.
      </Text>
    </Sheet>
  </Document>
);

export default TemplateAccesos;
