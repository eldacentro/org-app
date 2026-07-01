import { Text, View } from '@react-pdf/renderer';
import { ECMemberProps } from './index.types';
import styles from './index.styles';

const ECMember = ({ member }: ECMemberProps) => {
  return (
    <View style={styles.memberCard} wrap={false}>
      <Text style={styles.memberName}>{member.name}</Text>

      <View style={styles.memberInfoRow}>
        <View style={styles.memberInfoItem}>
          <Text style={styles.memberInfoLabel}>TEL.</Text>
          <Text style={styles.memberInfoValue}>{member.phone || '—'}</Text>
        </View>
        <View style={styles.memberInfoItem}>
          <Text style={styles.memberInfoLabel}>DIR.</Text>
          <Text style={styles.memberInfoValue}>{member.address || '—'}</Text>
        </View>
      </View>

      {member.emergencyContacts.length > 0 ? (
        <View style={styles.emergencyBlock}>
          <Text style={styles.emergencyLabel}>Contacto de emergencia</Text>
          {member.emergencyContacts.map((contact, i) => (
            <Text key={i} style={styles.emergencyValue}>
              {contact.name} — {contact.contact}
            </Text>
          ))}
        </View>
      ) : (
        <Text style={styles.emergencyMissing}>
          Sin contacto de emergencia registrado
        </Text>
      )}
    </View>
  );
};

export default ECMember;
