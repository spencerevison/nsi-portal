import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <SignIn
      appearance={{
        options: {
          logoImageUrl: "/logo-nsi.svg",
          logoPlacement: "inside", // or 'outside'
        },
      }}
    />
  );
}
