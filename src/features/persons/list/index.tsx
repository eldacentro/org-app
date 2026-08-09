import { Box } from '@mui/material';
import { useAppTranslation, useCurrentUser } from '@hooks/index';
import useList from './useList';
import PersonsListAll from './all_persons';
import PersonsRecent from './recent_persons';
import PersonsEmpty from './persons_empty';
import PersonsTrash from './trash';
import Tabs from '@components/tabs';
import CountBadge from '@components/count_badge';
import TabLabelWithBadge from '@components/tab_label_with_badge';
import Typography from '@components/typography';
import type { CustomTabProps } from '@components/tabs/index.types';

const PersonsList = () => {
  const { t } = useAppTranslation();

  const { isPersonEditor } = useCurrentUser();

  const { persons, activeTab, handleTabChange, personsByView, trashCount } =
    useList();

  // La papelera la ve quien ya puede borrar. Enseñar a quién han quitado de la
  // congregación —y quién lo hizo— a alguien que no puede tocar personas es
  // dar una información que no le corresponde y que no puede usar para nada.
  const tabs: CustomTabProps['tabs'] = [
    {
      label: t('tr_personsAll'),
      Component: <PersonsListAll />,
    },
    {
      label: t('tr_recentlyViewed'),
      Component: <PersonsRecent />,
    },
  ];

  if (isPersonEditor) {
    tabs.push({
      // Con el número al lado: una papelera vacía y una con doce dentro no se
      // pueden distinguir sin entrar, y entrar es justo lo que nadie hace
      // hasta que ya ha perdido algo.
      label: <TabLabelWithBadge label={t('tr_trash')} count={trashCount} />,
      Component: <PersonsTrash />,
    });
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        marginTop: '16px',
      }}
    >
      {/* El número, al lado del título y no dentro de la frase.
          Era "Personas: 100" —el contador metido en el propio rótulo—, y así
          no se puede mirar de un vistazo ni distinguir de lo que lo nombra.
          Es la misma chapa que ya llevaban las pestañas. */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Typography className="h2">{t('tr_persons', 'Personas')}</Typography>
        <CountBadge value={persons.length} />
      </Box>

      {/* Las pestañas se enseñan también con la lista vacía si hay algo en la
          papelera: si no, el día que se borrara al último quedaría todo dentro
          y sin puerta por la que entrar a sacarlo. */}
      {personsByView.length === 0 && <PersonsEmpty />}

      {(personsByView.length > 0 || (isPersonEditor && trashCount > 0)) && (
        <Tabs value={activeTab} onChange={handleTabChange} tabs={tabs} />
      )}
    </Box>
  );
};

export default PersonsList;
