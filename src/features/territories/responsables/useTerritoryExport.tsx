import { useCallback } from 'react';
import { useAtomValue } from 'jotai';
import { pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import writeXlsxFile, { Row, SheetData } from 'write-excel-file/browser';
import Papa from 'papaparse';
import { congNameState } from '@states/settings';
import {
  territoriesState,
  territoryAssignmentsState,
  territoryZonesSortedState,
  territorySettingsState,
} from '@states/territories';
import {
  formatTerritoryDate,
  getZoneName,
  serviceYearRange,
  territoryLabel,
} from '@services/app/territories';
import { territoriesToKml } from '@utils/kml';
import { usePersonName } from '@features/territories/usePersonName';
import S13Document, {
  S13Sheet,
  S13TerritoryRow,
} from './S13Document';

const S13_DATE = 'dd-MM-yyyy';
const ROWS_PER_SHEET = 20;

export type ExcelFilter = 'all' | 'assigned' | 'unassigned' | 'campaigns';

export const useTerritoryExport = () => {
  const congName = useAtomValue(congNameState);
  const zones = useAtomValue(territoryZonesSortedState);
  const territories = useAtomValue(territoriesState);
  const assignments = useAtomValue(territoryAssignmentsState);
  const settings = useAtomValue(territorySettingsState);
  const resolveName = usePersonName();

  const safeName = (congName || 'congregacion').replace(/\s+/g, '_');

  // ── S-13 (PDF) — réplica del formulario oficial ──
  const exportS13 = useCallback(
    async (refDate: Date, includeCampaigns: boolean) => {
      const { start, end } = serviceYearRange(refDate);
      const startYear = String(end.getFullYear());

      // Un año de servicio va del 1 de septiembre al 31 de agosto siguiente.
      // Se incluye una asignación si: empezó dentro de ese año, terminó
      // dentro de ese año, o estaba en curso atravesando el año entero (sin
      // devolver, o devuelta después de que el año terminara).
      const inServiceYear = (a: (typeof assignments)[number]) => {
        const assigned = new Date(a.assignedAt);
        const returned = a.returnedAt ? new Date(a.returnedAt) : null;
        const assignedIn = assigned >= start && assigned < end;
        const returnedIn = !!returned && returned >= start && returned < end;
        const spanning = assigned < start && (!returned || returned >= end);
        return assignedIn || returnedIn || spanning;
      };

      const emptyRow = (): S13TerritoryRow => ({
        numero: '',
        lastCompleted: '',
        assignments: [],
      });

      const sheets: S13Sheet[] = [];

      zones.forEach((zone) => {
        const zoneTerritories = territories
          .filter((t) => t.zoneId === zone.id)
          .sort((a, b) =>
            a.numero.localeCompare(b.numero, undefined, { numeric: true })
          );
        if (zoneTerritories.length === 0) return;

        const rows: S13TerritoryRow[] = zoneTerritories.map((t) => ({
          numero: t.numero,
          lastCompleted: t.lastWorkedAt
            ? formatTerritoryDate(t.lastWorkedAt, S13_DATE)
            : '',
          assignments: assignments
            .filter((a) => a.territoryId === t.id)
            .filter((a) => includeCampaigns || !a.isCampaign)
            .filter(inServiceYear)
            .sort(
              (x, y) =>
                new Date(x.assignedAt).getTime() -
                new Date(y.assignedAt).getTime()
            )
            .slice(0, 8)
            .map((a) => ({
              name: resolveName(a.personUid),
              dateAssigned: formatTerritoryDate(a.assignedAt, S13_DATE),
              dateCompleted: a.returnedAt
                ? formatTerritoryDate(a.returnedAt, S13_DATE)
                : '',
              isCampaign: a.isCampaign,
            })),
        }));

        // Paginar en hojas de 20 filas, rellenando la última con filas vacías.
        for (let i = 0; i < rows.length; i += ROWS_PER_SHEET) {
          const slice = rows.slice(i, i + ROWS_PER_SHEET);
          while (slice.length < ROWS_PER_SHEET) slice.push(emptyRow());
          sheets.push({
            serviceYear: startYear,
            territoryType: zone.nombre,
            rows: slice,
          });
        }
      });

      const blob = await pdf(<S13Document data={{ sheets }} />).toBlob();
      saveAs(blob, `S-13_${safeName}_${startYear}.pdf`);
    },
    [zones, territories, assignments, resolveName, safeName]
  );

  // ── Filas planas (Excel/CSV) ──
  const buildRows = useCallback(
    (filter: ExcelFilter) => {
      const openIds = new Set(
        assignments.filter((a) => !a.returnedAt).map((a) => a.territoryId)
      );

      let rows = assignments.map((a) => {
        const t = territories.find((x) => x.id === a.territoryId);
        return {
          Zona: t ? getZoneName(t.zoneId, zones) : '—',
          Territorio: t ? territoryLabel(t) : '—',
          Publicador: resolveName(a.personUid),
          Asignado: formatTerritoryDate(a.assignedAt, settings.dateFormat),
          Devuelto: a.returnedAt
            ? formatTerritoryDate(a.returnedAt, settings.dateFormat)
            : '',
          Estado: a.status,
          Campaña: a.isCampaign ? 'Sí' : 'No',
        };
      });

      if (filter === 'assigned') {
        rows = rows.filter((_, i) => !assignments[i].returnedAt);
      } else if (filter === 'unassigned') {
        // territorios sin asignación abierta → una fila por territorio libre
        return territories
          .filter((t) => !openIds.has(t.id))
          .map((t) => ({
            Zona: getZoneName(t.zoneId, zones),
            Territorio: territoryLabel(t),
            Publicador: '',
            Asignado: '',
            Devuelto: '',
            Estado: 'libre',
            Campaña: 'No',
          }));
      } else if (filter === 'campaigns') {
        rows = rows.filter((_, i) => assignments[i].isCampaign);
      }
      return rows;
    },
    [assignments, territories, zones, settings, resolveName]
  );

  const exportCsv = useCallback(
    (filter: ExcelFilter = 'all') => {
      const rows = buildRows(filter);
      const csv = Papa.unparse(rows);
      saveAs(
        new Blob([csv], { type: 'text/csv;charset=utf-8;' }),
        `territorios_${filter}_${safeName}.csv`
      );
    },
    [buildRows, safeName]
  );

  const exportExcel = useCallback(
    async (filter: ExcelFilter = 'all') => {
      const rows = buildRows(filter);
      const headers = [
        'Zona',
        'Territorio',
        'Publicador',
        'Asignado',
        'Devuelto',
        'Estado',
        'Campaña',
      ] as const;

      const data: SheetData = [
        headers.map((h) => ({ value: h, fontWeight: 'bold' })) as Row,
        ...rows.map(
          (r) =>
            headers.map((h) => ({ value: String(r[h] ?? ''), type: String })) as Row
        ),
      ];

      await writeXlsxFile(data, {
        fileName: `territorios_${filter}_${safeName}.xlsx`,
        stickyRowsCount: 1,
        columns: [
          { width: 22 },
          { width: 28 },
          { width: 30 },
          { width: 16 },
          { width: 16 },
          { width: 14 },
          { width: 10 },
        ],
      });
    },
    [buildRows, safeName]
  );

  // ── Geometría (GeoJSON / KML) ──
  const exportGeoJson = useCallback(() => {
    const fc = {
      type: 'FeatureCollection' as const,
      features: territories
        .filter((t) => t.geometry)
        .map((t) => ({
          type: 'Feature' as const,
          properties: {
            id: t.id,
            numero: t.numero,
            nombre: t.nombre ?? '',
            zona: getZoneName(t.zoneId, zones),
          },
          geometry: t.geometry,
        })),
    };
    saveAs(
      new Blob([JSON.stringify(fc, null, 2)], { type: 'application/geo+json' }),
      `territorios_${safeName}.geojson`
    );
  }, [territories, zones, safeName]);

  const exportKml = useCallback(() => {
    const items = territories
      .filter((t) => t.geometry)
      .map((t) => ({ name: territoryLabel(t), geometry: t.geometry! }));
    saveAs(
      new Blob([territoriesToKml(items)], {
        type: 'application/vnd.google-earth.kml+xml',
      }),
      `territorios_${safeName}.kml`
    );
  }, [territories, safeName]);

  return { exportS13, exportExcel, exportCsv, exportGeoJson, exportKml };
};
