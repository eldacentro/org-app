/**
 * Cuántas horas de crédito cuentan de verdad cada mes.
 *
 * LA REGLA, tal y como la explicó el secretario (2026-08-20). Se aplica MES A
 * MES, nunca sobre el total del año:
 *
 *   67 h de predicación + 15 de crédito = 67   (el crédito no suma: la
 *                                               predicación ya pasó de 55 —
 *                                               pero la predicación cuenta
 *                                               ENTERA, no se recorta)
 *   40 h + 20 de crédito              = 55   (se pierden 5 de crédito: entre
 *                                               las dos no se puede pasar de 55)
 *   20 h + 20 de crédito              = 40   (no llegan a 55, cuenta todo)
 *
 * O sea: el crédito rellena hasta 55 y ni una más. La predicación no tiene
 * techo.
 *
 * PARA QUÉ SIRVE Y PARA QUÉ NO: esto es el control del propio precursor y del
 * comité de servicio. A la sucursal se mandan SOLO las horas de predicación,
 * sin crédito ninguno — así que este cálculo no debe tocar nunca lo que sale en
 * el informe que se envía.
 *
 * Vive aparte y sin dependencias para poder comprobarse solo: sumar mal aquí no
 * rompe nada a la vista, solo da una cifra equivocada en el registro de un
 * hermano, que es de los errores que tardan meses en verse.
 */

/** Ni la predicación ni el crédito juntos pasan de aquí en un mes. */
export const CREDIT_MONTHLY_CAP = 55;

/**
 * El crédito que cuenta ese mes: el que quepa hasta 55, y nunca negativo.
 *
 * Si la predicación ya llega o pasa de 55, el crédito no suma nada.
 */
export const effectiveCreditHours = (
  fieldService: number,
  credit: number
): number => {
  const campo = Number.isFinite(fieldService) ? Math.max(0, fieldService) : 0;
  const cred = Number.isFinite(credit) ? Math.max(0, credit) : 0;

  return Math.min(cred, Math.max(0, CREDIT_MONTHLY_CAP - campo));
};

/**
 * El total del mes a efectos de control: predicación más el crédito que quepa.
 *
 * La predicación entra ENTERA aunque pase de 55; el tope solo recorta crédito.
 */
export const monthlyCreditedTotal = (
  fieldService: number,
  credit: number
): number => {
  const campo = Number.isFinite(fieldService) ? Math.max(0, fieldService) : 0;

  return campo + effectiveCreditHours(campo, credit);
};

/**
 * El crédito apuntado en un informe, antes del tope.
 *
 * Hay dos campos por motivos históricos: `approved` es lo que el comité dio por
 * bueno y manda; `value` es lo que se apuntó cuando no hay aprobación. Se lee
 * en un solo sitio para que nadie vuelva a elegir uno u otro por su cuenta.
 */
export const rawCreditHours = (credit: {
  value?: number;
  approved?: number;
}): number => {
  const approved = credit?.approved ?? 0;

  if (approved > 0) return approved;

  return credit?.value ?? 0;
};

/**
 * Las horas de un campo que puede venir de dos formas.
 *
 * En los informes de la congregación las horas son un número. En los que manda
 * el propio hermano (S-4) pueden ser `{ daily, monthly }` con formato `h:mm`,
 * porque ahí se apuntan día a día. Y hay informes viejos con la forma antigua.
 *
 * Tenerlo en un solo sitio evita el fallo que ya se coló una vez: mirar solo la
 * forma de número y, sin darse cuenta, dejar fuera —o sin topar— el crédito de
 * los informes que usan la otra.
 */
export const hoursOfEither = (value: unknown): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;

  if (!value || typeof value !== 'object') return 0;

  const v = value as { daily?: string; monthly?: string };

  const minutos = (texto?: string) => {
    if (typeof texto !== 'string' || texto.length === 0) return 0;

    const [h, m] = texto.split(':').map(Number);

    return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
  };

  const total = minutos(v.daily) + minutos(v.monthly);

  return (total - (total % 60)) / 60;
};
