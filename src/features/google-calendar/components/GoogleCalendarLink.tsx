import Link from "next/link";

type GoogleCalendarLinkProps = { connected: boolean };

export function GoogleCalendarLink({ connected }: GoogleCalendarLinkProps) {
  return (
    <Link
      href="/admin/integracoes/google-calendar"
      className={
        "inline-flex min-h-11 items-center justify-center rounded-lg border border-(--color-border) " +
        "bg-(--color-surface-2) px-4 text-sm font-medium text-(--color-foreground) " +
        "hover:border-(--color-border-strong) focus-visible:outline-2 focus-visible:outline-offset-2 " +
        "focus-visible:outline-(--color-focus-ring)"
      }
    >
      {connected ? "Google Calendar vinculado" : "Vincular ao Google Calendar"}
    </Link>
  );
}
