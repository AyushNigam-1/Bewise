"use client"
import { useEffect, useState } from "react";
import { getBookInfoByTitle } from "@/app/services/bookService";
import { useParams } from "next/navigation";
import Link from "next/link";
import ShareModal from "../../components/ShareModal";
import Loader from "../../components/Loader";
import { ArrowUpRight, Book, Bookmark, Share2, ShoppingBag, User } from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import { useUserStore } from "@/app/stores/useUserStores";
import { useMutations } from "@/app/hooks/useMutations";

const Overview = () => {
    const [book, setBook] = useState<any>(null);
    const params = useParams<{ title?: string }>();
    const [isOpen, setIsOpen] = useState(false);
    const [isloading, setIsLoading] = useState(false);
    const user = useUserStore(state => state.user);
    const { bookmarkBook } = useMutations()

    useEffect(() => {
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

    if (isloading) return <Loader />
    return (
        <div className="flex flex-col gap-4  w-full py-2 md:py-4">
            <div className="flex flex-col md:flex-row relative gap-4 w-full "  >
                <img src={book?.thumbnail} className="z-30 rounded-xl  mx-auto md:h-72 shadow-md  md:w-auto " alt={book?.title} />
                <div className="flex flex-col md:justify-between gap-4 md w-full">
                    <div className="flex justify-between w-full items-start">
                        <div className="flex flex-col md:items-start gap-4" >
                            <h1 className="text-gray-600 font-bold text-3xl md:text-4xl md:leading-none">{book?.title}</h1>
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
                        <div className="flex flex-col md:flex-row gap-3 md:relative fixed right-0 bottom-0 m-2 md:m-0" >
                            <button
                                onClick={() => bookmarkBook.mutate(book?.id)}
                                className="inline-flex items-center gap-2 bg-gray-700 p-3 rounded-full text-white">
                                <Bookmark
                                    size={20}
                                    className={user?.favourite_books.includes(book?.id) ? "fill-white" : ""}
                                />
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsOpen(true)}
                                className="inline-flex items-center gap-2 bg-gray-700 p-3 text-sm/6 font-semibold text-white rounded-full "
                            >
                                <Share2 size={20} />
                            </button>
                            <ShareModal isOpen={isOpen} setIsOpen={setIsOpen} shareUrl={`https://www.bookworm.com/overview/${book?.title}`} />
                        </div>
                    </div>
                    <div className="flex flex-col md:flex-row gap-3 justify-between  w-full">
                        <Link
                            href={`/insights/${book?.title} `}
                            type="button"
                            className="text-gray-200  bg-gray-700  justify-center  flex gap-2 items-center  focus:outline-none rounded-lg py-2 px-4 md:text-lg  font-semibold">
                            <ArrowUpRight />
                            Get Insights
                        </Link>
                        <button
                            type="button"
                            className="text-gray-200  bg-gray-700   justify-center  flex gap-2 items-center  focus:outline-none rounded-lg py-2 px-4  md:text-lg  font-semibold"
                        >
                            <ShoppingBag size={20} /> Buy on Amazon
                        </button>
                    </div>
                </div>
            </div>
            <hr className="border-gray-300" />
            <p className="text-md text-gray-500 flex gap-2 items-center" >
                <Book size={20} />
                About Book
            </p>
            <p className=" text-xl text-gray-500 font-medium">
                Lorem ipsum dolor sit amet consectetur, adipisicing elit. Cumque sunt quidem nostrum inventore neque, molestiae eligendi officiis earum! Ipsa laudantium iste accusamus? Similique molestiae dolore aut alias! Dolorum molestiae voluptatibus dolorem quo deserunt et. Lorem ipsum dolor sit amet consectetur adipisicing elit. Vel repellendus aspernatur reprehenderit iusto, voluptatibus tempora eum aperiam, hic laboriosam ab, enim eveniet! Aliquam libero illo nisi unde laboriosam placeat ducimus voluptate incidunt dignissimos ipsum error dolorum in necessitatibus praesentium eveniet, doloremque eos atque quasi cumque.
            </p>
            <p className="text-md text-gray-600 flex gap-2 items-center" >
                <User size={20} />
                About Author
            </p>
            <p className="text-xl text-gray-500 font-medium">Lorem ipsum dolor sit amet consectetur, adipisicing elit. Cumque sunt quidem nostrum inventore neque, molestiae eligendi officiis earum! Ipsa laudantium iste accusamus? Similique molestiae dolore aut alias! Dolorum molestiae voluptatibus dolorem quo deserunt et. Lorem ipsum dolor sit amet consectetur adipisicing elit. Vel repellendus aspernatur reprehenderit iusto, voluptatibus tempora eum aperiam, hic laboriosam ab, enim eveniet! Aliquam libero illo nisi unde laboriosam placeat ducimus voluptate incidunt dignissimos ipsum error dolorum in necessitatibus praesentium eveniet, doloremque eos atque quasi cumque.</p>
            <ToastContainer />
        </div>
    );
};

export default Overview;


