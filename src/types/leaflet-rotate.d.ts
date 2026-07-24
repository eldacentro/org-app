/**
 * `leaflet-rotate` no publica sus propios tipos — parchea `L.Map` en tiempo
 * de importación (side-effect) para añadir soporte de rotación (bearing).
 * Aquí solo se declaran las piezas que este proyecto realmente usa.
 */
declare module 'leaflet-rotate' {}

// El import (aunque no se use directamente) es necesario para que TS trate
// el bloque de abajo como una AMPLIACIÓN del módulo 'leaflet' ya tipado por
// @types/leaflet, en vez de sustituirlo entero por uno nuevo vacío — sin
// esto, todas las demás propiedades de L.Map (fitBounds, on, off, etc.)
// dejan de verse en todo el proyecto.
import 'leaflet';

declare module 'leaflet' {
  interface MapOptions {
    /** Activa la capacidad de rotación del mapa (leaflet-rotate). */
    rotate?: boolean;
    /** Ángulo inicial en grados (sentido horario). */
    bearing?: number;
    /** Control nativo de leaflet-rotate (brújula) — este proyecto lo
     *  desactiva (`false`) y usa su propio botón con el estilo de la app. */
    rotateControl?: boolean | { closeOnZeroBearing?: boolean };
    /** Gesto táctil de dos dedos para rotar. */
    touchRotate?: boolean;
  }

  interface Map {
    setBearing(degrees: number): void;
    getBearing(): number;
    /** Handler estándar de Leaflet (como `dragging`/`touchZoom`) — se
     *  desactiva mientras el mapa está en modo editable (Geoman). */
    touchRotate?: Handler;
  }
}
