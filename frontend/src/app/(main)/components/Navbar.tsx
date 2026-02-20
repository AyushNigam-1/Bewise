"use client";

import Link from "next/link";
import { Menu, MenuButton, MenuItem, MenuItems, Transition } from "@headlessui/react";
import { Bookmark, LogOut, MenuIcon, User, UserPlus } from "lucide-react";
import axios from "axios";
import { useUserStore } from "@/app/stores/useUserStores";

const Navbar = () => {

  const user = useUserStore(state => state.user);

  const handleLogout = async () => {
    try {
      await axios.post(
        "http://localhost:8000/logout",
        {},
        { withCredentials: true }
      );

    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  return (
    <nav className="border-b border-gray-300 pb-3 z-50 container mx-auto">
      <div className="flex flex-wrap items-center justify-between ">
        <h4 className="justify-between flex lg:text-3xl font-bold text-gray-700 text-3xl text-center md:text-left gap-2 italic" >Bevise</h4>
        <Menu as="div" className="relative inline-block text-left">
          <MenuButton className="inline-flex items-center gap-2 bg-gray-700 p-2 md:p-3 text-sm/6 font-semibold text-white rounded-full">
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
            <MenuItems className="absolute right-0 mt-2 w-40 md:w-56 origin-top-right rounded-xl bg-gray-700 p-2 text-white shadow-lg focus:outline-none z-80">
              {user ? <div className="flex flex-col gap-1">
                <MenuItem>
                  {({ active }) => (
                    <Link href="/bookmarks" className={`flex items-center font-semibold gap-2 p-2 rounded-lg ${active ? "bg-white/10" : ""}`}>
                      <Bookmark size={20} />
                      Bookmarks
                    </Link>
                  )}
                </MenuItem>
                <MenuItem>
                  {({ active }) => (
                    <button className={`flex items-center gap-2 p-2 rounded-lg w-full font-semibold text-left ${active ? "bg-white/10" : ""}`} onClick={handleLogout} >
                      <LogOut size={20} />
                      Logout
                    </button>
                  )}
                </MenuItem>
              </div> : <div className="flex flex-col gap-1">
                <MenuItem>
                  {({ active }) => (
                    <Link href="/login" className={`flex items-center font-semibold gap-2 p-2 rounded-lg ${active ? "bg-white/10" : ""}`}>
                      <User size={20} />
                      Login
                    </Link>
                  )}
                </MenuItem>
                <MenuItem>
                  {({ active }) => (
                    <Link href="/create-account" className={`flex items-center font-semibold gap-2 p-2 rounded-lg ${active ? "bg-white/10" : ""}`}>
                      <UserPlus size={20} />
                      Signup
                    </Link>
                  )}
                </MenuItem>
              </div>}
            </MenuItems>
          </Transition>
        </Menu>
      </div>
    </nav >
  );
};

export default Navbar;
