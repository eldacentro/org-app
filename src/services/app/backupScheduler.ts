import appDb from '@db/appDb';
import {
  copiaTraeRegistro,
  tablasQueTraeLaCopia,
  type TablaLista,
} from './backup_payload';
import backupsDb from '@db/backupsDb';
import { googleDriveUploadBackup } from './googleDriveBackup';
import { fetchTerritoryBackupData } from '@services/firebase/territories';

const STORAGE_KEYS = {
  LAST_AUTO_BACKUP: 'elda_centro_last_auto_backup',
};

// Generates a complete database JSON payload (matching standard useExport)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const generateBackupPayload = async (congId?: string): Promise<any> => {
  const persons = await appDb.persons.toArray();
  const settingsArray = await appDb.app_settings.toArray();
  const settings = settingsArray[0];
  const branchCongAnalysis = await appDb.branch_cong_analysis.toArray();
  const branchFieldReports = await appDb.branch_field_service_reports.toArray();
  const congFieldReports = await appDb.cong_field_service_reports.toArray();
  const fieldServiceGroups = await appDb.field_service_groups.toArray();
  const meetingAttendance = await appDb.meeting_attendance.toArray();
  const schedules = await appDb.sched.toArray();
  const sources = await appDb.sources.toArray();
  const visitingSpeakers = await appDb.visiting_speakers.toArray();
  const assignments = await appDb.assignment.toArray();
  const weekTypes = await appDb.week_type.toArray();
  const speakersCongregations = await appDb.speakers_congregations.toArray();
  const userFieldReports = await appDb.user_field_service_reports.toArray();
  const userBibleStudies = await appDb.user_bible_studies.toArray();
  const upcomingEvents = await appDb.upcoming_events.toArray();
  const limpiezaConfigArray = await appDb.limpieza_config.toArray();
  const limpiezaConfig = limpiezaConfigArray[0];
  const evacuacionConfig = (await appDb.evacuacion_config.get('1')) ?? null;

  // LOS MÓDULOS QUE FALTABAN.
  //
  // Había DOS generadores de copia y cada uno se dejaba fuera cosas distintas:
  // este (el de Drive y las copias locales) no traía ninguno de estos ocho, y el
  // de la descarga manual no traía territorios. Según por dónde se guardara, la
  // copia era una u otra — y las dos parecían completas.
  const [
    exhibitors,
    serviceOutings,
    departmentsSchedule,
    responsabilidades,
    circuitOverseerVisits,
    publicTalksOverride,
    songsOverride,
    delegatedFieldServiceReports,
  ] = await Promise.all([
    appDb.exhibitors.toArray(),
    appDb.service_outings.toArray(),
    appDb.departments_schedule.toArray(),
    appDb.responsabilidades.toArray(),
    appDb.circuit_overseer_visits.toArray(),
    appDb.public_talks_override.toArray(),
    appDb.songs_override.toArray(),
    appDb.delegated_field_service_reports.toArray(),
  ]);

  /**
   * Los territorios viven en Firestore, no en la base local, así que se leen del
   * servidor para que la copia lleve el estado bueno.
   *
   * Y si el servidor no contesta, la copia SIGUE saliendo. Sin este `try`, un
   * corte de red o una sesión caducada dejaban sin copia ninguna —ni personas,
   * ni informes, ni programas—, que es muchísimo peor que una copia sin
   * territorios. Quien llama puede notarlo mirando si viene la clave.
   */
  let territories: Awaited<ReturnType<typeof fetchTerritoryBackupData>> | null =
    null;

  if (congId) {
    try {
      territories = await fetchTerritoryBackupData(congId);
    } catch (error) {
      console.error(
        'No se pudieron leer los territorios para la copia:',
        error
      );
    }
  }

  const handleGetSettings = () => {
    if (!settings) return null;
    const app_settings = structuredClone(settings);
    app_settings.cong_settings.cong_master_key = undefined;
    app_settings.cong_settings.cong_access_code = undefined;
    return app_settings;
  };

  const handleGetAssignments = () => {
    return assignments.map((record) => ({
      code: record.code,
      assignment_type_name: record.assignment_type_name.E,
    }));
  };

  const handleGetWeekTypes = () => {
    return weekTypes.map((record) => ({
      id: record.id,
      week_type_name: record.week_type_name.E,
    }));
  };

  return {
    name: 'Organized',
    exported: new Date().toISOString(),
    version: import.meta.env.PACKAGE_VERSION || '1.0.0',
    data: {
      assignments: handleGetAssignments(),
      app_settings: handleGetSettings(),
      branch_cong_analysis: branchCongAnalysis,
      branch_field_service_reports: branchFieldReports,
      cong_field_service_reports: congFieldReports,
      field_service_groups: fieldServiceGroups,
      meeting_attendance: meetingAttendance,
      persons: persons.filter((record) => !record._deleted?.value),
      sched: schedules,
      sources,
      speakers_congregations: speakersCongregations,
      upcoming_events: upcomingEvents,
      user_field_service_reports: userFieldReports.filter(
        (record) => !record.report_data?._deleted
      ),
      user_bible_studies: userBibleStudies.filter(
        (record) => !record.person_data?._deleted
      ),
      visiting_speakers: visitingSpeakers,
      week_type: handleGetWeekTypes(),
      limpieza_config: limpiezaConfig,
      evacuacion_config: evacuacionConfig,
      exhibitors,
      service_outings: serviceOutings,
      departments_schedule: departmentsSchedule,
      responsabilidades,
      circuit_overseer_visits: circuitOverseerVisits,
      public_talks_override: publicTalksOverride,
      songs_override: songsOverride,
      delegated_field_service_reports: delegatedFieldServiceReports,
      ...(territories ? { territories } : {}),
    },
  };
};

