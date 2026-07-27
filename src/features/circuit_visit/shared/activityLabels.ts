// Etiquetas de la actividad que hace el acompañante con el superintendente.
//
// La definición se mudó al servicio porque también las usa la actividad de la
// ficha de persona (`@services/app/person_activity`), y un servicio no puede
// depender de una feature. Aquí se reexporta para no tocar los sitios que ya
// las importaban desde este camino.
export { ACTIVITY_LABELS } from '@services/app/circuit_visit';
