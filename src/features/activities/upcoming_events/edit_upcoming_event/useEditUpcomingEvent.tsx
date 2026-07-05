import { ChangeEvent, useCallback, useMemo, useState } from 'react';
import { useAtomValue } from 'jotai';
import { SelectChangeEvent } from '@mui/material';
import {
  UpcomingEventCategory,
  UpcomingEventDuration,
} from '@definition/upcoming_events';
import { hour24FormatState, congIDState } from '@states/settings';
import { formatDate, getDatesBetweenDates, stackDatesToOne } from '@utils/date';
import { resizeImageToJpeg } from '@utils/image';
import {
  uploadUpcomingEventCoverPhoto,
  deleteUpcomingEventCoverPhoto,
} from '@services/firebase/upcoming_events';
import { displaySnackNotification } from '@services/states/app';
import { decorationsForEvent } from '../decorations_for_event';
import { EditUpcomingEventProps } from './index.types';

// Ancho máximo real al que se muestra la portada en la tarjeta de
// "Próximos eventos" (ver upcoming_event/index.tsx) — no tiene sentido
// subir/guardar una imagen más ancha que eso.
const COVER_PHOTO_MAX_WIDTH = 720;

const useEditUpcomingEvent = ({ data, onSave }: EditUpcomingEventProps) => {
  const hour24 = useAtomValue(hour24FormatState);
  const congID = useAtomValue(congIDState);

  const [localEvent, setLocalEvent] = useState(data);

  const [wasSubmitted, setWasSubmitted] = useState(false);

  const [uploadingCoverPhoto, setUploadingCoverPhoto] = useState(false);

  const [errors, setErrors] = useState({
    category: false,
    duration: false,
    custom: false,
  });

  const validateField = useCallback(
    (field: keyof typeof errors, value) => {
      const data = localEvent.event_data;

      switch (field) {
        case 'category':
          return value === null || value === undefined;
        case 'duration':
          return data.category === null || data.duration === undefined;
        case 'custom':
          return (
            data.category === UpcomingEventCategory.Custom &&
            (!value || value.trim() === '')
          );
        default:
          return false;
      }
    },
    [localEvent.event_data]
  );

  const validateForm = useCallback(() => {
    const data = localEvent.event_data;

    const newErrors = {
      category: validateField('category', data.category),
      duration: validateField('duration', data.duration),
      custom: validateField('custom', data.custom),
    };

    setErrors(newErrors);
    return !Object.values(newErrors).some(Boolean);
  }, [localEvent.event_data, validateField]);

  const handleChangeEventCategory = useCallback(
    (event: SelectChangeEvent<unknown>) => {
      const targetValue = event.target.value as UpcomingEventCategory;

      setLocalEvent((prev) => ({
        ...prev,
        event_data: {
          ...prev.event_data,
          category: targetValue,
          duration: decorationsForEvent[targetValue].duration,
          assemblyRepresentative:
            targetValue === UpcomingEventCategory.AssemblyWeek
              ? prev.event_data.assemblyRepresentative
              : undefined,
        },
      }));

      if (wasSubmitted) {
        setErrors((prev) => ({
          ...prev,
          type: false,
          duration: false,
        }));
      }
    },
    [wasSubmitted]
  );

  const handleChangeEventCustomTitle = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
      setLocalEvent((prev) => {
        return {
          ...prev,
          event_data: {
            ...prev.event_data,
            custom: event.target.value,
          },
        };
      });

      if (wasSubmitted) {
        setErrors((prev) => ({ ...prev, custom: false }));
      }
    },
    [wasSubmitted]
  );

  const handleChangeEventDescription = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
      setLocalEvent((prev) => {
        return {
          ...prev,
          event_data: {
            ...prev.event_data,
            description: event.target.value,
          },
        };
      });
    },
    []
  );

  const handleChangeEventTopic = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
      setLocalEvent((prev) => {
        return {
          ...prev,
          event_data: {
            ...prev.event_data,
            topic: event.target.value,
          },
        };
      });
    },
    []
  );

  const handleChangeAssemblyRepresentative = useCallback(
    (event: SelectChangeEvent<unknown>) => {
      setLocalEvent((prev) => {
        return {
          ...prev,
          event_data: {
            ...prev.event_data,
            assemblyRepresentative: event.target.value as 'branch' | 'co',
          },
        };
      });
    },
    []
  );

  const handleChangeJwLibraryUrl = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
      setLocalEvent((prev) => {
        return {
          ...prev,
          event_data: {
            ...prev.event_data,
            jwLibraryUrl: event.target.value,
          },
        };
      });
    },
    []
  );

  const handleUploadCoverPhoto = useCallback(
    async (file?: File) => {
      if (!file) return;

      setUploadingCoverPhoto(true);
      try {
        const blob = await resizeImageToJpeg(file, COVER_PHOTO_MAX_WIDTH);
        const url = await uploadUpcomingEventCoverPhoto(
          congID,
          localEvent.event_uid,
          blob
        );

        setLocalEvent((prev) => ({
          ...prev,
          event_data: { ...prev.event_data, coverPhotoUrl: url },
        }));
      } catch (error) {
        console.error(error);
        displaySnackNotification({
          header: 'Error',
          message: 'Error subiendo la portada. Verifica tu conexión.',
          severity: 'error',
        });
      } finally {
        setUploadingCoverPhoto(false);
      }
    },
    [congID, localEvent.event_uid]
  );

  const handleDeleteCoverPhoto = useCallback(async () => {
    setUploadingCoverPhoto(true);
    try {
      await deleteUpcomingEventCoverPhoto(congID, localEvent.event_uid);
      setLocalEvent((prev) => ({
        ...prev,
        event_data: { ...prev.event_data, coverPhotoUrl: '' },
      }));
    } catch (error) {
      console.error(error);
      displaySnackNotification({
        header: 'Error',
        message: 'Error eliminando la portada. Verifica tu conexión.',
        severity: 'error',
      });
    } finally {
      setUploadingCoverPhoto(false);
    }
  }, [congID, localEvent.event_uid]);

  const handleChangeEventDuration = useCallback(
    (event: SelectChangeEvent<unknown>) => {
      setLocalEvent((prev) => {
        return {
          ...prev,
          event_data: {
            ...prev.event_data,
            duration: event.target.value as UpcomingEventDuration,
          },
        };
      });

      if (wasSubmitted) {
        setErrors((prev) => ({ ...prev, duration: false }));
      }
    },
    [wasSubmitted]
  );

  const handleChangeEventStartDate = useCallback((value: Date) => {
    setLocalEvent((prev) => {
      const newStart = stackDatesToOne(
        value,
        new Date(prev.event_data.start),
        true
      ).toISOString();

      // En un evento de un solo día, la fecha es una sola — mover el campo
      // "Fecha" tiene que mover también el fin, si no el evento se queda
      // con una fecha de fin obsoleta que nadie ve en el formulario pero
      // que sí se usa al comparar el evento con otras fechas (p. ej. para
      // saber si suspende una reunión).
      const newEnd =
        prev.event_data.duration === UpcomingEventDuration.SingleDay
          ? stackDatesToOne(value, new Date(prev.event_data.end), true).toISOString()
          : prev.event_data.end;

      return {
        ...prev,
        event_data: {
          ...prev.event_data,
          start: newStart,
          end: newEnd,
        },
      };
    });
  }, []);

  const handleChangeEventStartTime = useCallback((value: Date) => {
    setLocalEvent((prev) => {
      return {
        ...prev,
        event_data: {
          ...prev.event_data,
          start: stackDatesToOne(
            new Date(prev.event_data.start),
            value,
            true
          ).toISOString(),
        },
      };
    });
  }, []);

  const handleChangeEventEndDate = useCallback((value: Date) => {
    setLocalEvent((prev) => {
      return {
        ...prev,
        event_data: {
          ...prev.event_data,
          end: stackDatesToOne(
            value,
            new Date(prev.event_data.end),
            true
          ).toISOString(),
        },
      };
    });
  }, []);

  const handleChangeEventEndTime = useCallback((value: Date) => {
    setLocalEvent((prev) => {
      return {
        ...prev,
        event_data: {
          ...prev.event_data,
          // Usa la propia fecha de fin, no la de inicio — en un evento de
          // varios días son fechas distintas, y tomar la de inicio movería
          // silenciosamente la fecha de fin al mismo día que la de inicio
          // cada vez que solo se cambia la hora.
          end: stackDatesToOne(
            new Date(prev.event_data.end),
            value,
            true
          ).toISOString(),
        },
      };
    });
  }, []);

  // Un evento de varios días puede tener horas distintas cada jornada (p.
  // ej. una asamblea regional). Esta lista se arma a partir del rango de
  // fechas actual — si un día concreto no tiene su propio horario guardado
  // en dailyTimes, cae al horario general (start/end) como valor por
  // defecto, así que extender el rango de fechas nunca deja un día "vacío".
  const dailyTimesList = useMemo(() => {
    if (localEvent.event_data.duration !== UpcomingEventDuration.MultipleDays) {
      return [];
    }

    const dates = getDatesBetweenDates(
      localEvent.event_data.start,
      localEvent.event_data.end
    );

    return dates.map((date) => {
      const dateStr = formatDate(date, 'yyyy/MM/dd');

      const override = localEvent.event_data.dailyTimes?.find(
        (record) => record.date === dateStr
      );

      const start = override
        ? new Date(override.start)
        : stackDatesToOne(date, new Date(localEvent.event_data.start), true);

      const end = override
        ? new Date(override.end)
        : stackDatesToOne(date, new Date(localEvent.event_data.end), true);

      return { date: dateStr, start, end };
    });
  }, [
    localEvent.event_data.duration,
    localEvent.event_data.start,
    localEvent.event_data.end,
    localEvent.event_data.dailyTimes,
  ]);

  const handleChangeDailyTime = useCallback(
    (date: string, field: 'start' | 'end', value: Date) => {
      setLocalEvent((prev) => {
        const dates = getDatesBetweenDates(
          prev.event_data.start,
          prev.event_data.end
        );
        const dateObj =
          dates.find((d) => formatDate(d, 'yyyy/MM/dd') === date) ??
          new Date(date);

        const existing = prev.event_data.dailyTimes?.find(
          (record) => record.date === date
        );

        const currentStart = existing
          ? new Date(existing.start)
          : stackDatesToOne(dateObj, new Date(prev.event_data.start), true);
        const currentEnd = existing
          ? new Date(existing.end)
          : stackDatesToOne(dateObj, new Date(prev.event_data.end), true);

        const newStart =
          field === 'start'
            ? stackDatesToOne(dateObj, value, true)
            : currentStart;
        const newEnd =
          field === 'end' ? stackDatesToOne(dateObj, value, true) : currentEnd;

        const dailyTimes = (prev.event_data.dailyTimes ?? []).filter(
          (record) => record.date !== date
        );
        dailyTimes.push({
          date,
          start: newStart.toISOString(),
          end: newEnd.toISOString(),
        });

        return {
          ...prev,
          event_data: {
            ...prev.event_data,
            dailyTimes,
          },
        };
      });
    },
    []
  );

  const handleSaveEvent = useCallback(() => {
    setWasSubmitted(true);

    if (validateForm()) {
      const event = structuredClone(localEvent);
      event.event_data.updatedAt = new Date().toISOString();

      onSave(event);
    }
  }, [localEvent, onSave, validateForm]);

  const handleDeleteEvent = useCallback(() => {
    const event = structuredClone(localEvent);

    event.event_data._deleted = true;
    event.event_data.updatedAt = new Date().toISOString();

    onSave(event);
  }, [localEvent, onSave]);

  return {
    hour24,
    localEvent,
    errors,
    handleChangeEventCategory,
    handleChangeEventCustomTitle,
    handleChangeEventDescription,
    handleChangeEventTopic,
    handleChangeAssemblyRepresentative,
    handleChangeJwLibraryUrl,
    uploadingCoverPhoto,
    handleUploadCoverPhoto,
    handleDeleteCoverPhoto,
    handleChangeEventDuration,

    handleChangeEventStartDate,
    handleChangeEventStartTime,
    handleChangeEventEndDate,
    handleChangeEventEndTime,

    dailyTimesList,
    handleChangeDailyTime,

    handleSaveEvent,
    handleDeleteEvent,
  };
};

export default useEditUpcomingEvent;
