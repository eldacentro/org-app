/**
 * QUÉ SE CIFRA AL SUBIR.
 *
 * Un campo que no esté aquí viaja SIN cifrar: no se cifra al subir ni se
 * descifra al bajar, simplemente pasa de largo.
 *
 * Ojo: este mapa NO es el mismo que el de bajada. Para saber qué se sabe
 * DESCIFRAR, mira `TABLE_DECRYPTION_MAP`, aquí abajo, y lee por qué están
 * separados antes de mover nada de sitio.
 */
export const TABLE_ENCRYPTION_MAP = {
  persons: {
    _deleted: 'shared',
    person_uid: 'public',
    person_firstname: 'shared',
    person_lastname: 'shared',
    person_display_name: 'shared',
    male: 'shared',
    female: 'shared',
    birth_date: 'private',
    assignments: 'shared',
    timeAway: 'shared',
    archived: 'shared',
    disqualified: 'private',
    email: 'shared',
    address: 'shared',
    phone: 'shared',
    publisher_baptized: 'shared',
    publisher_unbaptized: 'shared',
    midweek_meeting_student: 'shared',
    privileges: 'shared',
    enrollments: 'shared',
    emergency_contacts: 'shared',
    first_report: 'shared',
    family_members: 'shared',
    predicacion_salidas: 'shared',
    predicacion_exhibidores: 'shared',
  },
  app_settings: {
    country_code: 'public',
    cong_number: 'public',
    cong_name: 'public',
    cong_master_key: 'private',
    cong_access_code: 'shared',
    cong_location: 'public',
    cong_new: 'public',
    cong_circuit: 'public',
    cong_discoverable: 'public',
    fullname_option: 'shared',
    short_date_format: 'shared',
    display_name_enabled: 'shared',
    schedule_exact_date_enabled: 'shared',
    departments_config: 'shared',
    time_away_public: 'public',
    source_material: 'shared',
    source_material_auto_import: 'shared',
    special_months: 'shared',
    type: 'public',
    weekday: 'public',
    time: 'public',
    class_count: 'shared',
    opening_prayer_auto_assigned: 'shared',
    closing_prayer_auto_assigned: 'shared',
    opening_prayer_linked_assignment: 'shared',
    closing_prayer_linked_assignment: 'shared',
    aux_class_counselor_default: 'shared',
    substitute_speaker_enabled: 'shared',
    w_study_conductor_default: 'shared',
    substitute_w_study_conductor_displayed: 'shared',
    consecutive_monthly_parts_notice_shown: 'shared',
    outgoing_talks_schedule_public: 'shared',
    circuit_overseer: 'shared',
    language_groups: 'shared',
    format_24h_enabled: 'shared',
    week_start_sunday: 'shared',
    attendance_online_record: 'shared',
    data_sync: 'public',
    responsabilities: 'shared',
    cong_role: 'public',
    account_type: 'public',
    user_local_uid: 'public',
    user_members_delegate: 'public',
    firstname: 'public',
    lastname: 'public',
    backup_automatic: 'shared',
    theme_follow_os_enabled: 'shared',
    hour_credits_enabled: 'shared',
    group_publishers_sort: 'shared',
    data_view: 'shared',
    aux_class_fsg: 'shared',
    first_day_week: 'shared',
    schedule_songs_weekend: 'shared',
  },
  speakers_congregations: {
    _deleted: 'private',
    id: 'private',
    cong_data: 'private',
  },
  visiting_speakers: {
    person_uid: 'private',
    _deleted: 'private',
    speaker_data: 'private',
  },
  applications: {
    continuous: 'shared',
    months: 'shared',
    submitted: 'shared',
    status: 'shared',
    coordinator: 'shared',
    secretary: 'shared',
    service: 'shared',
    service_overseer: 'shared',
    notified: 'shared',
  },
  user_bible_studies: {
    person_uid: 'shared',
    _deleted: 'shared',
    updatedAt: 'shared',
    person_name: 'shared',
  },
  user_field_service_reports: {
    report_date: 'shared',
    _deleted: 'shared',
    updatedAt: 'shared',
    hours: 'shared',
    timer: 'shared',
    bible_studies: 'shared',
    comments: 'shared',
    record_type: 'shared',
    shared_ministry: 'shared',
    status: 'shared',
  },
  incoming_reports: {
    bible_studies: 'shared',
    comments: 'shared',
    hours: 'shared',
    hours_credits: 'shared',
    shared_ministry: 'shared',
    updatedAt: 'shared',
    _deleted: 'shared',
  },
  field_service_groups: {
    group_id: 'shared',
    _deleted: 'shared',
    updatedAt: 'shared',
    name: 'shared',
    sort_index: 'shared',
    members: 'shared',
  },
  cong_field_service_reports: {
    report_date: 'shared',
    _deleted: 'shared',
    updatedAt: 'shared',
    hours: 'shared',
    bible_studies: 'shared',
    comments: 'shared',
    late: 'shared',
    shared_ministry: 'shared',
    status: 'shared',
  },
  branch_field_service_reports: {
    report_date: 'shared',
    _deleted: 'shared',
    updatedAt: 'shared',
    publishers_active: 'shared',
    weekend_meeting_average: 'shared',
    publishers: 'shared',
    APs: 'shared',
    FRs: 'shared',
    submitted: 'shared',
  },
  branch_cong_analysis: {
    report_date: 'shared',
    _deleted: 'shared',
    updatedAt: 'shared',
    meeting_average: 'shared',
    publishers: 'shared',
    territories: 'shared',
    submitted: 'shared',
  },
  sched: {
    chairman: 'shared',
    opening_prayer: 'shared',
    tgw_talk: 'shared',
    tgw_gems: 'shared',
    tgw_bible_reading: 'shared',
    ayf_part1: 'shared',
    ayf_part2: 'shared',
    ayf_part3: 'shared',
    ayf_part4: 'shared',
    lc_part1: 'shared',
    lc_part2: 'shared',
    lc_part3: 'shared',
    lc_cbs: 'shared',
    closing_prayer: 'shared',
    circuit_overseer: 'shared',
    week_type: 'shared',
    public_talk_type: 'shared',
    speaker: 'shared',
    wt_study: 'shared',
    outgoing_talks: 'shared',
    aux_fsg: 'shared',
  },
  sources: {
    event_name: 'shared',
    week_date_locale: 'shared',
    weekly_bible_reading: 'shared',
    song_first: 'shared',
    tgw_talk: 'shared',
    tgw_gems: 'shared',
    tgw_bible_reading: 'shared',
    ayf_count: 'shared',
    ayf_part1: 'shared',
    ayf_part2: 'shared',
    ayf_part3: 'shared',
    ayf_part4: 'shared',
    song_middle: 'shared',
    lc_count: 'shared',
    lc_part1: 'shared',
    lc_part2: 'shared',
    lc_part3: 'shared',
    lc_cbs: 'shared',
    co_talk_title: 'shared',
    song_conclude: 'shared',
    public_talk: 'shared',
    w_study: 'shared',
  },
  meeting_attendance: {
    week_1: 'shared',
    week_2: 'shared',
    week_3: 'shared',
    week_4: 'shared',
    week_5: 'shared',
  },
  delegated_field_service_reports: {
    report_date: 'shared',
    _deleted: 'shared',
    updatedAt: 'shared',
    hours: 'shared',
    bible_studies: 'shared',
    comments: 'shared',
    shared_ministry: 'shared',
    status: 'shared',
  },
  upcoming_events: {
    event_uid: 'public',
    _deleted: 'shared',
    updatedAt: 'shared',
    event_data: 'shared',
  },
  departments_schedule: {
    acomodadores: 'shared',
    microfonos: 'shared',
    multimedia: 'shared',
    plataforma: 'shared',
  },
  service_outings: {
    outings: 'shared',
    defaultHours: 'shared',
    locations: 'shared',
    availability: 'shared',
    publishedMonths: 'shared',
    // Un campo que no esté en este mapa viaja SIN cifrar: no se cifra al subir
    // ni se descifra al bajar, simplemente pasa de largo. El sello de
    // publicación son fechas, pero va aquí por la misma razón que el resto —
    // lo que sale de esta congregación va cifrado, sin excepciones sueltas.
    publishedMonthsAt: 'shared',
    // Faltan aquí cinco campos de Salidas que hoy viajan en claro. NO se
    // añaden todavía a mano: están en PENDIENTES_DE_CIFRAR, más abajo, y el
    // comentario de allí explica por qué el orden importa.
  },
  exhibitors: {
    turns: 'shared',
    // `locations` y `monthlyOverrides` faltaban aquí, así que viajaban SIN
    // cifrar: los nombres de los sitios donde se pone el exhibidor y los
    // horarios y motivos de suspensión de cada mes se guardaban en claro en el
    // servidor. Un campo que no está en este mapa no se cifra ni se descifra,
    // simplemente pasa de largo.
    //
    // Se puede añadir sin migrar nada porque el descifrado SOLO actúa sobre
    // cadenas: un valor que ya esté guardado en claro es un array o un objeto,
    // no una cadena, así que se deja intacto. Lo que sí hace falta es que la
    // forma se normalice al leer (`normalizeExhibitorSettings`), para que a un
    // dispositivo que aún no se haya actualizado no le llegue una cadena donde
    // espera una lista.
    locations: 'shared',
    monthlyOverrides: 'shared',
    responsibles: 'shared',
    fixedAssignments: 'shared',
    availability: 'shared',
    publishedMonths: 'shared',
    publishedMonthsAt: 'shared',
  },
  responsabilidades: {
    cuerpoAncianos: 'shared',
    cargosAncianos: 'shared',
    departamentos: 'shared',
  },
  limpieza_config: {
    id: 'shared',
    updatedAt: 'shared',
    fechaInicio: 'shared',
    grupoInicio: 'shared',
    gruposParticipantes: 'shared',
    notasGenerales: 'shared',
    overrides: 'shared',
  },
  evacuacion_config: {
    id: 'shared',
    updatedAt: 'shared',
    tiempoMaximo: 'shared',
    estructuraMando: 'shared',
    equipos: 'shared',
    normasGenerales: 'shared',
    extintores: 'shared',
  },
  public_talks_override: {
    id: 'shared',
    updatedAt: 'shared',
    overrides: 'shared',
  },
  songs_override: {
    id: 'shared',
    updatedAt: 'shared',
    overrides: 'shared',
    publicationTitle: 'shared',
    symbol: 'shared',
    total: 'shared',
  },
  territories: {
    id: 'shared',
    zoneId: 'shared',
    numero: 'shared',
    descripcion: 'shared',
    notas: 'private',
    etiquetas: 'shared',
    limites: 'shared',
    tipo: 'shared',
    estado: 'shared',
    noVisitar: 'private',
    updatedAt: 'shared',
    _deleted: 'shared',
  },
  territory_zones: {
    id: 'shared',
    nombre: 'shared',
    descripcion: 'shared',
    color: 'shared',
    updatedAt: 'shared',
    _deleted: 'shared',
  },
  territory_tags: {
    id: 'shared',
    nombre: 'shared',
    color: 'shared',
    updatedAt: 'shared',
    _deleted: 'shared',
  },
  territory_assignments: {
    id: 'shared',
    territoryId: 'shared',
    person_uid: 'shared',
    dateAsigned: 'shared',
    dateReturned: 'shared',
    status: 'shared',
    updatedAt: 'shared',
    _deleted: 'shared',
  },
  territory_campaigns: {
    id: 'shared',
    startDate: 'shared',
    endDate: 'shared',
    estado: 'shared',
    updatedAt: 'shared',
    _deleted: 'shared',
  },
  territory_notices: {
    id: 'shared',
    date: 'shared',
    notes: 'private',
    publisher: 'shared',
    updatedAt: 'shared',
    _deleted: 'shared',
  },
  territory_requests: {
    id: 'shared',
    person_uid: 'shared',
    requestDate: 'shared',
    notes: 'private',
    status: 'shared',
    updatedAt: 'shared',
    _deleted: 'shared',
  },
  territory_settings: {
    id: 'shared',
    updatedAt: 'shared',
  },
  circuit_overseer_visits: {
    id: 'shared',
    _deleted: 'shared',
    updatedAt: 'shared',
    date_start: 'shared',
    date_end: 'shared',
    weekOf: 'shared',
    // arrays/objetos anidados se cifran como un único blob JSON con la clave
    // compartida de la congregación (todo el cuerpo de ancianos debe poder leerlo).
    is_substitute: 'shared',
    substitute_name: 'shared',
    substitute_spouse_name: 'shared',
    meals: 'shared',
    co_companions: 'shared',
    shepherding_visits: 'shared',
    meeting_pioneers: 'shared',
    meeting_elders: 'shared',
    accounting_note: 'shared',
    // Va cifrada como su hermana `updatedAt`, que es contra la que se compara:
    // el servidor no tiene por qué saber cuándo se publicó una visita.
    publishedAt: 'shared',
  },
};

