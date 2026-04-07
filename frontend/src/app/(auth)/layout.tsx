import ToastProvider from "../providers/ToastProvider";

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div className="flex justify-center items-center h-screen ">
            {children}
            <ToastProvider />

        </div>
    );
}
