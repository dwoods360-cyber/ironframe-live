import { redirect } from "next/navigation";

import { SALES_CONTACT_PATH } from "@/config/registration";

/**
 * Path B lock: no public “evaluation sandbox / claim enclave” entry.
 * Guided product tour lives at `/product-demo`; sales motion is contact-only.
 */
export default function DemoRegisterPage() {
  redirect(`${SALES_CONTACT_PATH}?reason=sales_assisted_only`);
}
