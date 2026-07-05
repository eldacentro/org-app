import { Text, View } from '@react-pdf/renderer';
import { ECMemberProps } from './index.types';
import styles from './index.styles';

const ECMember = ({ member }: ECMemberProps) => {
  return (
    <View style={styles.memberCard} wrap={false}>
      <Text style={styles.memberName}>{member.name}</Text>

      <View style={styles.memberInfoRow}>
        <View style={styles.memberInfoItem}>
          <Text style={styles.memberInfoLabel}>Teléfono</Text>
          <Text style={styles.memberInfoValue}>{member.phone || '—'}</Text>
        </View>
        <View style={styles.memberInfoItem}>
          <Text style={styles.memberInfoLabel}>Dirección</Text>
          <Text style={styles.memberInfoValue}>{member.address || '—'}</Text>
        </View>
      </View>

      {member.emergencyContacts.length > 0 ? (
        <View style={styles.emergencyBlock}>
          {member.emergencyContacts.map((contact, i) => (
            <View key={i} style={styles.emergencyContactRow}>
              <Text style={styles.emergencyValue}>
                <Text style={styles.emergencyLabel}>Emergencia: </Text>
                {contact.name}
              </Text>
              <Text style={styles.emergencyPhone}>
                <Text style={styles.emergencyLabel}>Teléfono: </Text>
                {contact.contact}
              </Text>
            </View>
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
