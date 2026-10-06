import { redirect } from "next/navigation";
import { getCurrentCreator } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import BillingOfferManager from "@/components/admin/BillingOfferManager";
export default async function BillingOffersPage() {
  const admin = await getCurrentCreator();
  if (!admin || !isAdminEmail(admin.email)) redirect("/dashboard");
  return <BillingOfferManager />;
}
