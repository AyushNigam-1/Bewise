"use client"
import { useEffect, useState } from "react";
import { getBookInfoByTitle } from "@/app/services/bookService";
import { useParams } from "next/navigation";
import Link from "next/link";
import ShareModal from "../../components/ShareModal";
import Loader from "../../components/Loader";
import { toggleFavouriteBook } from "@/app/services/userService";

const Overview = () => {
    const [book, setBook] = useState<any>(null);
    const params = useParams<{ title?: string }>();
    const [isOpen, setIsOpen] = useState(false);
    const [isloading, setIsLoading] = useState(false);
    const [user, setUser] = useState<any>(null)
    // const user = JSON.parse(localStorage.getItem("user") || "{}")

    useEffect(() => {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
        const getBook = async () => {
            if (!params.title) return
            setIsLoading(true)
            const bookInfo = await getBookInfoByTitle(params?.title)
            if (bookInfo) {
                console.log(bookInfo)
                setBook(bookInfo);
            }
            setIsLoading(false)
        }
        getBook()
    }, []);
    const bookmarkBook = async (bookId: number) => {
        try {
            const data = await toggleFavouriteBook(
                user.user_id,
                bookId
            )
            // console.log(data)

        } catch (error) {
            console.error("Error fetching steps:", error)
        }
    }
    if (isloading) return <Loader />
    return (
        <div className="flex flex-col gap-4  w-full py-2 md:py-4">
            {/* <div className="absolute  h-64 bg-gray-100 rounded-2xl " ></div> */}

            <div className="flex flex-col md:flex-row relative gap-4 w-full "  >
                <img src={book?.thumbnail} className="z-30 rounded-xl  mx-auto md:h-72 shadow-md  md:w-auto " alt={book?.title} />
                {/* <img src={book?.thumbnail} className=" absolute blur-md md:hidden -p-2 rounded-xl mx-auto shadow-md h-64 w-full object-cover  md:h-56 md:w-auto" alt={book?.title} /> */}

                {/* <span></span> */}
                <div className="flex flex-col md:justify-between gap-4 md w-full">
                    <div className="flex flex-col md:items-start gap-4" >
                        <div className="flex justify-between w-full">
                            <h1 className="text-gray-600 font-bold text-3xl md:text-4xl ">{book?.title}</h1>
                            <div className="flex flex-col md:flex-row gap-3 md:relative fixed right-0 md:m-0 bottom-0" >
                                <button
                                    type="button"
                                    className="text-gray-200 md:text-gray-700  md:bg-gray-200 bg-gray-700  w-full justify-center  flex gap-2 items-center  focus:outline-none rounded-full p-3  md:w-min  font-semibold "
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6 md:size-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
                                    </svg>

                                    {/* Bookmark */}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsOpen(true)}
                                    className="text-gray-200 md:text-gray-700  md:bg-gray-200 bg-gray-700   w-full justify-center  flex gap-2 items-center  focus:outline-none rounded-full p-3  md:w-min  font-semibold cursor-pointer "
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6 md:size-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
                                    </svg>

                                    {/* Bookmark */}
                                </button>
                                <ShareModal isOpen={isOpen} setIsOpen={setIsOpen} shareUrl={`https://www.bookworm.com/overview/${book?.title}`} />
                            </div>
                        </div>
                        <span className=" text-gray-600 text-sm md:text-lg flex items-center justify-between"> &bull; {book?.author} &nbsp; &bull;  {book?.sub_categories_count} Categories &nbsp; &bull;  {book?.total_insights} Insights  </span>
                        <div className="flex gap-4 md:gap-5  flex-wrap  md:justify-normal max-w-[600px]" >
                            {book?.categories.split(/[,&]/).map((category: any, index: Number) => <h4 className=" bg-gray-200 p-1 px-3 rounded-lg w-min text-nowrap text-xs md:text-sm flex gap-1  text-gray-800 items-center "
                                key={String(index)} >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-3">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 8.25h15m-16.5 7.5h15m-1.8-13.5-3.9 19.5m-2.1-19.5-3.9 19.5" />
                                </svg>

                                {category}
                            </h4>)}
                        </div>
                    </div>

                    {/* <div className="flex justify-content gap-3">

                        <span className="flex items-center bg-gray-200 px-2 py-1 text-gray-800 gap-1  w-min text-nowrap  rounded-full text-sm" >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="size-4 fill-gray-200">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
                            </svg>
                            4.5
                        </span>
                        <span className="flex items-center bg-gray-200 px-2 py-1 text-gray-800 gap-1  w-min text-nowrap  rounded-full text-sm" >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="size-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.068.157 2.148.279 3.238.364.466.037.893.281 1.153.671L12 21l2.652-3.978c.26-.39.687-.634 1.153-.67 1.09-.086 2.17-.208 3.238-.365 1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
                            </svg>

                            10
                        </span>
                    </div> */}

                    {/* <div className="flex gap-2 justify-between w-full"> */}
                    <div className="flex flex-col md:flex-row gap-3 justify-between  w-full">
                        {/* <button
                            type="button"
                            className="text-gray-200  bg-gray-700  w-full  flex gap-2 items-center justify-center focus:outline-none rounded-lg py-2 px-4 md:w-min  font-semibold "
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
                            </svg>

                            Like
                        </button> */}
                        <Link
                            href={`/insights/${book?.title} `}
                            type="button"
                            // className="text-white    focus:outline-none  py-3 md:py-2 px-4 rounded-lg md:w-min w-[96vw] font-semibold flex md:relative bottom-4 md:bottom-0  gap-2 items-center justify-center fixed "
                            className="text-gray-200  bg-gray-700  justify-center  flex gap-2 items-center  focus:outline-none rounded-lg py-2 px-4 md:text-lg  font-semibold">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 19.5 15-15m0 0H8.25m11.25 0v11.25" />
                            </svg>

                            Get Insights
                        </Link>
                        <button
                            type="button"
                            className="text-gray-200  bg-gray-700   justify-center  flex gap-2 items-center  focus:outline-none rounded-lg py-2 px-4  md:text-lg  font-semibold "
                        >
                            {/* <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
                            </svg> */}
                            <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="20" height="20" viewBox="0 0 50 50"
                                style={{ fill: "#EBEBEB" }}>
                                <path d="M 25.3125 3 C 19.210938 3 12.492188 5.3125 11.09375 12.8125 C 10.894531 13.613281 11.5 13.992188 12 14.09375 L 18.1875 14.6875 C 18.789063 14.6875 19.207031 14.101563 19.40625 13.5 C 19.90625 10.898438 22.101563 9.59375 24.5 9.59375 C 25.800781 9.59375 27.292969 10.113281 28.09375 11.3125 C 28.992188 12.613281 28.8125 14.40625 28.8125 15.90625 L 28.8125 16.8125 C 25.113281 17.210938 20.3125 17.5 16.8125 19 C 12.8125 20.699219 10 24.207031 10 29.40625 C 10 36.007813 14.199219 39.3125 19.5 39.3125 C 24 39.3125 26.5 38.195313 30 34.59375 C 31.199219 36.292969 31.585938 37.105469 33.6875 38.90625 C 34.1875 39.207031 34.789063 39.085938 35.1875 38.6875 L 35.1875 38.8125 C 36.488281 37.710938 38.792969 35.601563 40.09375 34.5 C 40.59375 34.199219 40.492188 33.5 40.09375 33 C 38.894531 31.398438 37.6875 30.09375 37.6875 27.09375 L 37.6875 17.1875 C 37.6875 12.988281 38.007813 9.085938 34.90625 6.1875 C 32.40625 3.789063 28.414063 3 25.3125 3 Z M 27 22 L 28.6875 22 L 28.6875 23.40625 C 28.6875 25.804688 28.792969 27.894531 27.59375 30.09375 C 26.59375 31.894531 24.988281 33 23.1875 33 C 20.789063 33 19.3125 31.207031 19.3125 28.40625 C 19.3125 23.707031 23 22.300781 27 22 Z M 44.59375 36.59375 C 42.992188 36.59375 41.085938 37 39.6875 38 C 39.289063 38.300781 39.3125 38.6875 39.8125 38.6875 C 41.414063 38.488281 44.988281 38.007813 45.6875 38.90625 C 46.289063 39.707031 45.007813 43.085938 44.40625 44.6875 C 44.207031 45.1875 44.601563 45.300781 45 45 C 47.699219 42.699219 48.40625 38.007813 47.90625 37.40625 C 47.605469 36.90625 46.195313 36.59375 44.59375 36.59375 Z M 2.1875 37.5 C 1.886719 37.5 1.695313 38.011719 2.09375 38.3125 C 8.09375 43.710938 16.007813 47 24.90625 47 C 31.207031 47 38.492188 45.011719 43.59375 41.3125 C 44.394531 40.710938 43.707031 39.695313 42.90625 40.09375 C 37.207031 42.492188 31.101563 43.6875 25.5 43.6875 C 17.199219 43.6875 9.1875 41.386719 2.6875 37.6875 C 2.488281 37.488281 2.289063 37.5 2.1875 37.5 Z"></path>
                            </svg> Buy on Amazon
                        </button>


                    </div>
                </div>
            </div>
            <hr className="border-gray-300" />
            <p className="text-md text-gray-500 flex gap-2 items-center" >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
                </svg>
                About Book
            </p>
            <p className=" text-xl text-gray-500 font-medium">
                {/* <ReactMarkdown
                    remarkPlugins={[remarkGfm]}

                    components={{
                        h1: ({ children }) => <h1 className="text-6xl font-bold mt-6 mb-4">{children}</h1>,
                        h2: ({ children }) => <h2 className="text-3xl font-semibold mt-6 mb-3">{children}</h2>,
                        h3: ({ children }) => <h3 className="text-xl font-bold text-gray-700 mt-5 mb-2">{children}</h3>,
                        ul: ({ children }) => <ul className="list-disc ml-6 text-lg">{children}</ul>,
                        li: ({ children }) => <li className="text-gray-600">{children}</li>,
                        p: ({ children }) => <p className="text-lg leading-relaxed">{children}</p>,
                    }}
                > */}
                {book?.description}
                {/* ### **Summary of *Meditations* by Marcus Aurelius**

                *Meditations* is a collection of personal reflections written by Roman Emperor **Marcus Aurelius** as a guide for self-improvement and inner peace. It is deeply rooted in **Stoic philosophy**, emphasizing discipline, virtue, and acceptance of life’s challenges.

                The book is divided into **12 sections**, each containing personal thoughts rather than structured arguments. Marcus repeatedly reminds himself to focus on **what he can control**, accept external events as part of nature, and act with **wisdom, justice, courage, and self-discipline**.

                #### **Key themes of the book include:**
                - **Control vs. Acceptance** – We should not waste energy on things outside our control but focus on our actions and mindset.
                - **Death & Impermanence** – Life is short, and everything is temporary, so we should live virtuously without attachment to status or materialism.
                - **Dealing with Others** – People may act irrationally, but we should remain calm and respond with reason rather than anger.
                - **Inner Peace & Simplicity** – Happiness comes from within, not from external success or wealth.

                Throughout *Meditations*, Marcus Aurelius reminds himself to **stay rational, avoid unnecessary suffering, and act according to nature’s order**. The book serves as a timeless **manual for self-discipline, resilience, and mental clarity**, making it one of the most influential works of Stoic philosophy. */}


                {/* </ReactMarkdown> */}
            </p>
            <p className="text-md text-gray-600 flex gap-2 items-center" >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                </svg>
                About Author
            </p>
            <p className="text-xl text-gray-500 font-medium">Lorem ipsum dolor sit amet consectetur, adipisicing elit. Cumque sunt quidem nostrum inventore neque, molestiae eligendi officiis earum! Ipsa laudantium iste accusamus? Similique molestiae dolore aut alias! Dolorum molestiae voluptatibus dolorem quo deserunt et. Lorem ipsum dolor sit amet consectetur adipisicing elit. Vel repellendus aspernatur reprehenderit iusto, voluptatibus tempora eum aperiam, hic laboriosam ab, enim eveniet! Aliquam libero illo nisi unde laboriosam placeat ducimus voluptate incidunt dignissimos ipsum error dolorum in necessitatibus praesentium eveniet, doloremque eos atque quasi cumque.</p>
        </div>
    );
};

export default Overview;


