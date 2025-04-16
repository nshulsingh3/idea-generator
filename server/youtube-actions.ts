"use server";

import { auth } from "@clerk/nextjs/server";
import { google, youtube_v3 } from "googleapis";
import {
  Video,
  VideoComment,
  VideoComments,
  Videos,
  YoutubeChannels,
} from "./db/schema";
import { and, eq } from "drizzle-orm";
import { db } from "./db/drizzle";

const youtube = google.youtube({
  version: "v3",
  auth: process.env.YOUTUBE_API_KEY,
});

async function getChannelId(channelName: string): Promise<string | null> {
  try {
    const response = await youtube.search.list({
      part: ["snippet"],
      type: ["channel"],
      q: channelName,
      maxResults: 1,
    });

    return response.data.items?.[0]?.id?.channelId || null;
  } catch (err) {
    console.log("Error fetching channel id: ", err);
    return null;
  }
}

async function fetchAllVideoForChannel(channelId: string): Promise<string[]> {
  let allVideoIds: string[] = [];
  let nextPageToken: string | undefined = undefined;

  do {
    try {
      const response = await youtube.search.list({
        part: ["id"],
        channelId: channelId,
        maxResults: 50,
        pageToken: nextPageToken,
        type: ["video"],
        order: "date",
      });

      const data: youtube_v3.Schema$SearchListResponse = response.data;
      const videoIds =
        (data.items
          ?.map((item) => item.id?.videoId)
          .filter(Boolean) as string[]) || [];
      allVideoIds = allVideoIds.concat(videoIds);
      nextPageToken =
        data.nextPageToken !== null ? data.nextPageToken : undefined;
    } catch (err) {
      console.log("Error fetching videos for channel: ", err);
      break;
    }
  } while (nextPageToken);

  return allVideoIds;
}

interface YouTubeVideo {
  id: { videoId: string };
  snippet: youtube_v3.Schema$VideoSnippet;
  statistics: youtube_v3.Schema$VideoStatistics;
}

interface YoutubeComment {
  id: string;
  snippet: youtube_v3.Schema$CommentSnippet;
}

async function fetchVideoDetails(videoIds: string[]): Promise<YouTubeVideo[]> {
  try {
    const response = await youtube.videos.list({
      part: ["snippet", "statistics"],
      id: videoIds,
    });

    return (
      response.data.items?.map((item) => ({
        id: { videoId: item.id! },
        snippet: item.snippet!,
        statistics: item.statistics!,
      })) || []
    );
  } catch (err) {
    console.log("Error fetching video details: ", err);
    return [];
  }
}

function getBestThumbnail(
  thumbnails: youtube_v3.Schema$ThumbnailDetails
): string {
  return (
    thumbnails.maxres?.url ||
    thumbnails.standard?.url ||
    thumbnails.high?.url ||
    thumbnails.medium?.url ||
    thumbnails.default?.url ||
    ""
  );
}

async function fetchVideoComments(videoId: string): Promise<YoutubeComment[]> {
  let allComments: YoutubeComment[] = [];
  let nextPageToken: string | undefined = undefined;

  do {
    try {
      const response = await youtube.commentThreads.list({
        part: ["snippet"],
        videoId,
        maxResults: 100,
        pageToken: nextPageToken,
      });

      const data: youtube_v3.Schema$CommentThreadListResponse = response.data;
      const comments =
        data.items?.map((item) => ({
          id: item.id!,
          snippet: item.snippet!.topLevelComment!.snippet!,
        })) || [];
      allComments = allComments.concat(comments);

      if (allComments.length >= 100) {
        allComments = allComments.slice(0, 100);
        break;
      }

      nextPageToken =
        data.nextPageToken !== null ? data.nextPageToken : undefined;
    } catch (err) {
      console.log("Error fetching comments for video: ", err);
      break;
    }
  } while (nextPageToken);
  return allComments;
}

export async function scrapeVideos() {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("User not authenticated");
  }

  const channels = await db
    .select()
    .from(YoutubeChannels)
    .where(eq(YoutubeChannels.userId, userId));

  if (channels.length == 0) {
    throw new Error("No channels found for this user");
  }

  const newVideos: Video[] = [];
  const newComments: VideoComment[] = [];

  for (const channel of channels) {
    if (!channel.channelId) {
      const channelId = await getChannelId(channel.name);

      if (!channelId) {
        console.log(`Channel ${channel.name} not found`);
        continue;
      }

      await db
        .update(YoutubeChannels)
        .set({ channelId, updatedAt: new Date() })
        .where(
          and(
            eq(YoutubeChannels.id, channel.id),
            eq(YoutubeChannels.userId, userId)
          )
        );

      channel.channelId = channelId;
    }

    const videoIds = await fetchAllVideoForChannel(channel.channelId);
    const videoDetails = await fetchVideoDetails(videoIds);

    for (const video of videoDetails) {
      const existingVideo = await db
        .select()
        .from(Videos)
        .where(
          and(eq(Videos.videoId, video.id.videoId), eq(Videos.userId, userId))
        );

      let videoId: string;

      if (existingVideo.length == 0) {
        const newVideo = {
          videoId: video.id.videoId,
          title: video.snippet.title!,
          description: video.snippet.description!,
          thumbnailUrl: getBestThumbnail(video.snippet.thumbnails!),
          channelTitle: video.snippet.channelTitle!,
          channelId: video.snippet.channelId!,
          publishedAt: new Date(video.snippet.publishedAt!),
          viewCount: parseInt(video.statistics.viewCount || "0", 10),
          likeCount: parseInt(video.statistics.likeCount || "0", 10),
          dislikeCount: parseInt(video.statistics.dislikeCount || "0", 10),
          commentCount: parseInt(video.statistics.commentCount || "0", 10),
          userId,
        };

        const [insertedVideo] = await db
          .insert(Videos)
          .values(newVideo)
          .returning();

        newVideos.push(insertedVideo);
        videoId = insertedVideo.id;
      } else {
        videoId = existingVideo[0].id;
      }

      const comments = await fetchVideoComments(video.id.videoId);
      for (const comment of comments) {
        const newComment = {
          videoId,
          userId,
          commentText: comment.snippet.textDisplay!,
          likeCount: parseInt(`${comment.snippet.likeCount || "0"}`, 10),
          dislikeCount: 0,
          publishedAt: new Date(comment.snippet.publishedAt!),
        };

        const [insertedComment] = await db
          .insert(VideoComments)
          .values(newComment)
          .returning();
        newComments.push(insertedComment);
      }
    }
  }

  return newVideos;
}
