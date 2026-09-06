import { Logo } from "@/components/brand/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-muted/40 p-4">
      <div className="flex w-full max-w-sm flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-2">
          <Logo iconClassName="size-6" className="gap-2.5" />
          <p className="text-center text-sm text-muted-foreground">
            Turn client conversations into project-ready scope.
          </p>
        </div>
        <div className="w-full">{children}</div>
      </div>
    </div>
  );
}
