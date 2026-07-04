import ServiceYearContainer from '@features/ministry/service_year';

/**
 * Envoltorio delgado — la vista Año reutiliza `service_year` tal cual, sin
 * tocar su lógica interna (ya era exactamente lo que se pedía: "lo que sale
 * en Año de servicio está genial"). Solo se integra dentro del selector de
 * vistas de la página unificada.
 */
const YearView = () => <ServiceYearContainer />;

export default YearView;
