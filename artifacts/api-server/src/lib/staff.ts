import { db, staffTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { JwtPayload } from "./jwt";

export async function findStaffByUserId(userId: number) {
  const [staffMember] = await db
    .select()
    .from(staffTable)
    .where(eq(staffTable.userId, userId));

  return staffMember ?? null;
}

export async function resolveStaffActor(
  user: JwtPayload,
  preferredStaffId?: number | null,
) {
  const linkedStaff = await findStaffByUserId(user.userId);

  if (user.role === "admin" || user.role === "manager") {
    if (preferredStaffId) {
      const [selectedStaff] = await db
        .select()
        .from(staffTable)
        .where(eq(staffTable.id, preferredStaffId));

      return selectedStaff ?? linkedStaff;
    }

    return linkedStaff;
  }

  return linkedStaff;
}
