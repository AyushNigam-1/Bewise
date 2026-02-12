"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Cookies from "js-cookie";
import { Menu, MenuButton, MenuItem, MenuItems, Transition } from "@headlessui/react";
import { Bookmark, LogOut, MenuIcon, User, UserPlus } from "lucide-react";

const Navbar = () => {

  const [isOpen, setIsOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const token = Cookies.get("access_token");
    if (token) {
      setIsLoggedIn(true);
    }
  }, []);

  return (
    <nav className="border-b border-gray-300 pb-3 z-50 container mx-auto">
      <div className="flex flex-wrap items-center justify-between ">
        {/* <span className="self-center text-2xl text-gray-700 font-semibold whitespace-nowrap">
          <img src="/logo.png" alt="" className="md:w-32 w-20" />
          
        </span> */}
        <h4 className="justify-between flex lg:text-3xl font-bold text-gray-700 text-3xl text-center md:text-left gap-2 italic" >Bevise</h4>
        {/* {isLoggedIn ? ( */}
        <Menu as="div" className="relative inline-block text-left md:hidden">
          <MenuButton className="inline-flex items-center gap-2 bg-gray-700 p-2 md:p-3 text-sm/6 font-semibold text-white rounded-full">
            {isLoggedIn ? <User size={20} /> : <MenuIcon size={20} />}
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
              {isLoggedIn ? <div className="flex flex-col gap-1">
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
                    <button className={`flex items-center gap-2 p-2 rounded-lg w-full font-semibold text-left ${active ? "bg-white/10" : ""}`} onClick={() => {
                      localStorage.removeItem("user");
                    }} >
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
        <div className="gap-4 hidden md:flex">
          <Link href="/login" className="flex items-center gap-2 bg-gray-700 text-white px-4 py-2 rounded-lg font-semibold">
            <User size={20} />
            Login
          </Link>
          <Link href="/create-account" className="flex items-center gap-2 bg-gray-700 text-white px-4 py-2 rounded-lg font-semibold">
            <UserPlus size={20} />
            Signup
          </Link>
        </div>
      </div>

      {/* <Transition
        show={isOpen}
        enter="transition duration-150 ease-out"
        enterFrom="opacity-0 scale-95"
        enterTo="opacity-100 scale-100"
        leave="transition duration-100 ease-in"
        leaveFrom="opacity-100 scale-100"
        leaveTo="opacity-0 scale-95"
      >
        <div className="md:hidden flex flex-col items-center w-full py-2 gap-2 bg-white">
          <Link href="/login" className="bg-gray-700 text-white w-full py-2 rounded-lg text-center">
            Login
          </Link>
          <Link href="/create-account" className="bg-gray-700 text-white w-full py-2 rounded-lg text-center">
            Signup
          </Link>
        </div>
      </Transition> */}
    </nav >
  );
};

export default Navbar;