/**
 * CAMPOS QUE YA SE SABEN DESCIFRAR PERO TODAVÍA NO SE CIFRAN.
 *
 * ─── Por qué existe esta lista ───────────────────────────────────────────
 *
 * Empezar a cifrar un campo que antes viajaba en claro NO es un cambio
 * inocente, aunque no haya que migrar nada. El día que un dispositivo
 * actualizado sube el campo cifrado, cualquier dispositivo que todavía no se
 * haya actualizado se baja una CADENA donde esperaba una lista, un objeto o un
 * booleano — y no sabe descifrarla, porque su mapa no la conoce. Lo que pasa
 * entonces no es un dibujo raro:
 *
 *   - `sharedSlots.map(...)` sobre una cadena revienta: la página de Salidas
 *     deja de abrirse en ese dispositivo.
 *   - `[...(settings?.disabledSlots ?? [])]` desparrama la cadena en LETRAS
 *     SUELTAS, y en cuanto esa persona toca un interruptor, esas letras se
 *     guardan y se suben a TODA la congregación. Eso es pérdida de datos, y no
 *     la causa quien despliega sino quien no se ha enterado de nada.
 *   - una cadena cifrada es un valor VERDADERO, así que una semana con
 *     `isCircuitOverseerWeek: false` le sale como semana del superintendente.
 *
 * Ningún arreglo en ESTE código puede evitarlo, porque el daño ocurre en un
 * build anterior que ya está instalado. Lo único que lo evita es el ORDEN:
 *
 *   Fase 1 (lo que hay ahora)  el campo se sabe DESCIFRAR pero se sigue
 *                              subiendo en claro. En el cable no cambia
 *                              absolutamente nada, así que no hay dispositivo
 *                              —actualizado o no— que pueda ver una cadena.
 *                              Desplegar esto no puede romper ni perder nada.
 *
 *   Fase 2 (cuando toque)      el campo se mueve a TABLE_ENCRYPTION_MAP y
 *                              empieza a subir cifrado. Para entonces todos los
 *                              dispositivos ya saben leerlo.
 *
 * ─── Cómo se pasa a la fase 2 ────────────────────────────────────────────
 *
 * NO por calendario ni a ojo. Se comprueba que no queda ningún dispositivo por
 * debajo del build que introdujo la fase 1, que el servidor conoce porque cada
 * sesión guarda su `app_build`:
 *
 *     node scripts/pending_encryption_check.mjs        (en sws2apps-api)
 *
 * Mientras ese script diga que falta alguien, se acelera con la oleada de
 * actualización forzada (`force_update_wave.mjs`) y se vuelve a mirar. Cuando
 * diga que están todos, la fase 2 es mover el bloque de aquí a
 * TABLE_ENCRYPTION_MAP y desplegar. Nada más.
 *
 * Que un campo se quede aquí una temporada no cuesta nada: sigue viajando en
 * claro exactamente igual que lleva haciéndolo desde siempre. Adelantar la
 * fase 2 sin comprobar sí cuesta, y lo paga la congregación entera.
 */
