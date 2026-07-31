import { Text, View } from '@react-pdf/renderer';
import { MESES_ES } from '@utils/nombres_fecha';
import { Document } from '@views/components';
import {
  PdfCard,
  PdfEmpty,
  PdfKeyValue,
  Sheet,
  color,
  space,
  text,
  fechaCorta,
} from '@views/design';

/**
 * Programa de departamentos del mes.
 *
 * Va sobre el sistema de diseño de los PDF (`PDF_DESIGN_SYSTEM.md`).
 *
 * Los puestos no están escritos aquí: llegan hechos desde
 * `services/app/departments_slots`, que es quien sabe si un departamento se
 * asigna por semana o por reunión y con cuántos turnos. Este componente solo
 * dibuja lo que le dan.
 */
export type DeptPDFRow = {
  label: string;
  name: string;
};

export type DeptPDFDepartment = {
  title: string;
  rows: DeptPDFRow[];
};

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

const meses = [...MESES_ES];

const fechaDeLaSemana = (weekOf: string) => {
  const d = new Date(weekOf);
  return `${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}`;
};

const DeptSchedulePDF = ({
  data,
  monthName,
  cong_name,
}: DeptSchedulePDFProps) => {
  const ultimaFecha = data.reduce<string | undefined>((acc, curr) => {
    if (!curr.updatedAt) return acc;
    if (!acc || new Date(curr.updatedAt) > new Date(acc)) return curr.updatedAt;
    return acc;
  }, undefined);

  const footerDate = fechaCorta(ultimaFecha);

  return (
    <Document title={`Programa de departamentos - ${monthName}`} lang="es-ES">
      <Sheet
        congregation={cong_name}
        meta={monthName}
        title="Programa de departamentos"
        paginated
        footerMeta={
          footerDate ? `Última actualización · ${footerDate}` : monthName
        }
      >
        {data.length === 0 ? (
          <PdfEmpty>Sin programa para este mes.</PdfEmpty>
        ) : (
          data.map((week) => (
            <PdfCard
              key={week.weekOf}
              title={fechaDeLaSemana(week.weekOf)}
              style={{ marginBottom: space.lg }}
            >
              {/* Los departamentos, en dos columnas: son cajas cortas —dos o
                  tres puestos cada una— y en una sola columna cada semana se
                  comía media hoja de aire a la derecha. */}
              <View
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: space.lg,
                }}
              >
                {week.departments.map((dept) => (
                  <View
                    key={dept.title}
                    style={{ flexGrow: 1, flexBasis: '45%', minWidth: '45%' }}
                  >
                    <Text
                      style={{
                        ...text.label,
                        color: color.accent,
                        marginBottom: space.xs,
                      }}
                    >
                      {dept.title}
                    </Text>
                    {dept.rows.map((row) => (
                      <PdfKeyValue
                        key={row.label}
                        label={row.label}
                        labelWidth={72}
                      >
                        {row.name || '—'}
                      </PdfKeyValue>
                    ))}
                  </View>
                ))}
              </View>
            </PdfCard>
          ))
        )}
      </Sheet>
    </Document>
  );
};

export default DeptSchedulePDF;
