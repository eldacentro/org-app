import { DepartmentType } from '@definition/person';

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

export type DepartmentsConfig = Partial<Record<DepartmentType, DeptConfig>>;

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
          label: extra.length > 0 ? `${role.label} · ${extra.join(' · ')}` : role.label,
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
