"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { getBookContent } from "@/app/services/bookService";
import ShareModal from "../../../components/modals/ShareModal";
import Slider from "../../../components/layout/Slider";
import { useUserStore } from "@/app/stores/useUserStores";
import { useBookmarkInsight } from "@/app/hooks/mutations/useBookmark";
import { InsightCard } from "@/app/components/cards/InsightsCard";
import { Categories, StepData } from "@/app/types";
import Header from "@/app/components/layout/Header";
import { Loader2, SearchX } from "lucide-react";

const EMPTY_STEPS: StepData[] = [];
const EMPTY_CATEGORIES: Categories[] = [];

export default function Page() {
  const params = useParams<{ title?: string }>();
  const [selectedCategory, setSelectedCategory] = useState<Categories[]>([]);
  const [filteredInsights, setFilteredInsights] = useState<StepData[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<Categories[]>(
    [],
  );
  const [mode, setMode] = useState("List");
  const [shareModal, setShareModal] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const user = useUserStore((state: any) => state.user);
  const { mutate: bookmarkInsight } = useBookmarkInsight();

  const { data: responseData, isLoading } = useQuery({
    queryKey: [
      "book-content",
      params?.title,
      selectedCategory.map((cat) => cat.name),
    ],
    queryFn: () =>
      getBookContent(
        params!.title!,
        selectedCategory.length ? selectedCategory.map((cat) => cat.name) : [],
      ),
    enabled: !!params?.title,
  });

  const categories =
    responseData?.data?.keys ?? responseData?.keys ?? EMPTY_CATEGORIES;
  const steps =
    responseData?.data?.values ?? responseData?.values ?? EMPTY_STEPS;

  useEffect(() => {
    if (steps.length && categories.length) {
      setFilteredInsights(steps);
      setFilteredCategories(categories);
    }
  }, [steps, categories]);

  const toggleCategory = (category: Categories) => {
    setSelectedCategory((prev) =>
      prev.some((c) => c.name === category.name)
        ? prev.filter((c) => c.name !== category.name)
        : [...prev, category],
    );
  };

  if (!params?.title || isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center transition-colors duration-300">
        <Loader2 size={40} className="animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="flex flex-col relative flex-grow bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="sticky top-0 z-30"
      >
        <Header
          title="Insights"
          items={steps}
          filteredItems={filteredInsights}
          setFilteredItems={setFilteredInsights}
          searchKey="step"
          categories={categories}
          filteredCategories={filteredCategories}
          setFilteredCategories={setFilteredCategories}
          selectedCategory={selectedCategory}
          toggleCategory={toggleCategory}
          getItemId={(step: StepData) => step.step_id}
          getItemLabel={(step: StepData) => step.step}
          setMode={setMode}
          mode={mode}
        />
      </motion.div>

      <div
        className={`relative w-full flex-grow transition-all duration-300 pb-4`}
      >
        <AnimatePresence mode="wait">
          {mode === "Swipe" ? (
            <motion.div
              key="swipe-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="w-full"
            >
              {steps.length ? (
                <Slider
                  title={params?.title!}
                  steps={steps}
                  onShare={(title) => {
                    setShareUrl(title);
                    setShareModal(true);
                  }}
                />
              ) : null}
            </motion.div>
          ) : (
            <motion.div
              key="list-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="w-full"
            >
              <AnimatePresence mode="wait">
                {filteredInsights.length > 0 ? (
                  <motion.div
                    key="grid-view"
                    layout
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                  >
                    <AnimatePresence>
                      {filteredInsights.map((step) => (
                        <motion.div
                          key={step.step_id}
                          layout="position"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{
                            opacity: 0,
                            y: -20,
                            transition: { duration: 0.2 },
                          }}
                          transition={{ duration: 0.25, ease: "easeOut" }}
                          className="break-inside-avoid w-full h-full"
                        >
                          <InsightCard
                            step={step}
                            bookTitle={params.title!}
                            isBookmarked={user?.favourite_insights?.includes(
                              step.step_id,
                            )}
                            onBookmark={bookmarkInsight}
                            onShare={(title) => {
                              setShareUrl(title);
                              setShareModal(true);
                            }}
                          />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty-state" // 🌟 FIX: Added key here so React knows it's a new element
                    initial={{ opacity: 0, y: 20 }} // 🌟 Swapped scale for smooth y-axis slide
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20, transition: { duration: 0.2 } }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="w-full h-[70vh] flex flex-col items-center justify-center text-center px-4"
                  >
                    <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-full mb-6 border border-gray-100 dark:border-gray-800 shadow-sm">
                      <SearchX
                        size={48}
                        strokeWidth={1.5}
                        className="text-gray-400 dark:text-gray-500"
                      />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">
                      No matches found
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 max-w-sm leading-relaxed">
                      None of your saved insights match the current filters. Try
                      clearing your search or categories.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <ShareModal
        isOpen={shareModal}
        setIsOpen={setShareModal}
        shareUrl={shareUrl}
      />
    </div>
  );
}
