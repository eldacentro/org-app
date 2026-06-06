import { lazy, useEffect, useMemo, useState } from 'react';
import { createHashRouter, RouterProvider } from 'react-router';
import { useAtom, useAtomValue } from 'jotai';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@components/index';
import { RootLayout } from '@layouts/index';
import { useCurrentUser } from './hooks';
import {
  appLangState,
  appLocaleState,
  appThemeState,
  congAccountConnectedState,
} from '@states/app';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import rtlPlugin from '@mui/stylis-plugin-rtl';
import FeatureFlagsWrapper from '@wrapper/feature_flags';
import RouteProtected from '@components/route_protected';
import { determineAppLocale } from '@services/app';
import { firstDayWeekState } from '@states/settings';
import { LANGUAGE_LIST } from './constants';
import { triggerAutoBackup } from '@services/app/backupScheduler';

// lazy loading
const Dashboard = lazy(() => import('@pages/dashboard'));
const MeetingsDashboard = lazy(() => import('@pages/category_dashboards/meetings'));
const MinistryDashboard = lazy(() => import('@pages/category_dashboards/ministry'));
const CongregationDashboard = lazy(() => import('@pages/category_dashboards/congregation'));
const TalksDashboard = lazy(() => import('@pages/category_dashboards/talks'));
const ReportsDashboard = lazy(() => import('@pages/category_dashboards/reports'));
const SettingsDashboard = lazy(() => import('@pages/category_dashboards/settings'));

const Documentos = lazy(() => import('@pages/congregation/documentos'));
const Limpieza = lazy(() => import('@pages/congregation/limpieza'));
const Territorios = lazy(() => import('@pages/congregation/territories'));

const MyProfile = lazy(() => import('@pages/my_profile'));
const PersonsAll = lazy(() => import('@pages/persons/all_persons'));
const PersonDetails = lazy(() => import('@pages/persons/person_details'));
const PublicTalksList = lazy(
  () => import('@pages/meeting_materials/public_talks_list')
);
const BranchOfficeReports = lazy(() => import('@pages/reports/branch_office'));
const MeetingAttendance = lazy(
  () => import('@pages/reports/meeting_attendance')
);
const FieldServiceReportsPage = lazy(
  () => import('@pages/reports/field_service')
);
const MidweekMeeting = lazy(() => import('@pages/meetings/midweek'));
const MinistryReport = lazy(() => import('@pages/ministry/ministry_report'));
const ServiceYear = lazy(() => import('@pages/ministry/service_year'));
const AuxiliaryPioneerApplication = lazy(
  () => import('@pages/ministry/auxiliary_pioneer')
);
const SpeakersCatalog = lazy(() => import('@pages/persons/speakers_catalog'));
const OutgoingSpeakers = lazy(() => import('@pages/outgoing_speakers'));
const WeekendMeeting = lazy(() => import('@pages/meetings/weekend'));
const FieldServiceGroups = lazy(
  () => import('@pages/congregation/field_service_groups')
);
const PublisherRecord = lazy(() => import('@pages/reports/publisher_records'));
const PublisherRecordDetails = lazy(
  () => import('@pages/reports/publisher_records_details')
);
const UsersAll = lazy(
  () => import('@pages/congregation/manage_access/all_users')
);
const UserDetails = lazy(
  () => import('@pages/congregation/manage_access/user_details')
);
const WeeklySchedules = lazy(() => import('@pages/meetings/schedules'));
const CongregationSettings = lazy(() => import('@pages/congregation/settings'));
const Applications = lazy(() => import('@pages/persons/applications'));
const ApplicationDetails = lazy(
  () => import('@pages/persons/application_details')
);
const UpcomingEvents = lazy(() => import('@pages/activities/upcoming_events'));
const DepartmentsSchedule = lazy(
  () => import('@pages/departments_schedule')
);
const PredicacionSalidas = lazy(
  () => import('@pages/predicacion_salidas')
);
const Exhibitors = lazy(
  () => import('@pages/exhibitors')
);
const Evacuacion = lazy(() => import('@pages/congregation/evacuacion'));
const Responsabilidades = lazy(
  () => import('@pages/congregation/responsabilidades')
);

const queryClient = new QueryClient();

const ltrCache = createCache({
  key: 'css',
  prepend: true,
});

const rtlCache = createCache({
  key: 'muirtl',
  stylisPlugins: [rtlPlugin],
});

const PublisherRoute = () => {
  const { isPublisher } = useCurrentUser();
  return <RouteProtected allowed={isPublisher} />;
};

const ConnectedRoute = () => {
  const isConnected = useAtomValue(congAccountConnectedState);
  return <RouteProtected allowed={isConnected} />;
};

const PublisherAppointedServiceRoute = () => {
  const { isPublisher, isAppointed, isServiceCommittee } = useCurrentUser();
  return (
    <RouteProtected
      allowed={isPublisher || isAppointed || isServiceCommittee}
    />
  );
};