// Cleans up old snapshots based on the smart retention policy
export const applySmartRetentionPolicy = async () => {
  const limits = {
    daily: 7,
    weekly: 4,
    monthly: 12,
  };

  for (const type of ['daily', 'weekly', 'monthly'] as const) {
    const snapshots = await backupsDb.snapshots
      .where('type')
      .equals(type)
      .sortBy('timestamp'); // Ascending order (oldest first)

    const excessCount = snapshots.length - limits[type];
    if (excessCount > 0) {
      const idsToDelete = snapshots.slice(0, excessCount).map((s) => s.id!);
      await backupsDb.snapshots.bulkDelete(idsToDelete);
      console.log(`Deleted ${excessCount} old ${type} backup snapshots.`);
    }
  }
};

// Restores the main database state from a backup payload
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const restoreFromPayload = async (payload: any): Promise<void> => {
  if (!payload || payload.name !== 'Organized' || !payload.data) {
    throw new Error('Invalid backup file payload');
  }

  const { data } = payload;

  /**
   * LO QUE LA COPIA NO TRAE, NO SE TOCA.
   *
   * Antes esto empezaba vaciando quince tablas y las rellenaba después, así que
   * un archivo al que le faltara una la dejaba VACÍA: una copia vieja, una hecha
   * a mano para corregir cuatro registros, o una generada antes de que el módulo
   * existiera. Y no se nota al momento — se nota semanas después, cuando alguien
   * abre ese módulo y no hay nada.
   *
   * Ahora se mira primero qué trae (`tablasQueTraeLaCopia`) y solo eso se
   * rehace. Traer una tabla VACÍA sí cuenta: una congregación puede no tener
   * ningún exhibidor, y esa copia lo está diciendo.
   */
  const tablas = tablasQueTraeLaCopia(data);

  const tabla = (nombre: TablaLista) =>
    appDb.table(nombre) as unknown as {
      clear: () => Promise<void>;
      bulkPut: (rows: unknown[]) => Promise<unknown>;
    };

  await appDb.transaction(
    'rw',
    [
      ...tablas.map((nombre) => appDb.table(nombre)),
      appDb.app_settings,
      appDb.limpieza_config,
      appDb.evacuacion_config,
    ],
    async () => {
      for (const nombre of tablas) {
        const filas = data[nombre] as unknown[];

        await tabla(nombre).clear();

        if (filas.length === 0) continue;

        // LA FECHA DEL REGISTRO SE RENUEVA AL RESTAURAR. Restaurar es decir
        // «esto es lo bueno», y desde que el servidor fusiona semana a semana
        // comparando esa fecha, una copia con las fechas del día que se hizo
        // perdería contra lo que hay ahora — que es justo lo que se quiere
        // sustituir. Sin esto, el botón de pánico deja de reponer nada: se
        // restaura en el móvil y no sale.
        //
        // Solo la de la RAÍZ. Las de cada campo se dejan como venían: son las
        // que usa la fusión fina del cliente, y reescribirlas sería decidir por
        // el resto de dispositivos en cosas que la copia no tiene por qué saber.
        const aGuardar =
          nombre === 'sched'
            ? filas.map((record) => ({
                ...(record as object),
                updatedAt: new Date().toISOString(),
              }))
            : filas;

        // `bulkPut` y no `bulkAdd`: si algo hubiera sobrevivido al vaciado, un
        // `bulkAdd` reventaría la restauración entera por una clave repetida.
        await tabla(nombre).bulkPut(aGuardar);
      }

      if (copiaTraeRegistro(data, 'app_settings')) {
        await appDb.app_settings.clear();
        await appDb.app_settings.add(data.app_settings);
      }

      if (copiaTraeRegistro(data, 'limpieza_config')) {
        await appDb.limpieza_config.clear();
        await appDb.limpieza_config.add(data.limpieza_config);
      }

      if (copiaTraeRegistro(data, 'evacuacion_config')) {
        await appDb.evacuacion_config.clear();
        await appDb.evacuacion_config.put({
          ...data.evacuacion_config,
          id: '1',
        });
      }
    }
  );
};