const PENDIENTES_DE_CIFRAR = {
  service_outings: {
    // Los horarios y las suspensiones de cada mes, qué turnos están
    // inhabilitados y —lo más delicado— los NOMBRES DE LAS OTRAS
    // CONGREGACIONES con las que se comparte un turno. Comprobado leyendo el
    // bucket real: hoy los tres están guardados en claro.
    monthlyOverrides: 'shared',
    disabledSlots: 'shared',
    sharedSlots: 'shared',
    // En los registros SEMANALES: cuándo viene el superintendente de circuito
    // y a qué hora sale la congregación esa semana.
    isCircuitOverseerWeek: 'shared',
    weekOverrideHours: 'shared',
  },
};

/**
 * QUÉ SE SABE DESCIFRAR AL BAJAR: todo lo que se cifra, MÁS lo que está a la
 * espera de empezar a cifrarse.
 *
 * Saber descifrar de más no tiene ningún coste ni riesgo: el descifrado SOLO
 * actúa sobre cadenas, y ninguno de estos campos es legítimamente una cadena
 * —son objetos, listas y booleanos—, así que sobre los datos que hay hoy no
 * llega a hacer nada. Solo entra en acción el día que empiece a llegar cifrado,
 * que es justamente para lo que está.
 */
export const TABLE_DECRYPTION_MAP = Object.fromEntries(
  Object.entries(TABLE_ENCRYPTION_MAP).map(([table, fields]) => [
    table,
    { ...fields, ...(PENDIENTES_DE_CIFRAR[table] ?? {}) },
  ])
);
