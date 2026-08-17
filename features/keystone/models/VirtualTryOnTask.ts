import { list } from "@keystone-6/core";
import { denyAll } from "@keystone-6/core/access";
import { text } from "@keystone-6/core/fields";
import { trackingFields } from "./trackingFields";

/**
 * Server-only ledger for YouCam tasks. The public GraphQL API cannot read or
 * mutate these records; route handlers use Keystone's sudo context instead.
 * Photos and generated images are deliberately never persisted here.
 */
export const VirtualTryOnTask = list({
  access: {
    operation: {
      query: denyAll,
      create: denyAll,
      update: denyAll,
      delete: denyAll,
    },
  },
  fields: {
    taskId: text({
      isIndexed: "unique",
      validation: { isRequired: true },
    }),
    sessionHash: text({
      isIndexed: true,
      validation: { isRequired: true },
    }),
    productId: text({ validation: { isRequired: true } }),
    status: text({
      defaultValue: "running",
      validation: { isRequired: true },
    }),
    ...trackingFields,
  },
  ui: {
    labelField: "taskId",
  },
});
