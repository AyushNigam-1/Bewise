import { Search } from 'lucide-react';
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
}: {
    responsive: boolean;
    data: any[];
    propertyToSearch: keyof any;
    setFilteredData: React.Dispatch<React.SetStateAction<any[]>>;
}) => {

    const [maximize, setMaximize] = useState(false);
    const [search, setSearch] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setSearch(val);
        const filtered = filterArrayBySearch(data, propertyToSearch, val);
        setFilteredData(filtered);
    };

    return (
        <div className={`${responsive ? maximize ? ' w-full absolute left-0 top-2  ' : '' : ""} items-center `} >
            <form className={`${responsive ? maximize ? "" : "hidden md:flex" : ""}`} >
                <label htmlFor="simple-search" className="sr-only">Search</label>
                <div className="relative w-full flex items-center gap-2 bg-gray-100 rounded-xl p-2 md:p-2.5">
                    <div className=" flex items-center  pointer-events-none">
                        <Search size={18} className='text-gray-400' />
                    </div>
                    <input
                        type="text"
                        id="simple-search"
                        value={search}
                        onChange={handleChange}
                        className={`placeholder:font-medium placeholder:text-gray-400 text-gray-900 md:text-lg outline-none focus:ring-blue-500 focus:border-blue-500 block w-full `}
                        placeholder="Search"
                    />
                </div>
            </form>
            <button
                className={`md:hidden p-2 rounded-full bg-gray-100 text-gray-800  ${responsive ? maximize ? "absolute right-0.5 top-0" : "" : "hidden"} `}
                type="button"
                onClick={() => setMaximize(!maximize)}>{maximize ? <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
                    : <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="size-6 "
                        strokeWidth={1.5}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                        />
                    </svg>}</button>
        </div>

    );
};

export default SearchBar;
