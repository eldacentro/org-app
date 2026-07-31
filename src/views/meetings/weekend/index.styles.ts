import { StyleSheet } from '@react-pdf/renderer';
import { PDF, PDF_PADDING } from '@views/components/pdf_theme';
import registerFonts from '@views/registerFonts';

registerFonts();

const styles = StyleSheet.create({
  page: {
    padding: PDF_PADDING,
    // Sitio para el pie, que va en absoluto.
    paddingBottom: PDF_PADDING + 8,
    fontFamily: 'Figtree',
    backgroundColor: PDF.white,
  },
  contentWrapper: {
    display: 'flex',
    flexDirection: 'column',
  },
  headerContainer: {
    display: 'flex',
    flexDirection: 'column',
  },
  topBar: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  topBarBrand: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  topBarBrandName: {
    fontSize: 16,
    fontWeight: 700,
    color: '#1a1a2e',
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: 700,
    color: '#1a1a2e',
    marginBottom: 8,
  },
  headerDivider: {
    borderBottom: '1 solid #d0d7e8',
    marginBottom: 14,
  },
  weekContainer: {
    marginBottom: 10,
    border: `1 solid ${PDF.line}`,
    borderRadius: 12,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  dateContainer: {
    backgroundColor: PDF.accent,
    padding: 6,
  },
  dateText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 700,
  },
  contentContainer: {
    display: 'flex',
    flexDirection: 'row',
    padding: 10,
    gap: 10,
  },
  meetingPartSection: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  meetingPartSectionRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
  },
  // Cada fila llevaba una rayita por debajo, como un impreso para rellenar a
  // mano. En la app —y en los demás PDF— una etiqueta y su valor no necesitan
  // una línea que los sostenga: los separa el color y el peso. Era el único
  // sitio con ese recurso, y encima con el gris más claro de todos (#eee).
  meetingPartContainer: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
  },
  meetingPartLabel: {
    width: 90,
    color: PDF.muted,
    fontSize: 9.6,
  },
  meetingPartName: {
    color: PDF.ink,
    fontSize: 10.5,
    fontWeight: 600,
  },
  meetingPartSong: {
    color: PDF.ink,
    fontSize: 10.5,
    fontWeight: 600,
  },
  lineHorizontal: {
    borderBottom: `1px solid ${PDF.line}`,
    marginTop: 3,
    marginBottom: 5,
  },
  lineVertical: {
    borderLeft: `1px solid ${PDF.line}`,
    marginVertical: 4,
  },
  talkContainer: {
    flex: 1.2,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  talkTitleContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  circuitOverseerTalkContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
  },
  talkTitle: {
    color: '#306CB4',
    fontSize: 11,
    fontWeight: 700,
  },
  talkNumber: {
    color: '#666666',
    fontSize: 9,
    fontWeight: 400,
  },
  speakerContainer: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  speaker: {
    fontSize: 11,
    fontWeight: 700,
    color: '#333333',
  },
  speakerCongregation: {
    fontSize: 9,
    fontWeight: 400,
    color: '#666666',
  },
  substituteSpeakerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: '2px 4px',
    gap: 2,
    backgroundColor: '#f5f5f5',
    borderRadius: 4,
  },
  labelDefault: {
    fontSize: 9,
    color: '#666666',
  },
  substituteName: {
    fontSize: 9,
    fontWeight: 700,
    color: '#333333',
  },
  songContainer: {
    display: 'flex',
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  openingSongContainer: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  openingSongTitle: {
    fontWeight: 400,
    fontSize: 10,
    color: '#666666',
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 30,
    right: 30,
    borderTop: '0.5 solid #e0e0e0',
    paddingTop: 7,
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerLeft: {
    fontSize: 8,
    color: '#aaaaaa',
  },
  footerRight: {
    fontSize: 8,
    color: '#aaaaaa',
  },
});

export default styles;
