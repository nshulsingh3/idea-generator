"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "./db/drizzle";
import { YoutubeChannels, YoutubeChannelType } from "./db/schema";
import { and, eq } from "drizzle-orm";

export const addChannelForUser = async (
  name: string
): Promise<YoutubeChannelType> => {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  const [newChannel] = await db
    .insert(YoutubeChannels)
    .values({
      name,
      userId,
    })
    .returning();

  return newChannel;
};

export const removeChannelForUser = async (id: string): Promise<void> => {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  await db
    .delete(YoutubeChannels)
    .where(and(eq(YoutubeChannels.userId, userId), eq(YoutubeChannels.id, id)));
};
