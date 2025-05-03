"use client";
import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
	theme: Theme;
	toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Function to get initial theme
const getInitialTheme = (): Theme => {
	if (typeof window !== "undefined") {
		try {
			const savedTheme = localStorage.getItem("theme") as Theme;
			if (savedTheme) {
				return savedTheme;
			}
			// Check if HTML element has a theme class
			const htmlTheme = document.documentElement.classList.contains(
				"dark"
			)
				? "dark"
				: "light";
			if (htmlTheme !== "light") {
				return htmlTheme;
			}
			return window.matchMedia("(prefers-color-scheme: dark)").matches
				? "dark"
				: "light";
		} catch (error) {
			console.error("Error getting initial theme:", error);
			return "light";
		}
	}
	return "light";
};

// Function to apply theme to document
const applyTheme = (theme: Theme) => {
	// Apply to HTML element
	document.documentElement.classList.remove("light", "dark");
	document.documentElement.classList.add(theme);

	// Apply to body element
	document.body.classList.remove("light", "dark");
	document.body.classList.add(theme);

	// Save to localStorage
	localStorage.setItem("theme", theme);

	// Update meta theme-color
	const metaThemeColor = document.querySelector('meta[name="theme-color"]');
	if (!metaThemeColor) {
		const meta = document.createElement("meta");
		meta.name = "theme-color";
		document.head.appendChild(meta);
	}
	document
		.querySelector('meta[name="theme-color"]')
		?.setAttribute("content", theme === "dark" ? "#111827" : "#ffffff");
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
	const [theme, setTheme] = useState<Theme>(getInitialTheme());
	const [mounted, setMounted] = useState(false);

	// Apply theme to document whenever it changes
	useEffect(() => {
		if (!mounted) return;
		applyTheme(theme);
	}, [theme, mounted]);

	// Initial theme application
	useEffect(() => {
		applyTheme(theme);
		setMounted(true);
	}, []);

	const toggleTheme = () => {
		setTheme((prev) => {
			const newTheme = prev === "light" ? "dark" : "light";
			applyTheme(newTheme);
			return newTheme;
		});
	};

	// Prevent hydration mismatch
	if (!mounted) {
		return null;
	}

	return (
		<ThemeContext.Provider value={{ theme, toggleTheme }}>
			{children}
		</ThemeContext.Provider>
	);
}

export function useTheme() {
	const context = useContext(ThemeContext);
	if (context === undefined) {
		throw new Error("useTheme must be used within a ThemeProvider");
	}
	return context;
}
