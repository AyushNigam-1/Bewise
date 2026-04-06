import Navbar from "../components/layout/Navbar";
import ToastProvider from "../providers/ToastProvider";

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div className="antialiased flex flex-col h-screen p-2 transition-colors duration-300">
            <Navbar />
            <div className="w-full container mx-auto">
                {children}
            </div>

            <ToastProvider />
        </div>
    );
}