"use client";

import Link from "next/link";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { Bookmark, LogOut, User, UserPlus } from "lucide-react";
import { useUserStore } from "@/app/stores/useUserStores";
import { useLogout } from "@/app/hooks/mutations/useAuth";

const Navbar = () => {

  const user = useUserStore(state => state.user);
  const { mutate: logout } = useLogout();

  return (
    <nav className="border-b border-gray-200 dark:border-gray-800 pb-3 z-50 container mx-auto transition-colors duration-300">
      <div className="flex flex-wrap items-center justify-between">

        <h4 className="justify-between flex lg:text-3xl font-bold text-gray-900 dark:text-gray-100 text-3xl text-center md:text-left gap-2 italic transition-colors">
          Bevise
        </h4>

        <Menu as="div" className="relative inline-block text-left">
          <MenuButton className="inline-flex cursor-pointer  items-center gap-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 p-2 md:p-3 text-sm/6 font-semibold rounded-full transition-colors shadow-md">
            <User size={20} />
          </MenuButton>

          <MenuItems
            transition
            className="absolute right-0 mt-2 w-40 md:w-56 origin-top-right rounded-xl bg-white dark:bg-gray-900 p-2 text-gray-900 dark:text-gray-100 shadow-xl border border-gray-100 dark:border-gray-800 focus:outline-none z-50 transition-all duration-200 ease-out data-[closed]:scale-95 data-[closed]:opacity-0"
          >
            {user ? (
              <div className="flex flex-col gap-1">
                <MenuItem>
                  <Link
                    href="/bookmarks"
                    className="flex items-center font-semibold gap-2 p-2 rounded-lg transition-colors data-[focus]:bg-gray-100 dark:data-[focus]:bg-gray-800"
                  >
                    <Bookmark size={20} className="text-gray-500 dark:text-gray-400" />
                    Bookmarks
                  </Link>
                </MenuItem>

                <MenuItem>
                  <button
                    onClick={() => logout()}
                    className="group cursor-pointer flex items-center gap-2 p-2 rounded-lg w-full font-semibold text-left transition-colors data-[focus]:bg-red-50 dark:data-[focus]:bg-red-900/20 data-[focus]:text-red-600 dark:data-[focus]:text-red-400"
                  >
                    <LogOut size={20} className="text-gray-500 dark:text-gray-400 group-data-[focus]:text-red-600 dark:group-data-[focus]:text-red-400" />
                    Logout
                  </button>
                </MenuItem>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <MenuItem>
                  <Link
                    href="/login"
                    className="flex items-center font-semibold gap-2 p-2 rounded-lg transition-colors data-[focus]:bg-gray-100 dark:data-[focus]:bg-gray-800"
                  >
                    <User size={20} className="text-gray-500 dark:text-gray-400" />
                    Login
                  </Link>
                </MenuItem>
                <MenuItem>
                  <Link
                    href="/create-account"
                    className="flex items-center font-semibold gap-2 p-2 rounded-lg transition-colors data-[focus]:bg-gray-100 dark:data-[focus]:bg-gray-800"
                  >
                    <UserPlus size={20} className="text-gray-500 dark:text-gray-400" />
                    Signup
                  </Link>
                </MenuItem>
              </div>
            )}
          </MenuItems>
        </Menu>
      </div>
    </nav>
  );
};

export default Navbar;