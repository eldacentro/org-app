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
      <View style={styles.groupTitleContainer}>
        <Text style={styles.groupTitle}>{group.group_name}</Text>
        <View style={styles.membersCountContainer}>
          <Text style={styles.membersCount}>{groupMembersCount}</Text>
        </View>
      </View>

      <View style={styles.groupListContainer}>
        {(group.overseer || group.overseerAssistant) && (
          <>
            <View style={styles.groupOverseers}>
              {group.overseer && (
                <View>
                  <Text style={styles.groupOverseerLabel}>Superintendente:</Text>
                  <Text style={styles.groupOverseerName}>{group.overseer}</Text>
                </View>
              )}
              {group.overseerAssistant && (
                <View>
                  <Text style={styles.groupOverseerLabel}>Auxiliar:</Text>
                  <Text style={styles.groupOverseerName}>
                    {group.overseerAssistant}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.dashedDivider} />
          </>
        )}

        <View style={styles.groupMemberList}>
          {group.publishers.map((publisher) => (
            <FSGGroupMember key={publisher} member={publisher} />
          ))}
        </View>
      </View>
    </View>
  );
};

export default FSGGroup;