// Scheduler function executed on startup for admins
export const triggerAutoBackup = async (isAdmin: boolean, congId?: string) => {
  if (!isAdmin) return;

  const now = new Date();
  const lastBackupStr = localStorage.getItem(STORAGE_KEYS.LAST_AUTO_BACKUP);
  const twentyFourHours = 24 * 60 * 60 * 1000;

  if (lastBackupStr) {
    const lastBackupTime = parseInt(lastBackupStr, 10);
    if (now.getTime() - lastBackupTime < twentyFourHours) {
      // 24 hours have not elapsed yet. Skip auto-backup.
      return;
    }
  }

  try {
    console.log('Starting automated hybrid database backup...');
    const payload = await generateBackupPayload(congId);
    const payloadString = JSON.stringify(payload);
    const sizeInBytes = new Blob([payloadString]).size;
    const isoString = now.toISOString();

    // 1. Create Local Snapshots
    // Always add a daily backup
    await backupsDb.snapshots.add({
      timestamp: isoString,
      type: 'daily',
      size: sizeInBytes,
      data: payload,
    });

    // Save as weekly backup if it is Sunday
    if (now.getDay() === 0) {
      await backupsDb.snapshots.add({
        timestamp: isoString,
        type: 'weekly',
        size: sizeInBytes,
        data: payload,
      });
    }

    // Save as monthly backup if it is the first day of the month
    if (now.getDate() === 1) {
      await backupsDb.snapshots.add({
        timestamp: isoString,
        type: 'monthly',
        size: sizeInBytes,
        data: payload,
      });
    }

    // 2. Apply Retention and rotation rules
    await applySmartRetentionPolicy();

    // 3. Upload to Google Drive (if enabled)
    await googleDriveUploadBackup(payload);

    // 4. Update the last backup timestamp in localStorage
    localStorage.setItem(
      STORAGE_KEYS.LAST_AUTO_BACKUP,
      now.getTime().toString()
    );
    console.log('Automated hybrid backup completed successfully.');
  } catch (error) {
    console.error('Automated backup scheduler failed:', error);
  }
};
