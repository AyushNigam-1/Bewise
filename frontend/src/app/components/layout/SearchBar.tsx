"use client";

import { SearchBarProps } from '@/app/types';
import { Search, X } from 'lucide-react';
import React, { useState } from 'react';

const filterArrayBySearch = <T,>(data: T[], property: keyof T, search: string): T[] => {
    if (!search.trim()) return data;
    return data.filter(item =>
        String(item[property]).toLowerCase().includes(search.toLowerCase())
    );
};

const SearchBar = ({
    responsive,
    data,
    propertyToSearch,
    setFilteredData,
}: SearchBarProps) => {

    const [maximize, setMaximize] = useState(false);
    const [search, setSearch] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setSearch(val);
        const filtered = filterArrayBySearch(data, propertyToSearch, val);
        setFilteredData(filtered);
    };

    const handleToggle = () => {
        if (maximize) {
            setSearch('');
            setFilteredData(data);
        }
        setMaximize(!maximize);
    };

    return (
        <div className={`${responsive ? maximize ? 'w-full absolute left-0 top-2 z-50' : '' : ""} items-center transition-all duration-300`} >
            <form className={`${responsive ? maximize ? "" : "hidden md:flex" : "flex"} w-full`} >
                <label htmlFor="simple-search" className="sr-only">Search</label>

                <div className="relative w-full flex items-center gap-2 border border-transparent dark:border-gray-700 bg-gray-100 dark:bg-gray-800 rounded-xl p-2 md:p-2.5 transition-colors duration-300">
                    <Search size={18} className='text-gray-400 dark:text-gray-500' />

                    <input
                        type="text"
                        id="simple-search"
                        value={search}
                        onChange={handleChange}
                        className="bg-transparent placeholder:font-medium placeholder:text-gray-400 dark:placeholder:text-gray-500 text-gray-900 dark:text-gray-100 md:text-lg outline-none focus:ring-transparent block w-full"
                        placeholder="Search"
                    />
                </div>
            </form>

            <button
                className={`md:hidden p-2.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 transition-colors duration-300 ${responsive ? maximize ? "absolute right-0.5 top-0" : "" : "hidden"}`}
                type="button"
                onClick={handleToggle}
            >
                {maximize ? <X size={20} /> : <Search size={20} />}
            </button>
        </div>
    );
};

export default SearchBar;