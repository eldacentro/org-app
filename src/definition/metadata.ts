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
  // Lo mismo para la restauración de snapshots de oradores (ver
  // dbRestoreVisitingSpeakers / dbRestoreSpeakersCongregations).
  visiting_speakers_reset_applied?: string;
  speakers_congregations_reset_applied?: string;
};
