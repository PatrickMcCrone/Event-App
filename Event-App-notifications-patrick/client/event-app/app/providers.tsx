"use client";

import { ThemeProvider } from "./context/ThemeContext";
import { SessionProvider } from "next-auth/react";

export function Providers({ children }: { children: React.ReactNode }) {
	return (
		<SessionProvider>
			<ThemeProvider>{children}</ThemeProvider>
		</SessionProvider>
	);
}
