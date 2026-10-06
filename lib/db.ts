import { Prisma, PrismaClient } from "@prisma/client";
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

// A generated schema can change while Next's development process retains globals.
// Reuse the connection pool only when it was built for this schema.
const schemaSignature = JSON.stringify(Prisma.dmmf.datamodel.models.map(model => ({
  name: model.name,
  fields: model.fields.map(field => ({ name: field.name, type: field.type, kind: field.kind, isList: field.isList, isRequired: field.isRequired })),
})));
const globalForPrisma = globalThis as unknown as {
  revenuePrisma?: ReturnType<typeof createDatabase>;
  revenuePrismaSchema?: string;
};
const cached = globalForPrisma.revenuePrisma;
const cacheMatches = cached && globalForPrisma.revenuePrismaSchema === schemaSignature
  && !!cached.billingOfferSubscription && !!cached.billingOfferRedemption && !!cached.billingOffer && !!cached.billingBenefitNotification;
export const db = cacheMatches ? cached : createDatabase();
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.revenuePrisma = db;
  globalForPrisma.revenuePrismaSchema = schemaSignature;
  if (cached && !cacheMatches) void cached.$disconnect().catch(() => {});
}
