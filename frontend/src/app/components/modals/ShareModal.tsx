"use client";

import { useState } from "react";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import {
  TwitterIcon,
  LinkedinIcon,
  WhatsappIcon,
  TelegramIcon,
  RedditIcon,
  FacebookMessengerIcon,
} from "next-share";
import { toast } from "react-toastify";
import Link from "next/link";
import { Copy, X, Check } from "lucide-react";
import { ShareModalProps } from "@/app/types";

export default function ShareModal({
  isOpen,
  setIsOpen,
  shareUrl,
}: ShareModalProps) {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
      toast.success("Link Copied!");
    } catch (err) {
      toast.error("Failed to copy");
    }
  };

  const socialMediaLinks = [
    {
      name: "WhatsApp",
      icon: <WhatsappIcon size={46} round={true} />,
      url: `https://web.whatsapp.com/send?text=${encodeURIComponent("Check this out! " + shareUrl)}`,
    },
    {
      name: "Telegram",
      icon: <TelegramIcon size={46} round={true} />,
      url: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent("Check this out!")}`,
    },
    {
      name: "Messenger",
      icon: <FacebookMessengerIcon size={46} round={true} />,
      url: `https://www.messenger.com/t/?link=${encodeURIComponent(shareUrl)}`,
    },
    {
      name: "X (Twitter)",
      icon: <TwitterIcon size={46} round={true} />,
      url: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent("Check this out!")}`,
    },
    {
      name: "LinkedIn",
      icon: <LinkedinIcon size={46} round={true} />,
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
    },
    {
      name: "Reddit",
      icon: <RedditIcon size={46} round={true} />,
      url: `https://www.reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent("Check this out!")}`,
    },
  ];

  return (
    <Dialog
      open={isOpen}
      as="div"
      className="relative z-50"
      onClose={() => setIsOpen(false)}
    >
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-gray-900/40 dark:bg-black/60 backdrop-blur-sm transition-opacity duration-300 ease-out data-[closed]:opacity-0"
      />

      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-end justify-center p-2 text-center sm:items-center sm:p-0">
          <DialogPanel
            transition
            className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-4 text-left align-middle shadow-2xl transition-all duration-300 ease-out data-[closed]:translate-y-8 sm:data-[closed]:translate-y-0 data-[closed]:scale-95 data-[closed]:opacity-0 flex flex-col gap-6"
          >
            <div className="flex justify-between items-center">
              <DialogTitle
                as="h3"
                className="font-bold text-xl text-gray-900 dark:text-gray-100"
              >
                Share Link
              </DialogTitle>
              <button
                onClick={() => setIsOpen(false)}
                type="button"
                className="text-gray-800 hover:text-gray-700 dark:text-gray-300 rounded-full transition-all"
              >
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 justify-between ">
                <div className="overflow-hidden px-3 flex-1 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-gray-700 rounded-xl p-2.5 transition-colors">
                  <p className="text-gray-700 dark:text-gray-300  font-medium truncate select-all">
                    {shareUrl}
                  </p>
                </div>
                <button
                  data-testid="copy-link-button"
                  onClick={handleCopy}
                  className={`p-3 flex items-center justify-center border border-gray-200 dark:border-white/10 flex-shrink-0 rounded-xl font-medium transition-all duration-200 active:scale-95 ${
                    isCopied
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
                  }`}
                >
                  {isCopied ? (
                    <Check size={20} strokeWidth={2.5} />
                  ) : (
                    <Copy size={20} />
                  )}
                </button>
              </div>
            </div>

            <div className="relative">
              <div
                className="absolute inset-0 flex items-center"
                aria-hidden="true"
              >
                <div className="w-full border-t border-gray-200 dark:border-gray-800" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white dark:bg-gray-900 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Or share via
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-y-6 gap-x-4">
              {socialMediaLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center flex-col gap-2 group outline-none"
                >
                  <div className="transition-transform duration-200 group-hover:scale-110 group-active:scale-95 shadow-sm rounded-full">
                    {link.icon}
                  </div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors">
                    {link.name}
                  </p>
                </Link>
              ))}
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}
