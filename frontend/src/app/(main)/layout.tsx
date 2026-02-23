import Navbar from "./components/Navbar";

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        < div className="antialiased flex flex-col h-screen p-2  transition-colors duration-300" >
            <Navbar />
            <div className="w-full container mx-auto">
                {children}
            </div>
        </div >
    );
}