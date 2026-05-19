import { Document, Page, Text, View } from '@react-pdf/renderer';
import registerFonts from '@views/registerFonts';
import styles from './index.styles';

registerFonts();

export type DeptPDFData = {
  weekOfFormatted: string;
  acomodadores: { exterior: string; interior: string };
  microfonos: { micro1: string; micro2: string };
  multimedia: { video: string; audio: string };
  plataforma: { encargado: string };
};

type DeptSchedulePDFProps = {
  data: DeptPDFData[];
  monthName: string;
  cong_name: string;
};

const DeptSchedulePDF = ({ data, monthName, cong_name }: DeptSchedulePDFProps) => {
  return (
    <Document title={`Programa Departamentos - ${monthName}`}>
      <Page size="A4" style={styles.body}>
        <View style={styles.headerContainer}>
          <Text style={styles.title}>Programa de Departamentos</Text>
          <Text style={styles.subtitle}>{`${cong_name} - ${monthName}`}</Text>
        </View>

        {data.map((week) => (
          <View key={week.weekOfFormatted} style={styles.weekContainer} wrap={false}>
            <Text style={styles.weekTitle}>{week.weekOfFormatted}</Text>
            
            <View style={styles.grid}>
              {/* Acomodadores */}
              <View style={styles.deptBox}>
                <Text style={styles.deptTitle}>Acomodadores</Text>
                <View style={styles.roleRow}>
                  <Text style={styles.roleLabel}>Exterior:</Text>
                  <Text style={styles.personName}>{week.acomodadores.exterior}</Text>
                </View>
                <View style={styles.roleRow}>
                  <Text style={styles.roleLabel}>Interior:</Text>
                  <Text style={styles.personName}>{week.acomodadores.interior}</Text>
                </View>
              </View>

              {/* Micrófonos */}
              <View style={styles.deptBox}>
                <Text style={styles.deptTitle}>Micrófonos</Text>
                <View style={styles.roleRow}>
                  <Text style={styles.roleLabel}>Micro 1:</Text>
                  <Text style={styles.personName}>{week.microfonos.micro1}</Text>
                </View>
                <View style={styles.roleRow}>
                  <Text style={styles.roleLabel}>Micro 2:</Text>
                  <Text style={styles.personName}>{week.microfonos.micro2}</Text>
                </View>
              </View>

              {/* Multimedia */}
              <View style={styles.deptBox}>
                <Text style={styles.deptTitle}>Multimedia</Text>
                <View style={styles.roleRow}>
                  <Text style={styles.roleLabel}>Vídeo:</Text>
                  <Text style={styles.personName}>{week.multimedia.video}</Text>
                </View>
                <View style={styles.roleRow}>
                  <Text style={styles.roleLabel}>Audio:</Text>
                  <Text style={styles.personName}>{week.multimedia.audio}</Text>
                </View>
              </View>

              {/* Plataforma */}
              <View style={styles.deptBox}>
                <Text style={styles.deptTitle}>Plataforma</Text>
                <View style={styles.roleRow}>
                  <Text style={styles.roleLabel}>Encargado:</Text>
                  <Text style={styles.personName}>{week.plataforma.encargado}</Text>
                </View>
              </View>
            </View>
          </View>
        ))}
      </Page>
    </Document>
  );
};

export default DeptSchedulePDF;
