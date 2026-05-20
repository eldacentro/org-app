import { Page, Text, View } from '@react-pdf/renderer';
import { Document } from '@views/components';
import { IconLogo } from '@views/components/icons';
import styles from './index.styles';

export type DeptPDFData = {
  weekOf: string;
  weekOfFormatted: string;
  acomodadores: { exterior: string; interior: string };
  microfonos: { micro1: string; micro2: string };
  multimedia: { video: string; audio: string };
  plataforma: { encargado: string };
};

type DeptSchedulePDFProps = {
  data: DeptPDFData[];
  monthName: string;
};

const meses = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

const DeptSchedulePDF = ({ data, monthName }: DeptSchedulePDFProps) => {
  return (
    <Document title={`Programa Departamentos - ${monthName}`}>
      <Page size="A4" style={styles.body}>
        <View style={styles.headerContainer}>
          <View style={styles.logoTitleContainer}>
            <IconLogo />
            <View>
              <Text style={styles.title}>Programa de departamentos</Text>
              <Text style={styles.subtitle}>{`Elda - Centro`}</Text>
            </View>
          </View>
        </View>

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
                {/* Acomodadores */}
                <View style={styles.deptBox}>
                  <Text style={styles.deptTitle}>Acomodadores</Text>
                  <View style={styles.roleRow}>
                    <Text style={styles.roleLabel}>Exterior:</Text>
                    <Text style={styles.personName}>
                      {week.acomodadores.exterior}
                    </Text>
                  </View>
                  <View style={styles.roleRow}>
                    <Text style={styles.roleLabel}>Interior:</Text>
                    <Text style={styles.personName}>
                      {week.acomodadores.interior}
                    </Text>
                  </View>
                </View>

                {/* Micrófonos */}
                <View style={styles.deptBox}>
                  <Text style={styles.deptTitle}>Micrófonos</Text>
                  <View style={styles.roleRow}>
                    <Text style={styles.roleLabel}>Micro 1:</Text>
                    <Text style={styles.personName}>
                      {week.microfonos.micro1}
                    </Text>
                  </View>
                  <View style={styles.roleRow}>
                    <Text style={styles.roleLabel}>Micro 2:</Text>
                    <Text style={styles.personName}>
                      {week.microfonos.micro2}
                    </Text>
                  </View>
                </View>

                {/* Multimedia */}
                <View style={styles.deptBox}>
                  <Text style={styles.deptTitle}>Multimedia</Text>
                  <View style={styles.roleRow}>
                    <Text style={styles.roleLabel}>Vídeo:</Text>
                    <Text style={styles.personName}>
                      {week.multimedia.video}
                    </Text>
                  </View>
                  <View style={styles.roleRow}>
                    <Text style={styles.roleLabel}>Audio:</Text>
                    <Text style={styles.personName}>
                      {week.multimedia.audio}
                    </Text>
                  </View>
                </View>

                {/* Plataforma */}
                <View style={styles.deptBox}>
                  <Text style={styles.deptTitle}>Plataforma</Text>
                  <View style={styles.roleRow}>
                    <Text style={styles.roleLabel}>Encargado:</Text>
                    <Text style={styles.personName}>
                      {week.plataforma.encargado}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          );
        })}
      </Page>
    </Document>
  );
};

export default DeptSchedulePDF;
