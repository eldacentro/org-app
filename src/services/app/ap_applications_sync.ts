import { QueryClient } from '@tanstack/react-query';
import { APRecordType } from '@definition/ministry';
import { CongregationUpdatesResponseType } from '@definition/api';
import { decryptData, decryptObject } from '@services/encryption';
import { getTranslation } from '@services/i18n/translation';

/**
 * Las solicitudes de precursor auxiliar, tal como las guarda el servidor:
 * cifradas con el código de acceso de la congregación.
 *
 * Esto vivía dentro del hook de la pantalla de aprobación. Lo usan ya dos
 * pantallas —aprobar/cambiar las horas, y cambiar de persona—, y las dos
 * necesitan exactamente lo mismo antes de guardar nada: traer lo ÚLTIMO del
 * servidor y descifrarlo. Partir de una copia vieja aquí significa pisar la
 * aprobación que otro acaba de dar desde su móvil.
 */

export const decryptApplications = (
  applications: APRecordType[],
  accessCode: string
) => {
  return (applications ?? []).map((application) => {
    const data = structuredClone(application);

    decryptObject({ data, table: 'applications', accessCode });

    return data;
  });
};

export const refreshApplications = async ({
  queryClient,
  congAccessCode,
}: {
  queryClient: QueryClient;
  congAccessCode: string;
}) => {
  await queryClient.refetchQueries({ queryKey: ['congregation_updates'] });

  const updates: CongregationUpdatesResponseType = queryClient.getQueryData([
    'congregation_updates',
  ]);

  if (!updates) {
    throw new Error(getTranslation({ key: 'tr_internalError' }));
  }

  if (updates.status !== 200) {
    throw new Error(updates.result.message);
  }

  const code = decryptData(
    updates.result.cong_access_code,
    congAccessCode,
    'access_code'
  );

  return {
    applications: decryptApplications(updates.result.applications, code),
    code,
  };
};
