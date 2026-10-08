import "./admin.css";
import type { Metadata } from "next";
import AdminShell from "@/components/admin/AdminShell";
import { getCurrentCreator } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { redirect, notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "Admin | Showwork",
  description: "Showwork administration.",
  robots: { index: false, follow: false, noarchive: true },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const creator = await getCurrentCreator();
  if (!creator) redirect("/login");
  if (!isAdminEmail(creator.email)) notFound();
  return <AdminShell>{children}</AdminShell>;
}
