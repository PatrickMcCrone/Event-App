"use client";
import React, { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link"; // Import Link from next/link

// Import the icons directly from Heroicons v2
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";

const Sidebar = () => {
	const [isCollapsed, setIsCollapsed] = useState(false); // State to control sidebar visibility

	return (
		<motion.div
			className={`bg-blue-600 text-white h-screen transition-all ${
				isCollapsed ? "px-2" : "px-4"
			}`} // Adjust padding dynamically
			initial={{ width: "12rem" }} // Smaller initial width
			animate={{ width: isCollapsed ? "4rem" : "12rem" }} // Set max width to 12rem when expanded
			transition={{ duration: 0.3 }}
		>
			{/* Hamburger button for all platforms */}
			<button
				className={`text-white p-2 mb-4 bg-blue-700 rounded-md ${
					isCollapsed ? "ml-0" : "ml-4"
				} mt-4`} // Added mt-4 to shift button down
				onClick={() => setIsCollapsed(!isCollapsed)}
			>
				{/* Show Bars3Icon (Hamburger Menu) when sidebar is collapsed, and XMarkIcon when it's expanded */}
				{isCollapsed ? (
					<Bars3Icon className="w-6 h-6 text-white" />
				) : (
					<XMarkIcon className="w-6 h-6 text-white" />
				)}
			</button>

			{/* Sidebar content */}
			<motion.h1
				className={`text-xl font-bold ${isCollapsed ? "hidden" : ""}`}
				initial={{ opacity: 0 }}
				animate={{ opacity: isCollapsed ? 0 : 1 }} // Fade in/out the title based on collapse state
				transition={{ duration: 0.3, delay: 0.2 }} // Delay labels fade-in after sidebar expands
			>
				Event App
			</motion.h1>

			<nav className="mt-8">
				<ul>
					<li className={`${isCollapsed ? "text-center" : ""}`}>
						<motion.a
							href="/"
							className="block py-2 font-bold hover:bg-blue-700 rounded-lg"
							initial={{ opacity: 1 }}
							animate={{ opacity: isCollapsed ? 0 : 1 }} // Fade in/out each link based on collapse state
							transition={{ duration: 0.3, delay: 0.2 }} // Delay fade-in to sync with sidebar expansion
						>
							{isCollapsed ? "" : "Dashboard"}
						</motion.a>
					</li>

					{/* Updated "Events" link */}
					<li className={`${isCollapsed ? "text-center" : ""}`}>
						<Link
							href="/events" // Link to the events page
							className="block py-2 font-bold hover:bg-blue-700 rounded-lg"
						>
							<motion.span
								initial={{ opacity: 1 }}
								animate={{ opacity: isCollapsed ? 0 : 1 }}
								transition={{ duration: 0.3, delay: 0.2 }}
							>
								{isCollapsed ? "" : "Events"}
							</motion.span>
						</Link>
					</li>

					{/* Create Event link */}
					<li className={`${isCollapsed ? "text-center" : ""}`}>
						<Link
							href="/create-event"
							className="block py-2 font-bold hover:bg-blue-700 rounded-lg"
						>
							<motion.span
								initial={{ opacity: 1 }}
								animate={{ opacity: isCollapsed ? 0 : 1 }}
								transition={{ duration: 0.3, delay: 0.2 }}
							>
								{isCollapsed ? "" : "Create Event"}
							</motion.span>
						</Link>
					</li>

					<li className={`${isCollapsed ? "text-center" : ""}`}>
						<motion.a
							href="/"
							className="block py-2 font-bold hover:bg-blue-700 rounded-lg"
							initial={{ opacity: 1 }}
							animate={{ opacity: isCollapsed ? 0 : 1 }}
							transition={{ duration: 0.3, delay: 0.2 }}
						>
							{isCollapsed ? "" : "Settings"}
						</motion.a>
					</li>
				</ul>
			</nav>
		</motion.div>
	);
};

export default Sidebar;
