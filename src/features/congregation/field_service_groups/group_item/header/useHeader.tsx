import { useMemo, useState } from 'react';
import { useAtomValue } from 'jotai';
import { useAppTranslation, useCurrentUser } from '@hooks/index';
import { userLocalUIDState } from '@states/settings';
import { GroupHeaderProps } from './index.types';
import { languageGroupsState } from '@states/field_service_groups';

const useHeader = ({ group, index, editable }: GroupHeaderProps) => {
  const { t } = useAppTranslation();

  const { isServiceCommittee } = useCurrentUser();

  const userUID = useAtomValue(userLocalUIDState);
  const languageGroups = useAtomValue(languageGroupsState);

  const [dlgOpen, setDlgOpen] = useState(false);
  const [lngOpen, setLngOpen] = useState(false);
  const [type, setType] = useState<'edit' | 'delete'>('edit');

  // El MISMO trato que la cabecera de sección de Programas semanales: color
  // pleno de la categoría y texto en blanco. Aquí era un tinte al 12% con el
  // texto en el color del grupo — dos dibujos para "tarjeta con cabecera de
  // color", y encima el tinte al 12% deja el nombre del grupo con muy poco
  // contraste.
  const bg_color = useMemo(() => `var(--group-${index})`, [index]);

  const color = 'var(--always-white)';

  const group_index = useMemo(() => {
    return t('tr_groupNumber', { groupNumber: index });
  }, [t, index]);

  const group_name = useMemo(() => {
    const name = group.group_data.name;

    if (!name || name.length === 0) return;

    return name;
  }, [group]);

  const my_group = useMemo(() => {
    const isMyGroup = group.group_data.members.some(
      (record) => record.person_uid === userUID
    );

    return isMyGroup;
  }, [group, userUID]);

  const languageGroup = useMemo(() => {
    return languageGroups.find((record) => record.group_id === group?.group_id);
  }, [languageGroups, group]);

  const handleOpenEdit = () => {
    if (editable) {
      setType('edit');
      setDlgOpen(true);
    } else {
      setLngOpen(true);
    }
  };

  const handleCloseDialog = () => {
    setDlgOpen(false);
    setLngOpen(false);
  };

  const handleOpenDelete = () => {
    setType('delete');
    setDlgOpen(true);
  };

  return {
    bg_color,
    color,
    group_index,
    group_name,
    my_group,
    handleOpenEdit,
    dlgOpen,
    handleCloseDialog,
    handleOpenDelete,
    type,
    isServiceCommittee,
    lngOpen,
    languageGroup,
  };
};

export default useHeader;
