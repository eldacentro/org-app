import { useEffect, useState } from 'react';
import { displaySnackNotification } from '@services/states/app';
import { getMessageByCode } from '@services/i18n/translation';
import useUserDetails from '../useUserDetails';

const useUserAdditionalRights = () => {
  const { handleSaveDetails, currentUser } = useUserDetails();

  const [isMidweek, setIsMidweek] = useState(false);
  const [isWeekend, setIsWeekend] = useState(false);
  const [isPublicTalk, setIsPublicTalk] = useState(false);
  const [isAttendance, setIsAttendance] = useState(false);
  const [isDepartments, setIsDepartments] = useState(false);
  const [isPublications, setIsPublications] = useState(false);

  const handleToggleMidweek = async (value: boolean) => {
    try {
      setIsMidweek(value);

      const newUser = structuredClone(currentUser);

      newUser.profile.cong_role = newUser.profile.cong_role || [];

      if (value) {
        newUser.profile.cong_role.push('midweek_schedule');
      }

      if (!value) {
        newUser.profile.cong_role = newUser.profile.cong_role.filter(
          (role) => role !== 'midweek_schedule'
        );
      }

      await handleSaveDetails(newUser);
    } catch (error) {
      console.error(error);

      displaySnackNotification({
        header: getMessageByCode('error_app_generic-title'),
        message: getMessageByCode(error.message),
        severity: 'error',
      });
    }
  };

  const handleToggleWeekend = async (value: boolean) => {
    try {
      setIsWeekend(value);

      const newUser = structuredClone(currentUser);

      newUser.profile.cong_role = newUser.profile.cong_role || [];

      if (value) {
        newUser.profile.cong_role.push('weekend_schedule');
      }

      if (!value) {
        newUser.profile.cong_role = newUser.profile.cong_role.filter(
          (role) => role !== 'weekend_schedule'
        );
      }

      await handleSaveDetails(newUser);
    } catch (error) {
      console.error(error);

      displaySnackNotification({
        header: getMessageByCode('error_app_generic-title'),
        message: getMessageByCode(error.message),
        severity: 'error',
      });
    }
  };

  const handleTogglePublicTalk = async (value: boolean) => {
    try {
      setIsPublicTalk(value);

      const newUser = structuredClone(currentUser);

      newUser.profile.cong_role = newUser.profile.cong_role || [];

      if (value) {
        newUser.profile.cong_role.push('public_talk_schedule');
      }

      if (!value) {
        newUser.profile.cong_role = newUser.profile.cong_role.filter(
          (role) => role !== 'public_talk_schedule'
        );
      }

      await handleSaveDetails(newUser);
    } catch (error) {
      console.error(error);

      displaySnackNotification({
        header: getMessageByCode('error_app_generic-title'),
        message: getMessageByCode(error.message),
        severity: 'error',
      });
    }
  };

  const handleToggleAttendance = async (value: boolean) => {
    try {
      setIsAttendance(value);

      const newUser = structuredClone(currentUser);

      newUser.profile.cong_role = newUser.profile.cong_role || [];

      if (value) {
        newUser.profile.cong_role.push('attendance_tracking');
      }

      if (!value) {
        newUser.profile.cong_role = newUser.profile.cong_role.filter(
          (role) => role !== 'attendance_tracking'
        );
      }

      await handleSaveDetails(newUser);
    } catch (error) {
      console.error(error);

      displaySnackNotification({
        header: getMessageByCode('error_app_generic-title'),
        message: getMessageByCode(error.message),
        severity: 'error',
      });
    }
  };

  const handleToggleDepartments = async (value: boolean) => {
    try {
      setIsDepartments(value);

      const newUser = structuredClone(currentUser);

      newUser.profile.cong_role = newUser.profile.cong_role || [];

      if (value) {
        newUser.profile.cong_role.push('departments_schedule');
      }

      if (!value) {
        newUser.profile.cong_role = newUser.profile.cong_role.filter(
          (role) => role !== 'departments_schedule'
        );
      }

      await handleSaveDetails(newUser);
    } catch (error) {
      console.error(error);

      displaySnackNotification({
        header: getMessageByCode('error_app_generic-title'),
        message: getMessageByCode(error.message),
        severity: 'error',
      });
    }
  };

  const handleTogglePublications = async (value: boolean) => {
    try {
      setIsPublications(value);

      const newUser = structuredClone(currentUser);

      newUser.profile.cong_role = newUser.profile.cong_role || [];

      if (value) {
        newUser.profile.cong_role.push('publications_editor');
      }

      if (!value) {
        newUser.profile.cong_role = newUser.profile.cong_role.filter(
          (role) => role !== 'publications_editor'
        );
      }

      await handleSaveDetails(newUser);
    } catch (error) {
      console.error(error);

      displaySnackNotification({
        header: getMessageByCode('error_app_generic-title'),
        message: getMessageByCode(error.message),
        severity: 'error',
      });
    }
  };

  useEffect(() => {
    const isMidweek =
      currentUser.profile.cong_role?.includes('midweek_schedule') ?? false;
    setIsMidweek(isMidweek);

    const isWeekend =
      currentUser.profile.cong_role?.includes('weekend_schedule') ?? false;
    setIsWeekend(isWeekend);

    const isPublicTalk =
      currentUser.profile.cong_role?.includes('public_talk_schedule') ?? false;
    setIsPublicTalk(isPublicTalk);

    const isAttendance =
      currentUser.profile.cong_role?.includes('attendance_tracking') ?? false;
    setIsAttendance(isAttendance);

    const isDepartments =
      currentUser.profile.cong_role?.includes('departments_schedule') ?? false;
    setIsDepartments(isDepartments);

    const isPublications =
      currentUser.profile.cong_role?.includes('publications_editor') ?? false;
    setIsPublications(isPublications);
  }, [currentUser]);

  return {
    isMidweek,
    handleToggleMidweek,
    isWeekend,
    handleToggleWeekend,
    isPublicTalk,
    handleTogglePublicTalk,
    isAttendance,
    handleToggleAttendance,
    isDepartments,
    handleToggleDepartments,
    isPublications,
    handleTogglePublications,
  };
};

export default useUserAdditionalRights;
