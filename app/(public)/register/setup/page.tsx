import { redirect } from "next/navigation";

export default function RegisterSetupPage() {
  redirect("/register/contact?reason=sales_assisted_only");
}
