import { redirect } from "next/navigation";

/** Bare /register has no index — workspace activation requires the full invite token URL. */
export default function RegisterIndexPage() {
  redirect("/register/contact?reason=invite_token_required");
}
