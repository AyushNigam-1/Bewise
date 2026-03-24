"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { Bookmark, LogOut, User, UserPlus, Sun, Moon } from "lucide-react";
import { useUserStore } from "@/app/stores/useUserStores";
import { signOut } from "@/app/lib/auth-client";
import posthog from "posthog-js";
import { useRouter } from "next/navigation";


const Navbar = () => {
  const nav = useRouter()
  const user = useUserStore((state) => state.user);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const isDark =
      localStorage.theme === "dark" ||
      (!("theme" in localStorage) &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);

    setIsDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    if (!isDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.theme = "dark";
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.theme = "light";
    }
  };

  return (
    <nav className="border-b border-gray-200 dark:border-gray-800 pb-3 z-50 container mx-auto transition-colors duration-300">
      <div className="flex flex-wrap items-center justify-between">
        <h4 className="justify-between flex lg:text-3xl font-bold text-gray-900 dark:text-gray-100 text-3xl text-center md:text-left gap-2 italic transition-colors">
          <img src="/logo.png" className="w-28 md:w-36 invert dark:invert-0" />
        </h4>

        <div className="flex items-center gap-2 md:gap-3">
          <Menu as="div" className="relative inline-block text-left">
            <MenuButton className="inline-flex cursor-pointer items-center gap-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 p-2 md:p-3 text-sm/6 font-semibold rounded-full transition-colors shadow-md">
              <User size={20} />
            </MenuButton>

            <MenuItems
              transition
              className="absolute right-0 mt-2 w-48 md:w-56 origin-top-right rounded-xl bg-white dark:bg-gray-900 p-2 text-gray-900 dark:text-gray-100 shadow-xl border border-gray-100 dark:border-gray-800 focus:outline-none z-50 transition-all duration-200 ease-out data-[closed]:scale-95 data-[closed]:opacity-0"
            >
              <div className="flex flex-col gap-1">

                <MenuItem>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      toggleTheme();
                    }}
                    className="group cursor-pointer flex items-center justify-between p-2 rounded-lg w-full font-semibold text-left transition-colors data-[focus]:bg-gray-100 dark:data-[focus]:bg-gray-800"
                  >
                    <div className="flex items-center gap-2">
                      <div className="relative w-5 h-5 flex items-center justify-center">
                        <Sun
                          size={20}
                          className={`absolute transition-all duration-500 ease-in-out text-gray-500 dark:text-gray-400 ${isDarkMode
                            ? "opacity-0 rotate-90 scale-50"
                            : "opacity-100 rotate-0 scale-100"
                            }`}
                        />
                        <Moon
                          size={20}
                          className={`absolute transition-all duration-500 ease-in-out text-gray-500 dark:text-gray-400 ${isDarkMode
                            ? "opacity-100 rotate-0 scale-100"
                            : "opacity-0 -rotate-90 scale-50"
                            }`}
                        />
                      </div>

                      <div className="relative w-24 h-5 flex items-center">
                        <span className={`absolute transition-all duration-300 ease-in-out text-gray-700 dark:text-gray-300 ${isDarkMode ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"}`}>
                          Light
                        </span>
                        <span className={`absolute transition-all duration-300 ease-in-out text-gray-700 dark:text-gray-300 ${isDarkMode ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"}`}>
                          Dark
                        </span>
                      </div>
                    </div>

                    <div
                      className={`w-9 h-5 rounded-full flex items-center p-0.5 transition-colors duration-300 ease-in-out ${isDarkMode ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"
                        }`}
                    >
                      <div
                        className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300 ease-in-out ${isDarkMode ? "translate-x-4" : "translate-x-0"
                          }`}
                      />
                    </div>
                  </button>
                </MenuItem>

                <div className="h-px bg-gray-100 dark:bg-gray-800 my-1 transition-colors" />

                {user ? (
                  <>
                    <MenuItem>
                      <Link
                        href="/bookmarks"
                        className="flex items-center font-semibold gap-2 p-2 rounded-lg transition-colors text-gray-700 dark:text-gray-300 data-[focus]:bg-gray-100 dark:data-[focus]:bg-gray-800"
                      >
                        <Bookmark
                          size={20}
                          className="text-gray-500 dark:text-gray-400"
                        />
                        Bookmarks
                      </Link>
                    </MenuItem>

                    <MenuItem>
                      <button
                        onClick={() => {
                          posthog.capture("user_logged_out");
                          posthog.reset();
                          signOut().then(() => nav.push("/login"));

                        }}
                        className="group cursor-pointer flex items-center gap-2 p-2 rounded-lg w-full font-semibold text-left transition-colors data-[focus]:bg-red-50 dark:data-[focus]:bg-red-900/20 data-[focus]:text-red-600 dark:data-[focus]:text-red-400 text-gray-700 dark:text-gray-300"
                      >
                        <LogOut
                          size={20}
                          className="text-gray-500 dark:text-gray-400 group-data-[focus]:text-red-600 dark:group-data-[focus]:text-red-400 transition-colors"
                        />
                        Logout
                      </button>
                    </MenuItem>
                  </>
                ) : (
                  <>
                    <MenuItem>
                      <Link
                        href="/login"
                        className="flex items-center font-semibold gap-2 p-2 rounded-lg transition-colors text-gray-700 dark:text-gray-300 data-[focus]:bg-gray-100 dark:data-[focus]:bg-gray-800"
                      >
                        <User
                          size={20}
                          className="text-gray-500 dark:text-gray-400"
                        />
                        Login
                      </Link>
                    </MenuItem>
                    <MenuItem>
                      <Link
                        href="/create-account"
                        className="flex items-center font-semibold gap-2 p-2 rounded-lg transition-colors text-gray-700 dark:text-gray-300 data-[focus]:bg-gray-100 dark:data-[focus]:bg-gray-800"
                      >
                        <UserPlus
                          size={20}
                          className="text-gray-500 dark:text-gray-400"
                        />
                        Signup
                      </Link>
                    </MenuItem>
                  </>
                )}
              </div>
            </MenuItems>
          </Menu>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;