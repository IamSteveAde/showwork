import { PrismaClient } from "@prisma/client";
import { verifyTransaction } from "@/lib/paystack";
import { classifyPaymentRevenue } from "@/lib/paymentRevenue";

function createDatabase() {
  const client = new PrismaClient();
  client.$use(async (params, next) => {
    if (params.model === "PaymentRecord" && params.action === "create") {
      let verification = null;
      if (params.args.data.paystackReference) {
        try {
          verification = await verifyTransaction(
            params.args.data.paystackReference,
          );
        } catch {
          // Preserve the charge for reconciliation without inflating revenue.
        }
      }
      Object.assign(
        params.args.data,
        classifyPaymentRevenue(params.args.data, verification),
      );
    }
    return next(params);
  });
  return client;
}

const globalForPrisma = globalThis as unknown as {
  revenuePrisma: ReturnType<typeof createDatabase>;
};
export const db = globalForPrisma.revenuePrisma ?? createDatabase();
if (process.env.NODE_ENV !== "production") globalForPrisma.revenuePrisma = db;
