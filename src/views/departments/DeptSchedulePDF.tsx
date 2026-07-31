import { Page, Text, View } from '@react-pdf/renderer';
import { MESES_ES } from '@utils/nombres_fecha';
import {
  Document,
  PdfFooter,
  PdfHeader,
  fechaCorta,
} from '@views/components';
import styles from './index.styles';

/**
 * Los puestos ya no están escritos aquí: llegan hechos desde
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

const DeptSchedulePDF = ({
  data,
  monthName,
  cong_name,
}: DeptSchedulePDFProps) => {
  const lastUpdate = data.reduce((acc, curr) => {
    if (
      !acc ||
      (curr.updatedAt && new Date(curr.updatedAt) > new Date(acc.updatedAt))
    ) {
      return {
        updatedAt: curr.updatedAt,
        lastModifiedBy: curr.lastModifiedBy,
      };
    }
    return acc;
  }, null);

  return (
    <Document title={`Programa Departamentos - ${monthName}`} lang="es-ES">
      <Page size="A4" style={styles.body}>
        <PdfHeader
          congregation={cong_name || 'Elda Centro'}
          meta={monthName}
          title="Programa de departamentos"
        />

        {data.map((week) => {
          const date = new Date(week.weekOf);
          const dia = date.getDate();
          const mes = date.getMonth();
          const año = date.getFullYear();
          const fechaFormateada = `${dia} de ${meses[mes]} de ${año}`;

          return (
            <View key={week.weekOf} style={styles.weekContainer} wrap={false}>
              <View style={styles.weekTitleContainer}>
                <Text style={styles.weekTitle}>{fechaFormateada}</Text>
              </View>

              <View style={styles.grid}>
                {week.departments.map((dept) => (
                  <View key={dept.title} style={styles.deptBox}>
                    <Text style={styles.deptTitle}>{dept.title}</Text>
                    {dept.rows.map((row) => (
                      <View key={row.label} style={styles.roleRow}>
                        <Text style={styles.roleLabel}>{row.label}:</Text>
                        <Text style={styles.personName}>{row.name}</Text>
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            </View>
          );
        })}

        <PdfFooter
          congregation={cong_name || 'Elda Centro'}
          meta={
            lastUpdate?.updatedAt
              ? `Última actualización · ${fechaCorta(lastUpdate.updatedAt)}`
              : ''
          }
        />
      </Page>
    </Document>
  );
};

export default DeptSchedulePDF;
