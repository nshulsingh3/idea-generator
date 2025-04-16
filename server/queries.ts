"use server";

import { auth } from "@clerk/nextjs/server";
import {
  Video,
  Videos,
  YoutubeChannels,
  YoutubeChannelType,
} from "./db/schema";
import { eq } from "drizzle-orm";
import { db } from "./db/drizzle";

export const getVideosForUser = async (): Promise<Video[]> => {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  return db.select().from(Videos).where(eq(Videos.userId, userId));
};

export const getChannelsForUser = async (): Promise<YoutubeChannelType[]> => {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  return db
    .select()
    .from(YoutubeChannels)
    .where(eq(YoutubeChannels.userId, userId));
};
