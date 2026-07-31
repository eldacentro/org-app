import { Text, View } from '@react-pdf/renderer';
import { Document } from '@views/components';
import {
  PdfCard,
  PdfEmpty,
  PdfKeyValue,
  Sheet,
  color,
  fechaPie,
  periodo,
  radius,
  space,
  stroke,
} from '@views/design';
import registerFonts from '@views/registerFonts';
import {
  ResponsabilidadesType,
  DepartamentoExtended,
} from '@definition/responsabilidades';

registerFonts();

export type TemplateResponsabilidadesProps = {
  data: ResponsabilidadesType;
  congregation: string;
  /** Resuelve person_uid → nombre para mostrar. */
  resolveName: (uid: string) => string;
};

/**
 * Documento 10 · Responsabilidades. **Una hoja.**
 *
 * Tres tarjetas: el cuerpo de ancianos en cápsulas, los cargos en rejilla de
 * pares rótulo/valor, y los departamentos en lista a dos columnas.
 *
 * Es la única pieza del sistema que baja a 8,5: la leen los ancianos, sentados
 * y con la hoja en la mano, no de pie frente a un tablón.
 */
const TemplateResponsabilidades = ({
  data,
  congregation,
  resolveName,
}: TemplateResponsabilidadesProps) => {
  const resolve = (uid: string) => resolveName(uid) || uid;

  const departamentos = data.departamentos ?? [];

  // Reparto equilibrado en dos columnas: cada departamento va a la que menos
  // contenido acumulado lleve, no alternando por posición — así una columna no
  // se estira mucho más que la otra y empuja el resto a una segunda hoja.
  const columnas: { deps: typeof departamentos; peso: number }[] = [
    { deps: [], peso: 0 },
    { deps: [], peso: 0 },
  ];
  for (const dep of departamentos) {
    const alto =
      2 +
      (dep.type === 'extended'
        ? Math.ceil((dep as DepartamentoExtended).members.length / 2)
        : 0);
    const destino =
      columnas[0].peso <= columnas[1].peso ? columnas[0] : columnas[1];
    destino.deps.push(dep);
    destino.peso += alto;
  }

  return (
    <Document title="Responsabilidades" lang="es">
      <Sheet
        congregation={congregation}
        period={periodo(data.updatedAt ?? new Date())}
        title="Responsabilidades"
        subtitle="Cuerpo de ancianos, cargos y departamentos"
        documentName="Responsabilidades"
        updatedAt={fechaPie(data.updatedAt)}
      >
        {/* ── Cuerpo de ancianos, en cápsulas ─────────────────────── */}
        <PdfCard
          title="Cuerpo de ancianos"
          meta={`${data.cuerpoAncianos.length}`}
          style={{ marginBottom: space.lg }}
        >
          <View
            style={{
              display: 'flex',
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: space.sm,
            }}
          >
            {data.cuerpoAncianos.map((uid, i) => (
              <View
                key={i}
                style={{
                  borderRadius: radius.full,
                  border: `${stroke.hairline}px solid ${color.border}`,
                  paddingVertical: 2,
                  paddingHorizontal: space.md,
                }}
              >
                <Text style={{ fontSize: 9, fontWeight: 600 }}>
                  {resolve(uid)}
                </Text>
              </View>
            ))}
          </View>
        </PdfCard>

        {/* ── Cargos ─────────────────────────────────────────────── */}
        <PdfCard
          title="Responsabilidades de ancianos"
          style={{ marginBottom: space.lg }}
        >
          <View
            style={{
              display: 'flex',
              flexDirection: 'row',
              flexWrap: 'wrap',
              rowGap: space.md,
            }}
          >
            {data.cargosAncianos.map((item, i) => (
              <PdfKeyValue
                key={i}
                label={item.cargo}
                style={{ width: '33.33%', paddingRight: space.md }}
              >
                {resolve(item.responsable)}
              </PdfKeyValue>
            ))}
          </View>
        </PdfCard>

        {/* ── Departamentos ──────────────────────────────────────── */}
        <PdfCard title="Departamentos" meta={`${departamentos.length}`}>
          {departamentos.length === 0 ? (
            <PdfEmpty>Todavía no hay departamentos.</PdfEmpty>
          ) : (
            <View
              style={{ display: 'flex', flexDirection: 'row', gap: space.xl }}
            >
              {columnas.map((col, ci) => (
                <View key={ci} style={{ flexGrow: 1, flexBasis: 0 }}>
                  {col.deps.map((dep, di) => (
                    <View
                      key={dep.id}
                      style={{
                        paddingVertical: 3,
                        ...(di > 0 && {
                          borderTop: `${stroke.hairline}px solid ${color.hairline}`,
                        }),
                      }}
                    >
                      <Text style={{ fontSize: 8.5, fontWeight: 600 }}>
                        {dep.name}
                      </Text>
                      <Text style={{ fontSize: 8.5, color: color.ink }}>
                        {resolve(dep.responsable)}
                        {dep.auxiliar ? (
                          <Text style={{ fontSize: 8, color: color.secondary }}>
                            {'  ·  '}
                            {resolve(dep.auxiliar)}
                          </Text>
                        ) : null}
                      </Text>
                      {dep.type === 'extended' &&
                      (dep as DepartamentoExtended).members.length > 0 ? (
                        <Text
                          style={{
                            fontSize: 8,
                            color: color.secondary,
                            marginTop: 1,
                          }}
                        >
                          {(dep as DepartamentoExtended).members
                            .map(resolve)
                            .join(' · ')}
                        </Text>
                      ) : null}
                    </View>
                  ))}
                </View>
              ))}
            </View>
          )}
        </PdfCard>
      </Sheet>
    </Document>
  );
};

export default TemplateResponsabilidades;
