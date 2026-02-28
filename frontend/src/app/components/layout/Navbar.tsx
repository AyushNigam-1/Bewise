"use client";

import Link from "next/link";
import { Menu, MenuButton, MenuItem, MenuItems, Transition } from "@headlessui/react";
import { Bookmark, LogOut, User, UserPlus } from "lucide-react";
import axios from "axios";
import { useUserStore } from "@/app/stores/useUserStores";

const Navbar = () => {

  const user = useUserStore(state => state.user);
  // Optional but recommended: pull in your clearUser function so the UI updates immediately on logout
  const clearUser = useUserStore((state: any) => state.clearUser);

  const handleLogout = async () => {
    try {
      await axios.post(
        "http://localhost:8000/logout",
        {},
        { withCredentials: true }
      );

      // Clear the Zustand state so the Navbar immediately changes back to Login/Signup
      if (clearUser) clearUser();

    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  return (
    // Added dark:border-gray-800 and transition
    <nav className="border-b border-gray-200 dark:border-gray-800 pb-3 z-50 container mx-auto transition-colors duration-300">
      <div className="flex flex-wrap items-center justify-between ">

        {/* Dark mode text added for the Brand logo */}
        <h4 className="justify-between flex lg:text-3xl font-bold text-gray-900 dark:text-gray-100 text-3xl text-center md:text-left gap-2 italic transition-colors" >
          Bevise
        </h4>

        <Menu as="div" className="relative inline-block text-left">
          {/* Button inverses in dark mode (Black in light mode, White in dark mode) */}
          <MenuButton className="inline-flex items-center gap-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 p-2 md:p-3 text-sm/6 font-semibold rounded-full transition-colors shadow-md">
            <User size={20} />
          </MenuButton>

          <Transition
            enter="transition duration-150 ease-out"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="transition duration-100 ease-in"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            {/* Dropdown Menu: White in light mode, Dark Gray in dark mode with matching borders */}
            <MenuItems className="absolute right-0 mt-2 w-40 md:w-56 origin-top-right rounded-xl bg-white dark:bg-gray-900 p-2 text-gray-900 dark:text-gray-100 shadow-xl border border-gray-100 dark:border-gray-800 focus:outline-none z-50 transition-colors duration-300">
              {user ? (
                <div className="flex flex-col gap-1">
                  <MenuItem>
                    {({ active }) => (
                      <Link
                        href="/bookmarks"
                        // Hover state adapts to theme (light gray in light mode, darker gray in dark mode)
                        className={`flex items-center font-semibold gap-2 p-2 rounded-lg transition-colors ${active ? "bg-gray-100 dark:bg-gray-800" : ""}`}
                      >
                        <Bookmark size={20} className="text-gray-500 dark:text-gray-400" />
                        Bookmarks
                      </Link>
                    )}
                  </MenuItem>
                  <MenuItem>
                    {({ active }) => (
                      <button
                        className={`flex items-center gap-2 p-2 rounded-lg w-full font-semibold text-left transition-colors ${active ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400" : ""}`}
                        onClick={handleLogout}
                      >
                        <LogOut size={20} className={active ? "text-red-600 dark:text-red-400" : "text-gray-500 dark:text-gray-400"} />
                        Logout
                      </button>
                    )}
                  </MenuItem>
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  <MenuItem>
                    {({ active }) => (
                      <Link
                        href="/login"
                        className={`flex items-center font-semibold gap-2 p-2 rounded-lg transition-colors ${active ? "bg-gray-100 dark:bg-gray-800" : ""}`}
                      >
                        <User size={20} className="text-gray-500 dark:text-gray-400" />
                        Login
                      </Link>
                    )}
                  </MenuItem>
                  <MenuItem>
                    {({ active }) => (
                      <Link
                        href="/create-account"
                        className={`flex items-center font-semibold gap-2 p-2 rounded-lg transition-colors ${active ? "bg-gray-100 dark:bg-gray-800" : ""}`}
                      >
                        <UserPlus size={20} className="text-gray-500 dark:text-gray-400" />
                        Signup
                      </Link>
                    )}
                  </MenuItem>
                </div>
              )}
            </MenuItems>
          </Transition>
        </Menu>
      </div>
    </nav >
  );
};

export default Navbar;