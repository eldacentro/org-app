import { DepartmentType } from '@definition/person';
import { monthOfDate } from './month_publish';

/**
 * Qué puestos tiene cada departamento en una semana.
 *
 * Hasta ahora los puestos estaban escritos a mano en OCHO sitios —el tipo de
 * datos, el editor, el autocompletar, el PDF, "Mis asignaciones", las
 * notificaciones, la actividad de la persona y el programa semanal—, así que
 * `acomodadores.exterior` era una propiedad fija en todos ellos. Añadir o
 * partir un puesto obligaba a tocarlos todos y a acordarse de los ocho.
 *
 * Ahora el puesto es una CLAVE COMPUESTA que sale de la configuración, y todos
 * preguntan aquí en vez de saberlo de memoria:
 *
 *   por semana (como siempre) ..... 'exterior'
 *   por reunión .................. 'exterior__midweek' / 'exterior__weekend'
 *   con dos turnos ............... 'exterior__t2', 'exterior__midweek__t2'
 *
 * La propiedad que hace esto seguro: **con la configuración por defecto las
 * claves son exactamente las de hoy**. Los programas ya guardados siguen
 * valiendo tal cual y no hay ninguna migración — que en esta aplicación es
 * justo donde se han perdido datos antes. Solo cambian los departamentos que
 * alguien configure a propósito.
 */

export type DeptMeeting = 'midweek' | 'weekend';

export type DeptScope =
  /** Las mismas personas cubren las dos reuniones de la semana. */
  | 'week'
  /** Se asigna por separado la de entre semana y la de fin de semana. */
  | 'meeting';

export type DeptConfig = {
  scope: DeptScope;
  /** 1 = un turno; 2 = principio y final de la reunión. */
  turns: number;
};

export type DepartmentsConfig = Partial<Record<DepartmentType, DeptConfig>> & {
  /**
   * Marca de tipo, no un dato que se guarde: aquí NO cabe la línea del tiempo.
   *
   * Lo que está guardado (`DepartmentsConfigStored`) lleva los tramos pegados,
   * y pasarlo tal cual a `buildDeptSlots` daría los puestos del ÚLTIMO tramo
   * para todos los meses — justo el fallo que los tramos vienen a arreglar, y
   * que no se ve hasta que alguien abre septiembre estando en octubre. Con
   * esta marca, quien tenga lo guardado tiene que pasar antes por
   * `deptConfigForWeek`, y de acordarse se encarga el compilador.
   */
  __tramos?: never;
};

/** Lo de siempre: una asignación por semana y un solo turno. */
export const DEFAULT_DEPT_CONFIG: DeptConfig = { scope: 'week', turns: 1 };

/** Tope de turnos. Dos cubre "principio y final", que es lo que se pidió. */
export const MAX_DEPT_TURNS = 2;

/** Los puestos base de cada departamento, con su rótulo. */
export const DEPT_ROLES: Record<
  DepartmentType,
  { id: string; label: string }[]
> = {
  acomodadores: [
    { id: 'exterior', label: 'Exterior' },
    { id: 'interior', label: 'Interior' },
  ],
  microfonos: [
    { id: 'micro1', label: 'Micro 1' },
    { id: 'micro2', label: 'Micro 2' },
  ],
  multimedia: [
    { id: 'video', label: 'Vídeo' },
    { id: 'audio', label: 'Audio' },
  ],
  plataforma: [{ id: 'encargado', label: 'Encargado' }],
};

/** Rótulo de cada departamento para donde no hay traducciones (el PDF). */
export const DEPT_LABEL: Record<DepartmentType, string> = {
  acomodadores: 'Acomodadores',
  microfonos: 'Micrófonos',
  multimedia: 'Multimedia',
  plataforma: 'Plataforma',
};

export const readDeptConfig = (
  config: DepartmentsConfig | null | undefined,
  dept: DepartmentType
): DeptConfig => {
  const stored = config?.[dept];

  if (!stored) return DEFAULT_DEPT_CONFIG;

  const turns =
    Number.isFinite(stored.turns) && stored.turns >= 1
      ? Math.min(Math.floor(stored.turns), MAX_DEPT_TURNS)
      : 1;

  return {
    scope: stored.scope === 'meeting' ? 'meeting' : 'week',
    turns,
  };
};

