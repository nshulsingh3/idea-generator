"use client";

import { Video } from "@/server/db/schema";
import { Loader2, TvMinimal } from "lucide-react";
import { useEffect, useState } from "react";
import { Toaster, toast } from "sonner";
import { Button } from "./ui/button";
import Link from "next/link";
import Image from "next/image";
import { formatCount } from "@/lib/utils";
import { scrapeVideos } from "@/server/youtube-actions";

interface VideoListProps {
  initialVideos: Video[];
}

export default function VideoList({ initialVideos }: VideoListProps) {
  const [isScraping, setIsScraping] = useState(false);
  const [videos, setVideos] = useState(initialVideos);

  const handleScrape = async () => {
    setIsScraping(true);
    try {
      const newVideos = await scrapeVideos();
      setVideos((prevVideos) => [...newVideos, ...prevVideos]);
      toast.success("Scrape successful", {
        description: `Scraped${newVideos.length} new videos`,
      });
    } catch (error) {
      console.error("Error scraping videos:", error);
      let errorMessage = "Error scraping videos";

      if (error instanceof Error) {
        errorMessage =
          "Please add Youtube channels first by clicking settings in the top right";
      } else {
        if (error instanceof Error) {
          errorMessage = error.message;
        } else {
          errorMessage = String(error);
        }
      }

      console.log("errorMessage", errorMessage);
      toast.error("Scrape Failed", {
        description: errorMessage,
      });
    } finally {
      setIsScraping(false);
    }
  };

  useEffect(() => {
    setVideos(initialVideos);
  }, [initialVideos]);

  if (videos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center [y-16 px-4 space-y-5">
        <div className="bg-red-50 rounded-xl p-3">
          <TvMinimal className="h-11 w-11 text-red-500" strokeWidth={1.5} />
        </div>
        <h3 className="text-2xl font-semibold text-gray-900">
          No videos found
        </h3>
        <p className="text-gray-600">
          Please add Youtube channels and then scrape for videos. Video comments
          will be analyzed for content ideas.
        </p>
        <Button
          onClick={handleScrape}
          disabled={isScraping}
          className="bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all text-md font-semibold px-6 py-5"
        >
          {isScraping ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Scraping...
            </>
          ) : (
            "Scrape Videos"
          )}
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-3xl font-bold">Videos</h3>
        <Button
          onClick={handleScrape}
          disabled={isScraping}
          className="bg-red-500 text-white hover:bg-red-600 transition-all text-md font-semibold px-6 py-3"
        >
          {isScraping ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Scraping...
            </>
          ) : (
            "Scrape Videos"
          )}
        </Button>
      </div>
      <div className="grid grid-cols-3 gap-6">
        {videos.map((video: Video) => (
          <Link
            key={video.id}
            href={`/videos/${video.id}`}
            className="group-block"
          >
            <div className="rounded-2xl overflow-hidden border bg-white shadow-sm p-4 space-y-3 hover:scale-[1.05] transition-all duration-300">
              <div className="aspect-video relative">
                {video.thumbnailUrl ? (
                  <Image
                    src={video.thumbnailUrl}
                    alt={video.title}
                    layout="fill"
                    objectFit="cover"
                    className="rounded-lg"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 rounded-lg flex items-center justify-center">
                    <span className="text-gray-400">No Thumbnail</span>
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <h2 className="font-semmibold line-clamp-2 group-hover:text-primary">
                  {video.title}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {video.channelTitle}
                </p>
                <div className="flex items-center text-xs text-muted-foreground">
                  <span>
                    {video.viewCount ? formatCount(video.viewCount) : "0"} views
                  </span>
                  {/* <span className="mx-1">•</span> */}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
      <Toaster position="top-right" />
    </>
  );
}
