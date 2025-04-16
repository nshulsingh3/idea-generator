"use client";

import { YoutubeChannelType } from "@/server/db/schema";
import { addChannelForUser, removeChannelForUser } from "@/server/mutations";
import { getChannelsForUser } from "@/server/queries";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTrigger } from "./ui/dialog";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Plus, X } from "lucide-react";
import { ScrollArea } from "@radix-ui/react-scroll-area";

export default function SettingsModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [channels, setChannels] = useState<YoutubeChannelType[]>([]);
  const [newChannel, setNewChannel] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // get channels
      fetchChannels();
    }
  }, [isOpen]);

  const fetchChannels = async () => {
    setIsLoading(true);
    try {
      const fetchChannels = await getChannelsForUser();
      setChannels(fetchChannels);
    } catch (error) {
      console.error("Error fetching channels", error);
    } finally {
      setIsLoading(false);
    }
  };

  const addChannel = async () => {
    if (newChannel) {
      setIsLoading(true);
      try {
        const addedChannel = await addChannelForUser(newChannel);
        setChannels([...channels, addedChannel]);
        setNewChannel("");
      } catch (error) {
        console.error("Error adding channel", error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const removeChannel = async (id: string) => {
    setIsLoading(true);
    try {
      // remove channel'
      await removeChannelForUser(id);
      setChannels(channels.filter((channel) => channel.id !== id));
    } catch (error) {
      console.error("Error removing channel", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <p className="cursor-pointer text-primary hover:text-red-500 transition-all">
          Settings{" "}
        </p>
      </DialogTrigger>
      <DialogContent className="max-w-[425px] rounded-xl   p-6 space-y-2 ">
        <div className="py-4 space-y-6 ">
          <div className="space-y-2">
            <h3 className="font-semibold  text-red-500 text-lg">
              Add New Channel
            </h3>
            <div className="flex space-x-2">
              <Input
                placeholder="Channel Name"
                value={newChannel}
                onChange={(e) => setNewChannel(e.target.value)}
                className="focus:visible:ring-0 text-md px-4 py-2 h-10"
              />
              <Button
                onClick={addChannel}
                disabled={isLoading}
                className="bg-red-500 hover:bg-red-600 text-white transition-all h-10 rounded-lg font-semibold "
              >
                <Plus className="h-4 w-4" strokeWidth={3} />
                <p>Add</p>
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-red-500 text-lg">
              Saved Channels
            </h3>
            {isLoading ? (
              <p className="h-[150px] flex items-center justify-center">
                Loading...
              </p>
            ) : (
              <ScrollArea className="h-[150px]">
                <div className="space-y-2">
                  {channels.map((channel) => (
                    <div
                      key={channel.id}
                      className="flex justify-between items-center border rounded-lg shadow-sm px-4 py-2 bg-gray-50  mb-2"
                    >
                      <span>{channel.name}</span>
                      <Button
                        size="sm"
                        onClick={() => removeChannel(channel.id)}
                        disabled={isLoading}
                        variant={"ghost"}
                      >
                        <X className="h-4 w-4 text-red-500 hover:bg-red-50 rounded-md" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
