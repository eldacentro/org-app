import { View } from '@react-pdf/renderer';
import { OSScheduleContainerProps } from './index.types';
import OSScheduleSpeakBox from './OSScheduleSpeakBox';

const OSScheduleContainer = ({ data }: OSScheduleContainerProps) => {
  return (
    <View>
      {data.map((speakGroup, index) => (
        <OSScheduleSpeakBox
          data={speakGroup}
          key={index}
          last={index === data.length - 1}
        />
      ))}
    </View>
  );
};

export default OSScheduleContainer;
