import { AppRoleType } from './app';
import { AssignmentFieldType } from './assignment';

export enum FullnameOption {
  FIRST_BEFORE_LAST = 1,
  LAST_BEFORE_FIRST = 2,
}

export type AccountTypeState = 'vip' | 'pocket';

export enum SourceFrequency {
  WEEKLY = 1,
  BIWEEKLY = 2,
  MONTHLY = 4,
}

export enum PublishersSortOption {
  MANUAL = 1,
  ALPHABETICAL = 2,
}

export enum FirstDayWeekOption {
  SUNDAY = 0,
  MONDAY = 1,
  SATURDAY = 6,
}

export type CircuitOverseerVisitType = {
  _deleted: boolean;
  id: string;
  weekOf: string;
  updatedAt: string;
};

export type SpecialMonthType = {
  _deleted: boolean;
  updatedAt: string;
  year: string;
  months: string[];
};

export type SettingsType = {
  id: number;
  cong_settings: {
    country_code: string;
    cong_id: string;
    cong_number: { value: string; updatedAt: string };
    cong_name: string;
    cong_master_key: string;
    cong_access_code: string;
    cong_location: {
      address: string;
      lat: number;
      lng: number;
      updatedAt: string;
    };
    cong_migrated?: boolean;
    cong_new: boolean;
    cong_circuit: {
      type: string;
      value: string;
      updatedAt: string;
      _deleted: boolean;
    }[];
    cong_discoverable: { value: boolean; updatedAt: string };
    fullname_option: {
      type: string;
      value: FullnameOption;
      updatedAt: string;
      _deleted: boolean;
    }[];
    short_date_format: {
      type: string;
      value: string;
      updatedAt: string;
      _deleted: boolean;
    }[];
    /**
     * Abreviar el nombre en el programa: "Mike S." en vez de "Mike Stevens".
     *
     * Tenía un segundo interruptor, `others`, para aplicarlo FUERA de las
     * reuniones. Se guardaba, se sincronizaba y se migraba desde 2024, pero
     * no lo leía nadie: no existía ningún estado que lo expusiera, ni la
     * pantalla de Ajustes ofrecía encenderlo. Era media función construida.
     *
     * Se retira en vez de terminarla porque no se quiere: en las listas de
     * consulta —grupos, limpieza, responsabilidades, territorios— el nombre
     * completo es lo correcto, y en los formularios oficiales (S-21,
     * solicitudes de precursorado, informes a la sucursal) es obligatorio.
     */
    display_name_enabled: {
      type: string;
      updatedAt: string;
      _deleted: boolean;
      meetings: boolean;
    }[];
    schedule_exact_date_enabled: {
      value: boolean;
      updatedAt: string;
      type: string;
      _deleted: boolean;
    }[];
    time_away_public: { value: boolean; updatedAt: string };
    // Si los ancianos ven en la página "Grupos de predicación" a los
    // miembros que los publicadores NO ven (inactivos sin concesión).
    // Desactivado (por defecto), los ancianos ven exactamente la misma
    // vista pública que los publicadores. Solo afecta a esa página: los
    // flujos administrativos (editar miembros, informes, S-21, PDF de
    // contactos de emergencia) siguen viendo la pertenencia completa.
    groups_inactive_visible_to_elders?: { value: boolean; updatedAt: string };
    source_material: {
      auto_import: {
        enabled: { value: boolean; updatedAt: string };
        frequency: { value: SourceFrequency; updatedAt: string };
      };
      language: {
        type: string;
        value: string;
        updatedAt: string;
        _deleted: boolean;
      }[];
    };
    special_months: SpecialMonthType[];
    /**
     * Personas BORRADAS PARA SIEMPRE desde la papelera, por su `person_uid`.
     *
     * Es una lista de «esto no debe existir», no un registro histórico. Existe
     * porque un borrado definitivo no se puede propagar solo: quitar la fila
     * aquí la quita del servidor (la tabla de personas se sube entera), pero
     * cualquier otro dispositivo de un editor que aún la tenga la vuelve a
     * subir la próxima vez que toque a alguien, y reaparece en todas partes.
     *
     * Con la lista, cada dispositivo retira en cada sincronización lo que esté
     * en ella. Es idempotente y se cura sola: si una copia vieja resucita a
     * alguien, al ciclo siguiente vuelve a caer.
     *
     * Va envuelta en `{ value, updatedAt }` A PROPÓSITO. Una lista suelta
     * dentro de `cong_settings` es justo la forma que la fusión descarta sin
     * decir nada (lo de `special_months`); así se reemplaza entera por la más
     * nueva, que es lo que se quiere.
     */
    persons_purged?: { value: string[]; updatedAt: string };
    midweek_meeting: {
      type: string;
      _deleted: { value: boolean; updatedAt: string };
      weekday: { value: number; updatedAt: string };
      time: { value: string; updatedAt: string };
      class_count: { value: number; updatedAt: string };
      opening_prayer_linked_assignment: {
        value: AssignmentFieldType | '';
        updatedAt: string;
      };
      closing_prayer_linked_assignment: {
        value: AssignmentFieldType | '';
        updatedAt: string;
      };

      aux_class_counselor_default: {
        enabled: { value: boolean; updatedAt: string };
        person: { value: string; updatedAt: string };
      };
      /**
       * ¿Se asigna a alguien en «Logros de la organización» y en «Informe del
       * Cuerpo Gobernante»?
       *
       * La aplicación reconoce esas dos partes por su título y NO pide hermano,
       * porque en muchas congregaciones son un vídeo o un informe que presenta
       * quien preside. Pero no en todas: donde se llevan como análisis con el
       * auditorio hace falta poner a alguien. Apagado por defecto, que es como
       * se ha comportado siempre.
       */
      lc_special_parts_assigned: { value: boolean; updatedAt: string };
    }[];
    weekend_meeting: {
      type: string;
      _deleted: { value: boolean; updatedAt: string };
      weekday: { value: number; updatedAt: string };
      time: { value: string; updatedAt: string };
      opening_prayer_auto_assigned: { value: boolean; updatedAt: string };
      substitute_speaker_enabled: { value: boolean; updatedAt: string };
      w_study_conductor_default: { value: string; updatedAt: string };
      substitute_w_study_conductor_displayed: {
        value: boolean;
        updatedAt: string;
      };
      consecutive_monthly_parts_notice_shown: {
        value: boolean;
        updatedAt: string;
      };
      outgoing_talks_schedule_public: {
        value: boolean;
        updatedAt: string;
      };
    }[];
    /**
     * Cómo se organiza cada departamento: por semana o por reunión, y cuántos
     * turnos. Sin definir = lo de siempre (por semana, un turno). Ver
     * `services/app/departments_slots`.
     */
    departments_config?: {
      value: Partial<
        Record<
          'acomodadores' | 'microfonos' | 'multimedia' | 'plataforma',
          { scope: 'week' | 'meeting'; turns: number }
        >
      >;
      updatedAt: string;
    };
    // Correo al que los oradores públicos envían el contenido multimedia
    // (imágenes/videos) de su discurso. Se usa en la invitación al orador
    // en vez del correo del coordinador cuando está definido.
    public_talk_speakers_email?: { value: string; updatedAt: string };
    circuit_overseer: {
      firstname: { value: string; updatedAt: string };
      lastname: { value: string; updatedAt: string };
      display_name: { value: string; updatedAt: string };
      visits: CircuitOverseerVisitType[];
      // Día de la reunión de entre semana durante la semana de la visita.
      // Mismo offset 0-indexado desde el lunes que usa el resto de la app
      // (DaySelector/generateWeekday): 0=lunes, 1=martes, ..., 6=domingo. Por
      // defecto martes (1), ya que la mayoría de congregaciones mueven la
      // reunión al martes esa semana.
      visit_weekday?: { value: number; updatedAt: string };
      // Nombre de la esposa del CO (vacío = soltero). También se usa para el
      // sustituto cuando hay uno activo.
      spouse_name?: { value: string; updatedAt: string };
      // Contacto del CO — se muestra en el encabezado del PDF de contactos
      // de emergencia (solo si hay algo guardado).
      phone?: { value: string; updatedAt: string };
      email?: { value: string; updatedAt: string };
    };
    language_groups: { enabled: { value: boolean; updatedAt: string } };
    format_24h_enabled: {
      type: string;
      value: boolean;
      updatedAt: string;
      _deleted: boolean;
    }[];
    week_start_sunday: {
      type: string;
      value: boolean;
      updatedAt: string;
      _deleted: boolean;
    }[];
    attendance_online_record: {
      type: string;
      value: boolean;
      updatedAt: string;
      _deleted: boolean;
    }[];
    data_sync: { value: boolean; updatedAt: string };
    responsabilities: {
      coordinator: string;
      secretary: string;
      service: string;
      updatedAt: string;
    };
    group_publishers_sort: {
      updatedAt: string;
      value: PublishersSortOption;
    };
    aux_class_fsg: { value: boolean; updatedAt: string };
    /**
     * Ya no se puede cambiar: el interruptor de congregación se retiró y ver
     * los botones de exportar es cosa de cada cuenta
     * (`pdf_export_enabled_personal`). El campo se queda porque viaja en la
     * sincronización y porque es el valor de partida de quien nunca haya
     * tocado el suyo.
     */
    pdf_export_enabled: { value: boolean; updatedAt: string };
    first_day_week: {
      type: string;
      _deleted: boolean;
      updatedAt: string;
      value: FirstDayWeekOption;
    }[];
    schedule_songs_weekend: {
      type: string;
      _deleted: boolean;
      updatedAt: string;
      value: boolean;
    }[];
  };
  user_settings: {
    id?: string;
    cong_role: AppRoleType[];
    account_type: '' | AccountTypeState;
    user_avatar: ArrayBuffer;
    user_local_uid: string;
    user_members_delegate: string[];
    firstname: { value: string; updatedAt: string };
    lastname: { value: string; updatedAt: string };
    backup_automatic: {
      enabled: { value: boolean; updatedAt: string };
      interval: { value: number; updatedAt: string };
      google_drive_access_token?: { value: string; updatedAt: string };
      google_drive_token_expiry?: { value: string; updatedAt: string };
      google_drive_email?: { value: string; updatedAt: string };
      google_drive_auto_enabled?: { value: boolean; updatedAt: string };
    };
    theme_follow_os_enabled: { value: boolean; updatedAt: string };
    hour_credits_enabled: { value: boolean; updatedAt: string };
    data_view: { value: string; updatedAt: string };
    // Muestra los botones de exportar a PDF solo en esta cuenta. Es el único
    // interruptor que queda: lo tiene todo el mundo y no afecta a nadie más.
    // Ver pdfExportEnabledState en @states/settings.
    pdf_export_enabled_personal?: { value: boolean; updatedAt: string };
  };
};

export type BackupDataType = {
  dbPersons: [];
  dbDeleted: [];
  dbSourceMaterial: [];
  dbSchedule: object[];
  dbPublicTalks: [];
  dbVisitingSpeakers: [];
  dbBranchReportsTbl: [];
  dbFieldServiceGroupTbl: [];
  dbFieldServiceReportsTbl: [];
  dbLateReportsTbl: [];
  dbMeetingAttendanceTbl: [];
  dbMinutesReportsTbl: [];
  dbServiceYearTbl: [];
  dbUserBibleStudiesTbl: [];
  dbUserFieldServiceReportsTbl: [];
  dbUpcomingEventsTbl: [];
  dbSettings: object[];
};
