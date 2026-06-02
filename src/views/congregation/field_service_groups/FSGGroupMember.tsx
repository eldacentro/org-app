import { Text, View } from '@react-pdf/renderer';
import { FSGGroupMemberProps } from './index.types';
import styles from './index.styles';

const FSGGroupMember = ({ member }: FSGGroupMemberProps) => {
  return (
    <View style={styles.memberRow}>
      <Text style={styles.memberBullet}>·</Text>
      <Text style={styles.groupMember}>{member}</Text>
    </View>
  );
};

export default FSGGroupMember;
