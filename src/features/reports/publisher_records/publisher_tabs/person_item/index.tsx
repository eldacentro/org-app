import { IconArrowLink } from '@components/icons';
import CardButton from '@components/card_button';
import { PersonItemProps } from './index.types';
import usePersonItem from './usePersonItem';
import PersonDetails from '@features/persons/person_details';

const PersonItem = (props: PersonItemProps) => {
  const { handleOpenPublisher, month, person, badges } = usePersonItem(props);

  return (
    <CardButton onClick={handleOpenPublisher}>
      <PersonDetails person={person} month={month} badgesOverride={badges} />

      <IconArrowLink color="var(--black)" />
    </CardButton>
  );
};

export default PersonItem;
