export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-muted p-6">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-semibold text-foreground">
          North Secretary Island
        </h1>
        <p className="text-sm text-muted-foreground">Community Portal</p>
      </div>
      {children}
    </main>
  );
}
