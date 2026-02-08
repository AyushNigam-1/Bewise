"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Cookies from "js-cookie";
import { Menu, MenuButton, MenuItem, MenuItems, Transition } from "@headlessui/react";

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
        <span className="self-center text-2xl text-gray-700 font-semibold whitespace-nowrap">
          <img src="/logo.png" alt="" className="md:w-32 w-20" />
        </span>

        {isLoggedIn ? (
          <Menu as="div" className="relative inline-block text-left">
            <MenuButton className="inline-flex items-center gap-2 bg-gray-700 p-2 md:p-3 text-sm/6 font-semibold text-white rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5 md:size-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
              </svg>
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
                <div className="flex flex-col gap-1">
                  <MenuItem>
                    {({ active }) => (
                      <Link href="/bookmarks" className={`flex items-center gap-2 p-2 rounded-lg ${active ? "bg-white/10" : ""}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="size-5 md:size-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
                        </svg>
                        Bookmarks
                      </Link>
                    )}
                  </MenuItem>

                  <MenuItem>
                    {({ active }) => (
                      <button className={`flex items-center gap-2 p-2 rounded-lg w-full text-left ${active ? "bg-white/10" : ""}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="size-5 md:size-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15m-3 0-3-3m0 0 3-3m-3 3H15" />
                        </svg>
                        Logout
                      </button>
                    )}
                  </MenuItem>
                </div>
              </MenuItems>
            </Transition>
          </Menu>
        ) : (
          <div className="flex gap-4">
            <Link href="/login" className="hidden md:flex items-center gap-2 bg-gray-700 text-white px-4 py-2 rounded-lg font-semibold">
              Login
            </Link>
            <Link href="/create-account" className="hidden md:flex items-center gap-2 bg-gray-700 text-white px-4 py-2 rounded-lg font-semibold">
              Signup
            </Link>
            <button
              onClick={() => setIsOpen(!isOpen)}
              type="button"
              className="md:hidden inline-flex items-center justify-center text-sm bg-gradient-to-r from-gray-800 via-gray-500 to-gray-800 p-2 rounded-full"
              aria-controls="navbar-sticky"
              aria-expanded={isOpen}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="size-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M12 17.25h8.25" />
              </svg>
            </button>
          </div>
        )}
      </div>

      <Transition
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
      </Transition>
    </nav>
  );
};

export default Navbar;
