import { APFormType, APHours } from '@definition/ministry';

export type ApplicationFormProps = {
  application: APFormType;
  onChange: (value: APFormType) => void;
  /**
   * Solo donde las horas se GUARDAN al elegirlas (la solicitud ya enviada, que
   * repasa el comité). En el formulario que rellena el hermano no hace falta:
   * lo que elija viaja al enviarla.
   */
  onHoursChange?: (value: APHours) => void;
  onCoordinatorApproved?: VoidFunction;
  onCoordinatorRejected?: VoidFunction;
  onSecretaryApproved?: VoidFunction;
  onSecretaryRejected?: VoidFunction;
  onServiceApproved?: VoidFunction;
  onServiceRejected?: VoidFunction;
};
