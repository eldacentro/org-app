import { View, Text } from '@react-pdf/renderer';
import { color, radius, space, text } from '@views/design';
import { UpcomingEventDateProps } from './index.types';

/**
 * Una fecha de un evento: la pastilla con el día a la izquierda y la hora —o
 * lo que sea— a la derecha.
 *
 * Iba con una segunda familia de azules propia (`#F2F5FF`, `#3B4CA3`,
 * `#5065D0`) que no existe en ningún otro sitio de la app. El sistema tiene UN
 * azul (regla §5.8).
 */
const UpcomingEventDate = ({
  date,
  title,
  description,
  range,
  day,
}: UpcomingEventDateProps) => (
  <View style={{ display: 'flex', gap: space.md, flexDirection: 'row' }}>
    <View
      style={{
        borderRadius: radius.md,
        paddingVertical: space.xs + 1,
        paddingHorizontal: space.lg,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minWidth: 92,
        backgroundColor: color.accentSoft,
      }}
    >
      <Text style={{ ...text.body, fontWeight: 600, color: color.accentInk }}>
        {range || date}
      </Text>

      {!range && day ? (
        <Text style={{ ...text.label, fontSize: 7, color: color.accent }}>
          {day}
        </Text>
      ) : null}
    </View>

    <View
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 2,
      }}
    >
      <Text style={text.bodyStrong}>{title}</Text>
      {description ? (
        <Text style={{ ...text.body, fontSize: 8.2, color: color.muted }}>
          {description}
        </Text>
      ) : null}
    </View>
  </View>
);

export default UpcomingEventDate;