/* ───────────────────────────────────────────────────────────────────────────
 * La configuración, mes a mes
 *
 * Hasta ahora la configuración era UNA y valía para toda la historia: cambiar
 * en septiembre cómo se organizan los micrófonos cambiaba también septiembre,
 * agosto y todo lo anterior — con lo ya asignado escrito bajo las claves de
 * antes, que dejaban de encontrarse. Se pedía el cambio para octubre y se
 * llevaba por delante el mes en curso.
 *
 * Ahora la configuración es una LÍNEA DEL TIEMPO de tramos: cada uno dice
 * desde qué mes rige, y cada mes se lee con el suyo. Los meses anteriores se
 * quedan exactamente como estaban, con sus claves, y siguen viéndose.
 * ─────────────────────────────────────────────────────────────────────────── */

/**
 * Un tramo: desde qué mes rige esta configuración.
 *
 * `desde` es un mes 'YYYY/MM' y CUENTA desde ese mes. Sin `desde` es el tramo
 * de siempre: lo que regía antes del primer cambio con fecha.
 */
export type DeptConfigTramo = {
  desde?: string;
  config: DepartmentsConfig;
};

/**
 * Lo que hay guardado en `cong_settings.departments_config.value`.
 *
 * Son DOS cosas a la vez, y a propósito:
 *
 * 1. Arriba del todo, la configuración del último tramo, con la MISMA forma
 *    que tenía este ajuste antes de que los tramos existieran. Una versión
 *    antigua de la aplicación —una pestaña que lleva horas abierta, un móvil
 *    que todavía no se ha actualizado— la lee tal cual y se comporta como se
 *    comportaba ayer. Si en vez de eso se encontrara una forma que no entiende,
 *    se quedaría con los puestos por defecto y los programas ya guardados
 *    dejarían de encontrarse por su clave: la manera clásica de «perder» datos
 *    en esta aplicación sin borrar nada.
 * 2. En `__tramos`, la línea del tiempo entera, que es lo que hace falta para
 *    contestar «¿cómo estaba organizado esto en septiembre?».
 *
 * Sin `__tramos` —el caso de todas las congregaciones hasta hoy— esto es
 * idéntico a lo de siempre, así que no hay ninguna migración.
 */
export type DepartmentsConfigStored = Omit<DepartmentsConfig, '__tramos'> & {
  __tramos?: DeptConfigTramo[];
};

const DEPT_KEYS = Object.keys(DEPT_ROLES) as DepartmentType[];

/** La configuración a secas, sin la línea del tiempo pegada detrás. */
const soloDepartamentos = (
  config: DepartmentsConfigStored | DepartmentsConfig | null | undefined
): DepartmentsConfig => {
  const limpia: DepartmentsConfig = {};

  for (const dept of DEPT_KEYS) {
    const guardada = config?.[dept];

    if (guardada) limpia[dept] = guardada;
  }

  return limpia;
};

/**
 * ¿Dicen lo mismo dos configuraciones?
 *
 * Se comparan NORMALIZADAS (`readDeptConfig`), así que «sin configurar» y
 * «por semana, un turno» son lo mismo — que es lo que significan.
 */
export const deptConfigIguales = (
  a: DepartmentsConfig | null | undefined,
  b: DepartmentsConfig | null | undefined
) =>
  DEPT_KEYS.every((dept) => {
    const uno = readDeptConfig(a, dept);
    const otro = readDeptConfig(b, dept);

    return uno.scope === otro.scope && uno.turns === otro.turns;
  });

/**
 * De más antiguo a más nuevo. Comparación de cadenas a pelo y no
 * `localeCompare`: 'YYYY/MM' ya se ordena solo, y es como compara fechas el
 * resto de la aplicación (`week.weekOf >= today`). Sin mes va primero, que es
 * el tramo de siempre.
 */
const porMes = (a: DeptConfigTramo, b: DeptConfigTramo) => {
  const uno = a.desde ?? '';
  const otro = b.desde ?? '';

  if (uno === otro) return 0;

  return uno < otro ? -1 : 1;
};

/**
 * Los tramos guardados, normalizados y en orden.
 *
 * Devuelve una lista VACÍA cuando no hay línea del tiempo: eso significa «una
 * sola configuración para todo», que es como ha funcionado siempre.
 */
export const deptConfigTramos = (
  stored: DepartmentsConfigStored | null | undefined
): DeptConfigTramo[] => {
  const guardados = stored?.__tramos;

  if (!Array.isArray(guardados) || guardados.length === 0) return [];

  const tramos = guardados
    .filter((tramo) => tramo && typeof tramo === 'object')
    .map((tramo) => {
      const desde = monthOfDate(tramo.desde ?? '');
      const config = soloDepartamentos(tramo.config);

      // Sin mes válido es el tramo de siempre. La clave se OMITE en vez de
      // ponerla a `undefined`: esto se cifra pasando por `JSON.stringify`, y
      // ahí un `undefined` desaparece de todas formas.
      return desde ? { desde, config } : { config };
    });

  // Por si llegan desordenados de otro dispositivo. El que no tiene mes es el
  // de siempre y va primero.
  return tramos.sort(porMes);
};

