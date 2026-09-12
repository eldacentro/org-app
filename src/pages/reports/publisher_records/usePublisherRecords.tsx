import { useState } from 'react';
import { currentServiceYear } from '@utils/date';

const usePublisherRecords = () => {
  const [exportOpen, setExportOpen] = useState(false);

  // El año de servicio que se está mirando. Vive en la PÁGINA porque lo
  // comparten dos tarjetas: las estadísticas, que tienen las pestañas, y el
  // saldo de precursores, que no. Se abre en el año en curso, como siempre.
  const [year, setYear] = useState(currentServiceYear);

  const handleOpenExport = () => setExportOpen(true);

  const handleCloseExport = () => setExportOpen(false);

  return { exportOpen, handleOpenExport, handleCloseExport, year, setYear };
};

export default usePublisherRecords;
