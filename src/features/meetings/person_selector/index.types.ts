import { JSXElementConstructor, ReactElement, ReactNode } from 'react';
import { AssignmentCode, AssignmentFieldType } from '@definition/assignment';
import { DepartmentType, PersonType } from '@definition/person';
import { SxProps } from '@mui/material';

export type PersonSelectorType = {
  label: string;
  week: string;
  type?: AssignmentCode;
  assignment: AssignmentFieldType;
  readOnly?: boolean;
  showIcon?: boolean;
  showAssignmentsHistory?: boolean;
  visitingSpeaker?: boolean;
  talk?: number;
  helperNode?: ReactNode;
  circuitOverseer?: boolean;
  flex?: boolean;
  jwStreamRecording?: boolean;
  schedule_id?: string;
  endIcon?: ReactElement<unknown, string | JSXElementConstructor<unknown>>;
  selectorBoxSx?: SxProps;
  onEditClick?: () => void;
  onSelect?: (person: PersonType) => void;
  personValue?: PersonType;
  dept?: DepartmentType;
  /**
   * El puesto dentro del departamento ('micro1', 'exterior__midweek'…). Solo lo
   * usa el historial, para separar «este puesto» de «todos los departamentos».
   */
  deptSlotKey?: string;
  /**
   * De qué reunión es ese puesto de Departamentos, si es de una sola.
   *
   * Sin esto el aviso de ausencias miraba el día equivocado: se deducía la
   * reunión de la DIRECCIÓN de la página, y en Departamentos la dirección no
   * dice ni midweek ni weekend, así que caía siempre en fin de semana — y a un
   * acomodador del miércoles se le preguntaba por el domingo.
   *
   * Vacío = el puesto cubre la semana entera, y entonces cuentan los dos días.
   */
  deptMeeting?: 'midweek' | 'weekend';
};

export type PersonOptionsType = PersonType & {
  person_name?: string;
  weekOf?: string;
  last_assignment?: string;
  last_assistant?: string;
  last_assistant_weekOf?: string;
  hall?: string;
};
