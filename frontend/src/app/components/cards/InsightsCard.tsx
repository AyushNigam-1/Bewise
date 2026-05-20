"use client";
import Link from "next/link";
import { Bookmark, Share2 } from "lucide-react";

interface InsightCardProps {
  step: {
    step: string;
    category: string;
    icon: string;
    step_id: number;
    description: string;
  };
  bookTitle: string;
  isBookmarked?: boolean;
  onBookmark?: (id: number) => void;
  onShare?: (title: string) => void;
}

export const InsightCard = ({
  step,
  bookTitle,
  isBookmarked = false,
  onBookmark,
  onShare,
}: InsightCardProps) => {
  return (
    <div
      data-testid="insight-card"
      className="rounded-2xl h-full flex flex-col gap-4 p-4 bg-gray-100 dark:bg-gray-800 transition-colors border border-transparent dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-500"
    >
      <Link
        href={`/insight/${bookTitle}/${step?.category}/${step.step_id}`}
        className="flex flex-col gap-2 flex-grow"
      >
        <div className="flex justify-between items-center">
          <span className="text-gray-600 dark:text-gray-400 font-medium text-sm flex gap-1 items-center w-min text-nowrap flex-nowrap rounded-lg">
            <span>{step?.icon}</span>
            <span>{step?.category}</span>
          </span>
        </div>

        <h4 className="text-gray-800 dark:text-gray-100 font-semibold text-xl md:text-2xl leading-tight line-clamp-1">
          {step.step}
        </h4>
        <h6 className="text-gray-600 dark:text-gray-300 mt-auto leading-relaxed line-clamp-2 text-sm">
          {step.description}
        </h6>
      </Link>

      <div className="flex gap-4 items-center justify-between w-full mt-auto dark:border-gray-700">
        <button
          onClick={() => {
            console.log(step.step_id);
            onBookmark?.(step.step_id);
          }}
          type="button"
          className="text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none rounded-full p-2.5 w-min font-semibold transition-colors shadow-sm"
        >
          <Bookmark
            size={18}
            className={isBookmarked ? "fill-gray-600 dark:fill-gray-300" : ""}
          />
        </button>

        <button
          onClick={() =>
            onShare?.(
              `${window.location.origin}/insight/${step?.step}/${step?.category}/${step?.step_id}`,
            )
          }
          type="button"
          className="text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none rounded-full p-2.5 w-min font-semibold cursor-pointer transition-colors shadow-sm"
        >
          <Share2 size={18} />
        </button>
      </div>
    </div>
  );
};