const configDelMes = (
  stored: DepartmentsConfigStored | null | undefined,
  mesOFecha: string
): DepartmentsConfig => {
  const tramos = deptConfigTramos(stored);

  // Sin línea del tiempo hay una sola configuración y vale para todo.
  if (tramos.length === 0) return soloDepartamentos(stored);

  const mes = monthOfDate(mesOFecha);

  // Sin mes no hay nada que decidir: la última, que es además la que está
  // copiada arriba del todo y la que leen las versiones antiguas.
  if (!mes) return soloDepartamentos(stored);

  let elegido = tramos[0];

  for (const tramo of tramos) {
    if (tramo.desde && tramo.desde > mes) break;

    elegido = tramo;
  }

  return elegido.config;
};

/**
 * Cómo estaban organizados los departamentos en la semana que sea.
 *
 * Es POR EL LUNES de la semana, igual que la publicación por meses
 * (`departments_publish`): si publicas septiembre se marca justo lo que ves
 * bajo septiembre, y con esto se lee justo con la configuración de septiembre.
 *
 * Todo lo que pinte, exporte, autocomplete o avise de un puesto tiene que
 * pasar por aquí antes de llamar a `buildDeptSlots` y compañía.
 */
export const deptConfigForWeek = (
  stored: DepartmentsConfigStored | null | undefined,
  weekOf: string
) => configDelMes(stored, weekOf);

/** Lo mismo, cuando lo que se tiene es el mes ('YYYY/MM'). */
export const deptConfigForMonth = (
  stored: DepartmentsConfigStored | null | undefined,
  month: string
) => configDelMes(stored, month);

/**
 * Deja escrito que a partir de `month` la configuración es esta otra.
 *
 * No muta lo que recibe y no toca los meses anteriores: eso es justo lo que se
 * viene a arreglar. Devuelve lo que hay que guardar.
 *
 * Dos cosas que hace de más, y que valen la pena:
 *
 * · Un tramo que dice lo mismo que el anterior SOBRA, así que se quita. Con
 *   eso, volver a dejar un mes como estaba deshace el cambio de verdad en vez
 *   de acumular tramos vacíos, y no hace falta ningún botón de «quitar tramo».
 * · Si al final queda una sola configuración sin fecha, se guarda con la forma
 *   de siempre, sin `__tramos`. Una congregación que nunca use esto no llega a
 *   tener línea del tiempo.
 */
export const deptConfigSetForMonth = (
  stored: DepartmentsConfigStored | null | undefined,
  month: string,
  config: DepartmentsConfig
): DepartmentsConfigStored => {
  const mes = monthOfDate(month);
  const nueva = soloDepartamentos(config);

  const actuales = deptConfigTramos(stored);

  // Lo que había hasta ahora se convierte en el tramo de siempre: sin esto,
  // poner una configuración «desde octubre» reescribiría también el pasado.
  const base: DeptConfigTramo[] =
    actuales.length > 0 ? actuales : [{ config: soloDepartamentos(stored) }];

  const tramos = [
    ...base.filter((tramo) => (tramo.desde ?? '') !== mes),
    mes ? { desde: mes, config: nueva } : { config: nueva },
  ].sort(porMes);

  const podados = tramos.filter(
    (tramo, i) =>
      i === 0 || !deptConfigIguales(tramos[i - 1].config, tramo.config)
  );

  const ultimo = podados[podados.length - 1];

  const resultado: DepartmentsConfigStored = { ...ultimo.config };

  if (podados.length > 1 || podados[0].desde) {
    resultado.__tramos = podados;
  }

  return resultado;
};

/**
 * La clave con la que se guarda la asignación.
 *
 * El caso de siempre —por semana y un turno— devuelve el id del puesto a
 * secas, que es la clave que ya está guardada en la base de datos. De ahí que
 * no haga falta migrar nada.
 */
export const deptSlotKey = (
  roleId: string,
  meeting?: DeptMeeting,
  turn = 1
) => {
  let key = roleId;

  if (meeting) key += `__${meeting}`;
  if (turn > 1) key += `__t${turn}`;

  return key;
};

export type DeptSlot = {
  /** Clave de guardado dentro del departamento. */
  key: string;
  roleId: string;
  roleLabel: string;
  /** Sin definir cuando el departamento se asigna por semana. */
  meeting?: DeptMeeting;
  turn: number;
  /** Rótulo completo para la interfaz y el PDF. */
  label: string;
};

