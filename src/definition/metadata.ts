export type MetadataRecordType = {
  id: number;
  metadata: Record<
    string,
    {
      version: string;
      send_local: boolean;
    }
  >;
  // Última marca de "forzar re-descarga de programas" ya aplicada por este
  // dispositivo. Campo suelto del registro (NO dentro de metadata) para no
  // interferir con la sincronización por tablas. Ver dbRestoreSchedules.
  schedules_reset_applied?: string;
};
