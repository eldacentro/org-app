import { TerritoryRequest, TerritoryNotice } from './territories';
import { APIUserRequest } from './api';

export type NotificationIconType =
  | 'standard'
  | 'talk'
  | 'reports'
  | 'join-requests'
  | 'territory-requests'
  | 'territory-assigned';

export type NotificationDbRecordType = {
  id: number;
  updatedAt: string;
  title: string;
  desc: string;
  read?: boolean;
};

export type CongregationSpeakerRequestType = {
  cong_name: string;
  country_code: string;
  request_id: string;
};

export type SpeakerNotificationType = {
  id: 'speakers-request';
  title: string;
  description: string;
  date: string;
  icon: NotificationIconType;
  congs: CongregationSpeakerRequestType[];
  enableRead: boolean;
  read?: boolean;
};

export type UnverifiedReportEntry = { person_uid: string; report_date: string };

export type UnverifiedReportNotificationType = {
  id: 'reports-unverified';
  title: string;
  description: string;
  date: string;
  icon: NotificationIconType;
  count: number;
  reports: UnverifiedReportEntry[];
  enableRead: boolean;
  read?: boolean;
};

export type JoinRequestNotificationType = {
  id: 'join-requests';
  title: string;
  description: string;
  date: string;
  icon: NotificationIconType;
  requests: APIUserRequest[];
  enableRead: boolean;
  read?: boolean;
};


export type TerritoryRequestNotificationType = {
  id: 'territory-requests';
  title: string;
  description: string;
  date: string;
  icon: NotificationIconType;
  requests: TerritoryRequest[];
  enableRead: boolean;
  read?: boolean;
};

export type TerritoryAssignedNotificationType = {
  id: string;
  title: string;
  description: string;
  date: string;
  icon: NotificationIconType;
  notice: TerritoryNotice;
  enableRead: boolean;
  read?: boolean;
};

export type StandardNotificationType = {
  id: string;
  title: string;
  description: string;
  date: string;
  icon: NotificationIconType;
  enableRead: boolean;
  read: boolean;
};

export type NotificationRecordType =
  | SpeakerNotificationType
  | UnverifiedReportNotificationType
  | JoinRequestNotificationType
  | StandardNotificationType
  | TerritoryRequestNotificationType
  | TerritoryAssignedNotificationType;