const MEETING_LABEL: Record<DeptMeeting, string> = {
  midweek: 'Entre semana',
  weekend: 'Fin de semana',
};

const TURN_LABEL = ['', 'Principio', 'Final'];

/** Todos los puestos de un departamento, en el orden en que se enseñan. */
export const buildDeptSlots = (
  config: DepartmentsConfig | null | undefined,
  dept: DepartmentType
): DeptSlot[] => {
  const { scope, turns } = readDeptConfig(config, dept);
  const roles = DEPT_ROLES[dept] ?? [];

  const meetings: (DeptMeeting | undefined)[] =
    scope === 'meeting' ? ['midweek', 'weekend'] : [undefined];

  const slots: DeptSlot[] = [];

  for (const meeting of meetings) {
    for (const role of roles) {
      for (let turn = 1; turn <= turns; turn++) {
        const extra = [
          meeting ? MEETING_LABEL[meeting] : '',
          turns > 1 ? TURN_LABEL[turn] : '',
        ].filter(Boolean);

        slots.push({
          key: deptSlotKey(role.id, meeting, turn),
          roleId: role.id,
          roleLabel: role.label,
          meeting,
          turn,
          label:
            extra.length > 0
              ? `${role.label} · ${extra.join(' · ')}`
              : role.label,
        });
      }
    }
  }

  return slots;
};

/**
 * Los puestos que le tocan a una reunión concreta.
 *
 * Con el departamento por semana, la misma asignación vale para las dos
 * reuniones — así que sale en las dos, que es justo lo que ya hacía "Mis
 * asignaciones" partiendo la semana en dos.
 */
export const deptSlotsForMeeting = (
  config: DepartmentsConfig | null | undefined,
  dept: DepartmentType,
  meeting: DeptMeeting
) =>
  buildDeptSlots(config, dept).filter(
    (slot) => slot.meeting === undefined || slot.meeting === meeting
  );

/** Todos los puestos de todos los departamentos. */
export const buildAllDeptSlots = (
  config: DepartmentsConfig | null | undefined
) =>
  (Object.keys(DEPT_ROLES) as DepartmentType[]).flatMap((dept) =>
    buildDeptSlots(config, dept).map((slot) => ({ dept, ...slot }))
  );

/**
 * Los mismos puestos, pero AGRUPADOS para pintarlos.
 *
 * `buildDeptSlots` mete la reunión y el turno DENTRO de la etiqueta de cada
 * campo —"Micro 1 · Entre semana", "Micro 1 · Fin de semana"— y eso está bien
 * para lo que no se ve: la exportación del S-140, el autocompletado y las
 * notificaciones, que necesitan una etiqueta que se explique sola.
 *
 * En pantalla no. Ahí quedan seis campos seguidos repitiendo el mismo sufijo,
 * y hay que leer el final de cada uno para saber de qué reunión es. Esto los
 * parte en grupos con un rótulo encima —"Reunión de entre semana", "Turno 1"—
 * y devuelve las etiquetas limpias, con el nombre del puesto y nada más.
 *
 * NO sustituye a `buildDeptSlots`: esa la usan ocho sitios y sus claves y
 * etiquetas viajan a la exportación y a las notificaciones. Esta es solo para
 * pintar.
 */
export type DeptSlotGroup = {
  /** El rótulo del grupo, o `null` cuando no hace falta (un solo grupo). */
  titulo: string | null;
  slots: DeptSlot[];
};

export const buildDeptSlotGroups = (
  config: DepartmentsConfig | null | undefined,
  dept: DepartmentType
): DeptSlotGroup[] => {
  const { scope, turns } = readDeptConfig(config, dept);
  const slots = buildDeptSlots(config, dept);

  const porReunion = scope === 'meeting';
  const porTurno = turns > 1;

  // Sin reuniones ni turnos que separar, un solo grupo sin rótulo: la sección
  // ya se llama "Micrófonos", no hace falta decir nada más.
  if (!porReunion && !porTurno) {
    return [{ titulo: null, slots }];
  }

  const grupos: DeptSlotGroup[] = [];

  for (const slot of slots) {
    const titulo = [
      slot.meeting ? MEETING_LABEL[slot.meeting] : '',
      porTurno ? TURN_LABEL[slot.turn] : '',
    ]
      .filter(Boolean)
      .join(' · ');

    const ultimo = grupos[grupos.length - 1];

    // El puesto pierde el sufijo: ya lo dice el rótulo de su grupo.
    const limpio = { ...slot, label: slot.roleLabel };

    if (ultimo && ultimo.titulo === titulo) ultimo.slots.push(limpio);
    else grupos.push({ titulo, slots: [limpio] });
  }

  return grupos;
};