const AppointedWeekendRoute = () => {
  const { isAppointed, isWeekendEditor } = useCurrentUser();
  return <RouteProtected allowed={isAppointed || isWeekendEditor} />;
};

const AppointedPublicTalkRoute = () => {
  const { isAppointed, isPublicTalkCoordinator } = useCurrentUser();
  return <RouteProtected allowed={isAppointed || isPublicTalkCoordinator} />;
};

const ElderRoute = () => {
  const { isElder } = useCurrentUser();
  return <RouteProtected allowed={isElder} />;
};

const PersonEditorRoute = () => {
  const { isPersonEditor } = useCurrentUser();
  return <RouteProtected allowed={isPersonEditor} />;
};

const AttendanceEditorRoute = () => {
  const { isAttendanceEditor } = useCurrentUser();
  return <RouteProtected allowed={isAttendanceEditor} />;
};

const MidweekEditorRoute = () => {
  const { isMidweekEditor } = useCurrentUser();
  return <RouteProtected allowed={isMidweekEditor} />;
};

const MidweekDepartmentsRoute = () => {
  const { isMidweekEditor, isDepartmentsEditor } = useCurrentUser();
  return <RouteProtected allowed={isMidweekEditor || isDepartmentsEditor} />;
};

const WeekendPublicTalkRoute = () => {
  const { isWeekendEditor, isPublicTalkCoordinator } = useCurrentUser();
  return (
    <RouteProtected allowed={isWeekendEditor || isPublicTalkCoordinator} />
  );
};

const GroupLanguageSecretaryRoute = () => {
  const { isGroupOverseer, isLanguageGroupOverseer, isSecretary } =
    useCurrentUser();
  return (
    <RouteProtected
      allowed={isGroupOverseer || isLanguageGroupOverseer || isSecretary}
    />
  );
};

const LanguageGroupRoute = () => {
  const { isLanguageGroupOverseer } = useCurrentUser();
  return <RouteProtected allowed={isLanguageGroupOverseer} />;
};

const AdminRoute = () => {
  const { isAdmin } = useCurrentUser();
  return <RouteProtected allowed={isAdmin} />;
};

const NotGroupRoute = () => {
  const { isGroup } = useCurrentUser();
  return <RouteProtected allowed={!isGroup} />;
};

const ServiceCommitteeRoute = () => {
  const { isServiceCommittee } = useCurrentUser();
  return <RouteProtected allowed={isServiceCommittee} />;
};

