import { StyleSheet } from '@react-pdf/renderer';
import { color as PDF } from '@views/design/tokens';
import registerFonts from '@views/registerFonts';

registerFonts();

const styles = StyleSheet.create({
  weekContainer: {
    marginBottom: 10,
    border: `1 solid ${PDF.line}`,
    borderRadius: 12,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
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
    color: PDF.muted,
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
    color: PDF.ink,
  },
  speakerCongregation: {
    fontSize: 9,
    fontWeight: 400,
    color: PDF.muted,
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
    color: PDF.muted,
  },
  substituteName: {
    fontSize: 9,
    fontWeight: 700,
    color: PDF.ink,
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
    color: PDF.muted,
  },
});

export default styles;
