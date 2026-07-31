import { Text, View } from '@react-pdf/renderer';
import { Document } from '@views/components';
import {
  PdfCard,
  PdfEmpty,
  Sheet,
  color,
  fechaLarga,
  fechaPie,
  periodo,
  space,
  stroke,
  text,
} from '@views/design';

/**
 * Documento 8 · Programa de departamentos.
 *
 * Una tarjeta por semana y, dentro, **columnas fijas de departamento**
 * separadas por hairlines interiores: el mismo departamento cae siempre en la
 * misma columna, así que quien sirve en audio mira siempre al mismo sitio.
 *
 * Los puestos no se deciden aquí: llegan hechos desde
 * `services/app/departments_slots`, que sabe si un departamento se asigna por
 * semana o por reunión y con cuántos turnos.
 */
export type DeptPDFRow = { label: string; name: string };
export type DeptPDFDepartment = { title: string; rows: DeptPDFRow[] };
export type DeptPDFData = {
  weekOf: string;
  weekOfFormatted: string;
  departments: DeptPDFDepartment[];
  updatedAt?: string;
  lastModifiedBy?: string;
};

type DeptSchedulePDFProps = {
  data: DeptPDFData[];
  monthName: string;
  cong_name: string;
};

const DeptSchedulePDF = ({ data, cong_name }: DeptSchedulePDFProps) => {
  const ultimaFecha = data.reduce<string | undefined>((acc, curr) => {
    if (!curr.updatedAt) return acc;
    if (!acc || new Date(curr.updatedAt) > new Date(acc)) return curr.updatedAt;
    return acc;
  }, undefined);

  // El orden de las columnas lo fija la PRIMERA semana que los tenga todos:
  // si una semana no usa un departamento, su columna se queda vacía en vez de
  // correrse y desalinear la hoja.
  const columnas = Array.from(
    new Set(data.flatMap((w) => w.departments.map((d) => d.title)))
  );

  return (
    <Document title="Programa de departamentos" lang="es-ES">
      <Sheet
        congregation={cong_name}
        period={periodo(data.at(0)?.weekOf, data.at(-1)?.weekOf)}
        title="Programa de departamentos"
        subtitle="Acomodadores, audio y vídeo, y demás puestos"
        documentName="Programa de departamentos"
        updatedAt={fechaPie(ultimaFecha)}
      >
        {data.length === 0 ? (
          <PdfEmpty>Sin programa para este mes.</PdfEmpty>
        ) : (
          data.map((week) => (
            <PdfCard
              key={week.weekOf}
              title={`Semana del ${fechaLarga(week.weekOf)}`}
              style={{ marginBottom: space.lg }}
            >
              <View style={{ display: 'flex', flexDirection: 'row' }}>
                {columnas.map((titulo, i) => {
                  const dept = week.departments.find((d) => d.title === titulo);

                  return (
                    <View
                      key={titulo}
                      style={{
                        flexGrow: 1,
                        flexBasis: 0,
                        paddingHorizontal: i === 0 ? 0 : space.lg,
                        // Hairline interior, nunca contra el canto (R7).
                        ...(i > 0 && {
                          borderLeft: `${stroke.hairline}px solid ${color.hairline}`,
                        }),
                      }}
                    >
                      <Text style={text.label}>{titulo}</Text>

                      {dept ? (
                        dept.rows.map((row) => (
                          <View
                            key={row.label}
                            style={{
                              display: 'flex',
                              flexDirection: 'row',
                              justifyContent: 'space-between',
                              gap: space.sm,
                              marginTop: 3,
                            }}
                          >
                            <Text style={{ ...text.meta, flexShrink: 0 }}>
                              {row.label}
                            </Text>
                            <Text
                              style={{
                                ...text.bodyStrong,
                                textAlign: 'right',
                                flex: 1,
                              }}
                            >
                              {row.name || '—'}
                            </Text>
                          </View>
                        ))
                      ) : (
                        <Text
                          style={{
                            fontSize: 8.5,
                            fontStyle: 'italic',
                            color: color.faint,
                            marginTop: 3,
                          }}
                        >
                          —
                        </Text>
                      )}
                    </View>
                  );
                })}
              </View>
            </PdfCard>
          ))
        )}
      </Sheet>
    </Document>
  );
};

export default DeptSchedulePDF;
