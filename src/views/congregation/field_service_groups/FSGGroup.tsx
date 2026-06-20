import { View, Text } from '@react-pdf/renderer';
import { FSGGroupProps } from './index.types';
import FSGGroupMember from './FSGGroupMember';
import styles from './index.styles';

const FSGGroup = ({ group }: FSGGroupProps) => {
  const groupMembersCount =
    group.publishers.length +
    (group.overseer ? 1 : 0) +
    (group.overseerAssistant ? 1 : 0);

  return (
    <View style={styles.groupContainer} wrap={false}>
      {/* Card header */}
      <View style={styles.groupHeader}>
        <Text style={styles.groupTitle}>{group.group_name}</Text>
        <View style={styles.membersCountBadge}>
          <Text style={styles.membersCount}>{groupMembersCount}</Text>
        </View>
      </View>

      {/* Card body */}
      <View style={styles.groupBody}>
        {/* Overseers block */}
        {(group.overseer || group.overseerAssistant) && (
          <>
            <View style={styles.overseerBlock}>
              {group.overseer && (
                <View style={styles.overseerRow}>
                  <Text style={styles.overseerLabel}>SUP.</Text>
                  <Text style={[styles.overseerName, group.overseer.isPioneer && { fontWeight: 700 }]}>{group.overseer.name}</Text>
                </View>
              )}
              {group.overseerAssistant && (
                <View style={styles.overseerRow}>
                  <Text style={styles.overseerLabel}>AUX.</Text>
                  <Text style={[styles.overseerName, group.overseerAssistant.isPioneer && { fontWeight: 700 }]}>{group.overseerAssistant.name}</Text>
                </View>
              )}
            </View>
            <View style={styles.divider} />
          </>
        )}

        {/* Member list */}
        <View style={styles.memberList}>
          {group.publishers.map((publisher) => (
            <FSGGroupMember key={publisher.name} member={publisher} />
          ))}
        </View>
      </View>
    </View>
  );
};

export default FSGGroup;
