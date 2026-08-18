export type GoogleCalendarConnection = {
  refreshToken: string;
  calendarId: string;
  connectedAt: string;
};

export type GoogleOAuthTokens = {
  accessToken: string;
  refreshToken?: string;
};
