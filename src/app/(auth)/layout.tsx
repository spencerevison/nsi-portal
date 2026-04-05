export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 p-6">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-semibold text-neutral-900">
          North Secretary Island
        </h1>
        <p className="text-sm text-neutral-600">Community Portal</p>
      </div>
      {children}
    </main>
  );
}