const App = ({ updatePwa }: { updatePwa: VoidFunction }) => {
  const { isAdmin } = useCurrentUser();

  const [adapterLocale, setAdapterLocale] = useAtom(appLocaleState);

  const theme = useAtomValue(appThemeState);
  const appLang = useAtomValue(appLangState);
  const firstDayOfTheWeekOption = useAtomValue(firstDayWeekState);

  const [cache, setCache] = useState(ltrCache);

  const router = useMemo(() => {
    return createHashRouter([
      {
        errorElement: <ErrorBoundary updatePwa={updatePwa} />,
        children: [
          {
            element: <RootLayout updatePwa={updatePwa} />,
            children: [
              // public routes
              { index: true, element: <Dashboard /> },
              { path: '/dashboard/meetings', element: <MeetingsDashboard /> },
              { path: '/dashboard/ministry', element: <MinistryDashboard /> },
              { path: '/dashboard/congregation', element: <CongregationDashboard /> },
              { path: '/dashboard/talks', element: <TalksDashboard /> },
              { path: '/dashboard/reports', element: <ReportsDashboard /> },
              { path: '/dashboard/settings', element: <SettingsDashboard /> },
              
              { path: '/user-profile', element: <MyProfile /> },
              { path: '/weekly-schedules', element: <WeeklySchedules /> },
              {
                path: '/activities/upcoming-events',
                element: <UpcomingEvents />,
              },
              { path: '/congregation/evacuacion', element: <Evacuacion /> },
              { path: '/congregation/limpieza', element: <Limpieza /> },
              { path: '/congregation/documentos', element: <Documentos /> },
              { path: '/congregation/territories', element: <Territorios /> },

              // publisher routes
              {
                element: <PublisherRoute />,
                children: [
                  { path: '/ministry-report', element: <MinistryReport /> },
                  { path: '/service-year', element: <ServiceYear /> },

                  // only if connected
                  {
                    element: <ConnectedRoute />,
                    children: [
                      {
                        path: '/auxiliary-pioneer-application',
                        element: <AuxiliaryPioneerApplication />,
                      },
                    ],
                  },
                ],
              },

              // service committee routes
              {
                element: <ServiceCommitteeRoute />,
                children: [
                  { path: '/predicacion-salidas', element: <PredicacionSalidas /> },
                  { path: '/exhibitors', element: <Exhibitors /> },
                ],
              },

              // publisher, service committee, appointed routes
              {
                element: <PublisherAppointedServiceRoute />,
                children: [
                  {
                    path: '/field-service-groups',
                    element: <FieldServiceGroups />,
                  },
                  {
                    path: '/congregation/responsabilidades',
                    element: <Responsabilidades />,
                  },
                ],
              },

              // appointed routes
              {
                element: <AppointedWeekendRoute />,
                children: [
                  { path: '/public-talks-list', element: <PublicTalksList /> },
                ],
              },

              // public talk coordinator routes
              {
                element: <AppointedPublicTalkRoute />,
                children: [
                  { path: '/speakers-catalog', element: <SpeakersCatalog /> },
                  { path: '/outgoing-speakers', element: <OutgoingSpeakers /> },
                ],
              },

              // elder routes
              {
                element: <ElderRoute />,
                children: [
                  { path: '/persons', element: <PersonsAll /> },
                  { path: '/persons/:id', element: <PersonDetails /> },
                  {
                    path: '/congregation-settings',
                    element: <CongregationSettings />,
                  },
                  { path: '/publisher-records', element: <PublisherRecord /> },
                  {
                    path: '/publisher-records/:id',
                    element: <PublisherRecordDetails />,
                  },

                  // only if connected
                  {
                    element: <ConnectedRoute />,
                    children: [
                      {
                        path: '/pioneer-applications',
                        element: <Applications />,
                      },
                      {
                        path: '/pioneer-applications/:id',
                        element: <ApplicationDetails />,
                      },
                    ],
                  },
                ],
              },

              // person editor routes
              {
                element: <PersonEditorRoute />,
                children: [{ path: '/persons/new', element: <PersonDetails /> }],
              },

              // attendance editor routes
              {
                element: <AttendanceEditorRoute />,
                children: [
                  {
                    path: '/reports/meeting-attendance',
                    element: <MeetingAttendance />,
                  },
                ],
              },

              // midweek editor routes
              {
                element: <MidweekEditorRoute />,
                children: [
                  { path: '/midweek-meeting', element: <MidweekMeeting /> },
                ],
              },

              // departments schedule routes
              {
                element: <MidweekDepartmentsRoute />,
                children: [
                  {
                    path: '/departments-schedule',
                    element: <DepartmentsSchedule />,
                  },
                ],
              },

              // weekend editor routes
              {
                element: <WeekendPublicTalkRoute />,
                children: [
                  { path: '/weekend-meeting', element: <WeekendMeeting /> },
                ],
              },

              // secretary routes and group overseer
              {
                element: <GroupLanguageSecretaryRoute />,
                children: [
                  {
                    path: '/reports/field-service',
                    element: <FieldServiceReportsPage />,
                  },
                ],
              },

              // language group admin route
              {
                element: <LanguageGroupRoute />,
                children: [
                  {
                    path: '/group-settings',
                    element: <CongregationSettings />,
                  },
                ],
              },

              // congregation admin routes (admin - secretary - coordinator)
              {
                element: <AdminRoute />,
                children: [
                  {
                    element: <NotGroupRoute />,
                    children: [
                      {
                        path: '/reports/branch-office',
                        element: <BranchOfficeReports />,
                      },
                    ],
                  },

                  // only if connected
                  {
                    element: <ConnectedRoute />,
                    children: [
                      { path: '/manage-access', element: <UsersAll /> },
                      {
                        path: '/manage-access/:id',
                        element: <UserDetails />,
                      },
                    ],
                  },
                ],
              },

              // fallback to dashboard for all invalid routes
              { path: '*', element: <Dashboard /> },
            ],
          },
        ],
      },
    ]);
  }, [updatePwa]);

  useEffect(() => {
    const locale = determineAppLocale(appLang);

    setAdapterLocale({
      ...locale,
      options: {
        ...locale.options,
        weekStartsOn: firstDayOfTheWeekOption,
      },
    });
  }, [appLang, firstDayOfTheWeekOption, setAdapterLocale]);

  useEffect(() => {
    const direction = LANGUAGE_LIST.find(
      (record) => record.threeLettersCode === appLang
    )?.direction;

    setCache(direction === 'rtl' ? rtlCache : ltrCache);
  }, [appLang]);

  useEffect(() => {
    if (isAdmin) {
      triggerAutoBackup(isAdmin);
    }
  }, [isAdmin]);

  useEffect(() => {
    // Clear chunk reload occurred flag since app loaded successfully
    window.sessionStorage.removeItem('chunk-reload-occurred');
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <LocalizationProvider
        dateAdapter={AdapterDateFns}
        adapterLocale={adapterLocale}
      >
        <CssBaseline />
        <CacheProvider value={cache}>
          <QueryClientProvider client={queryClient}>
            <FeatureFlagsWrapper>
              <RouterProvider router={router} />
            </FeatureFlagsWrapper>
          </QueryClientProvider>
        </CacheProvider>
      </LocalizationProvider>
    </ThemeProvider>
  );
};
export default App;
